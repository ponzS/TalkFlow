<template>
  <ion-page>
    <ion-header >
      <ion-toolbar style=" --background: var(--ion-background-color);">
        <ion-buttons slot="start">
          <ion-back-button text="" @click="router.go(-1)" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title class="cosmic-title">
          <img style="width: 100%;height: 100%;object-fit: cover;" :data-src="getAvatarWithFallback(friendPub)" alt="Avatar" />
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="cosmic-content">



      <ion-header class="cosmic-header" collapse="condense">
        <ion-toolbar class="cosmic-toolbar">
          <div class="profile-header">

            <div class="avatar-glow1">

              <img  :data-src="getAvatarWithFallback(friendPub)" alt=""  style="width: 100%;height: 100%;object-fit: cover;"/>

            </div>

            <ion-avatar class="profile-avatar" @click="handlePublicKey(friendPub)">
              <img :data-src="getAvatarWithFallback(friendPub)" alt="" style="width: 100%;height: 100%;object-fit: cover;" />
            </ion-avatar>
            <div class="profile-info" @click="handlePublicKey(friendPub)">
              <h1>{{ getBuddyAlias(friendPub) }}</h1>
              <p class="user-pub">@{{ friendPub.slice(0, 8) + '...' }}</p>
            </div>
          </div>
          <!-- <ion-button  @click="handlePublicKey(friendPub)" style="margin:0 auto;width: 100%;--background-color:var(--background-color-no)">
            Profile
          </ion-button> -->
          <div style="height: 20px;"></div>
        </ion-toolbar>
      </ion-header>

      



      <div class="moments-container" v-if="friendMoments.length > 0">
        <div v-for="moment in friendMoments" :key="moment.momentId" class="moment-item">
          <div class="moment-header">
            <ion-avatar class="avatar" @click="goToProfile(moment.userPub)">
              <img style="width: 100%;height: 100%;object-fit: cover;" :data-src="getAvatarWithFallback(moment.userPub)" alt="Avatar" />
            </ion-avatar>
            <div class="header-info">
              <h2 class="clickable-name" @click="goToProfile(moment.userPub)">
                {{ getBuddyAlias(moment.userPub) }}
              </h2>
              <p class="timestamp">{{ formatTimestamp(moment.timestamp) }}</p>
            </div>
          </div>
          <!-- 转发动态的转发评论 -->
          <div v-if="moment.isForward && moment.forwardContent" class="forward-content-wrapper">
            <p class="forward-content">{{ truncateForwardContent(moment.forwardContent) }}</p>
          </div>
          
          <!-- 转发动态的原动态卡片 -->
          <OriginalMomentCard 
            v-if="moment.isForward && moment.originalMomentId && moment.originalAuthor"
            :original-moment-id="moment.originalMomentId"
            :original-author="moment.originalAuthor"
            @click.stop
          />
          
          <!-- 非转发动态的图片轮播 -->
          <carousel
            v-if="!moment.isForward && getImages(moment).length > 0"
            :items-to-show="1"
            :wrap-around="true"
            :transition="500"
            class="image-carousel"
            @click="goToMomentDetail(moment)"
          >
            <slide v-for="(img, index) in getImages(moment)" :key="index">
              <img :data-src="img" class="moment-image" alt="Moment Image" @click.stop />
            </slide>
            <template #addons>
              <navigation v-if="getImages(moment).length > 1" />
              <pagination />
            </template>
          </carousel>
          
          <!-- 非转发动态的文字内容 -->
          <div v-if="!moment.isForward && getText(moment)" class="text-wrapper" :class="{ loading: loadingMoments.has(moment.momentId) }" @click="goToMomentDetail(moment)">
            <p 
              class="content" 
              @touchstart="handleLongPress($event, moment)"
              @touchend="clearLongPress"
              @touchmove="clearLongPress"
              @contextmenu="showNativeMenu($event, moment)"
            >
              {{ truncateText(getText(moment), 200) }}
            </p>
          </div>
                    <div class="actions" @click.stop>
            <ion-button fill="clear" @click="showMomentDetails(moment.momentId)" class="comment-btn">
              <ion-icon :icon="chatbubblesOutline"></ion-icon>
              <span>{{ getCommentCount(moment.momentId) }}</span>
            </ion-button>
            <ion-button fill="clear" @click="toggleLike(moment.momentId)" class="like-btn">
              <ion-icon :icon="isLiked(moment.momentId) ? heart : heartOutline"></ion-icon>
              <span>{{ getLikeCount(moment.momentId) }}</span>
            </ion-button>
            <ion-button 
              fill="clear" 
              @click="openForwardModal(moment)"
              class="forward-btn"
            >
              <ion-icon :icon="shareOutline"></ion-icon>
              <span>{{ getForwardCount(moment.momentId) }}</span>
            </ion-button>
          </div>
        </div>
      </div>
      <div v-else class="no-moments">
        <ion-icon :icon="chatbubblesOutline" size="large"></ion-icon>
        <p>{{ loading ? 'Loading...' : 'No moments yet' }}</p>
      </div>
      <ion-infinite-scroll @ionInfinite="loadMoreMoments($event)" threshold="100px" :disabled="!hasMore.valueOf">
        <ion-infinite-scroll-content loading-text="Loading..."></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
    
    <!-- 转发弹窗 -->
    <ForwardModal 
      :is-open="forwardModalOpen"
      :moment="selectedMomentForForward"
      @close="closeForwardModal"
      @forward-success="onForwardSuccess"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { 
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonTitle, IonList, 
  IonItem, IonLabel, IonButton, IonIcon, IonAvatar, IonInfiniteScroll, IonInfiniteScrollContent 
} from '@ionic/vue';
import { 
  chatbubbleOutline, heart, heartOutline, chevronDownOutline, chevronUpOutline, chatbubblesOutline, shareOutline 
} from 'ionicons/icons';
import { useMoments } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from "gun-avatar";
import { useTheme } from '@/composables/useTheme';
import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';
import ForwardModal from '@/components/ui/ForwardModal.vue';
import OriginalMomentCard from '@/components/ui/OriginalMomentCard.vue';
import { toastController } from '@ionic/vue';

