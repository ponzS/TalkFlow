<script setup lang="ts">
import { ref } from 'vue';
// import { useNetworkStatus } from '@/composables/useNetworkStatus';
// import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonIcon,
  IonModal, IonToggle // 添加 IonModal
} from '@ionic/vue';
import { addCircleSharp, closeCircleSharp, helpCircleOutline, closeOutline } from 'ionicons/icons';
import RelayMode from '@/components/GUNtest/RelayMode.vue';

// const router = useRouter();
// const {
//   networkStatus,
//   peersStatus,
//   currentMode,
//   peerStatuses,
//   peersList,
//   enabledPeer,
//   addPeer,
//   removePeer,
//   enablePeer,
//   disablePeer,
// } = useNetworkStatus();

// const newPeerUrl = ref('');
const showHelpModal = ref(false); // 添加帮助模态框状态
</script>

<template>
  <ion-page>
    <ion-header :translucent="true"  collapse="fade" style="--background:transparent !important">
      <ion-toolbar class="liquid-toolbar" style="--background:transparent !important">
        <ion-buttons slot="start">
          <ion-back-button text="" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>Network Status</ion-title>
   
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true"  >

      <RelayMode/>

      <!-- <div class="liquid-container">
        <div class="status-item">
          <span class="label">Net:</span>
          <span :class="['indicator', networkStatus]">
            {{ networkStatus === 'online' ? 'Online' : 'Offline' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">Node:</span>
          <span :class="['indicator', peersStatus]">
            {{ peersStatus === 'connected' ? 'Connected' : 'Not connected' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">Mode:</span>
          <span :class="['indicator', currentMode]">
            {{ currentMode === 'relay' ? 'Relay' : 'e2e' }}
          </span>
        </div>
    
        <div class="add-peer">
          <input v-model="newPeerUrl" placeholder="Relay URL" @keyup.enter="addPeer(newPeerUrl)" />
          <div>
            <ion-icon
              :icon="addCircleSharp"
              class="addlink"
              @click="addPeer(newPeerUrl)"
            />
          </div>
        </div>
        <div class="peer-list">
          <h3>Relays</h3>
          <div class="peer-scroll-container">
            <div v-for="peer in peersList" :key="peer" class="peer-item">
              <div class="peer-header">
                <div :class="['status', peerStatuses[peer]]">
                  {{ peerStatuses[peer] || 'checking' }}
                </div>
              </div>
              <div class="peer-content">
                <span class="peer-url">{{ peer }}</span>
              </div>
              <div class="peer-actions">
                <ion-toggle
                  :checked="enabledPeer === peer"
                  @ionChange="enabledPeer === peer ? disablePeer() : enablePeer(peer)"
                  color="primary"
                ></ion-toggle>
                <ion-icon
                  :icon="closeCircleSharp"
                  class="remove-icon"
                  @click="removePeer(peer)"
                />
              </div>
            </div>
          </div>
        </div>
      </div> -->

      <!-- Help Modal -->
      <ion-modal
        :is-open="showHelpModal"
        css-class="help-modal"
        @didDismiss="showHelpModal = false"
        :backdrop-dismiss="true"
        :initial-breakpoint="0.75"
        :breakpoints="[0, 0.75, 1]"
      >
        <ion-content class="ion-padding">
          <ion-header>
            <ion-toolbar>
              <ion-title>{{ $t('Help') }}</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="showHelpModal = false">
                  <ion-icon color="dark"  :icon="closeOutline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <div class="help-content">
            <h2>{{ $t('HowToUse') }}</h2>
            <ion-list>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{ $t('relaytalk') }}
                </ion-label>
              </ion-item>
            
            </ion-list>

           
          </div>

          <ion-button expand="block" color="dark" @click="showHelpModal = false">
            {{ $t('Close') }}
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.addlink {
  width: 39px;
  height: 39px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Ionic Toolbar */
.liquid-toolbar {
  --border-color: transparent;
}

/* Ionic Content */
.liquid-content {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

/* Original Container Styles */
.liquid-container {
  padding: 15px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.status-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  background: rgba(130, 130, 130, 0.1);
  padding: 10px;
  border-radius: 15px;
  transition: transform 0.3s ease;
}

.status-item:hover {
  transform: scale(1.02);
}

.label {
  font-weight: 500;
  margin-right: 10px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.indicator {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 14px;
  backdrop-filter: blur(5px);
}

.indicator.online,
.indicator.connected,
.indicator.relay {
  background: linear-gradient(45deg, #99ff99, #66ffcc);
  color: #333;
}

.indicator.offline,
.indicator.disconnected,
.indicator.direct {
  background: linear-gradient(45deg, #ff6666, #ff9999);
}

.add-peer {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.add-peer input {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 15px;
  background: rgba(134, 134, 134, 0.25);
  font-size: 14px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.add-peer input:hover,
.add-peer input:focus {
  transform: scale(1.02);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  outline: none;
}

.peer-list {
  margin-top: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.peer-list h3 {
  font-size: 18px;
  margin-bottom: 15px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.peer-scroll-container {
  border-radius: 10px;
  max-height: 390px;
  overflow-y: auto;
  flex: 1;
}

.peer-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.peer-scroll-container::-webkit-scrollbar-track {
  background: rgba(125, 125, 125, 0.451);
  border-radius: 10px;
}

.peer-scroll-container::-webkit-scrollbar-thumb {
  background: linear-gradient(45deg, #66ccff, #99eeff);
  border-radius: 10px;
}

.peer-scroll-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(45deg, #00b7ff, #66ddff);
}

.peer-item {
  padding: 15px;
  background: linear-gradient(135deg, rgba(127, 127, 127, 0.15), rgba(255, 255, 255, 0.05));
  border-radius: 15px;
  margin-bottom: 15px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.peer-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.status {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  text-align: center;
  backdrop-filter: blur(5px);
  animation: pulse 2s infinite ease-in-out;
}

.status.connected {
  background: linear-gradient(45deg, #99ff99, #66ffcc);
  color: #333;
}

.status.disconnected {
  background: linear-gradient(45deg, #ff6666, #ff9999);
}

.status.checking {
  background: linear-gradient(45deg, #ffcc66, #ffdd99);
  color: #333;
}

.peer-content {
  margin-bottom: 15px;
}

.peer-url {
  display: block;
  word-break: break-all;
  font-size: 14px;
  line-height: 1.4;
  padding: 5px 10px;
  background: rgba(124, 124, 124, 0.1);
  border-radius: 10px;
}

.peer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 15px;
}

ion-toggle {
  --background: rgba(128, 128, 128, 0.2);
  --background-checked: #66ccff;
  --handle-background: #fff;
  --handle-background-checked: #fff;
  width: 50px;
  height: 24px;
}

.remove-icon {
  color: #ff6666;
  font-size: 30px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.remove-icon:hover {
  transform: scale(1.1);
  color: #ff9999;
}

/* Help Modal */
.help-modal {
  --border-radius: 16px;

}

.help-modal ion-toolbar {
  --border-width: 0;
  --background: transparent;
}

.help-content {
  padding: 0 0 20px;
}

.help-content h2 {
  font-size: 1.25rem;
  margin: 20px 0 10px;
  color: #333;
}

.help-content h3 {
  font-size: 1.1rem;
  margin: 15px 0 10px;
  color: #333;
}

.help-content ion-list {
  background: transparent;
  margin-bottom: 15px;
}

.help-content ion-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.help-content ion-label {
  color: #666 !important;
  font-size: 1rem;
}

ion-button[color="dark"] {
  --background: #333;
  --border-radius: 12px;
  height: 44px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

ion-button[color="dark"]:hover {
  --background: #444;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}
</style>