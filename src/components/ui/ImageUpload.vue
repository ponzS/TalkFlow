<template>
  <div class="image-upload-container">
    <!-- 上传区域 -->
    <div 
      class="upload-area"
      :class="{ 
        'drag-over': isDragOver,
        'has-image': selectedImage,
        'uploading': isProcessing 
      }"
      @drop="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
    >
      <!-- 文件输入 -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="handleFileSelect"
        class="file-input"
      />

      <!-- 无图片状态 -->
      <div v-if="!selectedImage && !isProcessing" class="upload-prompt">
        <ion-icon :icon="cloudUploadOutline" class="upload-icon"></ion-icon>
        <h3>上传图片让AI识别</h3>
        <p>拖拽图片到这里，或点击选择文件</p>
        <div class="supported-formats">
          <span>支持：JPG、PNG、WebP、GIF</span>
          <span>最大：{{ maxSizeMB }}MB</span>
        </div>
      </div>

      <!-- 处理中状态 -->
      <div v-if="isProcessing" class="processing-state">
        <ion-spinner name="crescent" class="processing-spinner"></ion-spinner>
        <p>{{ processingText }}</p>
      </div>

      <!-- 图片预览 -->
      <div v-if="selectedImage && !isProcessing" class="image-preview">
        <img :src="previewUrl" alt="Selected image" class="preview-image" />
        <div class="image-overlay">
          <div class="image-actions">
            <button class="action-btn remove" @click.stop="removeImage">
              <ion-icon :icon="trashOutline"></ion-icon>
              删除
            </button>
            <button class="action-btn analyze" @click.stop="analyzeImage" :disabled="isAnalyzing">
              <ion-icon :icon="isAnalyzing ? hourglassOutline : eyeOutline"></ion-icon>
              {{ isAnalyzing ? '识别中...' : '识别' }}
            </button>
          </div>
          
          <!-- 图片信息 -->
          <div class="image-info">
            <div class="info-item">
              <span class="label">文件名:</span>
              <span class="value">{{ selectedImage.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">大小:</span>
              <span class="value">{{ formatFileSize(selectedImage.size) }}</span>
            </div>
            <div class="info-item">
              <span class="label">尺寸:</span>
              <span class="value">{{ imageDimensions }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速提示词 -->
    <div v-if="selectedImage && !isAnalyzing" class="quick-prompts">
      <h4>
        <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
        快速提示词
      </h4>
      <div class="prompt-buttons">
        <button
          v-for="(prompt, key) in quickPrompts"
          :key="key"
          class="prompt-btn"
          @click="analyzeWithPrompt(prompt.zh)"
        >
          {{ prompt.name }}
        </button>
      </div>
    </div>

    <!-- 自定义提示词 -->
    <div v-if="selectedImage && !isAnalyzing" class="custom-prompt">
      <label class="prompt-label">
        <ion-icon :icon="createOutline"></ion-icon>
        自定义提示词
      </label>
      <div class="prompt-input-group">
        <textarea
          v-model="customPrompt"
          placeholder="例如：请分析这张图片的构图和色彩搭配"
          class="prompt-input"
          rows="2"
        ></textarea>
        <button 
          class="analyze-btn"
          @click="analyzeWithPrompt(customPrompt)"
          :disabled="!customPrompt.trim() || isAnalyzing"
        >
          <ion-icon :icon="isAnalyzing ? hourglassOutline : eyeOutline"></ion-icon>
          分析
        </button>
      </div>
    </div>

    <!-- 识别结果 -->
    <div v-if="recognitionResult" class="recognition-result">
      <div class="result-header">
        <h4>
          <ion-icon :icon="sparklesOutline"></ion-icon>
          AI识别结果
        </h4>
        <div class="result-stats">
          <span v-if="recognitionResult.confidence">
            置信度: {{ Math.round(recognitionResult.confidence * 100) }}%
          </span>
          <span v-if="recognitionResult.timeTaken">
            耗时: {{ recognitionResult.timeTaken }}ms
          </span>
        </div>
      </div>

      <div v-if="recognitionResult.success" class="result-content">
        <!-- 主要描述 -->
        <div class="description-section">
          <h5>描述</h5>
          <p class="description-text">{{ recognitionResult.description }}</p>
        </div>

        <!-- 结构化信息 -->
        <div v-if="hasStructuredInfo" class="structured-info">
          <div v-if="recognitionResult.objects?.length" class="info-group">
            <h6>识别物体</h6>
            <div class="tag-list">
              <span 
                v-for="object in recognitionResult.objects" 
                :key="object" 
                class="info-tag object-tag"
              >
                {{ object }}
              </span>
            </div>
          </div>

          <div v-if="recognitionResult.colors?.length" class="info-group">
            <h6>主要颜色</h6>
            <div class="tag-list">
              <span 
                v-for="color in recognitionResult.colors" 
                :key="color" 
                class="info-tag color-tag"
              >
                {{ color }}
              </span>
            </div>
          </div>

          <div v-if="recognitionResult.emotions?.length" class="info-group">
            <h6>情感表达</h6>
            <div class="tag-list">
              <span 
                v-for="emotion in recognitionResult.emotions" 
                :key="emotion" 
                class="info-tag emotion-tag"
              >
                {{ emotion }}
              </span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <button class="action-btn send" @click="sendToChat">
            <ion-icon :icon="sendOutline"></ion-icon>
            发送到聊天
          </button>
          <button class="action-btn copy" @click="copyResult">
            <ion-icon :icon="copyOutline"></ion-icon>
            复制结果
          </button>
          <button class="action-btn retry" @click="analyzeImage">
            <ion-icon :icon="refreshOutline"></ion-icon>
            重新识别
          </button>
        </div>
      </div>

      <div v-else class="result-error">
        <ion-icon :icon="alertCircleOutline"></ion-icon>
        <p>{{ recognitionResult.error }}</p>
        <button class="retry-btn" @click="analyzeImage">
          <ion-icon :icon="refreshOutline"></ion-icon>
          重试
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonIcon, IonSpinner } from '@ionic/vue';
import {
  cloudUploadOutline, trashOutline, eyeOutline, hourglassOutline,
  chatbubbleEllipsesOutline, createOutline, sparklesOutline,
  sendOutline, copyOutline, refreshOutline, alertCircleOutline
} from 'ionicons/icons';
import {
  validateImageFile,
  fileToBase64,
  resizeImage,
  recognizeImage,
  getImageRecognitionConfig,
  IMAGE_PROMPTS,
  type ImageRecognitionResult
} from '../../composables/imageRecognitionService';
import { showToast } from '../../composables/useToast';
import { Clipboard } from '@capacitor/clipboard';

// 事件定义
const emit = defineEmits<{
  imageAnalyzed: [result: ImageRecognitionResult & { imageUrl: string; prompt: string }];
  sendToChat: [content: string];
}>();

// 响应式数据
const fileInput = ref<HTMLInputElement>();
const selectedImage = ref<File | null>(null);
const previewUrl = ref('');
const imageDimensions = ref('');
const isDragOver = ref(false);
const isProcessing = ref(false);
const isAnalyzing = ref(false);
const processingText = ref('');
const customPrompt = ref('');
const recognitionResult = ref<ImageRecognitionResult | null>(null);

// 配置
const config = getImageRecognitionConfig();
const maxSizeMB = computed(() => Math.round(config.maxImageSize / 1024));

// 快速提示词
const quickPrompts = {
  general: { name: '通用描述', ...IMAGE_PROMPTS.general },
  objects: { name: '物体识别', ...IMAGE_PROMPTS.objects },
  scene: { name: '场景分析', ...IMAGE_PROMPTS.scene },
  text: { name: '文字识别', ...IMAGE_PROMPTS.text },
  people: { name: '人物分析', ...IMAGE_PROMPTS.people },
  analyze: { name: '艺术分析', ...IMAGE_PROMPTS.analyze }
};

// 计算属性
const hasStructuredInfo = computed(() => {
  if (!recognitionResult.value?.success) return false;
  const result = recognitionResult.value;
  return (result.objects?.length || 0) > 0 || 
         (result.colors?.length || 0) > 0 || 
         (result.emotions?.length || 0) > 0;
});

// 触发文件选择
const triggerFileInput = () => {
  if (isProcessing.value || isAnalyzing.value) return;
  fileInput.value?.click();
};

// 处理拖拽
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = false;
  
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handleFile(files[0]);
  }
};

