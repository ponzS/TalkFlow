<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>语音房间测试</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="ion-padding">
      <div v-if="!isInRoom">
        <!-- 生成密钥对 -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>生成密钥对</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button expand="block" @click="handleGenerateKeyPair" class="mt-4">
              生成密钥对
            </ion-button>
            <div v-if="keyPair">
              <ion-item>
                <ion-label position="floating">房间 ID</ion-label>
                <ion-input :value="roomId" readonly></ion-input>
              </ion-item>
              <ion-item>
                <ion-label position="floating">密钥对</ion-label>
                <ion-textarea :value="keyPair" readonly rows="6"></ion-textarea>
              </ion-item>
              <ion-button fill="outline" expand="block" @click="handleCopyKeyPair" class="mt-2">
                复制密钥对
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- 加入房间 -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>加入房间</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label position="floating">密钥对</ion-label>
              <ion-textarea
                v-model="inputKeyPair"
                placeholder="粘贴密钥对"
                rows="6"
              ></ion-textarea>
            </ion-item>
            <ion-button expand="block" @click="handleJoinRoom" class="mt-4">
              加入房间
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>

      <div v-else>
        <ion-card>
          <ion-card-header>
            <ion-card-title>房间信息</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>房间 ID: {{ roomId }}</p>
            <p>状态: {{ roomStatus.state === 'connected' ? '通话中' : roomStatus.state === 'connecting' ? '正在连接' : '未连接' }}</p>
            <p v-if="roomStatus.error">错误: {{ roomStatus.error }}</p>
            <ion-list>
              <ion-list-header>在线用户</ion-list-header>
              <ion-item v-for="user in users" :key="user.id">
                <ion-label>用户 {{ user.id.slice(0, 8) }}...</ion-label>
              </ion-item>
            </ion-list>
            <ion-button expand="block" color="danger" @click="leaveRoom" class="mt-4">
              退出房间
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonList,
  IonListHeader,
} from '@ionic/vue';
import { useVoiceRoom } from '@/composables/useVoiceCall';

const { isInRoom, roomId, roomStatus, users, generateKeyPair, joinRoom, leaveRoom } = useVoiceRoom();

const keyPair = ref('');
const inputKeyPair = ref('');

const handleGenerateKeyPair = async () => {
  const result = await generateKeyPair();
  if (result) {
    keyPair.value = result.keyPair;
  }
};

const handleJoinRoom = async () => {
  if (!inputKeyPair.value) return;
  await joinRoom(inputKeyPair.value);
};

const handleCopyKeyPair = async () => {
  try {
    await navigator.clipboard.writeText(keyPair.value);
    chatFlow.showToast('已复制密钥对', 'success');
    await chatFlow.triggerLightHaptic();
  } catch (err) {
    console.error('复制失败:', err);
    chatFlow.showToast('复制失败', 'danger');
  }
};

const chatFlow = getTalkFlowCore();
</script>

<style scoped>
.mt-4 {
  margin-top: 1rem;
}
.mt-2 {
  margin-top: 0.5rem;
}
</style>