<template>

<ion-menu side="end" contentId="main-content" menuId="end" type="push" >
<Settings/>
</ion-menu>

<ion-menu side="start" contentId="main-content" menuId="start"  type="push">
<DiscoverS/>
</ion-menu>
 

  <ion-content :fullscreen="true"  class="cosmic-content" v-if="isLargeScreen" :scroll-y="false">
    <!-- 大屏幕时的左侧导航栏 -->
    <div class="sidebar liquid-sidebar" v-if="isLargeScreen">
      <div class="nav-button" @click="switchTo('Chat')" :class="{ active: currentComponent === 'Chat' }">
        <ion-icon :icon="chatbubbleOutline" size="large" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Chat' }"></div>
      </div>
      <!-- <div class="nav-button" @click="switchTo('Group')" :class="{ active: currentComponent === 'Group' }">
        <ion-icon :icon="chatbubbleEllipsesOutline" size="large" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Group' }"></div>
      </div> -->

      <div class="nav-button" @click="switchTo('Contacts')" :class="{ active: currentComponent === 'Contacts' }">
        <ion-icon :icon="peopleOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Contacts' }"></div>
      </div>
      <div class="nav-button" @click="switchTo('Discover')" :class="{ active: currentComponent === 'Discover' }">
        <ion-icon :icon="walletOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Discover' }"></div>
      </div>

    <div class="nav-button" @click="switchTo('Link')" :class="{ active: currentComponent === 'Link' }">
          <ion-icon :icon="planetOutline" style="font-size: 39px;"  class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Link' }"></div>
        </div>

      <div class="nav-button" @click="switchTo('Broswer')" :class="{ active: currentComponent === 'Broswer' }">
        <ion-icon :icon="compassOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
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
      <div v-show="currentComponent === 'Group'" class="page-component" :class="{ 'active': currentComponent === 'Group' }">
        <Group />
      </div>
      <div v-show="currentComponent === 'Contacts'" class="page-component" :class="{ 'active': currentComponent === 'Contacts' }">
        <ContactPad />
      </div>

      <div v-show="currentComponent === 'Discover'" class="page-component" :class="{ 'active': currentComponent === 'Discover' }">
        <!-- <DiscoverPad /> -->
         <Card></Card>
      </div>
      <div v-if="currentComponent === 'Link'" class="page-component" :class="{ 'active': currentComponent === 'Link' }">
        <Moment />
      </div>

      <div v-show="currentComponent === 'Broswer'" class="page-component" :class="{ 'active': currentComponent === 'Broswer' }">
        <!-- <BroswerPad /> -->
        <Discover />
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

<Settings/>
      </div>

      <div v-show="currentComponent === 'Profile'" class="page-component" :class="{ 'active': currentComponent === 'Profile' }">
        <Startbox />
       
        <MePad/>
      </div>
    </div>
  </ion-content>


 <ion-content :fullscreen="true" class="cosmic-content" v-if="!isLargeScreen" :scroll-y="false">









    <!-- 主内容区域 -->
    <div class="components-container" :class="{ 'with-sidebar': isLargeScreen }">

      <div v-if="currentComponent === 'Chat'" class="page-component" :class="{ 'active': currentComponent === 'Chat' }">
        <Chat />
      </div>
   
      <div v-if="currentComponent === 'Contacts'" class="page-component" :class="{ 'active': currentComponent === 'Contacts' }">
        <Contacts />
      </div>

      <!-- <div v-show="currentComponent === 'Chats'" class="page-component" :class="{ 'active': currentComponent === 'Chats' }">
        <Group />
      </div> -->
      <!-- <div v-show="currentComponent === 'Discover'" class="page-component" :class="{ 'active': currentComponent === 'Discover' }">
        <Discover />
      </div> -->
      <div v-if="currentComponent === 'Link'" class="page-component" :class="{ 'active': currentComponent === 'Link' }">
        <Moment />
      </div>
      <!-- <div v-if="currentComponent === 'TenMinute'" class="page-component" :class="{ 'active': currentComponent === 'TenMinute' }">
        <TenMinutes/>
      </div> -->



      <div v-if="currentComponent === 'KeyPair'" class="page-component" :class="{ 'active': currentComponent === 'KeyPair' }">

        <Card />
 
      </div>
      <div v-show="currentComponent === 'Profile'" class="page-component" :class="{ 'active': currentComponent === 'Profile' }">
        <!-- <Startbox /> -->
        <!-- <KeepAlive>
        <Profile />
      </KeepAlive> -->
      <!-- <ion-menu side="end" contentId="main-content" menuId="end" type="push" style="z-index: 9999;">
