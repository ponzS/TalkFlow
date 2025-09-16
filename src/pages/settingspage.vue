<template>
  <ion-page>
    <!-- Top Navigation Bar -->
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar >
        <ion-buttons slot="start">
        <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t('setting') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Main Content -->
    <ion-content :fullscreen="true" class="settings-content">
      <!-- Version Information Section -->
   <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
      {{ $t('setting') }}
            </h1>
          </ion-toolbar>
        </ion-header>


      <!-- Account and Security Section -->
      <div class="settings-section">
        <!-- <h2 class="section-title">{{ $t('account') }}</h2> -->
        <ion-list class="settings-list">
          <ion-item  button @click="myself" class="cosmic-item">
            <ion-icon slot="start" :icon="personOutline" class="cosmic-icon" style="color:blueviolet" />
            <ion-label class="cosmic-label">{{ $t('setforme') }}</ion-label>
          </ion-item>

         
        </ion-list>
      </div>

      <!-- Application Settings Section -->
      <div class="settings-section">
        <h2 class="section-title">{{ $t('application') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="notify" class="cosmic-item">
            <ion-icon slot="start" :icon="notificationsOutline" class="cosmic-icon" style="color:aqua;"/>
            <ion-label class="cosmic-label">{{ $t('notify') }}</ion-label>
          </ion-item>
          <ion-item  button @click="languageSwitchers" class="cosmic-item">
            <ion-icon slot="start" :icon="globeOutline" class="cosmic-icon" style="color: cornflowerblue;"/>
            <ion-label class="cosmic-label">{{ $t('language') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Resources Section -->
      <div class="settings-section">
        <h2 class="section-title">{{ $t('resources') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="githubpage" class="cosmic-item">
            <ion-icon slot="start" :icon="homeOutline" class="cosmic-icon" style="color:chocolate"/>
            <ion-label class="cosmic-label">{{$t('github')}}</ion-label>
          </ion-item>
          <ion-item  button @click="gotoDai" class="cosmic-item">
            <ion-icon slot="start" :icon="happyOutline" class="cosmic-icon" style="color:blue"/>
            <ion-label class="cosmic-label">D-AI / Linux&MacOS&Windows</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Support Section -->
      <div class="settings-section">
        <h2 class="section-title">{{ $t('support') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="sponsorpage" class="cosmic-item">
            <ion-icon slot="start" :icon="heartOutline" class="cosmic-icon" style="color:deeppink"/>
            <ion-label class="cosmic-label">{{ $t('sponsor6') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Security and Data Section -->
      <div class="settings-section">
        <h2 class="section-title">{{ $t('security') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="KeyCheck" class="cosmic-item">
            <ion-icon slot="start" :icon="keyOutline" class="cosmic-icon" style="color:cornflowerblue"/>
            <ion-label class="cosmic-label">{{ $t('keysecuritydetection') }}</ion-label>
          </ion-item>
          <ion-item  button @click="datamove" class="cosmic-item">
            <ion-icon slot="start" :icon="gitPullRequestOutline" class="cosmic-icon" style="color:gold"/>
            <ion-label class="cosmic-label">{{ $t('datamigration') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Storage and Cache Section -->
      <div class="settings-section">
        <h2 class="section-title">{{ $t('storage') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="indexedDBpage" class="cosmic-item">
            <ion-icon slot="start" :icon="serverOutline" class="cosmic-icon" style="color:cornflowerblue"/>
            <ion-label class="cosmic-label">NetworkDatabase</ion-label>
          </ion-item>
          <ion-item  button @click="confirmClearChats" class="cosmic-item">
            <ion-icon slot="start" :icon="trashBinOutline" class="cosmic-icon" style="color:deeppink"/>
            <ion-label class="cosmic-label">{{ $t('clearthechatrecords') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Privacy and Safety Section -->
      <div class="settings-section">
        <h2 class="section-title">{{ $t('privacy') }}</h2>
        <ion-list class="settings-list">
          <ion-item  class="cosmic-item">
            <ion-icon slot="start" :icon="shareSocialOutline" class="cosmic-icon" style="color:#3880ff"/>
            <ion-label class="cosmic-label">{{ $t('shareRelays') }}</ion-label>
            <ion-toggle
              slot="end"
              :checked="isRelaySharingEnabled"
              @ionChange="handleSharingToggle"
            ></ion-toggle>
          </ion-item>
          <ion-item  button @click="blackList" class="cosmic-item">
            <ion-icon slot="start" :icon="banOutline" class="cosmic-icon" style="color:darkgray"/>
            <ion-label class="cosmic-label">{{ $t('blacklist') }}</ion-label>
          </ion-item>
          <ion-item  button @click="ReportUser" class="cosmic-item">
            <ion-icon slot="start" :icon="alertOutline" class="cosmic-icon" style="color:deeppink"/>
            <ion-label class="cosmic-label">Report users</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Account Actions Section -->
      <div class="settings-section">
        <h2 class="section-title">{{ $t('actions') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="confirmDeleteAccount" class="cosmic-item danger-item">
            <ion-icon slot="start" :icon="personRemoveOutline" class="cosmic-icon" style="color:red"/>
            <ion-label class="cosmic-label">{{ $t('destroythekey') }}</ion-label>
          </ion-item>
          <ion-item  button @click="logout" class="cosmic-item">
            <ion-icon slot="start" :icon="logOutOutline" class="cosmic-icon" style="color:darkblue"/>
            <ion-label class="cosmic-label">{{ $t('logout') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>
      <div class="version-section">
        <div class="version-card">
          <div class="version-info">
            <h3 class="app-name">TalkFlow</h3>
            <p class="version-number">v1.7.0</p>
          </div>
          <ion-icon :icon="cubeOutline" class="version-icon"></ion-icon>
        </div>
      </div>
      <div style="height:120px"></div>

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
  IonToggle, // 新增 IonToggle
} from '@ionic/vue';

import { getTalkFlowCore } from '@/composables/TalkFlowCore'; // 修正导入
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
  happyOutline,
  shareSocialOutline,
  storefrontOutline, 
  serverOutline
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

const indexedDBpage = () => {
  router.push('/indexedDBpage');
};

const gotoCache = () => {
  router.push('/storagepage');
};
const gotoDai = () => {
  router.push('/daipage');
};

// 修正：从 getTalkFlowCore 获取单例
const { isRelaySharingEnabled, toggleRelaySharing, onLogout, deactivateAccount, clearAllChats, isLoggedIn } = getTalkFlowCore();

const deleteAccount = () => {
  deactivateAccount();
};

const isDeleteAlertOpen = ref(false);
const confirmDeleteAccount = () => {
  isDeleteAlertOpen.value = true;

};

const isClearChatsAlertOpen = ref(false);
const confirmClearChats = () => {
  isClearChatsAlertOpen.value = true;
 
};

const logout = () => {
  router.replace('/');
  onLogout();

};

const handleSharingToggle = (event: CustomEvent) => {
  const enabled = event.detail.checked;
  toggleRelaySharing(enabled);
};
</script>

<style scoped>
/* Settings Content Layout */
.settings-content {
  --padding-top: 16px;
  --padding-bottom: 16px;
  --padding-start: 16px;
  --padding-end: 16px;
}

/* Version Information Section */
.version-section {
  margin-bottom: 24px;
}

.version-card {
  background: rgba(42, 125, 112, 0.1);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(42, 125, 112, 0.2);
  box-shadow: 0 4px 20px rgba(42, 125, 112, 0.1);
  transition: all 0.3s ease;
}

.version-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(42, 125, 112, 0.15);
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--ion-text-color);
  margin: 0;
  text-shadow: 0 0 4px rgba(42, 125, 112, 0.3);
}

.version-number {
  font-size: 14px;
  font-weight: 500;
  color: rgba(42, 125, 112, 0.8);
  margin: 0;
  opacity: 0.9;
}

.version-icon {
  font-size: 28px;
  color: rgba(42, 125, 112, 0.7);
  transition: all 0.3s ease;
}

.version-card:hover .version-icon {
  transform: rotate(10deg) scale(1.1);
  color: rgb(42, 125, 112);
}

/* Settings Section */
.settings-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ion-text-color);
  margin: 0 0 12px 8px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}





/* 图标基础样式，使用伪元素实现光晕 */
.cosmic-icon {
  font-size: 24px;
  color: rgb(42, 125, 112);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  margin-right: 16px;
}



/* 文字样式 */


.danger-item .cosmic-icon {
  color: #dc3545;
}

.danger-item .cosmic-icon::before {
  background: radial-gradient(circle, rgba(220, 53, 69, 0.4) 0%, rgba(220, 53, 69, 0) 70%);
}

/* Toolbar 样式 */
.liquid-toolbar {
  --border-color: transparent;
  --background: transparent;
  overflow: visible;
}

</style>