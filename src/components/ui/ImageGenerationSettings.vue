<template>
  <div class="image-settings">
    <div class="settings-header">
      <h3>
        <ion-icon name="settings-outline"></ion-icon>
        图像生成设置
      </h3>
    </div>

    <!-- API Key 配置 -->
    <div class="setting-group">
      <label class="setting-label">
        <ion-icon name="key-outline"></ion-icon>
        Hugging Face API Key
      </label>
      <div class="api-key-input-group">
        <input
          type="password"
          v-model="apiKey"
          placeholder="输入你的 Hugging Face API Key"
          class="api-key-input"
          :class="{ 'has-value': apiKey.length > 0 }"
        />
        <button
          class="toggle-visibility-btn"
          @click="showApiKey = !showApiKey"
          :type="showApiKey ? 'text' : 'password'"
          type="button"
        >
          <ion-icon :name="showApiKey ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
        </button>
      </div>
      <div class="api-key-info">
        <p>
          <ion-icon name="information-circle-outline"></ion-icon>
          在 <a href="https://huggingface.co/settings/tokens" target="_blank">Hugging Face</a> 
          获取免费的 API Key
        </p>
        <div class="api-key-status" :class="apiKeyStatus">
          <ion-icon :name="apiKeyStatusIcon"></ion-icon>
          {{ apiKeyStatusText }}
        </div>
      </div>
    </div>

    <!-- 模型选择 -->
    <div class="setting-group">
      <label class="setting-label">
        <ion-icon name="cube-outline"></ion-icon>
        图像生成模型
      </label>
      <select v-model="selectedModel" class="model-select">
        <option 
          v-for="model in availableModels" 
          :key="model.id" 
          :value="model.id"
        >
          {{ model.name }}
        </option>
      </select>
      <div class="model-info">
        <p>{{ selectedModelInfo?.description }}</p>
        <div class="model-status" v-if="modelStatus !== null">
          <ion-icon :name="modelStatus ? 'checkmark-circle-outline' : 'time-outline'"></ion-icon>
          {{ modelStatus ? '模型已就绪' : '模型预热中...' }}
        </div>
      </div>
    </div>

    <!-- 快速配置 -->
    <div class="setting-group">
      <label class="setting-label">
        <ion-icon name="flash-outline"></ion-icon>
        快速配置
      </label>
      <div class="quick-configs">
        <button
          v-for="config in quickConfigs"
          :key="config.name"
          class="quick-config-btn"
          @click="applyQuickConfig(config)"
          type="button"
        >
          <ion-icon :name="config.icon"></ion-icon>
          {{ config.name }}
        </button>
      </div>
    </div>

    <!-- 使用提示 -->
    <div class="tips-section">
      <h4>
        <ion-icon name="bulb-outline"></ion-icon>
        使用提示
      </h4>
      <ul class="tips-list">
        <li>API Key 会安全存储在本地设备上</li>
        <li>首次使用新模型时可能需要几分钟预热</li>
        <li>推荐使用英文描述词以获得更好的效果</li>
        <li>可以组合多个风格标签，如："anime style, digital art"</li>
        <li>使用负面描述词可以避免不想要的内容</li>
      </ul>
    </div>

    <!-- 保存按钮 -->
    <div class="action-section">
      <button
        class="save-btn"
        @click="saveSettings"
        :disabled="!hasChanges || isSaving"
        type="button"
      >
        <ion-icon 
          :name="isSaving ? 'hourglass-outline' : 'save-outline'"
          :class="{ spinning: isSaving }"
        ></ion-icon>
        {{ isSaving ? '保存中...' : '保存设置' }}
      </button>
      
      <button
        class="test-btn"
        @click="testConfiguration"
        :disabled="!apiKey.trim() || isTesting"
        type="button"
      >
        <ion-icon 
          :name="isTesting ? 'hourglass-outline' : 'flask-outline'"
          :class="{ spinning: isTesting }"
        ></ion-icon>
        {{ isTesting ? '测试中...' : '测试配置' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { IonIcon } from '@ionic/vue';
import { 
  getImageConfig, 
  setHuggingFaceApiKey, 
  setImageModel, 
  checkModelStatus,
  AVAILABLE_MODELS,
  generateImage
} from '../../composables/imageGenerationService';

// 响应式数据
const apiKey = ref('');
const showApiKey = ref(false);
const selectedModel = ref('');
const modelStatus = ref<boolean | null>(null);
const isSaving = ref(false);
const isTesting = ref(false);

// 原始配置（用于检测变更）
const originalConfig = ref<any>({});

// 可用模型
const availableModels = AVAILABLE_MODELS;

// 快速配置选项
const quickConfigs = [
  {
    name: '写实风格',
    icon: 'camera-outline',
    model: 'runwayml/stable-diffusion-v1-5',
    settings: { photorealistic: true }
  },
  {
    name: '动漫风格',
    icon: 'happy-outline',
    model: 'nitrosocke/Arcane-Diffusion',
    settings: { anime: true }
  },
  {
    name: '艺术风格',
    icon: 'color-palette-outline',
    model: 'prompthero/openjourney',
    settings: { artistic: true }
  }
];

// 计算属性
const selectedModelInfo = computed(() => {
  return availableModels.find(model => model.id === selectedModel.value);
});

const hasChanges = computed(() => {
  return apiKey.value !== originalConfig.value.hfApiKey || 
         selectedModel.value !== originalConfig.value.model;
});

const apiKeyStatus = computed(() => {
  if (!apiKey.value.trim()) return 'empty';
  if (apiKey.value.length < 20) return 'invalid';
  return 'valid';
});

const apiKeyStatusIcon = computed(() => {
  switch (apiKeyStatus.value) {
    case 'valid': return 'checkmark-circle-outline';
    case 'invalid': return 'alert-circle-outline';
    default: return 'help-circle-outline';
  }
});

const apiKeyStatusText = computed(() => {
  switch (apiKeyStatus.value) {
    case 'valid': return 'API Key 格式正确';
    case 'invalid': return 'API Key 格式不正确';
    default: return '请输入 API Key';
  }
});

// 加载配置
const loadConfig = async () => {
  const config = getImageConfig();
  originalConfig.value = { ...config };
  apiKey.value = config.hfApiKey || '';
  selectedModel.value = config.model;
  
  // 检查模型状态
  if (config.hfApiKey) {
    checkModel();
  }
};

// 检查模型状态
const checkModel = async () => {
  if (!apiKey.value.trim()) return;
  
  try {
    modelStatus.value = await checkModelStatus(selectedModel.value);
  } catch (error) {
    modelStatus.value = false;
  }
};

// 监听模型变化
watch(selectedModel, () => {
  if (apiKey.value.trim()) {
    checkModel();
  }
});

// 应用快速配置
const applyQuickConfig = async (config: any) => {
  selectedModel.value = config.model;
  await saveSettings();
};

// 保存设置
const saveSettings = async () => {
  isSaving.value = true;
  
  try {
    if (apiKey.value.trim()) {
      await setHuggingFaceApiKey(apiKey.value.trim());
    }
    
    if (selectedModel.value) {
      await setImageModel(selectedModel.value);
    }
    
    // 更新原始配置
    originalConfig.value = {
      hfApiKey: apiKey.value.trim(),
      model: selectedModel.value
    };
    
    // 检查模型状态
    if (apiKey.value.trim()) {
      checkModel();
    }
    
    // 触发成功提示
    emit('settingsSaved');
    
  } catch (error) {
    console.error('保存设置失败:', error);
    emit('settingsError', error instanceof Error ? error.message : '保存失败');
  } finally {
    isSaving.value = false;
  }
};

// 测试配置
const testConfiguration = async () => {
  if (!apiKey.value.trim()) return;
  
  isTesting.value = true;
  
  try {
    // 先保存当前设置
    await setHuggingFaceApiKey(apiKey.value.trim());
    await setImageModel(selectedModel.value);
    
    // 生成测试图像
    const result = await generateImage({
      prompt: 'a simple test image, colorful',
      width: 256,
      height: 256,
      numInferenceSteps: 10
    });
    
    if (result.success) {
      emit('testSuccess', result);
    } else {
      emit('testError', result.error || '测试失败');
    }
    
  } catch (error) {
    emit('testError', error instanceof Error ? error.message : '测试失败');
  } finally {
    isTesting.value = false;
  }
};

// 事件定义
const emit = defineEmits<{
  settingsSaved: [];
  settingsError: [error: string];
  testSuccess: [result: any];
  testError: [error: string];
}>();

// 生命周期
onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.image-settings {
  padding: 1.5rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 12px;
  color: white;
  max-width: 600px;
  margin: 0 auto;
}

.settings-header h3 {
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
}

.setting-group {
  margin-bottom: 2rem;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.api-key-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.api-key-input {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.2s;
}

.api-key-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.api-key-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.api-key-input.has-value {
  background: rgba(46, 204, 113, 0.2);
  border: 1px solid rgba(46, 204, 113, 0.4);
}

.toggle-visibility-btn {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-visibility-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.api-key-info {
  font-size: 0.9rem;
  opacity: 0.9;
}

.api-key-info p {
  margin: 0 0 0.5rem 0;
}

.api-key-info a {
  color: #60a5fa;
  text-decoration: none;
}

.api-key-info a:hover {
  text-decoration: underline;
}

.api-key-status {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  display: inline-flex;
}

.api-key-status.valid {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
}

.api-key-status.invalid {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.api-key-status.empty {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.model-select {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

.model-select option {
  background: #4f46e5;
  color: white;
}

.model-info {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.9;
}

.model-info p {
  margin: 0 0 0.5rem 0;
}

.model-status {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  display: inline-flex;
}

.quick-configs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.quick-config-btn {
  padding: 0.6rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.quick-config-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.tips-section {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.tips-section h4 {
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.tips-list {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.9rem;
  opacity: 0.9;
}

.tips-list li {
  margin-bottom: 0.5rem;
}

.action-section {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.save-btn, .test-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  transition: all 0.3s;
  min-width: 120px;
  justify-content: center;
}

.save-btn {
  background: linear-gradient(45deg, #2ecc71, #27ae60);
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.test-btn {
  background: linear-gradient(45deg, #3498db, #2980b9);
  box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
}

.test-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
}

.test-btn:disabled {
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
</style> 