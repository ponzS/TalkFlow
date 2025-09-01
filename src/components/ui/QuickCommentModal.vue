<template>
  <ion-modal :is-open="isOpen" @didDismiss="$emit('close')" class="quick-comment-modal">
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ $t('quickComment') || '快速评论' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" v-if="moment">
      <!-- 动态预览 -->
      <div class="moment-preview">
        <div class="preview-header">
          <ion-avatar class="preview-avatar">
            <img :src="getAvatarWithFallback(moment.userPub)" alt="Avatar" />
          </ion-avatar>
          <div class="preview-info">
            <h3 class="preview-name">{{ getBuddyAlias(moment.userPub) }}</h3>
            <p class="preview-time">{{ formatTimestamp(moment.timestamp) }}</p>
          </div>
        </div>
        
        <!-- 转发动态的转发内容预览 -->
        <div v-if="moment.isForward && moment.forwardContent" class="preview-forward-content">
          <p class="forward-text">{{ truncateForwardContent(moment.forwardContent) }}</p>
        </div>
        
        <!-- 原动态内容预览 -->
        <div v-if="!moment.isForward && getText(moment)" class="preview-content">
          <p class="content-text">{{ truncateContent(getText(moment)) }}</p>
        </div>
        
        <!-- 转发动态的原动态预览 -->
        <div v-if="moment.isForward && moment.originalMomentId" class="preview-original">
          <p class="original-label">{{ $t('originalMoment') || '原动态' }}</p>
        </div>
        
        <!-- 图片预览 -->
        <div v-if="!moment.isForward && getImages(moment).length > 0" class="preview-images">
          <img 
            v-for="(img, index) in getImages(moment).slice(0, 3)" 
            :key="index"
            :src="img" 
            class="preview-image"
            alt="Preview Image"
          />
          <div v-if="getImages(moment).length > 3" class="more-images-indicator">
            +{{ getImages(moment).length - 3 }}
          </div>
        </div>
      </div>

      <!-- 评论统计 -->
      <div class="comment-stats">
        <ion-icon :icon="chatbubblesOutline"></ion-icon>
        <span>{{ commentCount }} {{ $t('comments') || '条评论' }}</span>
      </div>

      <!-- 查看所有评论提示 -->
      <div v-if="commentCount > 0" class="view-comments-hint">
        <p class="hint-text">{{ $t('tapToViewAllComments') || '点击动态查看所有评论' }}</p>
      </div>

      <!-- 评论输入区域 -->
      <div class="comment-input-section">
        <ion-textarea
          v-model="commentContent"
          :placeholder="$t('writeComment') || '写评论...'"
          auto-grow
          :rows="2"
          class="comment-input"
          :disabled="isSubmitting"
        ></ion-textarea>
        
        <div class="input-actions">
          <div class="char-count" :class="{ 'over-limit': commentContent.length > 500 }">
            {{ commentContent.length }}/500
          </div>
          <ion-button 
            @click="submitComment" 
            :disabled="!commentContent.trim() || isSubmitting || commentContent.length > 500"
            fill="solid"
            class="submit-btn"
          >
            <ion-icon v-if="!isSubmitting" :icon="sendOutline"></ion-icon>
            <ion-spinner v-else name="crescent" class="small-spinner"></ion-spinner>
            {{ isSubmitting ? ($t('submitting') || '发送中...') : ($t('send') || '发送') }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonAvatar, IonTextarea, IonSpinner, toastController
} from '@ionic/vue';
import {
  closeOutline, chatbubblesOutline, sendOutline
} from 'ionicons/icons';
import { useMoments, type CommentHow } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';

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
  commentSuccess: [];
}>();

const { t } = useI18n();
const { isDark } = useTheme();
const momentsCore = useMoments();
const { 
  getBuddyAlias, 
  formatTimestamp, 
  momentComments, 
  addComment, 
  getComments 
} = momentsCore;

const chatFlow = getTalkFlowCore();
const { userAvatars } = chatFlow;

const commentContent = ref('');
const isSubmitting = ref(false);

// 计算属性
const commentCount = computed(() => {
  if (!props.moment) return 0;
  return momentComments.value[props.moment.momentId]?.length || 0;
});



// 工具函数
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

const truncateContent = (text: string): string => {
  if (!text) return '';
  return text.length > 80 ? text.substring(0, 80) + '...' : text;
};

const truncateForwardContent = (text: string): string => {
  if (!text) return '';
  return text.length > 50 ? text.substring(0, 50) + '...' : text;
};

const getAvatarWithFallback = (userPub: string): string => {
  const avatar = userAvatars.value[userPub];
  return avatar && avatar.trim() !== '' ? avatar : getGunAvatar(userPub);
};

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  }as any);
};

