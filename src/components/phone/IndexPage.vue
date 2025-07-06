<template>
  <ion-content :fullscreen="true" class="cosmic-content" v-if="isLargeScreen" :scroll-y="false">
    <!-- 大屏幕时的左侧导航栏 -->
    <div class="sidebar liquid-sidebar" v-if="isLargeScreen">
      <div class="nav-button" @click="handleSidebarNavigation('Chat')" :class="{ active: currentComponent === 'Chat' }">
        <ion-icon :icon="chatbubbleOutline" size="large" class="cosmic-icon" style=" color: var(--ion-text-color) !important;"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Chat' }"></div>
      </div>
      <div class="nav-button" @click="handleSidebarNavigation('Contacts')" :class="{ active: currentComponent === 'Contacts' }">
        <div v-if="hasNewRequests && !requestsViewed" class="redboom"></div>
        <ion-icon :icon="peopleOutline" style="font-size: 39px;color: var(--ion-text-color) !important;" class="cosmic-icon" ></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Contacts' }"></div>
      </div>
      <!-- <div class="nav-button" @click="switchTo('Discover')" :class="{ active: currentComponent === 'Discover' }">
        <ion-icon :icon="walletOutline" style="font-size: 39px;color: var(--ion-text-color) !important;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Discover' }"></div>
      </div> -->
      <div class="nav-button" @click="handleSidebarNavigation('Broswer')" :class="{ active: currentComponent === 'Broswer' }">
        <ion-icon :icon="sparklesOutline" style="font-size: 39px;color: var(--ion-text-color) !important;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Broswer' }"></div>
      </div>
      <div class="nav-button" @click="handleSidebarLinkClick" :class="{ active: currentComponent === 'Link' }">
        <ion-icon :icon="currentComponent === 'Link' ? addOutline : planetOutline" 
                 :style="{ fontSize: currentComponent === 'Link' ? '48px' : '39px' }" 
                 class="cosmic-icon link-icon" style="color: var(--ion-text-color) !important;"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Link' }"></div>
      </div>

      <div class="nav-button" @click="handleSidebarNavigation('Relay')" :class="{ active: currentComponent === 'Relay' }">
        <ion-icon :icon="rocketOutline" style="font-size: 39px;color: var(--ion-text-color) !important;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Relay' }"></div>
      </div>
      <div class="nav-button" @click="handleSidebarNavigation('Settings')" :class="{ active: currentComponent === 'Settings' }">
        <ion-icon :icon="settingsOutline" style="font-size: 39px;color: var(--ion-text-color) !important;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Settings' }"></div>
      </div>
      <div class="nav-button" @click="handleSidebarNavigation('Profile')" :class="{ active: currentComponent === 'Profile' }">
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
        <ion-split-pane when="xs" content-id="main" >
          <ion-menu content-id="main">
            <ion-content class="ion-padding" >
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
      <div v-if="currentComponent === 'Group'" class="page-component" :class="{ 'active': currentComponent === 'Group' }">
        <Group />
      </div>
      <div v-if="currentComponent === 'Contacts'" class="page-component" :class="{ 'active': currentComponent === 'Contacts' }">
        <ContactPad />
      </div>
      <!-- <div v-if="currentComponent === 'Discover'" class="page-component" :class="{ 'active': currentComponent === 'Discover' }">
        <AiChatSimple ref="aiChatRef"></AiChatSimple>
      </div> -->
      <div v-if="currentComponent === 'Link'" class="page-component" :class="{ 'active': currentComponent === 'Link' }">
        <Moment />
      </div>
      <div v-show="currentComponent === 'Broswer'" class="page-component" :class="{ 'active': currentComponent === 'Broswer' }">
        <!-- <Discover /> -->
         <!-- <AiChat/> -->
         <AiChatSimple ref="aiChatRef"></AiChatSimple>
      </div>
      <div v-show="currentComponent === 'Relay'" class="page-component" :class="{ 'active': currentComponent === 'Relay' }">
        <ion-header :translucent="true" collapse="fade">
          <ion-toolbar class="liquid-toolbar">
            <ion-title>Network Status</ion-title>
          </ion-toolbar>
        </ion-header>
        <RelayMode/>
      </div>
      <div v-show="currentComponent === 'Settings'" class="page-component" :class="{ 'active': currentComponent === 'Settings' }">
        <Settings/>
      </div>
      <div v-if="currentComponent === 'Profile'" class="page-component" :class="{ 'active': currentComponent === 'Profile' }">
        <MeS/>
      </div>
    </div>
  </ion-content>
  <ion-content :fullscreen="true" class="cosmic-content" v-if="!isLargeScreen" :scroll-y="false">
    <div class="components-container" :class="{ 'with-sidebar': isLargeScreen }">
      <div v-if="currentComponent === 'Chat'" class="page-component" :class="{ 'active': currentComponent === 'Chat' }">
        <Chat />
      </div>
      <div v-if="currentComponent === 'Contacts'" class="page-component" :class="{ 'active': currentComponent === 'Contacts' }">
        
        <Contacts />

      </div>
      <div v-if="currentComponent === 'Link'" class="page-component" :class="{ 'active': currentComponent === 'Link' }">
        <Moment ref="momentsRef" />
      </div>
      <div v-show="currentComponent === 'KeyPair'" class="page-component ai-chat-container" :class="{ 'active': currentComponent === 'KeyPair' }" 
           :style="{ 
             '--ai-chat-offset': Math.min(keyboardHeight * 0.3, 80) + 'px',
             transform: `translateY(-${Math.min(keyboardHeight * 0.2, 60)}px)`
           }">
        <AiChatSimple ref="aiChatRef" />
      </div>
      <div v-if="currentComponent === 'Profile'" class="page-component" :class="{ 'active': currentComponent === 'Profile' }">
        <MeS/>
      </div>
    </div>
  </ion-content>

  <!-- 小屏幕时的底部导航栏 -->
  
  <!-- 底部输入框和导航栏容器 -->
  <div v-if="!isLargeScreen" class="bottom-container" :class="{ 'keyboard-active': keyboardVisible }" :style="{ transform: `translateY(-${keyboardHeight}px)` }">
    <!-- 底部输入框 - 只在选中KeyPair时显示 -->
    <transition name="input-slide">
      <div v-if="currentComponent === 'KeyPair'" class="bottom-input-container">
        <input 
          type="text" 
          :placeholder="$t('Talk to AI...') || 'Talk to AI...'"
          class="bottom-input"
          :class="{ 'with-button': (bottomInputValue.trim() || isSending) }"
          v-model="bottomInputValue"
          @keydown.enter="sendToAI"
          @focus="onInputFocus"
          @blur="onInputBlur"
          ref="bottomInputRef"
          enterkeyhint="send"
          autocomplete="off"
        />
        
        <!-- 发送按钮容器 - 使用transition包装 -->
        <div class="button-container">
          <transition name="button-fade" mode="out-in">
            <button 
              v-if="isSending"
              key="stop"
              @click="stopAI" 
              class="stop-button action-button"
            >
              <ion-icon :icon="stopOutline"></ion-icon>
            </button>
            <button 
              v-else-if="bottomInputValue.trim()" 
              key="send"
              @click="sendToAI" 
              class="send-button action-button"
            >
              <ion-icon :icon="sendOutline"></ion-icon>
            </button>
          </transition>
        </div>
      </div>
    </transition>

    <MorphingTabs
      :tabs="tabs"
      :active-tab="activeTab"
      @update:active-tab="handleTabChange"
    >
      <template v-slot:Chat>
        <div class="nav-button" :class="{ active: currentComponent === 'Chat' }">
          <ion-icon :icon="chatbubbleOutline" size="large" class="cosmic-icon"></ion-icon>
        </div>
      </template>
      
      <template v-slot:Content>
        <div class="nav-button" :class="{ active: currentComponent === 'Contacts' }">
          <ion-icon :icon="peopleOutline"  class="cosmic-icon"></ion-icon>
          <div v-if="hasNewRequests && !requestsViewed" class="redboom"></div>
        </div>
      </template>
      
      <template v-slot:Moment>
        <div class="nav-button" :class="{ active: currentComponent === 'Link' }" @click="openPost">
          <ion-icon :icon="currentComponent === 'Link' ? addCircleOutline : planetOutline" 
                       :style="{ fontSize: currentComponent === 'Link' ? '50px' : '33px' }" 
                       class="cosmic-icon link-icon"></ion-icon>
        </div>
      </template>
    
      <template v-slot:Card>
        <div class="nav-button" :class="{ active: currentComponent === 'KeyPair' }">
          <ion-icon :icon="pulseOutline"  class="cosmic-icon"></ion-icon>

        </div>
      </template>
      
      <template v-slot:Me>
        <div class="nav-button" :class="{ active: currentComponent === 'Profile' }">
          <img
                v-if="userAvatars[currentUserPub!]"
                :src="userAvatars[currentUserPub!]"
                class="cosmic-icon"
                style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover"
              />
              <img
                v-else
                :src="avatarurl"
                class="cosmic-icon"
                style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover"
              />
        </div>
      </template>
    </MorphingTabs>
  </div>
  <!-- <Lens
        :hovering="hovering"
        @hover-update="setHovering"
      > -->
  <!-- <ion-footer collapse="fade" :class="glass ? 'liquid-toolbar1' : 'liquid-toolbar'"   v-if="!isLargeScreen">

    <ion-toolbar class="liquid-toolbar"  >
   
     
      <div style="display: flex; justify-content: space-around; align-items: center;padding-top: 10px;">
  
   
        <div class="nav-button" @click="openChat" :class="{ active: currentComponent === 'Chat' }">
          <ion-icon :icon="chatbubbleOutline" size="large" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Chat' }"></div>
        </div>
        <div class="nav-button" @click="openContacts" :class="{ active: currentComponent === 'Contacts' }">
          <ion-icon :icon="peopleOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
          <div v-if="hasNewRequests && !requestsViewed" class="redboom"></div>
          <div class="indicator" :class="{ active: currentComponent === 'Contacts' }"></div>
        </div>
        <div class="nav-button" @click="handleLinkClick" :class="{ active: currentComponent === 'Link' }">
          <ion-icon :icon="currentComponent === 'Link' ? addCircleOutline : planetOutline" 
                   :style="{ fontSize: currentComponent === 'Link' ? '50px' : '33px' }" 
                   class="cosmic-icon link-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Link' }"></div>
        </div>
        <div class="nav-button" @click="openKeyPair" :class="{ active: currentComponent === 'KeyPair' }">
          <ion-icon :icon="walletOutline" style="font-size: 33px;" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'KeyPair' }"></div>
        </div>
        <div class="nav-button" @click="openMe" :class="{ active: currentComponent === 'Profile' }">
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

  </ion-footer> -->
