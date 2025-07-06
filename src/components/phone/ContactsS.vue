<template>
  <ion-page>
    <ion-header >
      <ion-toolbar class="liquid-toolbar">
        <ion-searchbar 
        show-cancel-button="always"
        cancel-button-text="Contacts" 
        color="light"
       
        v-model="searchQuery" 
        placeholder="Search" 
        value="Value"
         @keydown.enter.prevent="onSearchEnter"
        />

      </ion-toolbar>
      <ion-toolbar>
        <ion-title>
      <!-- Segment Tabs -->
      <ion-segment style="margin: 0 16px;"  v-model="selectedSegment"  @ionChange="onSegmentChange">
        <ion-segment-button value="friends">
          <ion-label>{{ $t('Friends') || 'Friends' }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="newFriends">
                     <ion-label>{{ $t('NewFriends') || 'New Friends' }} <span class="red-dot" v-if="hasNewRequests && !requestsViewed"></span></ion-label>
 
        </ion-segment-button>
      </ion-segment>
    </ion-title>
</ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="friend-content" ref="contentRef">
     

      <!-- Friends List View -->
      <div v-show="selectedSegment === 'friends'" class="view-container">
        <ion-list class="friend-list">
          <!-- <ion-toolbar style=" --background: var(--ion-background-color);">
            <ion-title >Friends</ion-title>
          </ion-toolbar> -->
         
          <template v-for="(group, letter) in sortedGroupedBuddyList" :key="letter">
            <ion-list-header class="group-header" :id="'group-' + letter">
              {{ letter }}
            </ion-list-header>

          
            <ion-item-sliding v-for="friend in group" :key="friend.pub"
                             @ionDrag="handleItemDrag"
                             @ionDidOpen="handleItemOpen"
                             @ionDidClose="handleItemClose"
                             :ref="(el: any) => { if (el) itemSlidingRefs[friend.pub] = el; }">
              <ion-item @click="goToFriendProfile(friend.pub)" class="friend-item">
                <ion-avatar slot="start" v-if="userAvatars[friend.pub]" style="border: 2px solid black; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.649);">
                  <img style="width: 100%;height: 100%;object-fit: cover;" :src="userAvatars[friend.pub]" />
                </ion-avatar>
                <ion-avatar slot="start" v-else style="border: 2px solid black;  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.649);">
                  <img style="width: 100%;height: 100%;object-fit: cover;" :src="getGunAvatar(friend.pub)" />
                </ion-avatar>
                <ion-label>
                  <p style="font-size: 1.5rem; color: var(--ion-color-dark, #333);">{{ getDisplayName(friend.pub) }}</p>
                </ion-label>
              </ion-item>
              <ion-item-options side="end">
                <ion-item-option color="danger" @click.stop="removeBuddy(friend.pub)">
                  <ion-icon size="large" :icon="trashOutline" />
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </template>
        </ion-list>

        <!-- Alphabetical Index Bar (Fixed) -->
        <div class="index-bar">
          <div
            v-for="letter in indexLetters"
            :key="letter"
            class="index-letter"
            @click="scrollToLetter(letter)"
          >
            {{ letter }}
          </div>
        </div>

        <!-- Friend Count -->
        <ion-text class="friend-count">
          {{ filteredBuddyList.length }} {{ $t('afriend') }}
        </ion-text>
      </div>

      <!-- New Friends View (Add Friend + Requests) -->
      <div v-show="selectedSegment === 'newFriends'" class="view-container new-friends-view">
        <!-- Add Friend Section -->
        <div class="add-friend-section">
          <div class="section-header">
            <ion-icon :icon="personAddOutline" class="section-icon"></ion-icon>
            <h2>{{ $t('AddFriend') || 'Add Friend' }}</h2>
          </div>
          
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
                fill="solid" 
                @click="searchUser"
                :disabled="!friendPub.trim()"
                class="search-button"
              >
                <ion-icon :icon="searchOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-item>
          </div>

          <!-- Error Message -->
          <div v-if="buddyError" class="error-message">
            <ion-text color="danger">{{ buddyError }}</ion-text>
          </div>

          <!-- QR Code Button -->
          <div class="qr-button-container">
            <ion-button fill="outline" expand="block" @click="gotoscanner" >
              <ion-icon :icon="scanOutline" slot="start"></ion-icon>
              {{ $t('ScanQR') || 'Scan QR Code' }}
            </ion-button>
          </div>
        </div>

        <!-- Divider -->
        <div class="section-divider"></div>

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
                <ion-avatar slot="start" v-if="strangerAvatars[req.from]" >
                  <img :src="strangerAvatars[req.from]" />
                </ion-avatar>
                <ion-avatar slot="start" v-else>
                  <img :src="getGunAvatar(req.from)" alt="Avatar" />
                </ion-avatar>
                <ion-label>
                  <h2>{{ strangerAliases[req.from] || 'Loading...' }}</h2>
                  <p class="pub-key" @click.stop="copyPubWithFeedback(req.from)">
                    {{ $t('talkflowid') }}: {{ truncatePub(req.from) }}
                    <ion-icon :icon="copyOutline" class="copy-icon"></ion-icon>
                  </p>
                  <p v-if="req.message" class="message">{{ $t('message') }}: {{ req.message }}</p>
                </ion-label>

              </ion-item>

              <!-- Empty State -->
              <div v-if="!filteredReceivedRequests.length" class="empty-state">
                <ion-icon :icon="peopleOutline" class="empty-icon"></ion-icon>
                <p class="empty-text">{{ $t('noRequests') || 'No friend requests' }}</p>
                <p class="empty-subtext">{{ $t('noRequestsDesc') || 'New friend requests will appear here' }}</p>
              </div>
            </ion-list>
          </div>
        </div>
      </div>

      <!-- Request Details Modal (Bottom Sheet) -->
      <ion-modal
        :is-open="isModalOpen"
        class="request-modal"
        :breakpoints="[0, 0.5, 0.8]"
        :initial-breakpoint="0.5"
        @didDismiss="closeRequestModal"
      >
        <ion-content class="modal-content">
          <div class="modal-header">
            <ion-avatar v-if="selectedRequest?.avatar" class="modal-avatar">
              <img :src="selectedRequest.avatar"  />
            </ion-avatar>
            <ion-avatar v-else-if="selectedRequest?.from" class="modal-avatar">
              <img :src="getGunAvatar(selectedRequest.from)" alt="Avatar" />
            </ion-avatar>
            <div class="header-text">
              <h2>{{ selectedRequest?.alias || 'Loading...' }}</h2>
            </div>
            <ion-button fill="clear" @click="closeRequestModal" class="close-button">
              <ion-icon color="dark" :icon="closeOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
          <div class="modal-body">
            <ion-item lines="none">
              <ion-label position="stacked">PubKey</ion-label>
              <div class="pub-key-container">
                <ion-text>{{ selectedRequest?.from || '' }}</ion-text>
              </div>
            </ion-item>
            <ion-item lines="none" v-if="selectedRequest?.message">
              <ion-label position="stacked">Message</ion-label>
              <ion-text class="message-text">{{ selectedRequest.message }}</ion-text>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{$t('addblacklist')}}</ion-label>
              <ion-toggle slot="end" v-model="isBlocked" @ionChange="toggleBlacklist"></ion-toggle>
            </ion-item>
          </div>
          <div class="modal-actions">
            <ion-button expand="block" color="success" @click="handleAcceptRequest">
             {{$t('agree')}}
            </ion-button>
            <ion-button expand="block" fill="outline" color="danger" @click="handleRejectRequest">
              {{$t('refuse')}}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { pinyin } from 'pinyin-pro';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonListHeader,
  IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonIcon, IonAvatar, IonModal,
  IonSearchbar, IonText, IonBadge, IonContent as IonContentType, IonSegment, IonSegmentButton,
  IonInput, IonToggle,
} from '@ionic/vue';

