<style scoped>

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

/* 全屏模态窗口样式 */
.fullscreen-modal {
  --height: 100%;
  --width: 100%;
}

.fullscreen-content {
  --background: var(--ion-background-color);
}

.fullscreen-container {
  width: 100%;
  height: 100%;
  position: relative;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

.fullscreen-container h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: var(--ion-color-primary);
}

.fullscreen-container p {
  font-size: 1.2rem;
  margin-bottom: 15px;
  color: var(--ion-text-color);
  opacity: 0.8;
}

.fullscreen-demo-content {
  margin-top: 40px;
  width: 100%;
  max-width: 300px;
}

/* 模态窗口中的DiscoverS组件样式 */
.fullscreen-container DiscoverS,
.fullscreen-container .cosmic-content {
  width: 100% !important;
  height: 100% !important;
}

.fullscreen-container .card-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 15px !important;
  padding: 10px !important;
  margin-bottom: 20px !important;
  min-height: 200px !important;
}

.fullscreen-container .cosmic-card {
  display: grid !important;
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(0, 255, 213, 0.3) !important;
  border-radius: 12px !important;
  padding: 15px !important;
  min-height: 120px !important;
  width: 100% !important;
  cursor: pointer !important;
  z-index: 10 !important;
  pointer-events: auto !important;
  position: relative !important;
}

.fullscreen-container .cosmic-card:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(0, 255, 213, 0.5) !important;
  transform: translateY(-2px) !important;
}

.fullscreen-container .cosmic-card:active {
  background: rgba(42, 125, 112, 0.3) !important;
  transform: scale(0.98) !important;
}

/* 动态组件容器样式 */
.fullscreen-container > * {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 确保各个页面组件在模态窗口中正确显示 */
.fullscreen-container ion-page {
  display: block !important;
  position: relative !important;
}

.fullscreen-container ion-content {
  --background: transparent !important;
  height: 100% !important;
  position: relative;
}

/* 强制显示DiscoverS组件中的选项列表 */
.fullscreen-container .card-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 15px !important;
  padding: 10px !important;
  margin-bottom: 20px !important;
  min-height: 200px !important;
  width: 100% !important;
  position: relative !important;
  z-index: 1000 !important;
}

.fullscreen-container .cosmic-card {
  display: grid !important;
  grid-template-rows: auto 1fr !important;
  grid-template-columns: auto 1fr !important;
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: 12px !important;
  padding: 15px !important;
  border: 1px solid rgba(0, 255, 213, 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
  position: relative !important;
  overflow: visible !important;
  min-height: 120px !important;
  width: 100% !important;
  z-index: 1001 !important;
  margin-bottom: 10px !important;
  pointer-events: auto !important;
}

.fullscreen-container .cosmic-card:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(0, 255, 213, 0.5) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 16px rgba(0, 255, 213, 0.2) !important;
}

.fullscreen-container .cosmic-card:active {
  background: rgba(42, 125, 112, 0.2) !important;
  transform: scale(0.98) !important;
}

/* 确保图标和标签在模态窗口中正确显示 */
.fullscreen-container .cosmic-icon {
  grid-row: 1 !important;
  grid-column: 1 !important;
  font-size: 32px !important;
  color: rgb(42, 125, 112) !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  z-index: 1 !important;
}

.fullscreen-container .cosmic-label {
  grid-row: 2 !important;
  grid-column: 2 !important;
  font-size: 16px !important;
  color: var(--ion-text-color) !important;
  text-align: right !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  z-index: 1 !important;
  align-self: end !important;
  justify-self: end !important;
  font-weight: 500 !important;
}

