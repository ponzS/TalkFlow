<template>
  <!-- 仅当 visible=true 时可见，且附带一个过渡 -->
  <transition name="futuristic-fade">
    <div v-if="visible" class="scanner-overlay">
      <!-- 半透明黑背景，可调节不透明度 -->
      <div class="scanner-backdrop"></div>

      <!-- 核心扫描容器：居中摆放 -->
      <div class="scanner-container">
        <!-- 1) 旋转圆环 (SVG + CSS 动画) -->
        <div class="rotating-ring">
          <svg viewBox="0 0 100 100">
            <!-- 这个圆弧可用 stroke-dasharray + stroke-dashoffset 做出动态效果 -->
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#gradientRing)"
              stroke-width="4"
              fill="none"
            ></circle>
            <!-- 定义渐变 -->
            <defs>
              <linearGradient id="gradientRing" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0ff" />
                <stop offset="100%" stop-color="#ff0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <!-- 2) 中心“立体块”或发光核心；这里用一个半透明元素演示 -->
        <!-- <div class="crystal-core"></div> -->

        <!-- 3) 上下往返的激光扫描线 -->
        <!-- <div class="laser-line"></div> -->

        <!-- 4) 文字提示 -->
        <!-- <div class="scanner-text">正在扫描..</div> -->
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ================ Props ================
 * 父组件可以使用 <FuturisticScanner :visible="scanning"/> 来控制是否可见
 */
interface Props {
  visible: boolean
}
const props = defineProps<Props>()
</script>

<style scoped>
/*
  =============== 过渡动画 ===============
  你可自行修改这里的进入、离开时间/曲线
*/
.futuristic-fade-enter-active,
.futuristic-fade-leave-active {
  transition: opacity 0.4s ease;
}
.futuristic-fade-enter-from,
.futuristic-fade-leave-to {
  opacity: 0;
}

/*
  =============== 整个扫描层的容器 ===============
  在可见时，全屏覆盖
*/
.scanner-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none; /* 允许点击穿透到后面，根据需求决定要不要 */
}

/* 半透明遮罩背景 */
.scanner-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.47);
}

/*
  中间主容器，绝对居中
*/
.scanner-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  /* 为了演示，固定一个大小，你可自定义自适应等 */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/*
  =============== 1) 旋转圆环 ===============
*/
.rotating-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  animation: rotateRing 2s linear infinite;
  /* svg 自适应容器 */
}
.rotating-ring svg {
  width: 100%;
  height: 100%;
}

/* 圆环旋转动画 */
@keyframes rotateRing {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/*
  =============== 2) 水晶核心(演示) ===============
  这里就是个发光小方块，可替换成多边形、3D、SVG等
*/
.crystal-core {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.4), rgba(255, 0, 255, 0.4));
  border: 2px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 0 8px #0ff,
    0 0 12px rgba(255, 0, 255, 0.8);
  transform: rotate(45deg); /* 变45度看起来像钻石 */
  border-radius: 4px;
  z-index: 10;
}

/*
  =============== 3) 激光线 ===============
  这里用绝对定位 + CSS keyframes 上下往返
*/
.laser-line {
  position: absolute;
  left: 10%;
  width: 80%;
  height: 2px;
  background: linear-gradient(
    to right,
    rgba(0, 255, 255, 0.4),
    rgba(255, 0, 255, 0.8),
    rgba(0, 255, 255, 0.4)
  );
  animation: laserMove 2s ease-in-out infinite;
  z-index: 5;
}

/* 激光线上下移动 */
@keyframes laserMove {
  0% {
    top: 10%;
  }
  50% {
    top: 90%;
  }
  100% {
    top: 10%;
  }
}

/*
  =============== 4) 文字提示 ===============
*/
.scanner-text {
  position: absolute;
  bottom: -3rem;
  width: 100%;
  text-align: center;
  color: #0ff;
  font-size: 1.1rem;
  font-family: 'Share Tech Mono', monospace;
  text-shadow:
    0 0 4px #0ff,
    0 0 8px #0ff;
}
</style>
