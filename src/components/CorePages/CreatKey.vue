<!-- eslint-disable vue/multi-word-component-names -->
<!-- eslint-disable vue/no-deprecated-slot-attribute -->
<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <!-- ========== (F) 注册对话框 ========== -->

  <!-- 生成新密钥对 -->
  <div style="border: 1px solid #aaa; margin-bottom: 16px; padding: 8px; width: 100%; height: 100%">
    <h3>生成密钥对 (Create Key Pair)</h3>
    <div @click="router.go(-1)">返回</div>
    <ion-item>
      <ion-label position="floating">Alias (可选)</ion-label>
      <ion-input v-model="newAlias" placeholder="我的昵称" />
    </ion-item>
    <ion-item>
      <ion-label position="floating">离线密码 (AES加密私钥)</ion-label>
      <ion-input type="password" v-model="newPassphrase" placeholder="输入离线密码" />
    </ion-item>
    <ion-button @click="generateKeyPair">生成并加密私钥</ion-button>
    <p style="margin-top: 8px; color: blue">{{ generateMsg }}</p>

    <div
      v-if="encryptedKeyPair"
      style="margin-top: 16px; border: 1px solid #4caf50; padding: 8px; background-color: #e8f5e9"
    >
      <h4>加密私钥:</h4>
      <p style="word-break: break-all">{{ encryptedKeyPair }}</p>

      <ion-button fill="clear" @click="copyPub(encryptedKeyPair)">复制私钥</ion-button>
      <p style="color: green; margin-top: 8px">请妥善保管此文件</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
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