<!-- </Lens> -->
  <!-- Modal for Link -->
  <ion-modal v-if="tabnumber === '2'"  :is-open="isModalOpen" @didDismiss="closeModal" class="custom-modal">

      <ion-toolbar>
      
        <ion-buttons slot="start">
          <ion-button @click="closeModal">Close</ion-button>
        </ion-buttons>
     
        <ion-buttons slot="end">
          <ion-button 
              :disabled="!newMomentContent.trim() && selectedImages.length === 0 || isPosting" 
              strong
              @click="handlePost"
            >
              <ion-icon :icon="sendOutline"></ion-icon>
            </ion-button>
        </ion-buttons>
      </ion-toolbar>
 
    <ion-content class="ion-padding">
      <div class="input-container">
          <ion-textarea
            v-model="newMomentContent"
            auto-grow
            :placeholder="$t('sayPhaceholder')"
            class="moment-textarea"
            :rows="3"
           
            :disabled="isPosting"
          ></ion-textarea>
          <p class="char-count" :class="{ 'over-limit': newMomentContent.length > 10000 }">
            {{ newMomentContent.length }}/10000
          </p>
        </div>
        <carousel
          v-if="selectedImages.length > 0"
          :items-to-show="1"
          :wrap-around="true"
          :transition="500"
          class="image-carousel"
        >
          <slide v-for="(image, index) in selectedImages" :key="index">
            <div class="image-item">
              <img :src="image" alt="Selected Image" class="moment-image" />
              <ion-button fill="clear" color="danger" class="remove-btn" @click="removeImage(index)" :disabled="isPosting">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </div>
          </slide>
          <template #addons>
            <navigation v-if="selectedImages.length > 1" />
            <pagination />
          </template>
        </carousel>
        <ion-buttom color="dark"  class="image-select-btn" @click="selectImages" :disabled="isPosting">
          <ion-icon :icon="imageOutline" slot="start"></ion-icon>
        
        </ion-buttom>
        <input type="file" ref="fileInput" multiple accept="image/*" @change="handleImageSelect" style="display: none;" />
        <ion-loading
          :is-open="isPosting"
          :message="$t('postingMoment')"
          :duration="0"
        ></ion-loading>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, onBeforeUnmount, watch } from 'vue'
