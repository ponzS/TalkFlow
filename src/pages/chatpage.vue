<!-- eslint-disable vue/no-parsing-error -->
<template>
  <ion-page>

  <ion-header :translucent="true">
<ion-toolbar>
<ion-buttons slot="secondary">
  <ion-back-button text="" default-href="/index" @click="closeWindow" style="margin-left:10px"> </ion-back-button>
</ion-buttons>
<ion-buttons slot="primary">
  <ion-button  @click="UserCardMode">
    <ion-icon slot="icon-only" :ios="ellipsisHorizontal" :md="ellipsisVertical" ></ion-icon>
  </ion-button>
</ion-buttons>
<ion-title>     <span class="chat-name">{{ getDisplayName(currentChatPub!) }}</span></ion-title>
</ion-toolbar>
</ion-header>
<!-- :scroll-y="false" -->
<ion-content :fullscreen="true" :scroll-y="false">


<!-- 主内容区域 -->
   <!-- 虚拟滚动区域 -->
   <div v-if="currentChatPub" style="height: 100%;overflow-y: auto;"  ref="chatListRef">
<IonButton @click="onLoadMoreClick">加载更多</IonButton>

<!--  keep-scroll-position -->
<DynamicScroller 
  class="ion-content-scroll-host scroller"
  :items="chatMessages"
  :min-item-size="100" 
   key-field="timestamp"
   keep-scroll-position
  style="padding: 15px 5px;"
>
  <template v-slot="{ item, index, active }">
    <DynamicScrollerItem :item="item" :active="active" :size-dependencies="[item.text, item.timestamp]" >
      <div
        :key="item.timestamp"
        :class="['chat-item', item.from === currentUserPub ? 'my-message' : 'other-message']"
      >
        <div class="message-wrapper">
          <template v-if="item.from !== currentUserPub">
            <img v-if="userAvatars[item.from]" class="message-avatar" :src="userAvatars[item.from]" />
          </template>
          <div :class="['message-bubble', item.type === 'image' || item.type === 'video' || item.type === 'voice' ? 'media-bubble' : '']">
            <div class="message-content">
              <template v-if="item.type === 'text'">
                <p style="white-space: pre-wrap">{{ item.text }}</p>
              </template>
              <template v-else-if="item.type === 'voice'">
                <audio :src="item.audioUrl" controls class="media-element"></audio>
              </template>
              <template v-else-if="item.type === 'video'">
                <video :src="item.videoUrl" controls class="media-element"></video>
              </template>
              <template v-else-if="item.type === 'image'">
                <img
                  class="media-element"
                  :src="item.imageUrl"
                  @click="toggleFullScreen(item.imageUrl || '')"
                  @contextmenu.prevent="saveImage(item.imageUrl || '')"
                />
              </template>
            </div>
          </div>
          <template v-if="item.from === currentUserPub">
            <img
              v-if="userAvatars[item.from]"
              class="message-avatar"
              :src="userAvatars[item.from]"
              alt="Avatar"
            />
          </template>
        </div>
        <div class="timestamp-container" :class="item.from === currentUserPub ? 'my-timestamp' : 'other-timestamp'">
          {{ formatTimestamp(item.timestamp) }}
        </div>
      </div>
      <div style="height: 3px"></div>
    </DynamicScrollerItem>
  </template>

</DynamicScroller>

</div>

<!-- 全屏图片遮罩 -->
<transition name="fade">
  <div
    class="fullscreen-overlay"
    v-if="fullScreenImage"
    @click="toggleFullScreen(fullScreenImage)"
  >
    <img :src="fullScreenImage" class="fullscreen-image" />
  </div>
</transition>

<!-- 右上角抽屉面板 -->
<transition name="slide">
  <div class="drawer-panel" v-if="isDrawerOpen">
    <button class="drawer-item" @click="handleImageUploadClick">发送图片</button>
    <button class="drawer-item" @click="handleVideoUploadClick">发送视频</button>
    <button class="drawer-item" @click="hideCurrentChat">隐藏聊天</button>
    <button class="drawer-item" @click="toggleDrawer">关闭</button>
  </div>
</transition>


<div :class="[showUserCard ? 'user-card-mode' : 'user-card-modes']">
<UserCard />
</div>

