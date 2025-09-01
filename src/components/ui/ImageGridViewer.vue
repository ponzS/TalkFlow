<template>
  <div class="image-grid" :class="gridClass">
    <div 
      v-for="(image, index) in displayImages" 
      :key="index" 
      class="image-item"
      @click="openFullscreenViewer(index)"
    >
      <img 
        :src="image" 
        :alt="`Image ${index + 1}`"
        class="grid-image"
        @load="onImageLoad"
        @error="onImageError"
      />
      <!-- 删除按钮 -->
      <ion-button 
        v-if="showRemoveButton"
        fill="clear" 
        color="danger" 
        class="remove-btn" 
        @click.stop="removeImage(index)"
      >
        <ion-icon :icon="closeOutline"></ion-icon>
      </ion-button>
      <!-- 如果图片数量超过9张，在第9张图片上显示剩余数量 -->
      <div v-if="index === 8 && images.length > 9" class="more-overlay">
        <span class="more-text">+{{ images.length - 9 }}</span>
      </div>
    </div>
  </div>

  <!-- 全屏图片查看器 -->
  <ion-modal 
    :is-open="isViewerOpen" 
    @did-dismiss="closeViewer"
    class="image-viewer-modal"
    :breakpoints="[0, 1]"
    :initial-breakpoint="1"
  >
    <div class="image-viewer">


      <!-- 图片容器 -->
      <div 
        ref="imageContainer"
        class="image-container"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <img 
          ref="viewerImage"
          :src="currentImage"
          :alt="`Image ${currentIndex + 1}`"
          class="viewer-image"
          :style="imageStyle"
          @load="onViewerImageLoad"
        />
      </div>

      <!-- 底部控制栏 -->
      <div class="bottom-controls">
        <!-- 图片导航（多张图片时显示） -->
        <div v-if="images.length > 1" class="navigation-section">
          <ion-button 
            fill="clear" 
            @click="previousImage"
            class="control-button"
            :disabled="currentIndex === 0"
          >
            <ion-icon :icon="chevronBackOutline"></ion-icon>
          </ion-button>
          
          <span class="image-counter">{{ currentIndex + 1 }} / {{ images.length }}</span>
          
          <ion-button 
            fill="clear" 
            @click="nextImage"
            class="control-button"
            :disabled="currentIndex === images.length - 1"
          >
            <ion-icon :icon="chevronForwardOutline"></ion-icon>
          </ion-button>
        </div>
        
        <!-- 缩放和操作控制 -->
        <div class="action-section">
          <ion-button 
            fill="clear" 
            @click="zoomOut"
            class="control-button"
            :disabled="scale <= minScale"
          >
            <ion-icon :icon="removeOutline"></ion-icon>
          </ion-button>
          
          <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
          
          <ion-button 
            fill="clear" 
            @click="zoomIn"
            class="control-button"
            :disabled="scale >= maxScale"
          >
            <ion-icon :icon="addOutline"></ion-icon>
          </ion-button>
          
          <!-- <ion-button 
            fill="clear" 
            @click="resetZoom"
            class="control-button"
          >
            <ion-icon :icon="refreshOutline"></ion-icon>
          </ion-button> -->
          
          <ion-button 
            fill="clear" 
            @click="rotateImage"
            class="control-button"
          >
            <ion-icon :icon="refreshOutline" style="transform: rotate(90deg);"></ion-icon>
          </ion-button>
          
          <ion-button 
            fill="clear" 
            @click="saveToAlbum"
            :disabled="isSaving"
            class="control-button"
          >
            <ion-icon v-if="!isSaving" :icon="downloadOutline"></ion-icon>
            <ion-spinner v-else name="crescent" class="save-spinner"></ion-spinner>
          </ion-button>

            <ion-button 
          fill="clear" 
          @click="closeViewer"
          class="close-button"
        >
          <ion-icon :icon="closeOutline"></ion-icon>
        </ion-button>
        </div>
      </div>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import {
  IonModal,
  IonButton,
  IonIcon,
  IonSpinner,
  toastController
} from '@ionic/vue';
import {
  closeOutline,
  downloadOutline,
  addOutline,
  removeOutline,
  refreshOutline,
  chevronBackOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media } from '@capacitor-community/media';
import { Capacitor } from '@capacitor/core';

// Props
interface Props {
  images: string[];
  maxImages?: number;
  showRemoveButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxImages: 9,
  showRemoveButton: false
});

// 事件定义
const emit = defineEmits<{
  'remove-image': [index: number]
}>();

// 响应式数据
const isViewerOpen = ref(false);
const currentIndex = ref(0);
const isSaving = ref(false);

