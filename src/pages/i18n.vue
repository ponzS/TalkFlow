<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
    <ion-content>
      <!-- Next Button -->
      <button
        style="--background: #23d5ab"
        :class="nextButton1 ? 'next-button' : 'next-button1'"
        @click="NextButton"
      >
        <p
          style="
            color: var(--text-color);
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            z-index: 9999;
          "
        >
          {{ $t('next') }}
        </p>
        <div class="next-button-bj"></div>
      </button>

      <div @click="winupStart">
        <ponzsColor1 />
      </div>

      <!--:class="['main-content', { 'move-back': loginModel }]" -->
      <div>
        <!-- Clickable Element to Start Winup -->

        <!-- TalkFlow Title -->
        <div :class="titleshow ? 'titleshow1' : 'titleshow'">
          <div :class="winup ? 'talkflow-title1' : 'talkflow-title'">
            <div
              class="talkflow-title-text"
              @click="winupStart"
              style="z-index: 9999 !important; cursor: pointer"
            >
              <p><span style="color: black">Talk</span><span>Flow</span></p>
              <!-- Optional Attribution
            <p style="font-size: 1vw; text-align: right; position: absolute; top: 70%; right: 13%">
              <span style="color: #00ffee">By ponzs.com</span>
            </p>
            --></div>
          </div>
        </div>

        <!-- Interactive Elements -->
        <div style="z-index: 1">
          <!-- Language Selection -->
          <div class="language-selection-page">
            <div class="header"></div>

            <div :class="winup ? 'typing' : 'typing1'">
              <TypingEffect />
            </div>

            <div class="language-options-container">
              <div :class="winup ? 'language-options' : 'language-options1'">
                <div
                  class="option"
                  v-for="lang in languages"
                  :key="lang.code"
                  @click="selectLanguage(lang)"
                  :class="{ active: lang.code === selectedLanguage }"
                >
                  <span class="language-name">{{ lang.name }}</span>
                  <span class="language-flag">{{ lang.flag }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Login Module -->
      <div :class="loginModel1 ? 'login-show' : 'login-hidden'">
        <!-- <div class="login-content"> -->
        <Login />
        <!-- </div> -->
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.titleshow {
  display: block;
  z-index: 9999;
}

.titleshow1 {
  display: none;
  z-index: 9999;
}

/* Main Content Transition */
.main-content {
  transition:
    transform 0.5s ease-in-out,
    opacity 0.5s ease-in-out;
}

.main-content.move-back {
  transform: translateY(-100%);
  opacity: 0;
}

/* Next Button Styles */
.next-button {
  position: fixed;
  top: 50vh;
  right: 20px;
  background-color: #23d5ab;
  border-radius: 10px;
  width: 100%;
  max-width: 130px;
  height: 40px;
  cursor: pointer;
  text-align: center;
  align-items: center;
  justify-content: center;
  display: flex;
  -webkit-tap-highlight-color: transparent;
  z-index: 9999;
  overflow: hidden;
  transition: all 0.3s ease-in-out;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
}

.next-button:active .next-button-bj {
  width: 200%;
  height: 200%;
  border-radius: 50%;
  background-color: #00ffee85;
  transition: all 0.3s ease-in;
  z-index: 9999;
}

/* Next Button Styles */
.next-button1 {
  position: fixed;
  top: 50vh;
  right: -150px;
  background-color: #23d5ab;
  border-radius: 10px;
  width: 100%;
  max-width: 130px;
  height: 40px;
  cursor: pointer;
  text-align: center;
  align-items: center;
  justify-content: center;
  display: flex;
  -webkit-tap-highlight-color: transparent;
  z-index: 9999;
  overflow: hidden;
  transition: all 0.3s ease-in-out;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
}

.next-button1:active .next-button-bj {
  width: 200%;
  height: 200%;
  border-radius: 50%;
  background-color: #00ffee85;
  transition: all 0.3s ease-in;
  z-index: 9999;
}
.next-button-bj {
  position: absolute;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 0%;
  height: 0%;
  background-color: #01ffee85;
  transition: all 0.3s ease-in;
  z-index: 9999;
}

/* Language Selection Page Styles */
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
  background-color: transparent;
  z-index: 99;
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

.language-options1 {
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  background-color: #89898940;
  backdrop-filter: blur(10px);
  border-radius: 20px;
  width: 100%;
  padding: 10px;
  padding-bottom: 30px;
  height: 39vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c3cfe2 #f5f5f5;
  transition: all 0.3s ease-in-out;
  transform: translateY(150%);
  z-index: 99;
}

.language-options {
  transform: translateY(0);
  box-shadow: 0 0 10px 0 rgba(255, 255, 255, 0.685);
  background-color: #89898940;
  backdrop-filter: blur(10px);
  border-radius: 20px 20px 0 0;
  width: 100%;
  padding: 10px;
  padding-bottom: 30px;
  height: 39vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c3cfe2 #f5f5f5;
  transition: all 0.3s ease-in-out;
  z-index: 99;
}

.language-options::-webkit-scrollbar {
  width: 8px;
  z-index: 99;
}

.language-options::-webkit-scrollbar-track {
  background: var(--background-color);
  border-radius: 4px;
  z-index: 99;
}

.language-options::-webkit-scrollbar-thumb {
  background-color: var(--text-color);
  border-radius: 4px;
  border: 2px solid var(--background-color);
  z-index: 99;
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin: 10px 0;
  background-color: #23d5ab;
  box-shadow: 0 0 10px 0 #23d5ab;
  color: black;
  border-radius: 10px;
  cursor: pointer;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  z-index: 99;
}

.option.active {
  background-color: black;
  color: white;
}

.language-name {
  font-size: 18px;
}

.language-flag {
  font-size: 18px;
}

.language-options-container {
  width: 100%;
  display: flex;
  justify-content: center;
  z-index: 99;
}

/* Typing Effect Styles */
.typing1 {
  transform: scale(0);
  transition: transform 0.3s ease-in-out;
}
.typing {
  transform: scale(1);
  transition: transform 0.3s ease-in-out;
}

/* TalkFlow Title Styles */
.talkflow-title1 {
  transform: scale(0);
  transition: transform 0.3s ease-in-out;
}

.talkflow-title {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  transition: transform 0.3s ease-in-out;
}

.talkflow-title-text {
  font-size: 20vw;
  font-weight: bold;
  color: transparent;
  text-shadow: 0 0 10px 0 rgba(0, 255, 217, 0.5);
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0);
  background: linear-gradient(-45deg, #52eed1, #000000, #23d5b4, #23d5ab);
  -webkit-background-clip: text;
  background-clip: text;
  z-index: 9999;
  background-size: 200% 200%;
  animation: gradientBreath 10s ease infinite;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
}

/* Login Module Transition Styles */
.login-show {
  position: absolute;
  top: 30%;
  right: 100%;
  transition: all 0.3s ease-in-out;
  z-index: 9998;
}

.login-hidden {
  position: absolute;
  top: 30%;
  right: -200%;
  transition: all 0.3s ease-in-out;
  z-index: 9998;
}


.main-content.move-back .talkflow-title-text {
  /* opacity: 0; */
  transition: opacity 0.3s ease-in-out;
}


</style>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { IonPage, IonContent } from '@ionic/vue'
import { useChatFlow } from '@/composables/TalkFlowCore'
import soundManager from '@/composables/sounds'





const titleshow = ref(false)

const loginModel1 = ref(false)
// Internationalization
const { locale } = useI18n()

// Reactive State Variables
const selectedLanguage = ref<string | null>(null)
const isDropdownOpen = ref(false)
const loginModel = ref(false)
const winup = ref(false)
const { LoginData, isLoggedIn, restoreLoginState } = useChatFlow()
const nextButton1 = ref(false)
// Router Instance
const router = useRouter()
const nextButtonshow = () => {
  nextButton1.value = true
}
// Function to Start Winup Animation
const winupStart = () => {
  soundManager.play('click3')
  winup.value = true
}

const LoginGo = () => {
  // winup.value = false
  loginModel1.value = true
}

// Function to Handle Next Button Click
const NextButton = () => {
  soundManager.play('click5')
  titleshow.value = true
  nextButton1.value = false
  winup.value = false
  loginModel1.value = true
}

// Language Options
const languages = [
  { code: 'en', name: 'English', flag: '🌍' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },

  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'al', name: 'العربية', flag: '🇦🇱' },
  { code: 'du', name: 'हिन्द', flag: '🇮🇳' },
  { code: 'xi', name: 'español', flag: '🇪🇸' },
  { code: 'yi', name: 'italiano', flag: '🇮🇹' },
]


const selectedLanguageName = computed(() => {
  if (!selectedLanguage.value) return ''
  const lang = languages.find((lang) => lang.code === selectedLanguage.value)
  return lang ? lang.name : ''
})


// Function to Select a Language
const selectLanguage = (lang: { code: string }) => {
  // soundManager.play('click4')
  selectedLanguage.value = lang.code
  locale.value = lang.code
  nextButtonshow()
 
}

watch(locale, (newLocale) => {
  selectedLanguage.value = newLocale
})

</script>
