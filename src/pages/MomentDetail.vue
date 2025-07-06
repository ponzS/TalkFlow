<template>
  <ion-page>
    <ion-header :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="chevronBackOutline" color="dark"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Post</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentEl" class="ion-padding">
      <div v-if="moment" class="moment-container">
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
          <!-- 转发动态的转发评论 -->
          <div v-if="moment.isForward && moment.forwardContent" class="forward-content-wrapper">
            <p class="forward-content">{{ truncateForwardContent(moment.forwardContent) }}</p>
          </div>
          
          <!-- 转发动态的原动态卡片 -->
          <OriginalMomentCard 
            v-if="moment.isForward && moment.originalMomentId && moment.originalAuthor"
            :original-moment-id="moment.originalMomentId"
            :original-author="moment.originalAuthor"
          />
          
          <!-- 非转发动态的图片轮播 -->
          <carousel
            v-if="!moment.isForward && getImages(moment).length > 0"
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
          
          <!-- 非转发动态的文字内容 -->
          <div v-if="!moment.isForward && getText(moment)" class="text-wrapper">
            <p class="content">{{ getText(moment) }}</p>
          </div>
          
          <!-- 点赞转发操作区域 -->
          <div class="moment-actions">
            <ion-button fill="clear" @click="toggleLike(moment.momentId)">
              <ion-icon :icon="isLiked(moment.momentId) ? heart : heartOutline"></ion-icon>
              <span>{{ getLikeCount(moment.momentId) }}</span>
            </ion-button>
            <ion-button 
              fill="clear" 
              @click="openForwardModal(moment)"
              v-if="!moment.isForward"
            >
              <ion-icon :icon="shareOutline"></ion-icon>
              <span>{{ getForwardCount(moment.momentId) }}</span>
            </ion-button>
            <ion-button 
              fill="clear" 
              @click="openForwardModal(moment, true)"
              v-if="moment.isForward"
            >
              <ion-icon :icon="shareOutline"></ion-icon>
              <span>{{ getOriginalForwardCount(moment) }}</span>
            </ion-button>
          </div>
        </div>
        <div class="comments-section">
                  <div v-if="comments.length === 0" class="no-comments">
          <p>{{ $t('noCommentsYet') }}</p>
        </div>
          <div v-for="comment in comments" :key="comment.commentId" class="comment-thread">
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
                      {{ $t('reply') }}
                    </ion-button>
                                          <ion-button 
                        v-if="canDeleteComment(comment)" 
                        fill="clear" 
                        size="small" 
                        color="danger" 
                        @click="deleteComment(comment.momentId, comment.commentId)"
                      >
                        <ion-icon :icon="trashOutline" slot="start"></ion-icon>
                        {{ $t('delete') }}
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
                        {{ $t('reply') }}
                      </ion-button>
                                              <ion-button 
                          v-if="canDeleteComment(reply)" 
                          fill="clear" 
                          size="small" 
                          color="danger" 
                          @click="deleteComment(reply.momentId, reply.commentId)"
                        >
                          <ion-icon :icon="trashOutline" slot="start"></ion-icon>
                          {{ $t('delete') }}
                        </ion-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-moment">
        <ion-spinner name="crescent"></ion-spinner>
        <p>{{ $t('loading') }}</p>
      </div>
      <div style="height: 700px;"></div>
    </ion-content>

    <ion-footer collapse="fade" class="ion-no-border">
      <div class="post-container" :style="{ transform: `translateY(-${keyboardHeight}px)` }" v-if="moment">
        <div v-if="replyingTo.comment" class="reply-hint-container">
          <div class="reply-hint-content">
            <ion-icon :icon="arrowUndoOutline" class="reply-icon"></ion-icon>
            <div class="reply-info">
              <div class="reply-target">
                <span class="reply-label">{{ $t('replyingTo') }}</span>
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
          <ion-textarea
            ref="textareaEl"
            v-model="inputContent"
            :placeholder="$t('sayPhaceholder')"
            auto-grow
            :rows="1"
            class="dynamic-textarea"
            @ionFocus="onFocus"
            @ionBlur="onBlur"
            @ionInput="adjustInput"
            enterkeyhint="send"
            @keydown.enter="handleEnterKey"
          ></ion-textarea>
          <div
            v-if="inputContent.trim()"
            class="send-button"
            @click="replyingTo.comment ? postReply() : postComment()"
            :disabled="!inputContent.trim() || loading"
          >
            <ion-icon :icon="replyingTo.comment ? arrowUndoOutline : sendOutline"></ion-icon>
          </div>
        </div>
      </div>
    </ion-footer>
    
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonTitle, IonItem,
  IonAvatar, IonLabel, IonIcon, IonList, IonTextarea, IonSpinner, IonFooter
} from '@ionic/vue';
import {
  trashOutline, chatboxEllipsesOutline, arrowUndoOutline, closeOutline, sendOutline, chevronBackOutline,
  heart, heartOutline, shareOutline
} from 'ionicons/icons';
import { useMoments, type CommentHow } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from 'gun-avatar';
import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
import { Keyboard, KeyboardResize, KeyboardInfo } from '@capacitor/keyboard';
import 'vue3-carousel/dist/carousel.css';
import OriginalMomentCard from '@/components/ui/OriginalMomentCard.vue';
import ForwardModal from '@/components/ui/ForwardModal.vue';
import { toastController } from '@ionic/vue';

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
  moments, momentState, getBuddyAlias, formatTimestamp,
  addComment, getComments, deleteMoment, deleteComment, getAvatar, loading, momentComments, hideMomentDetails,
  isLiked, getLikeCount, addLike, removeLike, getForwardCount, forwardMoment
} = momentsCore;

