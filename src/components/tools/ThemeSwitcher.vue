<template>
  <div>
    <button
      @click="toggleThemeS"
      ref="toggleButton"
      :disabled="isAnimating"
      class="color-mode-switcher"
    >
      <span v-if="currentTheme === 'light'" class="icon sun-icon" aria-label="Switch to light mode">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="5" fill="currentColor" />
          <path d="M12 1V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M12 21V23" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path
            d="M4.22 4.22L5.64 5.64"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M18.36 18.36L19.78 19.78"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path d="M1 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M21 12H23" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path
            d="M4.22 19.78L5.64 18.36"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M18.36 5.64L19.78 4.22"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span v-else class="icon moon-icon" aria-label="Switch to dark mode">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21 12.79C20.56 12.86 20.12 12.9 19.67 12.9C14.96 12.9 11.1 9.04 11.1 4.33C11.1 3.88 11.14 3.44 11.21 3C7.03 3.64 4 7.12 4 11.5C4 16.19 7.81 20 12.5 20C16.88 20 20.36 16.97 21 12.79Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { toggleTheme, toggleTheme1, toggleThemeS, currentTheme, isAnimating } = useTheme()
</script>

<style>
:root {
  --background-color: #ffffff;
  --text-color: #000000;
  --button-color: #232323;
  --primary-color: #ffffff;
  --secondary-color: #ffffff;
  --glass-bg: rgb(0, 0, 0);
  --glass-border: rgba(23, 23, 23, 0.458);
  --shadow-color: rgba(0, 255, 234, 0.5);

  --ion-background-color: #ffffff;
  --ion-background-color-rgb: 255, 255, 255;

  --ion-text-color: #000000;
  --ion-text-color-rgb: 0, 0, 0;

  --ion-text-color-step-50: #0d0d0d;
  --ion-text-color-step-100: #1a1a1a;
  --ion-text-color-step-150: #262626;
  --ion-text-color-step-200: #333333;
  --ion-text-color-step-250: #404040;
  --ion-text-color-step-300: #4d4d4d;
  --ion-text-color-step-350: #595959;
  --ion-text-color-step-400: #666666;
  --ion-text-color-step-450: #737373;
  --ion-text-color-step-500: #808080;
  --ion-text-color-step-550: #8c8c8c;
  --ion-text-color-step-600: #999999;
  --ion-text-color-step-650: #a6a6a6;
  --ion-text-color-step-700: #b3b3b3;
  --ion-text-color-step-750: #bfbfbf;
  --ion-text-color-step-800: #cccccc;
  --ion-text-color-step-850: #d9d9d9;
  --ion-text-color-step-900: #e6e6e6;
  --ion-text-color-step-950: #f2f2f2;

  --ion-background-color-step-50: #f2f2f2;
  --ion-background-color-step-100: #e6e6e6;
  --ion-background-color-step-150: #d9d9d9;
  --ion-background-color-step-200: #cccccc;
  --ion-background-color-step-250: #bfbfbf;
  --ion-background-color-step-300: #b3b3b3;
  --ion-background-color-step-350: #a6a6a6;
  --ion-background-color-step-400: #999999;
  --ion-background-color-step-450: #8c8c8c;
  --ion-background-color-step-500: #808080;
  --ion-background-color-step-550: #737373;
  --ion-background-color-step-600: #666666;
  --ion-background-color-step-650: #595959;
  --ion-background-color-step-700: #4d4d4d;
  --ion-background-color-step-750: #404040;
  --ion-background-color-step-800: #333333;
  --ion-background-color-step-850: #262626;
  --ion-background-color-step-900: #191919;
  --ion-background-color-step-950: #0d0d0d;
}

