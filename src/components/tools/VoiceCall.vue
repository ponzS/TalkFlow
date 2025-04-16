<!-- src/components/VoiceCall.vue -->
<template>
    <div v-if="callState.isActive || hasCallRequest" class="voice-call-overlay">
      <div v-if="callState.isActive" class="call-active">
        <h2>正在通话</h2>
        <p>对方: {{ callState.participants.find(pub => pub !== currentUserPub) }}</p>
        <p>通话时长: {{ callDuration }}</p>
        <audio ref="remoteAudio" autoplay></audio>
        <ion-button color="danger" @click="hangUp">挂断</ion-button>
      </div>
  
      <ion-modal :is-open="hasCallRequest" @didDismiss="dismissRequest">
        <ion-header>
          <ion-toolbar>
            <ion-title>通话申请</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p>来自 {{ callRequestFrom }} 的通话申请</p>
          <ion-button color="success" @click="acceptCall(callState.roomId || generateRoomId(currentUserPub!, callRequestFrom!), callRequestFrom!)">
            接受
          </ion-button>
          <ion-button color="danger" @click="rejectCall(callState.roomId || generateRoomId(currentUserPub!, callRequestFrom!), callRequestFrom!)">
            拒绝
          </ion-button>
        </ion-content>
      </ion-modal>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, watch } from 'vue';
  import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue';
  import { useVoiceCall } from '@/composables/useVoiceCall';

  const voiceCall = useVoiceCall();
  const { callState, hasCallRequest, callRequestFrom, remoteStream, acceptCall, rejectCall, hangUp } = voiceCall;
  const chatFlow = getTalkFlowCore();
  const { currentUserPub } = chatFlow;
  
  const remoteAudio = ref<HTMLAudioElement | null>(null);
  const callDuration = computed(() => {
    if (!callState.value.startTime) return '0秒';
    const seconds = Math.floor((Date.now() - callState.value.startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  });
  
  function generateRoomId(pubA: string, pubB: string): string {
    return pubA < pubB ? `${pubA}_${pubB}_${Date.now()}` : `${pubB}_${pubA}_${Date.now()}`;
  }
  
  function dismissRequest() {
    if (hasCallRequest.value && callRequestFrom.value && callState.value.roomId) {
      rejectCall(callState.value.roomId, callRequestFrom.value); // 关闭模态时拒绝
    }
    hasCallRequest.value = false;
    callRequestFrom.value = null;
  }
  
  watch(remoteStream, (newStream) => {
    if (remoteAudio.value && newStream) {
      remoteAudio.value.srcObject = newStream;
    }
  });
  </script>
  
  <style scoped>
  .voice-call-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .call-active {
    background: white;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
  }
  </style>