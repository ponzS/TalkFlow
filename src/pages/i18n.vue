<!-- src/views/LanguageSelectionPage.vue -->
<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
    <ion-content>
      <!-- <div @click="winupStart">
        <ponzsColor1 />
      </div> -->
      <div class="aurora-background1" @click="winupStart"></div>
      <div class="aurora-background" @click="winupStart">

    <canvas ref="canvas" />
  </div>
      <div>
        <!-- TalkFlow Title -->
        <div :class="titleshow ? 'titleshow1' : 'titleshow'">
          <div :class="winup ? 'talkflow-title1' : 'talkflow-title'">
            <div
              class="talkflow-title-text"
              @click="winupStart"
              style="z-index: 9999 !important; cursor: pointer"
            >
              <p><span style="color: black">Talk</span><span>Flow</span></p>
            </div>
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
                  <!-- <span class="language-flag">{{ lang.flag }}</span> -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- EULA Module -->
   <!-- EULA Module (使用英文静态文本) -->
   <div :class="showEula ? 'eula-panel' : 'eula-panel-hidden'">
        <div class="eula-content">
          <h2>End User License Agreement</h2>
          <p><strong>Last Updated: March 12, 2025</strong></p>
          <div class="eula-section">
            <strong>1. Acceptance of Terms</strong>
            <p>By using TalkFlow (hereinafter "the App"), you agree to be bound by this End User License Agreement (hereinafter "EULA"). If you do not agree, please do not use the App.</p>
          </div>
          <div class="eula-section">
            <strong>2. License Grant</strong>
            <p>TalkFlow grants you a non-exclusive, non-transferable license to use the App for personal or commercial purposes, subject to the terms of this EULA. The App operates on a decentralized network, and you are responsible for managing your data and keys.</p>
          </div>
          <div class="eula-section">
            <strong>3. User Conduct</strong>
            <p>You agree not to use the App for: <br>- Posting, sharing, or transmitting inappropriate content, including but not limited to hate speech, harassment, violence, pornography, or illegal content.<br>- Engaging in abusive behavior towards other users, such as spamming, provocation, threats, or malicious interference with network nodes.<br>- Violating any applicable laws or regulations, including but not limited to data privacy and communication laws.</p>
          </div>
          <div class="eula-section">
            <strong>4. Content Moderation</strong>
            <p>For content transmitted through public relay nodes, TalkFlow reserves the right to monitor, review, and block user-generated content that violates this EULA. For private nodes or peer-to-peer connections, you are responsible for content management. Report inappropriate content via the in-app feature or email zhangguoai888@gmail.com.</p>
          </div>
          <div class="eula-section">
            <strong>5. Termination</strong>
            <p>We may suspend or terminate your access to the App, with or without notice, if you violate this EULA. Data on the decentralized network may persist on other nodes, for which we are not responsible.</p>
          </div>
          <div class="eula-section">
            <strong>6. No Warranty</strong>
            <p>The App is provided "as is" without any express or implied warranties, including but not limited to the stability of the decentralized network or reliability of data transmission. Service availability may vary due to network conditions.</p>
          </div>
          <div class="eula-section">
            <strong>7. Limitation of Liability</strong>
            <p>TalkFlow is not liable for any damages arising from your use of the App, including but not limited to data loss, key loss, or third-party actions. No key recovery service is provided; key loss will result in inaccessible encrypted data. Please safeguard your keys.</p>
          </div>
          <div class="eula-section">
            <strong>8. EULA Changes</strong>
            <p>We may update this EULA at any time, with the updated version published in the App or through official channels. Continued use of the App constitutes acceptance of the updated terms.</p>
          </div>
          <div class="eula-section">
            <strong>9. Contact Information</strong>
            <p>For questions or support, contact us at zhangguoai888@gmail.com. Due to the decentralized nature of the App, some issues may require you to troubleshoot node or key settings independently.</p>
          </div>
          <div class="eula-section">
            <p>Clicking "I Agree" indicates that you have read, understood, and agreed to all terms of this EULA and accept the responsibilities and risks associated with using a decentralized real-time communication service.</p>
          </div>
        </div>
        <div class="eula-buttons">
          <button class="eula-decline" @click="declineEula">
            <p style="font-size: 18px; font-weight: 700; cursor: pointer; z-index: 9999;">Decline</p>
          </button>
          <button class="eula-agree" @click="agreeEula" style="--background: #23d5ab; color: antiquewhite;">
            <p style="font-size: 18px; font-weight: 700; cursor: pointer; z-index: 9999;">I Agree</p>
          </button>
        </div>
      </div>

      <!-- Login Module -->
      <div :class="loginModel1 ? 'login-show' : 'login-hidden'">
        <div>
    <!-- 登录卡片 -->
    <div :class="['login-card', { hidden: isCreateKey }]">
   
      <div class="login-container">
        <!-- 密码输入框 -->
        <div class="login-input floating-label-container">
          <input
            type="password"
            v-model="passphrase"
            @focus="setFocus('passphrase')"
            @blur="removeFocus('passphrase')"
          />
          <label :class="{ active: isFocused.passphrase || passphrase }">{{ $t('password') }} (AES)</label>
        </div>
        <!-- 加密私钥多行输入框 -->
        <div class="floating-label-container" style="margin: 8px 0">
          <textarea
            v-model="encryptedKeyInput"
            @focus="setFocus('encryptedKeyInput')"
            @blur="removeFocus('encryptedKeyInput')"
            style="background-color: #000000; color: #efefef8e"
          ></textarea>
          <label :class="{ active: isFocused.encryptedKeyInput || encryptedKeyInput }"
            >Key</label
          >
        </div>
        <div v-if="loginError" style="color: red; margin-top: 8px">{{ loginError }}</div>
        
        <!-- QR扫描选项 -->
        <div class="qr-options">
          <!-- <ion-button color="dark" @click="scanQRCode" style="flex: 1; margin-right: 8px;">
            <ion-icon :icon="scanOutline" ></ion-icon>
         
          </ion-button> -->
          <ion-button color="dark" @click="pickFromGallery" style="flex: 1; margin-left: 8px;">
            <ion-icon :icon="imageOutline" ></ion-icon>
            <!-- {{ $t('gallery') || 'From Gallery' }} -->
          </ion-button>
        </div>