// 定义 MomentV2 类型
interface MomentV2 {
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  isHidden: number;
  // 转发相关字段
  isForward?: boolean;
  originalMomentId?: string;
  originalAuthor?: string;
  forwardContent?: string;
}

mountClass();
const router = useRouter();
const momentsCore = useMoments();
const { 
  moments, loadMoments, isLiked, getLikeCount, getBuddyAlias, formatTimestamp, addLike, 
  removeLike, momentComments, hasMore, loading, showMomentDetails, forwardMoment, getForwardCount
} = momentsCore;

const chatFlow = getTalkFlowCore();
const { selectedFriendPub, userAvatars,searchUserProfile, buddyList  } = chatFlow;

const isSearching = ref(false);

async function handlePublicKey(content: string) {
  const pub = content.replace('pubkey:', '');
  isSearching.value = true;
  try {
    const userExists = await searchUserProfile(pub);
    if (userExists) {
      const isFriend = buddyList.value.some(b => b.pub === pub);
      if (isFriend) {
        router.push({ path: '/friend-profile', query: { pub } });
      } else {
        router.push({ path: '/stranger-profile', query: { pub } });
      }
    } else {
      // showModal('error', 'No user');
    }
  } catch (err) {
   // showModal('error', 'check you net please');
    // console.error('搜索用户失败:', err);
  } finally {
    isSearching.value = false;
  }
}
const friendPub = ref<string>(selectedFriendPub.value || '');
const friendMoments = ref<MomentV2[]>([]);
// 加载状态管理
const loadingMoments = ref<Set<string>>(new Set());
const { isDark } = useTheme();

// 转发弹窗状态
const forwardModalOpen = ref(false);
const selectedMomentForForward = ref<MomentV2 | null>(null);

let observer: IntersectionObserver | null = null;
let longPressTimer: NodeJS.Timeout | null = null;
const LONG_PRESS_DELAY = 500; // 长按延迟 500ms

onMounted(async () => {
  // console.log('开始加载朋友动态，friendPub:', friendPub.value);
  if (!friendPub.value) {
    // console.error('未选择好友，返回朋友圈');
    router.push('/moments');
    return;
  }
  await loadMoments();
  // console.log('加载后的所有动态:', moments.value);
  updateFriendMoments();
  nextTick(() => setupLazyLoading());
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  clearLongPress();
});

watch([moments, selectedFriendPub], ([newMoments, newFriendPub]) => {
  // console.log('moments 更新:', newMoments);
  // console.log('selectedFriendPub 更新:', newFriendPub);
  friendPub.value = newFriendPub || '';
  updateFriendMoments();
  nextTick(() => setupLazyLoading());
}, { deep: true });

