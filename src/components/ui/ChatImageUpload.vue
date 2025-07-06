<template>
  <div class="chat-image-upload">
    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      @change="handleFileSelect"
      style="display: none"
    />

    <!-- 上传按钮 -->
    <ion-button
      @click="triggerFileInput"
      class="upload-button"
      fill="clear"
      size="small"
      :disabled="isUploading"
    >
      <ion-icon 
        :icon="isUploading ? hourglassOutline : imageOutline" 
        slot="icon-only"
      ></ion-icon>
    </ion-button>

    <!-- 图片预览区域 -->
    <div v-if="previewImages.length > 0" class="preview-container">
      <div 
        v-for="(image, index) in previewImages" 
        :key="index" 
        class="preview-item"
      >
        <img :src="image.url" :alt="image.name" class="preview-image" />
        <div class="preview-overlay">
          <span class="image-name">{{ image.name }}</span>
          <button @click="removeImage(index)" class="remove-button">
            <ion-icon :icon="closeOutline"></ion-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- 拖拽上传提示 -->
    <div 
      v-if="isDragOver" 
      class="drag-overlay"
      @drop="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <div class="drag-content">
        <ion-icon :icon="cloudUploadOutline" class="drag-icon"></ion-icon>
        <p>释放以上传图片</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import {
  imageOutline, hourglassOutline, closeOutline, cloudUploadOutline
} from 'ionicons/icons';
import { validateImageFile, fileToBase64, resizeImage, getImageRecognitionConfig } from '../../composables/imageRecognitionService';
import { showToast } from '../../composables/useToast';

// 事件定义
const emit = defineEmits<{
  imagesSelected: [images: ImageFile[]];
  uploadError: [error: string];
}>();

// 接口定义
export interface ImageFile {
  file: File;
  url: string;
  base64: string;
  name: string;
  size: number;
}

// 响应式数据
const fileInput = ref<HTMLInputElement>();
const previewImages = ref<ImageFile[]>([]);
const isUploading = ref(false);
const isDragOver = ref(false);

// 配置
const config = getImageRecognitionConfig();

// 触发文件选择
const triggerFileInput = () => {
  if (isUploading.value) return;
  fileInput.value?.click();
};

// 处理文件选择
const handleFileSelect = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    await processFiles(Array.from(target.files));
    // 清空input以便重复选择同一文件
    target.value = '';
  }
};

// 处理拖拽
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  // 只有当离开整个拖拽区域时才隐藏
  if (!e.currentTarget?.contains(e.relatedTarget as Node)) {
    isDragOver.value = false;
  }
};

const handleDrop = async (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = false;
  
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    await processFiles(Array.from(files));
  }
};

// 处理文件
const processFiles = async (files: File[]) => {
  isUploading.value = true;
  
  try {
    const validFiles: ImageFile[] = [];
    
    for (const file of files) {
      // 验证文件
      const validation = validateImageFile(file);
      if (!validation.valid) {
        showToast(validation.error || '文件验证失败', 'error');
        continue;
      }

      // 处理文件
      let processedFile = file;
      
      // 🔧 针对ollama视觉模型的图片优化
      const shouldOptimize = file.size > 1024 * 1024; // 1MB以上
      
      if (config.autoResize || shouldOptimize) {
        try {
          // ollama视觉模型推荐的尺寸：不超过1024x1024，质量0.8-0.9
          const maxSize = 1024;
          const quality = 0.85;
          
          const resizedBlob = await resizeImage(file, maxSize, maxSize, quality);
          processedFile = new File([resizedBlob], file.name, { type: file.type });
          
          console.log(`🖼️ 图片优化: ${file.name}`, {
            original: `${Math.round(file.size / 1024)}KB`,
            optimized: `${Math.round(processedFile.size / 1024)}KB`,
            reduction: `${Math.round((1 - processedFile.size / file.size) * 100)}%`
          });
        } catch (error) {
          console.warn('Failed to optimize image, using original:', error);
        }
      }

      // 转换为base64
      const base64 = await fileToBase64(processedFile);
      const url = URL.createObjectURL(processedFile);

      validFiles.push({
        file: processedFile,
        url,
        base64,
        name: file.name,
        size: processedFile.size
      });
    }

    if (validFiles.length > 0) {
      previewImages.value.push(...validFiles);
      emit('imagesSelected', previewImages.value);
      showToast(`已选择 ${validFiles.length} 张图片`, 'success');
    }
  } catch (error) {
    console.error('Process files error:', error);
    emit('uploadError', '处理图片时出错');
    showToast('处理图片时出错', 'error');
  } finally {
    isUploading.value = false;
  }
};

