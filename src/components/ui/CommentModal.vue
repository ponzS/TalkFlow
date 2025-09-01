<template>
  <ion-modal :is-open="isOpen" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="$emit('close')">{{ $t('Close') || 'Close' }}</ion-button>
        </ion-buttons>
        <ion-title>{{ $t('Comments') || 'Comments' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding comments-content">
      <!-- 评论加载状态 -->
      <div v-if="commentsLoading" class="loading-comments">
        <ion-spinner name="crescent"></ion-spinner>
        <p>{{ $t('loading') || '加载中...' }}</p>
      </div>
      
      <!-- 无评论状态 -->
      <div v-else-if="comments.length === 0" class="no-comments">
        <p>{{ $t('noCommentsYet') || '暂无评论' }}</p>
      </div>
      
      <!-- 评论列表 -->
      <div v-else v-for="comment in comments" :key="comment.commentId" class="comment-thread">
        <!-- 父评论 -->
        <div class="parent-comment">
          <div class="comment-item-wrapper">
            <ion-avatar class="comment-avatar" @click="goToProfile(comment.userPub)">
              <img :src="getAvatarWithFallback(comment.userPub)" alt="" />
            </ion-avatar>
            <div class="comment-content-wrapper">
              <div class="comment-header">
                <h3 class="comment-user" @click="goToProfile(comment.userPub)">
                  {{ getBuddyAlias(comment.userPub) }}
                </h3>
                <span class="comment-timestamp">{{ formatTimestamp(comment.timestamp) }}</span>
              </div>
              <div class="comment-bubble">
                <p class="comment-content">{{ comment.content }}</p>
              </div>
              <div class="comment-actions">
                <ion-button fill="clear" size="small" color="medium" @click="replyToParentComment(comment)">
                  <ion-icon :icon="chatboxEllipsesOutline" slot="start"></ion-icon>
                  {{ $t('reply') || 'Reply' }}
                </ion-button>
                <ion-button 
                  v-if="canDeleteComment(comment)" 
                  fill="clear" 
                  size="small" 
                  color="danger" 
                  @click="deleteComment(comment.momentId, comment.commentId)"
                >
                  <ion-icon :icon="trashOutline" slot="start"></ion-icon>
                  {{ $t('delete') || 'Delete' }}
                </ion-button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 子评论列表 -->
        <div v-if="comment.replies.length > 0" class="replies-section">
          <div v-for="reply in comment.replies" :key="reply.commentId" class="reply-comment">
            <div class="comment-item-wrapper">
              <ion-avatar class="comment-avatar reply-avatar" @click="goToProfile(reply.userPub)">
                <img :src="getAvatarWithFallback(reply.userPub)" alt="" />
              </ion-avatar>
              <div class="comment-content-wrapper">
                <div class="comment-header">
                  <h3 class="comment-user" @click="goToProfile(reply.userPub)">
                    {{ getBuddyAlias(reply.userPub) }}
                  </h3>
                  <span class="comment-timestamp">{{ formatTimestamp(reply.timestamp) }}</span>
                </div>
                <!-- 回复目标信息 -->
                <div v-if="reply.replyToCommentId" class="reply-target">
                  <ion-icon :icon="arrowUndoOutline" size="small"></ion-icon>
                  <span class="reply-to-user">@{{ getBuddyAlias(getReplyUserPub(reply.replyToCommentId)) }}</span>
                  <span class="reply-preview">{{ getReplyContent(reply.replyToCommentId) }}</span>
                </div>
                <div class="comment-bubble reply-bubble">
                  <p class="comment-content">{{ reply.content }}</p>
                </div>
                <div class="comment-actions">
                  <ion-button fill="clear" size="small" color="medium" @click="replyToSubComment(reply, comment)">
                    <ion-icon :icon="chatboxEllipsesOutline" slot="start"></ion-icon>
                    {{ $t('reply') || 'Reply' }}
                  </ion-button>
                  <ion-button 
                    v-if="canDeleteComment(reply)" 
                    fill="clear" 
                    size="small" 
                    color="danger" 
                    @click="deleteComment(reply.momentId, reply.commentId)"
                  >
                    <ion-icon :icon="trashOutline" slot="start"></ion-icon>
                    {{ $t('delete') || 'Delete' }}
                  </ion-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style="height: 100px;"></div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <div class="comment-input-container" :style="{ bottom: keyboardHeight + 'px' }">
        <div v-if="replyingTo.comment" class="reply-hint-container">
          <div class="reply-hint-content">
            <ion-icon :icon="arrowUndoOutline" class="reply-icon"></ion-icon>
            <div class="reply-info">
              <div class="reply-target">
                <span class="reply-label">{{ $t('replyingTo') || 'Replying to' }}</span>
                <span class="reply-user">@{{ getBuddyAlias(replyingTo.comment.userPub) }}</span>
              </div>
              <div class="reply-preview">
                {{ truncateComment(replyingTo.comment.content) }}
              </div>
            </div>
          </div>
          <ion-button 
            fill="clear" 
            size="small" 
            color="medium"
            @click="replyingTo = { comment: null, parentComment: null }"
            class="cancel-reply-btn"
          >
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </div>
        <div class="input-wrapper">
          <div class="input-capsule">
            <div class="input-container">
              <div class="text-input">
                <textarea
                  ref="textareaEl"
                  v-model="inputContent"
                  :placeholder=" 'Write a comment...'"
                  @input="adjustHeight"
                  @focus="onFocus"
                  @blur="onBlur"
                  @keydown.enter="handleEnterKey"
                  rows="1"
                  class="comment-textarea"
                />
              </div>
            </div>
            <ion-button
              v-if="inputContent.trim()"
              fill="clear"
              @click="replyingTo.comment ? postReply() : postComment()"
              :disabled="!inputContent.trim() || loading"
              class="send-button"
            >
              <ion-icon :icon="replyingTo.comment ? arrowUndoOutline : sendOutline"></ion-icon>
            </ion-button>
          </div>
        </div>
      </div>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  IonModal, IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonTitle,
  IonAvatar, IonIcon, IonTextarea, IonSpinner, IonFooter
} from '@ionic/vue';
import {
  trashOutline, chatboxEllipsesOutline, arrowUndoOutline, closeOutline, sendOutline
} from 'ionicons/icons';
import { useNotifications } from '@/composables/useNotifications';
import { useMoments, type CommentHow } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { gunAvatar, mountClass } from 'gun-avatar';

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

interface Props {
  isOpen: boolean;
  moment: MomentV2 | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

mountClass();
const router = useRouter();
const { t } = useI18n();
const momentsCore = useMoments();
const {
  getBuddyAlias, formatTimestamp, addComment, getComments, deleteComment,
  loading, momentComments
} = momentsCore;

const chatFlow = getTalkFlowCore();
const { currentUserPub, gun, buddyList, searchUserProfile, setSelectedFriendPub } = chatFlow;

const inputContent = ref('');
const replyingTo = ref<{ comment: CommentHow | null; parentComment: CommentHow | null }>({ comment: null, parentComment: null });
const textareaEl = ref<HTMLIonTextareaElement | null>(null);
const commentsLoading = ref(false);
const keyboardHeight = ref(0);
const inputFocused = ref(false);

// 监听动态变化，加载评论
watch(() => props.moment, async (newMoment) => {
  if (newMoment && props.isOpen) {
    commentsLoading.value = true;
    try {
      await getComments(newMoment.momentId);
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      commentsLoading.value = false;
    }
  }
}, { immediate: true });

// 监听模态窗口打开状态
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.moment) {
    commentsLoading.value = true;
    try {
      await getComments(props.moment.momentId);
      
      // 重新初始化键盘设置
      await Keyboard.setResizeMode({ mode: KeyboardResize.None });
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      commentsLoading.value = false;
    }
  } else if (!isOpen) {
    // 模态窗口关闭时恢复键盘设置
    try {
      await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
    } catch (error) {
      console.warn('恢复键盘设置失败:', error);
    }
  }
});