import { 
  addCircleOutline, personAddOutline, scanOutline, searchOutline, trashOutline, earthOutline, 
  copyOutline, closeOutline, chevronForwardOutline, peopleOutline 
} from 'ionicons/icons';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from "gun-avatar";
import { toastController } from '@ionic/vue';
import { useSegmentState } from '@/composables/useSegmentState';

mountClass();
const chatFlowStore = getTalkFlowCore();
const {
  buddyList, receivedRequests, friendPub, buddyError, requestAddBuddy, openChat, removeBuddy,
  getAliasRealtime, userAvatars, friendRemarks, copyPub, searchUserProfile, requestsViewed,
  loadRequestsViewedState, saveRequestsViewedState, currentUserPub, setSelectedFriendPub,
  gun, acceptBuddyRequest, rejectBuddyRequest, addToBlacklist, removeFromBlacklist, 
  isInMyBlacklist, storageServ,
} = chatFlowStore;

// Define ReceivedRequest type
interface ReceivedRequest {
  from: string;
  message?: string;
}

const router = useRouter();
const searchQuery = ref('');
const contentRef = ref<InstanceType<typeof IonContentType> | null>(null);
const isItemOpen = ref(false);
const itemSlidingRefs = ref<Record<string, any>>({});

// Segment state with persistence - 默认显示好友列表
const {
  selectedSegment,
  isLoading: isSegmentLoading,
  updateSegmentState
} = useSegmentState({
  pageId: 'ContactsS',
  defaultSegment: 'friends',
  validSegments: ['friends', 'newFriends']
});

