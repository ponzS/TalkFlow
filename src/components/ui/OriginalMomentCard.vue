<template>
  <div class="original-moment-card" @click="goToOriginalMoment" v-if="originalMoment">
    <div class="card-header">
      <ion-avatar class="author-avatar" @click.stop="goToAuthorProfile">
        <img :src="getAvatarWithFallback(originalMoment.userPub)" alt="Author Avatar" style="width: 100%; height: 100%;object-fit: cover;"/>
      </ion-avatar>
      <div class="author-info">
        <h4 class="author-name" @click.stop="goToAuthorProfile">
          {{ getBuddyAlias(originalMoment.userPub) }}
        </h4>
        <p class="publish-time">{{ formatTimestamp(originalMoment.timestamp) }}</p>
      </div>
    </div>
    
    <div class="card-content">
      <!-- 原动态的图片 -->
      <div v-if="getImages(originalMoment).length > 0" class="moment-images">
        <img 
          v-for="(img, index) in getImages(originalMoment).slice(0, 3)" 
          :key="index"
          :src="img" 
          class="moment-image"
          alt="Moment Image"
        />
        <div v-if="getImages(originalMoment).length > 3" class="more-images">
          +{{ getImages(originalMoment).length - 3 }}
        </div>
      </div>
      
      <!-- 原动态的文字内容 -->
      <div v-if="getText(originalMoment)" class="moment-text">
        <p class="text-content">{{ truncateText(getText(originalMoment), 120) }}</p>
      </div>
    </div>
    
    <div class="card-footer">
      <div class="footer-stats">
        <div class="stat-item">
          <ion-icon :icon="heartOutline" class="stat-icon"></ion-icon>
          <span class="stat-count">{{ getLikeCount(originalMoment.momentId) }}</span>
        </div>
        <div class="stat-item">
          <ion-icon :icon="chatbubblesOutline" class="stat-icon"></ion-icon>
          <span class="stat-count">{{ getCommentCount(originalMoment.momentId) }}</span>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="original-moment-card deleted">
    <div class="deleted-content">
      <ion-icon :icon="trashOutline" class="deleted-icon"></ion-icon>
      <p class="deleted-text">{{ $t('originalMomentDeleted') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { IonAvatar, IonIcon } from '@ionic/vue';
import { timeOutline, trashOutline, heartOutline, chatbubblesOutline } from 'ionicons/icons';
import { useMoments, type MomentV2 } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';

// Props
interface Props {
  originalMomentId: string;
  originalAuthor: string;
}

const props = defineProps<Props>();

// Setup
mountClass();
const router = useRouter();
const { t } = useI18n();
const { isDark } = useTheme();
const momentsCore = useMoments();
const { formatTimestamp, getBuddyAlias, getLikeCount, momentComments } = momentsCore;

// 获取评论数量
const getCommentCount = (momentId: string): number => {
  return momentComments.value[momentId]?.filter(c => c.isDeleted === 0).length || 0;
};
const chatFlow = getTalkFlowCore();
const { gun, userAvatars, currentUserPub, setSelectedFriendPub, searchUserProfile } = chatFlow;

// State
const originalMoment = ref<MomentV2 | null>(null);
const loading = ref(false);

// Methods
const loadOriginalMoment = async () => {
  if (!props.originalMomentId) return;
  
  loading.value = true;
  try {
    await new Promise<void>((resolve) => {
      gun.get('moments').get(props.originalMomentId).once((data: any) => {
        if (data && data.userPub === props.originalAuthor) {
          originalMoment.value = {
            momentId: props.originalMomentId,
            userPub: data.userPub || 'unknown',
            content: data.content || '[Null]',
            timestamp: data.timestamp || Date.now(),
            isHidden: data.isHidden || 0,
            isForward: data.isForward || false,
            originalMomentId: data.originalMomentId,
            originalAuthor: data.originalAuthor,
            forwardContent: data.forwardContent,
          };
        }
        resolve();
      });
    });
  } catch (error) {
    console.error('加载原动态失败:', error);
  } finally {
    loading.value = false;
  }
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

// 专门用于转发评论的截断函数（限制50字）
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
  } as any);
};

const goToOriginalMoment = () => {
  if (originalMoment.value) {
      const userPub = originalMoment.value.userPub;
    router.push({ path: '/friend-profile', query: { pub: userPub } });
   // momentsCore.showMomentDetails(originalMoment.value.momentId);
  }
};

const goToAuthorProfile = async () => {
  if (!originalMoment.value) return;
  
  const userPub = originalMoment.value.userPub;
    router.push({ path: '/friend-profile', query: { pub: userPub } });
};

// Lifecycle
onMounted(() => {
  loadOriginalMoment();
});
</script>

<style scoped>
.original-moment-card {
  border: 1px solid var(--ion-color-step-200, #e0e0e0);
  border-radius: 12px;
  padding: 12px;
  margin: 8px 0;
  background: var(--ion-color-step-50, #f9f9f9);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.original-moment-card:hover {
  border-color: var(--ion-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.original-moment-card.deleted {
  border-color: var(--ion-color-medium);
  background: var(--ion-color-step-100, #f0f0f0);
  cursor: not-allowed;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.author-avatar {
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.author-avatar:hover {
  transform: scale(1.05);
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  font-size: 0.9em;
  font-weight: 600;
  margin: 0;
  color: var(--ion-color-primary);
  cursor: pointer;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.author-name:hover {
  text-decoration: underline;
}

.publish-time {
  font-size: 0.75em;
  color: var(--ion-color-medium);
  margin: 2px 0 0;
}

.card-content {
  margin-bottom: 8px;
}

.moment-images {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  position: relative;
}

.moment-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--ion-color-step-150, #d0d0d0);
}

.more-images {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8em;
  font-weight: 600;
  position: absolute;
  right: 0;
  top: 0;
}

.moment-text {
  margin-bottom: 8px;
}

.text-content {
  font-size: 0.85em;
  line-height: 1.4;
  color: var(--ion-text-color);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.card-footer {
  padding-top: 8px;
  border-top: 1px solid var(--ion-color-step-100, #e8e8e8);
}

.footer-stats {
  display: flex;
  gap: 16px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  font-size: 0.8em;
  color: var(--ion-color-medium);
}

.stat-count {
  font-size: 0.75em;
  color: var(--ion-color-medium);
}

.deleted-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--ion-color-medium);
}

.deleted-icon {
  font-size: 1.2em;
}

.deleted-text {
  font-size: 0.9em;
  margin: 0;
}

/* 深色主题支持 */
@media (prefers-color-scheme: dark) {
  .original-moment-card {
    background: var(--ion-color-step-100, #2a2a2a);
    border-color: var(--ion-color-step-300, #404040);
  }

  .original-moment-card:hover {
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }

  .card-footer {
    border-top-color: var(--ion-color-step-200, #333);
  }
}
</style> 