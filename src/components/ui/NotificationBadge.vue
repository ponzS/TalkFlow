<template>
  <transition name="badge-fade">
    <div 
      v-if="unreadCount > 0" 
      class="notification-badge"
      @click="goToNotifications"
    >
      <ion-icon :icon="notificationsOutline" class="badge-icon"></ion-icon>
      <span class="badge-text">{{ unreadCount }} New notice</span>
      <ion-icon :icon="chevronForwardOutline" class="arrow-icon"></ion-icon>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IonIcon } from '@ionic/vue';
import { notificationsOutline, chevronForwardOutline } from 'ionicons/icons';
import useNotifications from '@/composables/useNotifications';

const router = useRouter();
const { unreadCount } = useNotifications();

const goToNotifications = () => {
  router.push('/notifications');
};
</script>

<style scoped>
.notification-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin: 16px 16px 8px;
  background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-primary-shade) 100%);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.3);
  animation: pulse-glow 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
}

.notification-badge:active {
  transform: scale(0.96);
  box-shadow: 0 1px 4px rgba(var(--ion-color-primary-rgb), 0.4);
}

.notification-badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.notification-badge:hover::before {
  left: 100%;
}

.badge-icon {
  color: white;
  font-size: 1.2em;
  flex-shrink: 0;
}

.badge-text {
  color: white;
  font-weight: 600;
  font-size: 0.9em;
  flex: 1;
  white-space: nowrap;
}

.arrow-icon {
  color: white;
  font-size: 1em;
  opacity: 0.8;
  flex-shrink: 0;
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.3);
  }
  50% {
    box-shadow: 0 4px 16px rgba(var(--ion-color-primary-rgb), 0.5);
  }
  100% {
    box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.3);
  }
}

.badge-fade-enter-active,
.badge-fade-leave-active {
  transition: all 0.4s ease;
}

.badge-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.badge-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

/* 大屏幕适配 */
@media (min-width: 600px) {
  .notification-badge {
    max-width: 600px;
    margin: 16px auto 8px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .notification-badge {
    box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.4);
  }
  
  .notification-badge:active {
    box-shadow: 0 1px 4px rgba(var(--ion-color-primary-rgb), 0.5);
  }
}
</style> 