const setupLazyLoading = () => {
  if (observer) {
    observer.disconnect();
  }

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

  const allImages = document.querySelectorAll('img[data-src]');
  allImages.forEach(img => observer?.observe(img));
};

// 长按处理 - 移动端
const handleLongPress = (event: TouchEvent, moment: MomentV2) => {
  longPressTimer = setTimeout(() => {
    showNativeMenu(event, moment);
  }, LONG_PRESS_DELAY);
};

// 清除长按定时器
const clearLongPress = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

// 显示原生上下文菜单
const showNativeMenu = (event: MouseEvent | TouchEvent, moment: MomentV2) => {
  const textElement = event.target as HTMLElement;
  if (textElement && getText(moment)) {
    // 移除不可选限制
    textElement.style.userSelect = 'text';
    textElement.style.webkitUserSelect = 'text';

    // 选中文字
    const range = document.createRange();
    range.selectNodeContents(textElement);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // 触发原生上下文菜单
    textElement.focus();

    // 在 iOS 上模拟长按行为，确保工具栏弹出
    setTimeout(() => {
      textElement.dispatchEvent(new Event('contextmenu'));
    }, 100);
  }
};

const updateFriendMoments = () => {
  if (friendPub.value) {
    friendMoments.value = moments.value.filter(m => m.userPub === friendPub.value);
    // console.log('更新后的朋友动态:', friendMoments.value);
  } else {
    friendMoments.value = [];
    // console.warn('friendPub 未定义，动态清空');
  }
};

const loadMoreMoments = async (event: CustomEvent) => {
  // console.log('触发无限滚动，当前动态数量:', friendMoments.value.length);
  try {
    await loadMoments(10, true);
    updateFriendMoments();
    // console.log('加载更多后的朋友动态:', friendMoments.value);
    (event.target as HTMLIonInfiniteScrollElement).complete();
    nextTick(() => setupLazyLoading());
  } catch (error) {
    // console.error('加载更多动态失败:', error);
    (event.target as HTMLIonInfiniteScrollElement).complete();
  }
};

const isBase64Image = (text: string): boolean => {
  const imageRegex = /^data:image\/(jpeg|png|gif|bmp|webp);base64,/i;
  return imageRegex.test(text);
};

const getImages = (moment: MomentV2) => {
  const parts = moment.content.split('\n');
  const images = parts
    .map((part, index) => {
      if (part === '[IMAGE]' && index + 1 < parts.length && isBase64Image(parts[index + 1])) {
        return parts[index + 1];
      }
      return null;
    })
    .filter(img => img !== null) as string[];
  return images;
};

const getText = (moment: MomentV2) => {
  const parts = moment.content.split('\n');
  return parts.filter(part => part !== '[IMAGE]' && !isBase64Image(part)).join('\n');
};



// 文本截断函数（支持超过200字符的省略）
const truncateText = (content: string, maxLength: number = 200): string => {
  if (!content) return '';
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '... 点击查看全部';
};

// 转发评论内容字数限制（50字）
const truncateForwardContent = (content: string) => {
  if (!content) return '';
  if (content.length <= 50) return content;
  return content.slice(0, 50) + '...';
};

const toggleLike = (momentId: string) => {
  if (isLiked(momentId)) removeLike(momentId);
  else addLike(momentId);
};

const getCommentCount = (momentId: string) => momentComments.value[momentId]?.length || 0;

const getAvatar = (userPub: string): string => {
  return userAvatars.value[userPub] || '';
};

const getAvatarWithFallback = (userPub: string): string => {
  const avatar = getAvatar(userPub);
  return avatar && avatar.trim() !== '' ? avatar : getGunAvatar(userPub);
};

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  } as any);
};

const goToProfile = (userPub: string) => {
  router.push('/FriendMoments');
};

// 进入动态详情页
const goToMomentDetail = async (moment: MomentV2) => {
  // 添加loading状态
  loadingMoments.value.add(moment.momentId);
  
  // 添加短暂延迟以显示动画效果
  setTimeout(() => {
    showMomentDetails(moment.momentId);
    loadingMoments.value.delete(moment.momentId);
  }, 200);
};

// 转发功能
const openForwardModal = (moment: MomentV2) => {
  selectedMomentForForward.value = moment;
  forwardModalOpen.value = true;
};

const closeForwardModal = () => {
  forwardModalOpen.value = false;
  selectedMomentForForward.value = null;
};

