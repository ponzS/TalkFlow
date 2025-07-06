import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { chat } from './ollamaService';

// 本地图像生成配置
const LOCAL_CONFIG_FILE = 'local_image_config.json';

interface LocalImageConfig {
  stableDiffusionUrl: string;
  promptEnhancerModel: string;
  useOllamaForPrompts: boolean;
  stableDiffusionModel: string;
}

let config: LocalImageConfig = {
  stableDiffusionUrl: 'http://127.0.0.1:7860', // 默认Stable Diffusion WebUI地址
  promptEnhancerModel: 'llama3.1:8b', // 用于增强提示词的ollama模型
  useOllamaForPrompts: true,
  stableDiffusionModel: 'v1-5-pruned-emaonly.safetensors', // 默认SD模型
};

// 加载配置
async function loadConfig(): Promise<void> {
  try {
    const result = await Filesystem.readFile({
      path: LOCAL_CONFIG_FILE,
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
      path: LOCAL_CONFIG_FILE,
      data: JSON.stringify(config),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } catch (error) {
    console.error('Error saving local image config:', error);
  }
}

// 初始化
loadConfig();

// 导出配置管理函数
export function getLocalImageConfig(): LocalImageConfig {
  return { ...config };
}

export async function setStableDiffusionUrl(url: string): Promise<void> {
  config.stableDiffusionUrl = url;
  await saveConfig();
}

export async function setPromptEnhancerModel(model: string): Promise<void> {
  config.promptEnhancerModel = model;
  await saveConfig();
}

export async function setUseOllamaForPrompts(use: boolean): Promise<void> {
  config.useOllamaForPrompts = use;
  await saveConfig();
}

// 图像生成选项
export interface LocalImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  enhancePrompt?: boolean;
}

// 图像生成结果
export interface LocalImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBlob?: Blob;
  enhancedPrompt?: string;
  originalPrompt?: string;
  error?: string;
  timeTaken?: number;
}

// 使用ollama增强提示词
export async function enhancePromptWithOllama(originalPrompt: string): Promise<string> {
  if (!config.useOllamaForPrompts) {
    return originalPrompt;
  }

  try {
    const enhancementInstruction = `You are a professional Stable Diffusion prompt engineer. Your task is to enhance and improve image generation prompts to create high-quality, detailed images.

Take this basic prompt and enhance it with:
- More specific artistic details
- Better composition descriptions
- Lighting and atmosphere details
- Quality enhancers
- Technical photography terms when appropriate

Original prompt: "${originalPrompt}"

Return ONLY the enhanced prompt, nothing else. Keep it under 200 words and avoid overly complex concepts. Focus on visual details that will improve the generated image.

Enhanced prompt:`;

    const messages = [
      { role: 'user', content: enhancementInstruction }
    ];

    const enhancedPrompt = await chat(
      config.promptEnhancerModel,
      messages,
      'chat'
    );

    // 清理返回的提示词
    return enhancedPrompt
      .replace(/^Enhanced prompt:\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .trim();

  } catch (error) {
    console.error('Failed to enhance prompt with Ollama:', error);
    return originalPrompt;
  }
}

// 检查Stable Diffusion WebUI连接
export async function checkStableDiffusionConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${config.stableDiffusionUrl}/sdapi/v1/options`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// 获取可用的SD模型
export async function getStableDiffusionModels(): Promise<string[]> {
  try {
    const response = await fetch(`${config.stableDiffusionUrl}/sdapi/v1/sd-models`);
    if (!response.ok) throw new Error('Failed to fetch models');
    
    const models = await response.json();
    return models.map((model: any) => model.title || model.model_name);
  } catch (error) {
    console.error('Failed to fetch SD models:', error);
    return [];
  }
}

// 生成图像
export async function generateImageLocally(options: LocalImageGenerationOptions): Promise<LocalImageGenerationResult> {
  const startTime = Date.now();
  
  try {
    // 1. 增强提示词（如果启用）
    let finalPrompt = options.prompt;
    if (options.enhancePrompt !== false) {
      finalPrompt = await enhancePromptWithOllama(options.prompt);
      console.log('🎨 Prompt enhanced:', {
        original: options.prompt,
        enhanced: finalPrompt
      });
    }

    // 2. 构建Stable Diffusion请求
    const payload = {
      prompt: finalPrompt,
      negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, deformed, duplicate, bad anatomy, bad hands, bad fingers, ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, mutation, mutated, extra limbs, extra legs, extra arms, disfigured, deformed, cross-eye, body out of frame, watermark, signature, text, logo',
      width: options.width || 512,
      height: options.height || 512,
      steps: options.steps || 20,
      cfg_scale: options.cfgScale || 7,
      seed: options.seed || -1,
      sampler_name: 'DPM++ 2M Karras',
      batch_size: 1,
      n_iter: 1,
      restore_faces: false,
      tiling: false,
      enable_hr: false,
    };

    // 3. 调用Stable Diffusion API
    const response = await fetch(`${config.stableDiffusionUrl}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stable Diffusion API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.images || result.images.length === 0) {
      throw new Error('No images generated');
    }

    // 4. 处理返回的图像（base64）
    const base64Image = result.images[0];
    const imageBlob = base64ToBlob(base64Image, 'image/png');
    const imageUrl = URL.createObjectURL(imageBlob);
    
    const timeTaken = Date.now() - startTime;

    return {
      success: true,
      imageUrl,
      imageBlob,
      enhancedPrompt: finalPrompt,
      originalPrompt: options.prompt,
      timeTaken
    };

  } catch (error) {
    console.error('Local image generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '本地图像生成失败',
      originalPrompt: options.prompt
    };
  }
}

// Base64转Blob
function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

// 获取随机种子
export function getRandomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

// 预设风格
export const LOCAL_STYLE_PRESETS = {
  realistic: {
    name: '写实摄影',
    promptSuffix: ', photorealistic, highly detailed, professional photography, sharp focus, realistic lighting',
    negativePrompt: 'cartoon, anime, painting, drawing, illustration, artificial, fake'
  },
  anime: {
    name: '动漫风格',
    promptSuffix: ', anime style, manga style, cell shading, vibrant colors, detailed anime art',
    negativePrompt: 'realistic, photographic, ugly, deformed, bad anatomy'
  },
  artistic: {
    name: '艺术绘画',
    promptSuffix: ', digital art, concept art, trending on artstation, detailed painting, artistic masterpiece',
    negativePrompt: 'photograph, realistic, blurry, low quality'
  },
  cinematic: {
    name: '电影质感',
    promptSuffix: ', cinematic lighting, movie still, dramatic lighting, film grain, cinematic composition',
    negativePrompt: 'amateur, casual, low budget, poor lighting'
  }
};

// 质量提升标签
export const QUALITY_TAGS = [
  'masterpiece', 'best quality', 'ultra detailed', 'high resolution',
  '8k', '4k', 'extremely detailed', 'professional', 'award winning'
];

// Stable Diffusion常用采样器
export const SAMPLERS = [
  'Euler a', 'Euler', 'LMS', 'Heun', 'DPM2', 'DPM2 a',
  'DPM++ 2S a', 'DPM++ 2M', 'DPM++ SDE', 'DPM++ 2M Karras',
  'DPM++ SDE Karras', 'DDIM', 'PLMS'
];

// 检查ollama连接和模型
export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// 获取ollama可用模型
export async function getOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) throw new Error('Failed to fetch ollama models');
    
    const data = await response.json();
    return data.models?.map((model: any) => model.name) || [];
  } catch (error) {
    console.error('Failed to fetch ollama models:', error);
    return [];
  }
} 