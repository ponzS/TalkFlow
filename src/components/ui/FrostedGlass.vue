<template>
  <div class="frosted-glass" @mousemove="handleMouseMove">
    <div v-for="halo in halos" :key="halo.id" class="halo" :style="halo.style"></div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface Halo {
  id: number
  style: Record<string, string>
}

const halos = ref<Halo[]>([])
const cursor = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const numHalos = 20 // 增加光晕数量

// 初始化光晕
const initHalos = () => {
  const newHalos: Halo[] = []
  for (let i = 0; i < numHalos; i++) {
    const size = 330 + Math.random() * 180 // 增大光晕尺寸
    newHalos.push({
      id: i,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        top: `${60 + Math.random() * 40}%`, // 保持光晕在底部区域
        left: `${Math.random() * 100}%`,
        background: `radial-gradient(circle, rgba(${Math.floor(
          Math.random() * 255,
        )}, ${Math.floor(Math.random() * 255)}, ${Math.floor(
          Math.random() * 255,
        )}, 0.7) 0%, rgba(255, 255, 255, 0) 70%)`,
        animationDelay: `${Math.random() * 5}s`,
        mixBlendMode: 'screen',
        transform: 'translate(0px, 0px)',
      },
    })
  }
  halos.value = newHalos
}

// 跟踪鼠标位置
const trackCursor = (e: MouseEvent) => {
  cursor.value.x = e.clientX
  cursor.value.y = e.clientY
  updateHalos()
}

// 处理鼠标移动
const handleMouseMove = (e: MouseEvent) => {
  trackCursor(e)
}

// 更新光晕位置以避开光标
const updateHalos = () => {
  const updatedHalos = halos.value.map((halo) => {
    const haloElement = document.querySelectorAll('.halo')[halo.id] as HTMLElement
    if (haloElement) {
      const rect = haloElement.getBoundingClientRect()
      const dx = cursor.value.x - (rect.left + rect.width / 2)
      const dy = cursor.value.y - (rect.top + rect.height / 2)
      const distance = Math.sqrt(dx * dx + dy * dy)
      const moveDistance = distance < 100 ? 50 - distance / 2 : 0
      const angle = Math.atan2(dy, dx)
      return {
        ...halo,
        style: {
          ...halo.style,
          transform: `translate(${Math.cos(angle) * moveDistance}px, ${Math.sin(angle) * moveDistance}px)`,
        },
      }
    }
    return halo
  })
  halos.value = updatedHalos
}

onMounted(() => {
  initHalos()
  window.addEventListener('mousemove', trackCursor)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', trackCursor)
})
</script>

<style scoped>
.frosted-glass {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  backdrop-filter: blur(20px); /* 增加模糊效果 */
  /* background: rgba(255, 255, 255, 0.3); */
  overflow: hidden;
  display: flex;
}

.halo {
  position: absolute;
  border-radius: 50%;
  animation:
    float 25s infinite ease-in-out,
    wave 8s infinite ease-in-out; /* 增强动画效果 */
  pointer-events: none;
}

/* 光晕浮动动画 */
@keyframes float {
  0% {
    transform: translate(0px, 0px);
  }
  50% {
    transform: translate(20px, -40px);
  }
  100% {
    transform: translate(0px, 0px);
  }
}

/* 光晕水面波动动画 */
@keyframes wave {
  0% {
    transform: translate(0px, 0px);
  }
  20% {
    transform: translate(15px, -10px);
  }
  40% {
    transform: translate(-10px, -20px);
  }
  60% {
    transform: translate(10px, -15px);
  }
  80% {
    transform: translate(-15px, -5px);
  }
  100% {
    transform: translate(0px, 0px);
  }
}
</style>
