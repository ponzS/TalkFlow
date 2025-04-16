<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button @click="router.go(-1)" color="dark"></ion-back-button>
        </ion-buttons>
        <!-- <ion-title>动态详情</ion-title> -->
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="loading" class="loading">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
      <div v-else-if="moment" class="moment-container">
        <div class="moment-item">
          <div class="moment-header">
            <ion-avatar class="avatar" @click="goToProfile(moment.userPub)">
              <img :src="getAvatarWithFallback(moment.userPub)" alt="Avatar" />
            </ion-avatar>
            <div class="header-info">
              <h2 class="clickable-name" @click="goToProfile(moment.userPub)">
                {{ getBuddyAlias(moment.userPub) }}
              </h2>
              <p class="timestamp">{{ formatTimestamp(moment.timestamp) }}</p>
            </div>
            <ion-button v-if="isOwnMoment" fill="clear" color="danger" @click="deleteMoment(moment.momentId)">
              <ion-icon :icon="trashOutline"></ion-icon>
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
              <img :src="img" class="moment-image" alt="Moment Image" />
            </slide>
            <template #addons>
              <navigation v-if="getImages(moment).length > 1" />
              <pagination />
            </template>
          </carousel>
          <div v-if="getText(moment)" class="text-wrapper">
            <p class="content">{{ getText(moment) }}</p>
          </div>
          <div class="actions">
            <!-- <ion-button fill="clear" @click="router.push(`/moment/${moment.momentId}`)">
              <ion-icon :icon="chatbubbleOutline"></ion-icon>
              <span>{{ getCommentCount(moment.momentId) }}</span>
            </ion-button> -->
            <ion-button fill="clear" @click="toggleLike(moment.momentId)">
              <ion-icon :icon="isLiked(moment.momentId) ? heart : heartOutline"></ion-icon>
              <span>{{ getLikeCount(moment.momentId) }}</span>
            </ion-button>
          </div>
        </div>
        <ion-list class="comments-list">
          <ion-item v-for="comment in comments" :key="comment.commentId" lines="none" class="comment-item">
            <ion-avatar slot="start" class="comment-avatar" @click="goToProfile(comment.userPub)">
              <img :src="getAvatarWithFallback(comment.userPub)" alt="Avatar" />
            </ion-avatar>
            <ion-label>
              <h3 class="comment-user" @click="goToProfile(comment.userPub)">{{ getBuddyAlias(comment.userPub) }}</h3>
              <p class="comment-content">{{ comment.content }}</p>
              <p class="comment-timestamp">{{ formatTimestamp(comment.timestamp) }}</p>
            </ion-label>
            <ion-buttons slot="end" class="comment-actions">
              <ion-button fill="clear" color="primary" @click="replyTo(comment)">
                <ion-icon :icon="chatboxEllipsesOutline"></ion-icon>
              </ion-button>
              <ion-button v-if="canDeleteComment(comment)" fill="clear" color="danger" @click="deleteComment(comment.momentId, comment.commentId)">
                <ion-icon :icon="trashOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-item>
        </ion-list>
      </div>
      <div v-else class="no-moment">
        <ion-icon :icon="alertCircleOutline" size="large"></ion-icon>
        <p>Not Found</p>
      </div>
    </ion-content>
    <ion-footer v-if="moment" class="input-footer">
      <ion-item v-if="replyingTo" lines="none" class="reply-hint">
        <ion-label>
          <ion-icon :icon="arrowUndoOutline" size="small"></ion-icon>
          Answer {{ getBuddyAlias(replyingTo.userPub) }}
        </ion-label>
        <ion-button slot="end" fill="clear" size="small" @click="replyingTo = null">
          <ion-icon :icon="closeOutline"></ion-icon>
        </ion-button>
      </ion-item>
      <ion-item lines="none" class="comment-input">
        <ion-textarea v-model="inputContent" placeholder="Say something..." auto-grow @ionInput="adjustInput"></ion-textarea>
        <ion-button slot="end" fill="solid" shape="round" @click="replyingTo ? postReply() : postComment()" :disabled="!inputContent.trim()">
          <ion-icon :icon="replyingTo ? arrowUndoOutline : sendOutline"></ion-icon>
        </ion-button>
      </ion-item>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonTitle, IonItem, 
  IonAvatar, IonLabel, IonButton, IonIcon, IonList, IonTextarea, IonSpinner, IonFooter 
} from '@ionic/vue';
import { 
  chatbubbleOutline, heart, heartOutline, trashOutline, chatboxEllipsesOutline, 
  alertCircleOutline, arrowUndoOutline, closeOutline, sendOutline 
} from 'ionicons/icons';
import { useMoments } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from "gun-avatar";
import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';

