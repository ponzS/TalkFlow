import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// Hugging Face 配置
const HF_CONFIG_FILE = 'hf_config.json';
const DEFAULT_HF_API_URL = 'https://api-inference.huggingface.co/models';
const DEFAULT_MODEL = 'runwayml/stable-diffusion-v1-5';

// 图像生成配置
interface ImageGenerationConfig {
  hfApiKey?: string;
  model: string;
  apiUrl: string;
}

let config: ImageGenerationConfig = {
  model: DEFAULT_MODEL,
  apiUrl: DEFAULT_HF_API_URL,
};

// 加载配置
async function loadConfig(): Promise<void> {
  try {
    const result = await Filesystem.readFile({
      path: HF_CONFIG_FILE,
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
      path: HF_CONFIG_FILE,
      data: JSON.stringify(config),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } catch (error) {
    console.error('Error saving HF config:', error);
  }
}

// 初始化配置
loadConfig();

// 导出配置管理函数
export function getImageConfig(): ImageGenerationConfig {
  return { ...config };
}

export async function setHuggingFaceApiKey(apiKey: string): Promise<void> {
  config.hfApiKey = apiKey;
  await saveConfig();
}

export async function setImageModel(model: string): Promise<void> {
  config.model = model;
  await saveConfig();
}

// 图像生成接口
export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
}

// 图像生成结果
export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBlob?: Blob;
  error?: string;
  timeTaken?: number;
}

// 可用的图像生成模型
export const AVAILABLE_MODELS = [
  {
    id: 'runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion 1.5',
    description: '高质量的通用图像生成'
  },
  {
    id: 'stabilityai/stable-diffusion-2-1',
    name: 'Stable Diffusion 2.1',
    description: '改进的图像质量和细节'
  },
  {
    id: 'prompthero/openjourney',
    name: 'OpenJourney',
    description: '艺术风格的图像生成'
  },
  {
    id: 'nitrosocke/Arcane-Diffusion',
    name: 'Arcane Diffusion',
    description: '动漫风格的图像生成'
  },
  {
    id: 'Fictiverse/Stable_Diffusion_Microscopic_model',
    name: 'Microscopic Style',
    description: '微观风格的图像生成'
  }
];

// 生成图像
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  
  if (!config.hfApiKey) {
    return {
      success: false,
      error: '请先设置 Hugging Face API Key'
    };
  }

  try {
    const response = await fetch(`${config.apiUrl}/${config.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: options.prompt,
        parameters: {
          negative_prompt: options.negativePrompt || '',
          width: options.width || 512,
          height: options.height || 512,
          num_inference_steps: options.numInferenceSteps || 20,
          guidance_scale: options.guidanceScale || 7.5,
          seed: options.seed,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMsg = errorData.error;
        }
      } catch (e) {
        // 使用默认错误消息
      }

      return {
        success: false,
        error: errorMsg
      };
    }

    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);
    const timeTaken = Date.now() - startTime;

    return {
      success: true,
      imageUrl,
      imageBlob,
      timeTaken
    };

  } catch (error) {
    console.error('Image generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '图像生成失败'
    };
  }
}

// 检查模型状态（一些模型可能需要预热）
export async function checkModelStatus(model?: string): Promise<boolean> {
  const modelToCheck = model || config.model;
  
  if (!config.hfApiKey) {
    return false;
  }

  try {
    const response = await fetch(`${config.apiUrl}/${modelToCheck}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: 'test',
        parameters: {
          width: 128,
          height: 128,
          num_inference_steps: 1
        }
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

// 获取随机种子
export function getRandomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

// 图像提示词优化建议
export const PROMPT_SUGGESTIONS = {
  style: [
    'photorealistic', 'digital art', 'oil painting', 'watercolor',
    'anime style', 'cartoon style', 'concept art', 'illustration'
  ],
  quality: [
    'highly detailed', '4k', '8k', 'masterpiece', 'best quality',
    'sharp focus', 'professional photography', 'award winning'
  ],
  lighting: [
    'soft lighting', 'dramatic lighting', 'golden hour', 'studio lighting',
    'natural lighting', 'cinematic lighting', 'rim lighting'
  ],
  camera: [
    'close-up', 'wide shot', 'portrait', 'landscape orientation',
    'macro shot', 'aerial view', 'low angle', 'high angle'
  ]
};

// 负面提示词常用选项
export const NEGATIVE_PROMPTS = [
  'blurry', 'low quality', 'low resolution', 'pixelated',
  'distorted', 'deformed', 'watermark', 'signature',
  'text', 'letters', 'words', 'cropped', 'out of frame'
].join(', '); 