<template>
  <ion-page>
    <!-- Top Navigation Bar -->
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
          <ion-back-button color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t('setting') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Main Content -->
    <ion-content :fullscreen="true">
      <!-- Account and Security -->
      <ion-list>
        <ion-item button @click="myself" class="cosmic-item">
          <ion-icon slot="start" :icon="personOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('setforme') }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Application Settings -->
      <ion-list>
        <ion-item button @click="notify" class="cosmic-item">
          <ion-icon slot="start" :icon="notificationsOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('notify') }}</ion-label>
        </ion-item>
        <ion-item lines="none" button @click="languageSwitchers" class="cosmic-item">
          <ion-icon slot="start" :icon="globeOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('language') }}</ion-label>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-item button @click="openCapacitorSite" class="cosmic-item">
          <ion-icon slot="start" :icon="cafeOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('help') }}</ion-label>
        </ion-item>
        <ion-item button @click="githubpage" class="cosmic-item">
          <ion-icon slot="start" :icon="homeOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{$t('github')}}</ion-label>
        </ion-item>
        <ion-item lines="none" button @click="sponsorpage" class="cosmic-item">
          <ion-icon slot="start" :icon="heartOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{$t('sponsor')}}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Security and Data -->
      <ion-list>
        <ion-item button @click="KeyCheck" class="cosmic-item">
          <ion-icon slot="start" :icon="keyOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('keysecuritydetection') }}</ion-label>
        </ion-item>
        <ion-item lines="none" button @click="datamove" class="cosmic-item">
          <ion-icon slot="start" :icon="gitPullRequestOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('datamigration') }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Storage and Cache -->
      <ion-list>
        <!-- <ion-item lines="none" button @click="gotoCache" class="cosmic-item">
          <ion-icon slot="start" :icon="cubeOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('cachemanagement') }}</ion-label>
        </ion-item> -->
        <ion-item lines="none" button @click="confirmClearChats" class="cosmic-item">
          <ion-icon slot="start" :icon="trashBinOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('clearthechatrecords') }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Blacklist -->
      <ion-list>
        <ion-item button @click="blackList" class="cosmic-item">
          <ion-icon slot="start" :icon="banOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('blacklist') }}</ion-label>
        </ion-item>
        <ion-item button @click="ReportUser" class="cosmic-item">
          <ion-icon slot="start" :icon="alertOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">Report users</ion-label>
        </ion-item>
      </ion-list>

      <!-- Account Actions -->
      <ion-list>
        <ion-item button @click="confirmDeleteAccount" class="cosmic-item">
          <ion-icon slot="start" :icon="personRemoveOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('destroythekey') }}</ion-label>
        </ion-item>
        <ion-item lines="none" button @click="logout" class="cosmic-item">
          <ion-icon slot="start" :icon="logOutOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{ $t('logout') }}</ion-label>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-item button @click="gotoversionpage" class="cosmic-item">
          <ion-label class="cosmic-label">{{ $t('versiontalk') }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Clear Chats Confirmation Alert -->
      <ion-alert
        :is-open="isClearChatsAlertOpen"
        header="Confirm Clear Chat Records"
        message="This action will delete all local and online chat records, and they cannot be recovered. Are you sure you want to proceed?"
        :buttons="[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              isClearChatsAlertOpen = false;
            },
          },
          {
            text: 'Confirm',
            role: 'confirm',
            handler: () => {
              clearAllChats();
              isClearChatsAlertOpen = false;
            },
          },
        ]"
        @didDismiss="isClearChatsAlertOpen = false"
      ></ion-alert>

      <!-- Delete Account Confirmation Alert -->
      <ion-alert
        :is-open="isDeleteAlertOpen"
        header="Confirm Account Deletion"
        message="This action will permanently delete your account and all associated data, including local data, friend connections, and network data. This action cannot be undone. Are you sure you want to proceed?"
        :buttons="[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              isDeleteAlertOpen = false;
            },
          },
          {
            text: 'Confirm',
            role: 'confirm',
            handler: () => {
              deleteAccount();
              isDeleteAlertOpen = false;
            },
          },
        ]"
        @didDismiss="isDeleteAlertOpen = false"
      ></ion-alert>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Browser } from '@capacitor/browser';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonAlert,
  IonButtons,
  IonBackButton,
} from '@ionic/vue';
import soundManager from '@/composables/sounds';
import {
  personOutline,
  globeOutline,
  lockClosedOutline,
  saveOutline,
  banOutline,
  personRemoveOutline,
  logOutOutline,
  keyOutline,
  gitPullRequestOutline,
  trashBinOutline,
  notificationsOutline,
  alertOutline,
  heartOutline,
  homeOutline,
  cafeOutline,
  browsersOutline,
  cubeOutline,
} from 'ionicons/icons';

