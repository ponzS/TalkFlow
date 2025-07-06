<template>
  <div class="image-generation-panel">
    <!-- 主要输入区域 -->
    <div class="input-section">
      <div class="prompt-group">
        <label class="prompt-label">
          <ion-icon name="color-palette-outline"></ion-icon>
          图像描述 (Prompt)
        </label>
        <textarea
          v-model="prompt"
          class="prompt-input"
          placeholder="描述你想要生成的图像，例如：一只可爱的小猫在花园里玩耍，阳光明媚，水彩画风格"
          rows="3"
        ></textarea>
      </div>

      <div class="negative-prompt-group">
        <label class="prompt-label">
          <ion-icon name="ban-outline"></ion-icon>
          负面描述 (可选)
        </label>
        <textarea
          v-model="negativePrompt"
          class="prompt-input negative"
          placeholder="描述你不希望出现的内容，例如：模糊、低质量、变形"
          rows="2"
        ></textarea>
        <button 
          class="quick-fill-btn"
          @click="fillCommonNegativePrompt"
          type="button"
        >
          <ion-icon name="flash-outline"></ion-icon>
          使用常用负面词
        </button>
      </div>
    </div>

    <!-- 快速风格选择 -->
    <div class="style-section">
      <label class="section-label">
        <ion-icon name="brush-outline"></ion-icon>
        快速风格
      </label>
      <div class="style-chips">
        <button
          v-for="style in quickStyles"
          :key="style.name"
          class="style-chip"
          :class="{ active: selectedStyles.includes(style.name) }"
          @click="toggleStyle(style.name)"
          type="button"
        >
          {{ style.label }}
        </button>
      </div>
    </div>

    <!-- 高级参数 -->
    <div class="advanced-section" v-if="showAdvanced">
      <div class="parameter-row">
        <div class="parameter-group">
          <label>宽度</label>
          <select v-model="width">
            <option value="512">512px</option>
            <option value="768">768px</option>
            <option value="1024">1024px</option>
          </select>
        </div>
        <div class="parameter-group">
          <label>高度</label>
          <select v-model="height">
            <option value="512">512px</option>
            <option value="768">768px</option>
            <option value="1024">1024px</option>
          </select>
        </div>
      </div>

      <div class="parameter-row">
        <div class="parameter-group">
          <label>生成步数: {{ numInferenceSteps }}</label>
          <input
            type="range"
            v-model="numInferenceSteps"
            min="10"
            max="50"
            step="5"
            class="range-slider"
          />
        </div>
        <div class="parameter-group">
          <label>引导强度: {{ guidanceScale }}</label>
          <input
            type="range"
            v-model="guidanceScale"
            min="1"
            max="20"
            step="0.5"
            class="range-slider"
          />
        </div>
      </div>

      <div class="parameter-row">
        <div class="parameter-group">
          <label>随机种子</label>
          <div class="seed-input-group">
            <input
              type="number"
              v-model="seed"
              placeholder="留空随机"
              min="0"
              max="2147483647"
            />
            <button
              class="random-seed-btn"
              @click="generateRandomSeed"
              type="button"
            >
              <ion-icon name="shuffle-outline"></ion-icon>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="control-section">
      <button
        class="advanced-toggle"
        @click="showAdvanced = !showAdvanced"
        type="button"
      >
        <ion-icon :name="showAdvanced ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
        {{ showAdvanced ? '隐藏' : '显示' }}高级选项
      </button>
      
      <div class="generate-controls">
        <button
          class="generate-btn"
          @click="handleGenerate"
          :disabled="!prompt.trim() || isGenerating"
          type="button"
        >
          <ion-icon 
            :name="isGenerating ? 'hourglass-outline' : 'image-outline'"
            :class="{ spinning: isGenerating }"
          ></ion-icon>
          {{ isGenerating ? '生成中...' : '生成图像' }}
        </button>
      </div>
    </div>

    <!-- 生成进度 -->
    <div v-if="isGenerating" class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <p class="progress-text">{{ progressText }}</p>
    </div>

    <!-- 生成结果 -->
    <div v-if="generatedImage" class="result-section">
      <div class="result-header">
        <h3>生成结果</h3>
        <div class="result-actions">
          <button class="action-btn" @click="downloadImage" type="button">
            <ion-icon name="download-outline"></ion-icon>
            下载
          </button>
          <button class="action-btn" @click="sendToChat" type="button">
            <ion-icon name="send-outline"></ion-icon>
            发送到聊天
          </button>
        </div>
      </div>
      <div class="image-container">
        <img :src="generatedImage.imageUrl" alt="Generated image" />
        <div class="image-info">
          <p>生成时间: {{ generatedImage.timeTaken }}ms</p>
          <p>尺寸: {{ width }}x{{ height }}</p>
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-section">
      <ion-icon name="alert-circle-outline"></ion-icon>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="handleGenerate" type="button">
        <ion-icon name="refresh-outline"></ion-icon>
        重试
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { 
  generateImage, 
  getRandomSeed, 
  NEGATIVE_PROMPTS,
  type ImageGenerationOptions,
  type ImageGenerationResult 
} from '../../composables/imageGenerationService';

// 事件定义
const emit = defineEmits<{
  imageGenerated: [result: ImageGenerationResult & { prompt: string }];
  sendImage: [imageUrl: string, prompt: string];
}>();