<Settings/>
</ion-menu>

<ion-menu side="start" contentId="main-content" menuId="start" type="push"  style="z-index: 9999;">
<Discover/>
</ion-menu> -->


      <!-- <div class="menulist1">
         
      
        
          <div @click="openStartMenu" >
            <ion-icon style="font-size: 25px;"  :icon="menuOutline"  class="cosmic-icon" />
            
          </div>
         
        </div> -->

  
        <div class="menulist">
          <!-- <div   @click="showPanel('keypair')" >
            <ion-icon style="font-size: 25px;"  :icon="keyOutline" class="cosmic-icon" />
          </div> -->
          <div  @click="goToRelay">
            <ion-icon style="font-size: 25px;"  :icon="rocketOutline" class="cosmic-icon"  />
          </div>
          <div  @click="showPanel('qrcode')">
            <ion-icon style="font-size: 25px;"  :icon="qrCodeOutline" class="cosmic-icon"  />
          </div>
          <div  @click="goToScan">
            <ion-icon style="font-size: 25px;"  :icon="scanSharp" class="cosmic-icon"  />
          </div>
     
        
          <!-- <div @click="openEndMenu" >
            <ion-icon style="font-size: 25px;"  :icon="settingsOutline"  class="cosmic-icon" />
            
          </div> -->
         
        </div>
       
 
      



 


  <ion-content :fullscreen="true" ref="contentRef" class="cosmic-content" id="main-content">

    <!-- <div class="gradient-mask"></div> -->


<div class="profile-gesture-container1">

  <img
      v-if="userAvatars[currentUserPub!]"
      :src="userAvatars[currentUserPub!]"
      alt=""
      class="avatar-glow1"
    />
    <img
            v-else
            :src="avatarurl"
    
            class="avatar-glow1"
            
          />


<div class="profile-header1">
    <div class="avatar-wrapper">
          <img
      v-if="userAvatars[currentUserPub!]"
      :src="userAvatars[currentUserPub!]"
      alt=""
      class="avatar-glow"
    />
   
    <img
            v-else
            :src="avatarurl"
    
            class="avatar-glow"
            
          /> 

          <img
            v-if="userAvatars[currentUserPub!]"
            :src="userAvatars[currentUserPub!]"
            alt=""
            class="avatar"
      
            :style="avatarStyle"
           
            @touchstart.stop
          />
    
          
          <object
    v-else
	 class="avatar"
   style="z-index: 9999;"
   :style="avatarStyle"
	type="image/svg+xml"
	:key="currentUserPub!"
	:data="
		gunAvatar({
			pub: currentUserPub,
		   svg: 'interactive',
      // svg: true,
			size: 1000,
			dark: isDark,
      p3: true,
      embed: true,
      
		})
	"

