<template>
  <ion-page ref="page">
  <ion-content  :fullscreen="true"  :scroll-y="false">
    <div class="components-container ">
      <div v-show="currentComponent === 'Chat'" class="page-component" :class="{ 'active': currentComponent === 'Chat' }">
        <Chat />
      </div>
      <div v-if="currentComponent === 'Contacts'" class="page-component" :class="{ 'active': currentComponent === 'Contacts' }">
        
        <Contacts />

      </div>

       <div v-if="currentComponent === 'Call'" class="page-component" :class="{ 'active': currentComponent === 'Call' }">
        
   <Moment/>

      </div> 

<!-- style="height: 100% !important;" -->
      <div  style="height: 100% !important;" v-show="currentComponent === 'Link'" class="page-component " :class="{ 'active': currentComponent === 'Link' }">
      
         <!-- <MaxFlow ref="maxFlowRef"/> -->
<ion-page>
  <ion-content :fullscreen="true"  :scroll-y="false">
         <WebLLM/>
         </ion-content>
</ion-page>
      </div>


      <div v-show="currentComponent === 'Profile'" class="page-component" :class="{ 'active': currentComponent === 'Profile' }">
        <MeS/>
      </div>
    </div>
  </ion-content>









  <ion-footer  class="footer-index"  :translucent="true" >
    <ion-toolbar class="footer-index" :style="{ marginBottom: `-${keyboardHeight}px` }">


      <ion-tab-bar  style="--background: transparent;background: transparent;" :style="{ transform: `translateY(-${keyboardHeight}px)` }">
        <ion-tab-button 
          class="custom-tab-button"
          :class="{ 'tab-selected': currentComponent === 'Chat' }"
          @click="handleTabClick('Chat')"
        >
          <ion-icon :icon="currentComponent === 'Chat' ? chatbubbles : chatbubblesOutline"></ion-icon>
          <!-- <ion-label style="font-size: 12px;">Chat</ion-label> -->
          <ion-badge v-if="hasUnreadMessages" class="request-badge">●</ion-badge>
        </ion-tab-button>

        <ion-tab-button 
          class="custom-tab-button"
          :class="{ 'tab-selected': currentComponent === 'Contacts' }"
          @click="handleTabClick('Contacts')"
        >
          <ion-icon :icon="currentComponent === 'Contacts' ? people : peopleOutline"></ion-icon>
          <!-- <ion-label style="font-size: 12px;">{{ $t('Contact') || 'Contact' }}</ion-label> -->
          <ion-badge v-if="hasNewRequests && !requestsViewed" class="request-badge">●</ion-badge>
        </ion-tab-button>

        <ion-tab-button 
          class="custom-tab-button"
          :class="{ 'tab-selected': currentComponent === 'Call' }"
          @click="handleTabClick('Call')"
        >
          <ion-icon :icon="currentComponent === 'Call' ? planet : planetOutline"></ion-icon>
          <!-- <ion-label style="font-size: 12px;">Call</ion-label>
         -->
        </ion-tab-button>

        <ion-tab-button 
          class="custom-tab-button"
          :class="{ 'tab-selected': currentComponent === 'Link' }"
          @click="handleTabClick('Link')"
        >
          <!-- <div class="tab-icon-container">
            <transition name="icon-fade" mode="out-in">
              <ion-icon 
                :key="maxFlowTabIcon.active" 
                :icon="currentComponent === 'Link' ? maxFlowTabIcon.active : maxFlowTabIcon.inactive"
              ></ion-icon>
            </transition>
          </div> -->
          <!-- <transition name="label-fade" mode="out-in">
            <ion-label 
              :key="maxFlowTabLabel" 
              style="font-size: 12px;"
            >{{ maxFlowTabLabel }}</ion-label>
          </transition> -->
          <ion-icon :icon="currentComponent === 'Link' ? pulse : pulseOutline"></ion-icon>
        </ion-tab-button>

 

     

        <ion-tab-button 
          class="custom-tab-button"
          :class="{ 'tab-selected': currentComponent === 'Profile' }"
          @click="handleTabClick('Profile')"
        >
          <div class="avatar-tab">
            <img
              v-if="userAvatars[currentUserPub!]"
              :src="userAvatars[currentUserPub!]"
              class="tab-avatar"
            />
            <img
              v-else
              :src="avatarurl"
              class="tab-avatar"
            />
          </div>

          <!-- <ion-label style="font-size: 12px;">{{ currentUserAlias || 'Profile' }}</ion-label> -->
        </ion-tab-button>
      </ion-tab-bar>
    </ion-toolbar>
  </ion-footer>

