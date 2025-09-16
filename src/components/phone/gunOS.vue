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
  padding-bottom: 20%;
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
  border: 2px solid rgba(255, 255, 255, 0.5);
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
</style>
<template>

  <!-- 顶部栏 -->
          <ion-toolbar>
            <ion-buttons slot="start" v-if="canGoBack">
              <ion-button @click="goBackInModal">
                <ion-icon :icon="arrowBackOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
            <ion-title>{{ getModalTitle() }}</ion-title>
         
          </ion-toolbar>
     
        
       
          <div class="fullscreen-container">
            

            
            <!-- 带优雅过渡的动态组件 -->
            <Transition 
              name="fade-scale" 
              mode="out-in"
            >
              <component 
                :is="currentModalComponentRef"
                :key="currentModalComponent"
                :modalNavigation="provideModalNavigation()"
                class="modal-component"
              />
            </Transition>

          </div>


      
</template>

<script lang="ts" setup>

import { ref, shallowRef, onMounted, onUnmounted, watch, computed } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { useI18n } from 'vue-i18n';
import DiscoverS from './DiscoverS.vue';

import { arrowBackOutline , 
  chatbubblesOutline, chatbubbleOutline,
   peopleOutline, personOutline, planetOutline, settingsOutline, 
   rocketOutline, browsersOutline, atOutline, sparklesOutline,
    chatbubbleEllipsesOutline, compassOutline, walletOutline, reorderFourOutline, 
    reorderThreeOutline, appsOutline, serverOutline, addCircleOutline, helpCircleOutline, 
    saveOutline,
    cloudDownloadOutline, happyOutline, refreshOutline } from 'ionicons/icons';
import { IonFooter, IonToolbar, IonContent, IonIcon
  , IonHeader, IonMenu, IonSplitPane,
   IonTitle } from '@ionic/vue';

import { useRouter } from 'vue-router';
import { IonModal, IonItem, IonLabel, IonInput, 
  IonButton, IonSpinner, IonButtons } from '@ionic/vue';

import { getTalkFlowCore } from '@/composables/TalkFlowCore';



const chatFlowStore = getTalkFlowCore();

const { t } = useI18n();
// @ts-ignore
const {
  copyPub, currentUserPub, currentUserAlias, currentUserAlias1, userAvatars, storageServ, gun, isDragging, startY, translateY, cardsTranslateY, velocity, lastTouchTime, lastTouchY, panelVisible: _panelVisible, panelContent: _panelContent, encryptData, decryptData, showToast, isLargeScreen, updateScreenSize, currentComponent, previousComponent, switchTo,
  fullscreenModalVisible,

} = chatFlowStore;

// 全屏模态窗口函数
async function openFullscreenModal() {
  fullscreenModalVisible.value = true;
  
  // 尝试加载上次保存的状态
  if (currentUserPub.value) {
    try {
      const savedState = await storageServ.getModalState(currentUserPub.value);
      if (savedState && savedState.component && savedState.history.length > 0) {
        // 恢复上次的状态
        currentModalComponent.value = savedState.component;
        modalComponentHistory.value = [...savedState.history];
        
      } else {
        // 使用默认状态
        currentModalComponent.value = 'DiscoverS';
        modalComponentHistory.value = ['DiscoverS'];
      }
    } catch (error) {
      
      currentModalComponent.value = 'DiscoverS';
      modalComponentHistory.value = ['DiscoverS'];
    }
  } else {
    // 没有用户信息时使用默认状态
    currentModalComponent.value = 'DiscoverS';
    modalComponentHistory.value = ['DiscoverS'];
  }
}

async function closeFullscreenModal() {
  // 保存最终状态
  await saveModalState();
  
  fullscreenModalVisible.value = false;
}

// 保存模态窗口状态到数据库
async function saveModalState() {
  if (currentUserPub.value) {
    try {
      await storageServ.saveModalState(
        currentUserPub.value,
        currentModalComponent.value,
        modalComponentHistory.value
      );
      
    } catch (error) {
      
    }
  }
}

// 组件内导航函数
async function navigateToModalComponent(componentName: string) {
  if (currentModalComponent.value !== componentName) {
    modalComponentHistory.value.push(componentName);
    currentModalComponent.value = componentName;
    
    // 保存状态到数据库
    await saveModalState();
  }
}

async function goBackInModal() {
  if (modalComponentHistory.value.length > 1) {
    modalComponentHistory.value.pop();
    currentModalComponent.value = modalComponentHistory.value[modalComponentHistory.value.length - 1];
    
    // 保存状态到数据库
    await saveModalState();
  }
}



// 检查是否可以返回
const canGoBack = computed(() => modalComponentHistory.value.length > 1);

// 为全局访问提供导航函数
function provideModalNavigation() {
  return {
    navigateToModalComponent: async (componentName: string) => {
      await navigateToModalComponent(componentName);
    },
    goBackInModal: async () => {
      await goBackInModal();
    },
    canGoBack: canGoBack.value
  };
}



// 导入模态窗口需要的页面组件
import QrPage from '../../pages/qrpage.vue';
import HtmlPage from '../../pages/htmlpage.vue';
import RelayPage from '../GunVue/RelayMode.vue';
import Browser from '../../pages/browser.vue';
import AiSetting from '../../pages/AiSetting.vue';

import ScanPage from '../../pages/ScanPage.vue';

import MigrationChoice from '../../pages/MigrationChoice.vue';
import Networkdatabase from '../../pages/indexedDBpage.vue';

// 获取模态窗口标题
function getModalTitle() {
  const titleMap: Record<string, string> = {
    DiscoverS: t('TAPP'),
    QrPage: t('qrcodetool'),
    HtmlPage: t('offlinewebtools'),
    RelayPage: t('relaySettings'),
    Browser: t('Browser'),
    AiSetting: t('aiSettings'),
    ScanPage: t('scanner'),
    Xpage: t('X'),
    MigrationChoice : t('Data migration'),
    Networkdatabase : t('Networkdatabase'),
    // Youtubepage: t('Youtube'),
    // Githubpage: t('Github'),
    // Tiktokpage: t('Tiktok')
  };
  return titleMap[currentModalComponent.value] || t('APP');
}
const midPoint = 0;

const positionState = ref('middle');
// 组件内路由状态
const currentModalComponent = ref('DiscoverS');
const modalComponentHistory = ref(['DiscoverS']);

// 组件映射
const modalComponents = {
  DiscoverS,
  QrPage,
  HtmlPage,
  RelayPage,
  Browser,
  AiSetting,

  ScanPage,

  MigrationChoice,
  Networkdatabase,
//   Youtubepage,
//   Githubpage,
//   Tiktokpage
};

// 获取当前模态组件
const currentModalComponentRef = computed(() => {
  return modalComponents[currentModalComponent.value as keyof typeof modalComponents] || DiscoverS;
});







onMounted(async () => {
  await openFullscreenModal();
  positionState.value = 'middle';
  translateY.value = midPoint;
  cardsTranslateY.value = 0;

});

// onUnmounted(async () => {
//   await closeFullscreenModal();
// });

</script>



