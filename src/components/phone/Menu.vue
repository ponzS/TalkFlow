<template>
      <ion-header class="avatar-index" :translucent="true" collapse="fade">
      <ion-toolbar >
        <ion-buttons slot="start">
 <ion-button fill="clear" @click="onOpenOverlay">
          <ion-icon :icon="callOutline"></ion-icon>
        </ion-button>
        </ion-buttons>
<!-- 
        <ion-title>{{ currentUserAlias || '' }}</ion-title> -->

            <ion-buttons slot="end">
     
        <ion-button fill="clear" @click="showPanel('qrcode')">
          <ion-icon :icon="qrCodeOutline"></ion-icon>
        </ion-button>
        <!-- <ion-button fill="clear" @click="goToScan">
          <ion-icon :icon="scanSharp"></ion-icon>
        </ion-button> -->
      </ion-buttons>

      </ion-toolbar>
    </ion-header>
 <ion-header collapse="fade">
    <ion-toolbar>
      <div style="height: 20px;"></div>
      <div style="display: flex; align-items: center;justify-content: center;">
   <div style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden;margin: auto 11px;cursor: pointer;">
                  <img
              v-if="userAvatars[currentUserPub!]"
              :src="userAvatars[currentUserPub!]"
                            @click="router.push({ path: '/friend-profile', query: { pub: currentUserPub } });"
            />
            <img
              v-else
              :src="avatarurl"
             @click="router.push({ path: '/friend-profile', query: { pub: currentUserPub } });"
            /></div>
            </div>
</ion-toolbar>
   <ion-toolbar>
 <p class="username"> {{ currentUserAlias || '' }}</p>
  <p class="userlink"> {{ currentUserAlias1 || '' }}</p>
</ion-toolbar>
  </ion-header>

    <ion-content>
       
      <ion-list >
        <!-- <ion-list-header>
          MENU
        </ion-list-header> -->
        <ion-menu-toggle :auto-hide="false" >
          <ion-item
          lines="none"
            button
            :detail="false"
            router-direction="root"
     @click="handleTabClick('Chat')"
                      class="custom-tab-button"
          :class="{ 'tab-selected': currentComponent === 'Chat' }"
          >
                  <ion-icon
                  class="cosmic-icon"
                  :icon="currentComponent === 'Chat' ? chatbubbles : chatbubblesOutline"></ion-icon>
          <ion-label class="cosmic-label">Chat</ion-label>
          <ion-badge v-if="hasUnreadMessages" class="request-badge">●</ion-badge>
          </ion-item>



            <ion-item
            lines="none"
            button
            :detail="false"
            router-direction="root"
    @click="handleTabClick('Contacts')"
                      class="custom-tab-button"
          :class="{ 'tab-selected': currentComponent === 'Contacts' }"
          >
                 <ion-icon 
                 class="cosmic-icon"
                 :icon="currentComponent === 'Contacts' ? people : peopleOutline"></ion-icon>
          <ion-label class="cosmic-label">{{ $t('Contact') || 'Contact' }}</ion-label>
          <ion-badge v-if="hasNewRequests && !requestsViewed" class="request-badge">●</ion-badge>
          </ion-item>
          
               <ion-item
               lines="none"
            button
            :detail="false"
            router-direction="root"
    @click="handleTabClick('Call')"
                      class="custom-tab-button"
          :class="{ 'tab-selected': currentComponent === 'Call' }"
          >
          <ion-icon 
          class="cosmic-icon"
          :icon="currentComponent === 'Call' ? planet : planetOutline"></ion-icon>
          <ion-label class="cosmic-label">Moment</ion-label>

          </ion-item>
          
             <ion-item
            button
            :detail="false"
            router-direction="root"
   @click="handleTabClick('Link')"
                      class="custom-tab-button"
          :class="{ 'tab-selected': currentComponent === 'Link' }"
          >

                   <ion-icon 
                   class="cosmic-icon"
                   :icon="currentComponent === 'Link' ? pulse : pulseOutline"></ion-icon>
          <ion-label 
              :key="maxFlowTabLabel" 
          class="cosmic-label"
            >AI Chat</ion-label>
          </ion-item>


        </ion-menu-toggle>
      </ion-list>


<div style="height: 50px;" class="avatar-index"></div>