</ion-page>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import Chat from './ChatS.vue'
import Contacts from './ContactsS.vue'

import { useKeyboardState } from '@/composables/useKeyboardState'
import { 
  chatbubblesOutline, 
  chatbubbleOutline, 
  chatbubbles,
  chatbubble,
  peopleOutline, 
  people,
  personOutline, 
  planetOutline, 
  planet,
  settingsOutline, 
  settings,
  rocketOutline, 
  rocket,
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
  pulse,
  sendOutline,
  appsSharp,
  cubeOutline,
  cubeSharp,
  timeOutline,
  time,
  gameControllerOutline,
  gameController,
  constructOutline,
  construct,
  apps,
  call,
  callOutline,
  settingsSharp,
  sparkles,
  pulseSharp,

  
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
  IonPage,
  IonBadge,
  toastController,
  IonSegment, 
  IonSegmentButton,
  IonTabBar,
  IonTabButton,
  IonFab,
  IonFabButton,
} from '@ionic/vue'
import { gunAvatar } from "gun-avatar";
import { useTheme } from '@/composables/useTheme';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useGroupChat } from '@/composables/useGroupChat';

import MeS from './MeS.vue'

import Moment from './Moment.vue'
import { useI18n } from 'vue-i18n';

import MaxFlow from './MaxFlow.vue'
import WebLLM from './WebLLM.vue'


const { isDark } = useTheme();
const chatFlowStore = getTalkFlowCore();
const { groupSessions, currentGroup, currentGroupName, setCurrentGroup } = useGroupChat();
const { t } = useI18n();

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
  currentComponent,
  switchTo,
  receivedRequests,
  requestsViewed,
  restoreNavigationState,
  saveNavigationState,
  currentChatPub,
  chatMessages,
  closeChat,
  visibleChatPreviewList,
  buddyList
} = chatFlowStore;
const hasNewRequests = computed(() => {
  // 过滤掉已经在通讯录中存在的好友的申请
  const validRequests = receivedRequests.value.filter(request => {
    // 检查申请者是否已经在好友列表中
    return !buddyList.value.some(buddy => buddy.pub === request.from);
  });
  return validRequests.length > 0;
});
// 检查是否有未读消息（私聊 + 群聊）
const hasUnreadMessages = computed(() => {
  // 检查私聊未读消息
  const hasPrivateUnread = visibleChatPreviewList.value.some(chat => chat.hasNew);
  // 检查群聊未读消息
  const hasGroupUnread = groupSessions.value.some(session => !session.isRead);
  return hasPrivateUnread || hasGroupUnread;
});

const avatarurl = computed(() => gunAvatar({ pub: currentUserPub.value, round: false, dark: isDark.value, svg: true }as any));

// MaxFlow组件引用
const maxFlowRef = ref<InstanceType<typeof MaxFlow> | null>(null);

// 独立的localStorage状态管理，用于存储最后选择的segment
const MAXFLOW_STORAGE_KEY = 'maxflow_selected_segment';

// 从localStorage加载最后选择的segment
const loadLastSelectedSegment = (): string => {
  try {
    const saved = localStorage.getItem(MAXFLOW_STORAGE_KEY);
    return saved || 'moment';
  } catch (error) {
   // console.warn('Failed to load selected segment from localStorage:', error);
    return 'moment';
  }
};

// 创建响应式的lastSelectedSegment状态
const lastSelectedSegment = ref(loadLastSelectedSegment());

