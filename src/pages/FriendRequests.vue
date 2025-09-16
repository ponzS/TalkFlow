<template>
  <ion-page>
    <!-- 顶部栏 -->
    <ion-header :translucent="true"   collapse="fade">
      <ion-toolbar>
        <ion-buttons slot="start">
           <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t('NewFriends') || 'New Friends' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="friend-requests-content">
    
    
    <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
           Add Friends
            </h1>
          </ion-toolbar>
        </ion-header>
    
      <!-- Gun Data Debug Section -->
      <!-- <ion-accordion-group class="gun-data-section">
        <ion-accordion value="gun-data">
          <ion-item slot="header" color="light">
            <ion-icon :icon="serverOutline" slot="start"></ion-icon>
            <ion-label>
              <h3>Gun数据调试</h3>
              <p>查看和刷新Gun数据库中的好友申请数据</p>
            </ion-label>
          </ion-item>
          <div class="ion-padding" slot="content">
     
            <div class="refresh-controls">
              <ion-button fill="outline" size="small" @click="refreshGunData" class="refresh-btn">
                <ion-icon :icon="refreshOutline" slot="start"></ion-icon>
                刷新Gun数据
              </ion-button>
              <ion-button fill="outline" size="small" @click="refreshFriendRequests" class="refresh-btn">
                <ion-icon :icon="peopleOutline" slot="start"></ion-icon>
                刷新好友申请
              </ion-button>
            </div>
            
          
            <div class="gun-data-display">
              <ion-item lines="none">
                <ion-label position="stacked">Gun好友申请数据 ({{ Object.keys(gunRequestsData).length }} 条)</ion-label>
              </ion-item>
              <div class="data-container">
                <pre class="data-content">{{ JSON.stringify(gunRequestsData, null, 2) }}</pre>
              </div>
              <ion-button fill="clear" size="small" @click="copyDataWithFeedback(JSON.stringify(gunRequestsData, null, 2))" class="copy-data-btn">
                <ion-icon :icon="copyOutline" slot="start"></ion-icon>
                复制数据
              </ion-button>
            </div>
          </div>
        </ion-accordion>
      </ion-accordion-group> -->

      <!-- My QR Code Section -->
      <div class="my-qr-section">
        <!-- <div class="section-header">
          <ion-icon :icon="qrCodeOutline" class="section-icon"></ion-icon>
          <h2>{{ $t('MyQRCode') || 'My QR Code' }}</h2>
        </div> -->
        
        <div class="qr-content">
          <div class="qr-display">
            <QrShow :data="'pubkey:' + currentUserPub" />
          </div>
          
          <div class="user-info">
            <div class="user-avatar">
              <ion-avatar v-if="userAvatars[currentUserPub!]">
                <img :src="userAvatars[currentUserPub!]" style="height: 100%;width: 100%;" />
              </ion-avatar>
              <ion-avatar v-else>
                <img :src="getGunAvatar(currentUserPub!)" alt=""  style="height: 100%;width: 100%;" />
              </ion-avatar>
            </div>
            <div class="user-details">
              <h3>{{ currentUserAlias || 'No Name' }}</h3>
              <div class="pubkey-container">
                <p class="pubkey-text">Public Key: {{ truncatePub(currentUserPub!) }}</p>
                <ion-button fill="clear" size="small" @click="copyPubWithFeedback(currentUserPub!)">
                  <ion-icon :icon="copyOutline" slot="icon-only"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Friend Section - 吸顶 -->
      <div class="add-friend-sticky">
        <div class="add-friend-section">
          <!-- <div class="section-header">
            <ion-icon :icon="personAddOutline" class="section-icon"></ion-icon>
            <h2>{{ $t('AddFriend') || 'Add Friend' }}</h2>
          </div> -->
          
          <!-- Input with Search Button -->
          <div class="input-search-container">
            <ion-item class="search-input-item">
              <ion-input
                v-model="friendPub"
                placeholder="Enter public key..."
                @ionInput="friendPub = String($event.target.value)"
                class="friend-input"
              ></ion-input>
              <ion-button 
                slot="end" 
               fill="outline"
                @click="searchUser"
                :disabled="!friendPub.trim()"
                class="search-button"
              >
                <ion-icon :icon="searchOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-item>
          </div>

          <!-- Action Buttons Row -->
          <div class="action-buttons">
            <ion-button fill="outline" @click="gotoscanner" class="qr-scan-button">
              <ion-icon :icon="scanOutline" slot="start"></ion-icon>
              {{ $t('ScanQR') || 'Scan QR' }}
            </ion-button>
          </div>

          <!-- Error Message -->
          <div v-if="buddyError" class="error-message">
            <ion-icon :icon="alertCircleOutline" class="error-icon"></ion-icon>
            <ion-text color="danger">{{ buddyError }}</ion-text>
          </div>
        </div>
      </div>

   
      <!-- Friend Requests Section -->
      <div class="requests-section">
        <div class="section-header">
          <ion-icon :icon="earthOutline" class="section-icon"></ion-icon>
          <h2>{{ $t('FriendRequests') || 'Friend Requests' }}</h2>
          <ion-badge v-if="filteredReceivedRequests.length > 0" color="primary" class="count-badge">
            {{ filteredReceivedRequests.length }}
          </ion-badge>
        </div>

        <div class="requests-container">
          <ion-list class="requests-list">
            <ion-item
              v-for="(req, idx) in filteredReceivedRequests"
              :key="req.from + idx"
              button
              @click="openRequestModal(req)"
              class="request-item"
              lines="none"
            >
              <!-- <ion-avatar slot="start" v-if="strangerAvatars[req.from]">
                <img :src="strangerAvatars[req.from]" />
              </ion-avatar> -->
              <ion-avatar slot="start" >
                <img :src="getGunAvatar(req.from)" alt="" />
              </ion-avatar>
              <ion-label>
                <h2>{{ strangerAliases[req.from] }}</h2>
                <p class="pub-key" @click.stop="copyPubWithFeedback(req.from)">
                  {{ $t('talkflowid') }}: {{ truncatePub(req.from) }}
                </p>
                <!-- <p>epub: {{ req.epub }}</p> -->
                <p v-if="req.message" class="message">{{ $t('message') }}: {{ req.message }}</p>
              </ion-label>
  
            </ion-item>

            <!-- Empty State -->
            <div v-if="!filteredReceivedRequests.length" class="empty-state">
              <div class="empty-illustration">
                <ion-icon :icon="peopleOutline" class="empty-icon"></ion-icon>
              </div>
              <p class="empty-text">No friend requests</p>
              <p class="empty-subtext">New friend requests will appear here</p>
            </div>
          </ion-list>
        </div>
      </div>

      <!-- Request Details Modal (Bottom Sheet) -->
      <ion-modal
        :is-open="isModalOpen"
        class="request-modal"
        :breakpoints="[0, 0.9, 0.9]"
        :initial-breakpoint="0.9"
        @didDismiss="closeRequestModal"
      >
        <ion-content class="modal-content">
          <div class="modal-header">
            <!-- <ion-avatar v-if="selectedRequest.avatar" class="modal-avatar">
              <img :src="selectedRequest.avatar" />
            </ion-avatar> -->
            <ion-avatar  class="modal-avatar">
              <img :src="getGunAvatar(selectedRequest.from)" alt="Avatar" />
            </ion-avatar>
            <div class="header-text">
              <h2>{{ selectedRequest?.alias }}</h2>
               
            </div>
            <ion-button fill="clear" @click="closeRequestModal" class="close-button">
              <ion-icon color="dark" :icon="closeOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
          <div class="modal-body">
            <ion-item lines="none">
              <ion-label position="stacked">PubKey</ion-label>
              <div class="pub-key-container">
                <ion-text>{{ selectedRequest?.from}}</ion-text>
                 <!-- <h2>{{ selectedRequest?.epub }}</h2> -->
              </div>
            </ion-item>
            <ion-item lines="none" v-if="selectedRequest?.message">
              <ion-label position="stacked">Message</ion-label>
              <ion-text class="message-text">{{ selectedRequest.message }}</ion-text>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{ $t('addblacklist') }}</ion-label>
              <ion-toggle slot="end" v-model="isBlocked" @ionChange="toggleBlacklist"></ion-toggle>
            </ion-item>
          </div>
          <div class="modal-actions">
            <ion-button expand="block" color="success" @click="handleAcceptRequest">
              {{ $t('agree') }}
            </ion-button>
            <ion-button expand="block" fill="outline" color="danger" @click="handleRejectRequest">
              {{ $t('refuse') }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonItem, IonLabel, IonIcon, IonAvatar, IonModal, IonInput, IonToggle,
  IonText, IonBadge, IonList, IonBackButton, IonSegment, IonSegmentButton,
  IonAccordion, IonAccordionGroup,
} from '@ionic/vue';