// 响应式数据
const prompt = ref('');
const negativePrompt = ref('');
const selectedStyles = ref<string[]>([]);
const showAdvanced = ref(false);

// 生成参数
const width = ref(512);
const height = ref(512);
const numInferenceSteps = ref(20);
const guidanceScale = ref(7.5);
const seed = ref<number | null>(null);

// 生成状态
const isGenerating = ref(false);
const progress = ref(0);
const progressText = ref('');
const generatedImage = ref<ImageGenerationResult | null>(null);
const error = ref('');

// 快速风格选择
const quickStyles = [
  { name: 'photorealistic', label: '写实' },
  { name: 'digital art', label: '数字艺术' },
  { name: 'anime style', label: '动漫' },
  { name: 'oil painting', label: '油画' },
  { name: 'watercolor', label: '水彩' },
  { name: 'cartoon style', label: '卡通' },
  { name: 'concept art', label: '概念图' },
  { name: 'illustration', label: '插画' }
];

// 计算最终提示词
const finalPrompt = computed(() => {
  let result = prompt.value.trim();
  if (selectedStyles.value.length > 0) {
    result += ', ' + selectedStyles.value.join(', ');
  }
  return result;
});

// 切换风格选择
const toggleStyle = (style: string) => {
  const index = selectedStyles.value.indexOf(style);
  if (index > -1) {
    selectedStyles.value.splice(index, 1);
  } else {
    selectedStyles.value.push(style);
  }
};

// 填充常用负面提示词
const fillCommonNegativePrompt = () => {
  negativePrompt.value = NEGATIVE_PROMPTS;
};

// 生成随机种子
const generateRandomSeed = () => {
  seed.value = getRandomSeed();
};

// 模拟进度更新
const simulateProgress = () => {
  progress.value = 0;
  progressText.value = '准备生成...';
  
  const interval = setInterval(() => {
    progress.value += Math.random() * 15;
    
    if (progress.value >= 100) {
      progress.value = 100;
      progressText.value = '生成完成！';
      clearInterval(interval);
    } else if (progress.value > 80) {
      progressText.value = '最后处理...';
    } else if (progress.value > 60) {
      progressText.value = '渲染细节...';
    } else if (progress.value > 40) {
      progressText.value = '生成图像...';
    } else if (progress.value > 20) {
      progressText.value = '处理提示词...';
    }
  }, 500);

  return interval;
};

// 处理图像生成
const handleGenerate = async () => {
  if (!finalPrompt.value.trim()) return;
  
  isGenerating.value = true;
  error.value = '';
  generatedImage.value = null;
  
  const progressInterval = simulateProgress();
  
  try {
    const options: ImageGenerationOptions = {
      prompt: finalPrompt.value,
      negativePrompt: negativePrompt.value || undefined,
      width: Number(width.value),
      height: Number(height.value),
      numInferenceSteps: Number(numInferenceSteps.value),
      guidanceScale: Number(guidanceScale.value),
      seed: seed.value || undefined,
    };
    
    const result = await generateImage(options);
    
    if (result.success) {
      generatedImage.value = result;
      emit('imageGenerated', { ...result, prompt: finalPrompt.value });
    } else {
      error.value = result.error || '图像生成失败';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '未知错误';
  } finally {
    clearInterval(progressInterval);
    isGenerating.value = false;
    progress.value = 0;
  }
};

// 下载图像
const downloadImage = () => {
  if (!generatedImage.value?.imageUrl) return;
  
  const link = document.createElement('a');
  link.href = generatedImage.value.imageUrl;
  link.download = `generated-image-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 发送到聊天
const sendToChat = () => {
  if (!generatedImage.value?.imageUrl) return;
  emit('sendImage', generatedImage.value.imageUrl, finalPrompt.value);
};
</script>

<style scoped>
.image-generation-panel {
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  max-width: 500px;
  margin: 0 auto;
}

.input-section {
  margin-bottom: 1.5rem;
}

.prompt-group, .negative-prompt-group {
  margin-bottom: 1rem;
}

.prompt-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.prompt-input {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  resize: vertical;
  font-family: inherit;
}

.prompt-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.prompt-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.quick-fill-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.quick-fill-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.style-section {
  margin-bottom: 1.5rem;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.style-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.style-chip {
  padding: 0.4rem 0.8rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: white;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.style-chip:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.style-chip.active {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
}

.advanced-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.parameter-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.parameter-group {
  flex: 1;
}

.parameter-group label {
  display: block;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  opacity: 0.9;
}

.parameter-group select,
.parameter-group input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.9rem;
}

.range-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  -webkit-appearance: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.seed-input-group {
  display: flex;
  gap: 0.5rem;
}

.random-seed-btn {
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.random-seed-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(180deg);
}

.control-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.advanced-toggle {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.advanced-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
}

.generate-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-section {
  margin-bottom: 1rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4aa, #00d4ff);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  text-align: center;
  font-size: 0.9rem;
  margin: 0;
  opacity: 0.9;
}

.result-section {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.result-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.result-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.image-container img {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.image-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  opacity: 0.8;
}

.image-info p {
  margin: 0;
}

.error-section {
  background: rgba(255, 59, 48, 0.2);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.error-section p {
  margin: 0;
  flex: 1;
  min-width: 200px;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 59, 48, 0.8);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: rgba(255, 59, 48, 1);
  transform: translateY(-1px);
}
</style> 