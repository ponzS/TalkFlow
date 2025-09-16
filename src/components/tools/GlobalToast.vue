<!-- src/components/LaserToast.vue -->
<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { computed } from 'vue';

const { messages } = useToast();

// 计算容器高度，基于消息数量和固定高度
const containerHeight = computed(() => {
  const messageCount = messages.value.length;
  const baseHeight = 44; // 每条消息基础高度
  const spacing = 12; // 消息间距
  return messageCount > 0 ? `${messageCount * baseHeight + (messageCount > 1 ? (messageCount - 1) * spacing : 0)}px` : '0px';
});

// 计算每条消息的位置，从底部向上排列
const toastStyles = computed(() => {
  const styles: any[] = [];
  const messageCount = messages.value.length;
  const baseHeight = 44;
  const spacing = 12;

  messages.value.forEach((msg, index) => {
    const offsetFromBottom = (messageCount - 1 - index) * (baseHeight + (messageCount > 1 ? spacing : 0));
    styles.push({
      bottom: `${offsetFromBottom}px`,
    });
  });
  return styles;
});
</script>

<template>
  <div class="toast-container">
    <transition-group name="liquid-flow" tag="div">
      <div class="liquid-ok" :style="{ height: containerHeight }" key="container">
        <div
          v-for="(msg, index) in messages"
          :key="msg.id"
          :class="['liquid-toast', msg.type]"
          :style="toastStyles[index]"
        >
          {{ msg.text }}
        </div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 10%; /* 从底部 10% 开始 */
  left: 0;
  width: 100%;
  z-index: 1000;
  pointer-events: none;
}

.liquid-ok {
  position: absolute;
  bottom: 0;
  left: 0; /* 轻微内缩 */
  width: 200px; /* 固定宽度 */
  background: linear-gradient(135deg, rgba(40, 40, 40, 0.9), rgba(20, 20, 20, 0.7)); /* 液态深灰渐变 */
  border-radius: 0 10px 10px 0; /* 左侧贴边，右侧圆润 */
  transition: height 0.4s ease-in-out; /* 高度过渡动画 */
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}

.liquid-toast {
  position: absolute;
  left: 0;
  width: 100%; /* 占用容器全宽 */
  min-height: 44px; /* 最小高度 */
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
  white-space: normal; /* 支持文本换行 */
  word-break: break-word; /* 长词换行 */
  line-height: 1.4; /* 行高增加可读性 */
  height: auto; /* 高度自适应内容 */
}

/* 文字颜色根据类型变化 */
.info {
  color: #66ccff; /* 浅青色 */
}

.success {
  color: #99ff99; /* 浅绿色 */
}

.error {
  color: #ff6666; /* 浅红色 */
}

.warning {
  color: #ffcc66; /* 浅黄色 */
}

/* 液态流动动画 */
@keyframes liquidFlow {
  0% {
    transform: translateY(20px);
    opacity: 0;
  }
  50% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes liquidFade {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-20px);
    opacity: 0;
  }
}

.liquid-flow-enter-active {
  animation: liquidFlow 0.4s ease-out;
}

.liquid-flow-leave-active {
  animation: liquidFade 0.4s ease-in;
}

.liquid-flow-move {
  transition: all 0.4s ease;
}
</style>