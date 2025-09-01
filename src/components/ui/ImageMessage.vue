<template>
  <div class="image-message-container">
    <!-- Image display area -->
    <div 
      class="image-wrapper"
      @click="openImageViewer"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <img 
        :src="imageSrc" 
        :alt="alt"
        class="message-image"
        @load="onImageLoad"
        @error="onImageError"
      />
      
      <!-- Loading state -->
      <div v-if="isLoading" class="loading-overlay">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
      
      <!-- Error state -->
      <div v-if="hasError" class="error-overlay">
        <ion-icon :icon="alertCircleOutline"></ion-icon>
        <span>Null</span>
      </div>
    </div>

    <!-- Image viewer modal -->
    <ion-modal 
      :is-open="isViewerOpen" 
      @did-dismiss="closeImageViewer"
      class="image-viewer-modal"
      :breakpoints="[0, 1]"
    :initial-breakpoint="1"
    
    >
      <div class="image-viewer">
        <!-- Top toolbar (empty, for layout) -->
        <div class="viewer-toolbar">
        </div>

        <!-- Image container -->
        <div 
          ref="imageContainer"
          class="image-container"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          @wheel="onWheel"
        >
          <img 
            ref="viewerImage"
            :src="imageSrc"
            :alt="alt"
            class="viewer-image"
            :style="imageStyle"
            @load="onViewerImageLoad"
          />
        </div>

        <!-- Bottom toolbar -->
        <div class="zoom-controls">
          <ion-button 
            fill="clear" 
            @click="closeImageViewer"
            class="close-button"
          >
            <ion-icon size="medium"  :icon="closeOutline"></ion-icon>
          </ion-button>
          
          <ion-button 
            fill="clear" 
            @click="zoomOut"
            :disabled="scale <= minScale"
            class="zoom-button"
          >
            <ion-icon size="medium" :icon="removeOutline"></ion-icon>
          </ion-button>
          
          <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
          
          <ion-button 
            fill="clear" 
            @click="zoomIn"
            :disabled="scale >= maxScale"
            class="zoom-button"
          >
            <ion-icon size="medium"  :icon="addOutline"></ion-icon>
          </ion-button>
          
          <ion-button 
            fill="clear" 
            @click="rotateImage"
            class="rotate-button"
          >
            <ion-icon size="medium" :icon="refreshOutline"></ion-icon>
          </ion-button>
          
          <ion-button 
            fill="clear" 
            @click="saveToAlbum"
            :disabled="isSaving"
            class="save-button"
          >
           
           <ion-icon size="medium"  v-if="!isSaving" :icon="downloadOutline"></ion-icon>
            <ion-spinner size="medium" v-else name="crescent" class="save-spinner"></ion-spinner>
          </ion-button>
        </div>
      </div>
    </ion-modal>
  </div>
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
  alertCircleOutline
} from 'ionicons/icons';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Media } from '@capacitor-community/media';

// Props
interface Props {
  imageSrc: string;
  alt?: string;
  maxWidth?: string;
  maxHeight?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: 'Image',
  maxWidth: '100%',
  maxHeight: '300px'
});

// Reactive data
const isLoading = ref(true);
const hasError = ref(false);
const isViewerOpen = ref(false);
const isSaving = ref(false);

// Zoom and pan related
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const rotation = ref(0);
const minScale = 0.5;
const maxScale = 5;

// Touch related
const lastTouchDistance = ref(0);
const lastTouchCenter = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const lastPanPoint = ref({ x: 0, y: 0 });
const touches = ref<Touch[]>([]);

// DOM references
const imageContainer = ref<HTMLElement>();
const viewerImage = ref<HTMLImageElement>();

// Computed properties
const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
  transformOrigin: 'center center',
  transition: isDragging.value ? 'none' : 'transform 0.3s ease'
}));

// Event emitters
const emit = defineEmits<{
  load: [];
}>();

// Image loading handlers
const onImageLoad = () => {
  isLoading.value = false;
  hasError.value = false;
  emit('load');
};

const onImageError = () => {
  isLoading.value = false;
  hasError.value = true;
};

const onViewerImageLoad = () => {
  resetZoom();
};

