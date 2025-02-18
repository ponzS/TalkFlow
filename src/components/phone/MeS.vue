<template>


<div class="setting"  @pointerdown="onRipple" @click="settings">
          <div class="i-mingcute-settings-7-line"></div>
       
        </div>


  <!-- <Login /> -->

  <!-- <ChatView/> -->
  <ion-content ref="contentRef" >
    <div
      class="profile-gesture-container"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >





      <div class="profile-header" :style="headerTransform" :class="{ 'no-transition': isDragging }">
        <!-- <img class="avatar" src="@/assets/icon-only.png" alt="avatar" /> -->
        <img
          v-if="userAvatars[currentUserPub!]"
          :src="userAvatars[currentUserPub!]"
          alt="Avatar"
          class="avatar"
        />

        <h1 class="username">{{ currentUserAlias || 'No Name' }}</h1>
        <p>{{ currentUserAlias1 || '' }}</p>

        <!-- <ion-button color="danger" @click="onLogoutbutton">退出 (清除私钥)</ion-button> -->
      </div>

      <div class="cards-wrapper" :class="{ hidden: !showCards }">
        <div class="MyKey">
          <p @click="copyPub(currentUserPub)">{{$t('talkflowid')}}: {{ currentUserPub }}</p>
        </div>
<!-- 
        <div class="card" @pointerdown="onRipple" @click="message">
          <div class="i-solar-hashtag-chat-line-duotone"></div>
          <h3>动态</h3>
        </div>
        <div class="card" @pointerdown="onRipple" @click="boxs">
          <div class="i-solar-box-minimalistic-bold-duotone"></div>
          <h3>收藏</h3>
        </div>
        <div class="card" @pointerdown="onRipple" @click="plugins">
          <div class="i-tabler-plug-connected"></div>
          <h3>插件</h3>
        </div>
        <div class="card" @pointerdown="onRipple" @click="settings">
          <div class="i-mingcute-settings-7-line"></div>
          <h3>设置</h3>
        </div> -->
      </div>
    </div>

    <!-- <div class="theme-switcher">
      <ThemeSwitcher />
      <QRScanner />
    </div> -->
  </ion-content>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import chatFlowStore from '@/composables/TalkFlowCore'
import soundManager from '@/composables/sounds'
import {
    IonTabs,
    IonFooter,
    IonToolbar,
    IonTabBar,
    IonTabButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonIcon,
  } from '@ionic/vue';
// 路由
const router = useRouter()
const {
  // Modal
  isOpen,
  setOpen,
  copyPub,
  removeBuddy,
  // Registration,
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
  currentUserAlias1,
  loginError,

  // Logout
  onLogout,

  // Blacklist
  blockPub,
  blacklist,
  addToBlacklist,
  removeFromBlacklist,
  isInMyBlacklist,

  // Friends & Requests
  friendPub,
  buddyError,
  buddyList,
  receivedRequests,
  requestAddBuddy,
  acceptBuddyRequest,
  rejectBuddyRequest,

  // Chat
  currentChatPub,
  newMsg,
  chatMessages,
  chatPreviewList,
  visibleChatPreviewList,
  openChat,
  closeChat,
  hideCurrentChat,
  showCurrentChat,
  sendChat,
  refreshChat,
  onDeleteChatClick,

  // Aliases
  getAliasRealtime,

  // Notifications
  showNotification,

  // Utility Functions
  formatTimestamp,

  // Refs
  chatListRef,

  // New Features
  // Nickname Update
  newAliasInput,
  updateAlias,
  updateAliasMsg,

  // Avatar Update
  avatarFile,
  avatarUrl,
  handleAvatarUpload,
  updateAvatar,
  updateAvatarMsg,
  userAvatars,

  // Voice Recording
  isRecording,
  startRecording,
  stopRecording,
  sendVoiceMessage,
  recordedAudio,

  // Calls
} = chatFlowStore

const onLogoutbutton = async () => {
  soundManager.play('click5')
  await onLogout()
  await router.replace('/')
}
// 是否显示卡片
const showCards = ref(true)

// 记录手指起始坐标
const startY = ref(0)
// 当前拖拽偏移
const translateY = ref(0)

// 是否正在拖拽中，用于控制是否移除transition，让它“跟手”
const isDragging = ref(false)

// 一些可自定义的阈值
const maxPullDown = 60 // 下拉到这里就完全隐藏卡片
const maxPushUp = 50 // 上推到这里就完全贴顶

// 计算头像区域 transform
const headerTransform = computed(() => {
  return {
    transform: `translateY(${translateY.value}px)`,
  }
})

// 触摸开始
function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  isDragging.value = true
  startY.value = e.touches[0].clientY
}