import { 
  arrowBackOutline, personAddOutline, scanOutline, searchOutline, earthOutline, 
  closeOutline, peopleOutline, alertCircleOutline, chevronForwardOutline,
  qrCodeOutline, copyOutline, serverOutline, refreshOutline, documentOutline
} from 'ionicons/icons';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from "gun-avatar";
import { toastController } from '@ionic/vue';
import QrShow from '@/components/GunVue/QrShow.vue';

mountClass();

// Define ReceivedRequest type
interface ReceivedRequest {
  from: string;
  message?: string;
}

const chatFlowStore = getTalkFlowCore();
const {
  buddyList, receivedRequests, friendPub, buddyError, searchUserProfile,
  gun, acceptBuddyRequest, rejectBuddyRequest, addToBlacklist, removeFromBlacklist, 
  isInMyBlacklist, storageServ, copyPub, currentUserPub, currentUserAlias, userAvatars,
  getUserDataOnce,listenMyRequests
} = chatFlowStore;

const router = useRouter();

// State for stranger data (for friend requests)
const strangerAliases = ref<Record<string, string>>({});
const strangerAvatars = ref<Record<string, string>>({});

// Modal state for friend requests
const isModalOpen = ref(false);
const selectedRequest = ref<{ from: string; message?: string; alias?: string; avatar?: string; epub?: string } | null>(null);
const isBlocked = ref(false);