// Open image viewer
const openImageViewer = () => {
  if (hasError.value) return;
  isViewerOpen.value = true;
  nextTick(() => {
    resetZoom();
  });
};

// Close image viewer
const closeImageViewer = () => {
  isViewerOpen.value = false;
  resetZoom();
  rotation.value = 0;
};

// Zoom controls
const zoomIn = () => {
  const newScale = Math.min(scale.value * 1.2, maxScale);
  scale.value = newScale;
};

const zoomOut = () => {
  const newScale = Math.max(scale.value / 1.2, minScale);
  scale.value = newScale;
  
  // Reset position if zoomed to minimum
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

// Rotate image
const rotateImage = () => {
  rotation.value = (rotation.value + 90) % 360;
};

// Touch event handling
const handleTouchStart = (e: TouchEvent) => {
  // Don't prevent default events, allow click events to trigger normally
};

const handleTouchMove = (e: TouchEvent) => {
  // Don't prevent default events, allow click events to trigger normally
};

const handleTouchEnd = (e: TouchEvent) => {
  // Don't prevent default events, allow click events to trigger normally
};

// Touch events in viewer
const onTouchStart = (e: TouchEvent) => {
  e.preventDefault();
  touches.value = Array.from(e.touches);
  
  if (touches.value.length === 1) {
    // Single finger drag
    isDragging.value = true;
    lastPanPoint.value = {
      x: touches.value[0].clientX,
      y: touches.value[0].clientY
    };
  } else if (touches.value.length === 2) {
    // Two finger zoom
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
    // Single finger drag
    const deltaX = touches.value[0].clientX - lastPanPoint.value.x;
    const deltaY = touches.value[0].clientY - lastPanPoint.value.y;
    
    translateX.value += deltaX;
    translateY.value += deltaY;
    
    lastPanPoint.value = {
      x: touches.value[0].clientX,
      y: touches.value[0].clientY
    };
  } else if (touches.value.length === 2) {
    // Two finger zoom
    const touch1 = touches.value[0];
    const touch2 = touches.value[1];
    
    const currentDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
    
    if (lastTouchDistance.value > 0) {
      const scaleChange = currentDistance / lastTouchDistance.value;
      const newScale = Math.max(minScale, Math.min(maxScale, scale.value * scaleChange));
      scale.value = newScale;
    }
    
    lastTouchDistance.value = currentDistance;
  }
};

const onTouchEnd = (e: TouchEvent) => {
  e.preventDefault();
  touches.value = Array.from(e.touches);
  
  if (touches.value.length === 0) {
    isDragging.value = false;
    lastTouchDistance.value = 0;
  }
};

// Mouse wheel zoom
const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(minScale, Math.min(maxScale, scale.value * delta));
  scale.value = newScale;
};

// Save to album
const saveToAlbum = async () => {
  if (isSaving.value) return;
  
  isSaving.value = true;
  
  try {
    // Check platform support
    if (!Capacitor.isNativePlatform()) {
      // Download image in browser
      await downloadImageInBrowser();
      await showToast('Image downloaded', 'success');
      return;
    }
    
  //  console.log('Starting to save image to album...');
    
    // Save to album on native platform
    if (props.imageSrc.startsWith('data:')) {
      // Base64 image
      //console.log('Saving Base64 image');
      await saveBase64ToAlbum();
    } else {
      // URL image
     // console.log('Saving URL image');
      await saveUrlToAlbum();
    }
    
    await showToast('Image saved to album', 'success');
  } catch (error) {
  //  console.error('Failed to save image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await showToast(`Save failed: ${errorMessage}`, 'error');
  } finally {
    isSaving.value = false;
  }
};