<!-- class="login-button" -->
     
          <ion-button color="dark"  @click="OnLongin" style="margin-top: 8px">{{ $t('login') }}</ion-button>
          <ion-button color="dark"  @click="goCreateKey" style="margin-top: 8px">
            {{ $t('register') }}
          </ion-button>
     
      </div>
    </div>

    <!-- 创建密钥卡片 -->
    <div :class="[KeyDown ? 'create-key-card1' : 'create-key-card', { visible: isCreateKey }]">
      <div class="login-container">
        <!-- 生成新密钥对 -->
        <div>
          <!-- <h3>生成密钥对 (Create Key Pair)</h3> -->
          <item class="login-input floating-label-container">
            <input
              v-model="newAlias"
              @focus="setFocus('newAlias')"
              @blur="removeFocus('newAlias')"
              placeholder=""
            />
            <label :class="{ active: isFocused.newAlias || newAlias }">{{ $t('username') }}</label>
          </item>
          <div style="margin: 8px 0;"/>
          <item class="login-input floating-label-container">
            <input
              type="password"
              v-model="newPassphrase"
              @focus="setFocus('newPassphrase')"
              @blur="removeFocus('newPassphrase')"
              placeholder=""
            />
          
            <label :class="{ active: isFocused.newPassphrase || newPassphrase }"
              >{{ $t('password') }} (AES)</label
            >
          </item>

          <ion-button
            color="dark"
            expand="block"
            @click="KeyCardDown"
            style="margin-top: 8px; font-weight: 700"
          >
            {{ $t('register1') }}
          </ion-button>
          <p
            v-if="generateMsg"
            style="
              margin: 10px 0px;
              color: #efefef8e;
              font-weight: 700;
              font-size: 13px;
              border: 1px solid #4caf50;
              border-radius: 10px;
              padding: 8px;
              background-color: black;
            "
          >
            {{ generateMsg }}
          </p>

          <div
            v-if="encryptedKeyPair"
            style="
              margin-top: 8px;
             
              padding: 8px;
              background-color: black;
              border-radius: 19px;
              color: #efefef8e;
            "
          >
            <h4>Key:</h4>
            <p
              style="
                word-break: break-all;
                max-height: 90px;
                overflow-y: auto;
               
                border-radius: 10px;
               
              "
            >
              {{ encryptedKeyPair }}
            </p>
            <!-- <button @click="downloadEncryptedKeyPair">下载加密私钥 JSON</button> -->
            <ion-button
              color="dark"
             expand="block"
              @click="copyPub(encryptedKeyPair)"
             
            >
              Copy
            </ion-button>
          </div>
        </div>

        <ion-button expand="block" color="dark" @click="backToLogin" style="margin-top: 8px">{{ $t('back') }}</ion-button>
      </div>
    </div>
  </div>
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