const chatFlow = getTalkFlowCore();
const { currentUserPub, gun, buddyList, searchUserProfile, setSelectedFriendPub } = chatFlow;

const inputContent = ref('');
const replyingTo = ref<{ comment: CommentHow | null; parentComment: CommentHow | null }>({ comment: null, parentComment: null });
const textareaEl = ref<HTMLIonTextareaElement | null>(null);
const contentEl = ref<HTMLElement | null>(null);
const capsuleRef = ref<HTMLDivElement | null>(null);
const keyboardHeight = ref(0);
const isFocused = ref(false);

// 转发弹窗状态
const forwardModalOpen = ref(false);
const selectedMomentForForward = ref<MomentV2 | null>(null);
const isForwardingOriginal = ref(false);

const moment = computed(() => {
  const foundMoment = moments.value.find((m) => m.momentId === momentState.selectedMomentId) || null;
  return foundMoment;
});

const comments = computed(() => {
  const commentList = momentState.selectedMomentId ? momentComments.value[momentState.selectedMomentId] || [] : [];
  const uniqueComments = Array.from(new Map(commentList.map(c => [c.commentId, c])).values());

  console.log('comments computed - 原始评论列表:', uniqueComments.map(c => ({
    commentId: c.commentId,
    content: c.content.substring(0, 20) + '...',
    replyToCommentId: c.replyToCommentId,
    parentCommentId: c.parentCommentId
  })));

  const commentMap = new Map<string, CommentHow & { replies: CommentHow[] }>();
  const topLevelComments: (CommentHow & { replies: CommentHow[] })[] = [];

  // 第一步：创建所有评论的映射
  uniqueComments.forEach(comment => {
    commentMap.set(comment.commentId, { ...comment, replies: [] });
  });

  // 第二步：根据parentCommentId和replyToCommentId正确归类
  uniqueComments.forEach(comment => {
    console.log(`处理评论 ${comment.commentId}:`, {
      content: comment.content.substring(0, 20) + '...',
      parentCommentId: comment.parentCommentId,
      replyToCommentId: comment.replyToCommentId
    });

    // 判断评论的类型和归属
    if (comment.parentCommentId) {
      // 有parentCommentId，说明这是子评论，归属到parentCommentId对应的顶级评论下
      const parentComment = commentMap.get(comment.parentCommentId);
      if (parentComment) {
        console.log(`评论 ${comment.commentId} 归属到父评论 ${comment.parentCommentId}`);
        parentComment.replies.push({ ...comment });
      } else {
        console.warn(`找不到父评论 ${comment.parentCommentId}，评论 ${comment.commentId} 无法归属`);
      }
    } else if (comment.replyToCommentId) {
      // 没有parentCommentId但有replyToCommentId，说明这是回复顶级评论的子评论
      const parentComment = commentMap.get(comment.replyToCommentId);
      if (parentComment) {
        console.log(`评论 ${comment.commentId} 归属到回复目标 ${comment.replyToCommentId}`);
        parentComment.replies.push({ ...comment });
      } else {
        console.warn(`找不到回复目标 ${comment.replyToCommentId}，评论 ${comment.commentId} 无法归属`);
      }
    } else {
      // 既没有parentCommentId也没有replyToCommentId，说明这是顶级评论
      console.log(`评论 ${comment.commentId} 是顶级评论`);
      topLevelComments.push(commentMap.get(comment.commentId)!);
    }
  });

  // 第三步：排序
  topLevelComments.sort((a, b) => a.timestamp - b.timestamp);
  topLevelComments.forEach(comment => {
    comment.replies.sort((a, b) => a.timestamp - b.timestamp);
  });

  console.log('comments computed - 最终结构:', topLevelComments.map(c => ({
    commentId: c.commentId,
    content: c.content.substring(0, 20) + '...',
    repliesCount: c.replies.length,
    replies: c.replies.map(r => ({
      commentId: r.commentId,
      content: r.content.substring(0, 20) + '...',
      replyToCommentId: r.replyToCommentId,
      parentCommentId: r.parentCommentId
    }))
  })));

  return topLevelComments;
});