const router = useRouter();

const openCapacitorSite = async () => {
  router.push('/help');
};

const languageSwitchers = () => {
  router.push('/i18nset');
};

const notify = () => {
  router.push('/NotificationSettings');
};

const blackList = () => {
  router.push('/blackList');
};

const ReportUser = () => {
  router.push('/ReportPage');
};

const githubpage = () => {
  router.push('/githubpage');
};

const sponsorpage = () => {
  router.push('/Sponsorship');
};

const KeyCheck = () => {
  router.push('/keycheck');
};

const myself = () => {
  router.push('/myself');
};

const datamove = () => {
  router.push('/MigrationChoice');
};

const gotoversionpage = () => {
  router.push('/versiontalkpage');
};

const gotoCache = () => {
  router.push('/storagepage');
};

const { isLoggedIn, deactivateAccount, clearAllChats, onLogout } = useChatFlow();

const deleteAccount = () => {
  deactivateAccount();
};

const isDeleteAlertOpen = ref(false);
const confirmDeleteAccount = () => {
  isDeleteAlertOpen.value = true;
  soundManager.play('click5');
};

const isClearChatsAlertOpen = ref(false);
const confirmClearChats = () => {
  isClearChatsAlertOpen.value = true;
  soundManager.play('click5');
};

const logout = () => {
  router.replace('/');
  onLogout();
  soundManager.play('click5');
};
</script>

<style scoped>
/* Custom styles for Ionic appearance */
ion-list {
  margin-top: 20px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  overflow: visible;
}

ion-item {
  --padding-start: 15px;
  --background: transparent;
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
  
}

ion-item:active {
  --background: rgba(42, 125, 112, 0.1);
}

/* 图标基础样式，使用伪元素实现光晕 */
.cosmic-icon {
  font-size: 24px; /* 调整为更统一的大小 */
  color: rgb(42, 125, 112);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.cosmic-icon::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  transform: translate(-50%, -50%);
  border-radius: 50%; /* 圆形光晕 */
  background: radial-gradient(circle, rgba(42, 125, 112, 0.6) 0%, rgba(42, 125, 112, 0) 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
  pointer-events: none;
}

ion-item:active .cosmic-icon {
  transform: scale(1.1);
}

ion-item:active .cosmic-icon::before {
  opacity: 1;
}

/* 文字光晕 */
.cosmic-label {
  font-size: 20px;
  color: var(--ion-text-color, #000000);
  text-shadow: 0 0 4px var(--ion-text-color, rgba(0, 0, 0, 0.3));
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

ion-item:active .cosmic-label {
  text-shadow: 0 0 6px var(--ion-text-color, rgba(0, 0, 0, 0.5));
}

.liquid-toolbar {
  --border-color: transparent;
  --background: transparent;
  overflow: visible;
}

/* 暗主题适配 */
@media (prefers-color-scheme: dark) {
  ion-list {
    background: rgba(0, 0, 0, 0.2);
  }
  ion-item {
    --background: transparent;
  }
  ion-item:active {
    --background: rgba(42, 125, 112, 0.1);
  }
  .cosmic-label {
    color: #bfcbc7;
    text-shadow: 0 0 4px rgba(191, 203, 199, 0.5);
  }
  ion-item:active .cosmic-label {
    text-shadow: 0 0 6px rgba(191, 203, 199, 0.7);
  }
  .cosmic-icon::before {
    background: radial-gradient(circle, rgba(42, 125, 112, 0.8) 0%, rgba(42, 125, 112, 0) 70%);
  }
  ion-item:active .cosmic-icon::before {
    opacity: 1;
  }
}

/* 亮主题适配 */
@media (prefers-color-scheme: light) {
  ion-list {
    background: rgba(255, 255, 255, 0.2);
  }
  ion-item {
    --background: transparent;
  }
  ion-item:active {
    --background: rgba(42, 125, 112, 0.1);
  }
  .cosmic-label {
    color: #000000;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  }
  ion-item:active .cosmic-label {
    text-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
  }
  .cosmic-icon::before {
    background: radial-gradient(circle, rgba(42, 125, 112, 0.6) 0%, rgba(42, 125, 112, 0) 70%);
  }
  ion-item:active .cosmic-icon::before {
    opacity: 1;
  }
}
</style>