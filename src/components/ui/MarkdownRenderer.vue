<template>
  <div class="markdown-renderer">
    <div 
      v-html="renderedHtml"
      class="markdown-content"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
// 导入常用语言
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import 'highlight.js/styles/github-dark.css';
import { Clipboard } from '@capacitor/clipboard';
import { showToast } from '@/composables/useToast';

interface Props {
  content: string;
  isStreaming?: boolean;
  showThink?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  thinkContent: [content: string];
}>();

// 注册highlight.js语言
const registerLanguages = () => {
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('java', java);
  hljs.registerLanguage('cpp', cpp);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('html', xml);
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('shell', bash);
};

// 配置marked - 简化版本，禁用代码块处理
const configureMarked = () => {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // 创建一个简单的渲染器，跳过代码块处理
  const renderer = new marked.Renderer();
  
  // 禁用代码块渲染（因为我们手动处理）
  renderer.code = function({ text, lang, escaped }) {
    // 如果代码已经是HTML格式，直接返回
    if (typeof text === 'string' && text.includes('code-block-container')) {
      return text;
    }
    // 否则返回原始markdown
    return '```' + (lang || '') + '\n' + text + '\n```';
  };
  
  renderer.codespan = function({ text }) {
    const codeStr = String(text || '');
    return `<code class="inline-code">${codeStr}</code>`;
  };
  
  renderer.blockquote = function({ text }) {
    const quoteStr = String(text || '');
    return `<blockquote class="quote-block">${quoteStr}</blockquote>`;
  };

  // 图像渲染器
  renderer.image = function({ href, title, text }) {
    const alt = text || 'Generated Image';
    const titleAttr = title ? ` title="${title}"` : '';
    const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    return `<div class="image-container">
      <img src="${href}" alt="${alt}"${titleAttr} id="${imageId}" class="rendered-image" 
           onclick="openImageModal('${imageId}')" />
      <div class="image-actions">
        <button class="image-action-btn" onclick="downloadImage('${href}', '${alt}')" type="button">
          <ion-icon name="download-outline"></ion-icon>
          下载
        </button>
        <button class="image-action-btn" onclick="shareImage('${href}', '${alt}')" type="button">
          <ion-icon name="share-outline"></ion-icon>
          分享
        </button>
      </div>
    </div>`;
  };

  marked.setOptions({ renderer });
};

// 提取think内容
const extractThinkContent = (content: string) => {
  const thinkMatches = content.match(/<think>([\s\S]*?)<\/think>/g);
  if (thinkMatches && thinkMatches.length > 0) {
    const thinkContent = thinkMatches.map(match => 
      match.replace(/<\/?think>/g, '').trim()
    ).join('\n\n');
    
    // 发送think内容给父组件
    emit('thinkContent', thinkContent);
  }
  
  // 移除think标签，返回清理后的内容
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
};

// 基础代码块修复（只修复格式，保留内容）
const fixBrokenCodeBlocks = (content: string): string => {
  // 只修复明显的格式问题，不删除任何内容
  return content
    // 修复紧挨着的代码块标记
    .replace(/``````/g, '```\n```')
    // 修复错误的代码块标记
    .replace(/````/g, '```');
};