const isOwnMoment = computed(() => {
  return moment.value?.userPub === currentUserPub.value;
});

const canDeleteComment = (comment: CommentHow) => {
  return isOwnMoment.value || comment.userPub === currentUserPub.value;
};

const isBase64Image = (text: string): boolean => {
  const imageRegex = /^data:image\/(jpeg|png|gif|bmp|webp);base64,/i;
  return imageRegex.test(text);
};

const getImages = (moment: MomentV2): string[] => {
  const parts = moment.content.split('\n');
  return parts
    .map((part, index) => {
      if (part === '[IMAGE]' && index + 1 < parts.length && isBase64Image(parts[index + 1])) {
        return parts[index + 1];
      }
      return null;
    })
    .filter((img): img is string => img !== null);
};

const getText = (moment: MomentV2): string => {
  const parts = moment.content.split('\n');
  return parts.filter((part) => part !== '[IMAGE]' && !isBase64Image(part)).join('\n');
};

const truncateComment = (content: string): string => {
  return content.length > 50 ? content.substring(0, 47) + '...' : content;
};

// 转发评论内容字数限制（50字）
const truncateForwardContent = (content: string): string => {
  if (!content) return '';
  return content.length > 50 ? content.substring(0, 50) + '...' : content;
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
  return comment ? comment.userPub : 'unknown';
};

const scrollToInput = async () => {
  if (contentEl.value && textareaEl.value) {
    const rect = textareaEl.value.getBoundingClientRect();
    const content = contentEl.value as any;
    await content.scrollToPoint(0, rect.top + content.scrollTop - 100, 300);
  }
};

const onFocus = () => {
  isFocused.value = true;
  if (keyboardHeight.value > 0) {
    setTimeout(() => scrollToInput(), 300);
  }
  if (textareaEl.value) {
    setTimeout(() => textareaEl.value?.setFocus(), 100);
  }
  nextTick(() => scrollToInput());
};

const onBlur = () => {
  if (isFocused.value) {
    isFocused.value = false;
  }
};

const handleDocumentClick = (event: MouseEvent) => {
  if (textareaEl.value && capsuleRef.value && !capsuleRef.value.contains(event.target as Node)) {
    isFocused.value = false;
    textareaEl.value?.blur();
    if ('Capacitor' in window) {
      Keyboard.hide();
    }
  }
};