></object>

        </div>
        <h1 class="username">{{ currentUserAlias || 'No Name' }}</h1>
        <p>{{ currentUserAlias1 || '' }}</p>

      </div>
        </div>


    <div
      class="profile-gesture-container"
     
    >
      <ion-modal
        :is-open="panelVisible"
        css-class="profile-modal"
        :breakpoints="[0, 0.5, 1]"
        :initial-breakpoint="0.8"
        @didDismiss="hidePanel"
      >
        <ion-content class="modal-content">
          <div class="panel-header">
            <span>{{ panelContent === 'pubkey' ? 'PubKey' : panelContent === 'qrcode' ? 'PubKey' : panelContent === 'keypair' ? 'Key Pair' : 'Reset Password' }}</span>
            <ion-icon
              color="dark"
              :icon="closeCircleSharp"
              style="font-size: 29px;"
              @click="hidePanel"
            ></ion-icon>
          </div>

          <div class="panel-content">
          
            <div v-if="panelContent === 'qrcode'" >
              <div class="qr-display">
              <QrShow :data="'pubkey:' + currentUserPub" />
            </div>

              <div class="content-with-copy pubkey-display">
                <p>PubKey: {{ currentUserPub }}</p>
                <ion-icon
                  :icon="copyOutline"
                  class="copy-icon"
                  @click="copyPub(currentUserPub)"
                ></ion-icon>
              </div>
              <ion-button color="dark" expand="block" class="keypair-btn" @click="showEncryptedKeyPair">
                <ion-icon slot="start" :icon="showKeyPair ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
                {{ showKeyPair ? 'Hide Key Pair' : 'Show Key Pair' }}
              </ion-button>
              <div v-if="showKeyPair" class="keypair-content-wrapper">
                <div v-if="!encryptedPair" class="keypair-loading">
                  <ion-spinner name="dots"></ion-spinner>
                  <p>Loading key pair...</p>
                </div>
                <template v-else>
          
                  <div class="keypair-data">
                    <div class="content-with-copy">
                      <pre class="keypair-content">{{ encryptedPair }}</pre>
                      <ion-icon
                        :icon="copyOutline"
                        class="copy-icon"
                        @click="copyEncryptedKeyPair"
                      ></ion-icon>
                    </div>
                  </div>
                  <div class="keypair-warning-box">
                    <ion-icon :icon="warningOutline"></ion-icon>
                    <p>This is your encrypted key pair. Keep it safe!</p>
                  </div>
                  <!-- <p class="keypair-tip">This encrypted key pair can be used for account recovery. Save it in a secure location.</p> -->
                </template>
              </div>
            
            </div>
          
            
            </div>
            
       
   
          
        </ion-content>
      </ion-modal>
    </div>

    <div class="gradient-mask"></div>
  </ion-content>

      </div>
    </div>
  </ion-content>


  <!-- 小屏幕时的底部导航栏 -->
  <ion-footer collapse="fade" :translucent="true" class="liquid-toolbar" v-if="!isLargeScreen" >
    <ion-toolbar class="liquid-toolbar">
      <div style="display: flex; justify-content: space-around; align-items: center;">
        <div class="nav-button" @click="switchTo('Chat')" :class="{ active: currentComponent === 'Chat' }">
          <ion-icon :icon="chatbubbleOutline" size="large" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Chat' }"></div>
        </div>

        <!-- <div class="nav-button" @click="switchTo('Chats')" :class="{ active: currentComponent === 'Chats' }">
          <ion-icon :icon="chatbubbleEllipsesOutline" size="large" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Chats' }"></div>
        </div> -->

        <div class="nav-button" @click="switchTo('Contacts')" :class="{ active: currentComponent === 'Contacts' }">
          <ion-icon  :icon="peopleOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Contacts' }"></div>
        </div>

        <div class="nav-button" @click="switchTo('Link')" :class="{ active: currentComponent === 'Link' }">
          <ion-icon :icon="planetOutline"  class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Link' }"></div>
        </div>

        <!-- <div class="nav-button" @click="switchTo('TenMinute')" :class="{ active: currentComponent === 'TenMinute' }">
     
           10M
          <div class="indicator" :class="{ active: currentComponent === 'TenMinute' }"></div>
        </div> -->

        <!-- <div class="nav-button" @click="switchTo('Discover')" :class="{ active: currentComponent === 'Discover' }">
          <ion-icon  :icon="compassOutline" style="font-size: 33px;" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Discover' }"></div>
        </div> -->
        <div class="nav-button" @click="switchTo('KeyPair')" :class="{ active: currentComponent === 'KeyPair' }">
          <ion-icon :icon="walletOutline" style="font-size: 33px;"  class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'KeyPair' }"></div>
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

  <!-- <ion-menu side="end" contentId="main-content" menuId="end" type="push" >
<Settings/>
</ion-menu>

<ion-menu side="start" contentId="main-content" menuId="start"  type="push">
<DiscoverS/>
</ion-menu> -->