const comments = computed(() => {
  if (!props.moment?.momentId) {
    return [];
  }
  
  const commentList = momentComments.value[props.moment.momentId] || [];
  
  if (commentList.length === 0) {
    return [];
  }
  
  const uniqueComments = Array.from(new Map(commentList.map(c => [c.commentId, c])).values());
  const commentMap = new Map<string, CommentHow & { replies: CommentHow[] }>();
  const topLevelComments: (CommentHow & { replies: CommentHow[] })[] = [];

  // 创建所有评论的映射
  uniqueComments.forEach(comment => {
    commentMap.set(comment.commentId, { ...comment, replies: [] });
  });

  // 根据parentCommentId和replyToCommentId正确归类
  uniqueComments.forEach(comment => {
    if (comment.parentCommentId) {
      const parentComment = commentMap.get(comment.parentCommentId);
      if (parentComment) {
        parentComment.replies.push({ ...comment });
      }
    } else if (comment.replyToCommentId) {
      const parentComment = commentMap.get(comment.replyToCommentId);
      if (parentComment) {
        parentComment.replies.push({ ...comment });
      }
    } else {
      topLevelComments.push(commentMap.get(comment.commentId)!);
    }
  });

  // 排序
  topLevelComments.sort((a, b) => a.timestamp - b.timestamp);
  topLevelComments.forEach(comment => {
    comment.replies.sort((a, b) => a.timestamp - b.timestamp);
  });

  return topLevelComments;
});

