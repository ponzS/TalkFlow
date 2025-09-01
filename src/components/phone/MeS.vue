<template>


    <ion-header :translucent="true" collapse="fade" style=" --background: transparent">
      <ion-toolbar  :translucent="true" collapse="fade"  class="liquid-toolbar" style=" --background: transparent">
  
        <ion-buttons slot="end">
          <ion-button color="dark" @click="showPanel('pubkey')">
            <ion-icon :icon="keyOutline"  />
          </ion-button>
          <ion-button color="dark" @click="showPanel('qrcode')">
            <ion-icon :icon="qrCodeOutline" />
          </ion-button>
          <ion-button color="dark" @click="goToScan">
            <ion-icon :icon="scanSharp"  />
          </ion-button>
     
        
          <ion-button color="dark" @click="openEndMenu" >
            <ion-icon :icon="settingsOutline"  />
            
          </ion-button>
          <!-- <ion-menu-button color="dark" >
          <ion-icon :icon="settingsOutline" style="font-size: 25px;"/>
          </ion-menu-button> -->
        </ion-buttons>
       
      </ion-toolbar>
      
    </ion-header>


    <ion-menu side="end" contentId="main-content" menuId="end" type="push" style="z-index: 9999;">
<Settings/>
</ion-menu>


  <ion-content :fullscreen="true" ref="contentRef" class="cosmic-content" id="main-content">




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
  <!-- <object
  v-else
	class="avatar-glow1"
	type="image/svg+xml"
  :src="avatarurl"
	:key="currentUserPub!"
	:data="
		gunAvatar({
			pub: currentUserPub,
			svg: true,
       round: false, 
      dark: isDark, 
 
      p3: true,


   
		})
	"
></object> -->


<div class="gradient-mask"></div>
<div class="profile-header1">
    <div class="avatar-wrapper">
          <img
      v-if="userAvatars[currentUserPub!]"
      :src="userAvatars[currentUserPub!]"
      alt=""
      class="avatar-glow"
    />
   
    <!-- <object
    v-else
	 class="avatar-glow"
	type="image/svg+xml"
	:key="currentUserPub!"
	:data="
		gunAvatar({
			pub: currentUserPub,
			svg: true,
			size: 1000,
			dark: isDark,
		})
	"
></object> -->
<img
            v-else
            :src="avatarurl"
    
            class="avatar-glow"
            
          />


    <!-- @click.stop="activateAvatar"  :class="{ 'avatar-active': isAvatarActive }"  -->
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
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="profile-header" :style="headerTransform" :class="{ 'no-transition': isDragging }">
     
      </div>

      <div class="cards-container" :style="cardsTransform">
        <div class="cards-wrapper cards-row-1">
          <div class="modules-container">
            <div class="module pubkey-module cosmic-item" @click="showPanel('pubkey')">
              <ion-icon :icon="keyOutline" class="cosmic-icon" />
            </div>
            <div class="module qr-module cosmic-item" @click="showPanel('qrcode')">
              <ion-icon :icon="qrCodeOutline" class="cosmic-icon" />
            </div>
          </div>
        </div>
        <div class="cards-wrapper cards-row-2">
          <div class="modules-container">
            <div class="module settings-module cosmic-item" @click="showPanel('keypair')">
              <ion-icon :icon="keySharp" class="cosmic-icon" />
            </div>
            <!-- @click="showPanel('resetpassword')" -->
            <div class="module pubkey-module cosmic-item" @click="goToScan">
              <ion-icon :icon="scanSharp" class="cosmic-icon" />
            </div>
          </div>
        </div>
      </div>

      <ion-modal
        :is-open="panelVisible"
        css-class="profile-modal"
        :breakpoints="[0, 0.5, 0.8]"
        :initial-breakpoint="0.5"
        @didDismiss="hidePanel"
      >
        <ion-content class="modal-content">
          <div class="panel-header">
            <span>{{ panelContent === 'pubkey' ? 'PubKey' : panelContent === 'qrcode' ? 'QR' : panelContent === 'keypair' ? 'Key Pair' : 'Reset Password' }}</span>
            <ion-icon
              color="dark"
              :icon="closeCircleSharp"
              style="font-size: 29px;"
              @click="hidePanel"
            ></ion-icon>
          </div>

          <div class="panel-content">
            <div v-if="panelContent === 'pubkey'" class="pubkey-display">
              <div class="content-with-copy">
                <p>{{ currentUserPub }}</p>
                <ion-icon
                  :icon="copyOutline"
                  class="copy-icon"
                  @click="copyPub(currentUserPub)"
                ></ion-icon>
              </div>
            </div>
            <div v-else-if="panelContent === 'qrcode'" class="qr-display">
              <QrShow :data="'pubkey:' + currentUserPub" />
            </div>
            <div v-else-if="panelContent === 'keypair'" class="keypair-display">
             
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
            
            <div v-else-if="panelContent === 'resetpassword'" class="reset-password-display">
             
          
            </div>
          </div>
          
        </ion-content>
      </ion-modal>
    </div>

    <div class="gradient-mask"></div>
  </ion-content>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonContent, IonIcon, IonModal, IonItem, IonLabel, IonInput, IonButton, IonSpinner,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonHeader,
  IonTabBar,
  IonToolbar,
  IonButtons
 } from '@ionic/vue';