// State for stranger data (for friend requests)
const strangerAliases = ref<Record<string, string>>({});
const strangerAvatars = ref<Record<string, string>>({});

// Modal state for friend requests
const isModalOpen = ref(false);
const selectedRequest = ref<{ from: string; message?: string; alias?: string; avatar?: string } | null>(null);
const isBlocked = ref(false);

// 是否有新好友申请
const hasNewRequests = computed(() => receivedRequests.value.length > 0);

// Filter out already-added friends
const filteredReceivedRequests = computed(() => {
  return receivedRequests.value.filter(req => !buddyList.value.some(b => b.pub === req.from));
});

// Fetch stranger data from Gun.js
function fetchStrangerData(pub: string) {
  gun.get('users').get(pub).once((data: any) => {
    if (data) {
      strangerAliases.value[pub] = data.alias || 'No Name';
      strangerAvatars.value[pub] = data.avatar || '';
      console.log(`Fetched data for ${pub}:`, { alias: data.alias, avatar: data.avatar });
    } else {
      strangerAliases.value[pub] = 'No Name';
      strangerAvatars.value[pub] = '';
      console.log(`No data found for ${pub}`);
    }
  });
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
  console.log('Opening modal for request:', req);
  selectedRequest.value = {
    ...req,
    alias: strangerAliases.value[req.from],
    avatar: strangerAvatars.value[req.from],
  };
  isBlocked.value = isInMyBlacklist(req.from);
  isModalOpen.value = true;
  console.log('Modal state after opening:', { isModalOpen: isModalOpen.value, selectedRequest: selectedRequest.value });
}

// Close request modal
function closeRequestModal() {
  console.log('Closing modal');
  isModalOpen.value = false;
  selectedRequest.value = null;
}

// Toggle blacklist
async function toggleBlacklist() {
  if (!selectedRequest.value) return;
  console.log('Toggling blacklist for:', selectedRequest.value.from, 'New state:', isBlocked.value);
  if (isBlocked.value) {
    addToBlacklist(selectedRequest.value.from);
    await storageServ.saveBlacklist(selectedRequest.value.from, true);
  } else {
    removeFromBlacklist(selectedRequest.value.from);
    await storageServ.saveBlacklist(selectedRequest.value.from, false);
  }
}

// Handle accept request
function handleAcceptRequest() {
  if (selectedRequest.value?.from) {
    console.log('Accepting request for:', selectedRequest.value.from);
    acceptBuddyRequest(selectedRequest.value.from);
    closeRequestModal();
  }
}

// Handle reject request
function handleRejectRequest() {
  if (selectedRequest.value?.from) {
    console.log('Rejecting request for:', selectedRequest.value.from);
    rejectBuddyRequest(selectedRequest.value.from);
    closeRequestModal();
  }
}

// Handle segment change
function onSegmentChange(event: CustomEvent) {
  const selectedValue = event.detail.value;
  updateSegmentState(selectedValue);
  
  if (selectedValue === 'newFriends' && hasNewRequests.value && !requestsViewed.value) {
    requestsViewed.value = true;
    saveRequestsViewedState();
  }
}

