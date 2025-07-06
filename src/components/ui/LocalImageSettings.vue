<template>
  <div class="local-image-settings">
    <div class="settings-header">
      <h3>
        <ion-icon name="desktop-outline"></ion-icon>
        本地图像生成设置
      </h3>
      <p class="subtitle">使用 ollama + Stable Diffusion WebUI</p>
    </div>

    <!-- 连接状态 -->
    <div class="status-section">
      <div class="status-card">
        <div class="status-item">
          <div class="status-indicator" :class="{ connected: ollamaConnected }"></div>
          <div class="status-info">
            <h4>Ollama 服务</h4>
            <p>{{ ollamaConnected ? '已连接' : '未连接' }}</p>
          </div>
          <ion-button 
            fill="clear" 
            @click="checkOllamaStatus"
            :disabled="isChecking"
          >
            <ion-icon :name="refreshOutline"></ion-icon>
          </ion-button>
        </div>
        
        <div class="status-item">
          <div class="status-indicator" :class="{ connected: sdConnected }"></div>
          <div class="status-info">
            <h4>Stable Diffusion WebUI</h4>
            <p>{{ sdConnected ? '已连接' : '未连接' }}</p>
          </div>
          <ion-button 
            fill="clear" 
            @click="checkSDStatus"
            :disabled="isChecking"
          >
            <ion-icon :name="refreshOutline"></ion-icon>
          </ion-button>
        </div>
      </div>
    </div>

    <!-- Stable Diffusion 配置 -->
    <div class="setting-group">
      <label class="setting-label">
        <ion-icon name="server-outline"></ion-icon>
        Stable Diffusion WebUI 地址
      </label>
      <div class="url-input-group">
        <input
          type="url"
          v-model="sdUrl"
          placeholder="http://127.0.0.1:7860"
          class="url-input"
          @blur="updateSDUrl"
        />
        <button class="test-btn" @click="testSDConnection" :disabled="isTesting">
          <ion-icon :name="isTesting ? 'hourglass-outline' : 'flash-outline'"></ion-icon>
          {{ isTesting ? '测试中' : '测试连接' }}
        </button>
      </div>
      <div class="setting-info">
        <p>
          <ion-icon name="information-circle-outline"></ion-icon>
          确保 Stable Diffusion WebUI 正在运行，且启用了 API 模式 (--api 参数)
        </p>
      </div>
    </div>

    <!-- Ollama 模型选择 -->
    <div class="setting-group">
      <label class="setting-label">
        <ion-icon name="brain-outline"></ion-icon>
        Ollama 提示词增强模型
      </label>
      <select v-model="selectedOllamaModel" class="model-select" @change="updateOllamaModel">
        <option value="" disabled>选择模型</option>
        <option 
          v-for="model in ollamaModels" 
          :key="model" 
          :value="model"
        >
          {{ model }}
        </option>
      </select>
      <div class="model-info">
        <p>推荐使用：llama3.1:8b, qwen2.5:7b, mistral:7b</p>
        <ion-toggle 
          v-model="useOllamaEnhancement" 
          @ionChange="updateOllamaUsage"
        ></ion-toggle>
        <span>启用 Ollama 提示词增强</span>
      </div>
    </div>

    <!-- SD 模型选择 -->
    <div class="setting-group" v-if="sdConnected">
      <label class="setting-label">
        <ion-icon name="image-outline"></ion-icon>
        Stable Diffusion 模型
      </label>
      <select v-model="selectedSDModel" class="model-select" @change="updateSDModel">
        <option value="" disabled>选择模型</option>
        <option 
          v-for="model in sdModels" 
          :key="model" 
          :value="model"
        >
          {{ model }}
        </option>
      </select>
    </div>

    <!-- 安装指南 -->
    <div class="installation-guide">
      <h4>
        <ion-icon name="book-outline"></ion-icon>
        快速安装指南
      </h4>
      
      <div class="guide-section">
        <h5>1. 安装 Stable Diffusion WebUI</h5>
        <div class="code-block">
          <code>
            # 克隆仓库<br/>
            git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git<br/>
            cd stable-diffusion-webui<br/><br/>
            
            # 启动（启用API）<br/>
            ./webui.sh --api<br/>
            # Windows: webui-user.bat --api
          </code>
          <button class="copy-code-btn" @click="copyToClipboard('git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git')">
            <ion-icon name="copy-outline"></ion-icon>
          </button>
        </div>
      </div>

      <div class="guide-section">
        <h5>2. 确保 Ollama 运行中</h5>
        <div class="code-block">
          <code>
            # 安装 ollama (如果还未安装)<br/>
            curl -fsSL https://ollama.ai/install.sh | sh<br/><br/>
            
            # 拉取推荐模型<br/>
            ollama pull llama3.1:8b<br/>
            ollama serve
          </code>
          <button class="copy-code-btn" @click="copyToClipboard('ollama pull llama3.1:8b')">
            <ion-icon name="copy-outline"></ion-icon>
          </button>
        </div>
      </div>

      <div class="guide-section">
        <h5>3. 推荐的 SD 模型</h5>
        <ul class="model-list">
          <li>
            <strong>Stable Diffusion 1.5</strong> - 通用，资源需求低
            <a href="https://huggingface.co/runwayml/stable-diffusion-v1-5" target="_blank">下载</a>
          </li>
          <li>
            <strong>Realistic Vision</strong> - 写实风格
            <a href="https://civitai.com/models/4201/realistic-vision-v60-b1" target="_blank">下载</a>
          </li>
          <li>
            <strong>Anything V3</strong> - 动漫风格
            <a href="https://civitai.com/models/66/anything-v3" target="_blank">下载</a>
          </li>
        </ul>
      </div>
    </div>

    <!-- 测试生成 -->
    <div class="test-section">
      <h4>
        <ion-icon name="flask-outline"></ion-icon>
        测试生成
      </h4>
      <div class="test-controls">
        <input
          type="text"
          v-model="testPrompt"
          placeholder="输入测试提示词，例如：一只可爱的小猫"
          class="test-input"
        />
        <button 
          class="test-generate-btn"
          @click="testGeneration"
          :disabled="!canTest || isTestGenerating"
        >
          <ion-icon 
            :name="isTestGenerating ? 'hourglass-outline' : 'play-outline'"
            :class="{ spinning: isTestGenerating }"
          ></ion-icon>
          {{ isTestGenerating ? '生成中...' : '测试生成' }}
        </button>
      </div>
      
      <div v-if="testResult" class="test-result">
        <div v-if="testResult.success" class="test-success">
          <img :src="testResult.imageUrl" alt="Test generated image" class="test-image" />
          <p>✅ 生成成功！耗时: {{ testResult.timeTaken }}ms</p>
          <p v-if="testResult.enhancedPrompt">增强后的提示词: {{ testResult.enhancedPrompt }}</p>
        </div>
        <div v-else class="test-error">
          <p>❌ 生成失败: {{ testResult.error }}</p>
        </div>
      </div>
    </div>

    <!-- 性能提示 -->
    <div class="performance-tips">
      <h4>
        <ion-icon name="speedometer-outline"></ion-icon>
        性能优化建议
      </h4>
      <ul class="tips-list">
        <li>使用 NVIDIA GPU 可显著提升生成速度</li>
        <li>降低图像尺寸 (512x512) 可减少内存使用</li>
        <li>减少生成步数 (15-25步) 平衡质量和速度</li>
        <li>使用 DPM++ 2M Karras 采样器效果较好</li>
        <li>本地生成完全私密，数据不会上传到任何服务器</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { IonIcon, IonButton, IonToggle } from '@ionic/vue';
