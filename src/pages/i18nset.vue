<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
    <ion-content>
      <NavBarS>
        <template #brand>
          <div class="back-button" @click="() => router.go(-1)"><div class="i-material-symbols-arrow-back-ios-new-rounded"></div></div>
        </template>
        <template #links>
          <div style="font-size: 18px; font-weight: 700; color: var(--text-color)">
          {{ $t('hello') }}
        </div>
        </template>
      </NavBarS>

      <div class="language-selection-page">
        <div class="header"></div>

        <TypingEffect />

        <div class="language-options-container">
          <div class="language-options">
            <div
              class="option"
              v-for="lang in languages"
              :key="lang.code"
              @click="selectLanguage(lang)"
              :class="{ active: lang.code === selectedLanguage }"
            >
              <span class="language-name">{{ lang.name }}</span>
              <span class="language-flag">{{ getFlag(lang.code) }}</span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
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

.next-button {
  position: fixed;

  background-color: var(--background-color);
  border-radius: 10px;
  /* padding: 10px; */
  width: 100%;
  max-width: 130px;
  height: 40px;
  cursor: pointer;
  text-align: center;
  align-items: center;
  justify-content: center;
  display: flex;
  -webkit-tap-highlight-color: transparent;
  z-index: 2;
  overflow: hidden;
  transition: all 0.3s ease-in-out;
}

.next-button:active .next-button-bj {
  width: 200%;
  height: 200%;
  border-radius: 50%;
  background-color: #5b5b5b85;
  transition: all 0.3s ease-in-out;
}

.next-button-bj {
  position: absolute;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 0%;
  height: 0%;
  background-color: var(--button-color);
  transition: all 0.3s ease-in-out;
}

/* 其他样式保持不变 */
.language-selection-page {
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 100vh;
  width: 100%;
  background: linear-gradient(-45deg, #ee765294, #e73c7e90, #23a5d583, #23d5ab93);
  background-color: var(--background-color);
  background-size: 200% 200%;
  animation: gradientBreath 10s ease infinite;
}

@keyframes gradientBreath {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.header {
  margin-top: 100px;
}

.header h1 {
  font-size: 24px;
  color: #333;
}

.language-options {
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  background-color: #89898940;
  backdrop-filter: blur(10px);
  border-radius: 20px;
  width: 100%;
  /* max-width: 400px; */
  margin-bottom: 0;
  padding-top: 10px;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 30px;
  max-height: 39vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c3cfe2 #f5f5f5;
}

.language-options::-webkit-scrollbar {
  width: 8px;
}

.language-options::-webkit-scrollbar-track {
  background: var(--background-color);
  border-radius: 4px;
}

.language-options::-webkit-scrollbar-thumb {
  background-color: var(--text-color);
  border-radius: 4px;
  border: 2px solid var(--background-color);
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin: 10px 0;
  background-color: var(--background-color);
  color: var(--text-color);
  border-radius: 10px;
  cursor: pointer;
  /* transition: all 0.2s ease-in-out; */
}

.option.active {
  background-color: var(--button-color);
  color: var(--background-color);
  /* background-size: 200% 200%; */
}

/* .option:active {
  background-color: #89898940;
} */

.language-name {
  font-size: 18px;
  /* color: var(--text-color); */
}

.language-flag {
  font-size: 18px;
}

.language-options-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.next-button.enter {
  /* 目标位置 */
  right: 20px;
}
</style>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { IonPage, IonContent } from '@ionic/vue';
const { locale } = useI18n()
const selectedLanguage = ref<string | null>(locale.value)
const isDropdownOpen = ref(false)

const router = useRouter()

const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'al', name: 'العربية' },
  { code: 'du', name: 'हिन्द' },
  { code: 'xi', name: 'español' },
  { code: 'yi', name: 'italiano' },
]

const selectedLanguageName = computed(() => {
  if (!selectedLanguage.value) return ''
  const lang = languages.find((lang) => lang.code === selectedLanguage.value)
  return lang ? lang.name : ''
})

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const selectLanguage = (lang: { code: string }) => {
  selectedLanguage.value = lang.code
  locale.value = lang.code
  isDropdownOpen.value = false
  // const button = document.querySelector('.next-button')
  // if (button) {
  //   button.classList.add('enter')
  // }
}

// 监听locale变化，更新selectedLanguage
watch(locale, (newLocale) => {
  selectedLanguage.value = newLocale
})

const getFlag = (code: string) => {
  return '>'
}

// 初始加载时，如果有选中的语言，添加 enter 类
// onMounted(() => {
//   if (selectedLanguage.value) {
//     const button = document.querySelector('.next-button')
//     if (button) {
//       button.classList.add('enter')
//     }
//   }
// })
</script>
