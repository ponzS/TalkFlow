<template>
  <div class="hls-video-container" :data-msgid="msgId">
    <!-- HLS 视频播放器 -->
    <div class="video-player-wrapper">
      <video 
        ref="videoElement"
        class="hls-video-player"
        controls
        playsinline
        :poster="posterUrl"
        @loadstart="onLoadStart"
        @loadedmetadata="onLoadedMetadata"
        @error="onError"
        @play="onPlay"
        @pause="onPause"
      >
        {{ $t('VideoNotSupported') || 'Your browser does not support the video tag.' }}
      </video>
      
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p class="loading-text">{{ $t('Loading') || 'Loading...' }}</p>
      </div>
      
      <!-- 错误状态 -->
      <div v-if="hasError" class="error-overlay">
        <ion-icon :icon="alertCircleOutline" class="error-icon"></ion-icon>
        <p class="error-text">{{ $t('VideoLoadError') || 'Failed to load video' }}</p>
        <ion-button size="small" @click="retryLoad">{{ $t('Retry') || 'Retry' }}</ion-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { IonIcon, IonButton } from '@ionic/vue';
import { playOutline, lockClosedOutline, alertCircleOutline } from 'ionicons/icons';
import Hls from 'hls.js';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Props {
  msgId: string;
  base64Video: string;
  autoplay?: boolean;
  muted?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: false,
  muted: false
});

const emit = defineEmits<{
  loaded: [msgId: string];
  error: [msgId: string, error: any];
  play: [msgId: string];
  pause: [msgId: string];
}>();

const videoElement = ref<HTMLVideoElement | null>(null);
const hls = ref<Hls | null>(null);
const isLoaded = ref(false);
const isLoading = ref(false);
const hasError = ref(false);
const posterUrl = ref<string>('');

// 从base64视频中提取第一帧作为预览
const extractFirstFrame = async (base64Video: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      video.currentTime = 0.1; // 获取0.1秒处的帧
    };
    
    video.onseeked = () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(frameDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for frame extraction'));
    };
    
    video.src = base64Video;
  });
};

// 检查是否为HLS流URL
const isHlsUrl = (url: string): boolean => {
  return url.includes('.m3u8') || url.includes('application/vnd.apple.mpegurl');
};

// 将base64转换为blob URL
const base64ToBlob = (base64: string): string => {
  try {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to convert base64 to blob:', error);
    throw error;
  }
};



// 加载视频
const loadVideo = async () => {
  if (isLoaded.value || isLoading.value) return;
  
  console.log('Loading video for msgId:', props.msgId);
  console.log('Video source type:', props.base64Video.startsWith('data:video/') ? 'base64' : 'url');
  
  isLoading.value = true;
  hasError.value = false;
  
  try {
    await nextTick();
    
    if (!videoElement.value) {
      throw new Error('Video element not available');
    }
    
    // 检查是否为HLS流
    if (isHlsUrl(props.base64Video)) {
      // 处理HLS流
      if (Hls.isSupported()) {
        // 使用HLS.js
        hls.value = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90
        });
        
        hls.value.loadSource(props.base64Video);
        hls.value.attachMedia(videoElement.value);
        
        hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
          isLoaded.value = true;
          isLoading.value = false;
          emit('loaded', props.msgId);
          
          if (props.autoplay) {
            videoElement.value?.play();
          }
        });
        
        hls.value.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            handleError(new Error(`HLS Error: ${data.type} - ${data.details}`));
          }
        });
      } else if (videoElement.value.canPlayType('application/vnd.apple.mpegurl')) {
        // 原生HLS支持 (Safari)
        videoElement.value.src = props.base64Video;
        
        videoElement.value.addEventListener('loadedmetadata', () => {
          isLoaded.value = true;
          isLoading.value = false;
          emit('loaded', props.msgId);
          
          if (props.autoplay) {
            videoElement.value?.play();
          }
        });
      } else {
        handleError(new Error('HLS not supported on this browser'));
        return;
      }
    } else {
      // 处理普通视频（包括base64）
      let videoSrc = props.base64Video;
      
      // 如果是base64，转换为blob URL以提高性能
      if (props.base64Video.startsWith('data:video/')) {
        try {
          videoSrc = base64ToBlob(props.base64Video);
        } catch (error) {
          console.warn('Failed to convert base64 to blob, using direct base64:', error);
          videoSrc = props.base64Video;
        }
      }
      
      videoElement.value.src = videoSrc;
      
      const onLoadedMetadata = () => {
         console.log('Video metadata loaded for msgId:', props.msgId);
         isLoaded.value = true;
         isLoading.value = false;
         emit('loaded', props.msgId);
         
         if (props.autoplay) {
           console.log('Auto-playing video for msgId:', props.msgId);
           videoElement.value?.play();
         }
         
         videoElement.value?.removeEventListener('loadedmetadata', onLoadedMetadata);
       };
       
       const onError = (event: Event) => {
         console.error('Video loading error for msgId:', props.msgId, event);
         handleError(new Error('Failed to load video'));
         videoElement.value?.removeEventListener('error', onError);
       };
      
      videoElement.value.addEventListener('loadedmetadata', onLoadedMetadata);
      videoElement.value.addEventListener('error', onError);
    }
  } catch (error) {
    handleError(error);
  }
};

