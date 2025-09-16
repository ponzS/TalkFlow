<script setup>
import { useQR } from "@gun-vue/composables";
import { ref } from 'vue';
import QrShow from './QrShow.vue'; // 调整路径根据需要
import router from '@/router';
import { closeCircleOutline, closeCircleSharp } from "ionicons/icons";
import QrLoad from "./QrLoad.vue";

const { processFile } = useQR();
const input = ref('');
const output = ref();

// 字符限制常量
const MAX_CHARS = 1800;

// 默认占位符
const defaultPlaceholder = '';
const placeholder = ref(defaultPlaceholder);

// 清空输入框的函数
const clearInput = () => {
  input.value = '';
};
</script>

<template>
  
  <div style="position: relative; min-height: 100vh; background: linear-gradient(135deg, #00000000, #5151E5); padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 32px; overflow: hidden;">
    <!-- 返回按钮 -->
    <div class="back-button1">
      <div class="back-button" @click="() => router.go(-1)">
        <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
      </div>
    </div>

   <!-- 字符数提示 -->
   <span 
        v-if="input.length > MAX_CHARS"
        style="position: absolute; bottom: -20px; left: 0; color: #ff6b6b; font-size: 0.9rem; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);"
      >
        文本超过 {{ MAX_CHARS }} 个字符，二维码可能无法生成！
      </span>
    <!-- 居中的二维码容器，仅当 input 不为空时显示 -->
    <div 
      v-if="input"

    >
      <QrShow 
        :data="input" 
        style="width: 100%; max-width: 300px; transition: transform 0.3s ease;margin-top: 110px;"
        @mouseover="this.style.transform='scale(1.05) rotate(2deg)'"
        @mouseout="this.style.transform='scale(1) rotate(0deg)'"
      />
    </div>

    <!-- 输入框和字符数提示 -->
    <div style="position: fixed;bottom: 5%;margin: 10px; width: 90%; max-width: 450px; display: flex; align-items: center; gap: 10px;">
      <input 
        type="text" 
        v-model="input" 
        :placeholder="placeholder"
        style="width: 100%; padding: 14px; border-radius: 15px; border: none; background: black; color: #fff; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease; position: relative; z-index: 1;"
        @mouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 6px 20px rgba(0, 0, 0, 0.2)'"
        @mouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'"
        @focus="this.style.transform='scale(1.03)'; this.style.boxShadow='0 6px 20px rgba(0, 0, 0, 0.2)'; this.style.outline='none'; placeholder = ''"
        @blur="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'; if (!input) placeholder = defaultPlaceholder"
        @input="onInput"
      />
      <!-- 清空按钮 -->
      <div
        @click="clearInput"
        style="width: 40px; height: 40px; border-radius: 50%; border: none;  color: black; font-size: 30px; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: transform 0.3s ease, background 0.3s ease;"
        @mouseover="this.style.transform='scale(1.1)'; this.style.background='rgba(255, 255, 255, 0.5)'"
        @mouseout="this.style.transform='scale(1)'; this.style.background='rgba(255, 255, 255, 0.3)'"
      >
      <ion-icon  :icon="closeCircleSharp" />
      </div>
   
    </div>
  </div>
</template>

<style scoped>
.back-button1 {
  position: fixed;
  top: 70px;
  left: 9px;
}
.back-button {
  background-color: #7f7f7f3c;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  padding-right: 5px;
  display: flex;
  justify-content: center;
  align-items: center;

  transition: all 0.3s ease-in-out;
}

.back-button:active {
  background-color: #5151E5;
  transition: all 0.3s ease-in-out;
}

.i-material-symbols-arrow-back-ios-new-rounded {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m9.55 12l7.35 7.35q.375.375.363.875t-.388.875t-.875.375t-.875-.375l-7.7-7.675q-.3-.3-.45-.675t-.15-.75t.15-.75t.45-.675l7.7-7.7q.375-.375.888-.363t.887.388t.375.875t-.375.875z'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}

/* Liquid pseudo-elements for background effects */
body > div::before {
  content: '';
  position: absolute;
  width: 180px;
  height: 180px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  animation: liquid-flow 7s infinite ease-in-out;
  top: -90px;
  left: -90px;
}

body > div::after {
  content: '';
  position: absolute;
  width: 220px;
  height: 220px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  animation: liquid-flow 9s infinite reverse ease-in-out;
  bottom: -110px;
  right: -110px;
}

/* Ripple pseudo-element for input */
input::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 0;
  pointer-events: none;
}

/* Animations */
@keyframes liquid-flow {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(40px, 40px) scale(1.15);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

@keyframes input-ripple {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  50% {
    width: 200px;
    height: 200px;
    opacity: 0.5;
  }
  100% {
    width: 300px;
    height: 300px;
    opacity: 0;
  }
}
</style>

<script>
export default {
  methods: {
    onInput(event) {
      // Apply ripple effect to the input field's pseudo-element
      const inputElement = event.target;
      inputElement.style.animation = 'none'; // Reset any existing animation
      inputElement.setAttribute('data-ripple', 'true'); // Trigger pseudo-element animation
      
      // Use CSS pseudo-element for the ripple
      const styleSheet = document.styleSheets[0];
      const ruleIndex = Array.from(styleSheet.cssRules).findIndex(rule => rule.selectorText === 'input[data-ripple="true"]::after');
      if (ruleIndex !== -1) styleSheet.deleteRule(ruleIndex);
      styleSheet.insertRule('input[data-ripple="true"]::after { animation: input-ripple 1s ease-out; }', styleSheet.cssRules.length);

      // Remove the attribute after animation completes
      setTimeout(() => {
        inputElement.removeAttribute('data-ripple');
      }, 1000);

      // 检查字符数并提醒
      if (input.value.length > MAX_CHARS) {
        console.warn(`文本超过 ${MAX_CHARS} 个字符，二维码可能无法生成！`);
      }
    }
  }
};
</script>