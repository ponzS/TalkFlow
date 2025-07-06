<template>
  <RouterLink to="/">
    <button class="next-button" @mousedown.prevent>
      <p
        style="
          text-decoration: none;
          color: var(--text-color);
          font-size: 18px;
          font-weight: 700;
          pointer-events: none;
        "
      >
        {{ $t('next') }}
      </p>
    </button>
  </RouterLink>
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
</template>

<style scoped>
.next-button {
  position: fixed;
  top: 80px;
  right: 20px;
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
}

.next-button:active {
  background-color: var(--button-color);
}

.language-selection-page {
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
  max-width: 400px;
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
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const selectedLanguage = ref(locale.value)
const isDropdownOpen = ref(false)

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
  isDropdownOpen.value = !isDropdownOpen.value
}

// 监听locale变化，更新selectedLanguage
watch(locale, (newLocale) => {
  selectedLanguage.value = newLocale
})

const getFlag = (code: string) => {
  return '->'
}
</script>
