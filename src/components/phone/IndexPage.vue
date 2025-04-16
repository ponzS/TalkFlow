<template>
  <ion-content :fullscreen="true" class="cosmic-content" v-if="isLargeScreen" :scroll-y="false">
    <!-- 大屏幕时的左侧导航栏 -->
    <div class="sidebar liquid-sidebar" v-if="isLargeScreen">
      <div class="nav-button" @click="switchTo('Chat')" :class="{ active: currentComponent === 'Chat' }">
        <ion-icon :icon="chatbubbleOutline" size="large" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Chat' }"></div>
      </div>
      <div class="nav-button" @click="switchTo('Contacts')" :class="{ active: currentComponent === 'Contacts' }">
        <ion-icon :icon="peopleOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Contacts' }"></div>
      </div>
      <div class="nav-button" @click="switchTo('Discover')" :class="{ active: currentComponent === 'Discover' }">
        <ion-icon :icon="planetOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Discover' }"></div>
      </div>


      <div class="nav-button" @click="switchTo('Broswer')" :class="{ active: currentComponent === 'Broswer' }">
        <ion-icon :icon="browsersOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Broswer' }"></div>
      </div>

      <div class="nav-button" @click="switchTo('Relay')" :class="{ active: currentComponent === 'Relay' }">
        <ion-icon :icon="rocketOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Relay' }"></div>
      </div>

      <div class="nav-button" @click="switchTo('Settings')" :class="{ active: currentComponent === 'Settings' }">
        <ion-icon :icon="settingsOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Settings' }"></div>
      </div>


      <div class="nav-button" @click="switchTo('Profile')" :class="{ active: currentComponent === 'Profile' }">
        <img
          v-if="userAvatars[currentUserPub!]"
          :src="userAvatars[currentUserPub!]"
          class="cosmic-icon"
          style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover"
        />
        <img
          v-else
          :src="avatarurl"
          class="cosmic-icon"
          style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover"
        />
        <div class="indicator" :class="{ active: currentComponent === 'Profile' }"></div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="components-container" :class="{ 'with-sidebar': isLargeScreen }">
      <div v-show="currentComponent === 'Chat'" class="page-component" :class="{ 'active': currentComponent === 'Chat' }">
        
        <ion-split-pane when="xs" content-id="main">
    <ion-menu content-id="main">
 
      <ion-content class="ion-padding">     
        
        <ChatSpad />
      
      </ion-content>
    </ion-menu>

    <div class="ion-page" id="main">
    
      <ion-content class="ion-padding"> 
        

      <PadChatPage />


      </ion-content>
    </div>
  </ion-split-pane>
   


      </div>
      <div v-show="currentComponent === 'Contacts'" class="page-component" :class="{ 'active': currentComponent === 'Contacts' }">
        <ContactPad />
      </div>
      <div v-show="currentComponent === 'Discover'" class="page-component" :class="{ 'active': currentComponent === 'Discover' }">
        <DiscoverPad />
      </div>


      <div v-show="currentComponent === 'Broswer'" class="page-component" :class="{ 'active': currentComponent === 'Broswer' }">
        <BroswerPad />
      </div>

      <div v-show="currentComponent === 'Relay'" class="page-component" :class="{ 'active': currentComponent === 'Relay' }">
        <ion-header :translucent="true"  collapse="fade">
      <ion-toolbar class="liquid-toolbar">
     
        <ion-title>Network Status</ion-title>
    
      </ion-toolbar>
    </ion-header>
        <RelayMode/>
      </div>

      <div v-show="currentComponent === 'Settings'" class="page-component" :class="{ 'active': currentComponent === 'Settings' }">

<SettingsPad/>
      </div>

      <div v-show="currentComponent === 'Profile'" class="page-component" :class="{ 'active': currentComponent === 'Profile' }">
        <Startbox />
        <!-- <Profile /> -->
        <MePad/>
      </div>
    </div>
  </ion-content>



  <ion-content :fullscreen="true" class="cosmic-content" v-if="!isLargeScreen">
   
    <!-- 主内容区域 -->
    <div class="components-container" :class="{ 'with-sidebar': isLargeScreen }">

      <div v-show="currentComponent === 'Chat'" class="page-component" :class="{ 'active': currentComponent === 'Chat' }">
        <Chat />
      </div>
      <div v-show="currentComponent === 'Contacts'" class="page-component" :class="{ 'active': currentComponent === 'Contacts' }">
        <Contacts />
      </div>
      <div v-show="currentComponent === 'Discover'" class="page-component" :class="{ 'active': currentComponent === 'Discover' }">
        <Discover />
      </div>
      <div v-show="currentComponent === 'Profile'" class="page-component" :class="{ 'active': currentComponent === 'Profile' }">
        <Startbox />
        <Profile />
      </div>
    </div>

  </ion-content>


  <!-- 小屏幕时的底部导航栏 -->
  <ion-footer collapse="fade" :translucent="true" class="liquid-toolbar" v-if="!isLargeScreen">
    <ion-toolbar class="liquid-toolbar">
      <div style="display: flex; justify-content: space-around; align-items: center;">
        <div class="nav-button" @click="switchTo('Chat')" :class="{ active: currentComponent === 'Chat' }">
          <ion-icon :icon="chatbubbleOutline" size="large" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Chat' }"></div>
        </div>
        <div class="nav-button" @click="switchTo('Contacts')" :class="{ active: currentComponent === 'Contacts' }">
          <ion-icon :icon="peopleOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Contacts' }"></div>
        </div>
        <div class="nav-button" @click="switchTo('Discover')" :class="{ active: currentComponent === 'Discover' }">
          <ion-icon :icon="planetOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Discover' }"></div>
        </div>
        <div class="nav-button" @click="switchTo('Profile')" :class="{ active: currentComponent === 'Profile' }">
          <img
            v-if="userAvatars[currentUserPub!]"
            :src="userAvatars[currentUserPub!]"
            class="cosmic-icon"
            style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover"
          />
          <img
            v-else
            :src="avatarurl"
            class="cosmic-icon"
            style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover"
          />
          <div class="indicator" :class="{ active: currentComponent === 'Profile' }"></div>
        </div>
      </div>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue'
