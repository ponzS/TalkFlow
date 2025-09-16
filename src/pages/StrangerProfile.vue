<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar>
        <ion-buttons slot="start">
           <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>
          {{ syncState.alias || `User${syncState.pub.slice(0, 8)}` }}
        </ion-title>
        <!-- 🔄 同步状态指示器 -->
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="syncSecurityCertificate" :disabled="isSyncing">
            <ion-icon :icon="isSyncing ? syncOutline : refreshOutline" :class="{ 'syncing-icon': isSyncing }"></ion-icon>
          </ion-button>
          <ion-button fill="clear" v-if="syncState.syncStatus === 'syncing'">
            <ion-icon :icon="syncOutline" class="syncing-icon"></ion-icon>
          </ion-button>
          <ion-button fill="clear" v-else-if="syncState.syncStatus === 'online'">
            <ion-icon :icon="checkmarkCircleOutline" color="success"></ion-icon>
          </ion-button>
          <ion-button fill="clear" v-else-if="syncState.syncStatus === 'timeout'">
            <ion-icon :icon="timeOutline" color="warning"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- 🔄 同步进度条 -->
      <ion-progress-bar 
        v-if="syncState.syncStatus === 'syncing'"
        :value="syncState.syncProgress / 100"
        color="primary"
        class="sync-progress"
      ></ion-progress-bar>
      
      <!-- 📊 状态提示卡片 -->
      <div class="sync-status-card" v-if="syncState.syncStatus !== 'online'">
        <div class="status-content">
          <ion-icon :icon="getStatusIcon()" :class="getStatusClass()"></ion-icon>
          <div class="status-text">
            <h3>{{ getStatusTitle() }}</h3>
            <p>{{ getStatusDescription() }}</p>
          </div>
        </div>
      </div>

      <img
          v-if="syncState.avatar || userAvatars[strangerPub]"
          :src="syncState.avatar || userAvatars[strangerPub]"
          alt="Avatar"
          class="avatar-glow1"
          @click="goToProfile(strangerPub)"
        />
        <img
          v-else
          :src="getGunAvatar(strangerPub)"
          alt="Generated Avatar"
          class="avatar-glow1"
          @click="goToProfile(strangerPub)"
        />

      <div class="profile-container">
        <img
          v-if="strangerAvatar || userAvatars[strangerPub]"
          :src="strangerAvatar || userAvatars[strangerPub]"
          alt="Avatar"
          class="avatar"
          @click="goToProfile(strangerPub)"
        />
        <img
          v-else
          :src="getGunAvatar(strangerPub)"
          alt="Generated Avatar"
          class="avatar"
          @click="goToProfile(strangerPub)"
        />
        <h1 class="username">{{ strangerAlias || getAliasRealtime(strangerPub) }}</h1>
        <p v-if="!isUrl(strangerSignature || getFriendSignature(strangerPub))" class="signature">
          {{ strangerSignature || getFriendSignature(strangerPub) || '' }}
        </p>
        <p v-else class="signature">
          <a @click.prevent="openUrl(strangerSignature || getFriendSignature(strangerPub))" class="signature-link">
            {{ strangerSignature || getFriendSignature(strangerPub) }}
          </a>
        </p>
        <div class="info-section">
          <p><strong>PubKey:</strong> {{ strangerPub }}</p>
          <ion-button color="dark" expand="block" @click="copyPub(strangerPub)">Copy</ion-button>
        </div>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <div class="footer-buttons">
          <ion-button color="medium" fill="outline"  @click="goToProfile(strangerPub)">{{ $t('Moments') || 'Moments' }}</ion-button>
          <ion-button color="dark" expand="block" @click="showRequestModal = true">{{ $t('addfriend1') }}</ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>

    <!-- 好友申请留言弹窗 -->
    <ion-modal :is-open="showRequestModal" @didDismiss="showRequestModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('addfriend') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button color="dark" @click="showRequestModal = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-textarea
          v-model="requestMessage"
          placeholder="Message"
        ></ion-textarea>
        <ion-button color="dark" expand="block" @click="sendFriendRequest">{{ $t('addfriend2') }}</ion-button>
        <ion-text v-if="buddyError" color="danger">{{ buddyError }}</ion-text>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonButton, IonButtons, IonBackButton, IonModal, IonTextarea, IonText, IonIcon, toastController } from '@ionic/vue';
import { syncOutline, checkmarkCircleOutline, timeOutline, cloudOfflineOutline, informationCircleOutline, refreshOutline } from 'ionicons/icons';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar } from "gun-avatar";
import { Browser } from '@capacitor/browser';