import { closeCircleSharp, copyOutline, keyOutline, qrCodeOutline, keySharp, lockClosedOutline, eyeOutline, eyeOffOutline, refreshCircleOutline, warningOutline, lockOpenOutline, checkmarkCircleOutline, alertCircleOutline,scanSharp, menuOutline, settingsOutline } from 'ionicons/icons';
import { gunAvatar } from "gun-avatar";


const chatFlowStore = getTalkFlowCore();
const router = useRouter();
import { menuController } from '@ionic/vue';
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

  showToast,
 
} = chatFlowStore;

function openEndMenu() {
  menuController.open('end');
  
}
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

import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

const avatarurl = computed(() => 
gunAvatar({ 
  pub: currentUserPub.value, 
  round: false, 
  dark: isDark.value, 
  // svg: true,
  p3: true,
  embed: true,
}));

function goToScan() { router.push('/ScanPage') }
const maxPullDown = 60;
const maxPushUp = 50;
const midPoint = 0;
const dampingFactor = 1;
const boundaryThreshold = 1;
const midThreshold = 1;

const positionState = ref('middle');
const isAnimating = ref(false);


const headerTransform = computed(() => ({
  transform: `translateY(${translateY.value}px)`,
}));

const cardsTransform = computed(() => ({
  transform: `translateY(${cardsTranslateY.value}px)`,
}));

const encryptedPair = ref('');
const showKeyPair = ref(false);


const avatarStyle = ref({});
const decryptPassphrase = ref('');

const decryptMessage = ref('');

const showDecryptedKeyPair = ref(false);
const decryptedPair = ref('');

function generateRandomBorderRadius() {
  const generateRoundValue = () => Math.floor(Math.random() * 50 + 40) + '%';
  const values = Array.from({ length: 8 }, generateRoundValue);
  const randomIndex = Math.floor(Math.random() * 8);
  values[randomIndex] = Math.floor(Math.random() * 25 + 40) + '%';
  return `${values[0]} ${values[1]} ${values[2]} ${values[3]} / ${values[4]} ${values[5]} ${values[6]} ${values[7]}`;
}


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
  const result = await storageServ.query("SELECT * FROM credentials WHERE key = 'userCredentials'");
  if (result.values && result.values.length > 0) {
    const encryptedData = result.values[0].value;
    const decryptedData = encryptedData;
    if (decryptedData) {
      const credentials = JSON.parse(decryptedData);
      if (credentials.encryptedKeyPair) return credentials.encryptedKeyPair;
    }
  }
  return null;
}