// 移除图片
const removeImage = (index: number) => {
  const image = previewImages.value[index];
  if (image.url) {
    URL.revokeObjectURL(image.url);
  }
  previewImages.value.splice(index, 1);
  emit('imagesSelected', previewImages.value);
};

// 清空所有图片
const clearImages = () => {
  previewImages.value.forEach(image => {
    if (image.url) {
      URL.revokeObjectURL(image.url);
    }
  });
  previewImages.value = [];
  emit('imagesSelected', []);
};

// 获取当前图片
const getImages = () => previewImages.value;

// 暴露方法给父组件
defineExpose({
  clearImages,
  getImages
});

// 全局拖拽事件监听
const handleGlobalDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = true;
};

const handleGlobalDragLeave = (e: DragEvent) => {
  e.preventDefault();
  // 检查是否真的离开了页面
  if (e.clientX === 0 && e.clientY === 0) {
    isDragOver.value = false;
  }
};

const handleGlobalDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = false;
};

// 组件挂载时添加全局事件监听
onMounted(() => {
  document.addEventListener('dragover', handleGlobalDragOver);
  document.addEventListener('dragleave', handleGlobalDragLeave);
  document.addEventListener('drop', handleGlobalDrop);
});

// 组件卸载时清理
onUnmounted(() => {
  document.removeEventListener('dragover', handleGlobalDragOver);
  document.removeEventListener('dragleave', handleGlobalDragLeave);
  document.removeEventListener('drop', handleGlobalDrop);
  
  // 清理对象URL
  previewImages.value.forEach(image => {
    if (image.url) {
      URL.revokeObjectURL(image.url);
    }
  });
});
</script>

<style scoped>
.chat-image-upload {
  position: relative;
}

.upload-button {
  --padding-start: 6px;
  --padding-end: 6px;
  height: 32px;
  width: 32px;
  --border-radius: 50%;
  margin-bottom: 4px;
  flex-shrink: 0;
  --color: #4f46e5;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
  position: relative;
  overflow: hidden;
}

.upload-button:hover:not(:disabled) {
  --color: #4338ca;
  transform: scale(1.1) rotate(-5deg);
  --background: linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.upload-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.preview-container {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
  max-height: 120px;
  overflow-y: auto;
}

.preview-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--ion-color-step-100);
  border: 2px solid var(--ion-color-step-200);
  transition: all 0.2s ease;
}

.preview-item:hover {
  border-color: var(--ion-color-primary);
  transform: scale(1.05);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, transparent 40%, transparent 60%, rgba(0, 0, 0, 0.6) 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px;
}

.preview-item:hover .preview-overlay {
  opacity: 1;
}

.image-name {
  color: white;
  font-size: 10px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.remove-button {
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  align-self: flex-end;
}

.remove-button:hover {
  background: rgba(239, 68, 68, 1);
  transform: scale(1.1);
}

.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(79, 70, 229, 0.1);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.drag-content {
  background: var(--ion-background-color);
  border: 2px dashed var(--ion-color-primary);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 300px;
}

.drag-icon {
  font-size: 3rem;
  color: var(--ion-color-primary);
  margin-bottom: 1rem;
  animation: bounce 1s infinite;
}

.drag-content p {
  margin: 0;
  color: var(--ion-color-primary);
  font-weight: 600;
  font-size: 1.1rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .preview-item {
    width: 60px;
    height: 60px;
  }
  
  .preview-container {
    max-height: 80px;
  }
  
  .drag-content {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .drag-icon {
    font-size: 2rem;
  }
  
  .drag-content p {
    font-size: 1rem;
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .upload-button {
    --color: #818cf8;
    --background: linear-gradient(135deg, rgba(129, 140, 248, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%);
  }
  
  .upload-button:hover:not(:disabled) {
    --color: #6366f1;
    --background: linear-gradient(135deg, rgba(129, 140, 248, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%);
    box-shadow: 0 4px 12px rgba(129, 140, 248, 0.4);
  }
  
  .preview-item {
    border-color: var(--ion-color-step-300);
  }
  
  .preview-item:hover {
    border-color: var(--ion-color-primary-tint);
  }
  
  .drag-overlay {
    background: rgba(129, 140, 248, 0.15);
  }
  
  .drag-content {
    border-color: var(--ion-color-primary-tint);
  }
  
  .drag-icon,
  .drag-content p {
    color: var(--ion-color-primary-tint);
  }
}
</style> 