// 监听maxFlowRef的变化，同步更新lastSelectedSegment
watch(() => maxFlowRef.value?.selectedSegment, (newSegment) => {
  if (newSegment && newSegment !== lastSelectedSegment.value) {
    lastSelectedSegment.value = newSegment;
    try {
      localStorage.setItem(MAXFLOW_STORAGE_KEY, newSegment);
    } catch (error) {
   //   console.warn('Failed to save selected segment to localStorage:', error);
    }
    
    // 🎯 当切换到需要键盘交互的段落时，确保键盘监听器激活（小屏模式）
    if (newSegment === 'aichat' || newSegment === 'moment') {
      
      nextTick(() => {
       // initKeyboardListeners();
      });
    }
  }
}, { immediate: true });

// 根据lastSelectedSegment动态显示图标和文字
const maxFlowTabIcon = computed(() => {
  const segment = lastSelectedSegment.value;
  
  switch (segment) {
    case 'moment':
      return { active: planet, inactive: planetOutline };
    case 'aichat':
      return { active: pulse, inactive: pulseOutline };
    case 'relay':
      return { active: rocket, inactive: rocketOutline };
    case 'tool':
      return { active: apps, inactive: appsOutline };
    case 'setting':
      return { active: settings, inactive: settingsOutline };
    case 'game':
      return { active: gameController, inactive: gameControllerOutline };
    default:
      return { active: planet, inactive: planetOutline }; 
  }
});

const maxFlowTabLabel = computed(() => {
  const segment = lastSelectedSegment.value;
  
  switch (segment) {
    case 'moment':
      return 'Moment';
    case 'aichat':
      return 'AI Chat';
    case 'relay':
      return  'Relay';
    case 'tool':
      return  'TApp';
    case 'setting':
      return 'Setting';
    case 'game':
      return  'Game';
    default:
      return  'Moment'; 
  }
});



const { keyboardHeight, initKeyboard, cleanupKeyboard } = useKeyboardState();
const bottomInputRef = ref<HTMLInputElement | null>(null);
const aiChatRef = ref<any>(null);
const localIsSending = ref(false);

// 计算属性：获取当前活跃的AI聊天组件的发送状态
const isSending = computed(() => {
  if (currentComponent.value === 'KeyPair' && aiChatRef.value) {
    return aiChatRef.value.isSending || localIsSending.value;
  } else if (currentComponent.value === 'Link' && maxFlowRef.value?.selectedSegment === 'aichat') {
    return maxFlowRef.value.isSending || localIsSending.value;
  }
  return localIsSending.value;
});

// 统一键盘监听改为使用共享状态

const tabnumber = ref('0');
const tabs = ["Chat", "Content", "Moment", "Card","Me","OS"];
const activeTab = ref(tabs[0]);

function handleLinkClick () {
  switchTo('Link');
}
function openPost() {
  switchTo('Link');
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





watch(activeTab, async (newTab, oldTab) => {
  // 🔧 如果从AI聊天标签切换到其他标签，重置键盘状态
  if (oldTab === 'Card' && newTab !== 'Card') {
    
    keyboardHeight.value = 0;
    
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
      
    }
  }
});

// 监听currentComponent变化，确保activeTab同步并管理键盘监听器
watch(currentComponent, (newComponent, oldComponent) => {
  // 🔧 离开AI对话页面时，主动重置键盘状态
  if ((oldComponent === 'KeyPair' || oldComponent === 'Broswer') && 
      (newComponent !== 'KeyPair' && newComponent !== 'Broswer')) {
    
    // 主动重置键盘状态，确保底部栏恢复原位
    keyboardHeight.value = 0;
    
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
      // 🎯 每次进入AI对话页面时初始化共享键盘监听（小屏模式）
      nextTick(async () => {
        await initKeyboard();
      });
      break;
    case 'Broswer':
      // 🔄 每次进入AI对话页面时重新初始化键盘监听器（大屏模式）
      
      nextTick(() => {
        if (aiChatRef.value && aiChatRef.value.reinitKeyboardListeners) {
          aiChatRef.value.reinitKeyboardListeners();
        }
      });
      break;
    case 'Profile':
      activeTab.value = tabs[4];
      break;
    case 'OS':
      switchTo('OS');
      tabnumber.value = '5';
      break;
    default:
      break;
  }
  
  // 🧹 离开AI对话页面时清理键盘监听器，避免冲突
  // if ((oldComponent === 'KeyPair' || oldComponent === 'Broswer') && 
  //     (newComponent !== 'KeyPair' && newComponent !== 'Broswer')) {
    
  //   if (oldComponent === 'KeyPair') {
  //     cleanupKeyboard(); 
  //   }

  // }
});

