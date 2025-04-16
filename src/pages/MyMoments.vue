<template>
  <ion-page>
    <ion-header class="cosmic-header">
      <ion-toolbar class="cosmic-toolbar">
        <ion-buttons slot="start">
          <ion-back-button @click="router.go(-1)" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title class="cosmic-title">
          <img style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;" :data-src="getAvatarWithFallback(currentUserPub || '')" alt="Avatar" />
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="cosmic-content">
      <ion-header class="cosmic-header" collapse="condense">
        <ion-toolbar class="cosmic-toolbar">
          <div class="profile-header">
            <div class="profile-info">
              <h1>{{ getBuddyAlias(currentUserPub || 'Loading...') }}</h1>
              <p v-if="currentUserPub" class="user-pub">@{{ currentUserPub.slice(0, 8) + '...' }}</p>
              <p v-else>Null</p>
            </div>
            <ion-avatar class="profile-avatar" @click="goToProfile(currentUserPub || '')">
              <img :data-src="getAvatarWithFallback(currentUserPub || '')" alt="Avatar" />
            </ion-avatar>
          </div>
        </ion-toolbar>
      </ion-header>

      <div class="moments-container" v-if="userMoments.length > 0">
        <div v-for="moment in userMoments" :key="moment.momentId" class="moment-item">
          <div class="moment-header">
            <ion-avatar class="avatar" @click="goToProfile(moment.userPub)">
              <img :data-src="getAvatarWithFallback(moment.userPub)" alt="Avatar" />
            </ion-avatar>
            <div class="header-info">
              <h2 class="clickable-name" @click="goToProfile(moment.userPub)">
                {{ getBuddyAlias(moment.userPub) }}
              </h2>
              <p class="timestamp">{{ formatTimestamp(moment.timestamp) }}</p>
            </div>
          </div>
          <carousel
            v-if="getImages(moment).length > 0"
            :items-to-show="1"
            :wrap-around="true"
            :transition="500"
            class="image-carousel"
          >
            <slide v-for="(img, index) in getImages(moment)" :key="index">
              <img :data-src="img" class="moment-image" alt="Moment Image" />
            </slide>
            <template #addons>
              <navigation v-if="getImages(moment).length > 1" />
              <pagination />
            </template>
          </carousel>
          <div v-if="getText(moment)" class="text-wrapper">
            <p 
              class="content" 
              :class="{ 'collapsed': isCollapsed(moment) }"
              @touchstart="handleLongPress($event, moment)"
              @touchend="clearLongPress"
              @touchmove="clearLongPress"
              @contextmenu="showNativeMenu($event, moment)"
            >
              {{ isCollapsed(moment) ? truncateContent(getText(moment)) : getText(moment) }}
            </p>
            <ion-button v-if="isLongContent(moment)" fill="clear" size="small" class="expand-btn" @click="toggleContent(moment.momentId)">
              <ion-icon :icon="collapsed[moment.momentId] ? chevronDownOutline : chevronUpOutline"></ion-icon>
            </ion-button>
          </div>
          <div class="actions">
            <ion-button fill="clear" @click="toggleLike(moment.momentId)">
              <ion-icon :icon="isLiked(moment.momentId) ? heart : heartOutline"></ion-icon>
              <span>{{ getLikeCount(moment.momentId) }}</span>
            </ion-button>
            <ion-button fill="clear" @click="toggleMomentVisibility(moment.momentId, !moment.isHidden)">
              <ion-icon :icon="moment.isHidden ? eyeOutline : eyeOffOutline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" color="danger" @click="deleteMoment(moment.momentId)">
              <ion-icon :icon="trashOutline"></ion-icon>
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
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { 
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonTitle, IonList, 
  IonItem, IonLabel, IonButton, IonIcon, IonAvatar, IonRefresher, IonRefresherContent, 
  IonInfiniteScroll, IonInfiniteScrollContent 
} from '@ionic/vue';
import { 
  chatbubbleOutline, heart, heartOutline, trashOutline, eyeOutline, eyeOffOutline, 
  chevronDownOutline, chevronUpOutline, chatbubblesOutline, createOutline 
} from 'ionicons/icons';
import { useMoments } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from "gun-avatar";
import { useTheme } from '@/composables/useTheme';
import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';

const { isDark } = useTheme();

// 定义 MomentV2 类型
interface MomentV2 {
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  isHidden: number;
}

mountClass();
const router = useRouter();
const chatFlow = getTalkFlowCore();
const { currentUserPub, userAvatars, setSelectedFriendPub } = chatFlow;
const momentsCore = useMoments();
const { 
  moments, loadMoments, isLiked, getLikeCount, getBuddyAlias, formatTimestamp, addLike, 
  removeLike, momentComments, toggleMomentVisibility, deleteMoment, hasMore, loading 
} = momentsCore;

