<!-- eslint-disable vue/multi-word-component-names -->
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

        <div class="brand">MyKey</div>
      </template>
    </NavBarS>


      <div style="height: 110px"></div>


      <h3>ChangeName</h3>

<img
  v-if="userAvatars[currentUserPub!]"
  :src="userAvatars[currentUserPub!]"
  alt="Avatar"
  style="width: 50px; height: 50px; border-radius: 50%; margin-right: 8px"
/>

<ion-item>
  <ion-label position="floating">New Name</ion-label>
  <ion-input v-model="newAliasInput" placeholder=""></ion-input>
</ion-item>
<ion-button expand="block" @click="updateAlias" style="margin-top: 8px"> update</ion-button>
<p v-if="updateAliasMsg" style="color: green">{{ updateAliasMsg }}</p>

<ion-item>
  <ion-label position="floating">New Link</ion-label>
  <ion-input v-model="newAliasInput1" placeholder=""></ion-input>
</ion-item>
<ion-button expand="block" @click="updateAlias1" style="margin-top: 8px"> update </ion-button>
<p v-if="updateAliasMsg1" style="color: green">{{ updateAliasMsg1 }}</p>


<!-- Update Avatar -->
<h3 style="margin-top: 16px">Avatar</h3>
<input type="file" accept="image/*" @change="handleAvatarUpload" />
<div v-if="avatarUrl" style="margin-top: 8px">
  <img
    :src="avatarUrl"
    alt="Avatar Preview"
    style="width: 100px; height: 100px; border-radius: 50%"
  />
</div>
<ion-button
  expand="block"
  @click="updateAvatar"
  style="margin-top: 8px"
  :disabled="!avatarFile"
>
  Update Avatar
</ion-button>
<p v-if="updateAvatarMsg" style="color: green">{{ updateAvatarMsg }}</p>




    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonPage,IonInput } from '@ionic/vue'
import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import soundManager from '@/composables/sounds'
import chatFlowStore from '@/composables/TalkFlowCore'
const router = useRouter()
const {
  // 修改签名
  newAliasInput1,
  updateAlias1,
  updateAliasMsg1,
  // Modal
  isOpen,
  setOpen,
  copyPub,
  removeBuddy,
  // Registration,
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

  // New Features
  // Nickname Update
  newAliasInput,
  updateAlias,
  updateAliasMsg,

  // Avatar Update
  avatarFile,
  avatarUrl,
  handleAvatarUpload,
  updateAvatar,
  updateAvatarMsg,
  userAvatars,

  // Voice Recording
  isRecording,
  startRecording,
  stopRecording,
  sendVoiceMessage,
  recordedAudio,

  // Calls
} = chatFlowStore


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
