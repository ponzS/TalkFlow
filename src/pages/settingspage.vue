<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
    <ion-content>
      <div class="setting-container">
        <NavBarS>
          <template #brand>
            <div class="back-button" @click="() => router.go(-1)">
              <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
            </div>
          </template>
          <template #links>
            <span class="title">Setting</span>
          </template>
        </NavBarS>

        <div class="setting-content">
          <div style="height: 130px"></div>
          <!-- 账号与安全 -->
          <ion-list>




            <!-- <ion-item>
              <ion-icon class="i-eos-icons-admin-outlined"></ion-icon>

              <ion-label>账号与安全</ion-label>
            </ion-item> -->

            <ion-item @click="myself">
              <ion-icon class="i-carbon-user-admin"></ion-icon>

              <ion-label>{{ $t('setforme') }}</ion-label>
            </ion-item>

            <!-- <ion-item>
              <ion-icon class="i-solar-chat-round-unread-broken"></ion-icon>

              <ion-label>消息通知</ion-label>
            </ion-item> -->
          </ion-list>

          <!-- 应用设置 -->
          <ion-list>
            <ion-item @click="languageSwitchers">
              <ion-icon class="i-tabler-world"></ion-icon>

              <ion-label>{{ $t('language') }}</ion-label>
            </ion-item>
            <ion-item @click="openCapacitorSite">
              <ion-icon class="i-ic-sharp-help-outline"></ion-icon>

              <ion-label>{{ $t('help') }}</ion-label>
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-item @click="blackList">
              <ion-icon class="i-ic-baseline-playlist-remove"></ion-icon>

              <ion-label>{{ $t('blacklist') }}</ion-label>
            </ion-item>
          </ion-list>

          <!-- 账户操作 -->
          <ion-list>
            <ion-item @click="logout">
              <ion-icon class="i-cuida-logout-outline"></ion-icon>

              <ion-label>{{ $t('logout') }}</ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Browser } from '@capacitor/browser'
import { IonList, IonItem, IonIcon, IonLabel, IonHeader, IonToolbar, IonTitle,IonPage,IonContent } from '@ionic/vue'
import { useChatFlow } from '@/composables/TalkFlowCore'

const router = useRouter()

const openCapacitorSite = async () => {
  await Browser.open({ url: 'https://ponzs.com' })
}

const languageSwitchers = () => {
  router.push('/i18nset')
}

const blackList = () => {
  router.push('/blackList')
}

const myself = () => {
  router.push('/myself')
}

const {

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
} = useChatFlow()

 import soundManager from '@/composables/sounds'

const logout = () => {
   router.replace('/')
  onLogout()

 soundManager.play('click5')


}

 import { watch } from 'vue'

watch(isLoggedIn, () => {
  if (isLoggedIn.value === false) {

    router.replace('/')
  
  }
})
</script>

<style scoped>

.i-mdi-account-settings-variant {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath d='M8.999 3.999a4.002 4.002 0 0 0 0 8.003a3.999 3.999 0 0 0 3.998-4.005A3.998 3.998 0 0 0 9 4zm0 10C6.329 13.999 1 15.332 1 17.997V20H12.08a6.233 6.233 0 0 1-.078-1.001c0-1.514.493-2.988 1.407-4.199c-1.529-.523-3.228-.801-4.41-.801zm8.99 0a.261.261 0 0 0-.25.21l-.19 1.319a4.091 4.091 0 0 0-.85.492l-1.24-.502a.265.265 0 0 0-.308.112l-1.001 1.729a.255.255 0 0 0 .059.322l1.06.83a3.95 3.95 0 0 0 0 .981l-1.06.83a.26.26 0 0 0-.059.318l1.001 1.729c.059.111.19.151.308.111l1.24-.497c.258.2.542.366.85.488l.19 1.318c.02.122.122.21.25.21h2.001c.122 0 .23-.088.25-.21l.19-1.318c.297-.132.59-.288.84-.488l1.25.497c.111.04.239 0 .313-.111l.996-1.729a.256.256 0 0 0-.059-.317l-1.07-.83c.02-.162.04-.323.04-.494c0-.171-.01-.328-.04-.488l1.06-.83c.087-.084.121-.21.059-.322l-.996-1.729a.263.263 0 0 0-.313-.113l-1.24.503c-.26-.2-.543-.37-.85-.492l-.19-1.32a.238.238 0 0 0-.24-.21M18.989 17.5c.83 0 1.5.669 1.5 1.499c0 .83-.67 1.498-1.5 1.498S17.49 19.83 17.49 19s.669-1.499 1.499-1.499z' fill='currentColor'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.1em;
  height: 1.1em;
}


