<template>
  

    <ion-content>
      <ion-list lines="none">
        <ion-list-header>
          MENU
        </ion-list-header>
        <ion-menu-toggle :auto-hide="false" >
          <ion-item
            button
            :detail="false"
            router-direction="root"
     @click="handleTabClick('Chat')"
            
          >
                  <!-- <ion-icon :icon="currentComponent === 'Chat' ? chatbubbles : chatbubblesOutline"></ion-icon> -->
          <ion-label >Chat</ion-label>
          <ion-badge v-if="hasUnreadMessages" class="request-badge">●</ion-badge>
          </ion-item>



            <ion-item
            button
            :detail="false"
            router-direction="root"
    @click="handleTabClick('Contacts')"
            
          >
                 <!-- <ion-icon :icon="currentComponent === 'Contacts' ? people : peopleOutline"></ion-icon> -->
          <ion-label >{{ $t('Contact') || 'Contact' }}</ion-label>
          <ion-badge v-if="hasNewRequests && !requestsViewed" class="request-badge">●</ion-badge>
          </ion-item>
          
              <ion-item
            button
            :detail="false"
            router-direction="root"
   @click="handleTabClick('Call')"
            
          >
   <!-- <ion-icon :icon="currentComponent === 'Call' ? call : callOutline"></ion-icon> -->
          <ion-label>Call</ion-label>
        
          </ion-item>
          
             <ion-item
            button
            :detail="false"
            router-direction="root"
   @click="handleTabClick('Link')"
            
          >

            <!-- <transition name="icon-fade" mode="out-in">
              <ion-icon 
                :key="maxFlowTabIcon.active" 
                :icon="currentComponent === 'Link' ? maxFlowTabIcon.active : maxFlowTabIcon.inactive"
              ></ion-icon>
            </transition>
  -->
          <ion-label 
              :key="maxFlowTabLabel" 
          
            >MaxFlow</ion-label>
          </ion-item>

 <ion-item
            button
            :detail="false"
            router-direction="root"
  @click="handleTabClick('Profile')"
            
          >
    <!-- <div class="avatar-tab">
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
          </div> -->
         
          <ion-label>{{ currentUserAlias || 'Profile' }}</ion-label>
          </ion-item>

        </ion-menu-toggle>
      </ion-list>

  <ion-list lines="none">
        <ion-list-header>
         System
        </ion-list-header>
        <ion-menu-toggle :auto-hide="false" >
          <ion-item
            button
            :detail="false"
            router-direction="root"
     @click="router.push('/settingspage')"
            
          >
          
          <ion-label >Settings</ion-label>

          </ion-item>

       

  

        </ion-menu-toggle>
      </ion-list>
  
    </ion-content>

</template>

<script setup lang="ts">
import { computed, defineComponent, onMounted, ref, watch } from 'vue';

import {
  IonContent,
  IonMenuButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonTitle,
  IonToolbar,
  IonToggle,
} from '@ionic/vue';
import * as ionIcons from "ionicons/icons";
import {  shallowRef, onUnmounted, onBeforeUnmount,  nextTick,} from 'vue'
import { useRouter } from 'vue-router'
import Chat from './ChatS.vue'
import Contacts from './ContactsS.vue'
import AiChatSimple from './AiChatSimple.vue'

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

  
} from 'ionicons/icons'
import {
  IonFooter,
  IonSplitPane, 

  IonModal, 

  IonButton, 

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
import ChatSpad from '../ipad/ChatSpad.vue'

import MeS from './MeS.vue'

import Moment from './Moment.vue'
import { useI18n } from 'vue-i18n';
import ChatModePage from '../ipad/ChatModePage.vue'
import MaxFlow from './MaxFlow.vue'
import RelayGroup from '../GunVue/RelayGroup.vue'


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
      return { active: planet, inactive: planetOutline }; // 默认显示moment图标
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


const bottomInputValue = ref('');
const { keyboardHeight, initKeyboard } = useKeyboardState();
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

// 统一使用共享键盘状态；在需要键盘适配的页面初始化一次
onMounted(() => {
  initKeyboard();
});

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

// 处理标签变化，包括键盘状态重置
function handleTabChange(newTab: string) {
  // 🔧 如果从AI聊天标签切换到其他标签，立即重置键盘状态
  if (activeTab.value === 'Card' && newTab !== 'Card') {
    
    keyboardHeight.value = 0;
    
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
    
    keyboardHeight.value = 0;
  }
  
  // 调用原始的切换函数
  switchTo(componentName);
}

// 处理大屏模式的Link按钮点击
function handleSidebarLinkClick() {
  // 🔧 如果从AI聊天页面切换，重置键盘状态
  if (currentComponent.value === 'Broswer' || currentComponent.value === 'KeyPair') {
    
    keyboardHeight.value = 0;
  }
  
  // 调用原始的Link处理函数
  handleLinkClick();
}


const router = useRouter();

// useGroupChat已在上方导入和使用



const momentsRef = ref<InstanceType<typeof Moment> | null>(null);




  // 处理标签点击的新方法
  function handleTabClick(tabName: string) {

    router.push('/')

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
ion-menu ion-content {
  --padding-top: 20px;
  --padding-bottom: 20px;
  --background: var(--ion-item-background, var(--ion-background-color, #fff));
  border-right: 1px solid var(--ion-color-step-150, #d7d8da);
}

ion-item.selected {
  --color: var(--ion-color-primary);
}

/*
 * Material Design Menu
*/
ion-menu.md ion-list {
  padding: 20px 0;
}

ion-menu.md ion-list-header {
  padding-left: 18px;
  padding-right: 18px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: min(0.875rem, 32px);
  font-weight: 450;
}

ion-menu.md ion-item {
  --padding-start: 18px;
  margin-right: 10px;
  border-radius: 0 50px 50px 0;
  font-weight: 500;
}

ion-menu.md ion-item.selected {
  --background: rgba(var(--ion-color-primary-rgb), 0.14);
}

ion-menu.md ion-item.selected ion-icon {
  color: var(--ion-color-primary);
}

ion-menu.md ion-list-header,
ion-menu.md ion-item ion-icon {
  color: var(--ion-color-step-650, #5f6368);
}

ion-menu.md ion-list:not(:last-of-type) {
  border-bottom: 1px solid var(--ion-color-step-150, #d7d8da);
}

/*
 * iOS Menu
*/
ion-menu.ios ion-list-header {
  padding-left: 16px;
  padding-right: 16px;
  margin-bottom: 8px;
  font-size: clamp(22px, 1.375rem, 40px);
}

ion-menu.ios ion-list {
  padding: 20px 0 0;
}

ion-menu.ios ion-item {
  --padding-start: 16px;
  --min-height: 50px;
}

ion-menu.ios ion-item ion-icon {
  font-size: 24px;
  color: #73849a;
}

ion-menu.ios ion-item.selected ion-icon {
  color: var(--ion-color-primary);
}
</style>
