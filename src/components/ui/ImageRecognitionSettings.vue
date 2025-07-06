<template>
  <div class="image-recognition-settings">
    <!-- 标题栏 -->
    <div class="settings-header">
      <h2>
        <ion-icon :icon="eyeOutline"></ion-icon>
        图像识别设置
      </h2>
      <p class="header-description">
        配置AI视觉模型，让TalkFlow-Core识别和理解图片内容
      </p>
    </div>

    <!-- 连接状态 -->
    <div class="connection-status">
      <div class="status-item">
        <div class="status-indicator" :class="{ connected: ollamaConnected }">
          <ion-icon :icon="ollamaConnected ? checkmarkCircleOutline : closeCircleOutline"></ion-icon>
        </div>
        <div class="status-content">
          <h4>Ollama 服务</h4>
          <p>{{ ollamaConnected ? '已连接' : '未连接' }}</p>
        </div>
        <button 
          class="check-btn"
          @click="checkConnections"
          :disabled="isChecking"
        >
          <ion-icon :icon="isChecking ? hourglassOutline : refreshOutline"></ion-icon>
          检查连接
        </button>
      </div>
    </div>

    <!-- 模型配置 -->
    <div class="model-configuration">
      <h3>
        <ion-icon :icon="hardwareChipOutline"></ion-icon>
        视觉模型配置
      </h3>

      <!-- 已安装模型 -->
      <div class="installed-models">
        <label class="setting-label">选择视觉模型</label>
        <select 
          v-model="selectedModel" 
          class="model-select"
          @change="handleModelChange"
        >
          <option value="" disabled>请选择一个视觉模型</option>
          <option 
            v-for="model in availableModels" 
            :key="model" 
            :value="model"
          >
            {{ model }}
          </option>
        </select>
        
        <div v-if="selectedModel" class="model-info">
          <h4>{{ getModelInfo(selectedModel)?.name || selectedModel }}</h4>
          <p>{{ getModelInfo(selectedModel)?.description }}</p>
          <div class="model-details">
            <span class="detail-item">
              <ion-icon :icon="cloudDownloadOutline"></ion-icon>
              大小: {{ getModelInfo(selectedModel)?.size }}
            </span>
            <span class="detail-item">
              <ion-icon :icon="languageOutline"></ion-icon>
              语言: {{ getModelInfo(selectedModel)?.languages?.join(', ') }}
            </span>
          </div>
        </div>
      </div>

      <!-- 推荐模型安装 -->
      <div class="recommended-models">
        <h4>
          <ion-icon :icon="downloadOutline"></ion-icon>
          推荐模型
        </h4>
        <div class="model-cards">
          <div 
            v-for="(info, model) in recommendedModels" 
            :key="model"
            class="model-card"
            :class="{ installed: installedModels.includes(model) }"
          >
            <div class="card-header">
              <h5>{{ info.name }}</h5>
              <div class="card-status">
                <ion-icon 
                  v-if="installedModels.includes(model)"
                  :icon="checkmarkCircleOutline" 
                  class="status-installed"
                ></ion-icon>
                <span class="model-size">{{ info.size }}</span>
              </div>
            </div>
            <p class="card-description">{{ info.description }}</p>
            <div class="card-languages">
              <span 
                v-for="lang in info.languages" 
                :key="lang" 
                class="language-tag"
              >
                {{ lang }}
              </span>
            </div>
            <button 
              v-if="!installedModels.includes(model)"
              class="install-btn"
              @click="installModel(model)"
              :disabled="isInstalling === model"
            >
              <ion-icon :icon="isInstalling === model ? hourglassOutline : downloadOutline"></ion-icon>
              {{ isInstalling === model ? '安装中...' : '安装模型' }}
            </button>
            <button 
              v-else
              class="select-btn"
              @click="selectedModel = model"
            >
              <ion-icon :icon="checkmarkOutline"></ion-icon>
              选择此模型
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 高级设置 -->
    <div class="advanced-settings">
      <h3>
        <ion-icon :icon="settingsOutline"></ion-icon>
        高级设置
      </h3>

      <div class="setting-group">
        <label class="setting-label">
          <ion-icon :icon="imageOutline"></ion-icon>
          最大图片大小 (MB)
        </label>
        <input 
          v-model.number="maxImageSizeMB" 
          type="number" 
          min="1" 
          max="50"
          class="setting-input"
          @change="updateMaxImageSize"
        />
        <p class="setting-help">较大的图片会自动压缩以节省处理时间</p>
      </div>

      <div class="setting-group">
        <label class="setting-toggle">
          <input 
            v-model="autoResize" 
            type="checkbox"
            @change="updateAutoResize"
          />
          <span class="toggle-slider"></span>
          <span class="toggle-label">
            <ion-icon :icon="resizeOutline"></ion-icon>
            自动调整图片尺寸
          </span>
        </label>
        <p class="setting-help">启用后将自动优化图片尺寸以提高识别速度</p>
      </div>
    </div>

    <!-- 测试区域 -->
    <div class="test-section">
      <h3>
        <ion-icon :icon="flashOutline"></ion-icon>
        功能测试
      </h3>
      
      <div class="test-area">
        <p>上传一张图片来测试图像识别功能</p>
        <ImageUpload 
          @imageAnalyzed="handleTestResult"
          @sendToChat="() => {}"
        />
      </div>
    </div>

    <!-- 安装进度 -->
    <div v-if="installProgress" class="install-progress">
      <div class="progress-header">
        <h4>正在安装 {{ isInstalling }}</h4>
        <button @click="cancelInstall" class="cancel-btn">
          <ion-icon :icon="closeOutline"></ion-icon>
        </button>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <p class="progress-text">{{ installProgress }}</p>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="save-btn" @click="saveSettings" :disabled="!hasChanges">
        <ion-icon :icon="saveOutline"></ion-icon>
        保存设置
      </button>
      <button class="test-connection-btn" @click="testImageRecognition" :disabled="!selectedModel">
        <ion-icon :icon="flashOutline"></ion-icon>
        测试识别
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { IonIcon } from '@ionic/vue';
import {
  eyeOutline, checkmarkCircleOutline, closeCircleOutline, refreshOutline,
  hourglassOutline, hardwareChipOutline, cloudDownloadOutline, languageOutline,
  downloadOutline, checkmarkOutline, settingsOutline, imageOutline,
  resizeOutline, flashOutline, closeOutline, saveOutline
} from 'ionicons/icons';
import {
  getImageRecognitionConfig,
  setVisionModel,
  setMaxImageSize,
  getVisionModels,
  checkModelInstalled,
  installVisionModel,
  VISION_MODELS,
  type ImageRecognitionResult
} from '../../composables/imageRecognitionService';
import { getApiUrl } from '../../composables/ollamaService';
import { showToast } from '../../composables/useToast';
import ImageUpload from './ImageUpload.vue';