// 触摸移动
function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || e.touches.length !== 1) return
  const currentY = e.touches[0].clientY
  const deltaY = currentY - startY.value

  // 下拉
  if (deltaY > 15) {
    // 控制最大下拉量
    translateY.value = Math.min(deltaY, maxPullDown)
    if (translateY.value > 30) {
      showCards.value = false
    }
  }
  // 上推
  else {
    const upDistance = Math.abs(deltaY)
    translateY.value = -Math.min(upDistance, maxPushUp)
    if (translateY.value < -10) {
      showCards.value = true
    }
  }
}

// 触摸结束
function onTouchEnd() {
  isDragging.value = false
  // 松手后做一次“卡扣”震动，并将 translateY “吸附”到某个值
  doSnapEffect()
}

// 吸附+震动
function doSnapEffect() {
  // 震动反馈 (中等力度)
  Haptics.impact({ style: ImpactStyle.Medium })

  // 判断当前距离
  if (translateY.value > maxPullDown / 2) {
    // 吸附到底
    translateY.value = maxPullDown
  } else if (translateY.value < -maxPushUp / 2) {
    // 吸附到顶
    translateY.value = -maxPushUp
  } else {
    // 回到 0
    translateY.value = 0
  }
}

/** 路由跳转 */
function message() {
  router.push('/mymoment')
}
function boxs() {
  router.push('/settingspage')
}
function plugins() {
  router.push('/settingspage')
}
function settings() {
  router.push('/settingspage')
}

/**
 * 点击波纹逻辑:
 * 1. 计算点击点相对于 card 容器的坐标
 * 2. 设置到 CSS 变量 --ripple-x / --ripple-y
 * 3. 触发一次动画
 */
function onRipple(event: PointerEvent) {
  // 找到当前卡片元素
  const card = event.currentTarget as HTMLElement
  if (!card) return

  const rect = card.getBoundingClientRect()
  // 计算点击点相对于 card 的偏移
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // 先移除可能残留的 ripple 动画类
  card.classList.remove('ripple-animate')
  // 设置 CSS 自定义属性
  card.style.setProperty('--ripple-x', `${x}px`)
  card.style.setProperty('--ripple-y', `${y}px`)

  // Define the callback for when the animation ends
  const handleAnimationEnd = () => {
    card.classList.remove('ripple-animate')
    card.removeEventListener('animationend', handleAnimationEnd)
  }

  // Add the animation end event listener
  card.addEventListener('animationend', handleAnimationEnd)

  // 触发一次 reflow，让后续添加的类能播放动画
  // 这里用 requestAnimationFrame 确保下一帧再加类
  window.requestAnimationFrame(() => {
    card.classList.add('ripple-animate')
  })
}
</script>

<style scoped>
.setting{
  cursor: pointer;
  position: fixed;
  top: 110px;
  right: 20px;
  font-size: 23px;
  z-index: 9999;
}
.MyKey {
  margin-top: 10px;
  margin-bottom: 10px;
  text-align: left;
  width: 100%;
  max-height: 100px;
  overflow-y: auto;
  font-size: 13px;
  font-weight: bold;

}

/* 外层触摸区域 */
.profile-gesture-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden; /* 禁止内部滚动，完全由我们手动管理手势 */
}

/* 头像名字块 */
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease-out;
  margin-top: 300px;
  text-align: center;
  width: 100%;
}
.profile-header.no-transition {
  transition: none !important; /* 拖拽中去掉过渡 */
}
.avatar {
  width: 100px;
  height: 100px;
  border-radius: 20px;
  object-fit: cover;
}
.username {
  font-size: 50px;
  font-weight: bold;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
}

/* 卡片区域 */
.cards-wrapper {
  margin-top: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
  padding: 0 10px;
  transition: opacity 0.2s;
}
.cards-wrapper.hidden {
  opacity: 0;
  pointer-events: none;
}

/* ===== 卡片整体外观 ===== */
.card {
  position: relative;
  flex: 1 1 calc(50% - 10px);
  background-color: var(--background-color);
  border-radius: 10px;
  text-align: right;
  box-shadow: 0 0 10px 0 var(--ion-background-color-step-100);
  padding: 10px;
  padding-bottom: 1px;
  font-size: 2rem;
  cursor: pointer;
  overflow: hidden;
}

/* ===== 波纹本体 (使用 ::before) ===== */
.card::before {
  content: '';
  position: absolute;
  top: var(--ripple-y, 50%);
  left: var(--ripple-x, 50%);
  width: 0;
  height: 0;
  background-color: var(--glass-border);
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  /* 默认隐藏 */
  opacity: 0;
}

/* ===== 添加类 ripple-animate 后启动动画 ===== */
.card.ripple-animate::before {
  animation: ripple 0.45s ease-out forwards;
}