// 提交评论
const submitComment = async () => {
  if (!props.moment || !commentContent.value.trim()) return;
  
  isSubmitting.value = true;
  try {
    await addComment(props.moment.momentId, commentContent.value.trim());
    
    // 显示成功提示
    const toast = await toastController.create({
      message: t('commentSuccess') || '评论成功',
      duration: 2000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
    
    // 清空输入框
    commentContent.value = '';
    
    // 通知父组件评论成功
    emit('commentSuccess');
    
    // 关闭弹窗
    emit('close');
    
  } catch (error: any) {
    console.error('评论失败:', error);
    
    // 智能错误处理和修复建议
    let errorMessage = t('commentFailed') || '评论失败，请重试';
    let fixSuggestion = '';
    
    if (error.message && error.message.includes('timeout')) {
      errorMessage = '网络连接超时';
      fixSuggestion = '请检查网络连接后重试';
    } else if (error.message && error.message.includes('Network')) {
      errorMessage = '网络连接异常';
      fixSuggestion = '建议切换网络或重启应用';
    } else if (error.message && error.message.includes('Gun')) {
      errorMessage = '数据库连接失败';
      fixSuggestion = '请点击动态页面右上角齿轮图标进行诊断';
    }
    
    const toast = await toastController.create({
      message: `${errorMessage}${fixSuggestion ? ' - ' + fixSuggestion : ''}`,
      duration: 4000,
      position: 'top',
      color: 'danger',
      buttons: fixSuggestion ? [
        {
          text: '了解详情',
          handler: () => {
            // 可以在这里添加跳转到诊断页面的逻辑
            console.log('用户点击了解详情');
          }
        }
      ] : undefined,
    });
    await toast.present();
  } finally {
    isSubmitting.value = false;
  }
};

// 监听弹窗打开，加载评论
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.moment) {
    try {
      await getComments(props.moment.momentId);
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  }
});

// 弹窗关闭时清空输入
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    commentContent.value = '';
    isSubmitting.value = false;
  }
});
</script>

<style scoped>
.quick-comment-modal {
  --height: 70vh;
  --border-radius: 20px 20px 0 0;
  --backdrop-opacity: 0.6;
}

:deep(.modal-wrapper) {
  align-items: flex-end;
}

ion-toolbar {
  --background: var(--ion-background-color);
  --border-width: 0;
  --padding-top: 8px;
  --padding-bottom: 8px;
}

ion-title {
  font-size: 1.1em;
  font-weight: 600;
}

/* 动态预览样式 */
.moment-preview {
  background: var(--ion-color-light, #f8f9fa);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.preview-avatar {
  width: 32px;
  height: 32px;
}

.preview-info {
  flex: 1;
}

.preview-name {
  font-size: 0.9em;
  font-weight: 600;
  margin: 0;
  color: var(--ion-color-primary);
}

.preview-time {
  font-size: 0.75em;
  color: var(--ion-color-medium);
  margin: 2px 0 0;
}

.preview-forward-content, .preview-content {
  margin-bottom: 8px;
}

.forward-text, .content-text {
  font-size: 0.85em;
  line-height: 1.4;
  color: var(--ion-text-color);
  margin: 0;
}

.preview-original {
  margin-bottom: 8px;
}

.original-label {
  font-size: 0.8em;
  color: var(--ion-color-medium);
  font-style: italic;
  margin: 0;
}

.preview-images {
  display: flex;
  gap: 4px;
  position: relative;
}

.preview-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--ion-color-step-150, #d0d0d0);
}

.more-images-indicator {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75em;
  font-weight: 600;
}

/* 评论统计样式 */
.comment-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 8px 0;
  border-bottom: 1px solid var(--ion-color-step-150, #e0e0e0);
}

.comment-stats ion-icon {
  color: var(--ion-color-medium);
  font-size: 1.1em;
}

.comment-stats span {
  color: var(--ion-color-medium);
  font-size: 0.9em;
}

/* 查看所有评论提示样式 */
.view-comments-hint {
  margin-bottom: 16px;
  text-align: center;
  padding: 12px;
  background: var(--ion-color-step-50, #f9f9f9);
  border-radius: 8px;
  border: 1px dashed var(--ion-color-step-200, #e0e0e0);
}

.hint-text {
  font-size: 0.85em;
  color: var(--ion-color-medium);
  margin: 0;
  font-style: italic;
}

/* 评论输入样式 */
.comment-input-section {
  background: var(--ion-background-color);
  border-top: 1px solid var(--ion-color-step-150, #e0e0e0);
  padding: 12px 0 0;
  margin: 0 -16px -16px;
  padding-left: 16px;
  padding-right: 16px;
}

.comment-input {
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  background: var(--ion-color-light, #f8f9fa);
  border-radius: 20px;
  margin-bottom: 8px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.char-count {
  font-size: 0.75em;
  color: var(--ion-color-medium);
}

.char-count.over-limit {
  color: var(--ion-color-danger);
}

.submit-btn {
  --padding-start: 16px;
  --padding-end: 16px;
  --border-radius: 20px;
  height: 36px;
  font-size: 0.9em;
}

.small-spinner {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .moment-preview {
    background: var(--ion-color-step-100, #2a2a2a);
  }
  
  .view-comments-hint {
    background: var(--ion-color-step-100, #2a2a2a);
    border-color: var(--ion-color-step-300, #555);
  }
  
  .comment-input {
    background: var(--ion-color-step-100, #2a2a2a);
  }
}
</style> 