import Chat from './ChatS.vue'
import Contacts from './ContactsS.vue'
import AiChatSimple from './AiChatSimple.vue'
import Profile from './MeS.vue'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { 
  chatbubblesOutline, 
  chatbubbleOutline, 
  peopleOutline, 
  personOutline, 
  planetOutline, 
  settingsOutline, 
  rocketOutline, 
  browsersOutline, 
  atOutline, 
  sparklesOutline, 
  chatbubbleEllipsesOutline, 
  compassOutline, 
  walletOutline, 
  reorderFourOutline, 
  reorderThreeOutline, 
  appsOutline, 
  addOutline,
  addCircleOutline,
  stopOutline,
  pulseOutline,
  
} from 'ionicons/icons'
import {
  IonFooter,
  IonToolbar,
  IonContent,
  IonIcon,
  IonHeader, 
  IonMenu, 
  IonSplitPane, 
  IonTitle, 
  IonModal, 
  IonButtons, 
  IonButton, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonTextarea,
  IonBadge,
  toastController,
  IonSegment, IonSegmentButton, 
} from '@ionic/vue'
import { gunAvatar } from "gun-avatar";
import { useTheme } from '@/composables/useTheme';
import ChatSpad from '../ipad/ChatSpad.vue'
import RelayMode from '../GUNtest/RelayMode.vue'
const glass = ref(true)
const { isDark } = useTheme();
const chatFlowStore = getTalkFlowCore();