onMounted(() => {
  const hasCapacitor = 'Capacitor' in window;
  document.addEventListener('click', handleDocumentClick);

  if (hasCapacitor) {
    Keyboard.setResizeMode({ mode: KeyboardResize.None });

    Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
      keyboardHeight.value = info.keyboardHeight;
      if (isFocused.value) {
        setTimeout(() => scrollToInput(), 300);
        textareaEl.value?.setFocus();
      }
    });

    Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0;
      nextTick(() => {
        if (capsuleRef.value) capsuleRef.value.style.transform = 'none';
      });
    });
  } else {
    if (window.visualViewport) {
      const resizeHandler = () => {
        const vh = window.visualViewport!.height;
        const wh = window.innerHeight;
        const newHeight = wh - vh;
        keyboardHeight.value = newHeight > 0 ? newHeight : 0;
        if (isFocused.value && newHeight > 0) {
          setTimeout(() => scrollToInput(), 300);
        }
      };
      window.visualViewport.addEventListener('resize', resizeHandler);
      onUnmounted(() => {
        window.visualViewport!.removeEventListener('resize', resizeHandler);
      });
    }
  }
});

onUnmounted(() => {
 // console.log('清理评论监听器');
  if (commentListener) {
    commentListener.off();
    commentListener = null;
  }
  document.removeEventListener('click', handleDocumentClick);
  const hasCapacitor = 'Capacitor' in window;
  if (hasCapacitor) {
    Keyboard.removeAllListeners();
  }
});

watch(() => momentState.selectedMomentId, async (newMomentId) => {
  if (newMomentId) {
    if (commentListener) {
      commentListener.off();
      commentListener = null;
    }
    await getComments(newMomentId);
    listenCommentsFromGun();
  }
});

let commentListener: any = null;

const listenCommentsFromGun = () => {
  if (!momentState.selectedMomentId) {
    console.warn('momentState.selectedMomentId 为空，跳过监听');
    return;
  }
  if (commentListener) {
    commentListener.off();
    commentListener = null;
  }
  
  console.log('开始监听评论实时更新');
  
  commentListener = gun
    .get('moments')
    .get(momentState.selectedMomentId)
    .get('comments')
    .map()
    .on((data: any, commentId: string) => {
      console.log('Gun.js实时监听收到评论:', { commentId, data });
      
      if (data && commentId !== '_' && !data.isDeleted) {
        const comment: CommentHow = {
          commentId,
          momentId: momentState.selectedMomentId!,
          userPub: data.userPub || 'unknown',
          content: data.content || '[空]',
          timestamp: data.timestamp || Date.now(),
          replyToCommentId: data.replyToCommentId ?? null,
          parentCommentId: data.parentCommentId ?? null,
          isDeleted: data.isDeleted || 0,
        };
        
        console.log('处理新评论:', {
          commentId: comment.commentId,
          content: comment.content.substring(0, 20) + '...',
          parentCommentId: comment.parentCommentId,
          replyToCommentId: comment.replyToCommentId,
          timestamp: comment.timestamp
        });
        
        // 预加载新评论作者的昵称
        if (comment.userPub !== currentUserPub.value) {
          getBuddyAlias(comment.userPub);
        }
        
        const existingComments = momentComments.value[momentState.selectedMomentId!] || [];
        const existingIndex = existingComments.findIndex((c) => c.commentId === commentId);
        
        if (existingIndex === -1) {
          console.log('新增评论到列表');
          existingComments.push(comment);
        } else {
          console.log('更新现有评论');
          // 如果是临时评论被实时数据确认，保持原有评论
          const existingComment = existingComments[existingIndex];
          if ((existingComment as any).__temp) {
            // 临时评论被确认，移除临时标记
            existingComments[existingIndex] = comment;
          } else if (existingComment.timestamp <= comment.timestamp) {
            // 只有时间戳更新或相等时才更新，避免旧数据覆盖新数据
            existingComments[existingIndex] = comment;
          }
        }
        
        // 按时间戳排序并去重
        const uniqueComments = Array.from(
          new Map(existingComments.map(c => [c.commentId, c])).values()
        ).sort((a, b) => a.timestamp - b.timestamp);
        
        momentComments.value[momentState.selectedMomentId!] = uniqueComments;
        momentComments.value = { ...momentComments.value };
        
        console.log('评论列表已更新，当前评论数:', uniqueComments.length);
      } else if (data === null || data.isDeleted) {
        console.log('删除评论:', commentId);
        const currentComments = momentComments.value[momentState.selectedMomentId!] || [];
        momentComments.value[momentState.selectedMomentId!] = currentComments.filter(
          (c) => c.commentId !== commentId
        );
        momentComments.value = { ...momentComments.value };
      }
    }, { change: true });
};

  const postComment = async () => {
    if (!inputContent.value.trim()) {
      showToast(t('inputValueNull'), 'warning');
      return;
    }
    if (!momentState.selectedMomentId) {
      showToast(t('errorAboutId'), 'error');
     // console.error('postComment: momentState.selectedMomentId 为空');
      return;
    }
  try {
    const inputValue = inputContent.value;
    inputContent.value = '';
   // console.log('发布顶层评论:', { momentId: momentState.selectedMomentId, content: inputValue });
    await addComment(momentState.selectedMomentId, inputValue);
    // 移除手动刷新，依赖Gun.js实时监听来更新评论列表
    nextTick(() => scrollToInput());
  } catch (error: any) {
   // console.error('发布顶层评论失败:', error);
   // showToast(`发布评论失败: ${error.message || '未知错误'}`, 'error');
  }
};