// 事件定义
const emit = defineEmits<{
  settingsSaved: [];
  settingsError: [error: string];
  testResult: [result: ImageRecognitionResult];
}>();

// 响应式数据
const ollamaConnected = ref(false);
const isChecking = ref(false);
const selectedModel = ref('');
const availableModels = ref<string[]>([]);
const installedModels = ref<string[]>([]);
const maxImageSizeMB = ref(5);
const autoResize = ref(true);
const isInstalling = ref<string | null>(null);
const installProgress = ref('');
const progressPercent = ref(0);
const hasChanges = ref(false);

// 推荐模型（从VISION_MODELS获取）
const recommendedModels = VISION_MODELS;

// 计算属性
const canSave = computed(() => selectedModel.value && hasChanges.value);

// 获取模型信息
const getModelInfo = (modelName: string) => {
  return VISION_MODELS[modelName as keyof typeof VISION_MODELS];
};

// 检查连接状态
const checkConnections = async () => {
  isChecking.value = true;
  
  try {
    // 检查Ollama连接
    const response = await fetch(`${getApiUrl()}/api/models`);
    ollamaConnected.value = response.ok;
    
    if (ollamaConnected.value) {
      // 获取可用模型
      await loadAvailableModels();
      showToast('连接检查完成', 'success');
    } else {
      showToast('Ollama服务未连接', 'error');
    }
  } catch (error) {
    ollamaConnected.value = false;
    showToast('连接检查失败', 'error');
  } finally {
    isChecking.value = false;
  }
};

