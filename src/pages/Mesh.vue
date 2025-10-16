
<template>
  <ion-page>

  <!-- 顶部栏 -->
  <ion-header :translucent="true"  collapse="fade">
    <ion-toolbar >
      <!-- 左侧按钮组 -->
      <ion-buttons slot="start">
               <ion-back-button :text="$t('back')" ></ion-back-button>
      </ion-buttons>
      
      <!-- 右侧按钮组 -->
      <ion-buttons slot="end">
     
    
      </ion-buttons>
    </ion-toolbar>

    <ion-toolbar v-if="!networkCanvasComponent?.showCover" style="--background: transparent; gap:8px;" >

    <ion-buttons slot="start">
    <ion-button  fill="clear" @click="openStrangerRelayModal">
          <ion-icon :icon="cloudDownloadOutline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" @click="toggleLegend">
          <ion-icon :icon="helpCircleOutline"></ion-icon>
        </ion-button>
     
       
    </ion-buttons>
      
      <!-- 右侧按钮组 -->
      <ion-buttons slot="end" >
           <!-- 网格模式切换开关 - 只在showCover为false时显示 -->
        <div  class="grid-mode-toggle" style="margin: 0 15px;">
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
  <div class="canvas-container" >
    <!-- 3D网络拓扑图组件 -->
        <NetworkCanvas 
          ref="networkCanvasComponent" 
          @view-mode-changed="onViewModeChanged"
        />
  </div>
  </ion-content>

    
</ion-page>
</template>

<script lang="ts" setup>
import { cn } from "@/lib/utils";
import { useSpring } from "vue-use-spring";
import { ref, shallowRef, onMounted, onUnmounted, watch, computed } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { useI18n } from 'vue-i18n';
import NetworkCanvas from '@/components/phone/NetworkCanvas.vue';


import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { chatbubblesOutline, chatbubbleOutline, peopleOutline, personOutline, planetOutline, settingsOutline, rocketOutline, browsersOutline, atOutline, sparklesOutline, chatbubbleEllipsesOutline, compassOutline, walletOutline, reorderFourOutline, reorderThreeOutline, appsOutline, serverOutline, happyOutline } from 'ionicons/icons';
import { IonFooter, IonToolbar, IonContent, IonIcon, IonHeader, 
    IonMenu, IonSplitPane, IonTitle,
    menuController,IonPage,
    IonBackButton

} from '@ionic/vue';
import { gunAvatar } from "gun-avatar";
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