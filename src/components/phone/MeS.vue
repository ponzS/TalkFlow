// @ts-nocheck
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

@keyframes headerFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
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


.centeravatar{
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  align-self:center;
  flex-direction: column;
  width: 100%;
  margin:0 auto;
  top: 19%;
}
.avatar {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 50%;

  z-index: 9999;
  cursor: pointer;
  user-select: none;
  overflow:hidden;
  opacity: 0.6;

}
.username {
  
  font-weight: bold;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  /* color: #2c3e50; */
  font-size:10vh;

}
.menulist{
  position: absolute;
  gap: 20px;
  display: flex;
  justify-content: end;
  align-items: end;
  flex-direction: column;
  top: 30%;
  right: 10px;
  z-index: 9999;

}
.avatar-glow {
  position: absolute;
  width: 150px;
  height: 150px;
  /* object-fit: cover; */
  border-radius: 50%;
  filter: blur(20px);
  transform: scale(1.2);
  opacity: 0.6;
  
  overflow:hidden;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: screen;
  
}



</style>
<template>



  <div class="menulist">
    <div @click="gotoSettings" >
            <ion-icon style="font-size: 25px;"  :icon="settingsOutline"  class="cosmic-icon" />
            
          </div>
         
          <div  @click="goToRelay">
            <ion-icon style="font-size: 25px;"  :icon="rocketOutline" class="cosmic-icon"  />
          </div>

        
          
          <!-- <div   @click="showPanel('keypair')" >
            <ion-icon style="font-size: 25px;"  :icon="keyOutline" class="cosmic-icon" />
          </div> -->
      

       
          <!-- <div @click="gotoDiscover" >
            <ion-icon style="font-size: 25px;"  :icon="appsOutline"  class="cosmic-icon" />
            
          </div> -->
          <div  @click="showPanel('qrcode')">
            <ion-icon style="font-size: 25px;"  :icon="qrCodeOutline" class="cosmic-icon"  />
          </div>
          <div  @click="goToScan">
            <ion-icon style="font-size: 25px;"  :icon="scanSharp" class="cosmic-icon"  />
          </div>
     
          <!-- 全屏模态窗口选项 -->
          <div @click="openFullscreenModal" >
            <ion-icon style="font-size: 25px;"  :icon="appsOutline" class="cosmic-icon" />
          </div>
        
          
        </div>
       
  <!-- <div :class="cn('absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]', $props.class)"> -->
   <div class="centeravatar">

    <div>
  <img
      v-if="userAvatars[currentUserPub!]"
      :src="userAvatars[currentUserPub!]"
      alt=""
      class="avatar-glow"
        @click="gotomyset"
    />
    <img
            v-else
            :src="avatarurl"
    
            class="avatar-glow"
              @click="gotomyset"
          />
    <img
            v-if="userAvatars[currentUserPub!]"
            :src="userAvatars[currentUserPub!]"
            alt=""
            class="avatar"
      
            :style="avatarStyle"
              @click="gotomyset"
         
          />
          <img
            v-else
            :src="avatarurl"
        @click="gotomyset"
            class="avatar"
            
          /> 
        </div>

        
        <h1 class="username"  >{{ currentUserAlias || 'No Name' }}</h1>
        <!-- <Text3d
      class="text-8xl font-black max-md:text-7xl"
      shadow-color="skyblue"
      :animate="false"
    >
    <h1 class="username">{{ currentUserAlias || 'No Name' }}</h1>
    </Text3d> -->
    <!-- <Lens
        :hovering="hovering"
        @hover-update="setHovering"
      >
    </Lens> -->
        <RadiantText
    class="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400"
    :duration="5"
  >
    <span   class="text-3xl font-bold">{{ currentUserAlias1 || '' }}</span>
  </RadiantText>
        </div>
   
    
    <canvas
      ref="globeCanvasRef"
      style="width: 100%;height: 100%;z-index: 9999;"
      @pointerdown="(e) => updatePointerInteraction(e.clientX)"
      @pointerup="updatePointerInteraction(null)"
      @pointerout="updatePointerInteraction(null)"
      @mousemove="(e) => updateMovement(e.clientX)"
      @touchmove="(e) => e.touches[0] && updateMovement(e.touches[0].clientX)"
    ></canvas>

    <ion-modal
        :is-open="panelVisible"
        css-class="profile-modal"
        :breakpoints="[0, 0.5, 1]"
        :initial-breakpoint="0.8"
        @didDismiss="hidePanel"
      >
        <ion-content class="modal-content">
          <div class="panel-header">
            <span>{{ panelContent === 'pubkey' ? '' : panelContent === 'qrcode' ? '' : panelContent === 'keypair' ? 'Key Pair' : 'Reset Password' }}</span>
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
              <!-- <ion-button color="dark" expand="block" class="keypair-btn" @click="showEncryptedKeyPair">
                <ion-icon slot="start" :icon="showKeyPair ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
                {{ showKeyPair ? 'Hide Key Pair' : 'Show Key Pair' }}
              </ion-button> -->
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
            
              <div v-if="panelContent === 'qrcode'" >
                



       
            </div>
            </div>
          
            
            </div>
            
       
   
          
        </ion-content>
      </ion-modal>

      <!-- 全屏模态窗口 -->
      <ion-modal
        :is-open="fullscreenModalVisible"
        css-class="fullscreen-modal"
        @didDismiss="closeFullscreenModal"
      >
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start" v-if="canGoBack">
              <ion-button @click="goBackInModal">
                <ion-icon :icon="arrowBackOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
            <ion-title>{{ getModalTitle() }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeFullscreenModal">
                <ion-icon :icon="closeCircleSharp"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        
        <ion-content class="fullscreen-content" :scroll-y="true">
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
        </ion-content>
      </ion-modal>

      
</template>

<script lang="ts" setup>
import { cn } from "@/lib/utils";
import createGlobe, { type COBEOptions } from "cobe";
import { useSpring } from "vue-use-spring";
import { ref, shallowRef, onMounted, onUnmounted, watch, computed } from 'vue';
import { useTheme } from '@/composables/useTheme';

// Other imports remain unchanged
import Chat from './ChatS.vue';
import Contacts from './ContactsS.vue';
import DiscoverS from './DiscoverS.vue';
import Profile from './MeS.vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { chatbubblesOutline, chatbubbleOutline, peopleOutline, personOutline, planetOutline, settingsOutline, rocketOutline, browsersOutline, atOutline, sparklesOutline, chatbubbleEllipsesOutline, compassOutline, walletOutline, reorderFourOutline, reorderThreeOutline, appsOutline } from 'ionicons/icons';
import { IonFooter, IonToolbar, IonContent, IonIcon, IonHeader, IonMenu, IonSplitPane, IonTitle } from '@ionic/vue';
import { gunAvatar } from "gun-avatar";
import ChatSpad from '../ipad/ChatSpad.vue';
import RelayMode from '../GUNtest/RelayMode.vue';
import { useRouter } from 'vue-router';
import { IonModal, IonItem, IonLabel, IonInput, IonButton, IonSpinner, IonButtons } from '@ionic/vue';
import { closeCircleSharp, copyOutline, keyOutline, qrCodeOutline, keySharp, lockClosedOutline, eyeOutline, eyeOffOutline, refreshCircleOutline, warningOutline, lockOpenOutline, checkmarkCircleOutline, alertCircleOutline, scanSharp, menuOutline, expandOutline, arrowBackOutline } from 'ionicons/icons';

// 导入模态窗口需要的页面组件
import QrPage from '../../pages/qrpage.vue';
import HtmlPage from '../../pages/htmlpage.vue';
import RelayPage from '../GUNtest/RelayMode.vue';
import Browser from '../../pages/browser.vue';
import AiSetting from '../../pages/AiSetting.vue';
import AiChat from '../../pages/AiChat.vue';
import ScanPage from '../../pages/ScanPage.vue';

const { isDark } = useTheme();
const chatFlowStore = getTalkFlowCore();
const router = useRouter();
const {
  copyPub, currentUserPub, currentUserAlias, currentUserAlias1, userAvatars, storageServ, gun, isDragging, startY, translateY, cardsTranslateY, velocity, lastTouchTime, lastTouchY, panelVisible: _panelVisible, panelContent: _panelContent, encryptData, decryptData, showToast, isLargeScreen, updateScreenSize, currentComponent, previousComponent, switchTo,
  fullscreenModalVisible 
} = chatFlowStore;

const avatarurl = computed(() => gunAvatar({ pub: currentUserPub.value, round: false, dark: isDark.value, svg: true }));


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
function goToRelay() { router.push('/relaypage'); }
function gotoSettings() { router.push('/settingspage'); }
function gotoDiscover() { router.push('/discoverpage'); }
function gotomyset() { router.push('/myself'); }

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
        console.log(`📱 恢复模态窗口状态: ${savedState.component}`, savedState.history);
      } else {
        // 使用默认状态
        currentModalComponent.value = 'DiscoverS';
        modalComponentHistory.value = ['DiscoverS'];
      }
    } catch (error) {
      console.warn('加载模态窗口状态失败，使用默认状态:', error);
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
      console.log(`💾 模态窗口状态已保存: ${currentModalComponent.value}`, modalComponentHistory.value);
    } catch (error) {
      console.warn('保存模态窗口状态失败:', error);
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

// 获取模态窗口标题
function getModalTitle() {
  const titleMap: Record<string, string> = {
    DiscoverS: 'GunOS',
    QrPage: 'QR Code Tool',
    HtmlPage: 'Web Tools',
    RelayPage: 'Relay Settings',
    Browser: 'Browser',
    AiSetting: 'AI Settings',
    AiChat: 'AI Chat',
    ScanPage: 'Scanner'
  };
  return titleMap[currentModalComponent.value] || 'GunOS';
}
const midPoint = 0;

const positionState = ref('middle');
const encryptedPair = ref('');
const showKeyPair = ref(false);
const avatarStyle = ref({});
const decryptPassphrase = ref('');
const decryptMessage = ref('');
const showDecryptedKeyPair = ref(false);
const decryptedPair = ref('');

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
  AiChat,
  ScanPage,
};