const replyToParentComment = (comment: CommentHow) => {
 // console.log('设置顶层评论回复目标:', { commentId: comment.commentId });
  replyingTo.value = { comment, parentComment: null };
  inputContent.value = '';
  if (textareaEl.value) {
    setTimeout(() => {
      textareaEl.value?.setFocus();
      scrollToInput();
    }, 100);
  }
};

const replyToSubComment = (targetComment: CommentHow, parentComment: CommentHow) => {
  // targetComment 是要回复的评论（可能是父评论或子评论）
  // parentComment 是顶级父评论
  console.log('设置子评论回复目标:', { 
    targetCommentId: targetComment.commentId, 
    targetCommentContent: targetComment.content,
    parentCommentId: parentComment.commentId,
    parentCommentContent: parentComment.content
  });
  
  replyingTo.value = { 
    comment: targetComment, 
    parentComment: parentComment 
  };
  inputContent.value = '';
  if (textareaEl.value) {
    setTimeout(() => {
      textareaEl.value?.setFocus();
      scrollToInput();
    }, 100);
  }
};

  const postReply = async () => {
    if (!inputContent.value.trim()) {
      showToast(t('inputValueNull'), 'warning');
      return;
    }
  if (!replyingTo.value.comment) {
    console.error('postReply: replyingTo.comment 为空');
    return;
  }
  if (!momentState.selectedMomentId) {
    console.error('postReply: momentState.selectedMomentId 为空');
    return;
  }
  try {
    const inputValue = inputContent.value;
    const replyToId = replyingTo.value.comment.commentId;
    
    // 确定 parentCommentId：
    // - 如果有 parentComment，说明是回复子评论，parentCommentId 应该是顶级父评论的ID
    // - 如果没有 parentComment，说明是回复父评论，parentCommentId 应该是 null
    const parentCommentId = replyingTo.value.parentComment?.commentId || null;
    
    console.log('发布回复:', { 
      momentId: momentState.selectedMomentId, 
      replyToId, 
      parentCommentId, 
      content: inputValue,
      replyingToComment: replyingTo.value.comment.content,
      parentComment: replyingTo.value.parentComment?.content || 'null'
    });
    
    inputContent.value = '';
    const replyingToBackup = { ...replyingTo.value }; // 备份用于调试
    replyingTo.value = { comment: null, parentComment: null };
    
    await addComment(momentState.selectedMomentId, inputValue, replyToId, parentCommentId);
    
    console.log('回复发布成功，依赖实时监听更新，不再手动刷新');
    
    // 移除手动刷新，依赖Gun.js实时监听来更新评论列表
    // 这样可以避免与实时监听的冲突
    nextTick(() => scrollToInput());
  } catch (error: any) {
    console.error('发布回复失败:', error);
          showToast(`${t('replyFailed')}: ${error.message || t('unknownError')}`, 'error');
  }
};

const adjustInput = (event: CustomEvent) => {
  const input = event.target as HTMLIonTextareaElement;
  input.style.height = 'auto';
  const newHeight = Math.min(input.scrollHeight, 120);
  input.style.height = `${newHeight}px`;
  if (capsuleRef.value) capsuleRef.value.style.height = `${newHeight + 12}px`;
};

