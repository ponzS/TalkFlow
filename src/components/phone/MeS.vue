<template>
  <ion-page ref="page">
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar >
        <ion-buttons slot="start">
 <ion-button fill="clear" @click="onOpenOverlay">
          <ion-icon :icon="callOutline"></ion-icon>
        </ion-button>
        </ion-buttons>

        <ion-title>{{ currentUserAlias || '' }}</ion-title>

            <ion-buttons slot="end">
     
        <ion-button fill="clear" @click="showPanel('qrcode')">
          <ion-icon :icon="qrCodeSharp"></ion-icon>
        </ion-button>
        <ion-button fill="clear" @click="goToScan">
          <ion-icon :icon="scanSharp"></ion-icon>
        </ion-button>
      </ion-buttons>

      </ion-toolbar>
    </ion-header>

    <!-- Main Content -->
    <ion-content :fullscreen="true" class="settings-content">
     
   
      <ion-toolbar class="avatar-index" >
        <ion-menu-button >
   <div style="display: flex;justify-content: center;align-items: center;">
        <div style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden;margin: auto 11px;cursor: pointer;">
                  <img
              v-if="userAvatars[currentUserPub!]"
              :src="userAvatars[currentUserPub!]"

            />
            <img
              v-else
              :src="avatarurl"

            /></div>
            </div>
            </ion-menu-button>
