<template>
  <ion-card class="voice-room-demo">
    <ion-card-header>
      <ion-card-title>
        <ion-icon :icon="micOutline" class="title-icon"></ion-icon>
        语音房间功能
      </ion-card-title>
      <ion-card-subtitle>基于Gun.SEA密钥验证的去中心化语音通话</ion-card-subtitle>
    </ion-card-header>
    
    <ion-card-content>
      <div class="demo-info">
        <ion-chip color="primary">
          <ion-icon :icon="lockClosedOutline"></ion-icon>
          <ion-label>端到端加密</ion-label>
        </ion-chip>
        <ion-chip color="secondary">
          <ion-icon :icon="globeOutline"></ion-icon>
          <ion-label>去中心化</ion-label>
        </ion-chip>
        <ion-chip color="tertiary">
          <ion-icon :icon="keyOutline"></ion-icon>
          <ion-label>密钥验证</ion-label>
        </ion-chip>
      </div>
      
      <div class="demo-features">
        <ion-item lines="none">
          <ion-icon :icon="checkmarkOutline" slot="start" color="success"></ion-icon>
          <ion-label>使用Gun.SEA生成房间密钥对</ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon :icon="checkmarkOutline" slot="start" color="success"></ion-icon>
          <ion-label>公钥作为房间ID，私钥验证身份</ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon :icon="checkmarkOutline" slot="start" color="success"></ion-icon>
          <ion-label>WebRTC实时音频通话</ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon :icon="checkmarkOutline" slot="start" color="success"></ion-icon>
          <ion-label>语音检测和音频控制</ion-label>
        </ion-item>
      </div>
      
      <div class="demo-actions">
        <ion-button 
          expand="block" 
          @click="openVoiceRoomTest"
          class="test-button"
        >
          <ion-icon :icon="playOutline" slot="start"></ion-icon>
          打开语音房间测试
        </ion-button>
        
        <ion-button 
          expand="block" 
          fill="outline" 
          @click="showQuickDemo"
          class="demo-button"
        >
          <ion-icon :icon="informationCircleOutline" slot="start"></ion-icon>
          查看使用说明
        </ion-button>
      </div>
    </ion-card-content>
  </ion-card>
  
  <!-- 使用说明弹窗 -->
  <ion-modal :is-open="showDemoModal" @didDismiss="showDemoModal = false">
    <ion-header>
      <ion-toolbar>
        <ion-title>语音房间使用说明</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showDemoModal = false" fill="clear">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <div class="usage-guide">
        <ion-card>
          <ion-card-header>
            <ion-card-title color="primary">🔑 核心概念</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>语音房间使用Gun.SEA密钥对进行身份验证：</p>
            <ul>
              <li><strong>公钥</strong>：作为房间ID，可以公开分享</li>
              <li><strong>私钥</strong>：用于验证身份，只有拥有完整密钥对的人才能加入房间</li>
              <li><strong>网络安全</strong>：网络中只暴露公钥部分，私钥永不传输</li>
            </ul>
          </ion-card-content>
        </ion-card>
        
        <ion-card>
          <ion-card-header>
            <ion-card-title color="secondary">🏠 创建房间</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ol>
              <li>点击"创建房间"标签</li>
              <li>输入你的昵称</li>
              <li>点击"创建房间"按钮</li>
              <li>系统将自动生成密钥对并创建房间</li>
              <li>复制密钥对分享给需要加入的人</li>
            </ol>
          </ion-card-content>
        </ion-card>
        
        <ion-card>
          <ion-card-header>
            <ion-card-title color="tertiary">🚪 加入房间</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ol>
              <li>点击"加入房间"标签</li>
              <li>输入你的昵称</li>
              <li>粘贴完整的房间密钥对(JSON格式)</li>
              <li>点击"验证密钥"确认密钥有效</li>
              <li>点击"加入房间"开始通话</li>
            </ol>
          </ion-card-content>
        </ion-card>
        
        <ion-card>
          <ion-card-header>
            <ion-card-title color="warning">🔧 密钥管理</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ul>
              <li><strong>生成密钥对</strong>：创建新的房间凭证</li>
              <li><strong>密钥验证</strong>：确保密钥对的完整性</li>
              <li><strong>安全存储</strong>：请妥善保管完整密钥对</li>
              <li><strong>分享原则</strong>：只分享给信任的人</li>
            </ul>
          </ion-card-content>
        </ion-card>
        
        <ion-card>
          <ion-card-header>
            <ion-card-title color="success">🎙️ 音频功能</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ul>
              <li><strong>麦克风控制</strong>：一键开启/关闭麦克风</li>
              <li><strong>语音检测</strong>：实时显示说话状态</li>
              <li><strong>成员列表</strong>：查看房间内所有成员</li>
              <li><strong>音频质量</strong>：支持回声消除和降噪</li>
            </ul>
          </ion-card-content>
        </ion-card>
        
        <ion-card color="light">
          <ion-card-header>
            <ion-card-title>⚠️ 注意事项</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ul>
              <li>首次使用需要授权麦克风权限</li>
              <li>密钥对丢失将无法再次进入房间</li>
              <li>建议在安全的环境中生成和存储密钥</li>
              <li>网络不稳定可能影响通话质量</li>
            </ul>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  IonItem,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent
} from '@ionic/vue'
import {
  micOutline,
  lockClosedOutline,
  globeOutline,
  keyOutline,
  checkmarkOutline,
  playOutline,
  informationCircleOutline,
  closeOutline
} from 'ionicons/icons'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()
const router = useRouter()

const showDemoModal = ref(false)

/**
 * 打开语音房间测试页面
 */
function openVoiceRoomTest() {
  router.push('/voice-room-test')
}

/**
 * 显示使用说明
 */
function showQuickDemo() {
  showDemoModal.value = true
}
</script>

<style scoped>
.voice-room-demo {
  margin: 16px 0;
}

.title-icon {
  margin-right: 8px;
  color: var(--ion-color-primary);
}

.demo-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.demo-features {
  margin: 16px 0;
}

.demo-features ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

.demo-actions {
  margin-top: 20px;
}

.test-button {
  margin-bottom: 12px;
}

.demo-button {
  margin-bottom: 0;
}

.usage-guide {
  max-width: 100%;
}

.usage-guide ion-card {
  margin-bottom: 16px;
}

.usage-guide ul,
.usage-guide ol {
  padding-left: 20px;
  margin: 8px 0;
}

.usage-guide li {
  margin: 4px 0;
  line-height: 1.5;
}

.usage-guide strong {
  color: var(--ion-color-primary);
}

/* 响应式设计 */
@media (min-width: 768px) {
  .demo-info {
    justify-content: center;
  }
  
  .usage-guide {
    max-width: 800px;
    margin: 0 auto;
  }
}

/* 动画效果 */
.test-button,
.demo-button {
  transition: all 0.2s ease;
}

.test-button:hover,
.demo-button:hover {
  transform: translateY(-1px);
}

ion-chip {
  transition: all 0.3s ease;
}

ion-chip:hover {
  transform: scale(1.05);
}
</style> 