// 类型定义
interface MomentV2 {
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  isHidden: number;
}

interface CommentV2 {
  commentId: string;
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  replyToCommentId?: string;
  isDeleted: number;
}

mountClass();
const router = useRouter();
const route = useRoute();
const momentsCore = useMoments();
const { 
  moments, loadMoments, isLiked, getLikeCount, getBuddyAlias, formatTimestamp, addLike, removeLike, 
  addComment, getComments, deleteMoment, deleteComment, getAvatar, loading, momentComments, momentLikes 
} = momentsCore;

const chatFlow = getTalkFlowCore();
const { currentUserPub, gun } = chatFlow;

const momentId = route.params.momentId as string;
const moment = ref<MomentV2 | null>(null);
const comments = ref<CommentV2[]>([]);
const inputContent = ref('');
const replyingTo = ref<CommentV2 | null>(null);

// 计算属性
const isOwnMoment = computed(() => moment.value?.userPub === currentUserPub.value);

const canDeleteComment = (comment: CommentV2) => {
  return isOwnMoment.value || comment.userPub === currentUserPub.value;
};

// 局部函数定义
const isBase64Image = (text: string): boolean => {
  const imageRegex = /^data:image\/(jpeg|png|gif|bmp|webp);base64,/i;
  return imageRegex.test(text);
};

const getImages = (moment: MomentV2): string[] => {
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

const getText = (moment: MomentV2): string => {
  const parts = moment.content.split('\n');
  return parts.filter(part => part !== '[IMAGE]' && !isBase64Image(part)).join('\n');
};

// 初始化加载
onMounted(async () => {
  console.log('路由参数:', route.params);
  console.log('加载动态详情，momentId:', momentId);
  await loadMoments();
  console.log('所有动态:', moments.value);
  moment.value = moments.value.find(m => m.momentId === momentId) || null;
  console.log('当前动态:', moment.value);
  if (moment.value) {
    comments.value = await getComments(momentId);
    console.log('加载评论:', comments.value);
    listenCommentsFromGun();
    listenLikesFromGun();
  } else {
    console.warn('未找到动态:', momentId);
    await fetchMomentFromGun();
  }
});

// 从 Gun.js 获取动态
const fetchMomentFromGun = async () => {
  if (!momentId) return;
  console.log('尝试从 Gun.js 获取动态:', momentId);
  loading.value = true;
  try {
    const data = await new Promise<MomentV2 | null>((resolve) => {
      gun.get('moments').get(momentId).once((data: any) => {
        if (data) {
          const fetchedMoment: MomentV2 = {
            momentId,
            userPub: data.userPub || 'unknown',
            content: data.content || '[Null]',
            timestamp: data.timestamp || Date.now(),
            isHidden: data.isHidden || 0,
          };
          resolve(fetchedMoment);
        } else {
          resolve(null);
        }
      });
    });
    if (data) {
      moment.value = data;
      moments.value = [data, ...moments.value.filter(m => m.momentId !== momentId)];
      console.log('从 Gun.js 获取动态:', moment.value);
      comments.value = await getComments(momentId);
      console.log('加载评论:', comments.value);
      listenCommentsFromGun();
      listenLikesFromGun();
    } else {
      console.warn('Gun.js 未找到动态:', momentId);
    }
  } catch (err) {
    console.error('从 Gun.js 获取动态失败:', err);
  } finally {
    loading.value = false;
  }
};

// 从 Gun.js 增量同步评论
const listenCommentsFromGun = () => {
  gun.get('momentComments').get(momentId).map().on((data: any, commentId: string) => {
    if (data) {
      const comment: CommentV2 = {
        commentId,
        momentId,
        userPub: data.userPub || 'unknown',
        content: data.content || '[Null]',
        timestamp: data.timestamp || Date.now(),
        replyToCommentId: data.replyToCommentId,
        isDeleted: data.isDeleted || 0,
      };
      const existingIndex = comments.value.findIndex(c => c.commentId === commentId);
      if (existingIndex === -1) {
        comments.value.push(comment);
        console.log('Gun.js 添加新评论:', comment);
      } else if (JSON.stringify(comments.value[existingIndex]) !== JSON.stringify(comment)) {
        comments.value[existingIndex] = comment;
        console.log('Gun.js 更新评论:', comment);
      }
      comments.value = [...comments.value];
    } else {
      comments.value = comments.value.filter(c => c.commentId !== commentId);
      console.log('Gun.js 删除评论:', commentId);
    }
  });
};

// 从 Gun.js 增量同步点赞
const listenLikesFromGun = () => {
  gun.get('momentLikes').get(momentId).map().on((data: any, userPub: string) => {
    if (data && userPub !== '_') {
      if (!momentLikes.value[momentId]) momentLikes.value[momentId] = [];
      const existingIndex = momentLikes.value[momentId].indexOf(userPub);
      if (existingIndex === -1) {
        momentLikes.value[momentId].push(userPub);
        console.log('Gun.js 添加点赞:', { momentId, userPub });
      }
      momentLikes.value = { ...momentLikes.value };
    } else if (!data && userPub !== '_') {
      momentLikes.value[momentId] = momentLikes.value[momentId].filter(pub => pub !== userPub);
      momentLikes.value = { ...momentLikes.value };
      console.log('Gun.js 移除点赞:', { momentId, userPub });
    }
  });
};

// 切换点赞状态
const toggleLike = (momentId: string) => {
  if (isLiked(momentId)) removeLike(momentId);
  else addLike(momentId);
};

// 发布评论
const postComment = async () => {
  if (!inputContent.value.trim() || !momentId) return;
  try {
    await addComment(momentId, inputContent.value);
    inputContent.value = '';
    comments.value = await getComments(momentId); // 刷新评论列表
  } catch (error) {
    console.error('发布评论失败:', error);
  }
};

// 设置回复目标
const replyTo = (comment: CommentV2) => {
  replyingTo.value = comment;
  inputContent.value = '';
};

// 发布回复
const postReply = async () => {
  if (!inputContent.value.trim() || !replyingTo.value || !momentId) return;
  try {
    const replyContent = `@${getBuddyAlias(replyingTo.value.userPub)} ${inputContent.value}`;
    await addComment(momentId, replyContent, replyingTo.value.commentId);
    inputContent.value = '';
    replyingTo.value = null;
    comments.value = await getComments(momentId); // 刷新评论列表
  } catch (error) {
    console.error('发布回复失败:', error);
  }
};

// 调整输入框高度
const adjustInput = (event: CustomEvent) => {
  const input = event.target as HTMLIonTextareaElement;
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
};

// 获取评论数量
const getCommentCount = (momentId: string) => momentComments.value[momentId]?.length || 0;

const getAvatarWithFallback = (userPub: string): string => {
  const avatar = getAvatar(userPub);
  return avatar && avatar.trim() !== '' ? avatar : getGunAvatar(userPub);
};

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: true
  });
};