import { 
  refreshOutline, serverOutline, brainOutline, imageOutline, 
  bookOutline, copyOutline, flashOutline, flaskOutline, 
  playOutline, hourglassOutline, speedometerOutline,
  desktopOutline, informationCircleOutline
} from 'ionicons/icons';
import { 
  checkOllamaConnection, 
  checkStableDiffusionConnection,
  getOllamaModels,
  getStableDiffusionModels,
  getLocalImageConfig,
  setStableDiffusionUrl,
  setPromptEnhancerModel,
  setUseOllamaForPrompts,
  generateImageLocally,
  type LocalImageGenerationResult
} from '../../composables/localImageGenerationService';
import { Clipboard } from '@capacitor/clipboard';
import { showToast } from '../../composables/useToast';

// 事件定义
const emit = defineEmits<{
  settingsSaved: [];
  settingsError: [error: string];
  testSuccess: [result: LocalImageGenerationResult];
  testError: [error: string];
}>();

// 响应式数据
const ollamaConnected = ref(false);
const sdConnected = ref(false);
const isChecking = ref(false);
const isTesting = ref(false);
const isTestGenerating = ref(false);

const sdUrl = ref('http://127.0.0.1:7860');
const selectedOllamaModel = ref('');
const selectedSDModel = ref('');
const useOllamaEnhancement = ref(true);