const chatFlow = getTalkFlowCore();
const { gun, getAliasRealtime, getFriendSignature, copyPub, userAvatars, friendPub, requestAddBuddyWithMessage, buddyError,addFriendWithHealing,manualSyncBuddyEpub } = chatFlow;
const router = useRouter();
const route = useRoute();

const strangerPub = ref(route.query.pub as string);
const showRequestModal = ref(false);
const requestMessage = ref('');
const isSyncing = ref(false);

// 🔄 数据同步状态管理
interface StrangerProfileState {
  pub: string;
  alias?: string;
  avatar?: string;
  signature?: string;
  epub?: string;
  syncStatus: 'syncing' | 'online' | 'offline' | 'timeout';
  syncProgress: number;
  lastSyncTime?: number;
}

const syncState = ref<StrangerProfileState>({
  pub: strangerPub.value,
  syncStatus: 'syncing',
  syncProgress: 0
});

// 兼容性状态（保持原有引用）
const strangerAlias = ref<string | null>(null);
const strangerAvatar = ref<string | null>(null);
const strangerSignature = ref<string | null>(null);


const { currentUserPub, setSelectedFriendPub } = getTalkFlowCore();

const goToProfile = (userPub: string) => {
  if (userPub === currentUserPub.value) {
    router.push('/MyMoments');
  } else {
    setSelectedFriendPub(userPub);
    router.push('/FriendMoments');
  }
};


// 🔄 数据同步管理器
class StrangerProfileManager {
  private syncTimeout: number = 8000; // 8秒超时
  
  async startDataSync(): Promise<void> {
    // console.log(`🔄 启动数据同步: ${syncState.value.pub.slice(0, 8)}`);
    
    // 开始同步动画
    this.updateSyncProgress(0, 'syncing');
    
    try {
      // 并行获取用户数据（利用Gun.js自动节点同步）
      const dataPromise = this.fetchUserDataWithProgress();
      const timeoutPromise = new Promise(resolve => 
        setTimeout(resolve, this.syncTimeout)
      );
      
      const result = await Promise.race([dataPromise, timeoutPromise]);
      
      if (result) {
        this.updateSyncProgress(100, 'online');
        Object.assign(syncState.value, result);
        // 更新兼容性状态
        strangerAlias.value = result.alias || null;
        strangerAvatar.value = result.avatar || null;
        strangerSignature.value = result.signature || null;
        // 数据同步完成
      } else {
        // 超时处理
        this.updateSyncProgress(100, 'timeout');
      //  console.log(`⏰ 数据同步超时: ${syncState.value.pub.slice(0, 8)}`);
      }
      
    } catch (error) {
     // console.warn('数据同步失败:', error);
      this.updateSyncProgress(100, 'offline');
    }
  }
  
  private async fetchUserDataWithProgress(): Promise<any> {
    return new Promise((resolve) => {
      let hasResolved = false;
      const userData: any = {};
      
      // 监听用户数据节点
      gun.get('users').get(syncState.value.pub).on((data: any) => {
        if (!data || hasResolved) return;
        
        // 逐步更新数据和进度
        if (data.alias) {
          userData.alias = data.alias;
          this.updateSyncProgress(30, 'syncing');
        }
        
        if (data.avatar) {
          userData.avatar = data.avatar;
          this.updateSyncProgress(60, 'syncing');
        }
        
        if (data.signature) {
          userData.signature = data.signature;
          this.updateSyncProgress(80, 'syncing');
        }
        
        if (data.epub) {
          userData.epub = data.epub;
          this.updateSyncProgress(100, 'online');
          hasResolved = true;
          resolve(userData);
        }
        
        // 如果有基础数据但没有epub，也算部分成功
        if ((data.alias || data.avatar) && !hasResolved) {
          setTimeout(() => {
            if (!hasResolved) {
              hasResolved = true;
              this.updateSyncProgress(90, 'online');
              resolve(userData);
            }
          }, 3000);
        }
      });
    });
  }
  
  private updateSyncProgress(progress: number, status: StrangerProfileState['syncStatus']): void {
    syncState.value.syncProgress = progress;
    syncState.value.syncStatus = status;
    syncState.value.lastSyncTime = Date.now();
  }
}

// 创建数据同步管理器实例
const profileManager = new StrangerProfileManager();

// 兼容旧的函数名
function fetchStrangerData(pub: string) {
  profileManager.startDataSync();
}
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

// Generate avatar based on user's public key
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value
  } as any);
};

// URL 检测和打开函数
const urlRegex = /^(https?:\/\/[^\s]+|\b\w+\.(com|cn|org|net|edu|gov|io|co)(?:\.\w+)?(?:\/[^\s]*)?)$/i;