// 错误处理
const handleError = (error: any) => {
  console.error('Video loading error:', error);
  isLoading.value = false;
  hasError.value = true;
  emit('error', props.msgId, error);
};

// 重试加载
const retryLoad = () => {
  hasError.value = false;
  isLoaded.value = false;
  loadVideo();
};

// 事件处理
const onLoadStart = () => {
  isLoading.value = true;
};

const onLoadedMetadata = () => {
  isLoading.value = false;
};

const onError = (event: Event) => {
  const error = (event.target as HTMLVideoElement)?.error;
  handleError(error || new Error('Video playback error'));
};

const onPlay = () => {
  emit('play', props.msgId);
  
};

const onPause = () => {
  emit('pause', props.msgId);
};

// 初始化预览图
const initializePoster = async () => {
  try {
    posterUrl.value = await extractFirstFrame(props.base64Video);
  } catch (error) {
    console.warn('Failed to extract video frame for poster:', error);
    // 使用默认占位符
  }
};

// 清理资源
const cleanup = () => {
  if (hls.value) {
    hls.value.destroy();
    hls.value = null;
  }
  
  if (videoElement.value) {
    videoElement.value.src = '';
  }
};

// 监听props变化
watch(() => props.base64Video, () => {
  cleanup();
  isLoaded.value = false;
  initializePoster();
}, { immediate: true });

onMounted(() => {
  initializePoster();
  loadVideo(); // 立即加载视频源
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
.hls-video-container {
  position: relative;
  width: 100%;
  max-width: 300px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--ion-color-light);
}

.video-placeholder {
  position: relative;
  width: 100%;
  min-height: 200px;
  background-color: var(--ion-color-medium);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.video-placeholder:hover {
  transform: scale(1.02);
}

.placeholder-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
}

.video-placeholder-text {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
}

.lock-icon {
  font-size: 16px;
  margin-bottom: 8px;
  opacity: 0.8;
}

.play-icon {
  font-size: 32px;
  opacity: 0.9;
  transition: all 0.3s ease;
}

.video-placeholder:hover .play-icon {
  transform: scale(1.1);
  opacity: 1;
}

.video-player-wrapper {
  position: relative;
  width: 100%;
}

.hls-video-player {
  width: 100%;
  height: 260px;
  display: block;
  background: #000000e0;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text,
.error-text {
  margin: 0;
  font-size: 14px;
  margin-bottom: 12px;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 12px;
  color: var(--ion-color-danger);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .hls-video-container {
    background: var(--ion-color-dark);
  }
  
  .video-placeholder {
    background-color: var(--ion-color-medium-shade);
  }
}
</style>