.language-options1 {
  /* box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  background-color: #89898940; */
  /* backdrop-filter: blur(10px); */
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
  /* box-shadow: 0 0 10px 0 rgba(255, 255, 255, 0.685); */
  /* background-color: #89898940; */
  /* backdrop-filter: blur(10px); */
  border-radius: 20px 20px 0 0;
  width: 100%;
  padding: 10px;
  padding-bottom: 30px;
  height: 70vh;
  overflow-y: auto;
  scrollbar-width: thin;
  /* scrollbar-color: #c3cfe2 #f5f5f5; */
  transition: all 0.3s ease-in-out;
  z-index: 99;
}

.language-options::-webkit-scrollbar {
  width: 8px;
  z-index: 99;
}

.language-options::-webkit-scrollbar-track {
  /* background: var(--background-color); */
  border-radius: 4px;
  z-index: 99;
}

.language-options::-webkit-scrollbar-thumb {
  /* background-color: var(--text-color); */
  border-radius: 4px;
  /* border: 2px solid var(--background-color); */
  z-index: 99;
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin: 10px 0;
  background-color: #00fff2;
  box-shadow: 0 0 10px 0 #00fff2;
  color: black;
  border-radius: 10px;
  cursor: pointer;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  z-index: 99;
}

.option.active {
  background-color: black;
  color: white;
  box-shadow: 0 0 10px 0 #000000;
}

.language-name {
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
  height: 100%;
  width: 100%;
  display: flex;
  text-align: center;
  align-self:center;
  justify-content: center;
  align-items: center;
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

/* EULA Panel Styles */
.eula-panel {
  position: fixed;
  top: 0vh;
  right: 0px;
  width: 100%;
  /* max-width: 500px; */
  height: 100vh;
  background-color: #000000;
  backdrop-filter: blur(30px);

  padding:120px 15px;
  box-shadow: 0 0 10px 0 rgba(255, 255, 255, 0.685);
  transition: all 0.3s ease-in-out;
  z-index: 9999;
  overflow-y: auto;
}

.eula-panel-hidden {
  position: fixed;
  top: 0vh;
  right: -200%;
  width: 100%;
  /* max-width: 500px; */
  height: 100vh;
  background-color: #89898940;
  backdrop-filter: blur(30px);

  padding:120px 15px;
  box-shadow: 0 0 10px 0 rgba(255, 255, 255, 0.685);
  transition: all 0.3s ease-in-out;
  z-index: 9999;
  overflow-y: auto;
}

.eula-content {
  color: white;
  font-family: 'Arial', sans-serif;
  
}

.eula-section {
  margin-bottom: 15px;
}

.eula-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}

.eula-agree {
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
  overflow: hidden;
  transition: all 0.3s ease-in-out;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
}

.eula-agree:active .next-button-bj {
  width: 200%;
  height: 200%;
  border-radius: 50%;
  background-color: #00ffee85;
  transition: all 0.3s ease-in;
}