</ion-content>
<!-- 固定底部输入区域 class="footer"-->
<ion-footer >
  <ion-toolbar>

  <div class="input-area">
    <button class="mode-toggle" @click="toggleVoiceMode">
      <span v-if="!isVoiceMode">
        <div class="i-ic-baseline-keyboard-voice"></div>
      </span>
      <span v-else>
        <div class="i-material-symbols-light-keyboard-keys"></div>
      </span>
    </button>
    <div class="input-container">
      <div v-if="!isVoiceMode" class="text-input">
        <textarea
          v-model="newMsg"
          @input="adjustHeight"
          @focus="inputFocused = true"
          @blur="onBlur"
          placeholder=""
          rows="1"
          ref="textInputRef"
        ></textarea>
      </div>
      <div
        v-else
        class="voice-input"
        @mousedown="handleVoiceStart"
        @mouseup="handleVoiceEnd"
        @mouseleave="handleVoiceEnd"
        @touchstart="handleVoiceStart"
        @touchend="handleVoiceEnd"
        @touchcancel="handleVoiceEnd"
      >
        <p v-if="!isRecording"></p>
        <div class="timer-bubble" v-if="isRecording">
          {{ formattedRecordingTime }}
        </div>
      </div>
    </div>
    <button v-if="!isVoiceMode" class="send-button" @click="sendTextMessage">
      <div class="i-mynaui-send-solid"></div>
    </button>
  </div>
</ion-toolbar>
</ion-footer>
</ion-page>
</template>


<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import chatFlowStore from '@/composables/TalkFlowCore'
import { RecycleScroller } from 'vue-virtual-scroller'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

import { IonBackButton, IonButton, IonButtons, IonIcon, IonMenuButton, IonTitle, IonToolbar,IonHeader,IonContent,IonFooter,IonPage  } from '@ionic/vue';
import { create, ellipsisHorizontal, ellipsisVertical, helpCircle, search, personCircle, star } from 'ionicons/icons';
const {
closeChat,
currentChatPub,
getAliasRealtime,
newMsg,
sendChat,
chatMessages,
chatListRef,
userAvatars,
formatTimestamp,
currentUserPub,
isRecording,
startRecording,
stopRecording,
sendVoiceMessage,
handleImageUpload,
sendImageMessage,
handleVideoUpload,
sendVideoMessage,
onDeleteChatClick,
hideCurrentChat,
triggerLightHaptic,

generateChatId,
showUserCard,
UserCardMode,
friendRemarks,
listenChat,
loadMoreChatHistory


} = chatFlowStore
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'

// 页面挂载时设置键盘不调整 WebView 大小
onMounted(() => {


nextTick(() => scrollToBottom())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 确保在页面内容加载完成后再滚动到底部
nextTick(() => {
// 延时滚动，确保内容渲染完成
setTimeout(() => {
  scrollToBottom() 
}, 100);  // 200ms 延时
});
nextTick(() => {
// 延时滚动，确保内容渲染完成
setTimeout(() => {
  scrollToBottom() 
}, 200);  // 200ms 延时
});

nextTick(() => {
// 延时滚动，确保内容渲染完成
setTimeout(() => {
  scrollToBottom() 
}, 400);  // 200ms 延时
});
nextTick(() => {
// 延时滚动，确保内容渲染完成
setTimeout(() => {
  scrollToBottom() 
}, 500);  // 200ms 延时
});
Keyboard.setResizeMode({ mode: 'native' as KeyboardResize })

const scroller = chatListRef.value
  if (scroller) {
    scroller.addEventListener('scroll', onScroll)
  }


})

// 页面离开时恢复默认模式（例如 native）
onBeforeUnmount(() => {
  const scroller = chatListRef.value
  if (scroller) {
    scroller.removeEventListener('scroll', onScroll)
  }
nextTick(() => scrollToBottom())
Keyboard.setResizeMode({ mode: 'none' as any })
})

// 如果存在备注则返回备注，否则返回昵称（使用 getAliasRealtime）
function getDisplayName(pub: string): string {
const remark = friendRemarks.value[pub]?.remark
if (remark && remark.trim() !== '') {
return remark
}
return getAliasRealtime(pub)
}

const router = useRouter()
const isVoiceMode = ref(false)
function toggleVoiceMode() {
isVoiceMode.value = !isVoiceMode.value
}

// 输入框聚焦状态
const inputFocused = ref(false)