</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue'
import Chat from './ChatS.vue'
import Contacts from './ContactsS.vue'
import Discover from './DiscoverS.vue'
import Profile from './MeS.vue'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { chatbubblesOutline,chatbubbleOutline, peopleOutline, personOutline, planetOutline,settingsOutline,rocketOutline,browsersOutline,atOutline,
  sparklesOutline,
  chatbubbleEllipsesOutline,
  compassOutline,
  walletOutline,
  reorderFourOutline,
  reorderThreeOutline

 } from 'ionicons/icons'
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
const avatarurl = computed(() => gunAvatar({ pub: currentUserPub.value, round: false, dark: isDark.value,svg:true }));


import { computed, } from 'vue';
import { useRouter } from 'vue-router';

import { IonModal, IonItem, IonLabel, IonInput, IonButton, IonSpinner,

  IonButtons
 } from '@ionic/vue';
import { closeCircleSharp, copyOutline, keyOutline, qrCodeOutline, keySharp, lockClosedOutline, eyeOutline, eyeOffOutline, refreshCircleOutline, warningOutline, lockOpenOutline, checkmarkCircleOutline, alertCircleOutline,scanSharp, menuOutline, } from 'ionicons/icons';


type PanelContentType = 'pubkey' | 'qrcode' | 'keypair' | 'resetpassword' | null;
const localPanelContent = ref<PanelContentType>(null);
const localPanelVisible = ref(false);

const panelVisible = computed({
  get: () => localPanelVisible.value,
  set: (value) => { localPanelVisible.value = value; _panelVisible.value = value; }
});

const panelContent = computed({
  get: () => localPanelContent.value,
  set: (value) => {
    localPanelContent.value = value;
    if (value === 'pubkey' || value === 'qrcode' || value === null) _panelContent.value = value;
  }
});

function goToScan() { router.push('/ScanPage') }
function goToRelay() { router.push('/relaypage') }

const midPoint = 0;


const positionState = ref('middle');

const encryptedPair = ref('');
const showKeyPair = ref(false);


const avatarStyle = ref({});
const decryptPassphrase = ref('');

const decryptMessage = ref('');

const showDecryptedKeyPair = ref(false);
const decryptedPair = ref('');




function copyEncryptedKeyPair() {
  if (encryptedPair.value) {
    navigator.clipboard.writeText(encryptedPair.value)
      .then(() => showToast('Key pair copied to clipboard', 'success'))
      .catch(err => showToast('Copy failed', 'error'));
  }
}



async function showEncryptedKeyPair() {
  if (showKeyPair.value) {
    showKeyPair.value = false;
    return;
  }
  showKeyPair.value = true;
  const userData = await storageServ.getUser(currentUserPub.value!);
  if (userData && userData.encryptedKeyPair) {
    encryptedPair.value = userData.encryptedKeyPair;
  } else {
    const encryptedKeyPair = await checkCredentials();
    if (encryptedKeyPair) {
      encryptedPair.value = encryptedKeyPair;
      showToast('Key pair loaded from credentials', 'success');
    } else {
      showToast('No encrypted key pair found', 'warning');
    }
  }
}





async function checkCredentials() {
    // 1. 从本地数据库加载凭据
    const credentialsResult = await storageServ.query('SELECT value FROM credentials WHERE key = ?', ['userCredentials']);
      if (!credentialsResult.values || !credentialsResult.values.length) {
        // console.log('未找到本地凭据，登录恢复终止');
        return;
      }
      
      // 2. 解密凭据
      const encryptedCredentials = credentialsResult.values[0].value as string;
   
      
      const pair: any = JSON.parse(encryptedCredentials);
      if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
       // console.log('密钥对不完整，登录恢复终止');
        return;
      }
      return pair
}







function showPanel(content: PanelContentType) {
  panelContent.value = content;
  panelVisible.value = true;
}

function hidePanel() {
  panelVisible.value = false;
  panelContent.value = null;
  showDecryptedKeyPair.value = false;
  decryptedPair.value = '';
  decryptPassphrase.value = '';
  decryptMessage.value = '';
}

onMounted(async () => {
  positionState.value = 'middle';
  translateY.value = midPoint;
  cardsTranslateY.value = 0;
  if (currentUserPub.value) {
    const userData = await storageServ.getUser(currentUserPub.value);
    if (userData) {
      currentUserAlias.value = userData.alias || '';
      userAvatars.value[currentUserPub.value] = userData.avatar || '';
      encryptedPair.value = userData.encryptedKeyPair || '';
    }
    gun.get('users').get(currentUserPub.value).once((data: any) => {
      if (data?.alias) currentUserAlias.value = data.alias;
      if (data?.signature) currentUserAlias1.value = data.signature;
      if (data?.avatar) userAvatars.value[currentUserPub.value!] = data.avatar;
    });
  }
});