.eula-decline {
  background-color: #ff4444;
  border-radius: 10px;
  width: 100%;
  max-width: 130px;
  height: 40px;
  color: white;
  cursor: pointer;
  text-align: center;
  align-items: center;
  justify-content: center;
  display: flex;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
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
.aurora-background {
  width: 100vw;
  height: 100vh;
  margin: 0;
  position: fixed;
  top: 0;
  left: 0;
  transform: scale(3);
  background-color: transparent;
  transition: all 0.5s ease-in-out;
  z-index: -3;
  
  overflow: hidden;
}
.aurora-background1 {
  width: 100vw;
  height: 100vh;
  margin: 0;
  position: fixed;
  top: 0;
  left: 0;
  backdrop-filter: blur(20px);
  /* transform: scale(3);
  background-color: transparent;
  transition: all 0.5s ease-in-out; */
  z-index: -2;
  overflow: hidden;
}

@media (max-width: 768px) {
  .aurora-background {
    transform: scale(1);
    transition: all 0.5s ease-in-out;
  }
}

.bj-login {
  position: fixed;
  z-index: -2;
  display: flex;
  justify-content: center;
  align-items: center;
  /* background: rgb(0, 0, 0); */
  /* backdrop-filter: blur(10px); */
  border-radius: 10px;

  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}
/* 基础样式 */
.login-card,
.create-key-card {
  position: fixed;
  width: 100dvw;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.5s ease-in-out;
}
.create-key-card1 {
  position: fixed;
  width: 100dvw;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.5s ease-in-out;
}
/* 登录卡片的初始和动画状态 */
.login-card {
  background-color: transparent;
  z-index: 1;
  transform: translateY(0%);
}

.login-card.hidden {
  transform: translateY(-150%);
  
}
canvas {
  width: 100vw !important;
  height: 100vh !important;
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1; /* 确保可见，但不遮挡内容 */
}
/* 创建密钥卡片的初始和动画状态 */
.create-key-card {
  background-color: transparent;
  z-index: 2;
  transform: translateY(150%);
}

.create-key-card.visible {
  transform: translateY(0%);
}
.create-key-card1 {
  background-color: transparent;
  z-index: 2;
  transform: translateY(150%);
}

.create-key-card1.visible {
  transform: translateY(-22%);
}

/* 登录容器 */
.login-container {

  /* border: 3px solid #00ffd08e; */
  overflow: hidden;
  /* margin: 0 2%; */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  width: 95%;
  max-width: 700px;
  height: auto;
  /* background: rgb(0, 0, 0); */
  /* box-shadow:10px 10px  #43434368; */
  position: fixed;
  top: 0;
  border-radius: 10px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease-in-out;
}

/* 原有输入框样式保持不变 */
.login-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* border: 1px solid #000000; */
  border-radius: 5px;
  /* padding: 3px; */
  /* border: 2px solid #efefef8e; */
}

.login-input input {
  /* border: 1px solid #000000; */
  /* border: 2px solid #efefef8e; */
  background-color: #000000;
  color: rgb(141, 141, 141);
  border-radius: 5px;
  width: 100%;
  /* padding: 10px; */
  font-size: 13px;
}

/* 新增：浮动标签容器，用于实现输入框提示文字动画效果 */
.floating-label-container {
  position: relative;
}

.floating-label-container input,
.floating-label-container textarea {
  width: 100%;
  padding: 16px;
  font-size: 15px;
  background-color: #000000;
  color: rgb(141, 141, 141);
  /* border: 2px solid #efefef8e; */
  border: none;
  /* border: 1px solid green; */
  border-radius: 5px;
  outline: none;
  transition: border-color 0.3s;
}

/* 使 textarea 保持原有样式（如需调整高度，可在行内样式中控制） */
.floating-label-container textarea {
  /* border: 2px solid #efefef8e; */
  resize: none;
}

/* 浮动标签 */
.floating-label-container label {
  
  position: absolute;
  left: 14px;
  top: 14px;
  color: rgb(141, 141, 141);
  pointer-events: none;
  transition: all 0.3s ease;
}

/* 当聚焦或者输入框有内容时，标签上移并缩小 */
.floating-label-container label.active {
  top: -10px;
  left: 5px;
  font-size: 12px;
  color: #efefef8e;
  /* background-color: #000000; */
  padding: 0 3px;
}
.login-button {
  border: 2px solid #efefef8e;
  background-color: #000000;
  color: #efefef8e;

  border-radius: 10px;
  padding: 10px;
  font-size: 13px;
  font-weight: 700;
}
/* 按钮容器 */
.login-button-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* QR扫描选项按钮容器 */
.qr-options {
  display: flex;
  justify-content: space-between;
  margin: 12px 0 8px 0;
  width: 100%;
}