// Filter out already-added friends
const filteredReceivedRequests = computed(() => {
  return receivedRequests.value.filter(req => !buddyList.value.some(b => b.pub === req.from));
});

// Gun data display state
const selectedDataType = ref('requests');
const gunRequestsData = ref<Record<string, any>>({});
const gunBuddiesData = ref<Record<string, any>>({});
const gunProfileData = ref<Record<string, any>>({});


// 🆕 优化的获取陌生人数据函数（使用统一缓存机制）
async function fetchStrangerData(pub: string) {
  // 首先检查是否已经从好友申请中获取了信息
  const requestData = receivedRequests.value.find(req => req.from === pub);
  
  if (requestData && 'alias' in requestData && 'avatar' in requestData) {
    // 🆕 直接使用申请中的用户信息（避免重复网络请求）
    const reqData = requestData as any;
    if (reqData.alias && !strangerAliases.value[pub]) {
      strangerAliases.value[pub] = reqData.alias;
    }
    if (reqData.avatar && !strangerAvatars.value[pub]) {
      strangerAvatars.value[pub] = reqData.avatar;
    }
    return;
  }
  
  // 使用统一的缓存机制获取用户数据
  try {
    const userData = await getUserDataOnce(pub);
    if (userData.alias && !strangerAliases.value[pub]) {
      strangerAliases.value[pub] = userData.alias;
    }
    if (userData.avatar && !strangerAvatars.value[pub]) {
      strangerAvatars.value[pub] = userData.avatar;
    }
  } catch (error) {
    // 缓存获取失败，设置默认值
    if (!strangerAliases.value[pub]) {
      strangerAliases.value[pub] = 'No Name';
    }
    if (!strangerAvatars.value[pub]) {
      strangerAvatars.value[pub] = getGunAvatar(pub);
    }
  }
}

