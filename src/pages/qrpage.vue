<template>
  <ion-page>
  <ion-header :translucent="true" collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
      <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
    
      
      </ion-toolbar>
    </ion-header>
    

    <ion-content :fullscreen="true" class="qr-content" :style="{ '--keyboard-height': keyboardHeight + 'px' }">
      <!-- <div class="back-button1">
        <div class="back-button" @click="goBack">
          <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
        </div>
      </div> -->

      <div class="container">
        <!-- 二维码显示区域 -->
        <transition name="qr-fade">
          <div v-if="input" class="qr-container">
            <QrShow 
              :data="input" 
            />
          </div>
        </transition>

        <!-- 字符数提示 -->
        <transition name="fade">
          <span 
            v-if="input.length > MAX_CHARS"
            class="char-warning"
          >
            Text exceeds {{ MAX_CHARS }} characters, QR code may not generate!
          </span>
        </transition>

        <!-- 背景光晕装饰 -->
        <div class="glow-circle glow-1"></div>
        <div class="glow-circle glow-2"></div>
        <div class="glow-circle glow-3"></div>
      </div>

      <!-- 输入框区域 -->
      <div class="input-wrapper" :style="{ transform: `translateY(-${keyboardOffset}px)` }">
        <div class="input-capsule" :class="{ 'focused': isFocused }">
          <!-- 新增粘贴按钮 -->
          <div class="paste-button" @click="handlePasteFromClipboard">
            <ion-icon :icon="clipboardOutline" />
          </div>
          <input 
            type="text" 
            v-model="input" 
            :placeholder="placeholder"
            class="qr-input"
            ref="inputEl"
            @focus="onFocus"
            @blur="onBlur"
            @input="onInput"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
          />
          <div
            class="clear-button"
            @click="clearInput"
            :class="{ 'disabled': !input }"
          >
            <ion-icon :icon="closeCircleOutline" />
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

import { useQR } from "@gun-vue/composables";
import { IonPage, IonContent, IonIcon, IonBackButton,IonHeader,IonToolbar,IonButtons } from '@ionic/vue';
import { closeCircleOutline, clipboardOutline } from 'ionicons/icons';
import { useKeyboardState } from '@/composables/useKeyboardState';

const { processFile } = useQR();
const router = useRouter();
const input = ref('');
const isFocused = ref(false);
const { keyboardHeight, initKeyboard } = useKeyboardState();
const keyboardOffset = ref(0);
const isTouching = ref(false);
const touchTimeout = ref<number | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);

// 字符限制常量
const MAX_CHARS = 1800;

// 默认占位符
const defaultPlaceholder = 'QR code';
const placeholder = ref(defaultPlaceholder);

// 清空输入框的函数
const clearInput = () => {
  input.value = '';
};

// 从剪贴板粘贴内容的函数
async function handlePasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      input.value = text;
      isFocused.value = true;
      if (inputEl.value) {
        inputEl.value.focus(); // 确保输入框聚焦
      }
    }
  } catch (err) {
    // Failed to read clipboard contents
    // console.error('Failed to read clipboard contents:', err);
  }
}

function onInput(event: Event) {
  const inputElement = event.target as HTMLInputElement;
}

function onFocus(event: FocusEvent) {
  isFocused.value = true;
  if (keyboardHeight.value > 0) {
    keyboardOffset.value = keyboardHeight.value + 10;
  }
  const inputElement = event.target as HTMLInputElement;
  inputEl.value = inputElement; // 保存输入框引用
  setTimeout(() => inputElement.focus(), 100);
}

function onBlur(event: FocusEvent) {
  if (isTouching.value) return; // 如果正在触摸，不触发 blur
  // 不直接处理收起逻辑，交给 handleDocumentClick
}

function goBack() {
  router.go(-1);
}

function handleTouchStart(event: TouchEvent) {
  isTouching.value = true;
  if (touchTimeout.value) {
    clearTimeout(touchTimeout.value);
  }
}

function handleTouchEnd(event: TouchEvent) {
  isTouching.value = false;
  if (touchTimeout.value) {
    clearTimeout(touchTimeout.value);
    touchTimeout.value = null;
  }
}

// 处理全局点击事件
function handleDocumentClick(event: MouseEvent) {
  if (inputEl.value && !inputEl.value.contains(event.target as Node)) {
    // 点击在输入框外部时
    isFocused.value = false;
    if (!input.value) placeholder.value = defaultPlaceholder;
    keyboardOffset.value = 0;
    inputEl.value.blur(); // 手动收起键盘
  }
}