import Chat from './ChatS.vue'
import Contacts from './ContactsS.vue'
import Discover from './DiscoverS.vue'
import Profile from './MeS.vue'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { chatbubbleOutline, peopleOutline, personOutline, planetOutline,settingsOutline,rocketOutline,browsersOutline } from 'ionicons/icons'
import {
  IonFooter,
  IonToolbar,
  IonContent,
  IonIcon,
  IonHeader, IonMenu, IonSplitPane, IonTitle, 

} from '@ionic/vue'
import { gunAvatar } from "gun-avatar";
import { useTheme } from '@/composables/useTheme';
import ChatSpad from '../ipad/ChatSpad.vue'
import RelayMode from '../GUNtest/RelayMode.vue'
const { isDark } = useTheme();
const chatFlowStore = getTalkFlowCore();
const router = useRouter();
const {
  copyPub,
  currentUserPub,
  currentUserAlias,
  currentUserAlias1,
  userAvatars,
  storageServ,
  gun,
  isDragging,
  startY,
  translateY,
  cardsTranslateY,
  velocity,
  lastTouchTime,
  lastTouchY,
  panelVisible: _panelVisible,
  panelContent: _panelContent,
  encryptData,
  decryptData,
  showToast,
  isLargeScreen,
  updateScreenSize,
  currentComponent,
  previousComponent,
  switchTo
} = chatFlowStore;
const avatarurl = computed(() => gunAvatar({ pub: currentUserPub.value, round: false, dark: isDark.value }));




</script>

<style scoped>
/* 原有样式保持不变 */
.cosmic-content {
  --background: transparent;
  position: relative;
  overflow: visible;
}

.liquid-toolbar {
  --background: transparent;
  backdrop-filter: blur(12px); 
  -webkit-backdrop-filter: blur(12px);
  overflow: visible;
  position: relative;
}

ion-toolbar {
  overflow: visible;
  --background: transparent;
  --border-color: transparent;
}

.nav-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;
  overflow: visible;
  z-index: 10;
}

.cosmic-icon {
  font-size: 36px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}

.cosmic-icon {
  color: rgba(180, 220, 255, 0.8);
}

.nav-button.active .cosmic-icon {
  color: rgb(42, 125, 112);
  transform: scale(1.1);
}

.nav-button:active .cosmic-icon {
  transform: scale(1.15);
  color: rgb(42, 125, 112);
}

.nav-button.active::after {
  content: '';
  position: absolute;
  width: 50px;
  height: 50px;
  background: radial-gradient(circle, rgba(42, 240, 224, 0.3) 0%, rgba(42, 240, 224, 0) 70%);
  border-radius: 50%;
  z-index: 1;
  animation: pulse 2s infinite ease-in-out;
}

.indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  margin-top: 6px;
  transition: all 0.4s ease;
  position: relative;
  z-index: 2;
}

.indicator.active {
  background: rgb(42, 125, 112);
  width: 20px;
  height: 4px;
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(42, 240, 224, 0.8);
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}

@keyframes glowPulse {
  0% {
    opacity: 0.6;
    transform: translateY(0);
  }
  50% {
    opacity: 0.3;
    transform: translateY(-10px);
  }
  100% {
    opacity: 0.6;
    transform: translateY(0);
  }
}

.components-container {
  position: relative;
  width: 100%;
  height: 100%;
}

@media (min-width: 768px) {
  .components-container {
    width: calc(100% - 80px);
  }
}

.page-component {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: translateX(20px);
  pointer-events: none;
}

.page-component.active {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

/* 新增样式：大屏幕适配 */
.sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 80px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;

}

.liquid-sidebar {
  background: transparent;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.components-container.with-sidebar {
  margin-left: 80px;
}

.sidebar .nav-button {
  margin: 20px 0;
}
</style>