const canDeleteComment = (comment: CommentHow) => {
  return props.moment?.userPub === currentUserPub.value || comment.userPub === currentUserPub.value;
};

const getAvatarWithFallback = (userPub: string): string => {
  return gunAvatar({
    pub: userPub,
    round: false,
    size: 200,
    dark: false,
    svg: true
  } as any);
};

const truncateComment = (content: string): string => {
  return content.length > 50 ? content.substring(0, 47) + '...' : content;
};

const getReplyContent = (replyToCommentId: string): string => {
  const comment = comments.value
    .flatMap(c => [c, ...c.replies])
    .find(c => c.commentId === replyToCommentId);
  return comment ? truncateComment(comment.content) : '[已删除]';
};

const getReplyUserPub = (replyToCommentId: string): string => {
  const comment = comments.value
    .flatMap(c => [c, ...c.replies])
    .find(c => c.commentId === replyToCommentId);
  return comment ? comment.userPub : '';
};

const goToProfile = async (userPub: string) => {
  router.push({ path: '/friend-profile', query: { pub: userPub } });
};

const replyToParentComment = (comment: CommentHow) => {
  replyingTo.value = { comment, parentComment: null };
  nextTick(() => {
    textareaEl.value?.setFocus();
  });
};

const replyToSubComment = (reply: CommentHow, parentComment: CommentHow) => {
  replyingTo.value = { comment: reply, parentComment };
  nextTick(() => {
    textareaEl.value?.setFocus();
  });
};

const postComment = async () => {
  if (!inputContent.value.trim() || !props.moment) return;
  
  try {
    await addComment(props.moment.momentId, inputContent.value.trim());
    inputContent.value = '';
  } catch (error) {
    console.error('发送评论失败:', error);
  }
};

const postReply = async () => {
  if (!inputContent.value.trim() || !props.moment || !replyingTo.value.comment) return;
  
  try {
    const parentCommentId = replyingTo.value.parentComment?.commentId || replyingTo.value.comment.commentId;
    const replyToCommentId = replyingTo.value.comment.commentId;
    
    await addComment(
      props.moment.momentId,
      inputContent.value.trim(),
      parentCommentId,
      replyToCommentId
    );
    
    inputContent.value = '';
    replyingTo.value = { comment: null, parentComment: null };
  } catch (error) {
    console.error('发送回复失败:', error);
  }
};

const adjustHeight = () => {
  nextTick(() => {
    if (textareaEl.value) {
      textareaEl.value.style.height = 'auto';
      textareaEl.value.style.height = textareaEl.value.scrollHeight + 'px';
    }
  });
};