const {
  currentUserPub,
  currentUserAlias,
  currentUserAlias1,
  userAvatars,
  storageServ,
  gun,
  translateY,
  cardsTranslateY,
  panelVisible: _panelVisible,
  panelContent: _panelContent,
  isLargeScreen,
  currentComponent,
  switchTo,
  receivedRequests,
  requestsViewed,
  restoreNavigationState,
  saveNavigationState,
} = chatFlowStore;
const hasNewRequests = computed(() => receivedRequests.value.length > 0);

const avatarurl = computed(() => gunAvatar({ pub: currentUserPub.value, round: false, dark: isDark.value, svg: true }));

const isModalOpen = ref(false);
const linkTitle = ref('');
const linkDescription = ref('');
const bottomInputValue = ref('');
const keyboardVisible = ref(false);
const keyboardHeight = ref(0);
const bottomInputRef = ref<HTMLInputElement | null>(null);
const aiChatRef = ref<any>(null);
const isSending = ref(false);

// 存储监听器引用，避免全局清理
let keyboardShowListener: any = null;
let keyboardHideListener: any = null;

// 键盘监听器初始化和清理函数
const initKeyboardListeners = () => {
  try {
    // 先清理可能存在的旧监听器
    cleanupKeyboardListeners();
    
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
    keyboardShowListener = Keyboard.addListener('keyboardWillShow', (info: { keyboardHeight: any }) => {
      console.log('⌨️ IndexPage Keyboard shown, height:', info.keyboardHeight);
      keyboardHeight.value = info.keyboardHeight;
      keyboardVisible.value = true;
      
      // 延迟滚动，确保布局调整完成
      setTimeout(() => {
        if (bottomInputRef.value) {
          bottomInputRef.value.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          console.log('📱 IndexPage scrolled input to center');
        }
        
        // 如果在AI聊天页面，也让聊天内容滚动到底部
        if (currentComponent.value === 'KeyPair' && aiChatRef.value) {
          // 立即触发，与输入框动画同步
          const scrollEvent = new CustomEvent('keyboard-adjusted');
          document.dispatchEvent(scrollEvent);
          console.log('📱 Triggered AI chat scroll simultaneously with input');
        }
      }, 200);
    });

    keyboardHideListener = Keyboard.addListener('keyboardWillHide', () => {
      console.log('⌨️ IndexPage Keyboard hidden');
      keyboardHeight.value = 0;
      keyboardVisible.value = false;
    });
    console.log('🔄 IndexPage keyboard listeners re-initialized');
  } catch (error) {
    console.warn('⚠️ IndexPage failed to register keyboard listeners:', error);
  }
};

const cleanupKeyboardListeners = () => {
  try {
    if (keyboardShowListener) {
      keyboardShowListener.remove();
      keyboardShowListener = null;
    }
    if (keyboardHideListener) {
      keyboardHideListener.remove();
      keyboardHideListener = null;
    }
    console.log('🧹 IndexPage keyboard listeners cleaned up');
  } catch (error) {
    console.warn('⚠️ IndexPage failed to remove keyboard listeners:', error);
  }
};

const tabnumber = ref('0');
const tabs = ["Chat", "Content", "Moment", "Card","Me"];
const activeTab = ref(tabs[0]);

function handleLinkClick () {
  if (currentComponent.value === 'Link') {
    // 如果当前已经在Link页面，则打开模态窗口
    isModalOpen.value = true;
  } else {
    // 如果不在Link页面，则切换到Link页面
    switchTo('Link');
  }
}
function openPost() {
  if (currentComponent.value === 'Link') {
    isModalOpen.value = true;
  }
  // 否则什么都不做
}
function openMe() {
  switchTo('Profile');
  tabnumber.value = '4'
}

function openKeyPair() {
  switchTo('KeyPair');
  tabnumber.value = '3'
}
function openChat() {
  switchTo('Chat');
  tabnumber.value = '0'
}
function openContacts() {
  switchTo('Contacts');
  tabnumber.value = '1'
}

// 处理标签变化，包括键盘状态重置
function handleTabChange(newTab: string) {
  // 🔧 如果从AI聊天标签切换到其他标签，立即重置键盘状态
  if (activeTab.value === 'Card' && newTab !== 'Card') {
    console.log('🔧 Tab change: leaving AI chat, resetting keyboard state immediately...');
    keyboardHeight.value = 0;
    keyboardVisible.value = false;
    
    // 如果输入框有焦点，主动失焦
    if (bottomInputRef.value) {
      bottomInputRef.value.blur();
    }
  }
  
  // 设置新的标签
  activeTab.value = newTab;
}