function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1 || isAnimating.value) return;
  velocity.value = 0;
  isDragging.value = true;
  startY.value = e.touches[0].clientY;
  lastTouchTime.value = Date.now();
  lastTouchY.value = startY.value;
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || e.touches.length !== 1 || isAnimating.value) return;
  const currentY = e.touches[0].clientY;
  let deltaY = currentY - startY.value;
  lastTouchTime.value = Date.now();
  lastTouchY.value = currentY;
  let resistance = 1;
  let cardsResistance = 1;
  if (deltaY > 0) {
    if (positionState.value === 'top') {
      resistance = midThreshold;
      translateY.value = Math.min(translateY.value + deltaY * dampingFactor * resistance, midPoint);
      cardsTranslateY.value = Math.min(cardsTranslateY.value + deltaY * dampingFactor * resistance * 1.5, 0);
    } else if (positionState.value === 'middle') {
      resistance = translateY.value >= maxPullDown * 0.7 ? boundaryThreshold : midThreshold;
      translateY.value = Math.min(translateY.value + deltaY * dampingFactor * resistance, maxPullDown);
      cardsResistance = cardsTranslateY.value >= window.innerHeight * 0.7 ? boundaryThreshold : midThreshold;
      cardsTranslateY.value = Math.min(cardsTranslateY.value + deltaY * 1.5 * cardsResistance, window.innerHeight);
    } else if (positionState.value === 'bottom') {
      translateY.value = maxPullDown;
      cardsTranslateY.value = window.innerHeight;
    }
  } else {
    const upDistance = Math.abs(deltaY);
    if (positionState.value === 'bottom') {
      resistance = midThreshold;
      translateY.value = Math.max(translateY.value - upDistance * dampingFactor * resistance, midPoint);
      cardsTranslateY.value = Math.max(cardsTranslateY.value - upDistance * dampingFactor * resistance * 1.5, 0);
    } else if (positionState.value === 'middle') {
      resistance = translateY.value <= -maxPushUp * 0.7 ? boundaryThreshold : midThreshold;
      translateY.value = Math.max(translateY.value - upDistance * dampingFactor * resistance, -maxPushUp);
      cardsResistance = cardsTranslateY.value <= -maxPushUp * 1.7 ? boundaryThreshold : midThreshold;
      cardsTranslateY.value = Math.max(cardsTranslateY.value - upDistance * 1.2 * cardsResistance, -maxPushUp * 2);
    } else if (positionState.value === 'top') {
      translateY.value = -maxPushUp;
      cardsTranslateY.value = -maxPushUp * 2;
    }
  }
  e.preventDefault();
}

function onTouchEnd() {
  if (isAnimating.value) return;
  isDragging.value = false;
  snapToClosestPosition();
}

function snapToClosestPosition() {
  const distToTop = Math.abs(translateY.value - (-maxPushUp));
  const distToMiddle = Math.abs(translateY.value - midPoint);
  const distToBottom = Math.abs(translateY.value - maxPullDown);
  let targetY, targetCardsY;
  if (positionState.value === 'top') {
    if (distToMiddle < distToTop * 0.8 && translateY.value > -maxPushUp / 2) {
      targetY = midPoint;
      targetCardsY = 0;
      positionState.value = 'middle';
    } else {
      targetY = -maxPushUp;
      targetCardsY = -maxPushUp * 2;
    }
  } else if (positionState.value === 'bottom') {
    if (distToMiddle < distToBottom * 0.8 && translateY.value < maxPullDown / 2) {
      targetY = midPoint;
      targetCardsY = 0;
      positionState.value = 'middle';
    } else {
      targetY = maxPullDown;
      targetCardsY = window.innerHeight;
    }
  } else {
    let minDist = Math.min(distToTop, distToMiddle, distToBottom);
    if (minDist === distToTop && translateY.value < -5) {
      targetY = -maxPushUp;
      targetCardsY = -maxPushUp * 2;
      positionState.value = 'top';
    } else if (minDist === distToBottom && translateY.value > 5) {
      targetY = maxPullDown;
      targetCardsY = window.innerHeight;
      positionState.value = 'bottom';
    } else {
      targetY = midPoint;
      targetCardsY = 0;
      positionState.value = 'middle';
    }
  }
  Haptics.impact({ style: ImpactStyle.Light });
  translateY.value = Math.round(targetY);
  cardsTranslateY.value = Math.round(targetCardsY);
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
.liquid-toolbar {
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
  height: 100%;
  overflow: hidden;
  background: transparent;
}
.profile-gesture-container1 {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: none;
  margin-top: 200px;
  text-align: center;
  width: 100%;
}
.profile-header1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: none;
  margin-top: 200px;
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
  overflow: visible;
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
  
  overflow: visible;
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
  transition: transform 0.3s ease, border-radius 0.2s ease;
  z-index: 9999;
  cursor: pointer;
  user-select: none;
  overflow: visible;
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

.cosmic-icon {
  font-size: 39px;
  color: rgb(42, 125, 112);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.cosmic-icon::before {
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
}

.cosmic-item:hover .cosmic-icon {
  transform: scale(1.1);
}

.cosmic-item:hover .cosmic-icon::before {
  opacity: 1;
}

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

.cards-row-1 .pubkey-module { flex: 2; }
.cards-row-1 .qr-module { flex: 1; }
.cards-row-2 .settings-module { flex: 1; }
.cards-row-2 .pubkey-module { flex: 2; }

.profile-modal {
  border-radius: 16px 16px 0 0;
}

.modal-content { padding: 20px; }

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
  align-items: center;
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

.qr-display { display: flex; justify-content: center; }

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