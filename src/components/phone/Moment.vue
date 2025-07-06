<template>
 
   
   
  <!-- <div class="relative h-96 w-full" >
    <BlackHoleBackground class="absolute inset-0 flex items-center justify-center rounded-xl " />
    <ion-buttons style="z-index: 9999;position: absolute;bottom:10px;right: 20px;font-size: 30px;">
        <div slot="end" @click="goToMyNode">
          <ion-icon slot="end"  :icon="personCircleOutline" style="color:#fff"></ion-icon>
        </div>
      </ion-buttons>
  </div> -->



  <ion-content  >
    <div class="relative grid h-[500px] place-content-center overflow-hidden">
    <p
      class="z-10 whitespace-pre-wrap text-center text-5xl font-medium tracking-tighter text-black "
    style="color:var(--ion-text-color)"
      >
      Decentralized Network
    </p>

    <InteractiveGridPattern
      :class="[
        '[mask-image:radial-gradient(350px_circle_at_center,white,transparent)]',
        'inset-0 h-[200%] skew-y-12',
      ]"
    />
    <ion-buttons style="z-index: 9999;position: absolute;bottom:10px;right: 20px;font-size: 30px;">
        <div slot="end" @click="goToMyNode">
          <ion-icon slot="end"  :icon="personCircleOutline" style="color:var(--ion-text-color)"></ion-icon>
        </div>
      </ion-buttons>
  </div>
    <ion-refresher slot="fixed" @ionRefresh="refreshMoments($event)">
      <ion-refresher-content></ion-refresher-content>
    </ion-refresher>
    
    <!-- 通知胶囊 -->
    <NotificationBadge />
    
    <div class="moments-container" v-if="moments.length > 0" >
      <div v-for="moment in moments" :key="moment.momentId" class="moment-card">
        <div class="moment-header">
          <ion-avatar class="avatar" @click="goToProfile(moment.userPub)">
            <img :src="getAvatar(moment.userPub) || getGunAvatar(moment.userPub)" alt="" class="avatar-img" />
          </ion-avatar>
          <div class="header-info">
            <h2 class="clickable-name" @click="goToProfile(moment.userPub)">
              {{ getBuddyAlias(moment.userPub) }}
            </h2>
            <p class="timestamp">{{ formatTimestamp(moment.timestamp) }}</p>
          </div>
        </div>
        <div class="content-wrapper" :class="{ loading: loadingMoments.has(moment.momentId) }" @click="goToMomentDetail(moment)">
          <!-- 转发动态的转发内容 -->
          <div v-if="moment.isForward && moment.forwardContent" class="forward-content-wrapper">
            <p class="forward-content">{{ truncateForwardContent(moment.forwardContent) }}</p>
          </div>
          
          <!-- 原动态内容（非转发）或转发动态的原始内容 -->
          <div v-if="!moment.isForward && getText(moment)" class="text-wrapper">
            <p
              class="content native-selectable"
              @touchstart="handleLongPress($event, moment)"
              @touchend="clearLongPress"
              @touchmove="clearLongPress"
              @contextmenu.prevent="showContextMenu($event, moment)"
            >
              {{ truncateText(getText(moment), 200) }}
            </p>
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
            @click.stop
          >
            <slide v-for="(img, index) in getImages(moment)" :key="index">
              <img :src="img" class="moment-image" alt="" @click.stop />
            </slide>
            <template #addons>
              <navigation v-if="getImages(moment).length > 1" />
              <pagination />
            </template>
          </carousel>
        </div>
        <div class="actions" @click.stop>
          <ion-button fill="clear" @click="openQuickComment(moment)" class="comment-btn">
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
            <span>{{ moment.isForward ? getOriginalForwardCount(moment) : getForwardCount(moment.momentId) }}</span>
          </ion-button>
        </div>
      </div>
    </div>
    <div v-else class="no-moments" >

      <ion-spinner name="crescent"></ion-spinner>
      <p>{{ loading ? t('loading') : t('pullToRefresh') }}</p>
    </div>
    <ion-infinite-scroll @ionInfinite="loadMore($event)" threshold="100px" :disabled="!hasMore.valueOf">
      <ion-infinite-scroll-content :loading-text="t('loadingMore')"></ion-infinite-scroll-content>
    </ion-infinite-scroll>
  </ion-content>
  
  <!-- 转发弹窗 -->
  <ForwardModal 
    :is-open="forwardModalOpen"
    :moment="selectedMomentForForward"
    @close="closeForwardModal"
    @forward-success="onForwardSuccess"
  />
  
  <!-- 快捷评论弹窗 -->
  <QuickCommentModal 
    :is-open="quickCommentModalOpen"
    :moment="selectedMomentForComment"
    @close="closeQuickComment"
    @comment-success="onCommentSuccess"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  IonContent, IonToolbar, IonButtons, IonButton, IonIcon, IonAvatar, IonRefresher, IonRefresherContent,
  IonInfiniteScroll, IonInfiniteScrollContent, toastController
} from '@ionic/vue';
import {
  chatbubblesOutline, heart, heartOutline, createOutline, chevronDownOutline,
  chevronUpOutline, personCircleOutline, copyOutline, shareOutline
} from 'ionicons/icons';
import { useMoments } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';
import ForwardModal from '@/components/ui/ForwardModal.vue';
import OriginalMomentCard from '@/components/ui/OriginalMomentCard.vue';
import QuickCommentModal from '@/components/ui/QuickCommentModal.vue';
import NotificationBadge from '@/components/ui/NotificationBadge.vue';
import useNotifications from '@/composables/useNotifications';

