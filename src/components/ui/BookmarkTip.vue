<template>
  <div class="bookmark-tip" :class="{ expanded: isExpanded }" @click="toggleExpand">
    <div class="bookmark-tip-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isExpanded = ref(false)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.bookmark-tip {
  position: fixed;
  right: -139px; /* 隐藏在页面边缘外 */
  top: 30%;
  transform: translateY(-50%);
  width: 150px;
  height: auto;
  background-color: rgba(255, 255, 255, 0.1); /* 半透明背景 */
  backdrop-filter: blur(10px); /* 毛玻璃效果 */

  padding: 10px;
  border-radius: 8px 0 0 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition:
    right 0.3s ease,
    background-color 0.3s ease;
  cursor: pointer;
}

.bookmark-tip.expanded {
  right: 0; /* 展开后显示在页面内 */
}

.bookmark-tip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* backdrop-filter: blur(10px);  */
}

.bookmark-tip:hover {
  background-color: rgba(255, 255, 255, 0.2); /* 悬停时背景颜色稍微改变 */
  backdrop-filter: blur(10px);
}

.bookmark-tip::before {
  content: '';
  position: absolute;
  left: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 20px solid transparent;
  border-bottom: 20px solid transparent;
  border-right: 20px solid var(--text-color); /* 三角形保持原色 */
}

.bookmark-tip.expanded::before {
  border-right-color: gold; /* 展开后三角形颜色变化 */
}
</style>
