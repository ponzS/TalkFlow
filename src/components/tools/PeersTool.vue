<!-- src/components/tools/NetworkStatus.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import router from '@/router';
import { IonIcon } from '@ionic/vue';
import { addCircleOutline, addCircleSharp, closeCircleSharp } from 'ionicons/icons';
import { storageServ } from '@/services/globalServices';

const {
  networkStatus,
  peersStatus,
  currentMode,
  peerStatuses,
  peersList,
  enabledPeer,
  addPeer,
  removePeer,
  enablePeer,
  disablePeer,
} = useNetworkStatus(storageServ);

const newPeerUrl = ref('');
</script>

<template>
  <div class="liquid-container">
    <div class="back-button1">
      <div class="back-button" @click="() => router.go(-1)">
        <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
      </div>
    </div>
    <br />
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
    <!-- 添加节点 -->
    <div class="add-peer">
      <input v-model="newPeerUrl" placeholder="Relay URL" @keyup.enter="addPeer(newPeerUrl)" />
      <div >
      <ion-icon
              :icon="addCircleSharp"
             class="addlink"
              @click="addPeer(newPeerUrl)"
            /></div>
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
  </div>
</template>

<style scoped>
.addlink{
  /* color: #000000; */
width: 39px;
height: 39px;
display: flex;
  align-items: center;
  justify-content: center;
}
html, body {
  height: 100%;
  margin: 0;
  overflow: hidden;
}

.liquid-container {
  padding: 5px 20px;
  background: linear-gradient(135deg, #00000000, #5151E5);
  border-radius: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.liquid-container::before {
  content: '';
  position: absolute;
  width: 150px;
  height: 150px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  animation: liquid-flow 8s infinite ease-in-out;
  top: -75px;
  left: -75px;
}

.liquid-container::after {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  animation: liquid-flow 10s infinite reverse ease-in-out;
  bottom: -100px;
  right: -100px;
}

.status-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  background: rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.25);
  font-size: 14px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.add-peer input:hover,
.add-peer input:focus {
  transform: scale(1.02);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  outline: none;
}

.add-peer button {
  padding: 10px 20px;
  background: linear-gradient(45deg, #66ccff, #99eeff);
  border: none;
  border-radius: 15px;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.add-peer button:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
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
  /* animation: float 3s ease-in-out infinite; */
}

.peer-scroll-container {
  max-height: 390px;
  overflow-y: auto;
  padding-right: 10px;
  flex: 1;
}

.peer-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.peer-scroll-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
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
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
  border-radius: 15px;
  margin-bottom: 15px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.peer-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
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
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.peer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 15px;
}

ion-toggle {
  --background: rgba(255, 255, 255, 0.2);
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

/* Animations */
@keyframes liquid-flow {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(30px, 30px) scale(1.1);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.03);
    opacity: 0.9;
  }
}

.back-button1 {
  width: 100%;
  justify-self: start;
  margin-top: 60px;
}

.back-button {
  background-color: #ffffff4b;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  padding-right: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease-in-out;
}

.back-button:active {
  background-color: #5151E5;
  transition: all 0.3s ease-in-out;
}

.i-material-symbols-arrow-back-ios-new-rounded {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m9.55 12l7.35 7.35q.375.375.363.875t-.388.875t-.875.375t-.875-.375l-7.7-7.675q-.3-.3-.45-.675t-.15-.75t.15-.75t.45-.675l7.7-7.7q.375-.375.888-.363t.887.388t.375.875t-.375.875z'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}
</style>