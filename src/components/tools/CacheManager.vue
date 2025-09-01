<template>
  <div class="liquid-container">


    <div class="back-button-container">
      <div class="back-button" @click="() => router.go(-1)">
        <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
      </div>
    </div>


    <!-- 标题 -->
    

    <!-- 状态信息和可视化 -->
    <div class="status-section">
      <h2 class="liquid-title">Cache Manager</h2>
      <div class="status-info">
        <p class="liquid-text">Cache Size: {{ cacheSize }} items</p>
        
      </div>

      <div class="status-info">
        <p class="liquid-text">Memory Usage: {{ memoryInMB }} MB</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: memoryProgress + '%' }"></div>
        </div>
      </div>

      <p v-if="message" class="liquid-message">{{ message }}</p>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <!-- <button
        class="liquid-button"
        :class="{ 'loading': isLoading }"
        @click="checkCacheStatus"
        :disabled="isLoading"
      >
        <span class="button-text">Check Cache Status</span>
        <span class="ripple" v-if="isLoading"></span>
      </button> -->
      <button
        class="liquid-button danger"
        :class="{ 'loading': isLoading }"
        @click="clearCache"
        :disabled="isLoading"
      >
        <span class="button-text">Clear Cache</span>
        <span class="ripple" v-if="isLoading"></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import gunIonicAdapter from '@/composables/gun-ionic-adapter.ts';
import router from '@/router';

const cacheSize = ref(0);
const memoryBytes = ref(0);
const message = ref('');
const isLoading = ref(false);

// 内存使用 MB 计算
const memoryInMB = computed(() => {
  const mb = memoryBytes.value / (1024 * 1024);
  return mb.toFixed(2);
});

// 环形进度条计算
const circumference = 2 * Math.PI * 40; // 半径 40 的周长
const cacheProgressOffset = computed(() => {
  const progress = Math.min(cacheSize.value / 10000, 1); // 假设上限 1000 项
  return circumference * (1 - progress);
});

// 线性进度条计算
const memoryProgress = computed(() => {
  return Math.min((memoryBytes.value / (1024 * 1024)) / 100, 1) * 5; // 假设上限 100 MB
});

const checkCacheStatus = async () => {
  isLoading.value = true;
  message.value = '';
  try {
    const status = gunIonicAdapter.getCacheStatus();
    cacheSize.value = status.size;
    memoryBytes.value = status.memoryBytes;
    message.value = `Cache status checked: ${status.size} items, ${memoryInMB.value} MB`;
    console.log(message.value);
  } catch (error) {
    message.value = `Failed to check cache status: ${error.message}`;
    console.error(message.value);
  } finally {
    isLoading.value = false;
  }
};

const clearCache = async () => {
  isLoading.value = true;
  message.value = '';
  try {
    await gunIonicAdapter.clearCache();
    cacheSize.value = 0;
    memoryBytes.value = 0;
    message.value = 'Cache cleared successfully!';
    console.log(message.value);
  } catch (error) {
    message.value = `Failed to clear cache: ${error.message}`;
    console.error(message.value);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await checkCacheStatus();
});
</script>

<style scoped>
.back-button-container {
  position: fixed;
  top: 70px;
  left: 16px;
}

.back-button:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.55);
}

.back-button:active {
  background: #5151E5;
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
.back-button {
  background: rgba(255, 255, 255, 0.35);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
 
  transition: transform 0.3s ease, background 0.3s ease;
  cursor: pointer;
  padding-right: 5px;
}
/* Liquid Container */
.liquid-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #00000000, #5151E5);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
}

/* Liquid Background Effects */
.liquid-container::before {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  animation: liquid-flow 10s infinite ease-in-out;
  top: -100px;
  left: -100px;
}

.liquid-container::after {
  content: '';
  position: absolute;
  width: 150px;
  height: 150px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  animation: liquid-flow 8s infinite reverse ease-in-out;
  bottom: -75px;
  right: -75px;
}

/* Liquid Title */
.liquid-title {

  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 32px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  animation: float 3s ease-in-out infinite;
}

/* Status Section */
.status-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 600px;
  margin-bottom: 32px;
  margin-top: 100px;
}

.status-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  transition: transform 0.3s ease;
}

.status-info:hover {
  transform: scale(1.02);
}

.liquid-text {
  font-size: 1.5rem;

  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.liquid-message {
  font-size: 1rem;
  color: #99ff99;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  animation: messageFade 0.5s ease-in;
}

/* Progress Ring */
.progress-ring {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.progress-circle {
  transform: rotate(-90deg);
  transition: stroke-dashoffset 0.5s ease;
}

.progress-text {
  position: absolute;
  font-size: 1rem;
  /* color: #fff; */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Progress Bar */
.progress-bar {
  width: 150px;
  height: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(45deg, #66ccff, #99eeff);
  transition: width 0.5s ease;
}

/* Actions */
.actions {
  display: flex;
  gap: 20px;
  justify-content: center;
}

/* Liquid Button */
.liquid-button {
  position: relative;
  width: 180px;
  padding: 14px 20px;
  font-size: 1.1rem;
  color: #fff;
  background: linear-gradient(45deg, #72EDF2, #5151E5);
  border: none;
  border-radius: 15px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.liquid-button.danger {
  background: linear-gradient(45deg, #ff6666, #ff9999);
}

.liquid-button:hover:not(.loading):not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.liquid-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-text {
  position: relative;
  z-index: 1;
}

.ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: rippleEffect 1.5s infinite;
  z-index: 0;
}

.liquid-button.loading {
  pointer-events: none;
}

/* Animations */
@keyframes liquid-flow {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(50px, 50px) scale(1.2); }
  100% { transform: translate(0, 0) scale(1); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes messageFade {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes rippleEffect {
  0% { width: 0; height: 0; opacity: 1; }
  100% { width: 200px; height: 200px; opacity: 0; }
}
</style>