// Save Base64 image to album
const saveBase64ToAlbum = async () => {
  try {
  //  console.log('Starting to process Base64 image...');
    
    // Extract base64 data and MIME type
    const base64Data = props.imageSrc.split(',')[1];
    const mimeType = props.imageSrc.split(';')[0].split(':')[1];
    
    if (!base64Data) {
      throw new Error('Invalid Base64 image data');
    }
    
    console.log('Base64 data length:', base64Data.length);
    console.log('MIME type:', mimeType);
    
    // Generate filename
    const extension = mimeType.split('/')[1] || 'jpg';
    const fileName = `talkflow_image_${Date.now()}.${extension}`;
    
    // First save to temporary file
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache
    });
    
   // console.log('Temporary file saved successfully:', result.uri);
    
    // Use Media plugin to save to system album
    await Media.savePhoto({
      path: result.uri
    });
    
  //  console.log('Image saved to system album successfully');
    
    // Clean up temporary file
    try {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Cache
      });
    } catch (cleanupError) {
    //  console.warn('Failed to clean up temporary file:', cleanupError);
    }
    
   // console.log('Base64 image saved successfully');
  } catch (error) {
  //  console.error('Detailed error saving Base64 image:', error);
    throw new Error('Failed to save Base64 image: ' + (error instanceof Error ? error.message : error));
  }
};

// Save URL image to album
const saveUrlToAlbum = async () => {
  try {
   // console.log('Starting to download URL image...');
    
    // Download image
    const response = await fetch(props.imageSrc);
    const blob = await response.blob();
    
    // Convert to base64
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    // Generate filename
    const fileName = `talkflow_url_image_${Date.now()}.jpg`;
    
    // Save to temporary file
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache
    });
    
    console.log('Temporary file saved successfully:', result.uri);
    
    // Use Media plugin to save to system album
    await Media.savePhoto({
      path: result.uri
    });
    
    console.log('Image saved to system album successfully');
    
    // Clean up temporary file
    try {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Cache
      });
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
    }
  } catch (error) {
    throw new Error('Failed to save URL image: ' + error);
  }
};

// Download image in browser
const downloadImageInBrowser = async () => {
  try {
    const link = document.createElement('a');
    link.href = props.imageSrc;
    link.download = `image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    throw new Error('Browser download failed: ' + error);
  }
};

// Show toast
const showToast = async (message: string, color: 'success' | 'error' = 'success') => {
  const toast = await toastController.create({
    message,
    duration: 2000,
    color,
    position: 'top'
  });
  await toast.present();
};
</script>

<style scoped>
.image-message-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.image-wrapper {
  position: relative;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  background: var(--ion-color-light);
}

.message-image {
  display: block;
  max-width: v-bind(maxWidth);
  max-height: v-bind(maxHeight);
  width: auto;
  height: auto;
  object-fit: cover;
  border-radius: 12px;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 12px;
}

.error-overlay {
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}

/* Image viewer styles */
.image-viewer-modal {
  --background: rgba(0, 0, 0, 0.706);
  /* background: rgba(0, 0, 0, 0.427); */
  /* --backdrop-filter: blur(20px); */
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
  padding: 1px;
  /* background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent); */
}

.close-button,
.save-button,
.zoom-button,
.rotate-button {
  --color: rgb(255, 255, 255);
  --background: rgba(255, 255, 255, 0.096);
  --background-hover: rgba(255, 255, 255, 0.2);
  --border-radius: 50%;
  margin: 0 4px;
  width: 50px;
  height: 50px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;

   /* --border-radius: 20px; */
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-spinner {
  width: 16px;
  height: 16px;
  margin-left: 4px;
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
  max-width: 80%;
  max-height: 80%;
  object-fit: contain;
  cursor: grab;
}

.viewer-image:active {
  cursor: grabbing;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0px;
  /* background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent); */
  gap: 4px;
  flex-wrap: wrap;
}

.zoom-level {
  color: rgb(195, 195, 195);
  font-size: 14px;
  font-weight: 500;
  min-width: 50px;
  text-align: center;
  background-color: rgba(44, 44, 44, 0.266);
  border-radius: 20px;
}

/* Responsive design */
@media (max-width: 768px) {
  /* .viewer-toolbar,
  .zoom-controls {
    padding: 12px;
  }
  
  .close-button,
  .save-button,
  .zoom-button,
  .rotate-button {
    --padding-start: 6px;
    --padding-end: 6px;
    font-size: 12px;
  }
  
  .zoom-controls {
    gap: 2px;
  } */
}

/* Dark theme adaptation */
@media (prefers-color-scheme: dark) {
  .image-wrapper {
    background: var(--ion-color-dark);
  }
}
</style>