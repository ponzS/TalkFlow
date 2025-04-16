<template>
    <!-- 顶部导航栏 -->
    <ion-header collapse="fade" >
      <ion-toolbar class="liquid-toolbar">
        <ion-title>Discover</ion-title>
      </ion-toolbar>
    </ion-header>
  
    <ion-content :fullscreen="true" class="cosmic-content">
      <ion-list>
        <ion-item button @click="goToMoments" class="cosmic-item">
          <ion-icon aria-hidden="true" slot="start" :icon="atOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">Link</ion-label>
        </ion-item>
        <ion-item lines="none" button @click="goToMyNode" class="cosmic-item">
          <!-- <ion-icon aria-hidden="true" slot="start" :icon="pricetagsOutline" class="cosmic-icon" /> -->
          <ion-label class="cosmic-label">{{ currentUserAlias || 'No Name' }}</ion-label>
        </ion-item>
      </ion-list>
  
      <!-- <ion-list>
        <ion-item lines="none" button @click="goToScan" class="cosmic-item">
          <ion-icon slot="start" :icon="scanSharp" class="cosmic-icon1" />
          <ion-label class="cosmic-label">{{$t('scanner')}}</ion-label>
        </ion-item>
      </ion-list> -->
      <ion-list>
      <ion-item lines="none" button @click="goToChatbot" class="cosmic-item">
        <ion-icon slot="start" :icon="scanSharp" class="cosmic-icon1" />
        <ion-label class="cosmic-label">Chatbot</ion-label>
      </ion-item>
    </ion-list>

  
      <ion-list>
        <ion-item button @click="goToQR" class="cosmic-item">
          <ion-icon slot="start" :icon="qrCodeOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{$t('qrcodetool')}}</ion-label>
        </ion-item>
        <ion-item button @click="goToHtml" class="cosmic-item">
          <ion-icon slot="start" :icon="codeSlashOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{$t('offlinewebtools')}}</ion-label>
        </ion-item>
        <ion-item button @click="goToBase64" class="cosmic-item">
          <ion-icon slot="start" :icon="imageOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">Base64</ion-label>
        </ion-item>
        <!-- <ion-item button @click="goToBrowser" class="cosmic-item">
          <ion-icon slot="start" :icon="browsersOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">Browser</ion-label>
        </ion-item>
        <ion-item lines="none" button @click="goToRelays" class="cosmic-item">
          <ion-icon slot="start" :icon="rocketOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{$t('relay')}}</ion-label>
        </ion-item> -->
  
        <!-- <ion-item lines="none" button @click="goToBare" class="cosmic-item">
          <ion-icon slot="start" :icon="rocketOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">Bare</ion-label>
        </ion-item> -->
  
  
      </ion-list>
  
  
      <!-- <ion-list>
      
  
        <ion-item button @click="goToDevPost" class="cosmic-item">
          <ion-icon slot="start" :icon="constructOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">Dev</ion-label>
        </ion-item>
  
      </ion-list> -->
  
      <!-- <ion-list>
   
        <ion-item lines="none" button @click="goToSetting" class="cosmic-item">
          <ion-icon slot="start" :icon="settingsOutline" class="cosmic-icon" />
          <ion-label class="cosmic-label">{{$t('setting')}}</ion-label>
        </ion-item>
      </ion-list> -->
    </ion-content>
  </template>
  
  <script setup lang="ts">
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon
  } from '@ionic/vue'
  import { useRouter } from 'vue-router'
  import {
    planetOutline,
    qrCodeOutline,
    pulseOutline,
    pricetagsOutline,
    infiniteOutline,
    saveOutline,
    settingsOutline,
    scanCircleOutline,
    scanCircle,
    scanCircleSharp,
    scanSharp,
    codeSlashOutline,
    cellularOutline,
    wifiOutline,
    rocketOutline,
    atCircleOutline,
    atOutline,
    imageOutline,
    browsersOutline,
    constructOutline
  } from 'ionicons/icons'
  const chatFlowStore = getTalkFlowCore();
  
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
  function goToStorage() { router.push('/usertest') }
  function goToBase64() { router.push('/base64') }
  function goToBrowser() { router.push('/browser') }
  function goToSetting() { router.push('/settingspage') }
  function goToDev() { router.push('/devpage') }
  function goToDevPost() { router.push('/devpost') }
  function goToBare() { router.push('/usertest') }
  function goToChatbot() { router.push('/Chatbot1') }
  </script>
  
  <style scoped>
  .cosmic-content {
    --background: transparent;
    /* position: relative;
    overflow: visible; */
  }
  
  /* 列表样式 */
  ion-list {
    margin-top: 30px;
    border-radius: 8px;
  
    position: relative;
    overflow: visible;
    background: transparent;
  }
  
  /* 列表项样式 */
  .cosmic-item {
    --background: transparent;
    transition: all 0.3s ease;
    position: relative;
    overflow: visible;
    background: transparent;
  }
  
  .cosmic-item:active {
    --background: rgba(42, 125, 112, 0.1);
  }
  
  .cosmic-icon {
    font-size: 26px;
    margin-right: 10px;
    color: rgb(42, 125, 112);
    transition: all 0.3s ease;
    position: relative;
    z-index: 1;
  }
  .cosmic-icon1 {
    font-size: 26px;
    margin-right: 10px;
    color: rgb(42, 125, 112);
    transition: all 0.3s ease;
    position: relative;
    z-index: 1;
  }
  .cosmic-icon1::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
    border-radius: 50%; 
    background: radial-gradient(circle, rgba(42, 125, 112, 0.6) 0%, rgba(42, 125, 112, 0) 70%);
    opacity: 1;
    transition: opacity 0.3s ease;
    z-index: -1; 
    pointer-events: none;
  }
  
  .cosmic-item:active .cosmic-icon {
    transform: scale(1.1);
  }
  
  .cosmic-item:active .cosmic-icon::before {
    opacity: 0;
  }
  
  /* 文字光晕 */
  .cosmic-label {
    font-size: 20px;
    color: var(--ion-text-color, #000000);
    text-shadow: 0 0 4px var(--ion-text-color, rgba(0, 0, 0, 0.3));
    transition: all 0.3s ease;
    position: relative;
    z-index: 1;
  }
  
  .cosmic-item:active .cosmic-label {
    text-shadow: 0 0 6px var(--ion-text-color, rgba(0, 0, 0, 0.5));
  }
  
  /* 工具栏样式 */
  .liquid-toolbar {
    --border-color: transparent;
  }
  
  /* 暗主题适配 */
  /* @media (prefers-color-scheme: dark) {
    ion-list {
      background: rgba(0, 0, 0, 0.2);
    }
    .cosmic-item {
      --background: transparent;
    }
    .cosmic-item:hover {
      --background: rgba(42, 125, 112, 0.1);
    }
    .cosmic-label {
      color: #bfcbc7;
      text-shadow: 0 0 4px rgba(191, 203, 199, 0.5);
    }
    .cosmic-item:hover .cosmic-label {
      text-shadow: 0 0 6px rgba(191, 203, 199, 0.7);
    }
    .cosmic-icon::before {
      background: radial-gradient(circle, rgba(42, 125, 112, 0.8) 0%, rgba(42, 125, 112, 0) 70%);
    }
    .cosmic-item:hover .cosmic-icon::before {
      opacity: 1;
    }
  } */
  
  /* 亮主题适配 */
  /* @media (prefers-color-scheme: light) {
    ion-list {
      background: rgba(255, 255, 255, 0.2);
    }
    .cosmic-item {
      --background: transparent;
    }
    .cosmic-item:hover {
      --background: rgba(42, 125, 112, 0.1);
    }
    .cosmic-label {
      color: #000000;
      text-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
    }
    .cosmic-item:hover .cosmic-label {
      text-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
    }
    .cosmic-icon::before {
      background: radial-gradient(circle, rgba(42, 125, 112, 0.6) 0%, rgba(42, 125, 112, 0) 70%);
    }
    .cosmic-item:hover .cosmic-icon::before {
      opacity: 1;
    }
  } */
  
  .liquid-toolbar {
    --border-color: transparent;
    /* backdrop-filter: blur(10px); */
  }
  </style>