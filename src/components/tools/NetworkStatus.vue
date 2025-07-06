<!-- src/components/NetworkStatus.vue -->
<script setup lang="ts">
import { useNetwork } from '@/composables/useNetwork';
import { useChatFlow } from '@/composables/TalkFlowCore';
import { computed } from 'vue';

const { gun } = getTalkFlowCore();
const { isOnline, peersConnected } = useNetwork(gun); // 传递 gun 实例
const isDisconnected = computed(() => !isOnline.value || !peersConnected.value);
</script>

<template>
  <transition name="laser-slide">
    <div v-if="isDisconnected" class="network-status">
      {{ isOnline ? '网络已连接，但节点不可达' : '网络已断开' }}
    </div>
  </transition>
</template>

<style scoped>
.network-status {
  position: fixed;
  bottom: 20px;
  left: 0;
  font-size: 16px;
  font-weight: bold;
  font-family: 'Orbitron', sans-serif;
  text-transform: uppercase;
  padding: 0 16px;
  white-space: nowrap;
  z-index: 1000;
  background: linear-gradient(90deg, #ff4040, #ff8c00, #ff4040);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: laserFlow 4s infinite linear;
}

@keyframes laserFlow {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}

.laser-slide-enter-active,
.laser-slide-leave-active {
  transition: transform 0.6s ease-in-out;
}

.laser-slide-enter-from,
.laser-slide-leave-to {
  transform: translateX(-100%);
}

.laser-slide-enter-to,
.laser-slide-leave-from {
  transform: translateX(0);
}
</style>