const onForwardSuccess = async (data: { momentId: string; content: string }) => {
  // 关闭转发弹窗
  forwardModalOpen.value = false;
  selectedMomentForForward.value = null;
  
  try {
    // 执行转发（forwardMoment现在有乐观更新，会立即显示转发动态）
    forwardMoment(data.momentId, data.content);
    
    // 显示转发成功Toast
    const toast = await toastController.create({
      message: 'Forwarded',
      duration: 2000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
    
  } catch (error: any) {
    // console.error('转发失败:', error);
    const toast = await toastController.create({
      message: 'Forward failed',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};
</script>

<style scoped>

.avatar-glow1 {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* object-fit: cover; */
  /* border-radius: 50%; */
  filter: blur(20px);
  /* transform: scale(1.5); */
  opacity: 0.3;
  overflow: visible;
  /* animation: defaultMorph 6s ease-in-out infinite; */
  /* z-index: 3; */
  pointer-events: none;
}


.cosmic-header {
  --ion-background-color: transparent;
}

.cosmic-toolbar {
  --background: transparent;
  --border-width: 0;
  --padding-top: 0px;
  --padding-bottom: 0px;
}

.cosmic-title {
  font-size: 1.2em;
  font-weight: 700;
}

.cosmic-content {
  overflow-y: auto;
}

.profile-header {
  display: flex;
  align-items: center;

  gap: 16px;
  padding: 20px 16px;
  flex-direction: column;

}

.profile-avatar {
  width: 80px;
  height: 80px;
  overflow: hidden;
  flex-shrink: 0;
}

.profile-info {
  /* flex: 1; */
  text-align: center;
}

.profile-info h1 {
  font-size: 1.6em;
  font-weight: 700;
  margin: 0 0 4px;
  text-align: center;
}

.user-pub {
  font-size: 0.9em;
  color: #8795a1;
  margin: 0;
  text-align: center;
}

.moments-container {
  padding: 0;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.moment-item {
  width: 100%;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-step-150, #e0e0e0);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
}



.moment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 0 8px 0;
  position: relative;
  z-index: 2;
}

.avatar {
  width: 39px;
  height: 39px;
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
  color: #8795a1;
  font-size: 0.85em;
  margin: 2px 0 0;
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

.moment-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.moment-image:hover {
  transform: scale(1.05);
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
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  position: relative;
}

.text-wrapper:active {
  background-color: var(--ion-color-step-100, #f0f0f0);
  transform: scale(0.98);
}

.text-wrapper.loading {
  opacity: 0.7;
  pointer-events: none;
}

.text-wrapper.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 12px;
  width: 16px;
  height: 16px;
  border: 2px solid var(--ion-color-primary);
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.forward-content-wrapper {
  padding: 8px 16px 12px;
}

.forward-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 1.3em;
  line-height: 1.6;
  margin: 0;
  color: var(--ion-text-color);
  font-weight: 500;
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 1.3em;
  line-height: 1.6;
  margin: 0;
  -webkit-user-select: none; /* 默认不可选 */
  user-select: none;
  -webkit-touch-callout: none; /* 禁用 iOS 默认长按呼出 */
}

.content.selectable-text {
  -webkit-user-select: text; /* 长按后可选择 */
  user-select: text;
  -webkit-touch-callout: default; /* 启用 iOS 原生呼出 */
}



.actions {
  display: flex;
  gap: 8px;
  padding: 8px 0 0;
  justify-content: flex-end;
  border-top: 1px solid var(--ion-color-step-100, #f0f0f0);
  margin-top: 12px;
  position: relative;
  z-index: 2;
}

.actions ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
  --border-radius: 20px;
  color: #767676;
  transition: all 0.2s ease;
  height: 32px;
  font-size: 0.85em;
}

.actions ion-button:hover {
  transform: scale(1.05);
}

.actions ion-button span {
  margin-left: 4px;
  font-size: 0.9em;
}



/* 点赞按钮样式 */
.like-btn {
  --color: var(--ion-color-danger);
}

/* 转发按钮样式 */
.forward-btn {
  --color: var(--ion-color-success);
}

.no-moments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: #8795a1;
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

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .moment-item {
    background: var(--ion-color-step-50, #2a2a2a);
    border-color: var(--ion-color-step-200, #404040);
  }
  
  .text-wrapper:active {
    background-color: var(--ion-color-step-200, #333);
  }
  
  .actions {
    border-top-color: var(--ion-color-step-200, #404040);
  }
}
</style>