// 初始化时加载状态
onMounted(() => {
  loadRequestsViewedState();
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.addEventListener('touchstart', detectSwipeDirection);
  }
  
  // Initialize stranger data for friend requests
  filteredReceivedRequests.value.forEach(req => {
    fetchStrangerData(req.from);
  });

  // Watch for new friend requests and fetch stranger data
  const unwatchRequests = computed(() => filteredReceivedRequests.value);
  const previousRequestsLength = ref(filteredReceivedRequests.value.length);
  
  const stopWatcher = () => {
    // This will be cleaned up automatically when component unmounts
  };

  // Mark requests as viewed when switching to requests tab
  if (selectedSegment.value === 'newFriends' && hasNewRequests.value && !requestsViewed.value) {
    requestsViewed.value = true;
    saveRequestsViewedState();
  }
});

onBeforeUnmount(() => {
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.removeEventListener('touchstart', detectSwipeDirection);
  }
});

// 滑动事件处理
const handleItemDrag = (event: CustomEvent) => {
  const { amount } = event.detail;
  if (Math.abs(amount) > 5) {
    document.body.classList.add('disable-scroll');
  }
};

const handleItemOpen = () => {
  isItemOpen.value = true;
  document.body.classList.add('disable-scroll');
};

const handleItemClose = () => {
  isItemOpen.value = false;
  setTimeout(() => {
    document.body.classList.remove('disable-scroll');
  }, 100);
};

const detectSwipeDirection = (event: TouchEvent) => {
  const touch = event.touches[0];
  const startX = touch.clientX;
  const startY = touch.clientY;

  const moveHandler = (moveEvent: TouchEvent) => {
    const moveTouch = moveEvent.touches[0];
    const deltaX = moveTouch.clientX - startX;
    const deltaY = moveTouch.clientY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
      document.body.classList.add('disable-scroll');
    }
  };

  const endHandler = () => {
    if (!isItemOpen.value) {
      setTimeout(() => {
        document.body.classList.remove('disable-scroll');
      }, 100);
    }
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('touchend', endHandler);
  };

  document.addEventListener('touchmove', moveHandler);
  document.addEventListener('touchend', endHandler);
};

// 页面导航
function goToFriendRequests() {
  updateSegmentState('newFriends');
  if (hasNewRequests.value && !requestsViewed.value) {
    requestsViewed.value = true;
    saveRequestsViewedState();
  }
}

function goToFriendProfile(userPub: string) {
  if (userPub) {
    router.push({ path: '/friend-profile', query: { pub: userPub } });
  }
}

const goToProfile = (userPub: string) => {
  if (userPub === currentUserPub.value) {
    router.push('/MyMoments');
  } else {
    setSelectedFriendPub(userPub);
    router.push('/FriendMoments');
  }
};

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
  console.log('移除 pubkey: 前缀后的 pub:', pub);

  const isFriend = buddyList.value.some(b => b.pub === pub);

  try {
    console.log('调用 searchUserProfile，传入 pub:', pub);
    const userExists = await searchUserProfile(pub);
    console.log('searchUserProfile 返回结果:', userExists);

    if (userExists) {
      if (isFriend) {
        router.push({ path: '/friend-profile', query: { pub } });
      } else {
        router.push({ path: '/stranger-profile', query: { pub } });
      }
      friendPub.value = '';
      buddyError.value = '';
    } else {
      buddyError.value = 'There is no user in the current relay.';
    }
  } catch (err) {
    buddyError.value = 'The search failed. Please use the new relay.';
  }
}

function getDisplayName(pub: string): string {
  const remark = friendRemarks.value[pub]?.remark;
  return remark && remark.trim() !== '' ? remark : getAliasRealtime(pub);
}

const filteredBuddyList = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return buddyList.value;
  return buddyList.value.filter(b => getDisplayName(b.pub).toLowerCase().includes(q));
});

function getInitialLetter(pub: string): string {
  const displayName = getDisplayName(pub);
  const letter = pinyin(displayName, { pattern: 'first', type: 'array' })[0] || '#';
  const upper = letter.toUpperCase();
  return /^[A-Z]$/.test(upper) ? upper : '#';
}