const handleEnterKey = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (replyingTo.value.comment) {
      postReply();
    } else {
      postComment();
    }
  }
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
    dark: true
  });
};

const goToProfile = async (userPub: string) => {
  try {
    // 如果是当前用户，跳转到自己的动态页面
    if (userPub === currentUserPub.value) {
      router.push('/MyMoments');
      return;
    }
    
    // 检查是否为好友
    const isFriend = buddyList.value.some(b => b.pub === userPub);
    
    if (isFriend) {
      // 是好友，跳转到好友动态页面
      setSelectedFriendPub(userPub);
      router.push('/FriendMoments');
    } else {
      // 不是好友，显示搜索状态并检查用户是否存在
      showToast(t('searchingUser'), 'tertiary');
      
      try {
        const userExists = await searchUserProfile(userPub);
        if (userExists) {
          router.push({ path: '/stranger-profile', query: { pub: userPub } });
        } else {
          showToast(t('userNotFound'), 'warning');
        }
      } catch (searchError) {
        console.error('Search error:', searchError);
        showToast(t('searchFailed'), 'error');
      }
    }
  } catch (error) {
    console.error('Error navigating to profile:', error);
    showToast(t('failedOpenProfile'), 'error');
  }
};

// 点赞功能
const toggleLike = (momentId: string) => {
  if (isLiked(momentId)) removeLike(momentId);
  else addLike(momentId);
};

// 转发功能
const openForwardModal = (moment: MomentV2, forwardOriginal: boolean = false) => {
  selectedMomentForForward.value = moment;
  isForwardingOriginal.value = forwardOriginal;
  forwardModalOpen.value = true;
};

const closeForwardModal = () => {
  forwardModalOpen.value = false;
  selectedMomentForForward.value = null;
  isForwardingOriginal.value = false;
};

// 获取原动态转发数量（用于转发动态）
const getOriginalForwardCount = (moment: MomentV2): number => {
  if (!moment.isForward || !moment.originalMomentId) return 0;
  return getForwardCount(moment.originalMomentId);
};