onMounted(() => {
  const hasCapacitor = 'Capacitor' in window;
  
  // 添加全局点击监听
  document.addEventListener('click', handleDocumentClick);

  // 初始化共享键盘状态（Capacitor）
  if (hasCapacitor) {
    initKeyboard();
  } else if (window.visualViewport) {
    const resizeHandler = () => {
      const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      const wh = window.innerHeight;
      const newHeight = wh - vh;
      keyboardHeight.value = newHeight;
      if (isFocused.value && newHeight > 0) {
        keyboardOffset.value = newHeight + 10;
      } else {
        keyboardOffset.value = 0;
      }
    };
    window.visualViewport.addEventListener('resize', resizeHandler);
    onUnmounted(() => {
      window.visualViewport?.removeEventListener('resize', resizeHandler);
    });
  }
});

onUnmounted(() => {
  const hasCapacitor = 'Capacitor' in window;
  // 使用共享键盘状态，无需移除所有监听
  // 移除全局点击监听
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.qr-content {
  --background: black;
  --keyboard-height: 0px;
  height: 100%;
  overflow: hidden;
}

.container {
  position: relative;
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 120px;
  height: 100%;
  gap: 20px;
}

/* 自定义返回按钮 */
.back-button1 {
  position: fixed;
  top: 70px;
  left: 20px;
  z-index: 9999;
}

.back-button {

  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding-right: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease-in-out;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.back-button:active {
  background-color: #5151E5;
  transform: scale(0.95);
}

.i-material-symbols-arrow-back-ios-new-rounded {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m9.55 12l7.35 7.35q.375.375.363.875t-.388.875t-.875.375t-.875-.375l-7.7-7.675q-.3-.3-.45-.675t-.15-.75t.15-.75t.45-.675l7.7-7.7q.375-.375.888-.363t.887.388t.375.875t-.375.875z'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: #ffffff;
  width: 1.2em;
  height: 1.2em;
}

/* 二维码显示 */
.qr-container {
  margin-top: 0;
  padding: 0px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.qr-code {
  width: 100%;
  max-width: 300px;
  transition: transform 0.3s ease;
  background-color: black;
  padding: 0px;
  margin: 0px;
}

.qr-container:hover .qr-code {
  transform: scale(1.05) rotate(2deg);
}

/* 输入框胶囊 */
.input-wrapper {
  position: fixed;
  bottom: 20px;
  width: 90%;
  transition: transform 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 5%;
}

.input-capsule {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  padding: 8px 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  z-index: 10;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.input-capsule.focused {
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.2),
              0 0 40px rgba(255, 255, 255, 0.1);
  transform: scale(1.02);
}

.qr-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 16px;
  padding: 12px 16px;
  width: 100%;
  box-sizing: border-box;
  transition: all 0.3s ease;
  -webkit-user-select: auto !important;
  user-select: auto !important;
  -webkit-touch-callout: default !important;
  touch-action: manipulation;
}

.qr-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
}

.input-capsule.focused .qr-input::placeholder {
  color: rgba(255, 255, 255, 0.8);
}

/* 粘贴按钮 */
.paste-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
  flex-shrink: 0;
}

.paste-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.paste-button ion-icon {
  color: #ffffff;
  font-size: 24px;
}

/* 清空按钮 */
.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
  flex-shrink: 0;
}

.clear-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.clear-button.disabled {
  opacity: 0.4;
  transform: scale(1);
  cursor: not-allowed;
}

.clear-button ion-icon {
  color: #ffffff;
  font-size: 24px;
}

/* 字符数警告 */
.char-warning {
  position: absolute;
  bottom: calc(20% + var(--keyboard-height));
  color: #ff6b6b;
  font-size: 0.9rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  background: rgba(255, 107, 107, 0.1);
  padding: 6px 12px;
  border-radius: 12px;
  backdrop-filter: blur(5px);
  transition: bottom 0.3s ease;
}

/* 光晕效果 */
.glow-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.3;
  animation: float 8s ease-in-out infinite;
  z-index: 1;
}

.glow-1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #00cd89 0%, transparent 70%);
  top: 10%;
  left: 20%;
  animation-delay: 0s;
}

.glow-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #23d5ab 0%, transparent 70%);
  bottom: 15%;
  right: 15%;
  animation-delay: 2s;
}

.glow-3 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, #52eed1 0%, transparent 70%);
  top: 50%;
  left: 50%;
  animation-delay: 4s;
}

/* 动画 */
@keyframes float {
  0% { transform: translateY(0) scale(1); opacity: 0.3; }
  50% { transform: translateY(-20px) scale(1.05); opacity: 0.5; }
  100% { transform: translateY(0) scale(1); opacity: 0.3; }
}

.qr-fade-enter-active,
.qr-fade-leave-active {
  transition: all 0.5s ease;
}

.qr-fade-enter-from,
.qr-fade-leave-to {
  opacity: 0;
  transform: scale(0.9) rotate(-5deg);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>