// 加载可用模型
const loadAvailableModels = async () => {
  try {
    const models = await getVisionModels();
    availableModels.value = models;
    
    // 检查哪些推荐模型已安装
    const installChecks = Object.keys(recommendedModels).map(async (model) => {
      const isInstalled = await checkModelInstalled(model);
      return { model, isInstalled };
    });
    
    const results = await Promise.all(installChecks);
    installedModels.value = results
      .filter(result => result.isInstalled)
      .map(result => result.model);
      
  } catch (error) {
    console.error('Failed to load available models:', error);
  }
};

// 加载当前配置
const loadCurrentConfig = () => {
  const config = getImageRecognitionConfig();
  selectedModel.value = config.visionModel;
  maxImageSizeMB.value = Math.round(config.maxImageSize / 1024);
  autoResize.value = config.autoResize;
};

// 处理模型更改
const handleModelChange = () => {
  hasChanges.value = true;
};

// 安装模型
const installModel = async (modelName: string) => {
  isInstalling.value = modelName;
  installProgress.value = '开始下载...';
  progressPercent.value = 0;

  try {
    const success = await installVisionModel(modelName, (progress) => {
      installProgress.value = progress;
      
      // 尝试解析进度百分比
      const match = progress.match(/(\d+)%/);
      if (match) {
        progressPercent.value = parseInt(match[1]);
      }
    });

    if (success) {
      installedModels.value.push(modelName);
      availableModels.value.push(modelName);
      showToast(`模型 ${modelName} 安装成功`, 'success');
      
      // 自动选择刚安装的模型
      selectedModel.value = modelName;
      hasChanges.value = true;
    } else {
      showToast(`模型 ${modelName} 安装失败`, 'error');
    }
  } catch (error) {
    console.error('Model installation error:', error);
    showToast('模型安装过程中出错', 'error');
  } finally {
    isInstalling.value = null;
    installProgress.value = '';
    progressPercent.value = 0;
  }
};

// 取消安装
const cancelInstall = () => {
  // 这里可以添加取消安装的逻辑
  isInstalling.value = null;
  installProgress.value = '';
  progressPercent.value = 0;
  showToast('安装已取消', 'warning');
};

// 更新最大图片大小
const updateMaxImageSize = async () => {
  try {
    await setMaxImageSize(maxImageSizeMB.value * 1024);
    hasChanges.value = true;
  } catch (error) {
    showToast('更新图片大小设置失败', 'error');
  }
};

// 更新自动调整设置
const updateAutoResize = () => {
  hasChanges.value = true;
};

// 保存设置
const saveSettings = async () => {
  try {
    if (selectedModel.value) {
      await setVisionModel(selectedModel.value);
    }
    
    await setMaxImageSize(maxImageSizeMB.value * 1024);
    
    // 这里可以添加保存autoResize设置的逻辑
    
    hasChanges.value = false;
    emit('settingsSaved');
    showToast('设置已保存', 'success');
  } catch (error) {
    console.error('Save settings error:', error);
    emit('settingsError', '保存设置失败');
    showToast('保存设置失败', 'error');
  }
};

// 测试图像识别
const testImageRecognition = async () => {
  if (!selectedModel.value) {
    showToast('请先选择一个视觉模型', 'warning');
    return;
  }
  
  showToast('请上传一张图片进行测试', 'info');
};

// 处理测试结果
const handleTestResult = (result: ImageRecognitionResult & { imageUrl: string; prompt: string }) => {
  emit('testResult', result);
  
  if (result.success) {
    showToast('图像识别测试成功！', 'success');
  } else {
    showToast('图像识别测试失败', 'error');
  }
};

// 监听配置变化
watch([selectedModel, maxImageSizeMB, autoResize], () => {
  hasChanges.value = true;
});

// 组件挂载时初始化
onMounted(async () => {
  loadCurrentConfig();
  await checkConnections();
});
</script>

<style scoped>
.image-recognition-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
}

.settings-header {
  text-align: center;
  margin-bottom: 2rem;
}

.settings-header h2 {
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--ion-color-primary);
  font-size: 1.5rem;
}

