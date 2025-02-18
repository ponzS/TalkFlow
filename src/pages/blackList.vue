<template>
  <ion-page>
    <ion-content>
      <NavBarS>
      <template #brand>
        <div class="back-button" @click="() => router.go(-1)">
              <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
            </div>
      </template>
      <template #links>

        <div class="brand">{{ $t('blacklist') }}</div>
      </template>
    </NavBarS>


      <div style="height: 110px"></div>



<!-- ========== (B) 黑名单管理 ========== -->
<div style="border: 1px solid #aaa; margin-bottom: 16px; padding: 8px">
  <h3>{{ $t('blacklist') }}</h3>
  <ion-item>
    <ion-label position="floating">{{ $t('talkflowid') }}</ion-label>
    <ion-input v-model="blockPub" placeholder="" />
  </ion-item>
  <ion-button @click="addToBlacklist">{{ $t('addblacklist') }}</ion-button>
  <ion-button @click="removeFromBlacklist">{{ $t('deleteblacklist') }}</ion-button>

  <h4 style="margin-top: 16px">{{ $t('myblacklist') }}</h4>
  <ion-list>
    <ion-item v-for="p in blacklist" :key="p">
      <ion-label @click="copyPub(p)">{{ p }}</ion-label>
      <ion-button color="danger" @click="removeFromBlacklist(p)">{{ $t('deleteblacklist') }}</ion-button>
    </ion-item>
  </ion-list>
</div>


    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonList,
  IonTextarea,
  IonModal,
  IonButtons,
} from '@ionic/vue'
import chatFlowStore from '@/composables/TalkFlowCore'
import { useRouter } from 'vue-router'

const router = useRouter()

const {
  // Modal
  isOpen,
  setOpen,
  copyPub,
  removeBuddy,
  //Registration,
  newAlias,
  newPassphrase,
  generateMsg,
  encryptedKeyPair,
  generateKeyPair,


  // Login
  passphrase,
  encryptedKeyInput,
  importKeyPair,
  isLoggedIn,
  currentUserPub,
  currentUserAlias,
  loginError,

  // Logout
  onLogout,

  // Blacklist
  blockPub,
  blacklist,
  addToBlacklist,
  removeFromBlacklist,
  isInMyBlacklist,

  // Friends & Requests
  friendPub,
  buddyError,
  buddyList,
  receivedRequests,
  requestAddBuddy,
  acceptBuddyRequest,
  rejectBuddyRequest,

  // Chat
  currentChatPub,
  newMsg,
  chatMessages,
  chatPreviewList,
  visibleChatPreviewList,
  openChat,
  closeChat,
  hideCurrentChat,
  showCurrentChat,
  sendChat,
  refreshChat,
  onDeleteChatClick,

  // Aliases
  getAliasRealtime,

  // Notifications
  showNotification,

  // Utility Functions
  formatTimestamp,

  // Refs
  chatListRef,
} = chatFlowStore

import { watch } from 'vue'

watch(chatMessages, () => {
  if (chatListRef.value) {
    chatListRef.value.scrollTop = chatListRef.value.scrollHeight
  }
})
</script>

<style scoped>
.i-material-symbols-arrow-back-ios-new-rounded {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m9.55 12l7.35 7.35q.375.375.363.875t-.388.875t-.875.375t-.875-.375l-7.7-7.675q-.3-.3-.45-.675t-.15-.75t.15-.75t.45-.675l7.7-7.7q.375-.375.888-.363t.887.388t.375.875t-.375.875z'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}
.brand {
  font-size: 1.5em;
  font-weight: bold;
}
</style>