const userMoments = ref<MomentV2[]>([]);
const collapsed = ref<Record<string, boolean>>({});

let observer: IntersectionObserver | null = null;
let longPressTimer: NodeJS.Timeout | null = null;
const LONG_PRESS_DELAY = 500; // 长按延迟 500ms

onMounted(async () => {
  console.log('开始加载个人动态，当前用户:', currentUserPub.value);
  await loadMoments();
  console.log('加载后的所有动态:', moments.value);
  updateUserMoments();
  nextTick(() => setupLazyLoading());
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  clearLongPress();
});

watch(moments, () => {
  console.log('moments 更新:', moments.value);
  updateUserMoments();
  nextTick(() => setupLazyLoading());
});

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

const updateUserMoments = () => {
  if (currentUserPub.value) {
    userMoments.value = moments.value.filter(m => m.userPub === currentUserPub.value);
    console.log('更新后的用户动态:', userMoments.value);
  } else {
    console.warn('当前用户未定义，无法加载动态');
    userMoments.value = [];
  }
};

const loadMoreMoments = async (event: CustomEvent) => {
  try {
    await loadMoments(10, true);
    console.log('加载更多动态:', moments.value);
    (event.target as HTMLIonInfiniteScrollElement).complete();
    nextTick(() => setupLazyLoading());
  } catch (error) {
    console.error('加载更多动态失败:', error);
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

const isLongContent = (moment: MomentV2) => getText(moment).length > 120;
const isCollapsed = (moment: MomentV2) => isLongContent(moment) && collapsed.value[moment.momentId] !== false;
const toggleContent = (momentId: string) => {
  collapsed.value[momentId] = !collapsed.value[momentId];
};

const truncateContent = (content: string) => {
  if (content.length <= 120) return content;
  return content.slice(0, 120) + '...';
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
    dark: isDark.value
  });
};

const goToProfile = (userPub: string) => {
  if (userPub === currentUserPub.value) {
    router.push('/MyMoments');
  } else {
    setSelectedFriendPub(userPub);
    router.push('/FriendMoments');
  }
};
</script>

<style scoped>
/* 宇宙美学设计 - 移动端优化 */
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
}

.profile-avatar {
  width: 80px;
  height: 80px;
  overflow: hidden;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
}

.profile-info h1 {
  font-size: 1.6em;
  font-weight: 700;
  margin: 0 0 4px;
}

.user-pub {
  font-size: 0.9em;
  color: #8795a1;
  margin: 0;
}

.moments-container {
  padding: 0;
}

.moment-item {
  width: 100%;
  margin-bottom: 16px;
}

.moment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 1px;
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
  text-shadow: 0 0 5px rgba(224, 224, 255, 0.5);
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
  background: #e0e0ff;
  opacity: 0.8;
  border-radius: 50%;
  margin: 0 4px;
  box-shadow: 0 0 5px rgba(224, 224, 255, 0.5);
}

:deep(.carousel__pagination-button--active) {
  background: #00ffbb;
  opacity: 1;
  box-shadow: 0 0 10px rgba(0, 255, 187, 0.8);
}

:deep(.carousel__prev),
:deep(.carousel__next) {
  color: #e0e0ff;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  top: 50%;
  transform: translateY(-50%);
  box-shadow: 0 0 10px rgba(224, 224, 255, 0.3);
}

:deep(.carousel__prev) {
  left: 10px;
}

:deep(.carousel__next) {
  right: 10px;
}

.text-wrapper {
  padding: 8px 16px;
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 1.3em;
  line-height: 1.6;
  margin: 0;
  text-shadow: 0 0 5px rgba(224, 224, 255, 0.3);
  -webkit-user-select: none; /* 默认不可选 */
  user-select: none;
  -webkit-touch-callout: none; /* 禁用 iOS 默认长按呼出 */
}

.content.selectable-text {
  -webkit-user-select: text; /* 长按后可选择 */
  user-select: text;
  -webkit-touch-callout: default; /* 启用 iOS 原生呼出 */
}

.collapsed {
  max-height: 3.2em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.expand-btn {
  --padding-start: 6px;
  --padding-end: 6px;
  color: #00ffbb;
  margin: 0;
  --background-activated: rgba(0, 255, 187, 0.2);
  text-shadow: 0 0 5px rgba(0, 255, 187, 0.5);
}

.actions {
  display: flex;
  gap: 20px;
  padding: 8px 16px;
}

.actions ion-button {
  --padding-start: 6px;
  --padding-end: 6px;
  color: #767676;
  text-shadow: 0 0 5px rgba(224, 224, 255, 0.3);
}

.actions ion-button span {
  margin-left: 4px;
  font-size: 0.9em;
}

.no-moments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: #8795a1;
  text-shadow: 0 0 5px rgba(135, 149, 161, 0.3);
}

.no-moments ion-icon {
  margin-bottom: 12px;
  color: #e0e0ff;
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