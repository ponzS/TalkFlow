<script setup>
import { useQR } from "@gun-vue/composables";
import { ref } from 'vue';

const emit = defineEmits(["loaded"]);
const { processFile } = useQR();
</script>

<template>
  <input 
    id="qr-input" 
    type="file" 
    accept="image/*" 
    class="liquid-file-input"
    @change="processFile($event.target.files[0], (data) => $emit('loaded', data))"
  />
 
</template>

<style scoped>
.liquid-file-input {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(45deg, #72EDF2, #5151E5);
  color: white;
  font-size: 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.liquid-file-input:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.liquid-file-input::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.6s ease, height 0.6s ease;
}

.liquid-file-input:hover::before {
  width: 300px;
  height: 300px;
}

/* Hide default file input appearance */
.liquid-file-input::-webkit-file-upload-button {
  visibility: hidden;
  width: 0;
}
.liquid-file-input::after {
  content: '选择图片';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: white;
}
</style>