// ---------- 滚动加载 & 新消息提示 ------------
const isAtBottom = ref(true)
function onLoadMoreClick() {
  // 确保有 currentChatPub
  if (!currentChatPub.value) {
    console.log('没有选中的会话，不加载。')
    return
  }
  // 调用 loadMoreChatHistory
  loadMoreChatHistory(currentChatPub.value)
}
// 自动滚动到底部
function scrollToBottom(this: any) {

const scroller = chatListRef.value as HTMLElement;
if (scroller) {
scroller.scrollTop = scroller.scrollHeight;
}


isAtBottom.value = true;


}

// 滚动事件
function onScroll() {

const scroller = chatListRef.value
  if (!scroller) return
  // 判断是否在顶部（可加阈值，这里用0举例）
  if (scroller.scrollTop <= 50) {
    // 记录加载前的可见高度
    const oldScrollHeight = scroller.scrollHeight

  }
}

// ---------- 语音录制 ----------
const recordingTime = ref(0)
let recordingTimer: number | null = null
const maxDuration = 60
function handleVoiceStart(event: TouchEvent | MouseEvent) {
event.preventDefault()
triggerLightHaptic()
startRecording()
recordingTime.value = 0
recordingTimer = window.setInterval(() => {
recordingTime.value++
if (recordingTime.value >= maxDuration) {
  handleVoiceEnd()
}
}, 500)
}
function handleVoiceEnd() {
if (isRecording.value) {
stopRecording()
if (recordingTimer) {
  clearInterval(recordingTimer)
  recordingTimer = null
}
setTimeout(() => {
  sendVoiceMessage()
}, 300)
triggerLightHaptic()
}
}
const formattedRecordingTime = computed(() => {
const m = Math.floor(recordingTime.value / 60)
const s = recordingTime.value % 60
return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
})
const showMaxWarning = computed(() => recordingTime.value >= 55)

// ---------- 全屏图片 ----------
const fullScreenImage = ref<string | null>(null)
function toggleFullScreen(url: string) {
fullScreenImage.value = fullScreenImage.value === url ? null : url
}
function saveImage(url: string) {
if (confirm('是否保存该图片？')) {
const a = document.createElement('a')
a.href = url
a.download = 'image.jpg'
a.click()
}
}

// ---------- 抽屉面板 ----------
const isDrawerOpen = ref(false)
function toggleDrawer() {
isDrawerOpen.value = !isDrawerOpen.value
}

// ---------- 图片/视频上传 ----------
function handleImageUploadClick() {
const input = document.createElement('input')
input.type = 'file'
input.accept = 'image/*'
input.onchange = (e) => {
handleImageUpload(e as Event)
setTimeout(() => {
  sendImageMessage()
}, 300)
}
input.click()
}
function handleVideoUploadClick() {
const input = document.createElement('input')
input.type = 'file'
input.accept = 'video/*'
input.onchange = (e) => {
handleVideoUpload(e as Event)
setTimeout(() => {
  sendVideoMessage()
}, 300)
}
input.click()
}

// ---------- 多行输入框动态高度 ----------
const textInputRef = ref<HTMLTextAreaElement | null>(null)
const initialHeight = '40px'
function adjustHeight() {
const el = textInputRef.value
if (el) {
el.style.height = 'auto'
const newHeight = Math.min(el.scrollHeight, 500)
el.style.height = newHeight + 'px'
el.style.overflowY = el.scrollHeight > 500 ? 'auto' : 'hidden'
}
}
function resetHeight() {
if (!newMsg.value && textInputRef.value) {
textInputRef.value.style.height = initialHeight
}
}
function onBlur() {
resetHeight()
inputFocused.value = false

}

// ---------- 关闭聊天窗口 ----------
function closeWindow() {
closeChat()
router.go(-1)
}

// ---------- 发送文本消息 ----------
function sendTextMessage() {

sendChat('text')

newMsg.value = ''

resetHeight()
scrollToBottom()

}
</script>

<style scoped>
.user-card-mode {
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
transition: all 0.3s ease-in-out;
z-index: 1000;
}
.user-card-modes {
position: fixed;
top: 0;
left: -300%;
width: 100%;
height: 100%;
transition: all 0.3s ease-in-out;
z-index: 1000;
}

