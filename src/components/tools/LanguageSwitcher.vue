<template>
  <div class="custom-dropdown" @click="toggleDropdown">
    <div class="selected">
      {{ selectedLanguageName }}
      <span><div class="i-tabler-world"></div></span>
    </div>
    <div class="options" v-if="isDropdownOpen">
      <div class="option" v-for="lang in languages" :key="lang.code" @click="selectLanguage(lang)">
        {{ lang.name }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.i-tabler-world {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m.6-3h16.8M3.6 15h16.8'/%3E%3Cpath d='M11.5 3a17 17 0 0 0 0 18m1-18a17 17 0 0 1 0 18'/%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}

.selected {
  display: flex;
  justify-content: space-between;
  align-items: center;
  white-space: nowrap;
}
.selected .i-tabler-world {
  margin-left: 2px;
}

.custom-dropdown {
  position: relative;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  border-radius: 15px;
  background-color: var(--text-color);
  color: var(--background-color);
  padding: 3px 6px; /* 增加垂直内边距 */
  transition: all 0.3s ease; /* 加快过渡动画 */
  width: 80px; /* 固定宽度替代百分比 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 添加阴影 */
}

.custom-dropdown:hover {
  transition: all 0.3s ease;
  border-radius: 10px 10px 0 0; /* 减小圆角半径 */
  width: 120px; /* 轻微增加宽度 */
}

.options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--background-color);
  border: 2px solid var(--text-color); /* 减小边框宽度 */
  border-top: none; /* 移除顶部边框 */
  border-radius: 0 0 10px 10px; /* 减小圆角半径 */
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* 添加阴影 */
}

.option {
  padding: 8px 20px; /* 统一内边距 */
  color: var(--text-color);
  transition: background-color 0.2s ease; /* 添加过渡效果 */
}

.option:hover {
  background-color: rgba(200, 200, 200, 0.2); /* 减小悬停背景不透明度 */
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
</script>
