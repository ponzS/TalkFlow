<template>
  <!-- 顶部工具栏 -->
  <!-- <ion-header :translucent="true" >
   
  </ion-header> -->
   <!-- <ion-toolbar class="large-screen-content">
      <ion-buttons slot="start">
        <ion-button @click="goToMyNode" fill="clear">
          <ion-icon :icon="personCircleOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
      

      <ion-buttons slot="end">
      
        <ion-button @click="openPostModal" fill="clear">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar> -->

  <ion-content :fullscreen="true">

 
    <ion-refresher slot="fixed" @ionRefresh="refreshMoments($event)">
      <ion-refresher-content></ion-refresher-content>
    </ion-refresher>
    
    <!-- 通知胶囊 -->
    <NotificationBadge />
    

       <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
           Friend Feed
            </h1>
          </ion-toolbar>
        </ion-header>
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
        <!-- @click="goToMomentDetail(moment)" -->
        <div class="content-wrapper" :class="{ loading: loadingMoments.has(moment.momentId) }" >
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
              {{ getDisplayText(moment) }}
            </p>
            <!-- 展开/收起按钮 -->
            <span 
              v-if="shouldShowToggleButton(moment)"
              class="toggle-text"
              @click.stop="toggleTextExpansion(moment.momentId)"
            >
              {{ expandedMoments.has(moment.momentId) ? t('Hide') || 'Hide' : t('View All') || 'View all' }}
            </span>
          </div>
          
          <!-- 转发动态的原动态卡片 -->
          <OriginalMomentCard 
            v-if="moment.isForward && moment.originalMomentId && moment.originalAuthor"
            :original-moment-id="moment.originalMomentId"
            :original-author="moment.originalAuthor"
            @click.stop
          />
          <!-- 非转发动态的图片九宫格 -->
          <ImageGridViewer
            v-if="!moment.isForward && getImages(moment).length > 0"
            :images="getImages(moment)"
            @click.stop
          />
          
          <!-- 非转发动态的视频播放器 -->
          <div v-if="!moment.isForward && getVideos(moment).length > 0" class="video-container">
            <HlsVideoPlayer
              v-for="(video, index) in getVideos(moment)"
              :key="`video-${moment.momentId}-${index}`"
              :base64-video="video"
              :msg-id="`${moment.momentId}-${index}`"
              :max-width="300"
              :max-height="300"
              @loaded="onVideoLoaded"
              @error="onVideoError"
              @play="onVideoPlay"
              @pause="onVideoPause"
              class="moment-video"
            />
          </div>
        </div>
        <div class="actions" @click.stop>
          <ion-button fill="clear" @click="openCommentModal(moment)" class="comment-btn">
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
         <div style="height: 100px;"></div>
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
  
  <!-- 评论模态窗口 -->
  <CommentModal 
    :is-open="commentModalOpen"
    :moment="selectedMomentForCommentModal"
    @close="closeCommentModal"
  />
  
  <!-- 快捷评论弹窗 -->
  <!-- <QuickCommentModal 
    :is-open="quickCommentModalOpen"
    :moment="selectedMomentForComment"
    @close="closeQuickComment"
    @comment-success="onCommentSuccess"
  /> -->
  


  <!-- 发送动态模态窗口 -->
  <ion-modal :is-open="isPostModalOpen" @didDismiss="closePostModal">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closePostModal">{{ $t('Cancel') || 'Cancel' }}</ion-button>
        </ion-buttons>
        
        <ion-title>Post</ion-title>
     
        <ion-buttons slot="end">
          <ion-button 
            :disabled="!newMomentContent.trim() && selectedImages.length === 0 && selectedVideos.length === 0 || isPosting" 
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
          v-model="newMomentContent"
          auto-grow
          :placeholder="$t('Say something...')"
          class="moment-textarea"
          :rows="3"
          :disabled="isPosting"
        ></ion-textarea>
        <p class="char-count" :class="{ 'over-limit': newMomentContent.length > 10000 }">
          {{ newMomentContent.length }}/10000
        </p>
      </div>
      
      <ImageGridViewer
        v-if="selectedImages.length > 0"
        :images="selectedImages"
        :show-remove-button="true"
        @remove-image="removeImage"
        class="post-image-grid"
      />
      
      <!-- 视频预览 -->
      <div v-if="selectedVideos.length > 0" class="video-preview-container">
        <HlsVideoPlayer
          v-for="(video, index) in selectedVideos"
          :key="`preview-video-${index}`"
          :base64-video="video"
          :msg-id="`preview-${index}`"
          :max-width="300"
          :max-height="300"
          @loaded="onVideoLoaded"
          @error="onVideoError"
          @play="onVideoPlay"
          @pause="onVideoPause"
          class="preview-video"
        />
        <ion-button 
          v-for="(video, index) in selectedVideos"
          :key="`remove-video-${index}`"
          fill="clear" 
          size="small" 
          @click="removeVideo(index)"
          class="remove-video-btn"
        >
          <ion-icon :icon="closeOutline"></ion-icon>
        </ion-button>
      </div>
      
      <ion-button   fill="clear"  class="image-select-btn" @click="selectImages" :disabled="isPosting">
        <ion-icon :icon="imageOutline" slot="start"></ion-icon>
        <!-- {{ $t('Add Images') || 'Add Images' }} -->
      </ion-button>
      
      <ion-button   fill="clear"  class="video-select-btn" @click="selectVideos" :disabled="isPosting">
        <ion-icon :icon="videocamOutline" slot="start"></ion-icon>
        <!-- {{ $t('Add Videos') || 'Add Videos' }} -->
      </ion-button>
      
      <input type="file" ref="fileInput" multiple accept="image/*" @change="handleImageSelect" style="display: none;" />
      <input type="file" ref="videoFileInput" multiple accept="video/*" @change="handleVideoSelect" style="display: none;" />
      
      <!-- <ion-loading
        :is-open="isPosting"
        :message="$t('postingMoment')"
        :duration="0"
      ></ion-loading> -->
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  IonContent, IonToolbar, IonButtons, IonButton, IonIcon, IonAvatar, IonRefresher, IonRefresherContent,
  IonInfiniteScroll, IonInfiniteScrollContent, toastController, IonHeader, IonTitle, IonModal,
  IonTextarea, IonLoading
} from '@ionic/vue';
import {
  chatbubblesOutline, heart, heartOutline, createOutline, chevronDownOutline,
  chevronUpOutline, personCircleOutline, copyOutline, shareOutline, addOutline,
  sendOutline, closeOutline, imageOutline, settingsOutline, videocamOutline
} from 'ionicons/icons';
import { useMoments } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
import ImageGridViewer from '@/components/ui/ImageGridViewer.vue';
import CommentModal from '@/components/ui/CommentModal.vue';
import OriginalMomentCard from '@/components/ui/OriginalMomentCard.vue';
import ForwardModal from '@/components/ui/ForwardModal.vue';
import NotificationBadge from '@/components/ui/NotificationBadge.vue';
import HlsVideoPlayer from '@/components/ui/HlsVideoPlayer.vue';
import { useNotifications } from '@/composables/useNotifications';

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
  getForwardCount, isForwarded, forwardMoment, newMomentContent, postMoment
} = momentsCore;