const ollamaModels = ref<string[]>([]);
const sdModels = ref<string[]>([]);

const testPrompt = ref('a cute cat sitting in a garden');
const testResult = ref<LocalImageGenerationResult | null>(null);

// 计算属性
const canTest = computed(() => {
  return ollamaConnected.value && sdConnected.value && selectedOllamaModel.value;
});

// 加载配置
const loadConfig = async () => {
  const config = getLocalImageConfig();
  sdUrl.value = config.stableDiffusionUrl;
  selectedOllamaModel.value = config.promptEnhancerModel;
  useOllamaEnhancement.value = config.useOllamaForPrompts;
};

// 检查 Ollama 状态
const checkOllamaStatus = async () => {
  isChecking.value = true;
  try {
    ollamaConnected.value = await checkOllamaConnection();
    if (ollamaConnected.value) {
      ollamaModels.value = await getOllamaModels();
      showToast('Ollama 连接成功', 'success');
    } else {
      showToast('Ollama 连接失败，请确保服务正在运行', 'error');
    }
  } catch (error) {
    ollamaConnected.value = false;
    showToast('检查 Ollama 连接时出错', 'error');
  } finally {
    isChecking.value = false;
  }
};

// 检查 SD 状态
const checkSDStatus = async () => {
  isChecking.value = true;
  try {
    sdConnected.value = await checkStableDiffusionConnection();
    if (sdConnected.value) {
      sdModels.value = await getStableDiffusionModels();
      showToast('Stable Diffusion WebUI 连接成功', 'success');
    } else {
      showToast('Stable Diffusion WebUI 连接失败', 'error');
    }
  } catch (error) {
    sdConnected.value = false;
    showToast('检查 SD 连接时出错', 'error');
  } finally {
    isChecking.value = false;
  }
};

// 测试 SD 连接
const testSDConnection = async () => {
  isTesting.value = true;
  await updateSDUrl();
  await checkSDStatus();
  isTesting.value = false;
};

// 更新配置
const updateSDUrl = async () => {
  try {
    await setStableDiffusionUrl(sdUrl.value);
    emit('settingsSaved');
  } catch (error) {
    emit('settingsError', error instanceof Error ? error.message : '保存失败');
  }
};

const updateOllamaModel = async () => {
  try {
    await setPromptEnhancerModel(selectedOllamaModel.value);
    emit('settingsSaved');
  } catch (error) {
    emit('settingsError', error instanceof Error ? error.message : '保存失败');
  }
};