.i-ic-baseline-playlist-remove {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M14 10H3v2h11zm0-4H3v2h11zM3 16h7v-2H3zm11.41 6L17 19.41L19.59 22L21 20.59L18.41 18L21 15.41L19.59 14L17 16.59L14.41 14L13 15.41L15.59 18L13 20.59z'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.2em;
  height: 1.2em;
}
.setting-container {
  width: 100%;
  height: 100%;
  background-color: var(--ion-background-color);
  padding: 0;
  margin: 0;
}
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
.title {
  font-size: 1.5rem;
  font-weight: bold;
}
.back-button {
  background-color: transparent;
  color: var(--ion-text-color);
  font-size: 1rem;
}
.i-carbon-user-admin {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 32 32' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M12 4a5 5 0 1 1-5 5a5 5 0 0 1 5-5m0-2a7 7 0 1 0 7 7a7 7 0 0 0-7-7m10 28h-2v-5a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v5H2v-5a7 7 0 0 1 7-7h6a7 7 0 0 1 7 7zm3-13.82l-2.59-2.59L21 15l4 4l7-7l-1.41-1.41z'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 0.8em;
  height: 0.8em;
  margin-right: 10px;
}
.i-eos-icons-admin-outlined {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M12 23C6.443 21.765 2 16.522 2 11V5l10-4l10 4v6c0 5.524-4.443 10.765-10 12M4 6v5a10.58 10.58 0 0 0 8 10a10.58 10.58 0 0 0 8-10V6l-8-3Z'/%3E%3Ccircle cx='12' cy='8.5' r='2.5' fill='currentColor'/%3E%3Cpath fill='currentColor' d='M7 15a5.78 5.78 0 0 0 5 3a5.78 5.78 0 0 0 5-3c-.025-1.896-3.342-3-5-3c-1.667 0-4.975 1.104-5 3'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 0.8em;
  height: 0.8em;
  margin-right: 10px;
}
.i-solar-chat-round-unread-broken {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none' stroke='currentColor' stroke-width='1.5'%3E%3Ccircle cx='3' cy='3' r='3' transform='matrix(-1 0 0 1 22 2)'/%3E%3Cpath stroke-linecap='round' d='M14 2.2a10.05 10.05 0 0 0-7 1.138M21.8 10q.198.97.2 2c0 5.523-4.477 10-10 10c-1.6 0-3.112-.376-4.452-1.044a1.63 1.63 0 0 0-1.149-.133l-2.226.596a1.3 1.3 0 0 1-1.591-1.592l.595-2.226a1.63 1.63 0 0 0-.134-1.148A9.96 9.96 0 0 1 2 12c0-1.821.487-3.53 1.338-5'/%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 0.8em;
  height: 0.8em;
  margin-right: 10px;
}
.i-tabler-world {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m.6-3h16.8M3.6 15h16.8'/%3E%3Cpath d='M11.5 3a17 17 0 0 0 0 18m1-18a17 17 0 0 1 0 18'/%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 0.8em;
  height: 0.8em;
  margin-right: 10px;
}

.i-ic-sharp-help-outline {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M11 18h2v-2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8m0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5c0-2.21-1.79-4-4-4'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 0.8em;
  height: 0.8em;
  margin-right: 10px;
}

.i-cuida-logout-outline {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg class='logout-outline'%3E%3Cg fill='currentColor' fill-rule='evenodd' class='Vector' clip-rule='evenodd'%3E%3Cpath d='M3 7a5 5 0 0 1 5-5h5a1 1 0 1 1 0 2H8a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h5a1 1 0 1 1 0 2H8a5 5 0 0 1-5-5z'/%3E%3Cpath d='M14.47 7.316a1 1 0 0 1 1.414-.046l4.8 4.5a1 1 0 0 1 0 1.46l-4.8 4.5a1 1 0 1 1-1.368-1.46l2.955-2.77H8a1 1 0 1 1 0-2h9.471l-2.955-2.77a1 1 0 0 1-.046-1.414'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 0.8em;
  height: 0.8em;
  margin-right: 10px;
}

.setting-content {
  /* margin-top: 130px; */
  padding: 20px;
}

ion-list {
  margin-bottom: 30px;
}

ion-item {
  --padding-start: 15px;
  font-size: 2em;
  font-weight: 200;
}

ion-icon {
  font-size: 1.2em;
  color: var(--ion-color-primary);
}

ion-label {
  font-size: 1em;
}
</style>
