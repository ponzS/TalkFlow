<!-- image to base64 demo -->
<template>
    <div class="image-to-base64-converter">
      <h2 class="title">Image to Base64 Converter</h2>
  
      <!-- file input-->
      <div class="input-section">
        <label class="label">Upload Image</label>
        <div class="file-input-wrapper">
          <input
            type="file"
            id="imageInput"
            accept="image/*"
            ref="fileInputRef"
            @change="handleFileInput"
          />
          <button class="modern-button upload-btn" @click="triggerFileInput" :disabled="isProcessing">
            <svg class="icon" viewBox="0 0 24 24">
              <path d="M12 2l-5.5 9h11zm0 2.83v6.17h2v-6.17zm-1 9.17h2v6h-2z" />
            </svg>
          </button>
        </div>
      </div>
  
      <!-- Base64 input-->
      <div class="input-section">
        <label class="label">Base64 Input</label>
        <textarea
          v-model="inputBase64"
          placeholder="Paste Base64 string here..."
          class="liquid-textarea"
          @input="updateBase64FromText"
          :disabled="isProcessing"
        ></textarea>
      </div>
  
      <!-- error-->
      <p v-if="error" class="error-text">{{ error }}</p>
  
      <!-- Base64 output-->
      <div class="output-section" v-if="base64String">
        <label class="label">Base64 Output</label>
        <textarea
          :value="base64String"
          readonly
          class="liquid-textarea output"
        ></textarea>
        <button class="modern-button copy-btn" @click="copyBase64" :disabled="isProcessing">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M16 1H4v16h2V3h10zm-1 4l6 6v10H8V5zm2 14h2v-6h-6v6h4z" />
          </svg>
        </button>
      </div>
  
      <!-- preview-->
      <div class="preview-section" v-if="base64String && isValidBase64Image(base64String)">
        <label class="label">Preview</label>
        <div class="image-wrapper">
          <img :src="base64String" alt="Preview" class="liquid-image" @load="onImageLoad" />
        </div>
      </div>
  
      <!-- clear-->
      <button v-if="base64String || error" class="modern-button clear-btn" @click="clear1" :disabled="isProcessing">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>
  
      <!-- just play play  -->
      <transition name="liquid-fade">
        <div v-if="isProcessing" class="fullscreen-loader">
          <div class="liquid-circle"></div>
          <div class="liquid-circle delayed"></div>
        </div>
      </transition>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, watch } from 'vue';
  import { useImageToBase64 } from '@/composables/useImageToBase64';
  
  const { base64String, error, convertToBase64, setBase64FromText, isValidBase64Image, clear } = useImageToBase64();
  const fileInputRef = ref<HTMLInputElement | null>(null);
  const inputBase64 = ref('');
  const isProcessing = ref(false);
  

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2000);
  };
  

  const triggerFileInput = () => {
    if (fileInputRef.value && !isProcessing.value) {
      fileInputRef.value.click();
    }
  };
  

  const handleFileInput = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
  
    const file = input.files[0];
    isProcessing.value = true;
  
    try {
 
      await convertToBase64(file);

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(err);
    } finally {
      isProcessing.value = false;
      if (input) input.value = '';
    }
  };
  

  const updateBase64FromText = async () => {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
      setBase64FromText(inputBase64.value.trim());

      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      isProcessing.value = false;
    }
  };
  
 
  const copyBase64 = () => {
    if (base64String.value && !isProcessing.value) {
      navigator.clipboard.writeText(base64String.value).then(() => {
        showToast('Base64 copied to clipboard', 'success');
      }).catch(() => {
        showToast('Copy failed', 'error');
      });
    }
  };
  

  const onImageLoad = () => {
    isProcessing.value = false;
  };
  

  const clear1 = () => {
    if (!isProcessing.value) {
      isProcessing.value = false;
      clear();
    }
  };
  
  watch(base64String, (newValue) => {
    if (newValue !== inputBase64.value) {
      inputBase64.value = newValue;
    }
  });
  </script>
  
  <style scoped>
  .image-to-base64-converter {
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
    font-family: 'Arial', sans-serif;
    /* background: #f5f7fa; */
    border-radius: 15px;
    /* box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); */
  }
  
  .title {
    text-align: center;
    color: #2c3e50;
    margin-bottom: 30px;
    font-size: 22px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  
  .input-section {
    margin-bottom: 20px;
  }
  
  .label {
    display: block;
    margin-bottom: 8px;
    color: #7f8c8d;
    font-size: 14px;
    font-weight: 400;
  }
  
  .file-input-wrapper {
    position: relative;
  }
  
  input[type="file"] {
    display: none;
  }
  
  .liquid-textarea {
    width: 100%;
    min-height: 100px;
    padding: 12px;
    /* border: 1px solid #e0e6ed; */
    border-radius: 10px;
    /* background: #fff; */
    font-size: 14px;
    /* color: #2c3e50; */
    resize: vertical;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }
  
  .liquid-textarea:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 8px rgba(52, 152, 219, 0.2);
  }
  
  .liquid-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .liquid-textarea.output {
    /* background: #f9fafc; */
    cursor: not-allowed;
  }
  
  .output-section {
    margin-bottom: 20px;
    position: relative;
  }
  
  .preview-section {
    margin-bottom: 20px;
  }
  
  .image-wrapper {
    position: relative;
    display: inline-block;
  }
  
  .liquid-image {
    max-width: 100%;
    max-height: 300px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: opacity 0.3s ease;
  }
  
  .error-text {
    color: #e74c3c;
    font-size: 14px;
    margin-bottom: 15px;
    text-align: center;
    animation: fadeIn 0.3s ease;
  }
  
  .modern-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    /* background: #3498db; */
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
    box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3);
  }
  
  .modern-button:hover:not(:disabled) {
    background: #2980b9;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(52, 152, 219, 0.4);
  }
  
  .modern-button:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 1px 4px rgba(52, 152, 219, 0.2);
  }
  
  .modern-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .upload-btn {
    background: #2ecc71;
  }
  
  .upload-btn:hover:not(:disabled) {
    background: #27ae60;
  }
  
  .copy-btn {
    background: #9b59b6;
    position: absolute;
    right: 10px;
    top: 35px;
  }
  
  .copy-btn:hover:not(:disabled) {
    background: #8e44ad;
  }
  
  .clear-btn {
    background: #e74c3c;
    margin: 0 auto;
    display: block;
  }
  
  .clear-btn:hover:not(:disabled) {
    background: #c0392b;
  }
  
  .icon {
    width: 18px;
    height: 18px;
    fill: #fff;
  }
  
  /* 全屏加载动画 */
  .fullscreen-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .liquid-circle {
    width: 80px;
    height: 80px;
    background: radial-gradient(circle, #3498db 10%, transparent 70%);
    border-radius: 50%;
    animation: liquidMorph 2s ease-in-out infinite;
  }
  
  .liquid-circle.delayed {
    animation-delay: 0.5s;
    background: radial-gradient(circle, #2980b9 10%, transparent 70%);
  }
  
  .liquid-fade-enter-active,
  .liquid-fade-leave-active {
    transition: opacity 0.3s ease;
  }
  
  .liquid-fade-enter-from,
  .liquid-fade-leave-to {
    opacity: 0;
  }
  
  .toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    z-index: 1000;
    animation: slideIn 0.3s ease, fadeOut 0.3s ease 1.7s;
  }
  
  .toast.success {
    background: #2ecc71;
  }
  
  .toast.error {
    background: #e74c3c;
  }
  
  @keyframes liquidMorph {
    0% { transform: scale(1) rotate(0deg); border-radius: 50% 50% 50% 50%; }
    25% { transform: scale(1.1) rotate(90deg); border-radius: 60% 40% 50% 50%; }
    50% { transform: scale(1) rotate(180deg); border-radius: 50% 50% 40% 60%; }
    75% { transform: scale(1.1) rotate(270deg); border-radius: 40% 60% 60% 40%; }
    100% { transform: scale(1) rotate(360deg); border-radius: 50% 50% 50% 50%; }
  }
  
  @keyframes slideIn {
    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  </style>