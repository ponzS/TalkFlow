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
            style="background-color: #000000; color: rgb(141, 141, 141)"
          ></textarea>
          <label :class="{ active: isFocused.encryptedKeyInput || encryptedKeyInput }"
            >TalkFlowKey</label
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
              color: aquamarine;
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
              color: white;
            "
          >
            <h4>TalkFlowKey:</h4>
            <p
              style="
                word-break: break-all;
                max-height: 90px;
                overflow-y: auto;
                border: 1px solid green;
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
              style="border: 1px solid green"
            >
              Copy
            </button>
            <!-- <p style="margin-top: 8px; color: green; font-weight: 700; font-size: 13px">
              {{ generateMsg }}
            </p> -->

            <!-- <p style="margin-top: 8px; color: dimgrey; font-weight: 700; font-size: 13px">
              解密私钥且登录成功后，将获得一个身份钥匙，可以使用该身份钥匙进行好友添加等身份验证。
            </p>
            <p style="margin-top: 8px; color: white; font-weight: 700; font-size: 13px">
              提示与声明：
              您构建的去中心化身份由于其特殊的技术特性，100%的控制权归您所有，如身份丢失，TalkFlow及相关工作人员无法协助找回。
              身份钥匙可公开，但请勿将私人钥匙泄露给他人，避免造成不必要的损失，TalkFlow及相关人员不承担任何责任。
            </p>
            <p style="margin-top: 8px; color: white; font-weight: 700; font-size: 13px">
              安全性说明：
              TalkFlow使用AES高级加密标准与ECC椭圆曲线加密算法，对密钥进行加密，TalkFlow及相关人员无法解密您的密钥。
              目前的安全规格已达到中小企业级标准，如果您采取额外的硬件层面与物理层面的安全措施，会有可以达到军用级安全标准的提升空间。
            </p>
            <p style="text-align: right; font-size: 11px; color: white">By -TalkFlow去中心化网络</p> -->
          </div>
        </div>

        <button class="login-button" @click="backToLogin" style="margin-top: 8px">{{ $t('back') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import chatFlowStore from '@/composables/TalkFlowCore'
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
} = chatFlowStore

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

// 退出登录
const onLogoutbutton = async () => {
  await onLogout()
  await router.replace('/')
}

// 登录逻辑
const OnLongin = async () => {
  soundManager.play('click5')
  await importKeyPair()
  if (isLoggedIn.value === true) {
    await router.replace('/index')
  }
}

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
  border: 3px solid #00ffd08e;
  overflow: hidden;
  margin: 0 2%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  width: 95%;
  max-width: 700px;
  height: auto;
  background: rgb(0, 0, 0);
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
  border: 3px solid #00ffd08e;
}

.login-input input {
  /* border: 1px solid #000000; */
  border: 3px solid #00ffd08e;
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
  border: 3px solid #00ffd08e;
  border: none;
  /* border: 1px solid green; */
  border-radius: 10px;
  outline: none;
  transition: border-color 0.3s;
}

/* 使 textarea 保持原有样式（如需调整高度，可在行内样式中控制） */
.floating-label-container textarea {
  border: 3px solid #00ffd08e;
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
  color: rgb(0, 255, 187);
  background-color: #000000;
  padding: 0 3px;
}
.login-button {
  border: 3px solid #00ffd08e;
  background-color: #000000;
  color: rgb(0, 255, 208);

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
