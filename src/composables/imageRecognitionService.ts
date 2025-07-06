import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { getApiUrl } from './ollamaService';

// 图像识别配置
const IMAGE_CONFIG_FILE = 'image_recognition_config.json';

interface ImageRecognitionConfig {
  visionModel: string;
  maxImageSize: number; // KB
  supportedFormats: string[];
  autoResize: boolean;
}

let config: ImageRecognitionConfig = {
  visionModel: 'llava:latest', // 默认使用llava模型
  maxImageSize: 5 * 1024, // 5MB
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  autoResize: true,
};

// 加载配置
async function loadConfig(): Promise<void> {
  try {
    const result = await Filesystem.readFile({
      path: IMAGE_CONFIG_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    const savedConfig = JSON.parse(result.data.toString());
    config = { ...config, ...savedConfig };
  } catch (error) {
    // 文件不存在或读取错误，使用默认配置
  }
}

// 保存配置
async function saveConfig(): Promise<void> {
  try {
    await Filesystem.writeFile({
      path: IMAGE_CONFIG_FILE,
      data: JSON.stringify(config),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } catch (error) {
    console.error('Error saving image recognition config:', error);
  }
}

// 初始化
loadConfig();

// 导出配置管理函数
export function getImageRecognitionConfig(): ImageRecognitionConfig {
  return { ...config };
}

export async function setVisionModel(model: string): Promise<void> {
  config.visionModel = model;
  await saveConfig();
}

export async function setMaxImageSize(size: number): Promise<void> {
  config.maxImageSize = size;
  await saveConfig();
}

// 图像识别选项
export interface ImageRecognitionOptions {
  imageData: string; // 完整的base64数据URI，包含MIME类型 (data:image/...;base64,...)
  prompt?: string; // 自定义提示词
  language?: 'zh' | 'en'; // 识别语言
}

// 图像识别结果
export interface ImageRecognitionResult {
  success: boolean;
  description?: string;
  confidence?: number;
  objects?: string[];
  colors?: string[];
  text?: string; // OCR文本（如果有）
  emotions?: string[]; // 情感识别（如果是人物）
  error?: string;
  timeTaken?: number;
}

// 检查图片文件
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // 检查文件类型
  if (!config.supportedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的文件格式。支持的格式：${config.supportedFormats.join(', ')}`
    };
  }

  // 检查文件大小
  const fileSizeKB = file.size / 1024;
  if (fileSizeKB > config.maxImageSize) {
    return {
      valid: false,
      error: `文件太大。最大支持：${config.maxImageSize}KB，当前：${Math.round(fileSizeKB)}KB`
    };
  }

  return { valid: true };
}

// 将文件转换为base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // 返回完整的base64数据URI，包含MIME类型前缀
        // ollama的视觉模型需要完整的格式：data:image/jpeg;base64,/9j/4AAQ...
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// 调整图片尺寸
export function resizeImage(file: File, maxWidth: number = 1024, maxHeight: number = 1024, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 计算新尺寸
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制图片
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to resize image'));
        }
      }, file.type, quality);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// 获取可用的视觉模型
export async function getVisionModels(): Promise<string[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/models`);
    if (!response.ok) throw new Error('Failed to fetch models');
    
    const models = await response.json();
    
    // 过滤出视觉模型（通常包含这些关键词）
    const visionKeywords = ['llava', 'minicpm-v', 'vision', 'multimodal', 'llama3.2-vision', 'qwen-vl', 'cogvlm'];
    
    return models
      .map((model: any) => model.name)
      .filter((name: string) => 
        visionKeywords.some(keyword => 
          name.toLowerCase().includes(keyword)
        )
      );
  } catch (error) {
    console.error('Failed to fetch vision models:', error);
    return [];
  }
}

// 识别图像内容
export async function recognizeImage(options: ImageRecognitionOptions): Promise<ImageRecognitionResult> {
  const startTime = Date.now();
  
  try {
    // 构建提示词
    const defaultPrompts = {
      zh: '请详细描述这张图片的内容，包括：主要物体、场景、颜色、人物表情（如果有）、文字内容（如果有）等。请用中文回答。',
      en: 'Please describe this image in detail, including: main objects, scene, colors, facial expressions (if any), text content (if any), etc. Please answer in English.'
    };
    
    const prompt = options.prompt || defaultPrompts[options.language || 'zh'];
    
    // 构建消息
    const messages = [
      {
        role: 'user',
        content: prompt,
        images: [options.imageData] // base64图像数据
      }
    ];

    // 调用ollama API
    const response = await fetch(`${getApiUrl()}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.visionModel,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.3, // 较低的温度以获得更准确的描述
          top_p: 0.9,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const description = result.message?.content || result.response || '';
    
    if (!description || description.trim() === '') {
      throw new Error('No description received from vision model');
    }

    const timeTaken = Date.now() - startTime;

    // 尝试从描述中提取结构化信息
    const analysis = analyzeDescription(description);

    return {
      success: true,
      description: description.trim(),
      timeTaken,
      ...analysis
    };

  } catch (error) {
    console.error('Image recognition error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '图像识别失败',
      timeTaken: Date.now() - startTime
    };
  }
}

// 分析描述文本，提取结构化信息
function analyzeDescription(description: string): Partial<ImageRecognitionResult> {
  const result: Partial<ImageRecognitionResult> = {};
  
  // 提取颜色信息
  const colorMatches = description.match(/(?:颜色|color|红色|蓝色|绿色|黄色|紫色|橙色|黑色|白色|灰色|棕色|粉色|red|blue|green|yellow|purple|orange|black|white|gray|brown|pink)/gi);
  if (colorMatches) {
    result.colors = Array.from(new Set(colorMatches.map(c => c.toLowerCase())));
  }
  
  // 提取物体信息（简单的关键词匹配）
  const objectKeywords = [
    '猫', '狗', '人', '车', '房子', '树', '花', '书', '手机', '电脑',
    'cat', 'dog', 'person', 'car', 'house', 'tree', 'flower', 'book', 'phone', 'computer'
  ];
  
  const foundObjects = objectKeywords.filter(keyword => 
    description.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (foundObjects.length > 0) {
    result.objects = foundObjects;
  }
  
  // 提取情感信息
  const emotionKeywords = [
    '开心', '高兴', '快乐', '微笑', '笑容', '悲伤', '生气', '惊讶', '害怕',
    'happy', 'smile', 'smiling', 'sad', 'angry', 'surprised', 'scared', 'joy'
  ];
  
  const foundEmotions = emotionKeywords.filter(emotion => 
    description.toLowerCase().includes(emotion.toLowerCase())
  );
  
  if (foundEmotions.length > 0) {
    result.emotions = foundEmotions;
  }
  
  // 简单的置信度评估（基于描述长度和详细程度）
  if (description.length > 100) {
    result.confidence = 0.8;
  } else if (description.length > 50) {
    result.confidence = 0.6;
  } else {
    result.confidence = 0.4;
  }
  
  return result;
}

// 预设的图像识别提示词
export const IMAGE_PROMPTS = {
  general: {
    zh: '请详细描述这张图片的内容。',
    en: 'Please describe this image in detail.'
  },
  objects: {
    zh: '请识别并列出图片中的所有物体。',
    en: 'Please identify and list all objects in this image.'
  },
  scene: {
    zh: '请描述图片的场景和环境。',
    en: 'Please describe the scene and environment in this image.'
  },
  text: {
    zh: '请读出图片中的所有文字内容。',
    en: 'Please read all text content in this image.'
  },
  people: {
    zh: '请描述图片中人物的外观、表情和动作。',
    en: 'Please describe the appearance, expressions, and actions of people in this image.'
  },
  analyze: {
    zh: '请对这张图片进行深入分析，包括构图、色彩、风格等艺术元素。',
    en: 'Please provide an in-depth analysis of this image, including composition, colors, style, and other artistic elements.'
  }
};

// 支持的视觉模型信息
export const VISION_MODELS = {
  'llava:latest': {
    name: 'LLaVA',
    description: '通用视觉语言模型，擅长图像理解和对话',
    size: '~7GB',
    languages: ['中文', 'English']
  },
  'llava:7b': {
    name: 'LLaVA 7B',
    description: '轻量版LLaVA，适合低配置设备',
    size: '~4GB',
    languages: ['中文', 'English']
  },
  'minicpm-v:8b': {
    name: 'MiniCPM-V',
    description: '高效的多模态模型，支持高分辨率图像',
    size: '~5GB',
    languages: ['中文', 'English']
  },
  'llama3.2-vision:11b': {
    name: 'Llama 3.2 Vision',
    description: 'Meta最新的视觉模型，性能卓越',
    size: '~7GB',
    languages: ['English', '中文']
  }
};

// 检查模型是否已安装
export async function checkModelInstalled(modelName: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiUrl()}/api/models`);
    if (!response.ok) return false;
    
    const models = await response.json();
    return models.some((model: any) => model.name === modelName);
  } catch (error) {
    return false;
  }
}

// 安装视觉模型
export async function installVisionModel(modelName: string, onProgress?: (progress: string) => void): Promise<boolean> {
  try {
    const response = await fetch(`${getApiUrl()}/api/models/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName,
        stream: true
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start model download: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.status && onProgress) {
              onProgress(data.status);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to install vision model:', error);
    return false;
  }
} 