/* 扫描二维码时隐藏背景元素 */
.hidden-during-scan {
  display: none !important;
}
</style>

<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { useLanguage } from '@/composables/useLanguage';
import { useI18n } from 'vue-i18n';
import soundManager from '@/composables/sounds';
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import {  reactive, watch } from 'vue'
import { nextTick } from 'vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
const chatFlow = getTalkFlowCore();
const canvas = ref<HTMLCanvasElement | null>(null);
import { useRouter } from 'vue-router'
import { scanOutline, imageOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import jsQR from 'jsqr';

const router = useRouter()

const isCreateKey = ref(false)

const {
  copyPub,
  newAlias,
  newPassphrase,
  generateMsg,
  encryptedKeyPair,
  generateKeyPair,
  passphrase,
  encryptedKeyInput,
  importKeyPair,
  isLoggedIn,
  currentUserPub,
  currentUserAlias,
  loginError,
  KeyDown,
} = chatFlow 

// 新增：输入框聚焦状态管理，用于控制浮动标签效果
const isFocused = reactive({
  passphrase: false,
  encryptedKeyInput: false,
  newAlias: false,
  newPassphrase: false,
})

function setFocus(field: 'passphrase' | 'encryptedKeyInput' | 'newAlias' | 'newPassphrase') {
  isFocused[field] = true
}

function removeFocus(field: 'passphrase' | 'encryptedKeyInput' | 'newAlias' | 'newPassphrase') {
  isFocused[field] = false
}


// 登录逻辑
const OnLongin = async () => {
  soundManager.play('click5');
  await importKeyPair();
  if (isLoggedIn.value === true) {
    console.log('登录成功，状态:', {
      isLoggedIn: isLoggedIn.value,
      pub: currentUserPub.value,
      alias: currentUserAlias.value,
    });
    await router.replace('/index');
  } else {
    console.log('登录失败:', loginError.value);
  }
};
// 生成密钥对
const KeyCardDown = () => {
  generateKeyPair()
  setPurpleColors()
}

// 切换到创建密钥界面
const goCreateKey = () => {
  soundManager.play('click4')
  isCreateKey.value = true
  
  setSunsetColors();
}

// 创建密钥并返回登录界面
const backToLogin = async () => {
  soundManager.play('click4')
  isCreateKey.value = false
  setDeepSpaceColors();
}

const purpleColors = {
  color1: new THREE.Color(0xd8a7f7), // 淡紫色
  color2: new THREE.Color(0x9b7bde), // 柔和的紫色
  color3: new THREE.Color(0x7c56b8), // 浅紫色
}
const purpleColors1 = {
  color1: new THREE.Color(0xd8a7f7), // 淡紫色
  color2: new THREE.Color(0x9b7bde), // 柔和的紫色
  color3: new THREE.Color(0x7c56b8), // 浅紫色
}

const neonColors = {
  color1: new THREE.Color(0x00f0ff), // 明亮的蓝色
  color2: new THREE.Color(0x00b8b8), // 蓝绿色
  color3: new THREE.Color(0x005555), // 深色调
}

const auroraColors = {
  color1: new THREE.Color(0xffc0cb), // 浅粉色
  color2: new THREE.Color(0xffa7c7), // 柔和的粉色
  color3: new THREE.Color(0xff77a9), // 中等粉色
}

const sunsetColors = {
  color1: new THREE.Color(0x000000), // 纯黑色
  color2: new THREE.Color(0x808080), // 中灰色
  color3: new THREE.Color(0xffffff), // 纯白色
}
// const vibrantOrangeColors = {
//   color1: new THREE.Color(0xff6600), // 深橙色
//   color2: new THREE.Color(0xff9900), // 明亮的橙黄色
//   color3: new THREE.Color(0xffcc00), // 明黄色
//   color4: new THREE.Color(0xff5733), // 较深的红橙色
//   color5: new THREE.Color(0xd35400), // 暗橙色
//   color6: new THREE.Color(0x8b3e2f), // 带点红棕色的暗橙色
// }
const deepSpaceColors = {
  color1: new THREE.Color(0x132742), // 深空蓝
  color2: new THREE.Color(0x2e1b47), // 深紫色
  color3: new THREE.Color(0x005555), // 黑色
}
const ponzsColors = {
  color1: new THREE.Color(0x20e6df),
  color2: new THREE.Color(0xaf2ab8),
  color3: new THREE.Color(0x6d274f),
}
const ponzsColors1 = {
  color1: new THREE.Color(0x20e6df),
  color2: new THREE.Color(0xaf2ab8),
  color3: new THREE.Color(0x6d274f),
}
// 当前和目标色系
const colors = ref(ponzsColors)
const targetColors = ref(ponzsColors)
const transitionSpeed = 0.05 // 渐变速度

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let clock: THREE.Clock
let object: THREE.Mesh




// 初始化 Three.js 场景
const initThreeJS = (canvas: HTMLCanvasElement) => {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  clock = new THREE.Clock()

  createAuroraObject()

  camera.position.set(0, 0, 23)
  camera.lookAt(0, 0, 0)

  animate()
}

// 创建动态物体
const createAuroraObject = () => {
  const geometry = new THREE.IcosahedronGeometry(10, 4)
  geometry.computeVertexNormals()

  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader(),
    fragmentShader: fragmentShader(),
    uniforms: {
      time: { value: 0 },
      color1: { value: colors.value.color1 },
      color2: { value: colors.value.color2 },
      color3: { value: colors.value.color3 },
    },
    side: THREE.DoubleSide,
    wireframe: false,
  })

  object = new THREE.Mesh(geometry, material)
  scene.add(object)
}