function goToMyNode() { router.push('/MyMoments') }

interface MomentV2 {
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  isHidden: number;
  isForward?: boolean;
  originalMomentId?: string;
  originalAuthor?: string;
  forwardContent?: string;
}

mountClass();
const router = useRouter();
const { t } = useI18n();
const momentsCore = useMoments();
const {
  moments, loadMoments, isLiked, getLikeCount, getBuddyAlias, formatTimestamp, addLike,
  removeLike, momentComments, hasMore, loading, lastTimestamp, getComments, showMomentDetails,
  getForwardCount, isForwarded, forwardMoment
} = momentsCore;

const chatFlow = getTalkFlowCore();
const { currentUserPub, userAvatars, setSelectedFriendPub, showToast } = chatFlow;
const { isDark } = useTheme();

// 初始化通知系统
const { loadNotifications, listenForNotifications } = useNotifications();

let longPressTimer: NodeJS.Timeout | null = null;
const LONG_PRESS_DELAY = 500;

// 转发弹窗状态
const forwardModalOpen = ref(false);
const selectedMomentForForward = ref<MomentV2 | null>(null);

// 快捷评论弹窗状态
const quickCommentModalOpen = ref(false);
const selectedMomentForComment = ref<MomentV2 | null>(null);

// 加载状态管理
const loadingMoments = ref<Set<string>>(new Set());

const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  content: string;
}>({
  visible: false,
  x: 0,
  y: 0,
  content: ''
});

onMounted(async () => {
  if (!moments.value.length) {
    try {
      await loadMoments();
    } catch (error) {
      console.error('加载动态失败:', error);
    }
  }
  
  // 重新启用通知系统初始化（循环依赖问题已修复）
  try {
    await loadNotifications();
    listenForNotifications();
    console.log('通知系统初始化成功');
  } catch (error) {
    console.error('初始化通知系统失败:', error);
  }
});

onUnmounted(() => {

  clearLongPress();
});



const handleLongPress = (event: TouchEvent, moment: MomentV2) => {
  clearLongPress();
  longPressTimer = setTimeout(() => {
    const text = getText(moment);
    if (text) {
      showContextMenu(event, moment);
    }
  }, LONG_PRESS_DELAY);
};

const clearLongPress = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

const showContextMenu = (event: TouchEvent | MouseEvent, moment: MomentV2) => {
  const textElement = event.target as Element;
  if (textElement instanceof HTMLElement && getText(moment)) {
    const rect = textElement.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    contextMenu.value = {
      visible: true,
      x: clientX,
      y: clientY - 50,
      content: getText(moment)
    };
  }
};

const hideContextMenu = () => {
  contextMenu.value.visible = false;
};

const copyText = (content: string) => {
  navigator.clipboard.writeText(content).then(() => {
    showToast(t('copied'), 'success');
    hideContextMenu();
  });
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
  const text = parts.filter(part => part !== '[IMAGE]' && !isBase64Image(part)).join('\n');
  return text;
};

const refreshMoments = async (event: CustomEvent) => {
 // console.log('开始 refreshMoments');
  try {
    moments.value = [];
    lastTimestamp.value = undefined;
    hasMore.value = true;
    await loadMoments();
   // console.log('刷新后的 moments:', moments.value);
    await event.detail.complete();
  } catch (error) {
    console.error('刷新动态失败:', error);
    await event.detail.complete();
  }
};

const loadMore = async (event: CustomEvent) => {
  if (!hasMore.value) {
    (event.target as HTMLIonInfiniteScrollElement).complete();
    return;
  }
  try {
    await loadMoments(10, true);
    (event.target as HTMLIonInfiniteScrollElement).complete();
  } catch (error) {
    console.error('加载更多动态失败:', error);
    (event.target as HTMLIonInfiniteScrollElement).complete();
  }
};