// Truncate public key for list display
function truncatePub(pub: string): string {
  return pub.length > 20 ? `${pub.slice(0, 8)}...${pub.slice(-8)}` : pub;
}

// Copy with feedback
async function copyPubWithFeedback(pub: string) {
  await copyPub(pub);
  const toast = await toastController.create({
    message: 'ID Copied',
    duration: 1500,
    position: 'bottom',
    color: 'dark',
  });
  await toast.present();
}

// Open request modal
function openRequestModal(req: ReceivedRequest) {
  // console.log('Opening modal for request:', req);
  selectedRequest.value = {
    ...req,
    alias: strangerAliases.value[req.from],
    avatar: strangerAvatars.value[req.from],
  };
  isBlocked.value = isInMyBlacklist(req.from);
  isModalOpen.value = true;
  // console.log('Modal state after opening:', { isModalOpen: isModalOpen.value, selectedRequest: selectedRequest.value });
}

// Close request modal
function closeRequestModal() {
  // console.log('Closing modal');
  isModalOpen.value = false;
  selectedRequest.value = null;
}

// Toggle blacklist
async function toggleBlacklist() {
  if (!selectedRequest.value) return;
  // console.log('Toggling blacklist for:', selectedRequest.value.from, 'New state:', isBlocked.value);
  if (isBlocked.value) {
    addToBlacklist(selectedRequest.value.from);
    await storageServ.saveBlacklist(selectedRequest.value.from, true);
  } else {
    removeFromBlacklist(selectedRequest.value.from);
    await storageServ.saveBlacklist(selectedRequest.value.from, false);
  }
}

// Handle accept request
async function handleAcceptRequest() {
  if (selectedRequest.value?.from) {
    // console.log('Accepting request for:', selectedRequest.value.from);
    try {
      await acceptBuddyRequest(selectedRequest.value.from);
      // 等待acceptBuddyRequest完成后再关闭模态窗口
      closeRequestModal();
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      // 即使出错也关闭模态窗口
      closeRequestModal();
    }
  }
}

// Handle reject request
function handleRejectRequest() {
  if (selectedRequest.value?.from) {
    // console.log('Rejecting request for:', selectedRequest.value.from);
    rejectBuddyRequest(selectedRequest.value.from);
    closeRequestModal();
  }
}

function gotoscanner() {
  router.push('ScanPage');
}

async function searchUser() {
  const pubRaw = friendPub.value.trim();

  if (!pubRaw) {
    buddyError.value = 'Publickey is null';
    return;
  }

  const pub = pubRaw.replace('pubkey:', '');
  // console.log('🔍 智能搜索路由，目标 pub:', pub.slice(0, 8));

  
  router.push({ path: '/friend-profile', query: { pub } });

  // 清理输入状态
  friendPub.value = '';
  buddyError.value = '';
  
  // 📡 后台启动数据同步（无论是否为好友，都尝试更新数据）
  startBackgroundSync(pub);
}

// 🔄 后台数据同步函数
function startBackgroundSync(pub: string) {
  // console.log(`🔄 启动后台数据同步: ${pub.slice(0, 8)}`);
  
  // 非阻塞式数据获取
  setTimeout(() => {
    gun.get('users').get(pub).once((data: any) => {
      if (data) {
        // console.log(`📥 后台同步成功: ${pub.slice(0, 8)}`, {
        //   alias: data.alias,
        //   hasAvatar: !!data.avatar,
        //   hasSignature: !!data.signature,
        //   hasEpub: !!data.epub
        // });
      } else {
        // console.log(`📭 后台同步无数据: ${pub.slice(0, 8)}`);
      }
    });
  }, 100); // 延迟100ms避免阻塞UI
}