const router = useRouter();

// useGroupChat已在上方导入和使用

  // 监听路由变化，当返回到index页面时清除当前群聊状态

  watch(
    () => router.currentRoute.value.path,
    (newRoutePath) => {
      if (newRoutePath === '/index' || newRoutePath === '/index/' || newRoutePath === 'index'|| newRoutePath === '/') {
        // 清除当前群聊状态，确保未读状态可以正常工作
        if (window.innerWidth > 768) {
           return
        }else{
            currentGroup.value = null;
          currentGroupName.value = '';
          setCurrentGroup(null);
        
          closeChat();
       
        }
      }
    },
    { immediate: false, deep: true }
  );


const midPoint = 0;
const positionState = ref('middle');
const encryptedPair = ref('');

onMounted(async () => {
  positionState.value = 'middle';
  translateY.value = midPoint;
  cardsTranslateY.value = 0;
   
  // 🎯 初始化键盘监听器（当可能需要底部输入框时）
  // nextTick(() => {
  //   initKeyboardListeners();
  // });
  
  // 恢复导航状态
  if (currentUserPub.value) {
    try {
      const savedState = await restoreNavigationState();
      if (savedState) {
        // 根据保存的状态更新 activeTab
        activeTab.value = tabs[parseInt(savedState.activeTab)];
        
      }
    } catch (error) {
      
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

  // cleanupKeyboardListeners();
  
});


const momentsRef = ref<InstanceType<typeof Moment> | null>(null);




  // 处理标签点击的新方法
  function handleTabClick(tabName: string) {
    // 🔧 如果从AI聊天标签切换到其他标签，立即重置键盘状态
    if ((currentComponent.value === 'KeyPair' || currentComponent.value === 'Broswer') && 
        tabName !== 'KeyPair' && tabName !== 'Broswer') {
      
      keyboardHeight.value = 0;
      
      // 如果输入框有焦点，主动失焦
      if (bottomInputRef.value) {
        bottomInputRef.value.blur();
      }
    }
    
    // 根据标签名称切换到对应的组件
    switch (tabName) {
      case 'Chat':
        openChat();
        break;
      case 'Contacts':
        openContacts();
        break;
      case 'Link':
        switchTo('Link');
        tabnumber.value = '2';
        break;
      case 'Call':
        switchTo('Call');
        break;
      case 'KeyPair':
        openKeyPair();
        break;
      case 'OS':
        switchTo('OS');
   
        break;
      case 'Profile':
        openMe();
        break;
      default:
        break;
    }
  }

</script>

<style scoped>
/* ion-footer {
 --background: transparent;
    background: transparent;
} */
/* ion-toolbar {
  --background: transparent;
    background: transparent;
} */

@media (min-width: 998px) {
  .footer-index{
    display: none;
     /* --background: transparent;
    background: transparent; */
  }
}

.empty-icon {
  font-size: 100px;
  
  max-width: 100%;
  max-height: 300px;
  color: var(--ion-text-color);

}

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


.liquid-toolbar1 {
  /* background: var(--background-color-no); */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: visible;
  position: relative;
  --background: transparent;

}

.components-container {
  position: relative;
  width: 100%;
  height: 100%;
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


 /* ion-content {
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
  } */

  /* ion-footer{
  overflow: visible;
  }
  ion-toolbar{
    overflow: visible;
  } */
  

  .bottom-input-wrapper {
    display: flex;
    align-items: center;
    background-color: var(--ion-color-light);
    border-radius: 50px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .bottom-input {
    padding: 12px 20px;
    border-radius: 50px;
    background-color: transparent;
    border: none;
    outline: none;
    color: var(--ion-text-color);
    font-size: 16px;
    flex: 1;
    text-align: left;
    transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .bottom-input::placeholder {
    color: var(--ion-text-color);
    opacity: 0.7;
  }

  .button-container {
    width: 44px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: visible;
    position: relative;
    margin-left: 4px;
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
    padding: 10px;
  }

  .stop-button {
    background: var(--ion-color-danger);
    padding: 10px;
  }


  .custom-tab-button ion-icon {
    font-size: 30px;
    
  }

  .custom-tab-button.tab-selected ion-icon {
    color: var(--ion-color-primary);
  }

  .custom-tab-button.tab-selected ion-label {
    color: var(--ion-color-primary);

  }

  /* 头像标签样式 */
  .avatar-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid var(--ion-text-color);
    opacity: 0.6;
    transition: all 0.3s ease;
  }

  .custom-tab-button.tab-selected .avatar-tab {
    border-color: var(--ion-color-primary);
    opacity: 1;
    transform: scale(1.05);
    
  }

  .tab-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  /* 红点通知样式 */
  .request-badge {
    position: absolute;
    top: 2px;
    /* right: calc(50% - 0px); */
 
    background: #FF3B30;
    color: rgb(255, 0, 0);
    border-radius: 50%;
    width: 6px;
    height: 6px;
    font-size: 1px;
    padding: 0;
    min-width: 6px;
    min-height: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--background-color);
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

  /* MaxFlow标签图标和文字过渡动画 */
  .tab-icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
  }

  .icon-fade-enter-active {
    transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.175);
  }

  .icon-fade-leave-active {
    transition: all 0.2s cubic-bezier(0.55, 0.055, 0.675, 0.19);
  }

  .icon-fade-enter-from {
    opacity: 0;
    transform: translateY(10px) scale(0.8);
  }

  .icon-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px) scale(0.8);
  }

  .icon-fade-enter-to,
  .icon-fade-leave-from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .label-fade-enter-active {
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.175);
  }

  .label-fade-leave-active {
    transition: all 0.15s cubic-bezier(0.55, 0.055, 0.675, 0.19);
  }

  .label-fade-enter-from {
    opacity: 0;
    transform: translateY(5px) scale(0.9);
  }

  .label-fade-leave-to {
    opacity: 0;
    transform: translateY(-5px) scale(0.9);
  }

  .label-fade-enter-to,
  .label-fade-leave-from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  /* 确保按钮图标居中 */
  .action-button ion-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
