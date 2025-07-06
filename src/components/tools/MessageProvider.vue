<!-- MessageProvider.vue -->
<script setup lang="ts">
import { provide, ref, watch } from 'vue';

// 定义消息状态
const message = ref<string | null>(null);
const type = ref<'info' | 'success' | 'error' | 'warning'>('info');
const isVisible = ref(false);

// 触发消息显示的函数
function showMessage(msg: string, msgType: 'info' | 'success' | 'error' | 'warning' = 'info') {
  message.value = msg;
  type.value = msgType;
  isVisible.value = true;
  // 3秒后自动隐藏
  setTimeout(() => {
    isVisible.value = false;
  }, 3000);
}

// 提供给子组件的全局方法
provide('showMessage', showMessage);
</script>

<template>
  <!-- 插槽，用于包裹应用内容 -->
  <slot></slot>
  <!-- 消息容器，使用过渡动画 -->
  <transition name="liquid-slide">
    <div v-if="isVisible" :class="['message', type]">
      {{ message }}
    </div>
  </transition>
</template>

<style scoped>
.message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 80%;
  text-align: center;
}

/* 不同消息类型的样式 */
.info {
  background-color: #2196F3; /* 蓝色 */
}

.success {
  background-color: #4CAF50; /* 绿色 */
}

.error {
  background-color: #F44336; /* 红色 */
}

.warning {
  background-color: #FF9800; /* 橙色 */
}

/* 液态滑动动画 */
.liquid-slide-enter-active,
.liquid-slide-leave-active {
  transition: all 0.5s ease;
}

.liquid-slide-enter-from,
.liquid-slide-leave-to {
  transform: translateX(-50%) translateY(100%);
  opacity: 0;
}

.liquid-slide-enter-to,
.liquid-slide-leave-from {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}
</style>