// 转发成功处理
const onForwardSuccess = async (data: { momentId: string; content: string }) => {
  closeForwardModal();
  
  try {
    // 如果是转发的转发动态，则转发原动态
    const targetMomentId = isForwardingOriginal.value && selectedMomentForForward.value?.originalMomentId 
      ? selectedMomentForForward.value.originalMomentId 
      : data.momentId;
    
    // 限制转发内容字数（最多100字）
    const limitedContent = data.content.length > 100 
      ? data.content.substring(0, 100) + '...' 
      : data.content;
    
    // 执行转发（forwardMoment现在有乐观更新，会立即显示转发动态）
    forwardMoment(targetMomentId, limitedContent);
    
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
    const toast = await toastController.create({
      message: t('forwardFailed'),
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};

const goBack = () => {
  router.go(-1);
  hideMomentDetails();
};

const showToast = async (message: string, color: string) => {
  const toast = await import('@ionic/vue').then(m => m.toastController.create({
    message,
    color,
    duration: 2000,
    position: 'top',
  }));
  await toast.present();
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
  backdrop-filter: blur(10px);
}

ion-title {
  font-size: 1.2em;
  font-weight: 700;
}

.post-container {
  padding: 16px;
  position: fixed;
  bottom: 0;
  width: 100%;
  transition: all 0.3s ease;
  z-index: 100;
  background: transparent;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: 50px;
  animation: glow1 4s linear infinite;
  overflow: visible;
  transition: all 0.3s ease;
}

ion-textarea {
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  border-radius: 50px;
  background: var(--ion-background-color);
  font-size: 16px;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
  flex: 1;
  overflow: visible;
  max-height: 120px;
}

ion-textarea.dynamic-textarea {
  transition: width 0.5s ease;
  width: calc(100% - 55px);
}

ion-textarea.dynamic-textarea.no-button {
  width: 100%;
  transition: width 0.5s ease;
}

ion-textarea:focus {
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
}

@keyframes glow1 {
  0% {
    box-shadow: 0 0 35px rgba(255, 105, 180, 0.8), 0 0 50px rgba(255, 165, 0, 0.5);
  }
  33% {
    box-shadow: 0 0 35px rgba(0, 191, 255, 0.8), 0 0 50px rgba(255, 105, 180, 0.5);
  }
  66% {
    box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), 0 0 50px rgba(0, 191, 255, 0.5);
  }
  100% {
    box-shadow: 0 0 35px rgba(255, 105, 180, 0.8), 0 0 50px rgba(255, 165, 0, 0.5);
  }
}

.send-button {
  border: none;
  height: 39px;
  width: 39px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 1;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.send-button.hide {
  opacity: 0;
  transform: scale(0);
}

.send-button ion-icon {
  font-size: 20px;
  color: #fff;
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
  flex-wrap: wrap;
}

.reply-hint .comment-preview {
  display: block;
  font-size: 0.9em;
  color: #b0b0b0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reply-hint ion-button {
  --padding-start: 6px;
  --padding-end: 6px;
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
  padding-bottom: 16px;
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
  display: flex;
  align-items: self-start;
}

/* 动态操作区域样式 */
.moment-actions {
  display: flex;
  gap: 20px;
  padding: 8px 16px;
  justify-content: flex-end;
  border-top: 1px solid var(--ion-color-step-150, #e0e0e0);
  margin-top: 8px;
}

.moment-actions ion-button {
  --padding-start: 6px;
  --padding-end: 6px;
  color: #767676;
}

.moment-actions ion-button span {
  margin-left: 4px;
  font-size: 0.9em;
}

/* 评论区样式 */
.comments-section {
  padding: 16px 0;
}

.no-comments {
  text-align: center;
  padding: 32px 16px;
  color: #8795a1;
  font-style: italic;
}

.comment-thread {
  margin-bottom: 24px;
}

.parent-comment {
  margin-bottom: 8px;
}

.comment-item-wrapper {
  display: flex;
  gap: 12px;
  padding: 0 16px;
}

.comment-content-wrapper {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.comment-user {
  font-size: 1em;
  font-weight: 600;
  margin: 0;
  color: var(--ion-color-primary);
  cursor: pointer;
}

.comment-timestamp {
  color: #8795a1;
  font-size: 0.75em;
  margin: 0;
}

.comment-bubble {
  background: var(--ion-color-light, #f4f5f8);
  border-radius: 16px;
  padding: 12px 16px;
  margin-bottom: 8px;
  position: relative;
}

.reply-bubble {
  background: var(--ion-color-step-50, #f9f9f9);
  border: 1px solid var(--ion-color-step-150, #e0e0e0);
}

.comment-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.95em;
  line-height: 1.5;
  margin: 0;
  color: var(--ion-text-color);
}

.comment-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.comment-actions ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
  font-size: 0.8em;
  height: 28px;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.comment-avatar:hover {
  transform: scale(1.05);
}

.reply-avatar {
  width: 32px;
  height: 32px;
}

/* 回复区域样式 */
.replies-section {
  margin-left: 32px;
  padding-left: 16px;
  border-left: 2px solid var(--ion-color-step-150, #e0e0e0);
  margin-top: 8px;
}

.reply-comment {
  margin-bottom: 12px;
}

.reply-target {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  font-size: 0.8em;
  color: #8795a1;
}

.reply-target ion-icon {
  font-size: 12px;
}

.reply-to-user {
  color: var(--ion-color-primary);
  font-weight: 500;
}

.reply-preview {
  background: var(--ion-color-step-100, #f0f0f0);
  border-radius: 8px;
  padding: 4px 8px;
  font-style: italic;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 回复提示样式 */
.reply-hint-container {
  display: flex;
  align-items: center;
  background: var(--ion-color-light, #f4f5f8);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-left: 3px solid var(--ion-color-primary);
}

.reply-hint-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.reply-icon {
  color: var(--ion-color-primary);
  font-size: 16px;
}

.reply-info {
  flex: 1;
  min-width: 0;
}

.reply-target {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.reply-label {
  font-size: 0.8em;
  color: #8795a1;
}

.reply-user {
  color: var(--ion-color-primary);
  font-weight: 600;
  font-size: 0.9em;
}

.reply-preview {
  font-size: 0.85em;
  color: #666;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 4px 8px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cancel-reply-btn {
  --padding-start: 8px;
  --padding-end: 8px;
  margin-left: auto;
}
</style>