const updateOllamaUsage = async () => {
  try {
    await setUseOllamaForPrompts(useOllamaEnhancement.value);
    emit('settingsSaved');
  } catch (error) {
    emit('settingsError', error instanceof Error ? error.message : '保存失败');
  }
};

const updateSDModel = () => {
  // SD模型通常通过WebUI界面切换，这里只是显示当前选择
  showToast('请在 Stable Diffusion WebUI 中切换模型', 'warning');
};

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await Clipboard.write({ string: text });
    showToast('已复制到剪贴板', 'success');
  } catch (error) {
    showToast('复制失败', 'error');
  }
};

// 测试生成
const testGeneration = async () => {
  if (!testPrompt.value.trim()) {
    showToast('请输入测试提示词', 'warning');
    return;
  }

  isTestGenerating.value = true;
  testResult.value = null;

  try {
    const result = await generateImageLocally({
      prompt: testPrompt.value,
      width: 512,
      height: 512,
      steps: 20,
      enhancePrompt: useOllamaEnhancement.value
    });

    testResult.value = result;

    if (result.success) {
      emit('testSuccess', result);
      showToast('测试生成成功！', 'success');
    } else {
      emit('testError', result.error || '测试生成失败');
      showToast(`测试生成失败: ${result.error}`, 'error');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    testResult.value = {
      success: false,
      error: errorMsg,
      originalPrompt: testPrompt.value
    };
    emit('testError', errorMsg);
    showToast(`测试生成失败: ${errorMsg}`, 'error');
  } finally {
    isTestGenerating.value = false;
  }
};

// 初始化
onMounted(async () => {
  await loadConfig();
  await checkOllamaStatus();
  await checkSDStatus();
});
</script>

<style scoped>
.local-image-settings {
  padding: 1.5rem;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  border-radius: 12px;
  color: white;
  max-width: 800px;
  margin: 0 auto;
}

.settings-header h3 {
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
}

.subtitle {
  margin: 0 0 1.5rem 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.status-section {
  margin-bottom: 2rem;
}

.status-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  transition: all 0.3s ease;
}

.status-indicator.connected {
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
}

.status-info {
  flex: 1;
}

.status-info h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.status-info p {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.8;
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

.url-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.url-input {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
}

.url-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.url-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.2);
}

.test-btn {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.test-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.setting-info {
  font-size: 0.85rem;
  opacity: 0.9;
}

.setting-info p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.model-select {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.model-select option {
  background: #2563eb;
  color: white;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.model-info p {
  margin: 0;
  opacity: 0.8;
}

.installation-guide {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.installation-guide h4 {
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
}

.guide-section {
  margin-bottom: 1.5rem;
}

.guide-section h5 {
  margin: 0 0 0.75rem 0;
  color: #fbbf24;
  font-size: 1rem;
}

.code-block {
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin: 0.5rem 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
}

.copy-code-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-code-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.model-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.model-list li {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-list a {
  color: #60a5fa;
  text-decoration: none;
  font-size: 0.9rem;
}

.model-list a:hover {
  text-decoration: underline;
}

.test-section {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.test-section h4 {
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
}

.test-controls {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.test-input {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
}

.test-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.test-generate-btn {
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
}

.test-generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.test-generate-btn:disabled {
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

.test-result {
  margin-top: 1rem;
}

.test-success {
  text-align: center;
}

.test-image {
  max-width: 300px;
  width: 100%;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.test-success p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.test-error {
  color: #fca5a5;
  text-align: center;
}

.performance-tips {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.performance-tips h4 {
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;
  opacity: 0.9;
}

.tips-list li:last-child {
  border-bottom: none;
}

.tips-list li::before {
  content: '💡';
  margin-right: 0.5rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .local-image-settings {
    padding: 1rem;
  }

  .status-card {
    padding: 0.75rem;
  }

  .url-input-group {
    flex-direction: column;
  }

  .test-controls {
    flex-direction: column;
  }

  .model-list li {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style> 