const goToProfile = (userPub: string) => {
  router.push(`/profile/${userPub}`);
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

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.no-moment {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: #8795a1;
}

.no-moment ion-icon {
  margin-bottom: 12px;
}

.moment-container {
  padding-bottom: 100px;
}

.moment-item {
  width: 100%;
  margin-bottom: 16px;
}

.moment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
}

.avatar {
  width: 59px;
  height: 59px;
  --border-radius: 13px;
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
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 1.3em;
  line-height: 1.6;
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

.comments-list {
  padding: 0 16px;
}

.comment-item {
  padding: 12px 0;
  margin-bottom: 12px;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  margin-right: 12px;
}

.comment-user {
  font-size: 1em;
  font-weight: 500;
  margin-bottom: 4px;
}

.comment-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.95em;
  line-height: 1.6;
  margin: 4px 0;
}

.comment-timestamp {
  color: #8795a1;
  font-size: 0.8em;
  margin-top: 4px;
}

.comment-actions {
  margin-top: 4px;
}

.comment-actions ion-button {
  --padding-start: 6px;
  --padding-end: 6px;
}

.input-footer {
  padding: 8px 16px;
}

.reply-hint {
  padding: 0;
  margin-bottom: 6px;
  font-size: 0.85em;
  color: #8795a1;
}

.reply-hint ion-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
}

.reply-hint ion-button {
  --padding-start: 6px;
  --padding-end: 6px;
}

.comment-input {
  padding: 0;
  align-items: center;
}

.comment-input ion-textarea {
  --padding-top: 8px;
  --padding-bottom: 8px;
  font-size: 0.95em;
  min-height: 36px;
  max-height: 100px;
  margin-right: 8px;
}

.comment-input ion-button {
  --padding-start: 10px;
  --padding-end: 10px;
  --border-radius: 16px;
  height: 36px;
  width: 36px;
}
</style>