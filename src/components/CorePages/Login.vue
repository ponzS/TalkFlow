<!-- eslint-disable vue/multi-word-component-names -->
<template>

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

        <div class="login-button-container">
          <button class="login-button" @click="OnLongin" style="margin-top: 8px">{{ $t('login') }}</button>
          <button class="login-button" @click="goCreateKey" style="margin-top: 8px">
            {{ $t('register') }}
          </button>
        </div>
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

          <button
            class="login-button"
            @click="KeyCardDown"
            style="margin-top: 8px; font-weight: 700"
          >
            {{ $t('register1') }}
          </button>
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
              border: 1px solid #4caf50;
              padding: 8px;
              background-color: black;
              border-radius: 10px;
              color: #efefef8e;
            "
          >
            <h4>Key:</h4>
            <p
              style="
                word-break: break-all;
                max-height: 90px;
                overflow-y: auto;
                border: 1px solid #efefef8e;
                border-radius: 10px;
                padding: 8px;
              "
            >
              {{ encryptedKeyPair }}
            </p>
            <!-- <button @click="downloadEncryptedKeyPair">下载加密私钥 JSON</button> -->
            <button
              class="login-button"
              fill="clear"
              @click="copyPub(encryptedKeyPair)"
              style="border: 1px solid #efefef8e"
            >
              Copy
            </button>
          </div>
        </div>

        <button class="login-button" @click="backToLogin" style="margin-top: 8px">{{ $t('back') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

const chatFlow = getTalkFlowCore();

import { useRouter } from 'vue-router'
import soundManager from '@/composables/sounds'

const router = useRouter()

const isCreateKey = ref(false)

const {
  copyPub,
  newAlias,
  newPassphrase,
  generateMsg,
  encryptedKeyPair,
  generateKeyPair,

  // Login
  passphrase,
  encryptedKeyInput,
  importKeyPair,
  isLoggedIn,
  currentUserPub,
  currentUserAlias,
  loginError,
  // Logout
  onLogout,
  chatMessages,
  // Refs
  chatListRef,
  LoginData,
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
}

// 切换到创建密钥界面
const goCreateKey = () => {
  soundManager.play('click4')
  isCreateKey.value = true
}

// 创建密钥并返回登录界面
const backToLogin = async () => {
  soundManager.play('click4')
  isCreateKey.value = false
}

// 监听聊天消息，自动滚动
watch(chatMessages, () => {
  if (chatListRef.value) {
    chatListRef.value.scrollTop = chatListRef.value.scrollHeight
  }
})
</script>

<style>
.bj-login {
  position: fixed;
  z-index: -2;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgb(0, 0, 0);
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
  background: rgb(0, 0, 0);
  box-shadow:10px 10px  #000000cd;
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
  border-radius: 8px;
  /* padding: 3px; */
  border: 2px solid #efefef8e;
}

.login-input input {
  /* border: 1px solid #000000; */
  border: 2px solid #efefef8e;
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
  border: 2px solid #efefef8e;
  border: none;
  /* border: 1px solid green; */
  border-radius: 10px;
  outline: none;
  transition: border-color 0.3s;
}

/* 使 textarea 保持原有样式（如需调整高度，可在行内样式中控制） */
.floating-label-container textarea {
  border: 2px solid #efefef8e;
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
  background-color: #000000;
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
</style>