// 处理大屏模式侧边栏导航，包括键盘状态重置
function handleSidebarNavigation(componentName: string) {
  // 🔧 如果从AI聊天页面切换到其他页面，重置键盘状态
  if ((currentComponent.value === 'Broswer' || currentComponent.value === 'KeyPair') && 
      componentName !== 'Broswer' && componentName !== 'KeyPair') {
    console.log('🔧 Sidebar navigation: leaving AI chat, resetting keyboard state...');
    keyboardHeight.value = 0;
    keyboardVisible.value = false;
  }
  
  // 调用原始的切换函数
  switchTo(componentName);
}

// 处理大屏模式的Link按钮点击
function handleSidebarLinkClick() {
  // 🔧 如果从AI聊天页面切换，重置键盘状态
  if (currentComponent.value === 'Broswer' || currentComponent.value === 'KeyPair') {
    console.log('🔧 Sidebar link click: leaving AI chat, resetting keyboard state...');
    keyboardHeight.value = 0;
    keyboardVisible.value = false;
  }
  
  // 调用原始的Link处理函数
  handleLinkClick();
}


watch(activeTab, async (newTab, oldTab) => {
  // 🔧 如果从AI聊天标签切换到其他标签，重置键盘状态
  if (oldTab === 'Card' && newTab !== 'Card') {
    console.log('🔧 Switching away from AI chat tab, resetting keyboard state...');
    keyboardHeight.value = 0;
    keyboardVisible.value = false;
    
    // 如果输入框有焦点，主动失焦
    if (bottomInputRef.value) {
      bottomInputRef.value.blur();
    }
  }

  const tabIndex = tabs.indexOf(newTab);
  switch (tabIndex) {
    case 0:
      openChat();
      break;
    case 1:
      openContacts();
      break;
    case 2:
      switchTo('Link');
      tabnumber.value = '2';
      break;
    case 3:
      openKeyPair();
      break;
    case 4:
      openMe();
      break;
    default:
      break;
  }
  
  // 手动保存导航状态（针对 activeTab 变化）
  if (currentUserPub.value) {
    try {
      await saveNavigationState();
    } catch (error) {
      console.warn('保存导航状态失败:', error);
    }
  }
});

// 监听currentComponent变化，确保activeTab同步并管理键盘监听器
watch(currentComponent, (newComponent, oldComponent) => {
  // 🔧 离开AI对话页面时，主动重置键盘状态
  if ((oldComponent === 'KeyPair' || oldComponent === 'Broswer') && 
      (newComponent !== 'KeyPair' && newComponent !== 'Broswer')) {
    console.log('🔧 Leaving AI chat page, resetting keyboard state...');
    // 主动重置键盘状态，确保底部栏恢复原位
    keyboardHeight.value = 0;
    keyboardVisible.value = false;
    
    // 如果输入框有焦点，主动失焦触发键盘收起
    if (bottomInputRef.value) {
      bottomInputRef.value.blur();
    }
  }

  switch (newComponent) {
    case 'Chat':
      activeTab.value = tabs[0];
      break;
    case 'Contacts':
      activeTab.value = tabs[1];
      break;
    case 'Link':
      activeTab.value = tabs[2];
      break;
    case 'KeyPair':
      activeTab.value = tabs[3];
      // 🔄 每次进入AI对话页面时重新初始化键盘监听器（小屏模式）
      console.log('🎯 Entering AI chat page (small screen), reinitializing keyboard listeners...');
      nextTick(() => {
        initKeyboardListeners();
      });
      break;
    case 'Broswer':
      // 🔄 每次进入AI对话页面时重新初始化键盘监听器（大屏模式）
      console.log('🎯 Entering AI chat page (large screen), reinitializing keyboard listeners...');
      nextTick(() => {
        if (aiChatRef.value && aiChatRef.value.reinitKeyboardListeners) {
          aiChatRef.value.reinitKeyboardListeners();
        }
      });
      break;
    case 'Profile':
      activeTab.value = tabs[4];
      break;
    default:
      break;
  }
  
  // 🧹 离开AI对话页面时清理键盘监听器，避免冲突
  if ((oldComponent === 'KeyPair' || oldComponent === 'Broswer') && 
      (newComponent !== 'KeyPair' && newComponent !== 'Broswer')) {
    console.log('🚪 Leaving AI chat page, cleaning up keyboard listeners...');
    if (oldComponent === 'KeyPair') {
      cleanupKeyboardListeners(); // 小屏模式清理
    }
    // 大屏模式的清理由AiChatSimple组件自己处理
  }
});

const closeModal = () => {
  isModalOpen.value = false;
  linkTitle.value = '';
  linkDescription.value = '';
  // 不重置activeTab，让用户保持在Link页面
  // activeTab.value = tabs[0];
};



const midPoint = 0;
const positionState = ref('middle');
const encryptedPair = ref('');

