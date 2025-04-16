<template>
    <ion-page>
      <ion-header collapse="fade">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-back-button color="dark" @click="router.go(-1)"></ion-back-button>
          </ion-buttons>
          <ion-title>dev</ion-title>
          <ion-buttons slot="end">
            <ion-button 
              :disabled="!newDevMessageContent.trim() && selectedImages.length === 0 || isPosting" 
              strong
              @click="handlePost"
            >
              <ion-icon :icon="sendOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="input-container">
          <ion-textarea
            v-model="newDevMessageContent"
            auto-grow
            placeholder="发布开发者消息..."
            class="moment-textarea"
            :rows="3"
            :disabled="isPosting"
          ></ion-textarea>
          <p class="char-count" :class="{ 'over-limit': newDevMessageContent.length > 10000 }">
            {{ newDevMessageContent.length }}/10000
          </p>
        </div>
        <carousel
          v-if="selectedImages.length > 0"
          :items-to-show="1"
          :wrap-around="true"
          :transition="500"
          class="image-carousel"
        >
          <slide v-for="(image, index) in selectedImages" :key="index">
            <div class="image-item">
              <img :src="image" alt="Selected Image" class="moment-image" />
              <ion-button fill="clear" color="danger" class="remove-btn" @click="removeImage(index)" :disabled="isPosting">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </div>
          </slide>
          <template #addons>
            <navigation v-if="selectedImages.length > 1" />
            <pagination />
          </template>
        </carousel>
        <ion-button color="dark" expand="block" class="image-select-btn" @click="selectImages" :disabled="isPosting">
          <ion-icon :icon="imageOutline" slot="start"></ion-icon>
          添加图片
        </ion-button>
        <input type="file" ref="fileInput" multiple accept="image/*" @change="handleImageSelect" style="display: none;" />
        <ion-loading
          :is-open="isPosting"
          message="正在发布消息..."
          :duration="0"
        ></ion-loading>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { 
    IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, 
    IonTextarea, IonIcon, IonBackButton, IonLoading 
  } from '@ionic/vue';
  import { closeOutline, sendOutline, imageOutline } from 'ionicons/icons'; 
  import { useDevChannel } from '@/composables/useDevChannel'; // 引入开发者频道 composable
  import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
  import 'vue3-carousel/dist/carousel.css';
  
  const router = useRouter();
  const { postDevMessage } = useDevChannel();
  
  const newDevMessageContent = ref<string>(''); // 开发者消息内容
  const selectedImages = ref<string[]>([]);
  const fileInput = ref<HTMLInputElement | null>(null);
  const isPosting = ref(false);
  
  // 选择图片
  const selectImages = () => {
    fileInput.value?.click();
  };
  
  // 压缩图片函数
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const reader = new FileReader();
  
      reader.onload = (e) => {
        img.src = e.target!.result as string;
        img.onload = () => {
          const scale = maxWidth / img.width;
          const width = img.width > maxWidth ? maxWidth : img.width;
          const height = img.width > maxWidth ? img.height * scale : img.height;
  
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
  
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };
  
  // 处理图片选择并压缩
  const handleImageSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      for (const file of files) {
        try {
          const compressedBase64 = await compressImage(file, 800, 0.7);
          selectedImages.value.push(compressedBase64);
        } catch (error) {
          console.error('图片压缩失败:', error);
        }
      }
      input.value = '';
    }
  };
  
  // 移除图片
  const removeImage = (index: number) => {
    selectedImages.value.splice(index, 1);
  };
  
  // 添加超时 Promise 包装
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    );
    return Promise.race([promise, timeout]) as Promise<T>;
  };
  
  // 发布开发者消息
  const handlePost = async () => {
    if (isPosting.value) return;
    isPosting.value = true;
  
    let content = newDevMessageContent.value.trim();
    if (selectedImages.value.length > 0) {
      const imageContent = selectedImages.value.map(img => `[IMAGE]\n${img}`).join('\n');
      content = content ? `${content}\n${imageContent}` : imageContent;
    }
  
    console.log('发送的开发者消息内容:', content);
  
    try {
      await withTimeout(postDevMessage(content), 10000); // 10秒超时
      console.log('开发者消息发布成功');
      selectedImages.value = [];
      newDevMessageContent.value = '';
      router.go(-1);
    } catch (error: any) {
      console.error('发布开发者消息失败:', error);
    } finally {
      isPosting.value = false;
    }
  };
  </script>
  
  <style scoped>
  ion-content {
    --padding-start: 0;
    --padding-end: 0;
    --padding-top: 0;
    --padding-bottom: 0;
  }
  
  ion-toolbar {
    --border-width: 0;
    --padding-top: 8px;
    --padding-bottom: 8px;
  }
  
  ion-title {
    font-size: 1.2em;
    font-weight: 700;
  }
  
  .input-container {
    position: relative;
    margin-bottom: 16px;
    padding: 0 16px;
  }
  
  .moment-textarea {
    --padding-start: 12px;
    --padding-end: 12px;
    --padding-top: 12px;
    --padding-bottom: 12px;
    font-size: 16px;
  }
  
  .char-count {
    text-align: right;
    font-size: 12px;
    color: #8795a1;
    margin: 4px 0 0;
  }
  
  .over-limit {
    color: #ff6b6b;
  }
  
  .image-carousel {
    width: 100%;
    height: 390px;
    overflow: hidden;
  }
  
  .carousel__slide {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .image-item {
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .moment-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  
  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    --padding-start: 4px;
    --padding-end: 4px;
    --background: rgba(0, 0, 0, 0.5);
    --border-radius: 50%;
  }
  
  :deep(.carousel__viewport) {
    width: 100%;
    height: 100%;
  }
  
  :deep(.carousel__track) {
    display: flex;
    flex-direction: row;
  }
  
  :deep(.carousel__pagination) {
    padding: 10px 0;
  }
  
  :deep(.carousel__pagination-button) {
    width: 8px;
    height: 8px;
    background: #fff;
    opacity: 0.8;
    border-radius: 50%;
    margin: 0 4px;
  }
  
  :deep(.carousel__pagination-button--active) {
    background: #00ffbb;
    opacity: 1;
  }
  
  :deep(.carousel__prev),
  :deep(.carousel__next) {
    color: #fff;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    top: 50%;
    transform: translateY(-50%);
  }
  
  :deep(.carousel__prev) {
    left: 10px;
  }
  
  :deep(.carousel__next) {
    right: 10px;
  }
  
  .image-select-btn {
    --border-radius: 12px;
    margin: 16px;
  }
  
  ion-button {
    --padding-start: 8px;
    --padding-end: 8px;
  }
  </style>