// Gun数据相关函数
function refreshGunData() {
  if (!currentUserPub.value) return;
  
  // 获取好友申请数据
  gun.get('requests').get(currentUserPub.value).get('received').on((data: any) => {
    gunRequestsData.value = data || {};
  });
  
  // 获取好友列表数据
  gun.get('users').get(currentUserPub.value).get('buddies').once((data: any) => {
    gunBuddiesData.value = data || {};
  });
  
  // 获取个人资料数据
  gun.get('users').get(currentUserPub.value).once((data: any) => {
    gunProfileData.value = data || {};
  });
}

// 刷新好友申请列表
function refreshFriendRequests() {
  if (!currentUserPub.value) return;
  
  // 重新监听好友申请
  listenMyRequests(currentUserPub.value);
  
  // 刷新陌生人数据
  filteredReceivedRequests.value.forEach(req => {
    fetchStrangerData(req.from);
  });
  
  // 显示刷新成功提示
  toastController.create({
    message: '好友申请列表已刷新',
    duration: 1500,
    position: 'bottom',
    color: 'success',
  }).then(toast => toast.present());
}

function onDataTypeChange() {
  // 当切换数据类型时刷新对应数据
  refreshGunData();
}

// 复制数据到剪贴板
async function copyDataWithFeedback(data: string) {
  try {
    await navigator.clipboard.writeText(data);
    const toast = await toastController.create({
      message: 'Data Copied',
      duration: 1500,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  } catch (error) {
    console.error('Failed to copy data:', error);
  }
}

// Theme support
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  } as any);
};



onMounted(() => {
  listenMyRequests(currentUserPub.value);
  // Initialize stranger data for friend requests
  filteredReceivedRequests.value.forEach(req => {
    fetchStrangerData(req.from);
  });
  // Initialize gun data
  refreshGunData();
});

</script>

<style scoped>

/* Gun Data Debug Section */
.gun-data-section {
  margin: 8px 16px 16px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.gun-data-section ion-accordion {
  --background: rgba(255, 255, 255, 0.95);
  --border-radius: 12px;
}

.gun-data-section ion-item {
  --background: transparent;
  --padding-start: 16px;
  --padding-end: 16px;
}

.gun-data-section ion-label h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--ion-text-color);
  margin: 0;
}

.gun-data-section ion-label p {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 4px 0 0 0;
}

.refresh-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.refresh-btn {
  --border-radius: 8px;
  --border-width: 1px;
  --border-color: var(--ion-color-primary);
  --color: var(--ion-color-primary);
  height: 36px;
  flex: 1;
  min-width: 140px;
}