// 缩放和平移相关
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const rotation = ref(0);
const minScale = 0.5;
const maxScale = 5;

// 触摸相关
const lastTouchDistance = ref(0);
const lastTouchCenter = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const lastPanPoint = ref({ x: 0, y: 0 });
const touches = ref<Touch[]>([]);

// DOM引用
const imageContainer = ref<HTMLElement>();
const viewerImage = ref<HTMLImageElement>();

// 计算属性
const displayImages = computed(() => {
  return props.images.slice(0, props.maxImages);
});

const gridClass = computed(() => {
  const count = displayImages.value.length;
  if (count === 1) return 'grid-single';
  if (count === 2) return 'grid-two';
  if (count === 3) return 'grid-three';
  if (count === 4) return 'grid-four';
  if (count <= 6) return 'grid-six';
  return 'grid-nine';
});

const currentImage = computed(() => {
  return props.images[currentIndex.value] || '';
});

const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
  transformOrigin: 'center center',
  transition: isDragging.value ? 'none' : 'transform 0.3s ease'
}));

// 方法
const openFullscreenViewer = (index: number) => {
  currentIndex.value = index;
  isViewerOpen.value = true;
  nextTick(() => {
    resetZoom();
  });
};

const closeViewer = () => {
  isViewerOpen.value = false;
  resetZoom();
  rotation.value = 0;
};

const removeImage = (index: number) => {
  emit('remove-image', index);
};

const previousImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    resetZoom();
  }
};

const nextImage = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++;
    resetZoom();
  }
};

// 缩放控制
const zoomIn = () => {
  const newScale = Math.min(scale.value * 1.2, maxScale);
  scale.value = newScale;
};

const zoomOut = () => {
  const newScale = Math.max(scale.value / 1.2, minScale);
  scale.value = newScale;
  
  if (newScale === minScale) {
    translateX.value = 0;
    translateY.value = 0;
  }
};

const resetZoom = () => {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
};

const rotateImage = () => {
  rotation.value = (rotation.value + 90) % 360;
};

// 触摸事件处理
const onTouchStart = (e: TouchEvent) => {
  e.preventDefault();
  touches.value = Array.from(e.touches);
  
  if (touches.value.length === 1) {
    isDragging.value = true;
    lastPanPoint.value = {
      x: touches.value[0].clientX,
      y: touches.value[0].clientY
    };
  } else if (touches.value.length === 2) {
    const touch1 = touches.value[0];
    const touch2 = touches.value[1];
    
    lastTouchDistance.value = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
    
    lastTouchCenter.value = {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }
};

const onTouchMove = (e: TouchEvent) => {
  e.preventDefault();
  touches.value = Array.from(e.touches);
  
  if (touches.value.length === 1 && isDragging.value) {
    const deltaX = touches.value[0].clientX - lastPanPoint.value.x;
    const deltaY = touches.value[0].clientY - lastPanPoint.value.y;
    
    translateX.value += deltaX;
    translateY.value += deltaY;
    
    lastPanPoint.value = {
      x: touches.value[0].clientX,
      y: touches.value[0].clientY
    };
  } else if (touches.value.length === 2) {
    const touch1 = touches.value[0];
    const touch2 = touches.value[1];
    
    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
    
    if (lastTouchDistance.value > 0) {
      const scaleChange = distance / lastTouchDistance.value;
      const newScale = Math.min(Math.max(scale.value * scaleChange, minScale), maxScale);
      scale.value = newScale;
    }
    
    lastTouchDistance.value = distance;
  }
};

const onTouchEnd = (e: TouchEvent) => {
  e.preventDefault();
  isDragging.value = false;
  touches.value = [];
  lastTouchDistance.value = 0;
};

const onViewerImageLoad = () => {
  resetZoom();
};

// 保存图片到相册
const saveToAlbum = async () => {
  if (isSaving.value) return;
  
  isSaving.value = true;
  
  try {
    if (Capacitor.isNativePlatform()) {
      await saveToNativeAlbum();
    } else {
      await downloadImageInBrowser();
    }
    
    await showToast('Save to album', 'success');
  } catch (error) {
    // console.error('Save to album failed:', error);
    await showToast('Save to album failed', 'error');
  } finally {
    isSaving.value = false;
  }
};

const saveToNativeAlbum = async () => {
  try {
    const response = await fetch(currentImage.value);
    const blob = await response.blob();
    
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    const fileName = `talkflow_image_${Date.now()}.jpg`;
    
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache
    });
    
    await Media.savePhoto({
      path: result.uri
    });
    
    try {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Cache
      });
    } catch (cleanupError) {
      console.warn('清理临时文件失败:', cleanupError);
    }
  } catch (error) {
    throw new Error('保存图片失败: ' + error);
  }
};

