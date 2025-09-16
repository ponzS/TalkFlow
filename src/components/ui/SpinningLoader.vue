<template>
  <div 
    :class="['spinning-loader', size, theme]"
    :style="{ color: customColor }"
  >
    <div class="spinner">
      <div class="circle"></div>
    </div>
    <span v-if="showText" class="loading-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'small' | 'medium' | 'large'
  theme?: 'light' | 'dark' | 'primary'
  text?: string
  showText?: boolean
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  theme: 'primary',
  text: '',
  showText: false,
  color: ''
})

const customColor = computed(() => {
  if (props.color) return props.color
  return ''
})
</script>

<style scoped>
.spinning-loader {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  position: relative;
  display: inline-block;
}

.circle {
  border-radius: 50%;
  border-style: solid;
  animation: spin 1s linear infinite;
}

/* 尺寸变体 */
.small .circle {
  width: 12px;
  height: 12px;
  border-width: 2px;
}

.medium .circle {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

.large .circle {
  width: 24px;
  height: 24px;
  border-width: 3px;
}

/* 主题变体 */
.light .circle {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: rgba(255, 255, 255, 0.8);
}

.dark .circle {
  border-color: rgba(0, 0, 0, 0.1);
  border-top-color: rgba(0, 0, 0, 0.6);
}

.primary .circle {
  border-color: rgba(var(--ion-color-primary-rgb), 0.2);
  border-top-color: rgba(var(--ion-color-primary-rgb), 0.8);
}

/* 自定义颜色 */
.spinning-loader[style*="color:"] .circle {
  border-color: currentColor;
  opacity: 0.2;
}

.spinning-loader[style*="color:"] .circle {
  border-top-color: currentColor;
  border-top-opacity: 1;
}

.loading-text {
  font-size: 12px;
  color: var(--ion-color-medium);
  white-space: nowrap;
}

/* 动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 消息气泡中的特殊样式 */
.message-bubble .spinning-loader {
  margin-left: 4px;
}

.my-message .spinning-loader {
  color: rgba(255, 255, 255, 0.7);
}

.other-message .spinning-loader {
  color: var(--ion-color-medium);
}

/* 适配不同背景 */
.pending-message .spinning-loader .circle {
  border-color: rgba(var(--ion-color-primary-rgb), 0.3);
  border-top-color: var(--ion-color-primary);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .small .circle {
    width: 10px;
    height: 10px;
    border-width: 1.5px;
  }
  
  .loading-text {
    font-size: 11px;
  }
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
  .primary .circle {
    border-color: rgba(var(--ion-color-primary-rgb), 0.3);
    border-top-color: var(--ion-color-primary);
  }
  
  .loading-text {
    color: var(--ion-color-medium);
  }
}

/* 减少动画以节省性能 */
@media (prefers-reduced-motion: reduce) {
  .circle {
    animation-duration: 2s;
  }
}

/* 无障碍支持 */
.spinning-loader {
  role: status;
  aria-label: "正在发送消息";
}

.spinning-loader[aria-label] .loading-text {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style> 