function isUrl(text: string | null): boolean {
  return !!text && urlRegex.test(text);
}

async function openUrl(url: string) {
  const formattedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
  try {
    await Browser.open({ url: formattedUrl });
  } catch (error) {
    // Failed to open URL
  }
}

// 📊 状态UI辅助函数
function getStatusIcon(): string {
  switch (syncState.value.syncStatus) {
    case 'syncing': return syncOutline;
    case 'timeout': return timeOutline;
    case 'offline': return cloudOfflineOutline;
    default: return informationCircleOutline;
  }
}

function getStatusClass(): string {
  switch (syncState.value.syncStatus) {
    case 'syncing': return 'syncing';
    case 'timeout': return 'timeout';
    case 'offline': return 'offline';
    default: return '';
  }
}

function getStatusTitle(): string {
  switch (syncState.value.syncStatus) {
    case 'syncing': return ' Syncing...';
    case 'timeout': return 'User Offline';
    case 'offline': return 'Connection Failed';
    default: return 'Status Unknown';
  }
}

function getStatusDescription(): string {
  switch (syncState.value.syncStatus) {
    case 'syncing': return 'Fetching user information from the network...';
    case 'timeout': return 'User is currently offline, but you can still send a friend request';
    case 'offline': return 'Network connection exception, please check the network settings';
    default: return 'Processing request';
  }
}

// 手动同步安全证书
async function syncSecurityCertificate() {
  if (isSyncing.value) return;
  
  isSyncing.value = true;
  try {
    const result = await manualSyncBuddyEpub(strangerPub.value);
    if (result) {
      const toast = await toastController.create({
        message: '安全证书同步成功',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
    }
  } catch (error) {
    const toast = await toastController.create({
      message: '安全证书同步失败',
      duration: 2000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  } finally {
    isSyncing.value = false;
  }
}



// 组件挂载时获取数据
onMounted(() => {
  fetchStrangerData(strangerPub.value);
});

async function sendFriendRequest() {
  try {
    // 🚀 使用新的增强添加好友功能
   
    await addFriendWithHealing(strangerPub.value, requestMessage.value);
    
    showRequestModal.value = false;
    requestMessage.value = '';
    
    // 显示成功提示
    const toast = await toastController.create({
      message: 'Friend request sent, establishing secure connection...',
      duration: 2000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
    
    // 返回上一页
    await router.go(-2);
  } catch (error: any) {
    buddyError.value = error.message || 'Failed to send friend request';
    
    const toast = await toastController.create({
      message: buddyError.value,
      duration: 3000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  }
}
</script>

<style scoped>
.avatar-glow1 {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* object-fit: cover; */
  /* border-radius: 50%; */
  filter: blur(20px);
  /* transform: scale(1.5); */
  opacity: 0.3;
  overflow: visible;
  /* animation: defaultMorph 6s ease-in-out infinite; */
  /* z-index: 3; */
  pointer-events: none;
}
.profile-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 15px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.username {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 5px;
}

.signature {
  font-size: 1rem;
  color: #666;
  margin-bottom: 20px;
}

.signature-link {
  color: #2980b9;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.3s ease;
}

.signature-link:hover {
  color: #3498db;
}

.info-section {
  width: 100%;
  max-width: 400px;
  text-align: left;
}

.info-section p {
  margin: 10px 0;
  font-size: 1rem;
  word-break: break-all;
}

.info-section strong {
  color: #333;
}

/* 🔄 同步状态样式 */
.sync-progress {
  position: sticky;
  top: 0;
  z-index: 100;
}

.syncing-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sync-status-card {
  margin: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-content ion-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.status-content ion-icon.syncing {
  color: var(--ion-color-primary);
  animation: spin 2s linear infinite;
}

.status-content ion-icon.timeout {
  color: var(--ion-color-warning);
}

.status-content ion-icon.offline {
  color: var(--ion-color-danger);
}

.status-text {
  flex: 1;
}

.status-text h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ion-text-color);
}

.status-text p {
  margin: 0;
  font-size: 14px;
  color: var(--ion-color-medium);
  line-height: 1.4;
}

/* 底部按钮样式 */
.footer-buttons {
  display: flex;
  gap: 8px;
  padding: 0 16px;
}

.footer-buttons ion-button:first-child {
  flex: 0 0 auto;
  min-width: 80px;
}

.footer-buttons ion-button:last-child {
  flex: 1;
}

/* 暗模式适配 */
@media (prefers-color-scheme: dark) {
  .sync-status-card {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
</style>