/* ===== 波纹动画关键帧 ===== */
@keyframes ripple {
  0% {
    width: 0;
    height: 0;
    opacity: 0.5;
  }
  50% {
    width: 200%;
    height: 200%;
    opacity: 0.3;
  }
  100% {
    width: 250%;
    height: 250%;
    opacity: 0;
  }
}

/* 悬浮在上面的主题切换器等 */
.theme-switcher {
  position: fixed;
  top: 50px;
  right: 10px;
  display: flex;
  gap: 1rem;
  z-index: 10;
}

.i-mingcute-settings-7-line {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath d='m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z'/%3E%3Cpath fill='currentColor' d='M12 2a1 1 0 0 1 1 1v1.062a8 8 0 0 1 2.104.562l.53-.918a1 1 0 1 1 1.732 1l-.531.92c.58.44 1.098.959 1.54 1.54l.92-.532a1 1 0 1 1 1 1.732l-.92.53c.279.661.471 1.367.563 2.104H21a1 1 0 1 1 0 2h-1.062a8 8 0 0 1-.562 2.104l.918.53a1 1 0 1 1-1 1.732l-.92-.531a8 8 0 0 1-1.54 1.54l.532.92a1 1 0 1 1-1.732 1l-.53-.92a8 8 0 0 1-2.104.563V21a1 1 0 1 1-2 0v-1.062a8 8 0 0 1-2.104-.562l-.53.918a1 1 0 1 1-1.732-1l.531-.92a8 8 0 0 1-1.54-1.54l-.92.532a1 1 0 1 1-1-1.732l.92-.53A8 8 0 0 1 4.061 13H3a1 1 0 1 1 0-2h1.062a8 8 0 0 1 .562-2.104l-.918-.53a1 1 0 0 1 1-1.732l.92.531c.44-.58.959-1.098 1.54-1.54l-.532-.92a1 1 0 0 1 1.732-1l.53.92A8 8 0 0 1 11 4.061V3a1 1 0 0 1 1-1m0 11.155l-4.624 2.67a6 6 0 0 0 1.588 1.351l.073.043A6 6 0 0 0 12 18c.97 0 1.886-.23 2.697-.639l.34-.185a6 6 0 0 0 1.587-1.352zm-1-7.072a6 6 0 0 0-1.703.559l-.26.14l-.073.042a6 6 0 0 0-1.978 1.88l-.162.26l-.042.073A6 6 0 0 0 6 12c0 .63.097 1.24.278 1.81l.097.283L11 11.423zm2 0v5.34l4.625 2.67A6 6 0 0 0 18 12c0-.97-.23-1.886-.639-2.697l-.143-.266l-.032-.055l-.01-.018a6 6 0 0 0-1.88-1.978l-.333-.205a6 6 0 0 0-1.664-.64z'/%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}
.i-tabler-plug-connected {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m7 12l5 5l-1.5 1.5a3.536 3.536 0 1 1-5-5zm10 0l-5-5l1.5-1.5a3.536 3.536 0 1 1 5 5zM3 21l2.5-2.5m13-13L21 3m-11 8l-2 2m5 1l-2 2'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}
.i-solar-hashtag-chat-line-duotone {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none'%3E%3Cpath fill='currentColor' d='m17.543 21.694l-.645-.382zm.271-.458l.646.382zm-1.628 0l-.646.382zm.27.458l.646-.382zm-4.266-2.737l.693-.287zm2.705 1.539l-.013.75zm-1.352-.186l-.287.693zm8.267-1.353l.693.287zm-2.705 1.539l-.013-.75zm1.352-.186l.287.693zm.35-7.942l-.393.64zm.825.826l.64-.392zm-8.438-.826l-.392-.64zm-.826.826l-.64-.392zm3.333 7.411l.377-.648zm2.488 1.47l.27-.457l-1.29-.764l-.271.458zm-2.649-.457l.271.458l1.291-.764l-.271-.458zm1.358-.306A.13.13 0 0 1 17 21.25c.027 0 .075.016.102.062l-1.29.764c.531.899 1.845.899 2.377 0zm-.648-8.562h1.5v-1.5h-1.5zm5 3.5v.5h1.5v-.5zm-8.5.5v-.5h-1.5v.5zm-1.5 0c0 .572 0 1.039.025 1.419c.027.387.083.738.222 1.075l1.386-.574c-.05-.123-.09-.293-.111-.603a22 22 0 0 1-.022-1.317zm3.658 2.996c-.628-.01-.892-.052-1.078-.13l-.574 1.387c.475.196.998.232 1.626.243zm-3.41-.502a3.25 3.25 0 0 0 1.758 1.759l.574-1.386a1.75 1.75 0 0 1-.947-.947zm9.752-2.494c0 .593 0 1-.022 1.317c-.021.31-.06.48-.111.603l1.386.574c.139-.337.195-.688.221-1.075c.026-.38.026-.847.026-1.419zm-2.132 4.496c.628-.011 1.15-.047 1.626-.243l-.574-1.386c-.186.077-.45.118-1.078.129zm1.999-2.576a1.75 1.75 0 0 1-.947.947l.574 1.386a3.25 3.25 0 0 0 1.759-1.76zm-3.367-5.92c.833 0 1.405 0 1.846.043c.429.04.655.115.818.215l.784-1.28c-.438-.268-.921-.377-1.46-.429c-.529-.05-1.184-.049-1.988-.049zm5 3.5c0-.804 0-1.46-.05-1.987c-.05-.54-.16-1.023-.429-1.461l-1.279.784c.1.163.174.39.215.819c.042.44.043 1.012.043 1.845zm-2.336-3.242c.236.144.434.342.578.578l1.28-.784a3.25 3.25 0 0 0-1.074-1.073zM16.25 11.25c-.804 0-1.46 0-1.987.05c-.54.05-1.023.16-1.461.429l.784 1.279c.163-.1.39-.174.819-.215c.44-.042 1.012-.043 1.845-.043zm-3.5 5c0-.833 0-1.405.043-1.845c.04-.43.115-.656.215-.82l-1.28-.783c-.268.438-.377.921-.429 1.46c-.05.529-.049 1.184-.049 1.988zm.052-4.521a3.25 3.25 0 0 0-1.073 1.073l1.279.784c.144-.236.342-.434.578-.578zm4.029 9.125c-.098-.165-.197-.335-.297-.472a1.5 1.5 0 0 0-.456-.425l-.754 1.296c-.037-.021-.04-.04-.002.013c.048.065.106.162.218.352zm-1.95.392c.227.004.346.006.43.016c.071.008.053.014.013-.009l.754-1.296a1.5 1.5 0 0 0-.601-.186c-.17-.019-.37-.022-.57-.025zm3.579.372c.112-.19.17-.287.218-.352c.039-.053.035-.034-.002-.013l-.754-1.296c-.206.12-.347.276-.456.425c-.1.137-.2.306-.297.472zm.632-1.872c-.198.003-.399.006-.569.025c-.184.02-.393.064-.601.186l.754 1.296c-.04.023-.058.017.012.009c.085-.01.204-.012.43-.016z'/%3E%3Cpath stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M10 3L5 21M19 3l-1.806 6.5M22 9H4m5 7H2' opacity='.5'/%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}
.i-solar-box-minimalistic-bold-duotone {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M8.422 20.618C10.178 21.54 11.056 22 12 22V12L2.638 7.073l-.04.067C2 8.154 2 9.417 2 11.942v.117c0 2.524 0 3.787.597 4.801c.598 1.015 1.674 1.58 3.825 2.709z'/%3E%3Cpath fill='currentColor' d='m17.577 4.432l-2-1.05C13.822 2.461 12.944 2 12 2c-.945 0-1.822.46-3.578 1.382l-2 1.05C4.318 5.536 3.242 6.1 2.638 7.072L12 12l9.362-4.927c-.606-.973-1.68-1.537-3.785-2.641' opacity='.7'/%3E%3Cpath fill='currentColor' d='m21.403 7.14l-.041-.067L12 12v10c.944 0 1.822-.46 3.578-1.382l2-1.05c2.151-1.129 3.227-1.693 3.825-2.708c.597-1.014.597-2.277.597-4.8v-.117c0-2.525 0-3.788-.597-4.802' opacity='.5'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}
.i-fluent-scan-dash-16-filled {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 16 16' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M3.5 2.5a1 1 0 0 0-1 1v.75a.75.75 0 0 1-1.5 0V3.5A2.5 2.5 0 0 1 3.5 1h.75a.75.75 0 0 1 0 1.5zm0 11a1 1 0 0 1-1-1v-.75a.75.75 0 0 0-1.5 0v.75A2.5 2.5 0 0 0 3.5 15h.75a.75.75 0 0 0 0-1.5zm10-10a1 1 0 0 0-1-1h-.75a.75.75 0 0 1 0-1.5h.75A2.5 2.5 0 0 1 15 3.5v.75a.75.75 0 0 1-1.5 0zm-1 10a1 1 0 0 0 1-1v-.75a.75.75 0 0 1 1.5 0v.75a2.5 2.5 0 0 1-2.5 2.5h-.75a.75.75 0 0 1 0-1.5zM4.5 8a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 4.5 8'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 2em;
  height: 2em;
}
ion-page,
ion-content {
  --ion-background-color: transparent;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