// 转发评论内容字数限制（50字）
const truncateForwardContent = (content: string) => {
  if (!content) return '';
  if (content.length <= 50) return content;
  return content.slice(0, 50) + '...';
};

// 文本截断函数（支持超过200字符的省略）
const truncateText = (content: string, maxLength: number = 200): string => {
  if (!content) return '';
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '... ' + (t('clickToViewAll') || '点击查看全部');
};

const toggleLike = (momentId: string) => {
  if (isLiked(momentId)) removeLike(momentId);
  else addLike(momentId);
};

const getCommentCount = (momentId: string) => momentComments.value[momentId]?.length || 0;

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
      message: t('forwarded'),
      duration: 2000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
    
  } catch (error: any) {
    console.error('转发失败:', error);
    showToast(t('forwardFailed'), 'error');
  }
};

// 触发下拉刷新（与IndexPage.vue中的triggerRefresh完全一致）
const triggerRefresh = () => {
  // 模拟 ionRefresh 事件，调用当前组件的refreshMoments
  const mockEvent = { detail: { complete: () => {} } } as CustomEvent;
  refreshMoments(mockEvent);
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

// 快捷评论功能
const openQuickComment = (moment: MomentV2) => {
  selectedMomentForComment.value = moment;
  quickCommentModalOpen.value = true;
};

const closeQuickComment = () => {
  quickCommentModalOpen.value = false;
  selectedMomentForComment.value = null;
};

const onCommentSuccess = () => {
  // 评论成功后的处理（如果需要刷新或其他操作）
  // 目前由于评论组件内部已经处理了更新，这里暂时不需要额外操作
};

// 获取原动态转发数量（用于转发动态）
const getOriginalForwardCount = (moment: MomentV2): number => {
  if (!moment.isForward || !moment.originalMomentId) return 0;
  return getForwardCount(moment.originalMomentId);
};



const getAvatar = (userPub: string): string => {
  return userAvatars.value[userPub] || getGunAvatar1(userPub);
};

const goToProfile = (userPub: string) => {
  if (userPub === currentUserPub.value) {
    router.push('/MyMoments');
  } else {
    setSelectedFriendPub(userPub);
    router.push('/FriendMoments');
  }
};

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  });
};

const getGunAvatar1 = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 500,
    dark: isDark.value,
    svg: true
  });
};

defineExpose({
  refreshMoments,
});
</script>

<style scoped>

.moments-container {
  padding: 16px 0;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.moment-card {
  border-radius: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-step-150, #e0e0e0);
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

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.avatar-img:not([src]) {
  opacity: 0.5;
  background: #f0f0f0;
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
  margin: 8px 0 0 0;
  padding-left: 50px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  padding: 8px 8px 8px 50px;
  margin: 0;
  position: relative;
}

.content-wrapper:active {
  background-color: var(--ion-color-step-100, #f0f0f0);
  transform: scale(0.98);
}

.content-wrapper.loading {
  opacity: 0.7;
  pointer-events: none;
}

.content-wrapper.loading::after {
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
  transition: opacity 0.3s ease;
}

.moment-image:not([src]) {
  opacity: 0.5;
  background: #f0f0f0;
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
  padding: 8px 0;
}

.forward-content-wrapper {
  padding: 8px 0 12px;
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
  text-shadow: 0 0 5px rgba(224, 224, 255, 0.3);
}

.native-selectable {
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
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
  color: #767676;
}

.no-moments ion-icon {
  margin-bottom: 12px;
}

.context-menu {
  position: fixed;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
  display: flex;
  flex-direction: row;
  padding: 5px;
  gap: 8px;
  height: 40px;
  align-items: center;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
  transform: scale(1);
  opacity: 1;
}

.context-button {
  --padding-start: 10px;
  --padding-end: 10px;
  height: 30px;
  transition: transform 0.2s ease, background 0.2s ease;
}

.context-button:hover {
  transform: scale(1.1);
  background: rgba(0, 205, 137, 0.2);
}

.context-button ion-icon {
  font-size: 20px;
  color: #333;
}

/* 转发成功Toast样式 */
:deep(.forward-success-toast) {
  --border-radius: 12px;
  --font-size: 16px;
  --font-weight: 600;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .moment-card {
    background: var(--ion-color-step-50, #2a2a2a);
    border-color: var(--ion-color-step-200, #404040);
  }
  
  .content-wrapper:active {
    background-color: var(--ion-color-step-200, #333);
  }
  
  .actions {
    border-top-color: var(--ion-color-step-200, #404040);
  }
}
</style>