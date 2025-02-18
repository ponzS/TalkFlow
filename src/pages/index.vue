<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
  
      <IndexPage />

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
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'

// 页面挂载时设置键盘不调整 WebView 大小
onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Keyboard.setResizeMode({ mode: 'none' as any })
  // closeChat()

  if (router.currentRoute.value.path !== '/chatpage') {

closeChat() 
}
})

// 页面离开时恢复默认模式（例如 native）
onBeforeUnmount(() => {
  Keyboard.setResizeMode({ mode: 'native' as KeyboardResize })
})
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



// onMounted(() => {
//   if (router.currentRoute.value.path !== '/chatpage') {

//     closeChat() 
//   }

// //   if (isLoggedIn.value === false) {

// // router.push('/i18n')

// // }
// })
// if (isLoggedIn.value === false) {

// router.push('/')

// }

// if (isLoggedIn.value === false) {
// if (LoginData.value === 0) {
//   router.push('/i18n')
// } else {
//   router.push('/loginpage')
// }
// }

import { watch } from 'vue'

watch(isLoggedIn, () => {
  if (isLoggedIn.value === false) {

      router.push('/')
  
  }
})

// watch(LoginData, () => {
//   if (LoginData.value === 0) {
//     router.push('/i18n')
//   } else {
//     router.push('/loginpage')
//   }
// })

watch(chatMessages, () => {
  if (chatListRef.value) {
    chatListRef.value.scrollTop = chatListRef.value.scrollHeight
  }
})
</script>