const downloadImageInBrowser = async () => {
  try {
    const link = document.createElement('a');
    link.href = currentImage.value;
    link.download = `image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    throw new Error('浏览器下载失败: ' + error);
  }
};

const showToast = async (message: string, color: 'success' | 'error' = 'success') => {
  const toast = await toastController.create({
    message,
    duration: 2000,
    color,
    position: 'top'
  });
  await toast.present();
};

const onImageLoad = () => {
  // 图片加载成功处理
};

const onImageError = () => {
  // 图片加载失败处理
};
</script>

<style scoped>
.image-grid {
  display: grid;
  gap: 2px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

/* 单张图片 */
.grid-single {
  grid-template-columns: 1fr;
  max-width: 300px;
}

.grid-single .image-item {
  aspect-ratio: auto;
}

.grid-single .grid-image {
  max-height: 400px;
  width: 100%;
  object-fit: cover;
}

/* 两张图片 */
.grid-two {
  grid-template-columns: 1fr 1fr;
  max-width: 300px;
}

.grid-two .image-item {
  aspect-ratio: 1;
}

/* 三张图片 */
.grid-three {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  max-width: 300px;
}

.grid-three .image-item:first-child {
  grid-row: 1 / 3;
  aspect-ratio: 1;
}

.grid-three .image-item:not(:first-child) {
  aspect-ratio: 1;
}

/* 四张图片 */
.grid-four {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  max-width: 300px;
}

.grid-four .image-item {
  aspect-ratio: 1;
}

/* 五到六张图片 */
.grid-six {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  max-width: 300px;
}

.grid-six .image-item {
  aspect-ratio: 1;
}

/* 七到九张图片 */
.grid-nine {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  max-width: 300px;
}

.grid-nine .image-item {
  aspect-ratio: 1;
}

/* 图片项样式 */
.image-item {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  background: var(--ion-color-light);
}

/* 删除按钮样式 */
.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  --color: white;
  --background: rgba(255, 59, 48, 0.8);
  --background-hover: rgba(255, 59, 48, 1);
  --border-radius: 50%;
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  margin: 0;
  padding: 0;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.remove-btn ion-icon {
  font-size: 14px;
}

.grid-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.image-item:hover .grid-image {
  transform: scale(1.05);
}

/* 更多图片覆盖层 */
.more-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.more-text {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* 全屏查看器样式 */
.image-viewer-modal {
  --background: rgba(0, 0, 0, 0.58);
  /* backdrop-filter: blur(20px); */
  --width: 100%;
  --height: 100%;
}

.image-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(6px); 
}

.viewer-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
}

.close-button {
  --color: rgb(255, 255, 255);
  --background: rgba(255, 255, 255, 0.1);
  --background-hover: rgba(255, 255, 255, 0.2);
  --border-radius: 50%;
  margin: 0 4px;
  width: 50px;
  height: 50px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.control-button {
  --color: rgb(255, 255, 255);
  --background: rgba(255, 255, 255, 0.1);
  --background-hover: rgba(255, 255, 255, 0.2);
  --border-radius: 50%;
  margin: 0 4px;
  width: 50px;
  height: 50px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-spinner {
  width: 16px;
  height: 16px;
}

.image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

.viewer-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  cursor: grab;
}

.viewer-image:active {
  cursor: grabbing;
}

.bottom-controls {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
}

.navigation-section {
  display: flex;
  justify-content: center;
  align-items: center;
  /* gap: 16px; */
  /* background-color: rgba(0, 0, 0, 0.6); */
  /* border-radius: 25px; */
  /* padding: 8px 16px; */
  /* backdrop-filter: blur(10px); */
}

.action-section {
  display: flex;
  justify-content: center;
  align-items: center;
  /* gap: 8px; */
  /* background-color: rgba(0, 0, 0, 0.6); */
  /* border-radius: 25px; */
  /* padding: 8px 16px; */
  /* backdrop-filter: blur(10px); */
  flex-wrap: wrap;
}

.zoom-level {
  color: rgb(195, 195, 195);
  font-size: 14px;
  font-weight: 500;
  min-width: 50px;
  text-align: center;
  background-color: rgba(44, 44, 44, 0.7);
  border-radius: 20px;
  padding: 6px 10px;
  margin: 0 4px;
}

.image-counter {
  color: white;
  font-size: 16px;
  font-weight: 500;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 20px;
}

</style>