const onFocus = () => {
  inputFocused.value = true;
};

const onBlur = () => {
  inputFocused.value = false;
};

// 键盘监听和初始化
onMounted(async () => {
  try {
    // 初始化键盘配置
    await Keyboard.setResizeMode({ mode: KeyboardResize.None });
    
    // 设置键盘监听器
    Keyboard.addListener('keyboardWillShow', (info) => {
      keyboardHeight.value = info.keyboardHeight;
    });
    
    Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0;
    });
    
    // 确保键盘配置生效
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
  } catch (error) {
    console.warn('键盘初始化失败:', error);
  }
});

onUnmounted(async () => {
  try {
    // 移除所有键盘监听器
    Keyboard.removeAllListeners();
    
    // 恢复默认键盘设置
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch (error) {
    console.warn('键盘清理失败:', error);
  }
});

const handleEnterKey = (event: KeyboardEvent) => {
  if (event.shiftKey) {
    return;
  }
  event.preventDefault();
  if (replyingTo.value.comment) {
    postReply();
  } else {
    postComment();
  }
};
</script>

<style scoped>
.loading-comments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--ion-color-medium);
}

.no-comments {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--ion-color-medium);
}

.comment-thread {
  margin-bottom: 20px;
}

.parent-comment {
  margin-bottom: 12px;
}

.comment-item-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  cursor: pointer;
}

.reply-avatar {
  width: 32px;
  height: 32px;
}

.comment-content-wrapper {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-user {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-primary);
  cursor: pointer;
  margin: 0;
}

.comment-timestamp {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.comment-bubble {
  background: var(--ion-color-light);
  border-radius: 16px;
  padding: 12px 16px;
  margin-bottom: 8px;
  max-width: 100%;
  word-wrap: break-word;
}

.reply-bubble {
  background: var(--ion-color-step-50);
}

.comment-content {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--ion-text-color);
}

.comment-actions {
  display: flex;
  gap: 8px;
}

.comment-actions ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
  height: 32px;
  font-size: 12px;
}

.replies-section {
  margin-left: 32px;
  padding-left: 16px;
  border-left: 2px solid var(--ion-color-light);
}

.reply-comment {
  margin-bottom: 12px;
}

.reply-target {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--ion-color-medium);
}

.reply-to-user {
  color: var(--ion-color-primary);
  font-weight: 500;
}

.reply-preview {
  opacity: 0.8;
}

.comment-input-container {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--ion-background-color);
  border-top: 1px solid var(--ion-color-light);
  padding: 12px 16px;
  transition: bottom 0.3s ease;
  z-index: 1000;
}

.reply-hint-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--ion-color-light);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
}

.reply-hint-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.reply-icon {
  color: var(--ion-color-primary);
}

.reply-info {
  flex: 1;
  min-width: 0;
}

.reply-target {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

.reply-label {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.reply-user {
  font-size: 12px;
  color: var(--ion-color-primary);
  font-weight: 500;
}

.reply-preview {
  font-size: 12px;
  color: var(--ion-color-medium);
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cancel-reply-btn {
  --padding-start: 8px;
  --padding-end: 8px;
  height: 32px;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.input-capsule {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--ion-color-light);
  border-radius: 20px;
  padding: 4px;
   width: 100%;
}

.input-container {
  /* flex: 1; */
  display: flex;
  align-items: center;
  width: 100%;
}

.text-input {
  /* flex: 1; */
  padding: 8px 12px;
   width: 100%;
}

.comment-textarea {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.4;
  resize: none;
  font-family: inherit;
  color: var(--ion-text-color);
  min-height: 20px;
  max-height: 120px;
  overflow-y: auto;
}

.comment-textarea::placeholder {
  color: var(--ion-color-medium);
}

.send-button {
  --padding-start: 8px;
  --padding-end: 8px;
  height: 40px;
  width: 40px;
  --border-radius: 20px;
  --background: var(--ion-color-primary);
  --color: white;
}

.send-button ion-icon {
  font-size: 18px;
}

.comments-content {
  padding-bottom: 80px;
}
</style>