// 处理文件选择
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    handleFile(target.files[0]);
  }
};

// 处理文件
const handleFile = async (file: File) => {
  // 验证文件
  const validation = validateImageFile(file);
  if (!validation.valid) {
    showToast(validation.error || '文件验证失败', 'error');
    return;
  }

  isProcessing.value = true;
  processingText.value = '处理图片...';
  recognitionResult.value = null;

  try {
    let processedFile = file;

    // 如果文件太大，自动调整尺寸
    if (config.autoResize && file.size > 2 * 1024 * 1024) { // 2MB
      processingText.value = '调整图片尺寸...';
      const resizedBlob = await resizeImage(file, 1024, 1024, 0.8);
      processedFile = new File([resizedBlob], file.name, { type: file.type });
    }

    selectedImage.value = processedFile;
    previewUrl.value = URL.createObjectURL(processedFile);

    // 获取图片尺寸
    await getImageDimensions(processedFile);

    showToast('图片上传成功', 'success');
  } catch (error) {
    console.error('File processing error:', error);
    showToast('图片处理失败', 'error');
  } finally {
    isProcessing.value = false;
  }
};

// 获取图片尺寸
const getImageDimensions = (file: File): Promise<void> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageDimensions.value = `${img.width} × ${img.height}`;
      resolve();
    };
    img.onerror = () => {
      imageDimensions.value = '未知';
      resolve();
    };
    img.src = URL.createObjectURL(file);
  });
};

