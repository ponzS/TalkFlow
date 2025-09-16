import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

interface ChatMessage {
  role: string;
  content: string;
  images?: string[]; 
}

const CONFIG_FILE = 'api_config.json';
export let API_URL: string = 'https://a.talkflow.team'; // Default fallback

// Load API URL from filesystem on initialization
async function loadApiUrl(): Promise<void> {
  try {
    const result = await Filesystem.readFile({
      path: CONFIG_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    const config = JSON.parse(result.data.toString());
    if (config.apiUrl) {
      API_URL = config.apiUrl;
    }
  } catch (error) {
    // File doesn't exist or error reading, use default
  }
}

// Initialize API_URL
loadApiUrl();

// Export method to get current API URL
export function getApiUrl(): string {
  return API_URL;
}

// Export method to set and persist new API URL
export async function setApiUrl(newUrl: string): Promise<void> {
  try {
    API_URL = newUrl;
    await Filesystem.writeFile({
      path: CONFIG_FILE,
      data: JSON.stringify({ apiUrl: newUrl }),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } catch (error) {
    console.error('Error saving API URL:', error);
    throw error;
  }
}

export async function fetchModels(): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/api/models`);
    const data = await response.json();
    return data.map((model: any) => model.name);
  } catch (error) {
    return [];
  }
}

export async function generateReply(
  model: string,
  messages: ChatMessage[],
  mode: 'chat' | 'generate' = 'chat',
  stream: boolean = false
): Promise<string> {
  const endpoint = mode === 'chat' ? '/api/chat' : '/api/generate';
  const body = mode === 'chat'
    ? { model, messages, stream }
    : { model, prompt: messages[messages.length - 1].content, stream };

  if (stream) {
    // 正确的流式实现
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let responseContent = '';
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);
                const content = mode === 'chat' ? data.message?.content : data.response;
                if (content) {
                  responseContent += content;
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return responseContent;
  } else {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return mode === 'chat' ? (data.message?.content || data.error) : (data.response || data.error);
  }
}

// 新增：专门用于流式聊天的函数，支持回调
export async function streamChat(
  model: string,
  messages: ChatMessage[],
  onChunk: (content: string) => void,
  mode: 'chat' | 'generate' = 'chat',
  options: any = {}
): Promise<string> {
  const endpoint = mode === 'chat' ? '/api/chat' : '/api/generate';
  const body = mode === 'chat'
    ? { model, messages, stream: true, options }
    : { model, prompt: messages[messages.length - 1].content, stream: true, options };

  // 🔍 调试：输出完整的API请求
  console.log('🌐 Ollama API Request:', {
    url: `${API_URL}${endpoint}`,
    method: 'POST',
    model: model,
    mode: mode,
    messageCount: messages.length,
    hasImagesInMessages: messages.some(msg => msg.images && msg.images.length > 0),
    lastMessage: messages[messages.length - 1],
    bodyPreview: {
      model: body.model,
      messageCount: body.messages?.length || 0,
      stream: body.stream,
      options: body.options
    }
  });

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Ollama API Error:', {
      status: response.status,
      statusText: response.statusText,
      errorText: errorText
    });
    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
  }

  let responseContent = '';
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

              for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);
                const rawContent = mode === 'chat' ? data.message?.content : data.response;
                
                if (rawContent !== null && rawContent !== undefined) {
                  // 🔧 激进的字符串强制转换 - 三层保护
                  let safeContent = '';
                  
                  try {
                    // 第一层：基础类型检查
                    if (typeof rawContent === 'string') {
                      safeContent = rawContent;
                    }
                    // 第二层：对象处理 - 尝试提取文本内容
                    else if (typeof rawContent === 'object') {
                      console.warn('🚨 Object detected in stream, force converting:', rawContent);
                      
                      // 尝试智能提取
                      if (rawContent.text) {
                        safeContent = String(rawContent.text);
                      } else if (rawContent.content) {
                        safeContent = String(rawContent.content);
                      } else if (rawContent.message) {
                        safeContent = String(rawContent.message);
                      } else if (Array.isArray(rawContent)) {
                        safeContent = rawContent.map(item => String(item)).join('');
                      } else {
                        // 最后手段：JSON序列化，但去除引号让它看起来像普通文本
                        const jsonStr = JSON.stringify(rawContent);
                        safeContent = jsonStr.replace(/^"|"$/g, '').replace(/\\"/g, '"');
                        console.warn('🔧 Object serialized as emergency fallback');
                      }
                    }
                    // 第三层：其他类型强制转换
                    else {
                      safeContent = String(rawContent);
                    }
                    
                    // 最终验证和清理
                    if (typeof safeContent !== 'string') {
                      console.error('💥 CRITICAL: Content is still not string after conversion!');
                      safeContent = '[STREAM_ERROR: Non-string content detected]';
                    }
                    
                    // 清理可能的对象标记
                    safeContent = safeContent.replace(/\[object Object\]/g, '[STREAM_OBJECT_CLEANED]');
                    
                  } catch (conversionError) {
                    console.error('❌ All conversion methods failed:', conversionError);
                    safeContent = '[STREAM_CONVERSION_FAILED]';
                  }
                  
                  // 确保有内容才发送
                  if (safeContent && safeContent.length > 0) {
                    responseContent += safeContent;
                    console.log('📡 Stream chunk processed:', {
                      originalType: typeof rawContent,
                      finalType: typeof safeContent,
                      length: safeContent.length,
                      preview: safeContent.substring(0, 50) + '...'
                    });
                    
                    // 双重保险：再次验证类型再回调
                    const finalContent = String(safeContent);
                    onChunk(finalContent);
                  }
                }
              }
            } catch (parseError) {
              console.warn('⚠️ JSON parse error, trying raw line extraction:', parseError);
              // 紧急情况：如果JSON解析失败，尝试直接提取文本
              const rawLine = line.slice(6);
              if (rawLine.includes('"content"') || rawLine.includes('"response"')) {
                try {
                  // 尝试正则提取内容
                  const contentMatch = rawLine.match(/"(?:content|response)"\s*:\s*"([^"]*)"/) ||
                                     rawLine.match(/"(?:content|response)"\s*:\s*([^,}]*)/);
                  if (contentMatch) {
                    const extractedContent = contentMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
                    if (extractedContent && extractedContent !== 'null') {
                      responseContent += extractedContent;
                      onChunk(extractedContent);
                      console.log('🚑 Emergency content extraction successful');
                    }
                  }
                } catch (regexError) {
                  console.error('❌ Emergency extraction also failed:', regexError);
                }
              }
            }
          }
        }
    }
  } finally {
    reader.releaseLock();
  }

  return responseContent;
}

// 新增：非流式聊天函数
export async function chat(
  model: string,
  messages: ChatMessage[],
  mode: 'chat' | 'generate' = 'chat',
  options: any = {}
): Promise<string> {
  const endpoint = mode === 'chat' ? '/api/chat' : '/api/generate';
  const body = mode === 'chat'
    ? { model, messages, stream: false, options }
    : { model, prompt: messages[messages.length - 1].content, stream: false, options };

  // 🔍 调试：输出完整的API请求
  console.log('🌐 Ollama API Request (Non-stream):', {
    url: `${API_URL}${endpoint}`,
    method: 'POST',
    model: model,
    mode: mode,
    messageCount: messages.length,
    hasImagesInMessages: messages.some(msg => msg.images && msg.images.length > 0),
    lastMessage: messages[messages.length - 1],
    bodyPreview: {
      model: body.model,
      messageCount: body.messages?.length || 0,
      stream: body.stream,
      options: body.options
    }
  });

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Ollama API Error (Non-stream):', {
      status: response.status,
      statusText: response.statusText,
      errorText: errorText
    });
    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Ollama API Response (Non-stream):', {
    hasResponse: !!data,
    hasMessage: !!data.message,
    hasContent: !!data.message?.content,
    preview: data.message?.content?.substring(0, 100) + '...' || 'no content'
  });
  
  return mode === 'chat' ? (data.message?.content || data.error || 'No response') : (data.response || data.error || 'No response');
}