// 处理代码块（保留完整内容）
const processCodeBlocks = (content: string): string => {
  // 只在真正检测到对象错误时才替换
  if (content.includes('[object Object]')) {
    console.warn('🚨 Object pollution detected in content, cleaning...');
    content = content.replace(/\[object Object\]/g, '[Content Error]');
  }
  
  // 修复代码块格式
  content = fixBrokenCodeBlocks(content);
  
  // 匹配代码块，支持语言标识符和可选的换行
  const codeBlockRegex = /```(\w+)?\s*\n?([\s\S]*?)```/g;
  
  return content.replace(codeBlockRegex, (match, language, code) => {
    console.log('🔍 Processing code block:', { match: match.substring(0, 100), language, codeType: typeof code });
    
    // 保护代码内容，确保不丢失任何数据
    let codeString = '';
    
    if (code === null || code === undefined) {
      console.warn('⚠️ Code is null/undefined');
      codeString = ''; // 保留空内容
    }
    // 检查是否已经包含显示错误
    else if (String(code).includes('[object Object]')) {
      console.error('❌ Code contains [object Object]:', code);
      // 尝试清理对象错误，但不添加新的错误标记
      codeString = String(code).replace(/\[object Object\]/g, '');
    }
    // 如果是对象类型，尝试序列化但保留结构
    else if (typeof code === 'object') {
      console.warn('⚠️ Code is object type, preserving as JSON:', code);
      try {
        if (Array.isArray(code)) {
          codeString = code.join('\n');
        } else {
          codeString = JSON.stringify(code, null, 2);
        }
      } catch (e) {
        console.error('❌ Failed to serialize code object:', e);
        codeString = '[Object Serialization Error - Content Type: ' + typeof code + ']';
      }
    }
    // 正常字符串处理 - 确保保留格式
    else {
      codeString = String(code);
    }
    
    // 🔧 重要：确保代码字符串格式正确
    if (typeof codeString === 'string') {
      // 清理可能的格式破坏
      codeString = codeString
        .replace(/\[Display Error[^\]]*\]/g, '') // 移除错误标记
        .replace(/\[STREAM_OBJECT_CLEANED\]/g, '') // 移除清理标记
        .replace(/\[OBJECT_CLEANED\]/g, ''); // 移除对象清理标记
    }
    
    // 不对代码内容进行trim或其他修改，保持原始格式
    
    // 语言处理
    let lang = 'plaintext';
    if (language && typeof language === 'string') {
      lang = language.toLowerCase();
    } else if (typeof language === 'object') {
      console.warn('⚠️ Language is object type:', language);
      lang = 'plaintext';
    }
    
    console.log('✅ Code preserved successfully:', {
      lang,
      codeLength: codeString.length,
      hasContent: codeString.length > 0,
      preview: codeString.substring(0, 100) + (codeString.length > 100 ? '...' : '')
    });
    
    let highlighted;
    try {
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(codeString, { language: lang }).value;
      } else {
        highlighted = hljs.highlightAuto(codeString).value;
      }
      
      // 确保高亮结果是字符串
      if (typeof highlighted !== 'string') {
        console.warn('⚠️ Highlight result is not string:', typeof highlighted);
        highlighted = String(highlighted);
      }
    } catch (error) {
      console.error('❌ Highlighting failed, using raw content:', error);
      // 如果高亮失败，保留原始内容但转义HTML字符
      highlighted = codeString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    
    const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // 安全编码原始代码用于复制（保留完整内容）
    let encodedCode;
    try {
      encodedCode = encodeURIComponent(codeString).replace(/'/g, '%27').replace(/"/g, '%22');
    } catch (e) {
      console.error('❌ Failed to encode code for copy:', e);
      encodedCode = encodeURIComponent('[Encoding Error - Content Preserved]');
    }
    
    const result = `<div class="code-block-container">
      <div class="code-header">
        <span class="code-language">${lang}</span>
        <button class="copy-button" onclick="copyCodeById('${codeId}')" data-code-id="${codeId}" data-original-code="${encodedCode}">
          <ion-icon name="copy-outline"></ion-icon>
          Copy
        </button>
      </div>
      <pre class="hljs" id="${codeId}"><code>${highlighted}</code></pre>
    </div>`;
    
    // 不删除包含错误标记的结果，让用户看到完整内容
    return result;
  });
};