// 删除图片
const removeImage = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  selectedImage.value = null;
  previewUrl.value = '';
  imageDimensions.value = '';
  recognitionResult.value = null;
  customPrompt.value = '';
  
  // 清空文件输入
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// 分析图片
const analyzeImage = () => {
  analyzeWithPrompt(IMAGE_PROMPTS.general.zh);
};

// 使用指定提示词分析
const analyzeWithPrompt = async (prompt: string) => {
  if (!selectedImage.value || !prompt.trim()) return;

  isAnalyzing.value = true;
  recognitionResult.value = null;

  try {
    // 转换为base64
    const base64Data = await fileToBase64(selectedImage.value);

    // 调用识别服务
    const result = await recognizeImage({
      imageData: base64Data,
      prompt: prompt.trim(),
      language: 'zh'
    });

    recognitionResult.value = result;

    if (result.success) {
      emit('imageAnalyzed', {
        ...result,
        imageUrl: previewUrl.value,
        prompt: prompt
      });
      showToast('图像识别完成', 'success');
    } else {
      showToast(`识别失败: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Image recognition error:', error);
    showToast('图像识别过程中出错', 'error');
  } finally {
    isAnalyzing.value = false;
  }
};

// 发送到聊天
const sendToChat = () => {
  if (!recognitionResult.value?.success || !recognitionResult.value.description) return;

  const content = `![图片](${previewUrl.value})\n\n**AI识别结果：**\n\n${recognitionResult.value.description}`;
  emit('sendToChat', content);
  showToast('已发送到聊天', 'success');
};

// 复制结果
const copyResult = async () => {
  if (!recognitionResult.value?.success || !recognitionResult.value.description) return;

  try {
    await Clipboard.write({
      string: recognitionResult.value.description
    });
    showToast('识别结果已复制', 'success');
  } catch (error) {
    showToast('复制失败', 'error');
  }
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// 清理资源
onMounted(() => {
  return () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }
  };
});
</script>

<style scoped>
.image-upload-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.upload-area {
  border: 2px dashed var(--ion-color-medium);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  background: var(--ion-color-step-50);
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: var(--ion-color-primary);
  background: var(--ion-color-step-100);
}

.upload-area.drag-over {
  border-color: var(--ion-color-success);
  background: var(--ion-color-success-tint);
  transform: scale(1.02);
}

.upload-area.has-image {
  padding: 0;
  border: none;
  background: transparent;
  cursor: default;
}

.upload-area.uploading {
  border-color: var(--ion-color-primary);
  background: var(--ion-color-primary-tint);
}

.file-input {
  display: none;
}

.upload-prompt {
  pointer-events: none;
}

.upload-icon {
  font-size: 3rem;
  color: var(--ion-color-medium);
  margin-bottom: 1rem;
}

.upload-prompt h3 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-primary);
  font-size: 1.2rem;
}

.upload-prompt p {
  margin: 0 0 1rem 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.supported-formats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.processing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  pointer-events: none;
}

.processing-spinner {
  --color: var(--ion-color-primary);
  width: 2rem;
  height: 2rem;
}

.image-preview {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-image {
  width: 100%;
  height: auto;
  display: block;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.7) 0%,
    transparent 30%,
    transparent 70%,
    rgba(0, 0, 0, 0.8) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.image-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.action-btn.remove {
  background: rgba(239, 68, 68, 0.8);
}

.action-btn.remove:hover {
  background: rgba(239, 68, 68, 1);
}

.action-btn.analyze {
  background: rgba(16, 185, 129, 0.8);
}

.action-btn.analyze:hover:not(:disabled) {
  background: rgba(16, 185, 129, 1);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.info-item .label {
  color: rgba(255, 255, 255, 0.8);
}

.info-item .value {
  color: white;
  font-weight: 500;
}

.quick-prompts {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--ion-color-step-50);
  border-radius: 8px;
}

.quick-prompts h4 {
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ion-color-primary);
  font-size: 1rem;
}

.prompt-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.prompt-btn {
  padding: 0.5rem 1rem;
  background: var(--ion-color-primary);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.prompt-btn:hover {
  background: var(--ion-color-primary-shade);
  transform: translateY(-1px);
}

.custom-prompt {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--ion-color-step-50);
  border-radius: 8px;
}

.prompt-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--ion-color-primary);
  font-size: 0.9rem;
}

.prompt-input-group {
  display: flex;
  gap: 0.5rem;
}

.prompt-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--ion-color-step-200);
  border-radius: 8px;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
}

.prompt-input:focus {
  outline: none;
  border-color: var(--ion-color-primary);
}

.analyze-btn {
  padding: 0.75rem 1rem;
  background: var(--ion-color-success);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.analyze-btn:hover:not(:disabled) {
  background: var(--ion-color-success-shade);
}

.analyze-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.recognition-result {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: var(--ion-color-step-50);
  border-radius: 12px;
  border: 1px solid var(--ion-color-step-150);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.result-header h4 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ion-color-primary);
  font-size: 1.1rem;
}

.result-stats {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  text-align: right;
}

.description-section h5 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-primary);
  font-size: 0.9rem;
}

.description-text {
  margin: 0 0 1rem 0;
  line-height: 1.6;
  color: var(--ion-text-color);
}

.structured-info {
  margin-bottom: 1rem;
}

.info-group {
  margin-bottom: 1rem;
}

.info-group h6 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-secondary);
  font-size: 0.8rem;
  font-weight: 600;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.info-tag {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.object-tag {
  background: var(--ion-color-primary-tint);
  color: var(--ion-color-primary-shade);
}

.color-tag {
  background: var(--ion-color-secondary-tint);
  color: var(--ion-color-secondary-shade);
}

.emotion-tag {
  background: var(--ion-color-tertiary-tint);
  color: var(--ion-color-tertiary-shade);
}

.result-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn.send {
  background: var(--ion-color-primary);
}

.action-btn.copy {
  background: var(--ion-color-secondary);
}

.action-btn.retry {
  background: var(--ion-color-tertiary);
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.result-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: var(--ion-color-danger);
  text-align: center;
}

.result-error ion-icon {
  font-size: 2rem;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: var(--ion-color-danger);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .upload-area {
    padding: 1.5rem 1rem;
  }

  .image-actions {
    flex-direction: column;
  }

  .prompt-input-group {
    flex-direction: column;
  }

  .result-actions {
    flex-direction: column;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style> 