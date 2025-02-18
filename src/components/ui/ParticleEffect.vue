<!-- src/components/ParticleEffect.vue -->
<template>
  <div :class="['particle-effect', { active: enabled }]"></div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
  color: {
    type: String,
    default: '#63b3ed',
  },
  size: {
    type: Number,
    default: 10, // 粒子大小（px）
  },
  number: {
    type: Number,
    default: 20, // 粒子数量
  },
})
</script>

<style scoped>
.particle-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.particle-effect.active::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--size);
  height: var(--size);
  background-color: var(--color);
  border-radius: 50%;
  animation: particle 1.5s infinite;
}

@keyframes particle {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--x-offset)), calc(-50% + var(--y-offset))) scale(0);
    opacity: 0;
  }
}
</style>