onMounted(async () => {
  positionState.value = 'middle';
  translateY.value = midPoint;
  cardsTranslateY.value = 0;
  
  // 🎯 只在AI对话页面时初始化键盘监听器
  if (currentComponent.value === 'KeyPair') {
    console.log('🎯 Initial load on AI chat page (small screen), initializing keyboard listeners...');
    nextTick(() => {
      initKeyboardListeners();
    });
  } else if (currentComponent.value === 'Broswer') {
    console.log('🎯 Initial load on AI chat page (large screen), will initialize when component mounts...');
    // 大屏模式的键盘监听器由AiChatSimple组件自己初始化
  }
  
  // 恢复导航状态
  if (currentUserPub.value) {
    try {
      const savedState = await restoreNavigationState();
      if (savedState) {
        // 根据保存的状态更新 activeTab
        activeTab.value = tabs[parseInt(savedState.activeTab)];
        console.log('恢复导航状态:', savedState);
      }
    } catch (error) {
      console.warn('恢复导航状态失败:', error);
    }
    
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

onBeforeUnmount(() => {
  // 清理键盘监听器
  cleanupKeyboardListeners();
  console.log('🔧 IndexPage: Component unmounting, all listeners cleaned up');
});


import Moment from './Moment.vue'; // 假设你的组件文件

const momentsRef = ref<InstanceType<typeof Moment> | null>(null);

const triggerRefresh = () => {
  if (momentsRef.value) {
    // 模拟 ionRefresh 事件
    const mockEvent = { detail: { complete: () => {} } } as CustomEvent;
    momentsRef.value.refreshMoments(mockEvent);
  }
};



  import { closeOutline, sendOutline, imageOutline } from 'ionicons/icons'; 
  import { useMoments } from '@/composables/useMoments';
  import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
  import 'vue3-carousel/dist/carousel.css';
import { useI18n } from 'vue-i18n';
import AiChat from '@/pages/AiChat.vue'
  
  const router = useRouter();
  const { t } = useI18n();
  const momentsCore = useMoments();
  const { newMomentContent, postMoment, } = momentsCore;
  
  const selectedImages = ref<string[]>([]);
  const fileInput = ref<HTMLInputElement | null>(null);
  const isPosting = ref(false);
  
  // 选择图片
  const selectImages = () => {
    fileInput.value?.click();
  };
  
  // 压缩图片函数
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const reader = new FileReader();
  
      reader.onload = (e) => {
        img.src = e.target!.result as string;
        img.onload = () => {
          const scale = maxWidth / img.width;
          const width = img.width > maxWidth ? maxWidth : img.width;
          const height = img.width > maxWidth ? img.height * scale : img.height;
  
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
  
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error(t('failedLoadImage')));
      };
      reader.onerror = () => reject(new Error(t('failedReadFile')));
      reader.readAsDataURL(file);
    });
  };
  
  // 处理图片选择并压缩
  const handleImageSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      for (const file of files) {
        try {
          const compressedBase64 = await compressImage(file, 800, 0.7);
          selectedImages.value.push(compressedBase64);
        } catch (error) {
          console.error('图片压缩失败:', error);
         // showToast('Failed to compress image', 'danger');
        }
      }
      input.value = '';
    }
  };
  
  // 移除图片
  const removeImage = (index: number) => {
    selectedImages.value.splice(index, 1);
  };
  
  // 添加超时 Promise 包装
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    );
    return Promise.race([promise, timeout]) as Promise<T>;
  };
  const {
  moments, loadMoments, isLiked, getLikeCount, getBuddyAlias, formatTimestamp, addLike,
  removeLike, momentComments, hasMore, loading, lastTimestamp,getComments,showMomentDetails
} = momentsCore;
  



  const handlePost = async () => {
    triggerRefresh();
    let content = newMomentContent.value.trim();
    if (selectedImages.value.length > 0) {
      const imageContent = selectedImages.value.map(img => `[IMAGE]\n${img}`).join('\n');
      content = content ? `${content}\n${imageContent}` : imageContent;
    }
    newMomentContent.value = content;
    
    try {
      postMoment();
      
      // 显示发送成功Toast
      const toast = await toastController.create({
        message: t('sent'),
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
      
      closeModal();
      moments.value = [];
      lastTimestamp.value = undefined;
      hasMore.value = true;
      selectedImages.value = [];
      newMomentContent.value = '';
      
    } catch (error : any) {
      console.error('发布动态失败:', error);
      
      // 显示发送失败Toast
      const toast = await toastController.create({
        message: t('sendFailed'),
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    } finally {
      isPosting.value = false;
    }
  };

  // AI聊天相关功能
  const onInputFocus = () => {
    console.log('🎯 IndexPage Input focused');
    // 键盘监听器会自动处理滚动和布局调整
  };

  const onInputBlur = () => {
    console.log('🎯 IndexPage Input blurred');
    // 键盘监听器会自动处理键盘隐藏
  };

  const sendToAI = async () => {
    if (!bottomInputValue.value.trim()) return;
    
    const message = bottomInputValue.value.trim();
    bottomInputValue.value = '';
    isSending.value = true;
    
    // 调用AI聊天组件的方法，使用回调机制
    if (aiChatRef.value && aiChatRef.value.handleNewMessage) {
      aiChatRef.value.handleNewMessage(message, () => {
        // AI回复完成的回调
        isSending.value = false;
        console.log('✅ AI conversation completed, button state reset');
        
        // 🔄 AI回复完成后重新聚焦输入框，支持连续对话
        nextTick(() => {
          if (bottomInputRef.value) {
            bottomInputRef.value.focus();
            console.log('🎯 Input refocused for continuous conversation');
          }
        });
      });
    }
    
    // 🔄 发送消息后保持键盘打开，支持连续对话
    // 不调用 blur()，保持输入框聚焦状态
    console.log('📝 Message sent, keeping keyboard open for continuous chat');
  };

  const stopAI = () => {
    // 调用AI聊天组件的停止方法
    if (aiChatRef.value && aiChatRef.value.stopGeneration) {
      aiChatRef.value.stopGeneration();
    }
    isSending.value = false;
  };

  
</script>

<style scoped>
.redboom{
  color: red;
  background-color: red;
  border-radius: 50%;
padding: 3px;
position: absolute;
top: 0;
right: 0;
}
.menulist1 {
  position: absolute;
  gap: 20px;
  display: flex;
  justify-content: start;
  align-items: start;
  top: 10%;
  left: 10px;
  flex-direction: column;
}
.menulist {
  position: absolute;
  gap: 20px;
  display: flex;
  justify-content: end;
  align-items: end;
  flex-direction: column;
  top: 10%;
  right: 10px;
}
.cosmic-content {
  --background: transparent;
  position: relative;
  overflow: visible;
}
.liquid-toolbar {
  /* background: var(--background-color-no); */
  /* backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); */
  overflow: visible;
  position: relative;
  --background: transparent;
  background: transparent;
}
.liquid-toolbar1 {
  background: var(--background-color-no);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: visible;
  position: relative;
  --background: transparent;

}
ion-toolbar {
  overflow: visible;

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
 
  /* filter: blur(1px); */
}
.cosmic-icon {
  font-size: 36px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}
.cosmic-icon {
  color:var(--ion-text-color);
}
.nav-button.active .cosmic-icon {
  color: rgb(143, 143, 143);
  transform: scale(1.01);
  /* filter: blur(1px); */
}
.nav-button.active .link-icon {
  color: rgb(128, 128, 128);
  transform: scale(1.05) rotate(90deg);
  /* filter: blur(0px); */
  
}
.nav-button:active .cosmic-icon {
  transform: scale(1.15);
  color: rgb(130, 130, 130)
}
.nav-button.active::after {
  content: '';
  position: absolute;
  width: 50px;
  height: 50px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.511) 0%, rgba(42, 240, 224, 0) 70%);
  border-radius: 50%;
  z-index: 1;
  animation: pulse 2s infinite ease-in-out;
}
.indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  margin-top: 3px;
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
  pointer-events: none;
  overflow-y: hidden;
}
.page-component.active {
  opacity: 1;
  pointer-events: auto;
}

/* AI聊天容器键盘适配样式 */
.ai-chat-container {
  transition: transform 0.3s ease;
}

.ai-chat-container.active {
  opacity: 1;
  pointer-events: auto;
}
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
.blur-background {
  width: 100vw;
  height: 100vh;
  backdrop-filter: blur(20px);
  z-index: -1;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  filter: blur(20px);
  opacity: 0.3;
  z-index: 3;
  pointer-events: none;
}
.avatar-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  filter: blur(20px);
  transform: scale(1);
  opacity: 0.6;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: screen;
}
.avatar {
  position: relative;
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 50%;
  z-index: 9999;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  opacity: 0.6;
}
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
.custom-modal {

  --backdrop-opacity: 0.5;
  --border-radius: 12px;
  --max-width: 96%;
  --max-height: 70%;

}






