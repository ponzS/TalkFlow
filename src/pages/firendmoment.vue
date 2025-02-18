<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
    <ion-content>
     <MomentsTest/>
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
import { useChatFlow } from '@/composables/TalkFlowCore'
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
  LoginData,
} = useChatFlow()

onMounted(() => {
  if (router.currentRoute.value.path !== '/chatpage') {

    closeChat() // 如果当前路由不是 chatpage，调用 closeWindow 方法
  }
})



</script>
