<!-- eslint-disable vue/multi-word-component-names -->
<!-- eslint-disable vue/no-deprecated-slot-attribute -->
<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div style="height: 110px"></div>


    <!-- ========== (B) 黑名单管理 ========== -->
    <div style="border: 1px solid #aaa; margin-bottom: 16px; padding: 8px">
      <h3>黑名单</h3>
      <ion-item>
        <ion-label position="floating">要拉黑的公钥</ion-label>
        <ion-input v-model="blockPub" placeholder="输入公钥" />
      </ion-item>
      <ion-button @click="addToBlacklist">拉黑</ion-button>
      <ion-button @click="removeFromBlacklist">移除黑名单</ion-button>

      <h4 style="margin-top: 16px">我的黑名单列表</h4>
      <ion-list>
        <ion-item v-for="p in blacklist" :key="p">
          <ion-label>{{ p }}</ion-label>
          <ion-button color="danger" @click="removeFromBlacklist(p)">移除</ion-button>
        </ion-item>
      </ion-list>
    </div>

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