/* 模态组件样式 */
.modal-component {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* 简洁的淡入缩放过渡效果 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 其他复杂动画已简化 */

/* 模态窗口整体动画 */
.fullscreen-modal {
  animation: modalSlideUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes modalSlideUp {
  0% {
    opacity: 0;
    transform: translateY(100%);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 头部导航动画 */
.fullscreen-modal ion-header {
  animation: headerFadeIn 0.5s ease-out 0.2s both;
}


/* 按钮交互动画 */
.fullscreen-modal ion-button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fullscreen-modal ion-button:hover {
  transform: scale(1.05);
}

.fullscreen-modal ion-button:active {
  transform: scale(0.95);
}

/* 返回按钮特殊动画 */
.fullscreen-modal ion-buttons[slot="start"] ion-button {
  animation: buttonSlideIn 0.3s ease-out 0.3s both;
}

@keyframes buttonSlideIn {
  0% {
    opacity: 0;
    transform: translateX(-30px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 关闭按钮特殊动画 */
.fullscreen-modal ion-buttons[slot="end"] ion-button {
  animation: buttonFadeIn 0.3s ease-out 0.4s both;
}

@keyframes buttonFadeIn {
  0% {
    opacity: 0;
    transform: rotate(90deg) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
}

/* 标题动画 */
.fullscreen-modal ion-title {
  animation: titleSlideIn 0.4s ease-out 0.25s both;
}

@keyframes titleSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 新增 user-details 样式 */
.user-details {
  display: flex;
  flex-direction: column;
  align-items: start; 
  justify-content: start;
  text-align: center;
}

/* 内容区域样式优化 */
.profile-content {
  --background: transparent;
}

.profile-content::part(scroll) {
  padding: 0;
  margin: 0;
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
 
}

.user-info-overlay {
  position: absolute;
  top: 15%;
  left: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  padding: 6px;
  border-radius: 12px;
  backdrop-filter: blur(5px);
}

.avatar-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  margin-left: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 50%;
  cursor: pointer;
  user-select: none;
  position: relative;
  z-index: 2;
  border: 2px solid var(--ion-text-color);
}

.avatar-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  filter: blur(10px);
  transform: scale(1.1);
  opacity: 0.6;
  z-index: 1;
  pointer-events: none;
}

.user-text-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-left: 10px;
}

.username {
  font-weight: bold;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  font-size: 1.1rem; /* smaller */
  margin: 0;
  color: var(--ion-text-color);
  text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
}

.signature-text {
  font-size: 0.7rem !important; /* smaller */
  font-weight: 500;
  color: rgba(145, 145, 145, 0.703);
}

/* For RadiantText */
.user-info-overlay .inline-flex {
  padding: 0 !important;
}

.controls-overlay {
  position: absolute;
  top: 15%;
  right: 10px;
  z-index: 10;

 
 
  gap: 8px;
}

/* 分层动画关键帧已移除 */
ion-header {
  z-index: 1000;
}

.top-toolbar ion-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}



ion-icon {
  font-size: 24px;
  color: var(--ion-text-color);
}

/* 3D网络Canvas样式 */
.network-canvas {
  width: 100% !important;
  height: 100% !important;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  cursor: grab;
}

.network-canvas:active {
  cursor: grabbing;
}

.stranger-relay-modal .relay-item {
  --padding-start: 16px;
  --padding-end: 16px;
  border-bottom: 1px solid var(--ion-border-color, rgba(0,0,0,0.1));
}

.stranger-relay-modal .relay-url {
  font-family: monospace;
  font-size: 0.9em;
}

.stranger-relay-modal ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
}

/* 地球canvas样式 */
/* .globe-canvas {
  position: absolute;
  top: 60%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  height: 90vw;
  max-width: 500px;
  max-height: 500px;
  z-index: 2;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  background: transparent;
} */

.legend-panel {
  position: absolute;
  top: unset;
  right: 10px;
  margin-top: 8px;
  z-index: 10;
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  color: white;
  width: 200px;
}

.legend-title {
  font-weight: bold;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 4px;
}

.legend-panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.legend-panel li {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.9em;
}

.legend-panel li:last-child {
  margin-bottom: 0;
}

.legend-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.canvas-buttons {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.legend-button, .stranger-list-button, .refresh-canvas-button {
  --padding-start: 8px;
  --padding-end: 8px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  height: 36px;
  width: 36px;
  margin-right: 10px;
}

.legend-button ion-icon, .stranger-list-button ion-icon {
  font-size: 24px;
}

.friend-label {
  color: white; /* 默认白色文字 */
  font-size: 0.7em; /* 字体大小 */
  font-weight: bold;
  background: rgba(0, 0, 0, 0.5); /* 半透明黑色背景 */
  padding: 3px 6px;
  border-radius: 4px;
  pointer-events: none; /* 确保不影响鼠标事件 */
  white-space: nowrap; /* 防止换行 */
  transform: translateY(-100%); /* 向上偏移，使其位于球体上方 */
}

.user-label, .relay-label {
  color: white;
  font-size: 0.65em;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 5px;
  border-radius: 3px;
  pointer-events: none;
  white-space: nowrap;
  transform: translateY(-100%);
}

html.dark .friend-label, html.dark .user-label, html.dark .relay-label {
  color: #eee;
  background: rgba(255, 255, 255, 0.2);
}

html.light .friend-label, html.light .user-label, html.light .relay-label {
  color: #333;
  background: rgba(0, 0, 0, 0.2);
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
</style>

<template>
  <div class="canvas-container" >
    <!-- 3D网络拓扑图组件 -->
        <NetworkCanvas 
          ref="networkCanvasComponent" 
          @view-mode-changed="onViewModeChanged"
        />
  </div>
  <!-- 顶部栏 -->
  <ion-header :translucent="true"  collapse="fade">
    <ion-toolbar >
      <!-- 左侧按钮组 -->
      <ion-buttons slot="start">
            <ion-button  fill="clear" @click="openStrangerRelayModal">
          <ion-icon :icon="cloudDownloadOutline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" @click="toggleLegend">
          <ion-icon :icon="helpCircleOutline"></ion-icon>
        </ion-button>
     
             <ion-button fill="clear" @click="router.push('/settingspage')">
          <ion-icon :icon="settingsOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
      
      <!-- 右侧按钮组 -->
      <ion-buttons slot="end">
     
        <ion-button fill="clear" @click="showPanel('qrcode')">
          <ion-icon :icon="qrCodeOutline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" @click="goToScan">
          <ion-icon :icon="scanSharp"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>

    <ion-toolbar style="--background: transparent; gap:8px;" >
      <!-- 左侧按钮组 -->
      <ion-buttons slot="start">
                <div class="avatar-wrapper" @click="gotomyset">
          <img
            v-if="userAvatars[currentUserPub!]"
            :src="userAvatars[currentUserPub!]"
            alt=""
            class="avatar"
            :style="avatarStyle"
          />
          <img
            v-else
            :src="avatarurl"
            class="avatar"
            
          /> 
        </div>
        
        <div class="user-text-info">
          <h1 class="username">{{ currentUserAlias || '' }}</h1>
        </div>
    
      </ion-buttons>
      
      <!-- 右侧按钮组 -->
      <ion-buttons slot="end">
           <!-- 网格模式切换开关 - 只在showCover为false时显示 -->
        <div v-if="!networkCanvasComponent?.showCover" class="grid-mode-toggle" style="margin: 0 15px;">
          <ion-toggle 
            :checked="isPersonalView" 
            @ionChange="toggleGridMode"
            color="primary"
          ></ion-toggle>
          <!-- <span class="toggle-label">{{ isPersonalView ? '全部' : '个人' }}</span> -->
        </div>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  
  <!-- 内容区域 -->
  <ion-content :fullscreen="true" :scroll-y="false" class="profile-content">

  </ion-content>

  <ion-modal
    :is-open="panelVisible"
    css-class="profile-modal"
    :breakpoints="[0, 1]"
    :initial-breakpoint="0.8"
    @didDismiss="hidePanel"
  >

  <ion-header :translucent="true"   collapse="fade">
    <ion-toolbar>
      <ion-title>Sacn the code to add friends</ion-title>
   <ion-buttons slot="end">
            <ion-button fill="clear" @click="hidePanel">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
    </ion-toolbar>
    
  </ion-header>
    <ion-content class="modal-content">
 
    <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 0px 10px;font-weight: 900;font-size: 19px;">
        Sacn the code to add friends
            </h1>
          </ion-toolbar>
        </ion-header>

      <div class="panel-content">
        <div v-if="panelContent === 'qrcode'">
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
            </template>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-modal>

    

</template>

<script lang="ts" setup>
import { cn } from "@/lib/utils";
import { useSpring } from "vue-use-spring";
import { ref, shallowRef, onMounted, onUnmounted, watch, computed } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { useI18n } from 'vue-i18n';
import NetworkCanvas from './NetworkCanvas.vue';
// useNetworkStatus现在在NetworkCanvas组件中使用


import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { chatbubblesOutline, chatbubbleOutline, peopleOutline, personOutline, planetOutline, settingsOutline, rocketOutline, browsersOutline, atOutline, sparklesOutline, chatbubbleEllipsesOutline, compassOutline, walletOutline, reorderFourOutline, reorderThreeOutline, appsOutline, serverOutline, happyOutline } from 'ionicons/icons';
import { IonFooter, IonToolbar, IonContent, IonIcon, IonHeader, IonMenu, IonSplitPane, IonTitle,menuController,} from '@ionic/vue';
import { gunAvatar } from "gun-avatar";
import ChatSpad from '../ipad/ChatSpad.vue';
import RelayMode from '../GUNtest/RelayMode.vue';
import { useRouter } from 'vue-router';
import { IonModal, IonItem, IonLabel, IonInput, IonButton, IonSpinner, IonButtons, IonToggle } from '@ionic/vue';
import { closeCircleSharp, copyOutline, keyOutline, qrCodeOutline, keySharp, lockClosedOutline, eyeOutline, eyeOffOutline, refreshCircleOutline, warningOutline, lockOpenOutline, checkmarkCircleOutline, alertCircleOutline, scanSharp, menuOutline, expandOutline, arrowBackOutline, refreshOutline, helpCircleOutline, cloudDownloadOutline,closeOutline  } from 'ionicons/icons';
import { getTalkFlowCore, autoSaveStorageServ } from '@/composables/TalkFlowCore';

const iscanvas = ref(false);

const { isDark } = useTheme();
const chatFlowStore = getTalkFlowCore();
const router = useRouter();
const { t } = useI18n();
// @ts-ignore
const {
  copyPub, currentUserPub, currentUserAlias, currentUserAlias1, userAvatars, storageServ, gun, isDragging, startY, translateY, cardsTranslateY, velocity, lastTouchTime, lastTouchY, panelVisible: _panelVisible, panelContent: _panelContent, encryptData, decryptData, showToast, currentComponent, previousComponent, switchTo,
  fullscreenModalVisible,
  buddyList, 
} = chatFlowStore;

const avatarurl = computed(() => gunAvatar({ pub: currentUserPub.value, round: false, dark: isDark.value, svg: true } as any));

// NetworkCanvas组件引用
const networkCanvasComponent = ref<InstanceType<typeof NetworkCanvas> | null>(null);

// 网格模式状态
const isPersonalView = ref(false); // 默认为个人网格模式

// 切换网格模式
const toggleGridMode = (event: CustomEvent) => {
  isPersonalView.value = event.detail.checked;
  // 通知NetworkCanvas组件切换模式
  if (networkCanvasComponent.value) {
    networkCanvasComponent.value.setViewMode(isPersonalView.value);
  }
};

// 接收NetworkCanvas发射的viewModeChanged事件
const onViewModeChanged = (newMode: boolean) => {
  isPersonalView.value = newMode;
};


// Other existing variables and functions remain unchanged
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
    if (value === 'pubkey' || value === 'qrcode' || value === null) {
      _panelContent.value = value as 'pubkey' | 'qrcode' | null;
    }
  }
});

function goToScan() { router.push('/ScanPage'); }

function gotomyset() { router.push('/myself'); }


const midPoint = 0;

const positionState = ref('middle');
const encryptedPair = ref('');
const showKeyPair = ref(false);
const avatarStyle = ref({});
const decryptPassphrase = ref('');
const decryptMessage = ref('');
const showDecryptedKeyPair = ref(false);
const decryptedPair = ref('');


// Canvas刷新功能现在由NetworkCanvas组件处理
const refreshCanvas = () => {
  if (networkCanvasComponent.value) {
    networkCanvasComponent.value.refreshCanvas();
  }
};

// 图例切换功能
const toggleLegend = () => {
  if (networkCanvasComponent.value) {
    networkCanvasComponent.value.toggleLegend();
  }
};

// 陌生节点模态窗口功能
const openStrangerRelayModal = () => {
  if (networkCanvasComponent.value) {
    networkCanvasComponent.value.openStrangerRelayModal();
  }
};


function copyEncryptedKeyPair() {
  if (encryptedPair.value) {
    navigator.clipboard.writeText(encryptedPair.value)
      .then(() => showToast(t('keyPairCopiedToClipboard'), 'success'))
      .catch(err => showToast(t('copyFailed'), 'error'));
  }
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
    const userData = await autoSaveStorageServ.getUser(currentUserPub.value);
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