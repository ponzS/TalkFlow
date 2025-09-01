<template>
  <ion-content :fullscreen="true">
    <ion-toolbar class="liquid-toolbar" style="--background: var(--ion-background-color);">
      <div style="filter: blur(10px);width: 100px;height:390px;overflow:visible;">
        <ponzsColor2></ponzsColor2>
      </div>
      <div>
        <img
          @click="goToMyNode"
          v-if="userAvatars[currentUserPub!]"
          :src="userAvatars[currentUserPub!]"
          alt=""
          class="avatar-img"
          style="width:39px; height: 39px; object-fit: cover;border-radius: 50%;margin: 50% 0;z-index: 9999;position: absolute;bottom:20px;left: 20px;"
        />
        <object
          v-else
          @click="goToMyNode"
          style="width:39px; height: 39px; object-fit: cover;border-radius: 50%;z-index: 9999;position: absolute;bottom:20px;left: 20px;"
          type="image/svg+xml"
          :key="currentUserPub!"
          :data="
            gunAvatar({
              pub: currentUserPub,
              round: false,
              dark: isDark,
              p3: true,
              reflect: 'true'
            })
          "
        ></object>
      </div>
      <ion-buttons style="z-index: 9999;position: absolute;bottom:10px;right: 70px;font-size: 30px;">
        <div slot="end" @click="goToMyNode">
          <ion-icon slot="end" color="dark" :icon="personCircleOutline"></ion-icon>
        </div>
      </ion-buttons>
      <ion-buttons style="z-index: 9999;position: absolute;bottom:10px;right: 20px;font-size: 30px;">
        <div slot="end" @click="router.push('/PostMoment')">
          <ion-icon slot="end" color="dark" :icon="createOutline"></ion-icon>
        </div>
      </ion-buttons>
    </ion-toolbar>
    <div style="height: 10px;"></div>
    <ion-refresher slot="fixed" @ionRefresh="refreshMoments($event)">
      <ion-refresher-content></ion-refresher-content>
    </ion-refresher>
    <div class="moments-container" v-if="moments.length > 0" style="--background: var(--ion-background-color);">
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
        <div class="content-wrapper">
          <div v-if="getText(moment)" class="text-wrapper">
            <p
              class="content native-selectable"
              :class="{ 'collapsed': isCollapsed(moment) }"
              @touchstart="handleLongPress($event, moment)"
              @touchend="clearLongPress"
              @touchmove="clearLongPress"
              @contextmenu.prevent="showContextMenu($event, moment)"
            >
              {{ isCollapsed(moment) ? truncateContent(getText(moment)) : getText(moment) }}
            </p>
            <ion-button v-if="isLongContent(moment)" fill="clear" size="small" class="expand-btn" @click="toggleContent(moment.momentId)">
              <ion-icon :icon="collapsed[moment.momentId] ? chevronDownOutline : chevronUpOutline"></ion-icon>
            </ion-button>
          </div>
          <carousel
            v-if="getImages(moment).length > 0"
            :items-to-show="1"
            :wrap-around="true"
            :transition="500"
            class="image-carousel"
          >
            <slide v-for="(img, index) in getImages(moment)" :key="index">
              <img :src="img" class="moment-image" alt="" />
            </slide>
            <template #addons>
              <navigation v-if="getImages(moment).length > 1" />
              <pagination />
            </template>
          </carousel>
          <div class="actions">
            <ion-button fill="clear" @click="toggleLike(moment.momentId)">
              <ion-icon :icon="isLiked(moment.momentId) ? heart : heartOutline"></ion-icon>
              <span>{{ getLikeCount(moment.momentId) }}</span>
            </ion-button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-moments" style="--background: var(--ion-background-color);">
      <ion-icon :icon="chatbubblesOutline" size="large"></ion-icon>
      <p>{{ loading ? 'Loading...' : 'No moments yet' }}</p>
    </div>
    <ion-infinite-scroll @ionInfinite="loadMore($event)" threshold="100px" :disabled="!hasMore.valueOf">
      <ion-infinite-scroll-content loading-text="Loading..."></ion-infinite-scroll-content>
    </ion-infinite-scroll>


  </ion-content>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonContent, IonToolbar, IonButtons, IonButton, IonIcon, IonAvatar, IonRefresher, IonRefresherContent,
  IonInfiniteScroll, IonInfiniteScrollContent
} from '@ionic/vue';
import {
  chatbubblesOutline, heart, heartOutline, createOutline, chevronDownOutline,
  chevronUpOutline, personCircleOutline, copyOutline
} from 'ionicons/icons';
import { useMoments } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';

function goToMyNode() { router.push('/MyMoments') }

interface MomentV2 {
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  isHidden: number;
}

mountClass();
const router = useRouter();
const momentsCore = useMoments();
const {
  moments, loadMoments, isLiked, getLikeCount, getBuddyAlias, formatTimestamp, addLike,
  removeLike, momentComments, hasMore, loading, lastTimestamp
} = momentsCore;

const chatFlow = getTalkFlowCore();
const { currentUserPub, userAvatars, setSelectedFriendPub, showToast } = chatFlow;
const { isDark } = useTheme();

const collapsed = ref<Record<string, boolean>>({});
let longPressTimer: NodeJS.Timeout | null = null;
const LONG_PRESS_DELAY = 500;

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
    showToast('已复制', 'success');
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
  console.log('开始 refreshMoments');
  try {
    moments.value = [];
    lastTimestamp.value = undefined;
    hasMore.value = true;
    await loadMoments();
    console.log('刷新后的 moments:', moments.value);
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
  padding: 0 5px;
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
</style>