.modern-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 90px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* Aligned to top */
  gap: 15px;
  z-index: 100;
  background: rgba(var(--ion-background-color-rgb, 255, 255, 255), 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding-top: 20px;
  padding-bottom: 20px;
  box-sizing: border-box;
  border-right: 1px solid rgba(var(--ion-text-color-rgb), 0.1);
}

.sidebar-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 70px;
  height: 60px;
  padding: 8px 0;
  border-radius: 10px;
  transition: all 0.2s ease;
  color: var(--ion-text-color);
  opacity: 0.7;
  position: relative;
}

.sidebar-button:hover {
  background-color: rgba(var(--ion-text-color-rgb), 0.08);
  opacity: 1;
}

.sidebar-button.active {
  color: var(--ion-color-primary);
  background-color: rgba(var(--ion-color-primary-rgb), 0.1);
  opacity: 1;
}

.sidebar-icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.sidebar-label {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.sidebar-avatar-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 4px;
  transition: border-color 0.2s ease;
  flex-shrink: 0; /* Prevent flexbox from squashing the avatar */
}

.sidebar-button.active .sidebar-avatar-wrapper {
  border-color: var(--ion-color-primary);
}

.sidebar-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.request-badge-sidebar {
  position: absolute;
  top: 2px;
  right: 18px;
  background: #FF3B30;
  color: rgb(255, 0, 0);
  border-radius: 50%;
  width: 8px;
  height: 8px;
  min-width: 8px;
  min-height: 8px;
  border: 1px solid var(--ion-background-color);
  padding: 0;
}

</style>