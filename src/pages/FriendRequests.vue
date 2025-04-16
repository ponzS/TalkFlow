<template>
  <ion-page>
    <ion-header :translucent="true"  collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
          <ion-back-button color="dark" @click="router.go(-1)"></ion-back-button>
        </ion-buttons>
        <ion-title></ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="friend-requests-content">
      <ion-list class="requests-list">
        <ion-item
          v-for="(req, idx) in filteredReceivedRequests"
          :key="req.from + idx"
          button
          @click="openRequestModal(req)"
          class="request-item"
          lines="full"
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
        <ion-item v-if="!filteredReceivedRequests.length" class="empty-item" lines="none">
          <ion-label class="empty-label">NULL</ion-label>
        </ion-item>
      </ion-list>

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
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonAvatar, IonIcon, IonModal, IonButton, IonText, IonToggle,
} from '@ionic/vue';
import { useChatFlow } from '@/composables/TalkFlowCore';
import { copyOutline, closeOutline } from 'ionicons/icons';
import { toastController } from '@ionic/vue';
import { useRouter }  from 'vue-router'
import { gunAvatar, extractFromFile, mountClass } from "gun-avatar";
import { getTalkFlowCore } from '@/composables/TalkFlowCore';

mountClass();
const router = useRouter();

// Define ReceivedRequest type
interface ReceivedRequest {
  from: string;
  message?: string;
}

const chatFlowStore = getTalkFlowCore();
const {
  gun, receivedRequests, buddyList, acceptBuddyRequest, rejectBuddyRequest, copyPub,
  addToBlacklist, removeFromBlacklist, isInMyBlacklist, storageServ,
} = chatFlowStore;

// State for stranger data
const strangerAliases = ref<Record<string, string>>({});
const strangerAvatars = ref<Record<string, string>>({});

// Modal state with avatar
const isModalOpen = ref(false);
const selectedRequest = ref<{ from: string; message?: string; alias?: string; avatar?: string } | null>(null);
const isBlocked = ref(false);

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

// Filter out already-added friends
const filteredReceivedRequests = computed(() => {
  return receivedRequests.value.filter(req => !buddyList.value.some(b => b.pub === req.from));
});

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

// Initialize stranger data on mount
onMounted(() => {
  console.log('Mounting FriendRequests, fetching data for:', filteredReceivedRequests.value);
  filteredReceivedRequests.value.forEach(req => {
    fetchStrangerData(req.from);
  });
});

import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

// Generate avatar based on user's public key
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value
    // draw: 'squares'
  });
};
</script>

<style scoped>
/* Toolbar */
.liquid-toolbar {
  --border-color: transparent;
}

/* Content */
.friend-requests-content {
  --background: var(--ion-background-color, #fff);
  --padding-bottom: 20px;
}

/* Requests List */
.requests-list {
  padding: 0;
  background: var(--ion-background-color, #fff);
}

.request-item {
  --padding-start: 10px;
  --padding-end: 10px;
  --inner-padding-end: 0;
  --min-height: 70px;
  
}

.request-item ion-avatar {
  width: 40px;
  height: 40px;
  margin-right: 10px;
 
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

/* Empty State */
.empty-item {
  --background: var(--ion-background-color, #fff);
  --min-height: 100px;
}

.empty-label {
  text-align: center;
  font-size: 16px;
  color: var(--ion-color-step-600, #666);
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
  max-height: 100px; /* Limit height */
  overflow-y: auto; /* Scroll if too long */
  word-break: break-all; /* Wrap long keys */
  padding: 10px;
  background: var(--ion-color-step-100, #f7f7f7);
  border-radius: 8px;
}

.modal-body .message-text {
  white-space: pre-wrap; /* Preserve line breaks */
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
</style>