// 🔧 超强化内容抢救和转换器 - 五重字符串保护
const emergencyContentRecovery = (content: any): string => {
  if (content === null || content === undefined) return '';
  
  let recoveredContent = '';
  
  try {
    // 第一重：字符串直接通过
    if (typeof content === 'string') {
      recoveredContent = content;
    }
    // 第二重：对象智能提取和恢复
    else if (typeof content === 'object') {
      console.warn('🚨 RENDERER: Object content detected, applying emergency recovery:', content);
      
      // 尝试提取有意义的文本字段
      if (content.text) {
        recoveredContent = String(content.text);
        console.log('🚑 Recovered from object.text');
      } else if (content.content) {
        recoveredContent = String(content.content);
        console.log('🚑 Recovered from object.content');
      } else if (content.message) {
        recoveredContent = String(content.message);
        console.log('🚑 Recovered from object.message');
      } else if (content.code) {
        recoveredContent = String(content.code);
        console.log('🚑 Recovered from object.code');
      } else if (content.data) {
        recoveredContent = String(content.data);
        console.log('🚑 Recovered from object.data');
      } else if (Array.isArray(content)) {
        recoveredContent = content.map((item: any) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item.text) return String(item.text);
          if (typeof item === 'object' && item.content) return String(item.content);
          return String(item);
        }).join('\n');
        console.log('🚑 Recovered from array with smart item extraction');
      } else {
        // JSON序列化但美化显示
        const jsonStr = JSON.stringify(content, null, 2);
        // 尝试让JSON更可读
        if (jsonStr.length > 1000) {
          // 大对象：提取关键信息
          const keys = Object.keys(content);
          const summary = keys.slice(0, 5).map(key => {
            const value = content[key];
            const valueStr = typeof value === 'string' ? value.substring(0, 100) 
                           : typeof value === 'object' ? '[Object]'
                           : String(value);
            return `${key}: ${valueStr}`;
          }).join('\n');
          recoveredContent = `Content Object Summary:\n${summary}${keys.length > 5 ? `\n... and ${keys.length - 5} more properties` : ''}`;
        } else {
          // 小对象：美化JSON
          recoveredContent = jsonStr
            .replace(/[\{\}"]/g, '')
            .replace(/,\s*\n/g, '\n')
            .replace(/:\s*/g, ': ')
            .replace(/^\s+/gm, '')
            .trim();
          
          if (recoveredContent.includes(':')) {
            recoveredContent = 'Content:\n' + recoveredContent;
          }
        }
        console.warn('🚑 Object converted to readable format');
      }
    }
    // 第三重：其他类型强制转换
    else {
      recoveredContent = String(content);
      console.log('🚑 Basic type conversion:', typeof content);
    }
    
    // 第四重：最终验证
    if (typeof recoveredContent !== 'string') {
      console.error('💥 CRITICAL: Recovery result is not string!');
      recoveredContent = '[RECOVERY_TYPE_ERROR]';
    }
    
    // 第五重：清理和修复损坏模式
    if (recoveredContent.includes('[object Object]')) {
      console.log('🚨 Detected [object Object] corruption, applying pattern recovery');
      
      // 智能模式检测和修复
      if (recoveredContent.includes('<!DOCTYPE') || recoveredContent.includes('<html')) {
        recoveredContent = recoveredContent.replace(/\[object Object\]/g, '\n<!-- Content stream interrupted -->\n');
        console.log('🏥 Applied HTML document recovery');
      } else if (recoveredContent.includes('{') && recoveredContent.includes('}') && recoveredContent.includes(':')) {
        recoveredContent = recoveredContent.replace(/\[object Object\]/g, '\n/* Content stream interrupted */\n');
        console.log('🏥 Applied CSS/JSON recovery');
      } else if (recoveredContent.includes('```') || recoveredContent.includes('function') || recoveredContent.includes('class')) {
        recoveredContent = recoveredContent.replace(/\[object Object\]/g, '\n// Content stream interrupted\n');
        console.log('🏥 Applied code recovery');
      } else {
        recoveredContent = recoveredContent.replace(/\[object Object\]/g, '\n[Content stream was interrupted]\n');
        console.log('🏥 Applied generic text recovery');
      }
    }
    
    // 清理其他污染标记
    recoveredContent = recoveredContent
      .replace(/\[STREAM_OBJECT_CLEANED\]/g, '')
      .replace(/\[OBJECT_CLEANED\]/g, '')
      .replace(/\[Display Error[^\]]*\]/g, '[Content Error]');
    
  } catch (recoveryError) {
    console.error('❌ Complete emergency recovery failure:', recoveryError);
    recoveredContent = '[EMERGENCY_RECOVERY_FAILED: ' + typeof content + ']';
  }
  
  // 最终保证：确保返回字符串
  return String(recoveredContent);
};

// 最终结果修复器 - 温和处理，避免过度修复
const finalResultFixer = (html: string): string => {
  if (!html) return '';
  
  // 只在真正需要时才替换对象错误
  let fixed = html;
  if (html.includes('[object Object]')) {
    console.warn('🚨 Final cleanup: Removing object pollution from HTML');
    fixed = html.replace(/\[object Object\]/g, '');
  }
  
  // 不对正常内容进行任何修改
  return fixed;
};

