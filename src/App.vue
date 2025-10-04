<template>


  <ion-app>
  <!-- <div class="callWindow" v-show="isCallWindow">
   <CallWindow/>
  </div>
  <div class="callbutton" v-if="isCallButton">

    <div @click="isCallWindow = true">
      open call window
    </div>
  </div> -->
  <div style="display: none;">
    <RelayGroup />
  </div>



    <ion-split-pane  content-id="main"  v-show="isLoggedIn">
          <ion-menu  content-id="main">
         
                 <Menu> </Menu>
      
          </ion-menu>
          <div class="ion-page" id="main">
            <ion-content :scroll-y="false">
          
 <ion-router-outlet  />
            </ion-content>
          </div>
        </ion-split-pane>


 <!-- <ion-router-outlet  v-if="isLoggedIn"/> -->
 


    <ion-modal :is-open="!isLoggedIn" :can-dismiss="false" class="login-modal" :key="`modal-${isLoggedIn}`">
     
      <ion-content >
    <LoginMode/>
      </ion-content>
    </ion-modal>

    <transition name="fade">
      <div v-if="!isLoggedIn" class="loading-overlay">
        <div class="loading-content">
          <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
       
                <p class="talkflow-title-text"><span style="color: black">Talk</span><span>Flow</span></p>
</div>
        </div>
      </div>
    </transition>

  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { IonApp, IonRouterOutlet, IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton 
  , IonMenu, 
  IonSplitPane, 
} from '@ionic/vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useLanguage } from '@/composables/useLanguage';
import RelayMode from './components/GunVue/RelayMode.vue';
import RelayGroup from './components/GunVue/RelayGroup.vue';
const { initLanguage } = useLanguage();
const chatFlowStore = getTalkFlowCore();

import { peersList, enabledPeers,loadRelays } from '@/composables/useGun';

const { 
  restoreLoginState, 
  storageServ, 
  offlineNotice, 
  // isLoading,
  // currentUserPair,
  isLoggedIn,
  // isCallWindow,
  // isCallButton
} = chatFlowStore;


function setupNetworkListener() {
  let debounceTimer: NodeJS.Timeout;
  window.addEventListener('online', async () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
    //  console.log('网络恢复');
      offlineNotice.value = null;

    }, 10000); 
  });

}

 


onMounted(async () => {
 

 

  // await loadRelays();
  await storageServ.initializeDatabase();
await loadRelays();
  await initLanguage();
  await setupNetworkListener(); 
  await restoreLoginState();

});


</script>

<style scoped>

.empty-icon {
  /* max-width: 100%;
  max-height: 300px; */
  margin:0  auto;
  width: 200px;
  height: 200px;

  /* color: var(--ion-text-color); */
}

/* 加载遮罩层样式（毛玻璃效果） */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* background: rgba(0, 50, 50, 0.2); */
  backdrop-filter: blur(20px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.collaboration-symbol {
  font-size: min(100px, 15vw);
  font-weight: 300;
  color: var(--ion-text-color);
  opacity: 0.6;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
  transition: all 0.3s ease;
}

/* Fade 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 0px; /* 滚动条宽度 */
  background-color: transparent; /* 透明背景 */
}

/* 滚动条滑块 */
::-webkit-scrollbar-thumb {
  background-color: transparent; /* 半透明的滑块颜色 */
  border-radius: 4px; /* 圆角 */
}

/* 滚动条轨道 */
::-webkit-scrollbar-track {
  background-color: transparent; /* 透明轨道 */
}

.talkflow-title-text {
  font-size: min(100px, 20vw);
  font-weight: bold;
  color: transparent;
  text-shadow: 0 0 10px 0 rgba(0, 255, 217, 0.5);
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0);
  background: linear-gradient(-45deg, #52eed1, #000000, #23d5b4, #23d5ab);
  -webkit-background-clip: text;
  background-clip: text;
  z-index: 9999;
  background-size: 200% 200%;
  animation: gradientBreath 10s ease infinite;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
  margin: 0;
  text-align: center;
margin-bottom: -10px;
 
}

@keyframes gradientBreath {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

body.scanner-active,
ion-app.scanner-active {
  background: transparent !important;
  --background: transparent !important;
  overflow: hidden;
}

ion-content.scanner-active {
  --background: transparent !important;
  background: transparent !important;
}

.ion-page,
ion-content {
  background: transparent !important;
  --background: transparent !important;
  
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
  --background-color: transparent;
  overflow: hidden;
}

body {
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    sans-serif;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
}

/* 登录模态窗口样式 */
.login-modal {
  --width: 100%;
  --height: 100%;
  --border-radius: 0;
}

.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
}

.logo-section {
  margin-bottom: 3rem;
}

.login-form {
  max-width: 400px;
  width: 100%;
}

.login-form h2 {
  color: var(--ion-text-color);
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.login-form p {
  color: var(--ion-color-medium);
  margin-bottom: 2rem;
  line-height: 1.5;
}

.login-form ion-button {
  --border-radius: 12px;
  --padding-top: 16px;
  --padding-bottom: 16px;
  font-weight: 600;
  margin-top: 1rem;
}
</style>