<template>
  <ion-modal :is-open="isOpen" @did-dismiss="closeModal">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t('forwardPost') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="closeModal">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="forward-content">
        <div class="input-section">
          <ion-textarea
            v-model="forwardContent"
            :placeholder="$t('sayPlaceholder')"
            auto-grow
            :rows="3"
            class="forward-textarea"
          ></ion-textarea>
          <div class="char-count">
            <span :class="{ 'over-limit': forwardContent.length > 280 }">
              {{ forwardContent.length }}/280
            </span>
          </div>
        </div>

        <div class="original-moment-preview" v-if="moment">
          <div class="preview-header">
            <ion-icon :icon="chatboxEllipsesOutline" class="quote-icon"></ion-icon>
            <span class="preview-label">{{ $t('forwardedFrom') }}</span>
          </div>
          
          <div class="preview-card">
            <div class="moment-header">
              <ion-avatar class="avatar">
                <img :src="getAvatarWithFallback(moment.userPub)" alt="Avatar" />
              </ion-avatar>
              <div class="header-info">
                <h4 class="author-name">{{ getBuddyAlias(moment.userPub) }}</h4>
                <p class="timestamp">{{ formatTimestamp(moment.timestamp) }}</p>
              </div>
            </div>
            
            <div class="moment-content">
              <!-- 原动态的图片 -->
              <div v-if="getImages(moment).length > 0" class="moment-images">
                <img 
                  v-for="(img, index) in getImages(moment).slice(0, 4)" 
                  :key="index"
                  :src="img" 
                  class="moment-image"
                  alt="Moment Image"
                />
                <div v-if="getImages(moment).length > 4" class="more-images">
                  +{{ getImages(moment).length - 4 }}
                </div>
              </div>
              
              <!-- 原动态的文字内容 -->
              <div v-if="getText(moment)" class="moment-text">
                <p class="text-content">{{ truncateText(getText(moment), 200) }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <ion-button 
            expand="block" 
            color="primary"
            @click="handleForward"
            :disabled="forwardContent.length > 280"
          >
            <ion-icon :icon="shareOutline" slot="start"></ion-icon>
            {{ $t('forward') }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonContent, IonTextarea, IonAvatar 
} from '@ionic/vue';
import { closeOutline, shareOutline, chatboxEllipsesOutline } from 'ionicons/icons';
import { useMoments, type MomentV2 } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
import { useToast } from '@/composables/useToast';

// Props
interface Props {
  isOpen: boolean;
  moment: MomentV2 | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'forward-success', data: { momentId: string; content: string }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Setup
mountClass();
const { isDark } = useTheme();
const momentsCore = useMoments();
const { forwardMoment, formatTimestamp, getBuddyAlias } = momentsCore;
const chatFlow = getTalkFlowCore();
const { userAvatars, showToast } = chatFlow;
const { t } = useI18n();

// State
const forwardContent = ref('');

// Methods
const closeModal = () => {
  forwardContent.value = '';
  emit('close');
};

const handleForward = async () => {
  if (!props.moment) return;
  
  if (forwardContent.value.length > 280) {
    showToast(t('forwardContentTooLong'), 'warning');
    return;
  }

  // 立即关闭弹窗，不等待转发完成
  const momentId = props.moment.momentId;
  const content = forwardContent.value.trim();
  
  // 发送转发请求并立即关闭弹窗
  emit('forward-success', { momentId, content });
  closeModal();
  
  showToast(t('forwarding'), 'info');
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

const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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
  } as any);
};

// Watch for modal open/close
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    forwardContent.value = '';
  }
});
</script>

<style scoped>
.forward-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.input-section {
  position: relative;
}

.forward-textarea {
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  border: 1px solid var(--ion-color-step-200, #e0e0e0);
  border-radius: 12px;
  background: var(--ion-background-color);
  font-size: 16px;
}

.forward-textarea:focus {
  border-color: var(--ion-color-primary);
  box-shadow: 0 0 0 2px rgba(var(--ion-color-primary-rgb), 0.2);
}

.char-count {
  text-align: right;
  margin-top: 8px;
  font-size: 0.85em;
  color: var(--ion-color-medium);
}

.over-limit {
  color: var(--ion-color-danger);
  font-weight: 600;
}

.original-moment-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.quote-icon {
  color: var(--ion-color-primary);
  font-size: 1.1em;
}

.preview-label {
  font-size: 0.9em;
  color: var(--ion-color-medium);
  font-weight: 500;
}

.preview-card {
  border: 1px solid var(--ion-color-step-200, #e0e0e0);
  border-radius: 12px;
  padding: 16px;
  background: var(--ion-color-step-50, #f9f9f9);
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.moment-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  font-size: 1em;
  font-weight: 600;
  margin: 0;
  color: var(--ion-color-primary);
  display: -webkit-box;

  -webkit-box-orient: vertical;
  overflow: hidden;
}

.timestamp {
  font-size: 0.8em;
  color: var(--ion-color-medium);
  margin: 2px 0 0;
}

.moment-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.moment-images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
  max-width: 100%;
  position: relative;
}

.moment-image {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--ion-color-step-150, #d0d0d0);
}

.more-images {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 600;
}

.moment-text {
  flex: 1;
}

.text-content {
  font-size: 0.95em;
  line-height: 1.5;
  color: var(--ion-text-color);
  margin: 0;
  word-break: break-word;
}

.action-buttons {
  padding: 16px 0 0;
  border-top: 1px solid var(--ion-color-step-100, #e8e8e8);
}

/* 深色主题支持 */
@media (prefers-color-scheme: dark) {
  .forward-textarea {
    border-color: var(--ion-color-step-300, #404040);
    background: var(--ion-background-color);
  }

  .preview-card {
    background: var(--ion-color-step-100, #2a2a2a);
    border-color: var(--ion-color-step-300, #404040);
  }

  .action-buttons {
    border-top-color: var(--ion-color-step-200, #333);
  }
}
</style> 