/* 
 */


 ion-content {
    --padding-start: 0;
    --padding-end: 0;
    --padding-top: 0;
    --padding-bottom: 0;
  }
  
  ion-toolbar {
    --border-width: 0;
    --padding-top: 8px;
    --padding-bottom: 8px;
  }
  
  ion-title {
    font-size: 1.2em;
    font-weight: 700;
  }
  
  .input-container {
    position: relative;
    margin-bottom: 16px;
    padding: 0 16px;
    overflow-y: auto;
    max-height:300px
  }
  
  .moment-textarea {
    --padding-start: 12px;
    --padding-end: 12px;
    --padding-top: 12px;
    --padding-bottom: 12px;
    font-size: 16px;
    /* overflow-y: auto; */
  }
  
  .char-count {
    text-align: right;
    font-size: 12px;
    color: #8795a1;
    margin: 4px 0 0;
  }
  
  .over-limit {
    color: #ff6b6b;
  }
  
  .image-carousel {
    width: 100%;
    height: 390px;
    overflow: hidden;
  }
  
  .carousel__slide {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .image-item {
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .moment-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  
  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    --padding-start: 4px;
    --padding-end: 4px;
    --background: rgba(0, 0, 0, 0.5);
    --border-radius: 50%;
  }
  
  :deep(.carousel__viewport) {
    width: 100%;
    height: 100%;
  }
  
  :deep(.carousel__track) {
    display: flex;
    flex-direction: row;
  }
  
  :deep(.carousel__pagination) {
    padding: 10px 0;
  }
  
  :deep(.carousel__pagination-button) {
    width: 8px;
    height: 8px;
    background: #fff;
    opacity: 0.8;
    border-radius: 50%;
    margin: 0 4px;
  }
  
  :deep(.carousel__pagination-button--active) {
    background: #00ffbb;
    opacity: 1;
  }
  
  :deep(.carousel__prev),
  :deep(.carousel__next) {
    color: #fff;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    top: 50%;
    transform: translateY(-50%);
  }
  
  :deep(.carousel__prev) {
    left: 10px;
  }
  
  :deep(.carousel__next) {
    right: 10px;
  }
  
  .image-select-btn {
    --border-radius: 12px;
    margin: 16px;
    font-size: 30px;
  }
  
  ion-button {
    --padding-start: 8px;
    --padding-end: 8px;
  }

  /* 底部容器样式 */
  .bottom-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 999;
    filter: url("#exclusionTabsGoo");
    /* 与对话内容动画同步 */
    transition: transform 0.3s ease;
  }

  .bottom-container.keyboard-active {
    /* transform移到内联样式中处理，这里只保留其他样式调整 */
  }

  .bottom-input-container {
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    position: relative;
    background-color: var(--tabs-background-color);
    border-radius: 50px;
    padding: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    /* 与对话内容动画同步，使用相同的过渡时间 */
    transition: all 0.3s ease;
    overflow: visible;
    width: 308px;
    max-width: 90vw;
  }

  /* 当有按钮时容器的宽度调整 */
  .bottom-input-container:has(.action-button) {
    width: 349px;
  }

  .bottom-input {
    padding: 12px 20px;
    border-radius: 50px;
    background-color: transparent;
    border: none;
    outline: none;
    color: var(--ion-text-color);
    font-size: 16px;
    width: 300px;
    text-align: left;
    transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
                padding-right 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .bottom-input.with-button {
    width: 297px;
    padding-right: 12px;
  }

  .button-container {
    width: 44px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    flex-grow: 0;
    overflow: visible;
    position: relative;
    margin-left: 1px;
  }

  .bottom-input::placeholder {
    color: var(--ion-text-color);
    opacity: 0.7;
  }

    .action-button {
    border: none;
    border-radius: 50% !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    max-width: 40px !important;
    max-height: 40px !important;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    flex-grow: 0;
    box-sizing: border-box;
  }

  .action-button:hover {
    transform: scale(1.05);
  }

  .action-button:active {
    transform: scale(0.95);
  }

  .send-button {
    background: var(--ion-color-primary);
    padding:10px;
  }

  .stop-button {
    background: var(--ion-color-danger);
    padding:10px
  }

  /* 输入框动画 */
  .input-slide-enter-active,
  .input-slide-leave-active {
    transition: all 0.3s ease;
  }

  .input-slide-enter-from {
    opacity: 0;
    transform: translateY(100px) scale(0.9);
  }

  .input-slide-leave-to {
    opacity: 0;
    transform: translateY(100px) scale(0.9);
  }

  .input-slide-enter-to,
  .input-slide-leave-from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  /* 按钮过渡动画 */
  .button-fade-enter-active {
    transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.175);
  }

  .button-fade-leave-active {
    transition: all 0.2s cubic-bezier(0.55, 0.055, 0.675, 0.19);
  }

  .button-fade-enter-from {
    opacity: 0;
    transform: translateX(20px) scale(0.7);
  }

  .button-fade-leave-to {
    opacity: 0;
    transform: translateX(-15px) scale(0.7);
  }

  .button-fade-enter-to,
  .button-fade-leave-from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }

  /* 按钮的圆形保持 */
  .action-button {
    transform-origin: center center;
    border-radius: 50% !important;
  }

  /* 确保按钮图标居中 */
  .action-button ion-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  /* 移除MorphingTabs自带的滤镜，使用父容器的滤镜 */
  .bottom-container :deep(.relative) {
    filter: none !important;
  }
</style>