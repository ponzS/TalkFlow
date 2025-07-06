<script setup lang="ts">
import { useDevicesList, useUserMedia } from '@vueuse/core'
import { reactive, shallowRef, useTemplateRef, watchEffect } from 'vue'

const currentCamera = shallowRef<string>()
const { videoInputs: cameras } = useDevicesList({
  requestPermissions: true,
  onUpdated() {
    if (!cameras.value.find(i => i.deviceId === currentCamera.value))
      currentCamera.value = cameras.value[0]?.deviceId
  },
})

const video = useTemplateRef<HTMLVideoElement>('video')
const { stream, enabled } = useUserMedia({
  constraints: reactive({ video: { deviceId: currentCamera } }),
})

watchEffect(() => {
  if (video.value)
    video.value.srcObject = stream.value!
})
</script>

<template>
  <div class="container">
 



    <div>
      <video ref="video" muted autoplay controls class="video" />
    </div>

    <div class="button-container">
      <button @click="enabled = !enabled">
        {{ enabled ? 'Stop' : 'Start' }}
      </button>
    </div>

    <div class="camera-list">
      <div
        v-for="camera of cameras"
        :key="camera.deviceId"
        class="camera-item"
        :class="{ 'selected': currentCamera === camera.deviceId }"
        @click="currentCamera = camera.deviceId"
      >
        {{ camera.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
  margin:130px
}

.button-container {
  margin-bottom: 1rem;
}

.camera-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.camera-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.camera-item.selected {
  color: #1e90ff; /* Primary color for selected camera */
}

.video {
  width: auto;
  height: 100%;
}
</style>