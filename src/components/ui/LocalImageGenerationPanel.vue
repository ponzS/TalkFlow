<template>
  <div class="local-image-panel">
    <!-- 状态检查 -->
    <div v-if="!servicesReady" class="services-status">
      <div class="status-banner">
        <ion-icon name="warning-outline"></ion-icon>
        <div class="status-text">
          <h4>服务状态检查</h4>
          <p>{{ statusMessage }}</p>
        </div>
        <button class="check-btn" @click="checkServices">
          <ion-icon name="refresh-outline"></ion-icon>
          重新检查
        </button>
      </div>
    </div>

    <!-- 生成界面 -->
    <div v-else class="generation-interface">
      <!-- 提示词输入 -->
      <div class="prompt-section">
        <div class="prompt-group">
          <label class="prompt-label">
            <ion-icon name="create-outline"></ion-icon>
            图像描述
          </label>
          <textarea
            v-model="prompt"
            class="prompt-input"
            placeholder="描述你想要生成的图像，例如：一只可爱的小猫在花园里玩耍"
            rows="3"
          ></textarea>
        </div>

        <!-- 负面提示词 -->
        <div class="negative-prompt-group">
          <label class="prompt-label">
            <ion-icon name="close-circle-outline"></ion-icon>
            负面描述 (可选)
          </label>
          <textarea
            v-model="negativePrompt"
            class="prompt-input"
            placeholder="描述你不希望出现的内容"
            rows="2"
          ></textarea>
        </div>
      </div>

      <!-- 生成按钮 -->
      <div class="controls-section">
        <button
          class="generate-btn"
          @click="handleGenerate"
          :disabled="!canGenerate || isGenerating"
        >
          <ion-icon 
            :name="isGenerating ? 'hourglass-outline' : 'image-outline'"
            :class="{ spinning: isGenerating }"
          ></ion-icon>
          {{ isGenerating ? '生成中...' : '生成图像' }}
        </button>
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
        </div>
        <div class="image-container">
          <img :src="generatedImage.imageUrl" alt="Generated image" />
          <div class="image-actions">
            <button @click="downloadImage">下载</button>
            <button @click="sendToChat">发送到聊天</button>
          </div>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="error" class="error-section">
        <p>{{ error }}</p>
        <button @click="handleGenerate">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonIcon } from '@ionic/vue';
import { 
  createOutline, closeCircleOutline, imageOutline, hourglassOutline,
  warningOutline, refreshOutline
} from 'ionicons/icons';
import {
  checkOllamaConnection,
  checkStableDiffusionConnection,
  generateImageLocally,
  type LocalImageGenerationResult
} from '../../composables/localImageGenerationService';
import { showToast } from '../../composables/useToast';

// 事件定义
const emit = defineEmits<{
  imageGenerated: [result: LocalImageGenerationResult & { prompt: string }];
  sendImage: [imageUrl: string, prompt: string];
}>();

// 响应式数据
const servicesReady = ref(false);
const statusMessage = ref('检查服务状态...');

const prompt = ref('');
const negativePrompt = ref('');

const isGenerating = ref(false);
const progress = ref(0);
const progressText = ref('');

const generatedImage = ref<LocalImageGenerationResult | null>(null);
const error = ref('');

// 计算属性
const canGenerate = computed(() => {
  return servicesReady.value && prompt.value.trim().length > 0;
});

// 检查服务状态
const checkServices = async () => {
  statusMessage.value = '检查 Ollama 连接...';
  const ollamaOk = await checkOllamaConnection();
  
  if (!ollamaOk) {
    statusMessage.value = 'Ollama 服务未连接';
    servicesReady.value = false;
    return;
  }

  statusMessage.value = '检查 Stable Diffusion WebUI 连接...';
  const sdOk = await checkStableDiffusionConnection();
  
  if (!sdOk) {
    statusMessage.value = 'Stable Diffusion WebUI 未连接';
    servicesReady.value = false;
    return;
  }

  servicesReady.value = true;
  statusMessage.value = '所有服务已就绪';
  showToast('本地图像生成服务已就绪', 'success');
};

// 生成进度模拟
const simulateProgress = () => {
  progress.value = 0;
  progressText.value = '准备生成...';
  
  const interval = setInterval(() => {
    progress.value += Math.random() * 15;
    
    if (progress.value >= 100) {
      progress.value = 100;
      progressText.value = '生成完成！';
      clearInterval(interval);
    }
  }, 500);

  return interval;
};

// 处理图像生成
const handleGenerate = async () => {
  if (!canGenerate.value) return;
  
  isGenerating.value = true;
  error.value = '';
  generatedImage.value = null;
  
  const progressInterval = simulateProgress();
  
  try {
    const result = await generateImageLocally({
      prompt: prompt.value.trim(),
      negativePrompt: negativePrompt.value || undefined,
      width: 512,
      height: 512,
      steps: 20,
      enhancePrompt: true,
    });
    
    if (result.success) {
      generatedImage.value = result;
      emit('imageGenerated', { ...result, prompt: result.originalPrompt || prompt.value });
      showToast('图像生成成功！', 'success');
    } else {
      error.value = result.error || '图像生成失败';
      showToast('图像生成失败', 'error');
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '未知错误';
    showToast('生成过程中出错', 'error');
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
  link.download = `local-generated-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('图像已下载', 'success');
};

// 发送到聊天
const sendToChat = () => {
  if (!generatedImage.value?.imageUrl) return;
  
  const promptToShow = generatedImage.value.enhancedPrompt || prompt.value;
  emit('sendImage', generatedImage.value.imageUrl, promptToShow);
  showToast('图像已发送到聊天', 'success');
};

// 初始化
onMounted(() => {
  checkServices();
});
</script>

<style scoped>
.local-image-panel {
  padding: 1rem;
  background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
  border-radius: 12px;
  color: white;
  max-width: 500px;
  margin: 0 auto;
}

.services-status {
  text-align: center;
  padding: 2rem;
}

.status-banner {
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.4);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-text h4 {
  margin: 0 0 0.5rem 0;
  color: #fbbf24;
}

.status-text p {
  margin: 0;
  font-size: 0.9rem;
}

.check-btn {
  padding: 0.75rem 1rem;
  background: rgba(255, 193, 7, 0.8);
  border: none;
  border-radius: 8px;
  color: #1e40af;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.generation-interface {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.prompt-section {
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

.controls-section {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.generate-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(45deg, #10b981, #059669);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  background: linear-gradient(90deg, #10b981, #059669);
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

.result-header h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.image-container img {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.image-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.image-actions button {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.image-actions button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.error-section {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.error-section button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.8);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}
</style> 