// 智能流式代码块处理器和内容恢复
const processStreamingCodeBlocks = (content: string): string => {
  // 第一步：尝试从损坏的内容中恢复代码块
  content = content.replace(/```(\w+)?\s*\n?\[object Object\]/g, (match, lang) => {
    console.log('🚨 Detected [object Object] corruption in code block, attempting recovery');
    // 如果检测到对象损坏，尝试保留语言标识符
    return '```' + (lang || '') + '\n[Content was corrupted - attempting to preserve structure]';
  });
  
  if (!props.isStreaming) return content;
  
  // 统计代码块标记
  const openMarks = (content.match(/```/g) || []).length;
  
  // 如果代码块标记数量是奇数，说明有未闭合的代码块
  if (openMarks % 2 === 1) {
    console.log('🔄 Detected unclosed code block in streaming content');
    
    // 查找最后一个```的位置
    const lastMarkIndex = content.lastIndexOf('```');
    if (lastMarkIndex !== -1) {
      // 检查这个```之后的内容
      const afterLastMark = content.substring(lastMarkIndex + 3);
      
      // 如果之后的内容看起来像是代码，暂时不闭合，等待更多内容
      // 如果内容很少或看起来已经结束，自动闭合
      if (afterLastMark.trim().length > 50 || afterLastMark.includes('\n\n')) {
        content += '\n```';
        console.log('🔧 Auto-closed streaming code block');
      }
    }
  }
  
  return content;
};

// 激进的代码块重构器（修复分割问题）
const aggressiveCodeBlockReconstructor = (content: string): string => {
  let processedContent = content;
  let hasChanges = true;
  let iterations = 0;
  
  while (hasChanges && iterations < 5) {
    const beforeLength = processedContent.length;
    
    // 第一阶段：只合并真正有问题的代码块
    processedContent = processedContent.replace(
      /```(\w+)?\s*\n?([\s\S]*?)```\s*```(\w+)?\s*\n?([\s\S]*?)```/g,
      (match, lang1, code1, lang2, code2) => {
        // 只在有真正的错误或语言相同时合并
        const hasError1 = (code1 || '').includes('[object Object]') || (code1 || '').includes('[Content Error]');
        const hasError2 = (code2 || '').includes('[object Object]') || (code2 || '').includes('[Content Error]');
        
        if ((hasError1 || hasError2) && (lang1 === lang2 || (!lang1 && !lang2))) {
          const language = lang1 || lang2 || '';
          const combinedCode = (code1 || '') + '\n' + (code2 || '');
          console.log(`🔧 Reconstructed ${language || 'plaintext'} code blocks due to actual errors`);
          return '```' + language + '\n' + combinedCode + '\n```';
        }
        return match;
      }
    );
    
    // 第二阶段：特殊处理HTML文档分割
    processedContent = processedContent.replace(
      /```(html?)\s*\n?([\s\S]*?<\/head>[\s\S]*?)```[\s\S]*?```(html?)\s*\n?([\s\S]*?<\/html>[\s\S]*?)```/g,
      (match, lang1, code1, lang2, code2) => {
        console.log('🏗️ Reconstructing complete HTML document');
        const combinedCode = (code1 || '') + '\n' + (code2 || '');
        return '```' + (lang1 || 'html') + '\n' + combinedCode + '\n```';
      }
    );
    
    // 第三阶段：处理被任意内容分割的同类型代码块
    processedContent = processedContent.replace(
      /```(\w+)\s*\n?([\s\S]*?)```([\s\S]{0,200}?)```(\1)\s*\n?([\s\S]*?)```/g,
      (match, lang1, code1, separator, lang2, code2) => {
        // 如果分隔符包含错误标记或很短，则合并
        if (separator.includes('[Display Error') || separator.trim().length < 100) {
          console.log(`🔧 Merged separated ${lang1} blocks (separator: ${separator.length} chars)`);
          const combinedCode = (code1 || '') + '\n' + separator + '\n' + (code2 || '');
          return '```' + lang1 + '\n' + combinedCode + '\n```';
        }
        return match;
      }
    );
    
    // 第四阶段：清理错误标记但保留结构
    processedContent = processedContent.replace(
      /```(\w+)?\s*\n?([\s\S]*?\[Display Error[^\]]*\][\s\S]*?)```/g,
      (match, lang, code) => {
        console.log(`🧹 Cleaning error markers in ${lang || 'plaintext'} block`);
        // 移除错误标记但保留周围内容
        const cleanedCode = (code || '').replace(/\[Display Error[^\]]*\]/g, '');
        return '```' + (lang || '') + '\n' + cleanedCode + '\n```';
      }
    );
    
    hasChanges = processedContent.length !== beforeLength;
    iterations++;
  }
  
  console.log(`✅ Aggressive code block reconstruction completed in ${iterations} iterations`);
  
  return processedContent;
};