/* Dark Theme */
body.dark {
  --background-color: #000000;
  --text-color: #ffffff;
  --button-color: #bbbbbb;
  --primary-color: #000000;
  --secondary-color: #ffffff;
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(255, 255, 255, 0.3);
  --shadow-color: rgba(255, 0, 122, 0.5);

  --ion-background-color: #000000;
  --ion-background-color-rgb: 0, 0, 0;

  --ion-text-color: #ffffff;
  --ion-text-color-rgb: 255, 255, 255;

  --ion-text-color-step-50: #f2f2f2;
  --ion-text-color-step-100: #e6e6e6;
  --ion-text-color-step-150: #d9d9d9;
  --ion-text-color-step-200: #cccccc;
  --ion-text-color-step-250: #bfbfbf;
  --ion-text-color-step-300: #808080;
  --ion-text-color-step-350: #737373;
  --ion-text-color-step-400: #666666;
  --ion-text-color-step-450: #595959;
  --ion-text-color-step-500: #4d4d4d;
  --ion-text-color-step-550: #404040;
  --ion-text-color-step-600: #333333;
  --ion-text-color-step-650: #262626;
  --ion-text-color-step-700: #1a1a1a;
  --ion-text-color-step-750: #0d0d0d;
  --ion-text-color-step-800: #000000;
  --ion-text-color-step-850: #000000;
  --ion-text-color-step-900: #000000;
  --ion-text-color-step-950: #000000;
  --ion-background-color-step-50: #191919;
  --ion-background-color-step-100: #262626;
  --ion-background-color-step-150: #333333;
  --ion-background-color-step-200: #404040;
  --ion-background-color-step-250: #4d4d4d;
  --ion-background-color-step-300: #737373;
  --ion-background-color-step-350: #808080;
  --ion-background-color-step-400: #999999;
  --ion-background-color-step-450: #a6a6a6;
  --ion-background-color-step-500: #b3b3b3;
  --ion-background-color-step-550: #bfbfbf;
  --ion-background-color-step-600: #cccccc;
  --ion-background-color-step-650: #d9d9d9;
  --ion-background-color-step-700: #e6e6e6;
  --ion-background-color-step-750: #f2f2f2;
  --ion-background-color-step-800: #ffffff;
  --ion-background-color-step-850: #ffffff;
  --ion-background-color-step-900: #ffffff;
  --ion-background-color-step-950: #ffffff;
}

.theme-switcher {
  position: relative;
  padding: 16px;
  border-radius: 8px;
}

/* 覆盖层样式 */
.theme-overlay {
  position: absolute;
  width: 0vw;
  height: 0vh;
  background-color: #000000;

  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition:
    width 1s ease-in-out,
    height 1s ease-in-out;
  z-index: -1;
}

/* 动画 */
@keyframes expand {
  to {
    width: 1000vw;
    height: 1000vw;
    opacity: 1;
    background-color: #000000;

    transition:
      width 1s ease-in-out,
      height 1s ease-in-out;
  }
}

/* 覆盖层样式 */
.theme-overlay1 {
  position: absolute;
  width: 1000vw;
  height: 1000vw;
  background-color: #000000;
  color: #ffffff;
  transition:
    width 1s ease-in-out,
    height 1s ease-in-out;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: -1;
}

/* 动画 */
@keyframes expand1 {
  to {
    width: 0vw;
    height: 0vw;
    opacity: 1;
    color: #fff;
    background-color: #000000;
    transition:
      width 1s ease-in-out,
      height 1s ease-in-out;
  }
}

.animating {
  background-color: #ffffff;
  color: #000000;
}
.animating1 {
  background-color: #ffffff;
  color: #000000;
}
.theme-overlay.expand {
  animation: expand 0.5s forwards;
}

.theme-overlay1.expand1 {
  animation: expand1 0.5s forwards;
}

.color-mode-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0px;
  border-radius: 50%;
  transition:
    background-color 0.5s,
    color 0.5s,
    box-shadow 0.5s;
  font-size: 1.3rem;
  color: var(--primary-color);
  position: relative;
  overflow: hidden;
  background: var(--glass-bg);
}

.color-mode-switcher::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, transparent 50%, var(--primary-color) 50%);
  transform: scaleX(0);
  transform-origin: top right;
  transition: transform 0.5s;

  z-index: 0;
}

.color-mode-switcher:hover::before {
  transform: scaleX(1);
  transform-origin: bottom left;
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0.3rem;
  position: relative;
  z-index: 1;
}

.sun-icon {
  color: var(--secondary-color);
}

.moon-icon {
  color: var(--primary-color);
}
</style>
