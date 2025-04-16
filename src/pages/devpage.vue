<template>
    <ion-page>
      <ion-header collapse="fade" class="ion-no-border" style="--background: transparent !important;">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-back-button @click="router.go(-1)" color="dark"></ion-back-button>
          </ion-buttons>
          <ion-title>TalkFlow</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content :fullscreen="true">
        <img src="@/assets/dev1.jpg" style="width: 100%; height: 390px; object-fit: cover;" />
  
        <ion-header collapse="condense">
          <ion-toolbar>
            <!-- <ion-title>Visit : {{ totalViews }}</ion-title> -->
            <ion-title><h1>Developer Channel</h1></ion-title>
          </ion-toolbar>
        </ion-header>
        <div style="height: 10px;"></div>
  
        <ion-refresher slot="fixed" @ionRefresh="refreshMessages($event)">
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>
        <div class="moments-container" v-if="devMessages.length > 0">
          <div v-for="message in devMessages" :key="message.messageId" class="moment-card">
            <div class="moment-header">
              <ion-avatar class="avatar">
                <img :data-src="getAvatar(message.userPub) || getGunAvatar(message.userPub)" alt="Avatar" />
              </ion-avatar>
              <div class="header-info">
                <h2 class="clickable-name">{{ getBuddyAlias(message.userPub) }}</h2>
                <p class="timestamp">{{ formatTimestamp(message.timestamp) }}</p>
              </div>
            </div>
            <div class="content-wrapper">
              <div v-if="getText(message)" class="text-wrapper">
                <p 
                  class="content" 
                  @touchstart="handleLongPress($event, message)"
                
                  @contextmenu="showNativeMenu($event, message)"
                >
                  {{ getText(message) }}
                </p>
              </div>
              <carousel
                v-if="getImages(message).length > 0"
                :items-to-show="1"
                :wrap-around="true"
                :transition="500"
                class="image-carousel"
              >
                <slide v-for="(img, index) in getImages(message)" :key="index">
                  <img :data-src="img" class="moment-image" alt="" />
                </slide>
                <template #addons>
                  <navigation v-if="getImages(message).length > 1" />
                  <pagination />
                </template>
              </carousel>
              <div class="views-actions">
                <!-- <p>Visit: {{ getViewCount(message.messageId) }}</p> -->
                <!-- <ion-button 
                  v-if="message.userPub === currentUserPub" 
                  fill="clear" 
                  color="danger" 
                  size="small" 
                  @click="deleteMessage(message.messageId)"
                >
                  <ion-icon :icon="trashOutline"></ion-icon>
                </ion-button> -->
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-moments">
          <ion-icon :icon="chatbubblesOutline" size="large"></ion-icon>
          <p>{{ loading ? 'Loading...' : 'Loading..' }}</p>
        </div>
        <ion-infinite-scroll @ionInfinite="loadMore($event)" threshold="100px" :disabled="!hasMore">
          <ion-infinite-scroll-content loading-text="Loading..."></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import { 
    IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, 
    IonButton, IonIcon, IonAvatar, IonRefresher, IonRefresherContent, 
    IonInfiniteScroll, IonInfiniteScrollContent 
  } from '@ionic/vue';
  import { 
    chatbubblesOutline, trashOutline, createOutline 
  } from 'ionicons/icons';
  import { useDevChannel } from '@/composables/useDevChannel';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  import { gunAvatar, mountClass } from "gun-avatar";
  import { useTheme } from '@/composables/useTheme';
  import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
  import 'vue3-carousel/dist/carousel.css';
  
  mountClass();
  const router = useRouter();
  const { devMessages, loadDevMessages, hasMore, loading, totalViews, getViewCount, formatTimestamp, deleteDevMessage } = useDevChannel();
  const chatFlow = getTalkFlowCore();
  const { currentUserPub, userAvatars, setSelectedFriendPub, getAliasRealtime } = chatFlow;
  const { isDark } = useTheme();
  
  const headerImg = ref<HTMLImageElement | null>(null);
  let observer: IntersectionObserver | null = null;
  let longPressTimer: NodeJS.Timeout | null = null;
  const LONG_PRESS_DELAY = 500;
  
  onMounted(async () => {
  //  console.log('开发者频道页面挂载，加载消息');
    try {
      await loadDevMessages();
    //  console.log('消息加载完成:', devMessages.value);
      nextTick(() => setupLazyLoading());
    } catch (error) {
     // console.error('加载消息失败:', error);
    }
  });
  
  onUnmounted(() => {
    if (observer) observer.disconnect();
    // clearLongPress();
  });
  
  watch(devMessages, () => {
    nextTick(() => setupLazyLoading());
  });
  
  const setupLazyLoading = () => {
    if (observer) observer.disconnect();
  
    observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '0px 0px 200px 0px',
      threshold: 0.1
    });
  
    if (headerImg.value && headerImg.value.dataset.src) observer.observe(headerImg.value);
    const allImages = document.querySelectorAll('img[data-src]');
    allImages.forEach(img => observer!.observe(img));
  };
  
  // 长按处理 - 移动端
  const handleLongPress = (event: TouchEvent, message: any) => {
    
    showNativeMenu(event, message);
  
  };
  
  // 清除长按定时器
  // const clearLongPress = () => {
  //   if (longPressTimer) {
  //     clearTimeout(longPressTimer);
  //     longPressTimer = null;
  //   }
  // };
  
  // 显示原生上下文菜单
  const showNativeMenu = (event: MouseEvent | TouchEvent, message: any) => {
    const textElement = event.target as HTMLElement;
    if (textElement && getText(message)) {
      textElement.style.userSelect = 'text';
      textElement.style.webkitUserSelect = 'text';
      const range = document.createRange();
      range.selectNodeContents(textElement);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      textElement.focus();
      textElement.dispatchEvent(new Event('contextmenu'));
    
    }
  };
  
  const isBase64Image = (text: string): boolean => {
    const imageRegex = /^data:image\/(jpeg|png|gif|bmp|webp);base64,/i;
    return imageRegex.test(text);
  };
  
  const getImages = (message: any) => {
    const parts = message.content.split('\n');
    return parts
      .map((part: string, index: number) => {
        if (part === '[IMAGE]' && index + 1 < parts.length && isBase64Image(parts[index + 1])) {
          return parts[index + 1];
        }
        return null;
      })
      .filter((img: string | null) => img !== null) as string[];
  };
  
  const getText = (message: any) => {
    const parts = message.content.split('\n');
    return parts.filter((part: string) => part !== '[IMAGE]' && !isBase64Image(part)).join('\n');
  };
  
  const refreshMessages = async (event: CustomEvent) => {
    try {
      await loadDevMessages();
      console.log('刷新消息完成:', devMessages.value);
      event.detail.complete();
      nextTick(() => setupLazyLoading());
    } catch (error) {
      console.error('刷新消息失败:', error);
      event.detail.complete();
    }
  };
  
  const loadMore = async (event: CustomEvent) => {
    try {
      await loadDevMessages(10, true);
      console.log('加载更多消息:', devMessages.value);
      (event.target as HTMLIonInfiniteScrollElement).complete();
      nextTick(() => setupLazyLoading());
    } catch (error) {
      console.error('加载更多消息失败:', error);
      (event.target as HTMLIonInfiniteScrollElement).complete();
    }
  };
  
  const deleteMessage = async (messageId: string) => {
    try {
      await deleteDevMessage(messageId);
      console.log('删除消息成功:', messageId);
    } catch (error) {
      console.error('删除消息失败:', error);
    }
  };
  
  const getBuddyAlias = (pub: string): string => {
    return getAliasRealtime(pub) || 'TalkFlow';
  };
  
  const getAvatar = (userPub: string): string => {
    return userAvatars.value[userPub] || getGunAvatar(userPub);
  };
  
  const getGunAvatar = (pub: string) => {
    return gunAvatar({
      pub: pub,
      round: false,
      size: 200,
      dark: isDark.value
    });
  };
  </script>
  
  <style scoped>
  ion-content {
    --padding-start: 0;
    --padding-end: 0;
    --padding-top: 0;
    --padding-bottom: 0;
  }
  
  .moments-container {
    padding: 16px 0;
  }
  
  .moment-card {
    border-radius: 16px;
    margin-bottom: 16px;
    padding: 0;
  }
  
  .moment-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 3px;
  }
  
  .avatar {
    width: 59px;
    height: 59px;
    overflow: hidden;
    flex-shrink: 0;
  }
  
  .header-info {
    flex: 1;
  }
  
  .clickable-name {
    font-size: 1.3em;
    font-weight: 600;
    margin: 0;
  }
  
  .timestamp {
    color: #4a4a4a;
    font-size: 0.85em;
    margin: 2px 0 0;
  }
  
  .content-wrapper {
    margin: 0;
    margin-left: 17%;
  }
  
  .image-carousel {
    width: 100%;
    height: 300px;
    overflow: hidden;
    border-radius: 16px;
  }
  
  .carousel__slide {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .moment-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.2s ease;
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
  
  .text-wrapper {
    padding: 0 5px;
  }
  
  .content {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 1.3em;
    line-height: 1.6;
    margin: 0;
    text-shadow: 0 0 5px rgba(224, 224, 255, 0.3);
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  
  .content.selectable-text {
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }
  
  .views-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    font-size: 0.9em;
    color: #767676;
  }
  
  .no-moments {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 50vh;
    color: #767676;
  }
  
  .no-moments ion-icon {
    margin-bottom: 12px;
  }
  
  img[data-src] {
    opacity: 0.5;
    background: #f0f0f0;
    transition: opacity 0.3s ease;
  }
  
  img:not([data-src]) {
    opacity: 1;
  }
  </style>