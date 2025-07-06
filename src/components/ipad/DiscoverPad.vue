<template>
  <ion-page>
  <!-- 顶部导航栏 -->
  <ion-header >
    <ion-toolbar class="liquid-toolbar" style=" --background: var(--ion-background-color);">

      <ion-buttons slot="start">
        <ion-back-button text="" color="dark"></ion-back-button>
      </ion-buttons>


      <ion-title>Discover</ion-title>

 <!-- <ion-buttons slot="end">
          <ion-button  @click="goToSetting">
            <ion-icon color="dark" :icon="settingsOutline"></ion-icon>
          </ion-button>
        </ion-buttons> -->


    </ion-toolbar>
  </ion-header>

  <ion-content :fullscreen="true" class="cosmic-content">
    <div style="height: 20px;"></div>
    <!-- Single Row: Link -->
    <!-- <div class="card-row">
      <div class="cosmic-card1" @click="goToMoments">
        <ion-icon :icon="atOutline" class="cosmic-icon" />
        <span class="cosmic-label"><span>{{ currentUserAlias || 'No Name' }} -Link</span></span>
      </div>
      
    </div> -->
    <!-- Single Row: My Node -->
    <!-- <div class="card-row">
      <div class="cosmic-card1" @click="goToMyNode">
       
        <span>{{ currentUserAlias || 'No Name' }}</span>
      </div>
    </div> -->


    <!-- Single Row: Scanner -->
    <!-- <div class="card-row">
      <div class="cosmic-card1" @click="goToScan">
        <ion-icon :icon="scanSharp" class="cosmic-icon" />
        <span class="cosmic-label">{{ $t('scanner') }}</span>
      </div>
    </div> -->

    <!-- Grid for Tools -->
    <div class="card-grid">
     
      <!-- <div class="cosmic-card" @click="goToSky">
        <ion-icon :icon="qrCodeOutline" class="cosmic-icon" />
        <span class="cosmic-label">MyStarrySky</span>
      </div> -->
      <div class="cosmic-card" @click="goToAI">
        <ion-icon :icon="pulseOutline" class="cosmic-icon" />
        <span class="cosmic-label">D-AI</span>
      </div>
      <div class="cosmic-card" @click="goToAIChat">
        <ion-icon :icon="pulseOutline" class="cosmic-icon" />
        <span class="cosmic-label">D-AI-MCP for Test</span>
      </div>
 <!-- Card: QR Code -->
      <div class="cosmic-card" @click="goToQR">
        <ion-icon :icon="qrCodeOutline" class="cosmic-icon" />
        <span class="cosmic-label">{{ $t('qrcodetool') }}</span>
      </div>
      <!-- Card: Offline Web Tools -->
      <div class="cosmic-card" @click="goToHtml">
        <ion-icon :icon="codeSlashOutline" class="cosmic-icon" />
        <span class="cosmic-label">{{ $t('offlinewebtools') }}</span>
      </div>
    
      <!-- Card: Browser -->
      <div class="cosmic-card" @click="goToBrowser">
        <ion-icon :icon="browsersOutline" class="cosmic-icon" />
        <span class="cosmic-label">Browser</span>
      </div>
      <!-- <div class="cosmic-card" @click="goToTest">
        <ion-icon :icon="browsersOutline" class="cosmic-icon" />
        <span class="cosmic-label">test</span>
      </div> -->
      <!-- <div class="cosmic-card" @click="goToVoiceCall">
        <ion-icon :icon="browsersOutline" class="cosmic-icon" />
        <span class="cosmic-label">VoiceCall</span>
      </div> -->
        <!-- Card: Relay -->
        <div class="cosmic-card" @click="goToRelays">
        <div style="filter: blur(20px);width: 100%;height: 100%;position: absolute;">
        <ponzsColor2></ponzsColor2>
      </div>
        <ion-icon :icon="rocketOutline" class="cosmic-icon" />
        <span class="cosmic-label">{{ $t('relay') }}</span>
      </div>
    </div>

    <!-- Single Row: Settings -->
    <!-- <div class="card-row">
      <div class="cosmic-card1" @click="goToSetting">
        <ion-icon :icon="settingsOutline" class="cosmic-icon" />
        <span class="cosmic-label">{{ $t('setting') }}</span>
      </div>
    </div> -->

 <!-- Modal content -->
 <!-- <ion-modal :is-open="isModalOpen" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Modal Header</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">
                <ion-icon :icon="settingsOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
    <Scanner/>



        </ion-content>
      </ion-modal> -->


  </ion-content>
</ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonButtons,
  IonBackButton,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import {
  planetOutline,
  qrCodeOutline,
  scanSharp,
  codeSlashOutline,
  browsersOutline,
  rocketOutline,
  atOutline,
  settingsOutline,
  pulseOutline
} from 'ionicons/icons'

const chatFlowStore = getTalkFlowCore();
// 控制模态窗口的显示
const isModalOpen = ref(false);

// 打开模态窗口
function openModal() {
  isModalOpen.value = true;
}

// 关闭模态窗口
function closeModal() {
  isModalOpen.value = false;
}
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
  showToast
} = chatFlowStore;

const router = useRouter()

function goToMoments() { router.push('/Moments') }
function goToMyNode() { router.push('/MyMoments') }
function goToScan() { router.push('/ScanPage') }
function goToQR() { router.push('/qrpage') }
function goToHtml() { router.push('/htmlpage') }
function goToRelays() { router.push('/relaypage') }
function goToBrowser() { router.push('/browser') }
 function goToSetting() { router.push('/settingspage') }
 function goToAI() { router.push('/AiSetting') }
 function goToAIChat() { router.push('/AiChat') }
 function goToSky() { router.push('/GameTest') }
 function goToVoiceCall() { router.push('/VoiceCall') }
 //function goToSetting() { router.push('/voicecall') }
 function goToTest() { router.push('/audioset') }
</script>

<style scoped>

body {
  background-color: var(--ion-background-color) !important; /* 强制设置背景颜色，覆盖所有背景设置 */
}

.cosmic-content {
  --background: var(--ion-background-color);
  /* --background: transparent; */
  padding: 20px;
}

/* Single card row */
.card-row {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  padding: 10px;
  
}

/* Grid layout for cards */
.card-grid {
  /* display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); */
  /* gap: 10px; */
  padding: 10px;
  margin-bottom: 20px;
  
}
.lightflow{

 width: 100%;
 height: 100%;
}
.lightflow1{
filter: blur(10px);
width: 100%;
height: 100%;
position: absolute;
top: 0;
left: 0;
right: 0;
bottom: 0;
}
/* Card styles */
.cosmic-card {
  display: grid;
  grid-template-rows: auto 1fr;
  grid-template-columns: auto 1fr;
  /* background: rgba(255, 255, 255, 0.95); */
  border-radius: 12px;
  padding: 15px;
  border: 1px solid rgba(0, 255, 213, 0.136);
  /* box-shadow: 0 4px 12px rgba(54, 54, 54, 0.567); */
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow:visible;
  min-height: 120px;
  min-width: 100%;
  margin: 10px 0;
  
 
}
.cosmic-card1 {
  display: grid;
  grid-template-rows: auto 1fr;
  grid-template-columns: auto 1fr;
  border: 1px solid rgba(0, 255, 213, 0.136);
  /* background: rgba(255, 255, 255, 0.95); */
  border-radius: 12px;
  padding: 15px;
  /* box-shadow: 0 4px 12px rgba(62, 62, 62, 0.567); */
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  min-height: 30px;
  width: 100%;
  min-width: 100%;
}
.card-row .cosmic-card {
  min-width: 100%;
}

/* Icon in top-left */
.cosmic-icon {
  grid-row: 1;
  grid-column: 1;
  font-size: 32px;
  color: rgb(42, 125, 112);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

/* Label in bottom-right */
.cosmic-label {
  grid-row: 2;
  grid-column: 2;
  font-size: 16px;
  color: var(--ion-text-color, #000000);
  text-align: right;
  /* text-shadow: 0 0 4px rgba(0, 0, 0, 0.2); */
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  align-self: end;
  justify-self: end;
}


.cosmic-card1:active {
  transform: scale(0.95);
  /* background: rgba(42, 125, 112, 0.1); */
}

.cosmic-card1:active .cosmic-icon {
  transform: scale(1.1);
}
.cosmic-icon::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120%;
  height: 120%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(42, 125, 112, 0.3) 0%, rgba(42, 125, 112, 0) 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
  pointer-events: none;
}

.cosmic-card:active .cosmic-icon::before {
  opacity: 1;
}

.cosmic-card:active .cosmic-label {
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.3);
}

/* Toolbar styles */
.liquid-toolbar {
  --border-color: transparent;
}

/* Responsive adjustments */
@media (max-width: 700px) {
  .card-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
  }

  .cosmic-card {
    padding: 12px;
    min-height: 100px;
    
  }
  .cosmic-card1 {
    padding: 12px;
    min-width: 100%;
    min-height: 30px;
  }
  .card-row .cosmic-card {
    width: 100%; 
    min-width: 100%;
  }

  .cosmic-icon {
    font-size: 28px;
  }

  .cosmic-label {
    font-size: 14px;
  }
}
</style>