<ion-list-header class="avatar-index">
         Settings
        </ion-list-header>


  <!-- Account and Security Section -->
      <div class="settings-section" >
        <!-- <h2 class="section-title">{{ $t('account') }}</h2> -->
        <ion-list class="settings-list">
          <ion-item  button @click="myself" class="cosmic-item avatar-index">
            <ion-icon slot="start" :icon="personOutline" class="cosmic-icon" style="color:#3880ff" />
            <ion-label class="cosmic-label">{{ $t('setforme') }}</ion-label>
          </ion-item>
          <ion-menu-toggle :auto-hide="false" >
          <ion-item 
          button 
          @click="router.push('/Relay')" class="cosmic-item">
            <ion-icon slot="start" :icon="rocketOutline" class="cosmic-icon" style="color:darkslateblue" />
            <ion-label class="cosmic-label">
              <div style="display: flex;justify-content: space-between;align-items: center;">
              <div>Relay </div>
              <div>
              <span class="breathing-dot" :class="connectedRelaysCount !== 0 ? 'green' : 'red'"></span>
              <span class="RelayNumber">{{ connectedRelaysCount }}</span>
          </div>
            </div>
            </ion-label>
            </ion-item>
            </ion-menu-toggle>
          <ion-item  button @click="router.push('/Mesh')" class="cosmic-item avatar-index">
            <ion-icon slot="start" :icon="analyticsOutline" class="cosmic-icon" style="color:cadetblue" />
            <ion-label class="cosmic-label">Mesh Network Canvas</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Application Settings Section -->
      <div class="settings-section avatar-index" >
        <h2 class="section-title">{{ $t('application') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="notify" class="cosmic-item">
            <ion-icon slot="start" :icon="notificationsOutline" class="cosmic-icon" style="color:darkcyan"/>
            <ion-label class="cosmic-label">{{ $t('notify') }}</ion-label>
          </ion-item>
          <ion-item  button @click="languageSwitchers" class="cosmic-item">
            <ion-icon slot="start" :icon="globeOutline" class="cosmic-icon" style="color:cornflowerblue;"/>
            <ion-label class="cosmic-label">{{ $t('language') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

  

      <!-- Security and Data Section -->
         <ion-menu-toggle :auto-hide="false" >
      <div class="settings-section avatar-index">
        <h2 class="section-title">{{ $t('security') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="KeyCheck" class="cosmic-item">
            <ion-icon slot="start" :icon="keyOutline" class="cosmic-icon" style="color:cornflowerblue"/>
            <ion-label class="cosmic-label">{{ $t('keysecuritydetection') }}</ion-label>
          </ion-item>
          <ion-item  button @click="datamove" class="cosmic-item">
            <ion-icon slot="start" :icon="gitPullRequestOutline" class="cosmic-icon" style="color:gold"/>
            <ion-label class="cosmic-label">{{ $t('datamigration') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>
</ion-menu-toggle>


       
      <div class="settings-section avatar-index">
        <h2 class="section-title">Tool</h2>
        <ion-list class="settings-list">
           <ion-item  button @click="router.push('/htmlpage')" class="cosmic-item">
            <ion-icon slot="start" :icon="ionIcons.codeSlashOutline" class="cosmic-icon" style="color:#3880ff" />
            <ion-label class="cosmic-label">Base64 for HTML</ion-label>
          </ion-item>
           <ion-item  button @click="router.push('/browser')" class="cosmic-item">
            <ion-icon slot="start" :icon="browsersOutline" class="cosmic-icon" style="color:darkblue" />
            <ion-label class="cosmic-label">Browser</ion-label>
          </ion-item>
            <ion-item  button @click="router.push('/qrpage')" class="cosmic-item">
            <ion-icon slot="start" :icon="qrCodeOutline" class="cosmic-icon" style="color:steelblue" />
            <ion-label class="cosmic-label">QR Tool</ion-label>
          </ion-item>
        </ion-list>
      </div>




      <!-- Storage and Cache Section -->
      <div class="settings-section avatar-index">
        <h2 class="section-title">{{ $t('storage') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="indexedDBpage" class="cosmic-item">
            <ion-icon slot="start" :icon="serverOutline" class="cosmic-icon" style="color:cornflowerblue"/>
            <ion-label class="cosmic-label">NetworkDatabase</ion-label>
          </ion-item>
          <ion-item  button @click="confirmClearChats" class="cosmic-item">
            <ion-icon slot="start" :icon="trashBinOutline" class="cosmic-icon" style="color:deeppink"/>
            <ion-label class="cosmic-label">{{ $t('clearthechatrecords') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Privacy and Safety Section -->
      <div class="settings-section avatar-index">
        <h2 class="section-title">{{ $t('privacy') }}</h2>
        <ion-list class="settings-list">
          <ion-item  class="cosmic-item">
            <ion-icon slot="start" :icon="shareSocialOutline" class="cosmic-icon" style="color:#3880ff"/>
            <ion-label class="cosmic-label">{{ $t('shareRelays') }}</ion-label>
            <ion-toggle
              slot="end"
              :checked="isRelaySharingEnabled"
              @ionChange="handleSharingToggle"
            ></ion-toggle>
          </ion-item>
          <ion-item  button @click="blackList" class="cosmic-item">
            <ion-icon slot="start" :icon="banOutline" class="cosmic-icon" style="color:darkgray"/>
            <ion-label class="cosmic-label">{{ $t('blacklist') }}</ion-label>
          </ion-item>
          <ion-item  button @click="ReportUser" class="cosmic-item">
            <ion-icon slot="start" :icon="alertOutline" class="cosmic-icon" style="color:deeppink"/>
            <ion-label class="cosmic-label">Report users</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Account Actions Section -->
      <div class="settings-section avatar-index">
        <h2 class="section-title">{{ $t('actions') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="confirmDeleteAccount" class="cosmic-item danger-item">
            <ion-icon slot="start" :icon="personRemoveOutline" class="cosmic-icon" style="color:red"/>
            <ion-label class="cosmic-label">{{ $t('destroythekey') }}</ion-label>
          </ion-item>
          <ion-item  button @click="logout" class="cosmic-item">
            <ion-icon slot="start" :icon="logOutOutline" class="cosmic-icon" style="color:darkblue"/>
            <ion-label class="cosmic-label">{{ $t('logout') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

           <div class="settings-section avatar-index">
        <h2 class="section-title">Contact US</h2>
        <ion-list class="settings-list">
            <a href="https://x.com/TalkFlowSOL">
           <ion-item  button  class="cosmic-item">
          
            <!-- <ion-icon slot="start" :icon="globeOutline" class="cosmic-icon" style="color:cornflowerblue;"/> -->
            <ion-label class="cosmic-label"  target="_blank">X&Twitter</ion-label>

          </ion-item>
                  </a>
            <a href="https://talkflow.team">
          <ion-item  button  class="cosmic-item">
           
            <!-- <ion-icon slot="start" :icon="notificationsOutline" class="cosmic-icon" style="color:darkcyan"/> -->
            <ion-label class="cosmic-label">WebSite</ion-label>
         
          </ion-item>
</a>

             <a href="https://github.com/ponzS/TalkFlow">
          <ion-item  button  class="cosmic-item">
            <!-- <ion-icon slot="start" :icon="globeOutline" class="cosmic-icon" style="color:cornflowerblue;"/> -->
        
            <ion-label class="cosmic-label">Github</ion-label>
      
          </ion-item>
   </a>
        </ion-list>
      </div>

      <div class="version-section avatar-index">
        <div class="version-card">
          <div class="version-info">
            <h3 class="app-name">TalkFlow</h3>
            <p class="version-number">v1.7.6</p>
          </div>
          <ion-icon :icon="cubeOutline" class="version-icon"></ion-icon>
        </div>
      </div>

       

      <div style="height:120px"></div>

      <!-- Clear Chats Confirmation Alert -->
      <ion-alert
        :is-open="isClearChatsAlertOpen"
        header="Confirm Clear Chat Records"
        message="This action will delete all local and online chat records, and they cannot be recovered. Are you sure you want to proceed?"
        :buttons="[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              isClearChatsAlertOpen = false;
            },
          },
          {
            text: 'Confirm',
            role: 'confirm',
            handler: () => {
              clearAllChats();
              isClearChatsAlertOpen = false;
            },
          },
        ]"
        @didDismiss="isClearChatsAlertOpen = false"
      ></ion-alert>

      <!-- Delete Account Confirmation Alert -->
      <ion-alert
        :is-open="isDeleteAlertOpen"
        header="Confirm Account Deletion"
        message="This action will permanently delete your account and all associated data, including local data, friend connections, and network data. This action cannot be undone. Are you sure you want to proceed?"
        :buttons="[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              isDeleteAlertOpen = false;
            },
          },
          {
            text: 'Confirm',
            role: 'confirm',
            handler: () => {
              deleteAccount();
              isDeleteAlertOpen = false;
            },
          },
        ]"
        @didDismiss="isDeleteAlertOpen = false"
      ></ion-alert>
   




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
  IonFooter,
} from '@ionic/vue';
import * as ionIcons from "ionicons/icons";
import {  shallowRef, onUnmounted, onBeforeUnmount,  nextTick,} from 'vue'
import { useRouter } from 'vue-router'


import { useKeyboardState } from '@/composables/useKeyboardState'
import { useCallOverlay } from '@/composables/useCallOverlay'
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
  IonBadge,

} from '@ionic/vue'
import { gunAvatar } from "gun-avatar";
import { useTheme } from '@/composables/useTheme';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useGroupChat } from '@/composables/useGroupChat';


import Moment from './Moment.vue'
const overlay = useCallOverlay()
function onOpenOverlay(){
  overlay.setEnabled(true)
}

import { useI18n } from 'vue-i18n';
import MaxFlow from './MaxFlow.vue'



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


import {

  IonAlert,

  IonTextarea,
  IonButton,
  IonModal,

} from '@ionic/vue';


import {

  globeOutline,
  lockClosedOutline,
  saveOutline,
  banOutline,
  personRemoveOutline,
  logOutOutline,
  keyOutline,
  gitPullRequestOutline,
  trashBinOutline,
  notificationsOutline,
  alertOutline,
  heartOutline,
  homeOutline,
  cafeOutline,
 
  happyOutline,
  shareSocialOutline,
  storefrontOutline, 
  serverOutline,
 

  analyticsOutline,


} from 'ionicons/icons';




const languageSwitchers = () => {
  router.push('/i18nset');
};

const notify = () => {
  router.push('/NotificationSettings');
};

const blackList = () => {
  router.push('/blackList');
};

const ReportUser = () => {
  router.push('/ReportPage');
};

const githubpage = () => {
  router.push('/githubpage');
};

const sponsorpage = () => {
  router.push('/Sponsorship');
};

const KeyCheck = () => {
  router.push('/keycheck');
};

const myself = () => {
  router.push('/myself');
};

const datamove = () => {
  router.push('/MigrationChoice');
};

const gotoversionpage = () => {
  router.push('/versiontalkpage');
};

const indexedDBpage = () => {
  router.push('/indexedDBpage');
};

const gotoCache = () => {
  router.push('/storagepage');
};
const gotoDai = () => {
  router.push('/daipage');
};
const gotoDaiSet = () => {
  router.push('/AiSetting');
};

const gotoModelPersona = () => {
  router.push('/ModelPersona');
};

// 修正：从 getTalkFlowCore 获取单例
const { isRelaySharingEnabled, toggleRelaySharing, onLogout, deactivateAccount, clearAllChats, isLoggedIn } = getTalkFlowCore();

const deleteAccount = () => {
  deactivateAccount();
};

const isDeleteAlertOpen = ref(false);
const confirmDeleteAccount = () => {
  isDeleteAlertOpen.value = true;

};

const isClearChatsAlertOpen = ref(false);
const confirmClearChats = () => {
  isClearChatsAlertOpen.value = true;
 
};

const logout = () => {
  router.replace('/');
  onLogout();

};

const handleSharingToggle = (event: CustomEvent) => {
  const enabled = event.detail.checked;
  toggleRelaySharing(enabled);
};


import { closeCircleSharp, copyOutline,  qrCodeOutline, keySharp,  eyeOutline, eyeOffOutline, refreshCircleOutline, warningOutline, lockOpenOutline, checkmarkCircleOutline, alertCircleOutline, scanSharp, menuOutline, expandOutline, arrowBackOutline, refreshOutline, helpCircleOutline, cloudDownloadOutline,closeOutline  } from 'ionicons/icons';
import {  autoSaveStorageServ } from '@/composables/TalkFlowCore';



// @ts-ignore
const {
  copyPub, 

 
} = chatFlowStore;


// 统计当前 gun 正在连接的 relay 数量
const relayConnectedPeers = ref<string[]>([]);
let relayCountTimer: number | undefined;

function refreshConnectedRelays() {
  try {
    const opt_peers = (gun as any).back('opt.peers') as Record<string, any>;
    const list = Object.entries(opt_peers)
      .filter(([, peer]) => {
        return (
          peer &&
          peer.wire &&
          peer.wire.readyState === 1 &&
          peer.wire.OPEN === 1 &&
          peer.wire.constructor?.name === 'WebSocket'
        );
      })
      .map(([url]) => url);
    relayConnectedPeers.value = list;
  } catch {
    relayConnectedPeers.value = [];
  }
}

const connectedRelaysCount = computed(() => relayConnectedPeers.value.length);

onMounted(() => {
  refreshConnectedRelays();
  relayCountTimer = window.setInterval(refreshConnectedRelays, 1500);
});

onUnmounted(() => {
  if (relayCountTimer) window.clearInterval(relayCountTimer);
});


// 网格模式状态
const isPersonalView = ref(false); // 默认为个人网格模式

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

<style scoped>
 @media (max-width: 998px) {
  .avatar-index{
    display: none;
  }
}
 @media (min-width: 998px) {
  .avatar-index1{
    display: none;
  }
}
/* Settings Content Layout */
.settings-content {
  --padding-top: 16px;
  --padding-bottom: 16px;
  /* --padding-start: 16px;
  --padding-end: 16px; */
}

/* Version Information Section */
.version-section {
  margin: 24px;

}

.version-card {
  background: rgba(42, 125, 112, 0.1);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(42, 125, 112, 0.2);
  box-shadow: 0 4px 20px rgba(42, 125, 112, 0.1);
  transition: all 0.3s ease;
}

.version-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(42, 125, 112, 0.15);
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--ion-text-color);
  margin: 0;
  text-shadow: 0 0 4px rgba(42, 125, 112, 0.3);
}

.version-number {
  font-size: 14px;
  font-weight: 500;
  color: rgba(42, 125, 112, 0.8);
  margin: 0;
  opacity: 0.9;
}

.version-icon {
  font-size: 28px;
  color: rgba(42, 125, 112, 0.7);
  transition: all 0.3s ease;
}

/* Relay 连接数呼吸灯样式 */
.breathing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin: 0 6px 0 4px;
  
}
.breathing-dot.green {
  background-color: #2dd36f; /* Ionic 成功绿色 */
  animation: breathe-green 1.8s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(45, 211, 111, 0.6);
}
.breathing-dot.red {
  background-color: #eb445a; /* Ionic 危险红色 */
  animation: breathe-red 1.8s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(235, 68, 90, 0.6);
}
@keyframes breathe-green {
  0% {
    box-shadow: 0 0 0 0 rgba(45, 211, 111, 0.6);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(45, 211, 111, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(45, 211, 111, 0);
  }
}
@keyframes breathe-red {
  0% {
    box-shadow: 0 0 0 0 rgba(235, 68, 90, 0.6);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(235, 68, 90, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(235, 68, 90, 0);
  }
}
.RelayNumber{
  color: #838383;
  font-size: 13px;
}
.version-card:hover .version-icon {
  transform: rotate(10deg) scale(1.1);
  color: rgb(42, 125, 112);
}

/* Settings Section */
.settings-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ion-text-color);
  margin: 0 0 12px 8px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}





/* 图标基础样式，使用伪元素实现光晕 */
.cosmic-icon {
  font-size: 24px;
  color: rgb(42, 125, 112);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  margin-right: 16px;
}

  .custom-tab-button.tab-selected ion-icon {
    color: var(--ion-color-primary);
  }

  .custom-tab-button.tab-selected ion-label {
    color: var(--ion-color-primary);

  }

/* 文字样式 */


.danger-item .cosmic-icon {
  color: #dc3545;
}

.danger-item .cosmic-icon::before {
  background: radial-gradient(circle, rgba(220, 53, 69, 0.4) 0%, rgba(220, 53, 69, 0) 70%);
}

/* Toolbar 样式 */
.liquid-toolbar {
  --border-color: transparent;
  --background: transparent;
  overflow: visible;
}

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
ion-toolbar{
  --background: transparent;
}
.username {
  font-weight: bold;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  font-size: 3rem; 
  margin: 0;
  color: var(--ion-text-color);
  text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
  text-align: center;
}
.userlink {
  font-weight: bold;
  font-size: 1rem; 
  margin: 0;
  color: #82828295;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
  text-align: center;
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


/* 
ion-icon {
  font-size: 24px;
  color: var(--ion-text-color);
} */

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
.username {
  font-weight: bold;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  font-size: 3rem; 
  margin: 0;
  color: var(--ion-text-color);
  text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
  text-align: center;

}
.userlink {
  /* font-weight: bold; */
  font-size: 1.5rem; 
  margin: 0;
  color: #82828295;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
  text-align: center;
}



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
