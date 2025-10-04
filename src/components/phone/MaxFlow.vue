<template>
  <ion-page>
    <ion-header :translucent="true"   collapse="fade">
      <ion-toolbar>
        <ion-segment v-model="selectedSegment" style="padding:2px 0;margin: 0 auto;">
          <ion-segment-button value="moment">
            <ion-label>Moment</ion-label>
          </ion-segment-button>
          <ion-segment-button value="aichat">
            <ion-label>AiChat</ion-label>
          </ion-segment-button>
        
          <ion-segment-button value="relay">
            <ion-label>Relay</ion-label>
          </ion-segment-button>
          <!-- <ion-segment-button value="tool">
            <ion-label>TApp</ion-label>
          </ion-segment-button>
          <ion-segment-button value="setting">
            <ion-label>Setting</ion-label>
          </ion-segment-button> -->
          
          <!-- 
            <ion-segment-button value="game">
            <ion-label>Game</ion-label>
          </ion-segment-button> -->
        </ion-segment>
      </ion-toolbar>


         <ion-toolbar v-if="selectedSegment === 'moment'">
      <ion-buttons slot="start">
        <ion-button @click="goToMyNode" fill="clear">
          <ion-icon :icon="personCircleOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
      
      <ion-title>Friend Feed</ion-title>
      
      <ion-buttons slot="end">
      
        <ion-button @click="openPostModal" fill="clear">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>


    </ion-header>

    <ion-content :scroll-y="false">
      <!-- Moment View -->
      <div v-if="selectedSegment === 'moment'" class="view-container">
 
       <Moment ref="momentsRef"/>
     
      </div>

      <!-- AiChat View -->
      <div v-show="selectedSegment === 'aichat'" class="view-container">
       
        <!-- <AiChatSimplemax ref="aiChatRef"/> -->
        <WebLLM/>
      </div>



      <!-- Relay View -->
      <div v-show="selectedSegment === 'relay'" class="view-container" style="overflow-y:auto;">
     <!-- <RelayMode/> -->
      <RelayGroup/>
      </div>

      <!-- Tool View -->
      <!-- <div v-show="selectedSegment === 'tool'" class="view-container">
      <gunOS/>
      </div>

 <div v-if="selectedSegment === 'setting'" class="view-container">
     <settings/>
      </div> -->
            <!-- Game View -->
      <!-- <div v-show="selectedSegment === 'game'" class="view-container">
        <div class="content-placeholder">
          <ion-icon name="game-controller-outline" size="large"></ion-icon>
          <h2>Game</h2>
          <p>这里显示游戏相关内容</p>
        </div>
      </div> -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { 
  IonPage, 
  IonHeader, 
  IonContent, 
  IonLabel, 
  IonSegment, 
  IonSegmentButton, 
  IonToolbar,
  IonIcon,
  IonButton,
  IonButtons,
  IonTitle
} from '@ionic/vue';
import AiChatSimple from './AiChatSimple.vue';
import Moment from './Moment.vue';
import RelayMode from '../GunVue/RelayMode.vue';
import AiChatSimplemax from './AiChatSimplemax.vue';
const router = useRouter();
const chatFlow = getTalkFlowCore();
const { currentUserPub, userAvatars, setSelectedFriendPub, showToast } = chatFlow;
import {
  chatbubblesOutline, heart, heartOutline, createOutline, chevronDownOutline,
  chevronUpOutline, personCircleOutline, copyOutline, shareOutline, addOutline,
  sendOutline, closeOutline, imageOutline, settingsOutline
} from 'ionicons/icons';
function goToMyNode() { 
   router.push({ path: '/friend-profile', query: { pub: currentUserPub.value } });

}
// 从localStorage加载上次选择的segment，如果没有则默认为'moment'
const loadSelectedSegment = (): string => {
  try {
    const saved = localStorage.getItem('maxflow_selected_segment');
    return saved || 'moment';
  } catch (error) {
    console.warn('Failed to load selected segment from localStorage:', error);
    return 'moment';
  }
};
const momentsRef = ref<InstanceType<typeof Moment> | null>(null);
const  openPostModal = () => {
  if (momentsRef.value) {
    momentsRef.value.openPostModal();
  }
};
// 简化的状态管理，只负责初始化，不处理持久化
const selectedSegment = ref(loadSelectedSegment());

// AiChatSimple 组件引用
const aiChatRef = ref<InstanceType<typeof AiChatSimple> | null>(null);

// 暴露selectedSegment和AiChatSimple的方法给父组件
defineExpose({
  selectedSegment,
  // 代理 AiChatSimple 的方法
  handleNewMessage: (message: string, onComplete?: () => void) => {
    if (aiChatRef.value && aiChatRef.value.handleNewMessage) {
      return aiChatRef.value.handleNewMessage(message, onComplete);
    }
    console.warn('AiChatSimple ref not available');
  },
  stopGeneration: () => {
    if (aiChatRef.value && aiChatRef.value.stopGeneration) {
      return aiChatRef.value.stopGeneration();
    }
  },
  get isSending() {
    return aiChatRef.value?.isSending || false;
  },
  get isAiTyping() {
    return aiChatRef.value?.isAiTyping || false;
  }
});

</script>

<style scoped>



.view-container {
  height: 100%;

}

.content-placeholder {
  text-align: center;
  padding: 2rem;
}

.content-placeholder ion-icon {
  margin-bottom: 1rem;
  color: var(--ion-color-primary);
}

.content-placeholder h2 {
  margin: 1rem 0;
  color: var(--ion-color-dark);
}

.content-placeholder p {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}
</style>