</script>

<style scoped>

.menulist1{
  position: absolute;
  gap: 20px;
  display: flex;
  justify-content: start;
  align-items: start;
  top: 10%;
  left: 10px;

}
.menulist{
  position: absolute;
  gap: 20px;
  display: flex;
  justify-content: end;
  align-items: end;
  top: 10%;
  right: 10px;

}

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
  color: var(--ion-text-color);;
}

.nav-button.active .cosmic-icon {
  color: rgb(42, 125, 112) ;
  transform: scale(1.01);
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
  height: 100dvh;
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  /* transform: translateX(20px); */
  pointer-events: none;
  overflow-y: hidden;
}

.page-component.active {
  opacity: 1;
  /* transform: translateX(0); */
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


.liquid-toolbar1 {
  --border-color: transparent;
  --background-color: transparent;
}
.blur-background{
  width: 100vw; height: 100vh; 
  backdrop-filter: blur(20px);
  z-index: -1;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* pointer-events: none; */
}
.gradient-mask {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 10vh;
  background: linear-gradient(to top, var(--ion-background-color) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.cosmic-content {
  --background: transparent;
  position: relative;
  overflow: visible;
}

.profile-gesture-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: transparent;
}
.profile-gesture-container1 {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: transparent;
}
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: none;
  margin-top: 239px;
  text-align: center;
  width: 100%;
}
.profile-header1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: none;
  margin-top: 239px;
  text-align: center;
  width: 100%;
}

.profile-header.no-transition {
  transition: none !important;
}

.avatar-wrapper {
  position: relative;
  /* width: 150px;
  height: 150px; */
  margin: 0 auto 1rem;

  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
 
}

.avatar-glow1 {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* object-fit: cover; */
  /* border-radius: 50%; */
  filter: blur(20px);

  /* transform: scale(1.5); */
  opacity: 0.3;
  /* overflow:hidden; */
  /* animation: defaultMorph 6s ease-in-out infinite; */
  z-index: 3;
  pointer-events: none;
}

.avatar-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 150px;
  height: 150px;
  /* object-fit: cover; */
  border-radius: 50%;
  filter: blur(20px);
  transform: scale(1);
  opacity: 0.6;
  
  overflow:hidden;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: screen;
  
}

/* 顶层真实头像 */
.avatar {
  position: relative;
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 50%;
  /* box-shadow: 0 8px 24px rgba(0,0,0,0.15); */
  /* transition: transform 0.3s ease, border-radius 0.2s ease; */
  z-index: 9999;
  cursor: pointer;
  user-select: none;
  overflow:hidden;
  opacity: 0.6;
  /* animation: defaultMorph 8s ease-in-out infinite; */

}

/* 点击时的放大动画保持不变 */
.avatar-active {
  transform: scale(1.2);
  z-index: 3;
  animation: none;
}

.username {
  font-size: 50px;
  font-weight: bold;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  color: #2c3e50;
}

.cards-container {
  position: absolute;
  bottom: -70px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 0 10px;
  transition: none;
  /* z-index: 9999; */
}

.cards-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  
}

.cards-row-1 .modules-container,
.cards-row-2 .modules-container {
  display: flex;
  justify-content: center;
  gap: 15px;
  width: 100%;
  max-width: 600px;
  
}

.module.cosmic-item {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(0, 255, 213, 0.136);
  border-radius: 12px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: visible;

}

.module.cosmic-item:active {
  transform: scale(1.05);
}

/* .cosmic-icon {
  font-size: 39px;
  color: rgb(42, 125, 112);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
} */

/* .cosmic-icon::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(42, 125, 112, 0.6) 0%, rgba(42, 125, 112, 0) 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
  pointer-events: none;
} */

/* .cosmic-item:hover .cosmic-icon {
  transform: scale(1.1);
}

.cosmic-item:hover .cosmic-icon::before {
  opacity: 1;
} */