// 顶点着色器
const vertexShader = () => `
  uniform float time;
  varying vec3 vPosition;
  varying float vNoise;
  void main() {
    vPosition = position;
    vNoise = sin(position.x * 10.0 + time) * 0.5;
    vec3 newPosition = position + normal * vNoise;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`

// 片段着色器
const fragmentShader = () => `
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  varying float vNoise;
  void main() {
    vec3 color = mix(color1, color2, vNoise);
    color = mix(color, color3, abs(sin(vNoise * 2.0)));
    gl_FragColor = vec4(color, 1.0);
  }
`

// 动画循环
const animate = () => {
  requestAnimationFrame(animate)

  const time = clock.getElapsedTime()
  const material = object.material as THREE.ShaderMaterial
  material.uniforms.time.value = time

  // 更新颜色渐变
  updateColorTransition()

  object.rotation.x += 0.002
  object.rotation.y += 0.002

  renderer.render(scene, camera)
}

// 颜色渐变：每一帧逐步插值至目标颜色
const updateColorTransition = () => {
  colors.value.color1.lerpHSL(targetColors.value.color1, transitionSpeed)
  colors.value.color2.lerpHSL(targetColors.value.color2, transitionSpeed)
  colors.value.color3.lerpHSL(targetColors.value.color3, transitionSpeed)

  const material = object.material as THREE.ShaderMaterial
  material.uniforms.color1.value = colors.value.color1
  material.uniforms.color2.value = colors.value.color2
  material.uniforms.color3.value = colors.value.color3
}