.i-basil-other-1-solid {
--un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M6 10.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m4.5 1.5a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0m6 0a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0'/%3E%3C/svg%3E");
-webkit-mask: var(--un-icon) no-repeat;
mask: var(--un-icon) no-repeat;
-webkit-mask-size: 100% 100%;
mask-size: 100% 100%;
background-color: currentColor;
color: inherit;
width: 1.2em;
height: 1.2em;
}
.i-material-symbols-arrow-back-ios-new-rounded {
--un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m9.55 12l7.35 7.35q.375.375.363.875t-.388.875t-.875.375t-.875-.375l-7.7-7.675q-.3-.3-.45-.675t-.15-.75t.15-.75t.45-.675l7.7-7.7q.375-.375.888-.363t.887.388t.375.875t-.375.875z'/%3E%3C/svg%3E");
-webkit-mask: var(--un-icon) no-repeat;
mask: var(--un-icon) no-repeat;
-webkit-mask-size: 100% 100%;
mask-size: 100% 100%;
background-color: currentColor;
color: inherit;
width: 1.2em;
height: 1.2em;
}
.i-mynaui-send-solid {
--un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M20.04 2.323c1.016-.355 1.992.621 1.637 1.637l-5.925 16.93c-.385 1.098-1.915 1.16-2.387.097l-2.859-6.432l4.024-4.025a.75.75 0 0 0-1.06-1.06l-4.025 4.024l-6.432-2.859c-1.063-.473-1-2.002.097-2.387z'/%3E%3C/svg%3E");
-webkit-mask: var(--un-icon) no-repeat;
mask: var(--un-icon) no-repeat;
-webkit-mask-size: 100% 100%;
mask-size: 100% 100%;
background-color: currentColor;
color: inherit;
width: 1.2em;
height: 1.2em;
}
.i-material-symbols-light-keyboard-keys {
--un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M7.23 16.77v-1.54h9.54v1.54zm-4-4v-1.54h1.54v1.54zm4 0v-1.54h1.54v1.54zm4 0v-1.54h1.54v1.54zm4 0v-1.54h1.54v1.54zm4 0v-1.54h1.54v1.54zm-16-4V7.23h1.54v1.54zm4 0V7.23h1.54v1.54zm4 0V7.23h1.54v1.54zm4 0V7.23h1.54v1.54zm4 0V7.23h1.54v1.54z'/%3E%3C/svg%3E");
-webkit-mask: var(--un-icon) no-repeat;
mask: var(--un-icon) no-repeat;
-webkit-mask-size: 100% 100%;
mask-size: 100% 100%;
background-color: currentColor;
color: inherit;
width: 1.2em;
height: 1.2em;
}
.i-ic-baseline-keyboard-voice {
--un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3m5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72z'/%3E%3C/svg%3E");
-webkit-mask: var(--un-icon) no-repeat;
mask: var(--un-icon) no-repeat;
-webkit-mask-size: 100% 100%;
mask-size: 100% 100%;
background-color: currentColor;
color: inherit;
width: 1.2em;
height: 1.2em;
}
.voice-input {
-webkit-tap-highlight-color: transparent;
}
* {
box-sizing: border-box;
margin: 0;
padding: 0;
}
.chat-page {
display: flex;
flex-direction: column;
height: 100vh;
background: var(--background-color, #f0f0f0);
font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
.header {
position: fixed;
display: flex;
align-items: flex-end;
top: 0;
left: 0;
right: 0;
height: 110px;
background: rgba(120, 120, 120, 0.191);
backdrop-filter: blur(20px);
z-index: 1000;
}
.header-container {
display: flex;
align-items: flex-end;
justify-content: space-between;
width: 100%;
padding: 8px 12px;
}
.back-button {
background: none;
border: none;
font-size: 19px;
color: var(--text-color);
cursor: pointer;
transition: transform 0.3s ease;
}
.back-button:hover {
transform: scale(1.1);
}
.title {
flex: 1;
text-align: center;
font-size: 24px;
font-weight: bold;
color: var(--text-color);

z-index: 1000;
}
.drawer-toggle {
background: none;
border: none;
font-size: 24px;
color: var(--text-color);
cursor: pointer;
transition: transform 0.3s ease;
}
.drawer-toggle:hover {
transform: scale(1.2);
}

.spacer-top,
.spacer-bottom {
height: 20px;
}


.chat-item {
margin-bottom: 16px;
transition:
transform 0.3s ease,
opacity 0.3s ease;
}


.message-wrapper {
display: flex;
align-items: flex-end;
gap: 8px;
}
.chat-item.other-message .message-wrapper {
justify-content: flex-start;
}
.chat-item.my-message .message-wrapper {
justify-content: flex-end;
}
.message-bubble {
position: relative;
padding: 10px 14px;
border-radius: 12px;
font-size: 16px;
line-height: 1.4;
word-wrap: break-word;
max-width: 80%;
transition:
background 0.3s ease,
padding 0.3s ease;
}
.other-message .message-bubble {
background: #e4e2e2;
color: #333;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.my-message .message-bubble {
background: #00cd89;
color: #333;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.media-bubble {
background: transparent !important;
padding: 0 !important;
}
.message-avatar {
width: 40px;
height: 40px;
border-radius: 10px;
object-fit: cover;
}
.media-element {
display: block;
max-width: 100%;
max-height: 300px;
border-radius: 10px;
cursor: pointer;
transition: transform 0.3s ease-in-out;
}
.media-element:hover {
transform: scale(1.02);
}
.timestamp-container {
font-size: 10px;
color: #999;
margin-top: 4px;
}
.my-timestamp {
text-align: right;
padding-left: 10px;
}
.other-timestamp {
text-align: left;
padding-right: 10px;
}
.footer {
position: fixed;
width: 100%;
bottom: 0;
left: 0;
right: 0;
background: rgba(120, 120, 120, 0.175);
backdrop-filter: blur(20px);
z-index: 1000;
padding: 5px 12px;
transition: all 0.3s ease-in-out;
}
.input-area {
display: flex;
align-items: center;
transition: all 0.3s ease-in-out;
}
.mode-toggle,
.emoji-toggle {
background: none;
border: none;
font-size: 30px;
cursor: pointer;
transition: transform 0.3s ease;
}
.mode-toggle {
color: var(--text-color, #333);
}
.mode-toggle:hover,
.emoji-toggle:hover {
transform: scale(1.2);
}
.emoji-toggle {
margin-left: 5px;
}
.input-container {
flex: 1;
margin: 0 10px;
display: flex;
align-items: flex-end;
position: relative;
justify-content: center;
transition: all 0.3s ease-in-out;
width: 100%;
}
.text-input textarea {
/* color: var(--text-color, #333); */
background: transparent;
width: 100%;
min-width: 230px;
min-height: 40px;
max-height: 200px;
padding: 8px 12px;
border: 2px solid var(--background-color, #f0f0f022);
box-shadow: 0 0 5px 0px rgba(139, 139, 139, 0.386);
border-radius: 10px;
font-size: 16px;
outline: none;
resize: none;
overflow-y: hidden;
display: grid;
place-items: center;
text-align: left;
transition: all 0.3s ease-in-out;
}

.voice-input {
position: relative;
margin: 0 auto;
height: 39px;
width: 100%;
display: flex;
text-align: center;
align-items: center;
justify-content: center;
border: 2px solid rgba(0, 255, 217, 0.218);
border-radius: 10px;
background: rgba(142, 141, 141, 0.161);
color: var(--text-color, #333);
font-size: 18px;
cursor: pointer;
font-weight: 700;
overflow: hidden;
transition: all 0.3s ease-in-out;
}
.voice-input:active {
background: rgb(0, 255, 225);
border-color: #00ffbf;
box-shadow: 0 0 20px 5px rgba(0, 255, 204, 0.7);
transition: all 0.3s ease-in-out;
}
.timer-bubble {
position: absolute;
top: -40px;
right: 50%;
transform: translateX(50%);
background: linear-gradient(45deg, #0ff, #f0f);
color: var(--text-color, #333);
padding: 6px 12px;
border-radius: 20px;
font-size: 16px;
box-shadow: 0 0 10px 2px rgba(0, 255, 255, 0.8);
backdrop-filter: blur(5px);
z-index: 3;
transition: all 0.3s ease-in-out;
}
.send-button {
margin: 3px;
background: none;
border: none;
border-radius: 10px;
color: #222222;
font-weight: 700;
font-size: 30px;
cursor: pointer;
transition: background 0.3s ease;
}
.send-button:active {
color: #00ffbf;
}
.fullscreen-overlay {
position: fixed;
top: 0;
left: 0;
right: 0;
bottom: 0;
background: rgba(0, 0, 0, 0.9);
display: flex;
align-items: center;
justify-content: center;
z-index: 2000;
}
.fullscreen-image {
width: 100%;
height: 100%;
object-fit: contain;
transition: transform 0.3s ease;
}
.drawer-panel {
position: fixed;
top: 12px;
right: 12px;
width: 200px;
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(12px);
padding: 12px;
border-radius: 8px;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
z-index: 1100;
}

.new-message-btn {
position: fixed;
bottom: 80px;
right: 20px;
padding: 8px 12px;
background-color: #00cd89;
color: white;
border: none;
border-radius: 4px;
cursor: pointer;
}

</style>