/* @media (prefers-color-scheme: dark) {
  .cosmic-icon::before {
    background: radial-gradient(circle, rgba(42, 125, 112, 0.8) 0%, rgba(42, 125, 112, 0) 70%);
  }
  .cosmic-item:hover .cosmic-icon::before {
    opacity: 1;
  }
}

@media (prefers-color-scheme: light) {
  .cosmic-icon::before {
    background: radial-gradient(circle, rgba(42, 125, 112, 0.6) 0%, rgba(42, 125, 112, 0) 70%);
  }
  .cosmic-item:hover .cosmic-icon::before {
    opacity: 1;
  }
} */

/* .cards-row-1 .pubkey-module { flex: 2; }
.cards-row-1 .qr-module { flex: 1; }
.cards-row-2 .settings-module { flex: 1; }
.cards-row-2 .pubkey-module { flex: 2; } */

.profile-modal {
  border-radius: 16px 16px 0 0;
}

.modal-content { 
  padding: 20px;
  
 }

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px;
}

.panel-header span {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ion-text-color, #2c3e50);
}

.panel-content {
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  /* max-width: 300px;
  margin:0 auto; */

}

.pubkey-display { width: 100%; text-align: center; max-height: 200px; overflow-y: auto; word-break: break-all; }

.pubkey-display p { font-size: 1rem; color: var(--ion-text-color); margin: 0; flex: 1; text-align: left; }

.content-with-copy {
  display: flex;
  align-items: flex-start;
  background: var(--ion-background-color);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--ion-color-light-shade);
}

.copy-icon {
  font-size: 24px;
  color: var(--ion-color-medium);
  cursor: pointer;
  flex-shrink: 0;
  margin-left: 8px;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.copy-icon:hover { color: var(--ion-color-primary); opacity: 1; }

.qr-display { display: flex; justify-content: center; 
padding: 10px;

}

.keypair-display, .reset-password-display {
  width: 100%;
  text-align: center;
  /* max-height: 400px; */
  overflow-y: auto;
  border-radius: 8px;
}

.recovery-btn { margin-bottom: 12px; }

.keypair-btn { --background: var(--ion-color-primary); margin-bottom: 16px; }

.decrypt-btn { --background: var(--ion-color-tertiary); margin-top: 8px; margin-bottom: 12px; }

.keypair-content-wrapper { border-radius: 12px; padding: 16px; margin-top: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }

.keypair-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }

.keypair-warning-box {
  display: flex;
  align-items: center;
  background: rgba(var(--ion-color-danger-rgb), 0.1);
  color: var(--ion-color-danger);
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.keypair-warning-box ion-icon { font-size: 24px; margin-right: 8px; }

.keypair-data { position: relative; margin: 12px 0; width: 100%; }

.keypair-content { background: var(--ion-background-color); padding: 0; text-align: left; font-size: 0.8rem; max-height: 280px; overflow-y: auto; margin: 0; flex: 1; }

.keypair-tip { color: var(--ion-color-medium); font-size: 0.85rem; margin-top: 12px; text-align: left; }

.decrypt-section { margin-top: 16px; padding: 16px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }

.reset-form { background: var(--ion-background-color); border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }

.custom-item { --background: var(--ion-card-background); --border-radius: 8px; margin-bottom: 16px; }

.reset-btn { margin-top: 8px; --background: var(--ion-color-success); }

.message-box { display: flex; align-items: center; margin-top: 16px; padding: 12px; border-radius: 8px; }

.message-box.success { background: rgba(var(--ion-color-success-rgb), 0.1); color: var(--ion-color-success); }

.message-box.error { background: rgba(var(--ion-color-danger-rgb), 0.1); color: var(--ion-color-danger); }

.message-box ion-icon { font-size: 24px; margin-right: 8px; }

@keyframes defaultMorph {
  0% {
    border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  }
  20% {
    border-radius: 60% 40% 65% 35% / 35% 60% 40% 65%;
  }
  40% {
    border-radius: 70% 30% 50% 60% / 60% 35% 65% 40%;
  }
  60% {
    border-radius: 35% 65% 40% 70% / 70% 60% 30% 50%;
  }
  80% {
    border-radius: 50% 60% 30% 65% / 40% 70% 60% 35%;
  }
  100% {
    border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  }
}

</style>