.header-description {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.connection-status {
  background: var(--ion-color-step-50);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicator {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-danger);
  color: white;
  font-size: 1.5rem;
}

.status-indicator.connected {
  background: var(--ion-color-success);
}

.status-content {
  flex: 1;
}

.status-content h4 {
  margin: 0 0 0.25rem 0;
  color: var(--ion-text-color);
}

.status-content p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.check-btn {
  padding: 0.75rem 1rem;
  background: var(--ion-color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.check-btn:hover:not(:disabled) {
  background: var(--ion-color-primary-shade);
}

.check-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.model-configuration {
  background: var(--ion-color-step-50);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.model-configuration h3 {
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ion-color-primary);
  font-size: 1.2rem;
}

.setting-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--ion-text-color);
}

.model-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--ion-color-step-200);
  border-radius: 8px;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  font-family: inherit;
  margin-bottom: 1rem;
}

.model-select:focus {
  outline: none;
  border-color: var(--ion-color-primary);
}

.model-info {
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-step-150);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.model-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-primary);
}

.model-info p {
  margin: 0 0 1rem 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.model-details {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.recommended-models h4 {
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ion-color-secondary);
}

.model-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.model-card {
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-step-150);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.model-card:hover {
  border-color: var(--ion-color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.model-card.installed {
  border-color: var(--ion-color-success);
  background: var(--ion-color-success-tint);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.card-header h5 {
  margin: 0;
  color: var(--ion-color-primary);
  font-size: 1rem;
}

.card-status {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.status-installed {
  color: var(--ion-color-success);
  font-size: 1.2rem;
}

.model-size {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.card-description {
  margin: 0 0 1rem 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  line-height: 1.4;
}

.card-languages {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 1rem;
}

.language-tag {
  padding: 0.2rem 0.5rem;
  background: var(--ion-color-primary-tint);
  color: var(--ion-color-primary-shade);
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.install-btn,
.select-btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-weight: 500;
  transition: all 0.2s;
}

.install-btn {
  background: var(--ion-color-primary);
  color: white;
}

.install-btn:hover:not(:disabled) {
  background: var(--ion-color-primary-shade);
}

.install-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.select-btn {
  background: var(--ion-color-success);
  color: white;
}

.select-btn:hover {
  background: var(--ion-color-success-shade);
}

.advanced-settings {
  background: var(--ion-color-step-50);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.advanced-settings h3 {
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ion-color-primary);
  font-size: 1.2rem;
}

.setting-group {
  margin-bottom: 1.5rem;
}

.setting-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--ion-color-step-200);
  border-radius: 8px;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  font-family: inherit;
}

.setting-input:focus {
  outline: none;
  border-color: var(--ion-color-primary);
}

.setting-help {
  margin: 0.5rem 0 0 0;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}

.setting-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.setting-toggle input[type="checkbox"] {
  display: none;
}

.toggle-slider {
  width: 3rem;
  height: 1.5rem;
  background: var(--ion-color-step-200);
  border-radius: 1rem;
  position: relative;
  transition: all 0.3s;
}

.toggle-slider:before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.25rem;
  height: 1.25rem;
  background: white;
  border-radius: 50%;
  transition: all 0.3s;
}

.setting-toggle input:checked + .toggle-slider {
  background: var(--ion-color-primary);
}

.setting-toggle input:checked + .toggle-slider:before {
  transform: translateX(1.5rem);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 500;
  color: var(--ion-text-color);
}

.test-section {
  background: var(--ion-color-step-50);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.test-section h3 {
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ion-color-primary);
  font-size: 1.2rem;
}

.test-area p {
  margin: 0 0 1rem 0;
  color: var(--ion-color-medium);
  text-align: center;
}

.install-progress {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-step-150);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 300px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.progress-header h4 {
  margin: 0;
  color: var(--ion-color-primary);
}

.cancel-btn {
  background: var(--ion-color-danger);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--ion-color-step-200);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: var(--ion-color-primary);
  transition: width 0.3s ease;
}

.progress-text {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.save-btn,
.test-connection-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 500;
  transition: all 0.2s;
}

.save-btn {
  background: var(--ion-color-success);
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: var(--ion-color-success-shade);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-connection-btn {
  background: var(--ion-color-tertiary);
  color: white;
}

.test-connection-btn:hover:not(:disabled) {
  background: var(--ion-color-tertiary-shade);
}

.test-connection-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .image-recognition-settings {
    padding: 1rem;
  }

  .status-item {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .model-cards {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
  }

  .install-progress {
    margin: 1rem;
    width: calc(100% - 2rem);
    max-width: 400px;
  }
}
</style> 