const chatFlow = getTalkFlowCore();
const { currentUserPub, userAvatars, setSelectedFriendPub, showToast } = chatFlow;
const { isDark } = useTheme();
function goToMyNode() { 
   router.push({ path: '/friend-profile', query: { pub: currentUserPub.value } });

}
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

// 评论模态窗口状态
const commentModalOpen = ref(false);
const selectedMomentForCommentModal = ref<MomentV2 | null>(null);

// 诊断弹窗状态
const diagnosticModalOpen = ref(false);

// 加载状态管理
const loadingMoments = ref<Set<string>>(new Set());

// 文本展开状态管理
const expandedMoments = ref<Set<string>>(new Set());

// 发送动态相关状态
const isPostModalOpen = ref(false);
const selectedImages = ref<string[]>([]);
const selectedVideos = ref<string[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const videoFileInput = ref<HTMLInputElement | null>(null);
const isPosting = ref(false);

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

const isBase64Video = (text: string): boolean => {
  const videoRegex = /^data:video\/(mp4|webm|ogg|avi|mov);base64,/i;
  return videoRegex.test(text);
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

const getVideos = (moment: MomentV2) => {
  const parts = moment.content.split('\n');
  const videos = parts
    .map((part, index) => {
      if (part === '[VIDEO]' && index + 1 < parts.length && isBase64Video(parts[index + 1])) {
        return parts[index + 1];
      }
      return null;
    })
    .filter(video => video !== null) as string[];
  return videos;
};

const getMedia = (moment: MomentV2) => {
  const parts = moment.content.split('\n');
  const media = parts
    .map((part, index) => {
      if ((part === '[IMAGE]' || part === '[VIDEO]') && index + 1 < parts.length) {
        const nextPart = parts[index + 1];
        if (isBase64Image(nextPart) || isBase64Video(nextPart)) {
          return { type: part === '[IMAGE]' ? 'image' : 'video', src: nextPart };
        }
      }
      return null;
    })
    .filter(media => media !== null) as Array<{type: 'image' | 'video', src: string}>;
  return media;
};

const getText = (moment: MomentV2) => {
  const parts = moment.content.split('\n');
  const text = parts.filter(part => 
    part !== '[IMAGE]' && 
    part !== '[VIDEO]' && 
    !isBase64Image(part) && 
    !isBase64Video(part)
  ).join('\n');
  return text;
};

const refreshMoments = async (event: CustomEvent) => {
 
  try {
    moments.value = [];
    lastTimestamp.value = undefined;
    hasMore.value = true;
    await loadMoments();
   
    await event.detail.complete();
  } catch (error) {
    
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
  return content.slice(0, maxLength) + '... ' + (t('clickToViewAll'));
};

// 获取显示文本（根据展开状态）
const getDisplayText = (moment: MomentV2): string => {
  const text = getText(moment);
  if (!text) return '';
  
  const isExpanded = expandedMoments.value.has(moment.momentId);
  if (isExpanded || text.length <= 200) {
    return text;
  }
  
  return text.slice(0, 200) + '...';
};

// 判断是否显示展开/收起按钮
const shouldShowToggleButton = (moment: MomentV2): boolean => {
  const text = getText(moment);
  return text && text.length > 200;
};

// 切换文本展开状态
const toggleTextExpansion = (momentId: string): void => {
  if (expandedMoments.value.has(momentId)) {
    expandedMoments.value.delete(momentId);
  } else {
    expandedMoments.value.add(momentId);
  }
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
    
    showToast(t('forwardFailed'), 'error');
  }
};

// 触发下拉刷新（与IndexPage.vue中的triggerRefresh完全一致）
const triggerRefresh = () => {
  // 模拟 ionRefresh 事件，调用当前组件的refreshMoments
  const mockEvent = { detail: { complete: () => {} } } as CustomEvent;
  refreshMoments(mockEvent);
};

// 打开评论模态窗口
const openCommentModal = (moment: MomentV2) => {
  selectedMomentForCommentModal.value = moment;
  commentModalOpen.value = true;
};

const closeCommentModal = () => {
  commentModalOpen.value = false;
  selectedMomentForCommentModal.value = null;
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

// 视频事件处理函数
const onVideoLoaded = (msgId: string) => {
  console.log('Video loaded:', msgId);
};

const onVideoError = (msgId: string, error: any) => {
  console.error('Video error:', msgId, error);
};

const onVideoPlay = (msgId: string) => {
  console.log('Video playing:', msgId);
};

const onVideoPause = (msgId: string) => {
  console.log('Video paused:', msgId);
};

const onCommentSuccess = () => {
  // 评论成功后的处理（如果需要刷新或其他操作）
  // 目前由于评论组件内部已经处理了更新，这里暂时不需要额外操作
};

// 诊断功能
const closeDiagnostic = () => {
  diagnosticModalOpen.value = false;
};

// 获取原动态转发数量（用于转发动态）
const getOriginalForwardCount = (moment: MomentV2): number => {
  if (!moment.isForward || !moment.originalMomentId) return 0;
  return getForwardCount(moment.originalMomentId);
};



const getAvatar = (userPub: string): string => {
  return userAvatars.value[userPub] || getGunAvatar1(userPub);
};

const goToProfile = async (userPub: string) => {
    router.push({ path: '/friend-profile', query: { pub: userPub } });
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

const getGunAvatar1 = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 500,
    dark: isDark.value,
    svg: true
  } as any);
};

// 发送动态相关函数
const openPostModal = () => {
  isPostModalOpen.value = true;
};

const closePostModal = () => {
  isPostModalOpen.value = false;
  selectedImages.value = [];
  selectedVideos.value = [];
  newMomentContent.value = '';
};

// 选择图片
const selectImages = () => {
  fileInput.value?.click();
};

// 选择视频
const selectVideos = () => {
  videoFileInput.value?.click();
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
      img.onerror = () => reject(new Error(t('failedLoadImage')));
    };
    reader.onerror = () => reject(new Error(t('failedReadFile')));
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
        
      }
    }
    input.value = '';
  }
};