</ion-toolbar>

  
      <ion-header collapse="condense" >
          <ion-toolbar>
             <ion-menu-button >
         <p class="username"> {{ currentUserAlias || '' }}</p>
     </ion-menu-button>   
        <ion-menu-button >
         <p class="userlink"> {{ currentUserAlias1 || '' }}</p>
   </ion-menu-button>
    </ion-toolbar>
        </ion-header>



      <!-- Account and Security Section -->
      <div class="settings-section">
        <!-- <h2 class="section-title">{{ $t('account') }}</h2> -->
        <ion-list class="settings-list">
          <ion-item  button @click="myself" class="cosmic-item">
            <ion-icon slot="start" :icon="personOutline" class="cosmic-icon" style="color:#3880ff" />
            <ion-label class="cosmic-label">{{ $t('setforme') }}</ion-label>
          </ion-item>
          <ion-item  button @click="router.push('/Relay')" class="cosmic-item">
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
          <ion-item  button @click="router.push('/Mesh')" class="cosmic-item">
            <ion-icon slot="start" :icon="analyticsOutline" class="cosmic-icon" style="color:cadetblue" />
            <ion-label class="cosmic-label">Mesh Network Canvas</ion-label>
          </ion-item>
      
        </ion-list>
      </div>

 
      <!-- Application Settings Section -->
      <div class="settings-section">
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

      <!-- Resources Section -->
      <!-- <div class="settings-section">
        <h2 class="section-title">{{ $t('resources') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="githubpage" class="cosmic-item">
            <ion-icon slot="start" :icon="homeOutline" class="cosmic-icon" style="color:chocolate"/>
            <ion-label class="cosmic-label">{{$t('github')}}</ion-label>
          </ion-item>
  
        </ion-list>
      </div> -->

      <!-- Support Section -->
      <!-- <div class="settings-section">
        <h2 class="section-title">{{ $t('support') }}</h2>
        <ion-list class="settings-list">
          <ion-item  button @click="sponsorpage" class="cosmic-item">
            <ion-icon slot="start" :icon="heartOutline" class="cosmic-icon" style="color:deeppink"/>
            <ion-label class="cosmic-label">{{ $t('sponsor6') }}</ion-label>
          </ion-item>
        </ion-list>
      </div> -->

      <!-- Security and Data Section -->
      <div class="settings-section">
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


             
      <div class="settings-section">
        <h2 class="section-title">Tool</h2>
        <ion-list class="settings-list">
           <ion-item  button @click="router.push('/htmlpage')" class="cosmic-item">
            <ion-icon slot="start" :icon="codeSlashOutline" class="cosmic-icon" style="color:#3880ff" />
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
      <div class="settings-section">
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
      <div class="settings-section">
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
      <div class="settings-section">
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

           <div class="settings-section">
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

      <div class="version-section">
        <div class="version-card">
          <div class="version-info">
            <h3 class="app-name">TalkFlow</h3>
            <p class="version-number">v1.7.5</p>
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
   
    :presenting-element="presentingElement"
    :swipe-to-close="true"
    :can-dismiss="true"
    @didDismiss="hidePanel"
  >
<!--  :initial-breakpoint="0.8" -->
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
            <h1 style="font-weight: 900;font-size: 19px;text-align: center;">
        Sacn the code to add friends
            </h1>
          </ion-toolbar>

        </ion-header>
          <ion-toolbar class="avatar-index">
    
   <div style="display: flex;justify-content: center;">
        <div style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden;margin: auto 1px;cursor: pointer;
        margin-right: 20px;
        ">
                  <img
              v-if="userAvatars[currentUserPub!]"
              :src="userAvatars[currentUserPub!]"

            />
            <img
              v-else
              :src="avatarurl"

            /></div>

      <div>
         <p class="username" style="font-size: 30px !important;text-align: left;"> {{ currentUserAlias || '' }}</p>

         <p class="userlink"> {{ currentUserAlias1 || '' }}</p>
</div>
            </div>
      

  
    </ion-toolbar>

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

  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonAlert,
  IonButtons,
  IonBackButton,
  IonToggle, 
  IonTextarea,
  IonButton,
  IonModal,
  IonMenuButton
} from '@ionic/vue';

import { getTalkFlowCore } from '@/composables/TalkFlowCore'; 
import {
  personOutline,
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
  browsersOutline,
  cubeOutline,
  happyOutline,
  shareSocialOutline,
  storefrontOutline, 
  serverOutline,
  settingsOutline,
  addOutline,
  callOutline,
  analyticsOutline,
  rocketOutline,
  codeSlashOutline,
  qrCodeSharp,

} from 'ionicons/icons';


const router = useRouter();
import { useCallOverlay } from '@/composables/useCallOverlay'
const overlay = useCallOverlay()
function onOpenOverlay(){
  overlay.setEnabled(true)
}


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
import { cn } from "@/lib/utils";
import { useSpring } from "vue-use-spring";
import { shallowRef, onMounted, onUnmounted, watch, computed } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { useI18n } from 'vue-i18n';
import NetworkCanvas from './NetworkCanvas.vue';
// useNetworkStatus现在在NetworkCanvas组件中使用


import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { chatbubblesOutline, chatbubbleOutline, peopleOutline,  planetOutline, atOutline, sparklesOutline, chatbubbleEllipsesOutline, compassOutline, walletOutline, reorderFourOutline, reorderThreeOutline, appsOutline, } from 'ionicons/icons';

import { gunAvatar } from "gun-avatar";

import { closeCircleSharp, copyOutline,  qrCodeOutline, keySharp,  eyeOutline, eyeOffOutline, refreshCircleOutline, warningOutline, lockOpenOutline, checkmarkCircleOutline, alertCircleOutline, scanSharp, menuOutline, expandOutline, arrowBackOutline, refreshOutline, helpCircleOutline, cloudDownloadOutline,closeOutline  } from 'ionicons/icons';
import {  autoSaveStorageServ } from '@/composables/TalkFlowCore';



const { isDark } = useTheme();
const chatFlowStore = getTalkFlowCore();

const { t } = useI18n();
// @ts-ignore
const {
  copyPub, currentUserPub, currentUserAlias, currentUserAlias1, userAvatars, storageServ, gun, isDragging, startY, translateY, cardsTranslateY, velocity, lastTouchTime, lastTouchY, panelVisible: _panelVisible, panelContent: _panelContent, encryptData, decryptData, showToast, currentComponent, previousComponent, switchTo,
  fullscreenModalVisible,
  buddyList, 
} = chatFlowStore;

const avatarurl = computed(() => gunAvatar({ pub: currentUserPub.value, round: false, dark: isDark.value, svg: true } as any));

// 为模态窗口提供与 ChatS.vue 相同的呈现元素效果
const page = ref<any>(null);
const presentingElement = ref<HTMLElement | undefined>(undefined);
onMounted(() => {
  presentingElement.value = (page as any)?.value?.$el || (page as any)?.value || undefined;
});

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

<style scoped>
  @media (min-width: 998px) {
  .avatar-index{
    display: none;
  }
}
/* Settings Content Layout */
.settings-content {
  --padding-top: 16px;
  --padding-bottom: 16px;
  /* --padding-start: 16px;
  --padding-end: 16px; */
  /* height: 100dvh; */
}
/* ion-toolbar{
  --background: transparent;
    background: transparent;
} */


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



/* 文字样式 */


.danger-item .cosmic-icon {
  color: #dc3545;
}

.danger-item .cosmic-icon::before {
  background: radial-gradient(circle, rgba(220, 53, 69, 0.4) 0%, rgba(220, 53, 69, 0) 70%);
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


/* .fullscreen-container ion-page {
  display: block !important;
  position: relative !important;
} */

/* .fullscreen-container ion-content {
  --background: transparent !important;
  height: 100% !important;
  position: relative;
} */

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

</style>