.gun-data-display {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.data-container {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.data-content {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: var(--ion-text-color);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.copy-data-btn {
  --color: var(--ion-color-medium);
  --padding-start: 0;
  --padding-end: 0;
  height: 32px;
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .gun-data-section ion-accordion {
    --background: rgba(0, 0, 0, 0.95);
  }
  
  .gun-data-display {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .data-container {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* My QR Code Section */
.my-qr-section {
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 8px;
}

.qr-content {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.qr-display {
  flex-shrink: 0;
  background: white;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  width: 220px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-display :deep(.qr-code) {
  width: 100px !important;
  height: 100px !important;
}

.qr-display :deep(svg) {
  width: 100px !important;
  height: 100px !important;
}

.user-info {
  flex: 1;
  display: flex;
  gap: 16px;
  align-items: center;
  min-width: 200px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-avatar ion-avatar {
  width: 64px;
  height: 64px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-details {
  flex: 1;
}

.user-details h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--ion-text-color);
  margin: 0 0 8px 0;
}

.pubkey-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.pubkey-text {
  font-size: 13px;
  color: var(--ion-color-step-600, #666);
  margin: 0;
  flex: 1;
  font-family: monospace;
}

.pubkey-container ion-button {
  --padding-start: 4px;
  --padding-end: 4px;
  --padding-top: 4px;
  --padding-bottom: 4px;
  height: 28px;
  width: 28px;
}

.pubkey-container ion-icon {
  font-size: 16px;
  color: var(--ion-color-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .qr-content {
    flex-direction: column;
    text-align: center;
  }
  
  .user-info {
    flex-direction: column;
    text-align: center;
  }
  
  .pubkey-container {
    justify-content: center;
  }
}

/* 吸顶的Add Friend区域 */
.add-friend-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.add-friend-sticky:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .add-friend-sticky {
    background: rgba(0, 0, 0, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* Add Friend Section */
.add-friend-section {
  padding: 16px;
  background: transparent;
}

/* Section Headers */
.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.section-icon {
  font-size: 24px;
  margin-right: 12px;
  color: var(--ion-color-primary);
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--ion-text-color);
  margin: 0;
  flex: 1;
}

.count-badge {
  margin-left: 8px;
  --background: var(--ion-color-primary);
}

.refresh-button {
  --padding-start: 4px;
  --padding-end: 4px;
  --padding-top: 4px;
  --padding-bottom: 4px;
  height: 28px;
  width: 28px;
}

.refresh-button ion-icon {
  font-size: 16px;
  color: var(--ion-color-primary);
}

/* 输入搜索容器 */
.input-search-container {
  margin-bottom: 16px;
  border: none;
}

.search-input-item {
  --background: rgba(255, 255, 255, 0.1);
  --border-radius: 10px;
  --padding-start: 20px;
  --padding-end: 8px;
  --inner-padding-end: 0;
  --border-width: 0;
  border: none;
}

.friend-input {
  flex: 1;
  font-size: 16px;
  --placeholder-color: var(--ion-color-medium);
  border: none;
}

.search-button {
  --border-radius: 10px;
  height: 44px;

  border: none;
}

/* 操作按钮区域 */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.qr-scan-button {
  flex: 1;
  --border-radius: 12px;
  height: 44px;
  --border-width: 2px;
  --border-color: var(--ion-color-primary);
  --color: var(--ion-color-primary);
}

/* 错误消息样式 */
.error-message {
  display: flex;
  align-items: center;
  margin: 8px 4px 0;
  padding: 12px 16px;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.error-icon {
  font-size: 20px;
  margin-right: 8px;
  color: var(--ion-color-danger);
}

/* Gun Data Section */
.gun-data-section {
  padding: 24px 16px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 8px;
}

.gun-data-container {
  background: transparent;
}

.data-tabs {
  margin-bottom: 20px;
}

.data-tabs ion-segment {
  --background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.data-tabs ion-segment-button {
  --color: var(--ion-color-step-600);
  --color-checked: var(--ion-color-primary);
  --background-checked: rgba(255, 255, 255, 0.2);
  --border-radius: 8px;
  margin: 4px;
}

.data-content {
  background: transparent;
}

.data-panel {
  background: transparent;
}

.data-item {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 16px;
  backdrop-filter: blur(20px);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.data-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.data-key {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-primary);
  font-family: monospace;
}

.data-header ion-button {
  --padding-start: 4px;
  --padding-end: 4px;
  --padding-top: 4px;
  --padding-bottom: 4px;
  height: 28px;
  width: 28px;
}

.data-header ion-icon {
  font-size: 16px;
  color: var(--ion-color-medium);
}

.data-value {
  padding: 16px;
  margin: 0;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: var(--ion-color-step-600);
  background: transparent;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.4;
  max-height: 300px;
  overflow-y: auto;
}

.empty-data {
  text-align: center;
  padding: 40px 20px;
  color: var(--ion-color-step-600, #666);
}

.empty-data .empty-icon {
  font-size: 48px;
  color: var(--ion-color-step-400, #999);
  opacity: 0.6;
  margin-bottom: 16px;
}

.empty-data p {
  font-size: 14px;
  margin: 0;
  color: var(--ion-color-step-600, #666);
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .gun-data-section {
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .data-tabs ion-segment {
    --background: rgba(0, 0, 0, 0.3);
  }
  
  .data-item {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .data-header {
    background: rgba(0, 0, 0, 0.3);
  }
}

/* Requests Section */
.requests-section {
  padding: 24px 16px 32px;
  background: transparent;
}

.requests-container {
  background: transparent;
}

.requests-list {
  background: transparent;
  padding: 0;
}

.request-item {
  --background: rgba(255, 255, 255, 0.08);
  --border-radius: 16px;
  --padding-start: 20px;
  --padding-end: 20px;
  --inner-padding-end: 0;
  --min-height: 80px;
  margin-bottom: 12px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.request-item:hover {
  --background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.request-item ion-avatar {
  width: 56px;
  height: 56px;
  margin-right: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.request-item ion-label {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.request-item h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--ion-text-color, #000);
  margin: 0 0 6px 0;
}

.request-item .pub-key {
  font-size: 13px;
  color: var(--ion-color-step-600, #666);
  margin: 0 0 4px 0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.request-item .pub-key:hover {
  color: var(--ion-color-primary);
}



.request-item .message {
  font-size: 13px;
  color: var(--ion-color-step-600, #666);
  margin: 0;
  font-style: italic;
}

.forward-icon {
  color: var(--ion-color-step-400, #999);
  font-size: 20px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--ion-color-step-600, #666);
}

.empty-illustration {
  margin-bottom: 24px;
}

.empty-icon {
  font-size: 80px;
  color: var(--ion-color-step-400, #999);
  opacity: 0.6;
}

.empty-text {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--ion-text-color);
}

.empty-subtext {
  font-size: 15px;
  margin: 0;
  opacity: 0.7;
  line-height: 1.4;
}

/* Request Modal */
.request-modal {
  --background: var(--ion-background-color, #fff);
  --border-radius: 16px 16px 0 0;
}

.modal-content {
  padding: 20px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 10px;
}

.modal-avatar {
  width: 56px;
  height: 56px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.header-text {
  flex: 1;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--ion-text-color, #000);
  margin: 0;
}

.close-button {
  --padding-start: 0;
  --padding-end: 0;
  --border-radius: 50%;
}

.modal-body {
  margin: 10px;
}

.modal-body ion-item {
  --background: transparent;
  --border-width: 0;
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-bottom: 15px;
}

.modal-body ion-label {
  color: var(--ion-color-step-600, #666);
  font-weight: 500;
  margin-bottom: 5px;
}

.modal-body ion-text {
  font-size: 14px;
  color: var(--ion-text-color, #000);
}

.modal-body .pub-key-container {
  max-height: 100px;
  overflow-y: auto;
  word-break: break-all;
  padding: 12px;
  background: var(--ion-color-step-100, #f7f7f7);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-body .message-text {
  white-space: pre-wrap;
  padding: 12px;
  background: var(--ion-color-step-100, #f7f7f7);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-body ion-toggle {
  --background: var(--ion-color-step-300, #ddd);
  --background-checked: var(--ion-color-primary, #3880ff);
  --handle-background: #fff;
  --handle-background-checked: #fff;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 10px 0;
}

.modal-actions ion-button {
  --border-radius: 12px;
  height: 48px;
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 768px) {
  .add-friend-section {
    padding: 12px;
  }
  
  .section-header h2 {
    font-size: 18px;
  }
  
  .search-button {
    --padding-start: 12px;
    --padding-end: 12px;
  }
  
  .requests-section {
    padding: 20px 12px 32px;
  }
}

/* Dark mode optimizations */
@media (prefers-color-scheme: dark) {
  .add-friend-sticky {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .search-input-item {
    border: none;
  }
  
  .request-item {
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
}
</style>