// 获取当前模态组件
const currentModalComponentRef = computed(() => {
  return modalComponents[currentModalComponent.value as keyof typeof modalComponents] || DiscoverS;
});

// 过渡动画已简化，不再需要复杂状态


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
  const credentialsResult = await storageServ.query('SELECT value FROM credentials WHERE key = ?', ['userCredentials']);
  if (!credentialsResult.values || !credentialsResult.values.length) {
    return;
  }
  const encryptedCredentials = credentialsResult.values[0].value as string;
  const pair: any = JSON.parse(encryptedCredentials);
  if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
    return;
  }
  return pair;
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

type GlobeProps = {
  class?: string;
  config?: Partial<COBEOptions>;
  mass?: number;
  tension?: number;
  friction?: number;
  precision?: number;
};

const DEFAULT_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1.2, 1.2, 1.2],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
};

const props = withDefaults(defineProps<GlobeProps>(), {
  mass: 1,
  tension: 280,
  friction: 100,
  precision: 0.001,
});

const globeCanvasRef = ref<HTMLCanvasElement>();
const phi = ref(0);
const width = ref(0);
const pointerInteracting = ref();
const pointerInteractionMovement = ref();

let globe: ReturnType<typeof createGlobe> | null = null;

const spring = useSpring(
  {
    r: 0,
  },
  {
    mass: props.mass,
    tension: props.tension,
    friction: props.friction,
    precision: props.precision,
  },
);