const sortedGroupedBuddyList = computed(() => {
  const groups: Record<string, typeof buddyList.value> = {};
  filteredBuddyList.value.forEach(b => {
    const letter = getInitialLetter(b.pub);
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(b);
  });

  for (const letter in groups) {
    groups[letter].sort((a, b) => getDisplayName(a.pub).localeCompare(getDisplayName(b.pub)));
  }

  const sortedKeys = Object.keys(groups).sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
  const sortedObj: Record<string, typeof buddyList.value> = {};
  sortedKeys.forEach(k => sortedObj[k] = groups[k]);
  return sortedObj;
});

const indexLetters = computed(() => {
  const letters = Object.keys(sortedGroupedBuddyList.value);
  return letters.length > 0 ? letters : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];
});

function scrollToLetter(letter: string) {
  const element = document.getElementById(`group-${letter}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  });
};

import { Browser } from '@capacitor/browser'
// URL 简单正则：带或不带协议都行
const URL_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/

async function onSearchEnter() {
  const q = searchQuery.value.trim()
  if (!q) {
    return
  }

  // 1) 如果看上去像 URL，就在内置浏览器打开
  if (URL_REGEX.test(q)) {
    const url = q.startsWith('http://') || q.startsWith('https://')
      ? q
      : `https://${q}`
    await Browser.open({ url })
    return
  }

  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`
  await Browser.open({ url: googleUrl })
}

</script>

<style scoped>

.liquid-toolbar {
  --border-color: transparent;
  --background: var(--background-color-no);
  backdrop-filter: blur(10px);
}

/* Segment Tabs */
.segment-tabs {
  /* margin: 8px 16px; */
  --background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  position: relative;
}

.segment-tabs ion-segment-button {
  --background: transparent;
  --background-checked: var(--ion-color-primary);
  --color: var(--ion-color-dark);
  --color-checked: #fff;
  --indicator-color: transparent;
  border-radius: 8px;
  margin: 4px;
  position: relative;
}

/* Red dot notification */
.red-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #ff4757;
  border-radius: 50%;
  margin-left: 6px;
  vertical-align: middle;
  position: relative;
  top: -1px;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
  animation: pulse 2s infinite;
  margin-right: 10px;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(255, 71, 87, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 71, 87, 0);
  }
}

/* Content */
.friend-content {
  --background: transparent;
  position: relative;
  overflow: visible;
  touch-action: auto;
  padding: 8px 0;
}

/* View Containers */
.view-container {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s ease-in-out;
}

/* New Friends View */
.new-friends-view {
  padding: 16px;
  max-width: 100%;
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

/* Add Friend Section */
.add-friend-section {
  margin-bottom: 32px;
}

.input-search-container {
  margin-bottom: 12px;
}

.search-input-item {
  --background: rgba(255, 255, 255, 0.1);
  --border-radius: 12px;
  --padding-start: 16px;
  --padding-end: 8px;
  --inner-padding-end: 0;
  backdrop-filter: blur(10px);
  border: none;
}

.friend-input {
  flex: 1;
  font-size: 16px;
}

.search-button {
  --border-radius: 8px;
  --padding-start: 12px;
  --padding-end: 12px;
  margin-left: 8px;
  height: 40px;
}

.error-message {
  margin: 8px 4px;
  padding: 8px 12px;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.2);
  border-radius: 8px;
}

.qr-button-container {
  margin-top: 8px;
}



/* Section Divider */
.section-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0.2) 80%,
    transparent 100%
  );
  margin: 24px 0;
}

/* Requests Section */
.requests-section {
  margin-bottom: 32px;
}

.requests-container {
  background: transparent;
}

.requests-list {
  background: transparent;
  padding: 0;
}

.request-item {
  --background: rgba(255, 255, 255, 0.1);
  --border-radius: 12px;
  --padding-start: 16px;
  --padding-end: 16px;
  --inner-padding-end: 0;
  --min-height: 70px;
  margin-bottom: 12px;
  backdrop-filter: blur(10px);
  border: none;
  transition: all 0.2s ease;
}

.request-item:hover {
  --background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.request-item ion-avatar {
  width: 50px;
  height: 50px;
  margin-right: 12px;
}

.request-item ion-label {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.request-item h2 {
  font-size: 16px;
  font-weight: 500;
  color: var(--ion-text-color, #000);
  margin: 0 0 4px 0;
}

.request-item .pub-key {
  font-size: 12px;
  color: var(--ion-color-step-600, #666);
  margin: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.request-item .copy-icon {
  font-size: 14px;
  margin-left: 4px;
  color: var(--ion-color-step-600, #666);
}

.request-item .copy-icon:hover {
  color: var(--ion-color-primary, #3880ff);
}

.request-item .message {
  font-size: 12px;
  color: var(--ion-color-step-600, #666);
  margin: 4px 0 0 0;
}

.forward-icon {
  color: var(--ion-color-step-400, #999);
  font-size: 20px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--ion-color-step-600, #666);
}

.empty-icon {
  font-size: 64px;
  color: var(--ion-color-step-400, #999);
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 8px 0;
}

.empty-subtext {
  font-size: 14px;
  margin: 0;
  opacity: 0.8;
}

/* Friend List */
.friend-list {
  padding: 0 8px;
  margin-bottom: 50px;
  background: transparent;
}

.group-header {
  --background: var(--ion-background-color, #fff);
  --color: var(--ion-color-step-600, #666);
  font-size: 12px;
  font-weight: 600;
  min-height: 10px;
  padding: 12px 8px 6px 8px;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0px;
  z-index: 5;
}

.friend-item {
  --inner-padding-end: 0;
  --min-height: 30px;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  --border-radius: 12px;
  --border-color: transparent;
}

.friend-item:hover {
  transition: all 0.2s ease;
}

ion-avatar {
  width: 55px;
  height: 55px;
  margin-right: 12px;
}

ion-label p {
  font-size: 1.5rem;
  color: var(--ion-color-dark, #333);
  font-weight: 500;
  margin: 0;
  line-height: 1.3;
}

ion-item-option {
  padding: 0 15px;
  font-size: 14px;
  min-width: 60px;
  margin: 0 2px;
  border-radius: 8px;
}

/* 为滑动选项添加更好的间距 */
ion-item-options {
  border-radius: 12px;
  margin: 8px 0;
}

/* Alphabetical Index Bar */
.index-bar {
  position: absolute;
  top: 280px;
  right: 8px;
  transform: translateY(-50%);
  width: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 8px 4px;
  user-select: none;
  z-index: 9999;
}

.index-letter {
  font-size: 10px;
  padding: 3px 0;
  cursor: pointer;
  text-align: center;
  font-weight: 500;
  color: var(--ion-color-dark, #333);
  transition: color 0.2s ease;
}

.index-letter:active {
  color: #38ffc0;
}

/* Friend Count */
.friend-count {
  display: block;
  text-align: center;
  padding: 16px 0;
  font-size: 12px;
  margin-bottom: 200px;
  color: var(--ion-color-medium, #666);
  font-weight: 500;
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
  width: 50px;
  height: 50px;
}

.header-text {
  flex: 1;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--ion-text-color, #000);
  margin: 0;
}

.close-button {
  --padding-start: 0;
  --padding-end: 0;
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
  padding: 10px;
  background: var(--ion-color-step-100, #f7f7f7);
  border-radius: 8px;
}

.modal-body .message-text {
  white-space: pre-wrap;
  padding: 10px;
  background: var(--ion-color-step-100, #f7f7f7);
  border-radius: 8px;
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
  gap: 10px;
  margin: 0 10px;
}

.modal-actions ion-button {
  --border-radius: 8px;
  height: 44px;
}

/* 滑动优化样式 */
:global(.disable-scroll) {
  overflow: hidden !important;
  position: fixed;
  width: 100%;
  height: 100%;
  touch-action: none;
}

:deep(ion-item-sliding.item-sliding-active-slide) {
  overflow: hidden !important;
  touch-action: pan-x !important;
}

.friend-list {
  touch-action: auto;
}

:global(.disable-scroll .friend-content) {
  overflow: hidden !important;
}

/* Responsive Design */
@media (max-width: 768px) {
  .new-friends-view {
    padding: 12px;
  }
  
  .section-header h2 {
    font-size: 18px;
  }
  
  .search-button {
    --padding-start: 8px;
    --padding-end: 8px;
  }
}

</style>