// 处理视频选择
const handleVideoSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    const files = Array.from(input.files);
    for (const file of files) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          selectedVideos.value.push(base64);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Failed to process video:', error);
      }
    }
    input.value = '';
  }
};

// 移除图片
const removeImage = (index: number) => {
  selectedImages.value.splice(index, 1);
};

// 移除视频
const removeVideo = (index: number) => {
  selectedVideos.value.splice(index, 1);
};

// 发布动态
const handlePost = async () => {
  isPosting.value = true;
  let content = newMomentContent.value.trim();
  
  // 添加图片内容
  if (selectedImages.value.length > 0) {
    const imageContent = selectedImages.value.map(img => `[IMAGE]\n${img}`).join('\n');
    content = content ? `${content}\n${imageContent}` : imageContent;
  }
  
  // 添加视频内容
  if (selectedVideos.value.length > 0) {
    const videoContent = selectedVideos.value.map(video => `[VIDEO]\n${video}`).join('\n');
    content = content ? `${content}\n${videoContent}` : videoContent;
  }
  
  newMomentContent.value = content;
  
  try {
    postMoment();
    
    // 显示发送成功Toast
    const toast = await toastController.create({
      message: t('sent'),
      duration: 2000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
    
    closePostModal();
    // 刷新动态列表
    moments.value = [];
    lastTimestamp.value = undefined;
    hasMore.value = true;
    await loadMoments();
    
  } catch (error: any) {
    
    
    // 显示发送失败Toast
    const toast = await toastController.create({
      message: t('sendFailed'),
      duration: 2000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  } finally {
    isPosting.value = false;
  }
};    isPosting.value = false;


defineExpose({
  refreshMoments,
  openPostModal,
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
  /* border-radius: 10px; */
  /* margin-bottom: 16px; */
 
  /* background: var(--ion-background-color); */
  border-bottom: 1px solid #8686862d;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
  margin: 10px;
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

/* .content-wrapper:active {
  background-color: var(--ion-color-step-100, #f0f0f0);
  transform: scale(0.98);
} */

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

/* 动态发送窗口图片网格样式 */
.post-image-grid {
  margin: 12px 0;
  max-width: 100%;
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
  font-size: 1em;
  line-height: 1.6;
  margin: 0;
  /* text-shadow: 0 0 5px rgba(224, 224, 255, 0.3); */
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
  /* border-top: 1px solid var(--ion-color-step-100, #f0f0f0); */
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

/* 展开/收起按钮样式 */
.toggle-text {
  color: #007AFF;
  font-size: 14px;
  cursor: pointer;
  margin-left: 8px;
  font-weight: 500;
  transition: opacity 0.2s ease;
}

.toggle-text:hover {
  opacity: 0.7;
}

/* 转发成功Toast样式 */
:deep(.forward-success-toast) {
  --border-radius: 12px;
  --font-size: 16px;
  --font-weight: 600;
}

/* 发送动态模态窗口样式 */
.custom-modal {
  --backdrop-opacity: 0.5;
  --border-radius: 12px;
  --max-width: 96%;
  --max-height: 70%;
}
@media (max-width: 768px) {
  .large-screen-content {
    display: none;
  }
  

}
.input-container {
  position: relative;
  margin-bottom: 16px;
  padding: 0 16px;
  overflow-y: auto;
  max-height: 300px;
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

.image-item {
  position: relative;
  width: 100%;
  height: 100%;
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

.image-select-btn {
  --border-radius: 12px;
  margin: 16px;
  font-size: 15px;
}

/* 诊断按钮样式 */
.diagnostic-btn {
  --color: var(--ion-color-warning);
  position: relative;
}

.diagnostic-btn::after {
  content: '';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  background: var(--ion-color-warning);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}


</style>