<template>
  <span>
    <!-- Trigger Slot -->
    <span @click="openModal">
      <slot name="trigger"></slot>
    </span>

    <!-- Modal Background Overlay -->
    <transition name="fade">
      <span v-show="isOpen" class="modal-overlay" @click="closeModal"></span>
    </transition>

    <!-- Modal Title Outside of the Modal Content -->
    <span v-show="isOpen" class="modal-title">
      <slot name="title"></slot>
    </span>

    <!-- Modal Content with Custom Animation -->
    <transition name="modal-slide" @before-enter="beforeEnter" @enter="enter" @leave="leave">
      <span v-show="isOpen" class="modal-content">
        <slot name="content"></slot>
      </span>
    </transition>
  </span>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)
const isVisible = ref(false)

const openModal = () => {
  isVisible.value = true
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const beforeEnter = (el: any) => {
  el.style.transform = 'translateX(-100%) scale(0.8)'
  el.style.opacity = '0'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enter = (el: any, done: () => any) => {
  setTimeout(() => {
    el.style.transition = 'transform 0.6s ease, opacity 0.6s ease'
    el.style.transform = 'translateX(0) scale(1)'
    el.style.opacity = '1'
    done()
  }, 50)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const leave = (el: any, done: () => any) => {
  el.style.transition = 'transform 0.6s ease, opacity 0.6s ease'
  el.style.transform = 'translateX(100%) scale(0.8)'
  el.style.opacity = '0'
  setTimeout(done, 600)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.348);
  backdrop-filter: blur(5px);
  z-index: 9998;
}

.modal-title {
  position: fixed;
  top: 30%;
  left: 25%;
  transform: translate(-50%, -100%);
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
  z-index: 10000; /* To ensure it stays above other elements */
}

.modal-content {
  font-family: Arial, sans-serif;
  position: fixed;
  top: 39%;
  left: 10%;
  transform: translate(-50%, -50%);
  backdrop-filter: blur(15px);
  border-radius: 10px;
  padding: 20px;
  width: 80%;
  max-width: 600px;
  z-index: 9999;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 1.5rem;
  cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition:
    transform 0.6s ease,
    opacity 0.6s ease;
}

.modal-slide-enter-from {
  transform: translateX(-100%) scale(0.8);
  opacity: 0;
}

.modal-slide-leave-to {
  transform: translateX(100%) scale(0.8);
  opacity: 0;
}

@media (max-width: 600px) {
  .modal-content {
    top: 30%;
    padding-right: 20%;
  }

  .modal-title {
    top: 28%;
  }
}
</style>
