<template>
   <ion-content :fullscreen="true" >

      <Chat v-if="currentComponent === 'Chat'" />

      <Contacts v-if="currentComponent === 'Contacts'" />
 
      <Discover v-if="currentComponent === 'Discover'" />
  
      <Profile v-if="currentComponent === 'Profile'" />

  </ion-content>




  <ion-footer :translucent="true">
    <ion-toolbar>
      <!-- Flex容器 -->
      <div style="display: flex; justify-content: space-around; align-items: center;">
        <!-- 每个按钮 -->
        <div class="greenicon" @click="switchTo('Chat')" :class="{ active: currentComponent === 'Chat' }"> 
          <div class="i-iconoir-chat-lines"></div>
        </div>
        <div class="greenicon" @click="switchTo('Contacts')" :class="{ active: currentComponent === 'Contacts' }">
          <div class="i-ri-contacts-line"></div>
        </div>
        <div class="greenicon" @click="switchTo('Discover')" :class="{ active: currentComponent === 'Discover' }">
          <div class="i-mynaui-atom"></div>
        </div>
        <div class="greenicon" @click="switchTo('Profile')" :class="{ active: currentComponent === 'Profile' }">
          <div class="i-solar-user-broken"></div>
        </div>
      </div>
    </ion-toolbar>
  </ion-footer>
  
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Chat from './ChatS.vue'
import Contacts from './ContactsS.vue'
import Discover from './DiscoverS.vue'
import Profile from './MeS.vue'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useRouter } from 'vue-router'

import chatFlowStore from '@/composables/TalkFlowCore'
import {
    IonTabs,
    IonFooter,
    IonToolbar,
    IonTabBar,
    IonTabButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonIcon,
  } from '@ionic/vue';
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
} = chatFlowStore

const currentComponent = ref('Profile')

/** 切换组件并触发轻微震动 */
function switchTo(componentName: string) {
  currentComponent.value = componentName
  // 轻微冲击振动
  //Haptics.impact({ style: ImpactStyle.Light })
}

const router = useRouter()

if (isLoggedIn.value === false) {
 
  router.replace('/')
}
import { watch } from 'vue'

// watch(isLoggedIn, () => {
//   if (isLoggedIn.value === false) {
//     router.replace('/')
//   }
// })



watch(chatMessages, () => {
  if (chatListRef.value) {
    chatListRef.value.scrollTop = chatListRef.value.scrollHeight
  }
})
</script>

<style scoped>


.i-mynaui-atom {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5'%3E%3Cpath d='M15.407 8.593c4.6 4.6 6.802 9.853 4.92 11.735c-1.88 1.881-7.135-.322-11.734-4.921S1.791 5.554 3.673 3.672c1.88-1.881 7.134.322 11.734 4.921'/%3E%3Cpath d='M8.594 8.593c-4.6 4.6-6.803 9.853-4.921 11.735s7.135-.322 11.734-4.921s6.803-9.853 4.921-11.735s-7.135.322-11.734 4.921M11.75 12h.5'/%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 2em;
  height: 2em;
  
}
.phone-container {
  background-color: transparent;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.i-iconoir-chat-lines {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M8 10h8m-8 4h4m0 8c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.96 9.96 0 0 0 12 22'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 2em;
  height: 2em;
  
}

.i-ri-contacts-line {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M19 7h5v2h-5zm-2 5h7v2h-7zm3 5h4v2h-4zM2 22a8 8 0 1 1 16 0h-2a6 6 0 0 0-12 0zm8-9c-3.315 0-6-2.685-6-6s2.685-6 6-6s6 2.685 6 6s-2.685 6-6 6m0-2c2.21 0 4-1.79 4-4s-1.79-4-4-4s-4 1.79-4 4s1.79 4 4 4'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 2em;
  height: 2em;
}
.i-hugeicons-discover-circle {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' color='currentColor'%3E%3Cpath d='M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10s10-4.477 10-10'/%3E%3Cpath d='m12.401 8.298l2.92-.973c.886-.296 1.33-.443 1.564-.21c.233.234.086.677-.21 1.564l-.973 2.92c-.503 1.51-.755 2.265-1.297 2.806c-.541.542-1.296.794-2.806 1.297l-2.92.973c-.887.296-1.33.444-1.564.21s-.086-.678.21-1.564l.973-2.92c.503-1.51.755-2.265 1.297-2.806c.541-.542 1.296-.794 2.806-1.297M12 12l-.006.006'/%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 2em;
  height: 2em;
}
.i-solar-user-broken {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none' stroke='currentColor' stroke-width='1.5'%3E%3Ccircle cx='12' cy='6' r='4'/%3E%3Cpath stroke-linecap='round' d='M19.998 18q.002-.246.002-.5c0-2.485-3.582-4.5-8-4.5s-8 2.015-8 4.5S4 22 12 22c2.231 0 3.84-.157 5-.437'/%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 2em;
  height: 2em;
}


.greenicon.active {
  color: rgb(42, 125, 112);

  transition: all 0.2s ease-in-out;
}

</style>
