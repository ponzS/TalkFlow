<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar>
        <ion-buttons slot="start">
        <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>Notifications</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="markAllAsRead" fill="clear" v-if="unreadCount > 0">
            <span style="font-size: 0.9em;">Mark All Read</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">


           <ion-header collapse="condense" >
          <ion-toolbar>
<ion-title>Notifications</ion-title>
          </ion-toolbar>
        </ion-header>



      <div v-if="notifications.length === 0 && !loading" class="no-notifications">
        <ion-icon :icon="notificationsOffOutline" size="large"></ion-icon>
        <p>No notifications yet</p>
      </div>

      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading...</p>
      </div>

      <div class="notifications-container" v-if="notifications.length > 0">
        <div 
          v-for="notification in notifications" 
          :key="notification.notificationId" 
          class="notification-item"
          :class="{ 'unread': !notification.isRead }"
          @click="handleNotificationClick(notification)"
        >
          <!-- 头像 -->
          <ion-avatar class="notification-avatar">
            <img :src="getAvatarWithFallback(notification.fromUserPub)" alt="Avatar" />
          </ion-avatar>

          <!-- 通知内容 -->
          <div class="notification-content">
            <!-- 用户名和操作 -->
            <div class="notification-header">
              <span class="user-name">{{ getBuddyAlias(notification.fromUserPub) }}</span>
              <span class="action-text">{{ getNotificationTypeText(notification.type) }}</span>
              <ion-icon 
                :icon="getNotificationIcon(notification.type)" 
                class="action-icon"
                :class="getNotificationIconClass(notification.type)"
              ></ion-icon>
            </div>

            <!-- 评论内容（如果是评论通知） -->
            <div v-if="notification.type === 'comment' && notification.commentContent" class="comment-preview">
              <p class="comment-text">"{{ notification.commentContent }}"</p>
            </div>

            <!-- 动态预览 -->
            <div class="moment-preview">
              <p class="preview-text">{{ notification.momentPreview || '无内容预览' }}</p>
            </div>

            <!-- 时间戳 -->
            <div class="notification-time">
              <span>{{ formatTimestamp(notification.timestamp) }}</span>
            </div>
          </div>

          <!-- 未读标识 -->
          <div v-if="!notification.isRead" class="unread-dot"></div>

          <!-- 删除按钮 -->
          <ion-button 
            fill="clear" 
            color="medium" 
            size="small"
            @click.stop="deleteNotification(notification.notificationId)"
            class="delete-btn"
          >
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonTitle,
  IonButton, IonIcon, IonAvatar, IonSpinner
} from '@ionic/vue';
import {
  notificationsOffOutline, closeOutline, heartOutline, heart, shareOutline, chatbubbleOutline
} from 'ionicons/icons';
import useNotifications, { type NotificationType, type NotificationItem } from '@/composables/useNotifications';
import { useMoments } from '@/composables/useMoments';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';

const router = useRouter();
const { isDark } = useTheme();
const chatFlow = getTalkFlowCore();
const { userAvatars } = chatFlow;
const { showMomentDetails, formatTimestamp } = useMoments();

const {
  notifications,
  unreadCount,
  loadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getBuddyAlias,
  getNotificationTypeText,
  listenForNotifications
} = useNotifications();

const loading = ref(true);

onMounted(async () => {
  // console.log('📱 [DEBUG] Notifications page mounted');
  await loadNotifications();
  listenForNotifications();
  loading.value = false;
});

onUnmounted(() => {
  // console.log('📱 [DEBUG] Notifications page unmounted');
});

const goBack = () => {
  router.go(-1);
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

const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case 'like':
      return heart;
    case 'forward':
      return shareOutline;
    case 'comment':
      return chatbubbleOutline;
    default:
      return notificationsOffOutline;
  }
};

const getNotificationIconClass = (type: NotificationType): string => {
  switch (type) {
    case 'like':
      return 'like-icon';
    case 'forward':
      return 'forward-icon';
    case 'comment':
      return 'comment-icon';
    default:
      return '';
  }
};

const handleNotificationClick = async (notification: NotificationItem) => {
  // 标记为已读
  if (!notification.isRead) {
    await markAsRead(notification.notificationId);
  }
  
  // 跳转到对应动态详情
  showMomentDetails(notification.momentId);
};
</script>

<style scoped>
.no-notifications {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: var(--ion-color-medium);
}

.no-notifications ion-icon {
  margin-bottom: 16px;
  font-size: 4rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 30vh;
  color: var(--ion-color-medium);
}

.loading-container ion-spinner {
  margin-bottom: 16px;
}

.notifications-container {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  margin-bottom: 8px;
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-step-150, #e0e0e0);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.notification-item:active {
  background-color: var(--ion-color-step-100, #f0f0f0);
  transform: scale(0.98);
}

.notification-item.unread {
  border-left: 4px solid var(--ion-color-primary);
  background: var(--ion-color-primary-tint, rgba(var(--ion-color-primary-rgb), 0.05));
}

.notification-avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.user-name {
  font-weight: 600;
  color: var(--ion-color-primary);
  font-size: 0.95em;
}

.action-text {
  font-size: 0.9em;
  color: var(--ion-text-color);
}

.action-icon {
  font-size: 1.1em;
}

.like-icon {
  color: var(--ion-color-danger);
}

.forward-icon {
  color: var(--ion-color-success);
}

.comment-icon {
  color: var(--ion-color-primary);
}

.comment-preview {
  margin-bottom: 8px;
  padding: 8px 12px;
  background: var(--ion-color-step-50, #f9f9f9);
  border-radius: 8px;
  border-left: 3px solid var(--ion-color-primary);
}

.comment-text {
  font-size: 0.9em;
  line-height: 1.4;
  margin: 0;
  color: var(--ion-text-color);
  font-style: italic;
}

.moment-preview {
  margin-bottom: 8px;
  padding: 8px 12px;
  background: var(--ion-color-step-50, #f9f9f9);
  border-radius: 8px;
}

.preview-text {
  font-size: 0.85em;
  line-height: 1.4;
  margin: 0;
  color: var(--ion-color-medium);
}

.notification-time {
  margin-top: 4px;
}

.notification-time span {
  font-size: 0.8em;
  color: var(--ion-color-medium);
}

.unread-dot {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  background: var(--ion-color-primary);
  border-radius: 50%;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  --padding-start: 6px;
  --padding-end: 6px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.notification-item:hover .delete-btn {
  opacity: 1;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .notification-item {
    background: var(--ion-color-step-50, #2a2a2a);
    border-color: var(--ion-color-step-200, #404040);
  }
  
  .notification-item:active {
    background-color: var(--ion-color-step-200, #333);
  }
  
  .comment-preview,
  .moment-preview {
    background: var(--ion-color-step-100, #333);
  }
}
</style>