// HTML文档特殊恢复器
const htmlDocumentRecovery = (content: string): string => {
  // 检测HTML文档模式
  if (!content.includes('<!DOCTYPE') && !content.includes('<html')) {
    return content;
  }
  
  console.log('🏥 HTML document detected, applying special recovery');
  
  // 查找所有HTML相关的代码块
  const htmlBlocks: string[] = [];
  const htmlBlockRegex = /```(?:html?)?\s*\n?([\s\S]*?)```/g;
  let match;
  
  while ((match = htmlBlockRegex.exec(content)) !== null) {
    htmlBlocks.push(match[1] || '');
  }
  
  if (htmlBlocks.length > 1) {
    console.log(`🔧 Found ${htmlBlocks.length} HTML fragments, attempting to merge`);
    
    // 合并所有HTML片段
    const mergedHtml = htmlBlocks.join('\n');
    
    // 替换所有HTML代码块为单个合并的代码块
    const recoveredContent = content.replace(
      /```(?:html?)?\s*\n?[\s\S]*?```/g,
      ''
    ).trim() + '\n\n```html\n' + mergedHtml + '\n```';
    
    console.log('✅ HTML document recovery completed');
    return recoveredContent;
  }
  
  return content;
};

// 渲染HTML（保留完整内容）
const renderedHtml = computed(() => {
  if (!props.content) return '';
  
  // 第一步：紧急内容抢救和恢复
  let content = emergencyContentRecovery(props.content);
  
  // 第二步：提取think内容
  content = extractThinkContent(content);
  
  // 第三步：智能处理流式代码块
  content = processStreamingCodeBlocks(content);
  
  // 第四步：激进的代码块重构
  content = aggressiveCodeBlockReconstructor(content);
  
  // 第五步：HTML文档特殊恢复
  content = htmlDocumentRecovery(content);

  if (!content.trim()) return '';

  try {
    // 第六步：处理代码块（保留完整内容）
    const processedContent = processCodeBlocks(content);
    
    // 第七步：用marked处理其他markdown语法
    const markedResult = marked(processedContent);
    let result = typeof markedResult === 'string' ? markedResult : String(markedResult);
    
    // 第八步：最终结果修复（不删除内容）
    result = finalResultFixer(result);
    
    // 调试输出（不阻止显示）
    if (result.includes('[object Object]')) {
      console.warn('⚠️ Still contains [object Object] - content preserved:', {
        originalContent: String(props.content).substring(0, 200),
        finalResult: result.substring(0, 200)
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Markdown parsing error:', error);
    const fallback = emergencyContentRecovery(content);
    return `<p>${fallback.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
  }
});



// 图像处理功能
const setupImageFunctions = () => {
  // 关闭模态窗口
  (window as any).closeImageModal = () => {
    const modal = document.querySelector('.image-modal');
    if (modal) {
      document.body.removeChild(modal);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', (window as any).imageModalKeyHandler);
    }
  };
  
  // 图像模态窗口功能
  (window as any).openImageModal = (imageId: string) => {
    const img = document.getElementById(imageId) as HTMLImageElement;
    if (!img) return;
    
    // 创建模态窗口
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="closeImageModal()"></div>
      <div class="modal-content">
        <button class="modal-close-btn" onclick="closeImageModal()" type="button">
          <ion-icon name="close-outline"></ion-icon>
        </button>
        <img src="${img.src}" alt="${img.alt}" class="modal-image" />
        <div class="modal-info">
          <p>${img.alt}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // 添加键盘事件
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        (window as any).closeImageModal();
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    modal.dataset.keyHandler = 'true';
  };
  
  // 下载图像
  (window as any).downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      showToast('Image downloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to download image:', error);
      showToast('Failed to download image', 'error');
    }
  };
  
  // 分享图像
  (window as any).shareImage = async (imageUrl: string, alt: string) => {
    try {
      if (navigator.share) {
        // 使用原生分享API
        await navigator.share({
          title: alt,
          text: `Check out this generated image: ${alt}`,
          url: imageUrl
        });
        showToast('Image shared successfully', 'success');
      } else {
        // 复制链接到剪贴板
        await Clipboard.write({ string: imageUrl });
        showToast('Image URL copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Failed to share image:', error);
      showToast('Failed to share image', 'error');
    }
  };
};

// 复制代码功能
const setupCopyFunction = () => {
  // 在全局作用域添加复制函数
  (window as any).copyCodeById = async (codeId: string) => {
    const codeElement = document.getElementById(codeId);
    const button = document.querySelector(`[data-code-id="${codeId}"]`) as HTMLElement;
    
    if (!codeElement || !button) {
      console.error('Code element or button not found:', codeId);
      return;
    }
    
    let code = '';
    
    // 方法1: 优先从按钮的 data-original-code 属性获取原始代码
    const originalCode = button.getAttribute('data-original-code');
    if (originalCode) {
      try {
        code = decodeURIComponent(originalCode);
        console.log('✅ Got code from data-original-code:', code.substring(0, 50) + '...');
      } catch (e) {
        console.warn('❌ Failed to decode original code, trying DOM extraction:', e);
      }
    }
    
    // 方法2: 如果没有获取到或解码失败，从DOM获取纯文本
    if (!code || code.trim() === '') {
      const codeTag = codeElement.querySelector('code');
      if (codeTag) {
        // 获取纯文本内容，去除所有HTML标签
        code = codeTag.textContent || codeTag.innerText || '';
      } else {
        code = codeElement.textContent || codeElement.innerText || '';
      }
      code = code.trim();
      console.log('ℹ️ Got code from DOM:', code.substring(0, 50) + '...');
    }
    
    // 方法3: 最后的备用方案，尝试去除HTML标签
    if (!code || code.trim() === '') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = codeElement.innerHTML;
      code = tempDiv.textContent || tempDiv.innerText || '';
      code = code.trim();
      console.log('⚠️ Got code from innerHTML cleanup:', code.substring(0, 50) + '...');
    }
    
    // 确保我们有要复制的内容
    if (!code || code.trim() === '') {
      console.error('❌ No code content found to copy');
      showToast('No code content found', 'error');
      return;
    }
    
    // 最终清理：去除可能的HTML实体
    code = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    try {
      await Clipboard.write({
        string: code
      });
      
      console.log('✅ Successfully copied code:', code.length, 'characters');
      
      // 更新按钮状态
      const originalContent = button.innerHTML;
      button.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Copied!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.innerHTML = originalContent;
        button.classList.remove('copied');
      }, 2000);
      
      showToast('Complete code copied to clipboard', 'success');
    } catch (error) {
      console.error('❌ Copy failed:', error);
      showToast('Failed to copy code', 'error');
    }
  };
};

// 组件挂载时配置
onMounted(async () => {
  registerLanguages();
  configureMarked();
  setupCopyFunction();
  setupImageFunctions();
});

// 代码块统计和监控
const analyzeCodeBlocks = (content: string) => {
  const codeBlockMatches = content.match(/```[\s\S]*?```/g) || [];
  const openMarks = (content.match(/```/g) || []).length;
  const incompleteBlocks = openMarks % 2;
  
  return {
    totalBlocks: codeBlockMatches.length,
    openMarks,
    incompleteBlocks,
    hasEmptyBlocks: /```\s*\n?\s*```/.test(content),
    blockLengths: codeBlockMatches.map(block => block.length),
    blockLanguages: codeBlockMatches.map(block => {
      const match = block.match(/```(\w+)/);
      return match ? match[1] : 'unknown';
    })
  };
};

// 实时内容监控和问题检测
watch(() => props.content, async (newContent, oldContent) => {
  if (!newContent) return;
  
  const contentStr = String(newContent);
  
  // 预检查内容是否有问题
  if (contentStr.includes('[object Object]')) {
    console.error('🚨 CRITICAL: [object Object] detected in incoming content!', {
      content: contentStr.substring(0, 200),
      type: typeof newContent,
      length: contentStr.length,
      objectPositions: [...contentStr.matchAll(/\[object Object\]/g)].map(match => match.index)
    });
    
    // 尝试定位问题源头
    if (oldContent && !String(oldContent).includes('[object Object]')) {
      console.error('💥 Object corruption occurred between updates!', {
        oldLength: String(oldContent).length,
        newLength: contentStr.length,
        diff: contentStr.length - String(oldContent).length
      });
    }
  }
  
  // 分析代码块状态
  if (props.isStreaming) {
    const analysis = analyzeCodeBlocks(contentStr);
    console.log('📊 Real-time code block analysis:', {
      streaming: props.isStreaming,
      ...analysis,
      contentLength: contentStr.length,
      hasObjectError: contentStr.includes('[object Object]')
    });
    
    // 如果检测到问题，输出详细警告
    if (analysis.hasEmptyBlocks) {
      console.warn('⚠️ Detected empty code blocks that will be recovered');
    }
    
    if (analysis.incompleteBlocks > 0) {
      console.log('🔄 Streaming content has incomplete code blocks');
    }
    
    if (analysis.totalBlocks > 3) {
      console.warn('⚠️ Multiple code blocks detected, checking for fragmentation');
      analysis.blockLanguages.forEach((lang, i) => {
        const blockContent = contentStr.match(/```[\s\S]*?```/g)?.[i] || '';
        const hasError = blockContent.includes('[object Object]');
        console.log(`📋 Block ${i + 1}: ${lang}, length: ${analysis.blockLengths[i]}, hasError: ${hasError}`);
      });
    }
  }
  
  await nextTick();
}, { flush: 'post' });

// 组件卸载时清理
onUnmounted(() => {
  // 清理全局函数
  delete (window as any).copyCodeById;
  delete (window as any).openImageModal;
  delete (window as any).closeImageModal;
  delete (window as any).downloadImage;
  delete (window as any).shareImage;
  
  console.log('✅ MarkdownRenderer component unmounted and cleaned up');
});
</script>

<style scoped>
.markdown-renderer {
  width: 100%;
  color: var(--ion-text-color);
  line-height: 1.6;
}

.markdown-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* 代码块样式 */
:deep(.code-block-container) {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--ion-color-step-50);
  border: 1px solid var(--ion-color-step-100);
}

:deep(.code-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--ion-color-step-100);
  border-bottom: 1px solid var(--ion-color-step-150);
}

:deep(.code-language) {
  font-size: 12px;
  font-weight: 600;
  color: var(--ion-color-medium);
  text-transform: uppercase;
}

:deep(.copy-button) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.copy-button:hover) {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

:deep(.copy-button.copied) {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
  transform: scale(0.95);
  animation: copied-pulse 0.6s ease-out;
}

@keyframes copied-pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 8px 20px rgba(72, 187, 120, 0.6);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
  }
}

:deep(.copy-button ion-icon) {
  font-size: 14px;
  transition: transform 0.2s ease;
}

:deep(.copy-button:hover ion-icon) {
  transform: scale(1.1);
}

:deep(.copy-button.copied ion-icon) {
  transform: scale(1.2) rotate(360deg);
}

:deep(pre.hljs) {
  margin: 0;
  padding: 16px;
  background: var(--ion-color-step-50) !important;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.5;
  font-family: 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  white-space: pre !important;
  word-break: normal !important;
  word-wrap: normal !important;
  text-align: left !important;
  direction: ltr !important;
}

:deep(pre.hljs code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-family: 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  white-space: pre !important;
  word-break: normal !important;
  display: inline !important;
  text-align: left !important;
  direction: ltr !important;
}

/* 行号样式已移除 - 简化代码块显示 */

/* 行内代码样式 */
:deep(.inline-code) {
  background: var(--ion-color-step-100);
  color: var(--ion-color-primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
  font-size: 0.9em;
  border: 1px solid var(--ion-color-step-150);
}

/* Think标签样式已移除 - 现在在独立泡泡中显示 */

/* 引用块样式 */
:deep(.quote-block) {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid var(--ion-color-primary);
  background: var(--ion-color-step-50);
  border-radius: 0 8px 8px 0;
  font-style: italic;
}

/* 标题样式 */
:deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--ion-color-primary);
}

:deep(h1) { font-size: 1.8em; }
:deep(h2) { font-size: 1.5em; }
:deep(h3) { font-size: 1.3em; }
:deep(h4) { font-size: 1.1em; }

/* 段落样式 */
:deep(p) {
  margin: 8px 0;
  word-wrap: break-word;
}

/* 列表样式 */
:deep(ul), :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

:deep(li) {
  margin: 4px 0;
}

/* 链接样式 */
:deep(a) {
  color: var(--ion-color-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-bottom-color 0.2s ease;
}

:deep(a:hover) {
  border-bottom-color: var(--ion-color-primary);
}

/* 表格样式 */
:deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  background: var(--ion-background-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(th), :deep(td) {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--ion-color-step-100);
}

:deep(th) {
  background: var(--ion-color-step-100);
  font-weight: 600;
  color: var(--ion-color-primary);
}

:deep(tr:last-child td) {
  border-bottom: none;
}

/* 分隔线样式 */
:deep(hr) {
  margin: 24px 0;
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ion-color-step-150), transparent);
}

/* 强调样式 */
:deep(strong) {
  font-weight: 600;
  color: var(--ion-color-primary);
}

:deep(em) {
  font-style: italic;
  color: var(--ion-color-medium);
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.code-header) {
    padding: 6px 12px;
  }
  
  :deep(pre.hljs) {
    padding: 12px;
    font-size: 13px;
  }
  
  :deep(table) {
    font-size: 14px;
  }
  
  :deep(th), :deep(td) {
    padding: 8px;
  }
}

/* 图像容器样式 */
:deep(.image-container) {
  margin: 16px 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--ion-color-step-50);
  border: 1px solid var(--ion-color-step-100);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

:deep(.image-container:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

:deep(.rendered-image) {
  width: 100%;
  height: auto;
  display: block;
  cursor: pointer;
  transition: transform 0.2s ease;
}

:deep(.rendered-image:hover) {
  transform: scale(1.02);
}

:deep(.image-actions) {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--ion-color-step-100);
  border-top: 1px solid var(--ion-color-step-150);
}

:deep(.image-action-btn) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

:deep(.image-action-btn:hover) {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

:deep(.image-action-btn ion-icon) {
  font-size: 14px;
}

/* 图像模态窗口样式 */
:deep(.image-modal) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: modalFadeIn 0.3s ease-out;
}

:deep(.modal-backdrop) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
}

:deep(.modal-content) {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: var(--ion-background-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

:deep(.modal-close-btn) {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: all 0.2s ease;
}

:deep(.modal-close-btn:hover) {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

:deep(.modal-close-btn ion-icon) {
  font-size: 20px;
}

:deep(.modal-image) {
  width: 100%;
  height: auto;
  display: block;
  max-height: 80vh;
  object-fit: contain;
}

:deep(.modal-info) {
  padding: 16px;
  background: var(--ion-color-step-50);
  border-top: 1px solid var(--ion-color-step-100);
}

:deep(.modal-info p) {
  margin: 0;
  font-size: 14px;
  color: var(--ion-color-medium);
  text-align: center;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalSlideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  :deep(.code-block-container) {
    background: var(--ion-color-step-100);
  }
  
  :deep(.copy-button) {
    background: linear-gradient(135deg, #4c63d2 0%, #5b4397 100%);
    box-shadow: 0 2px 4px rgba(76, 99, 210, 0.4);
  }
  
  :deep(.copy-button:hover) {
    background: linear-gradient(135deg, #4055c7 0%, #553c9a 100%);
    box-shadow: 0 4px 12px rgba(76, 99, 210, 0.5);
  }
  
  :deep(.copy-button.copied) {
    background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
    box-shadow: 0 4px 12px rgba(56, 161, 105, 0.5);
  }
  
  :deep(.image-container) {
    background: var(--ion-color-step-100);
    border-color: var(--ion-color-step-200);
  }
  
  :deep(.image-action-btn) {
    background: linear-gradient(135deg, #4c63d2 0%, #5b4397 100%);
    box-shadow: 0 2px 4px rgba(76, 99, 210, 0.4);
  }
  
  :deep(.image-action-btn:hover) {
    background: linear-gradient(135deg, #4055c7 0%, #553c9a 100%);
    box-shadow: 0 4px 8px rgba(76, 99, 210, 0.5);
  }
}
</style> 