// 窗口大小变化时，更新渲染器和摄像机
const onWindowResize = () => {
  if (renderer && camera) {
    const width = window.innerWidth
    const height = window.innerHeight

    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
}
const selectedColor = ref<string>('purple')
// 色系切换函数
const setDefaultColors = () => {
  targetColors.value = purpleColors
  selectedColor.value = 'purple'
}

const setPurpleColors = () => {
  targetColors.value = purpleColors1
  selectedColor.value = 'purple'
}

const setNeonColors = () => {
  targetColors.value = neonColors
  selectedColor.value = 'neon'
}

const setAuroraColors = () => {
  targetColors.value = auroraColors
  selectedColor.value = 'aurora'
}

const setSunsetColors = () => {
  targetColors.value = sunsetColors
  selectedColor.value = 'sunset'
}

const setDeepSpaceColors = () => {
  targetColors.value = deepSpaceColors
  selectedColor.value = 'deepSpace'
}

const setPonzsColors = () => {
  targetColors.value = ponzsColors
  selectedColor.value = 'ponzs'
}
const setPonzsColors1 = () => {
  targetColors.value = ponzsColors1
  selectedColor.value = 'ponzs1'
}
// 定义 EULA 章节类型
interface EulaSection {
  title: string;
  content: string;
}

interface EulaSections {
  [key: string]: EulaSection;
}

const titleshow = ref(false);
const loginModel1 = ref(false);
const winup = ref(false);
const showEula = ref(false);

const { t } = useI18n();

// 使用 useLanguage 模块
const { languages, selectedLanguage, selectLanguage: selectLang, initLanguage } = useLanguage();

// EULA 章节数据
const sections = t('eula.sections') as unknown as EulaSections;

const winupStart = () => {
  soundManager.play('click3');
  winup.value = true;
  setNeonColors();
};

const selectLanguage = (lang: { code: string; name: string; flag: string }) => {
  selectLang(lang);
  soundManager.play('click5');
  showEula.value = true; // 选择语言后显示 EULA
  // setDeepSpaceColors();
  // setAuroraColors();
  setAuroraColors();
};

const agreeEula = () => {
  soundManager.play('click5');
  titleshow.value = true;
  winup.value = false;
  showEula.value = false;
  loginModel1.value = true; // 同意后显示登录模块
  setDeepSpaceColors();
};
// import { App } from '@capacitor/app';
const declineEula = () => {
  soundManager.play('click5');
  showEula.value = false; // 拒绝后隐藏 EULA，不进入登录模块
  setPonzsColors1();
  //  App.exitApp();
};

onMounted(async () => {
  console.log('LanguageSelectionPage 挂载');
  await initLanguage(); // 确保语言初始化完成
  await nextTick(); // 等待 DOM 更新
  if (canvas.value) {
    console.log('找到 Canvas，开始初始化 Three.js');
    try {
      await initThreeJS(canvas.value);
      window.addEventListener('resize', onWindowResize);
      console.log('Three.js 初始化成功');
    } catch (err) {
      console.error('Three.js 初始化失败:', err);
    }
  } else {
    console.error('未找到 Canvas 元素');
  }
});



// 组件卸载时清理事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
})

// 扫描二维码的方法
const scanQRCode = async () => {
  try {
    soundManager.play('click4');
    
    // 检查权限
    const status = await BarcodeScanner.checkPermission({ force: true });
    
    if (status.granted) {
      // 准备扫描
      document.body.style.background = "transparent";
      document.querySelector('.aurora-background')?.classList.add('hidden-during-scan');
      document.querySelector('.aurora-background1')?.classList.add('hidden-during-scan');
      
      // 启动扫描
      BarcodeScanner.hideBackground();
      const result = await BarcodeScanner.startScan();
      
      // 处理扫描结果
      if (result.hasContent) {
        encryptedKeyInput.value = result.content;
        console.log('二维码内容已复制到密钥输入框');
      }
    } else {
      console.log('未获得摄像头权限');
    }
  } catch (error) {
    console.error('扫描二维码时出错:', error);
  } finally {
    // 恢复界面
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.style.background = "";
    document.querySelector('.aurora-background')?.classList.remove('hidden-during-scan');
    document.querySelector('.aurora-background1')?.classList.remove('hidden-during-scan');
  }
};

// 从相册选择图片并解析二维码
const pickFromGallery = async () => {
  try {
    soundManager.play('click4');
    
    // 请求权限并打开相册
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });
    
    if (!image.dataUrl) {
      console.error('无法获取图片数据');
      return;
    }
    
    // 创建Image对象用于加载图片
    const img = new Image();
    img.onload = () => {
      // 创建canvas并绘制图片
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('无法创建canvas 2d上下文');
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0, img.width, img.height);
      
      // 获取图像数据
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // 使用jsQR库解析二维码
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code) {
        // 二维码解析成功，将内容填充到输入框
        encryptedKeyInput.value = code.data;
        console.log('QR code content extracted from image and copied to input field');
      } else {
        alert('No QR code found');
        console.log('No valid QR code found in image');
      }
    };
    
    // 设置图片源并开始加载
    img.src = image.dataUrl;
    
  } catch (error) {
    console.error('从相册选择图片时出错:', error);
  }
};

</script> 