// Computed property for dynamic globe configuration
const globeConfig = computed<COBEOptions>(() => ({
  ...DEFAULT_CONFIG,
  ...props.config,
  dark: isDark.value ? 1 : 0, // Dynamically set dark based on isDark
}));

function updatePointerInteraction(clientX: number | null) {
  if (clientX !== null) {
    pointerInteracting.value = clientX - (pointerInteractionMovement.value ?? clientX);
  } else {
    pointerInteracting.value = null;
  }

  if (globeCanvasRef.value) {
    globeCanvasRef.value.style.cursor = clientX ? "grabbing" : "grab";
  }
}

function updateMovement(clientX: number) {
  if (pointerInteracting.value !== null) {
    const delta = clientX - (pointerInteracting.value ?? clientX);
    pointerInteractionMovement.value = delta;
    spring.r = delta / 200;
  }
}

function onRender(state: Record<string, unknown>) {
  if (!pointerInteracting.value) {
    phi.value += 0.005;
  }

  state.phi = phi.value + spring.r;
  state.width = width.value * 2;
  state.height = width.value * 2;
}

function onResize() {
  if (globeCanvasRef.value) {
    width.value = globeCanvasRef.value.offsetWidth;
  }
}

function createGlobeInstance() {
  if (globe) {
    globe.destroy(); // Destroy existing globe to prevent memory leaks
    globe = null;
  }
  if (globeCanvasRef.value) {
    globe = createGlobe(globeCanvasRef.value, {
      ...globeConfig.value,
      width: width.value * 2,
      height: width.value * 2,
      onRender,
    });
  }
}

onMounted(() => {
  window.addEventListener("resize", onResize);
  onResize();
  createGlobeInstance();
  setTimeout(() => (globeCanvasRef.value!.style.opacity = "1"));
});

// Watch for changes in globeConfig to re-create the globe
watch(globeConfig, () => {
  createGlobeInstance();
}, { deep: true });

onUnmounted(() => {
  if (globe) {
    globe.destroy();
    globe = null;
  }
  window.removeEventListener("resize", onResize);
});
</script>