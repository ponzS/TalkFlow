<template>
  <!-- Global overlay wrapper: controls fullscreen visibility/minimize -->
  <div class="global-call-overlay" :class="{ hidden: (!overlay.enabled || !overlay.visible) && !closingTransition, minimized: overlay.minimized }">
  <!-- Blur veil for open/close transitions -->
  <div v-if="openingTransition || closingTransition" class="blurveil" :class="{ opening: openingTransition, closing: closingTransition }"></div>
  <transition name="call-page-fade">
  <div v-if="overlay.enabled && overlay.visible && !overlay.minimized">
    <ion-header translucent v-if="!localopen">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="medium" fill="clear" @click="overlay.hide()">
            <ion-icon :icon="closeOutline"></ion-icon>
            <!-- <ion-label style="margin-left:2px">Close</ion-label> -->
          </ion-button>
        </ion-buttons>
        <!-- <ion-title> 
          
   
          </ion-title> -->
        <ion-buttons slot="end">
                 <h2 v-if="roomName"></h2>
            <h2 v-else class="no-room"></h2>
            <p v-if="call.roomPub" class="room-id">ID: {{ shortId(call.roomPub) }}</p>
            <p v-if="!call.hasPrivate" class="warning">KeyPair is null</p>
          <ion-button @click="openLogs = !openLogs">log</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="call-content">
         <div style="height: 5%;"></div>
      <!-- 视频窗口区域 -->
      <div class="video-section" v-if="localopen">
        <div class="video-container">
          <!-- 双方或单方通话：对方全屏 + 本地漂浮小窗 -->
          <template v-if="call.remotePeers.length === 0">
            <div class="remote-full" @click="onVideoAreaClick">
              <video id="localVideo" muted playsinline autoplay></video>
            </div>
          </template>
          <template v-else-if="call.remotePeers.length === 1">
            <div class="remote-full" @click="onVideoAreaClick">
              <video :id="`remote-${call.remotePeers[0]}`" playsinline autoplay></video>
              <!-- 为远端添加隐藏的音频元素，用于精确控制音频输出设备 -->
              <audio :id="`remote-audio-${call.remotePeers[0]}`" autoplay style="display: none;"></audio>
              <div class="video-overlay soft">
                <div class="video-label">{{ shortId(call.remotePeers[0]) }}</div>
              </div>
            </div>
            <!-- 本地漂浮小窗，可拖动 -->
            <div
              class="pip-window"
              :style="{ left: `${pipPos.x}px`, top: `${pipPos.y}px` }"
              @mousedown="onPipMouseDown"
              @touchstart.prevent="onPipTouchStart"
              @click.stop
            >
              <video id="localVideo" muted playsinline autoplay></video>
              <div class="pip-overlay">
                <div class="video-label">You</div>
              </div>
            </div>
          </template>

          <!-- 三方及以上：自适应铺满布局（默认每排一个；当高度<100px改为每排两个） -->
          <template v-else>
            <div class="video-grid" :style="multiGridStyle" @click="onVideoAreaClick">
              <div
                class="video-item remote-video"
                v-for="pid in call.remotePeers"
                :key="pid"
              >
                <video :id="`remote-${pid}`" playsinline autoplay></video>
                <!-- 为每个远端添加隐藏的音频元素，用于控制音频输出设备 -->
                <audio :id="`remote-audio-${pid}`" autoplay style="display: none;"></audio>
                <div class="video-overlay">
                  <div class="video-label">{{ shortId(pid) }}</div>
                </div>
              </div>
              <!-- 将本地视频也纳入九宫格 -->
              <div class="video-item local-video" key="local">
                <video id="localVideo" muted playsinline autoplay></video>
                <div class="video-overlay">
                  <div class="video-label">You</div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>


      <div style="display: flex; margin:0 auto;width: 200px;justify-content: center;">
  <QrShow :data="qrsharelink" />
  
</div>
<div style="display: flex; margin:5px auto;width: 200px;justify-content: center;">
 <ion-button fill="outline" size="small" @click="quickShareRoom" :disabled="!call.hasPrivate">
                 
                  {{ $t('call1') }}
                </ion-button>
</div>

      <!-- 创建房间和加入房间选项卡 -->
      <div class="tabs-section">
    

        <div class="tab-content">
          <!-- 创建房间面板 -->
          <div  class="create-panel">
            <div class="form-group">
              <!-- 快捷操作按钮 -->
       
             
               <ion-item lines="none">
                <ion-textarea
                  auto-grow
                  :rows="1"
                  :label="$t('call2')"
                  label-placement="stacked"
                  v-model="pasteString"
                  :placeholder="$t('call3')"
                />
               
              </ion-item>
              
              <ion-buttons class="ion-margin-top">
                <ion-button @click="parseShareString" :disabled="!pasteString.trim()" expand="block" color="primary">
                  {{ $t('call4') }}
                </ion-button>
             
                <ion-button  @click="pasteFromClipboard" expand="block">
                  {{ $t('call5') }}
                </ion-button>
              </ion-buttons>
              <ion-item>
                <ion-input
                  :label="$t('call6')"
                  label-placement="stacked"
                  v-model="call.signalingOrigin"
                  placeholder="https://your-signaling-server"
                />

              </ion-item>
                          <ion-button size="small" fill="outline" :href="relayDocs" target="_blank" rel="noopener">  {{ $t('call7') }}</ion-button>
         
              <ion-buttons class="ion-margin-top">
            <ion-button @click="regenerateKeypair" fill="outline"  expand="block" color="warning">
             
              {{ $t('call9') }}
            </ion-button>
 
          </ion-buttons>
          <ion-item lines="none">
            <ion-textarea
              readonly
              auto-grow
              :rows="3"
              :label="$t('call8')"
              label-placement="stacked"
              :value="call.pairText"
            />
          </ion-item>
          
      
            
                <div >
            <div >
             
            </div>
          </div>
            </div>
          </div>

        </div>
      </div>


      <!-- 日志模态框 -->
      <ion-modal :is-open="openLogs" @didDismiss="openLogs=false">
        <ion-header>
          <ion-toolbar>
            <ion-title>log</ion-title>
            <ion-buttons slot="end"><ion-button @click="openLogs=false">close</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list>
            <ion-item v-for="(l, i) in call.log" :key="i">
              <ion-label>
                <h3>{{ l.t }}</h3>
                <p style="white-space: pre-wrap">{{ l.m }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>


      <div style="height: 20%;"></div>
    </ion-content>
    <!-- 底部导航栏（Ionic风格） -->
    <transition name="call-footer-fade">
    <div style="position: absolute; bottom: 50px; left: 0; right: 0;" v-if="footerVisible" class="call-footer ion-no-border" collapse="fade">
      <!-- Footer-only blur veil -->
      <div v-if="barTransition" class="footer-blurveil opening"></div>
      <ion-toolbar v-if="localopen">

      
              <div class="duration-title" v-if="call.connected">
                <div  class="call-b" style="padding:0 3px">
                {{ callDurationText }}
                </div>
              </div>
    
      </ion-toolbar>
     
      <ion-toolbar >
        <div style="display: flex; justify-content: center;align-items: center;">
        <ion-buttons 
        class="call-b"
      >
          <ion-button
            v-if="!call.connected && !localopen"
            color="success"
            size="default"
            fill="solid"
            :disabled="!call.hasPrivate"
            @click="handleStartMeeting"
          >
            <ion-icon :icon="callOutline"></ion-icon>
           
          </ion-button>

             <ion-button
            v-if="!call.connected && localopen"
            color="success"
            size="default"
            fill="solid"
            :disabled="!call.hasPrivate"
            @click="handleEndMeeting"
          >

            <ion-spinner name="dots"></ion-spinner>
          </ion-button>

          <ion-button
            v-if="call.connected"
            color="danger"
            size="default"
            fill="solid"
            @click="handleEndMeeting"
          >
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>

          <ion-button
            size="default"
            fill="outline"
            color="dark"
            @click="toggleMic"
            :disabled="!call.hasPrivate"
          >


                        <ion-icon :icon="call.enableMic ? micOutline : micOffOutline"></ion-icon>
          </ion-button>

          <ion-button
            size="default"
            fill="outline"
            color="dark"
            @click="toggleCamera"
            :disabled="!call.hasPrivate"
          >


                        <ion-icon :icon="call.enableCam ? cameraOutline : videocamOffOutline"></ion-icon>
          </ion-button>
          
          <ion-button
            size="default"
            fill="outline"
            color="dark"
            @click="toggleSpeaker"
            :disabled="!call.hasPrivate"
          >
            <ion-icon :icon="audioMode === 'speaker' ? volumeHighOutline : earOutline"></ion-icon>
          </ion-button>
        
 <ion-button v-if="localopen" size="default" fill="outline" @click="flipCamera" :disabled="!call.hasPrivate || !call.enableCam">
            <ion-icon :icon="cameraReverseOutline"></ion-icon>
          </ion-button>

             <ion-button v-if="localopen" size="default" fill="outline" @click="overlay.minimize()" :disabled="!call.connected">
            <ion-icon :icon="chevronDownOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
</div>
  
       
      </ion-toolbar>
    </div>
    </transition>
  </div>
  </transition>

  <!-- 最小化小窗口（顶层显示），可拖动 -->
  <div v-if="overlay.enabled && overlay.visible && overlay.minimized && call.connected" class="mini-overlay" :style="{ left: `${miniPos.x}px`, top: `${miniPos.y}px` }">
    <div class="mini-window" @mousedown="onMiniMouseDown" @touchstart.prevent="onMiniTouchStart" @click="onMiniClick">
      <template v-if="showRemoteMini">
        <video :id="`remote-${call.remotePeers[0]}`" playsinline autoplay></video>
        <!-- 远端小窗也补充隐藏音频元素，确保输出设备切换一致 -->
        <audio :id="`remote-audio-${call.remotePeers[0]}`" autoplay style="display: none;"></audio>
      </template>
      <template v-else>
        <video id="localVideo" muted playsinline autoplay></video>
      </template>
    </div>
    <ion-button class="mini-max-btn" size="small" fill="solid" @click="overlay.maximize()">
      <ion-icon :icon="expandOutline"></ion-icon>
    </ion-button>
  </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount, computed, nextTick } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonBackButton, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonItem, IonInput, IonTextarea, IonToggle, IonSelect, IonSelectOption,
  IonList, IonLabel, IonModal, IonSegment, IonSegmentButton, IonIcon, IonRefresherContent, IonSpinner, IonFooter
} from '@ionic/vue'
import { useCall } from '@/composables/useCall'
import { micOutline, cameraOutline, callOutline, closeOutline, swapHorizontalOutline, chevronDownOutline, volumeHighOutline, volumeMuteOutline, earOutline,micOffOutline, cameraReverseOutline, videocamOffOutline, expandOutline, } from 'ionicons/icons'
import { useCallOverlay } from '@/composables/useCallOverlay'
import { useAudioOutput } from '@/composables/useSetAudioMode'
 
const relayDocs = 'https://github.com/DeFUCC/gun-vue/tree/main/relay/skin/gun-vue-call-relay'

const call = useCall()
const overlay = useCallOverlay()
const openLogs = ref(false)
const activeTab = ref('create')
const roomName = ref('')

const pasteString = ref('')
// 提前声明，避免在 watch 中使用前未声明
const localopen = ref(false)

// Overlay open/close transition states
const openingTransition = ref(false)
const closingTransition = ref(false)
// Footer show/hide transition state
const barTransition = ref(false)
// Footer visibility toggled by clicking video area
const footerVisible = ref(true)

// 扬声器/听筒切换
const { audioMode, setAudioOutput, loadAudioState } = useAudioOutput()
function toggleSpeaker(){
  const next = (audioMode.value === 'speaker') ? 'earpiece' : 'speaker'
  setAudioOutput(next as any)
}

// 小窗可见状态（用于在渲染后重新绑定视频流）
const miniOverlayVisible = computed(() => overlay.enabled && overlay.visible && overlay.minimized && call.connected)

watch(miniOverlayVisible, async (v) => {
  if (v) {
    await nextTick()
    bindLocalVideoElement()
    bindRemoteVideoElements()
  }
})

onMounted(async () => {
  try {
    // 首先尝试从 localStorage 加载已保存的密钥对
    const savedPair = localStorage.getItem('room_pair')
    if (savedPair) {
      call.pairText = savedPair
      call.loadPair()
      // 加载完密钥后，刷新分享链接确保包含当前密钥与信号地址
      ShareLink()
    }
  } catch (e) {
    console.log('加载密钥对失败:', e)
  }
  // 加载并应用已保存的音频输出模式（扬声器/听筒）
  try {
    await loadAudioState();
    await setAudioOutput(audioMode.value as any);
  } catch (e) {
    console.log('初始化音频模式失败:', e);
  }
  
  await call.enumerate()
  initPipDefault()

  // 若没有从存储加载密钥，也确保初始化一次分享链接
  ShareLink()

})

// 多人视频布局：默认一列，当每个窗口高度小于100px时切换为两列
const multiCols = ref(1)
const multiGridStyle = computed(() => {
  const itemCount = (call.remotePeers?.length || 0) + 1 // 包含本地窗口
  const cols = multiCols.value
  const rows = Math.max(1, Math.ceil(itemCount / Math.max(1, cols)))
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridAutoRows: `calc(100vh / ${rows})`,
    gap: '0px',
    margin: '0',
    padding: '0'
  } as any
})

function updateMultiGrid(){
  try {
    const itemCount = (call.remotePeers?.length || 0) + 1
    const oneColRows = Math.max(1, itemCount)
    const tileHeightOneCol = window.innerHeight / oneColRows
    multiCols.value = tileHeightOneCol < 100 ? 2 : 1
  } catch(_) { /* ignore */ }
}

// 当远端人数变化、本地窗口打开或窗口尺寸变化时重新评估布局
watch(() => call.remotePeers.length, async () => { await nextTick(); updateMultiGrid() })
watch(localopen, async (v) => { if (v) { await nextTick(); updateMultiGrid() } })
function onResize(){ updateMultiGrid() }
onMounted(() => { try { window.addEventListener('resize', onResize) } catch(_) {} })
onBeforeUnmount(() => { try { window.removeEventListener('resize', onResize) } catch(_) {} })

// 监听信号地址与密钥变化，保存到本地并更新二维码数据
watch(() => call.signalingOrigin, (v) => {
  try { (call as any).saveSignalingOrigin?.() } catch(_) {}
  ShareLink()
})
watch(() => call.pairText, () => {
  // 不重复调用 loadPair 以免造成多次解析；二维码只需最新的 pairText
  ShareLink()
})

function toggleMic() {
  call.enableMic = !call.enableMic
  // 如果没有本地流，直接返回（或等待 start 后再处理）
  if (!call.localStream) return

  // 工具函数：优先复用现有音频 transceiver 的 sender，避免协商
  const setAudioSenderTrack = async (track: MediaStreamTrack | null) => {
    const peers = call.peers || {}
    for (const id of Object.keys(peers)) {
      const pc = peers[id]
      // 通过 receiver.track.kind 匹配音频 transceiver，避免 sender.track 为空时找不到
      const txs = (pc.getTransceivers?.() || []).filter(t => (t as any)?.receiver?.track?.kind === 'audio')
      let used = false
      for (const tx of txs) {
        try {
          if (!call.enableMic) { try { tx.direction = 'recvonly' } catch (_) {} }
          else { try { tx.direction = 'sendrecv' } catch (_) {} }
          await tx.sender.replaceTrack(track as any); used = true
        } catch (_) {}
      }
      if (!used && track) {
        // 如果没有可用的音频 transceiver，则回退为 addTrack（可能触发协商）
        try { pc.addTrack(track, call.localStream!) } catch (_) {}
      }
    }
  }

  if (!call.enableMic) {
    // 关闭麦克风：停止本地音频 track，并对 sender 使用 replaceTrack(null)
    try {
      const audioTracks = call.localStream.getAudioTracks()
      for (const t of audioTracks) { try { t.stop() } catch (_) {} }
    } catch (_) {}
    setAudioSenderTrack(null)
  } else {
    // 打开麦克风：重新获取本地音频，并替换到所有 sender
    navigator.mediaDevices.getUserMedia({ audio: { deviceId: call.selectedAudioIn ? { exact: call.selectedAudioIn } : undefined } as any })
      .then(async (stream) => {
        // 将新音频轨道附加到本地流（保持可能已有的视频轨）
        const newTrack = stream.getAudioTracks()[0] || null
        // 清理已结束的旧音频轨并添加新轨到本地流（用于本地预览）
        try {
          const old = call.localStream.getAudioTracks()
          for (const t of old) { if (t.readyState === 'ended') { try { call.localStream.removeTrack(t) } catch (_) {} } }
          if (newTrack) { try { call.localStream.addTrack(newTrack) } catch (_) {} }
        } catch (_) {}
        await setAudioSenderTrack(newTrack)
      })
      .catch(() => {
        // 回退到整体刷新本地流
        call.getLocalStream().then(async () => {
          const newTrack = call.localStream?.getAudioTracks?.()[0] || null
          await setAudioSenderTrack(newTrack)
        })
      })
  }
}

function toggleCamera() {
  call.enableCam = !call.enableCam
  if (!call.localStream) return

  // 工具函数：优先复用现有视频 transceiver 的 sender，避免协商
  const setVideoSenderTrack = async (track: MediaStreamTrack | null) => {
    const peers = call.peers || {}
    for (const id of Object.keys(peers)) {
      const pc = peers[id]
      // 通过 receiver.track.kind 匹配视频 transceiver
      const txs = (pc.getTransceivers?.() || []).filter(t => (t as any)?.receiver?.track?.kind === 'video')
      let used = false
      for (const tx of txs) {
        try {
          if (!call.enableCam) { try { tx.direction = 'recvonly' } catch (_) {} }
          else { try { tx.direction = 'sendrecv' } catch (_) {} }
          await tx.sender.replaceTrack(track as any); used = true
        } catch (_) {}
      }
      if (!used && track) {
        try { pc.addTrack(track, call.localStream!) } catch (_) {}
      }
    }
  }

  if (!call.enableCam) {
    // 关闭摄像头：停止本地视频 track，并对 sender 使用 replaceTrack(null)
    try {
      const videoTracks = call.localStream.getVideoTracks()
      for (const t of videoTracks) { try { t.stop() } catch (_) {} }
    } catch (_) {}
    setVideoSenderTrack(null)
  } else {
    // 打开摄像头：重新获取视频并替换到所有 sender
    navigator.mediaDevices.getUserMedia({ video: { deviceId: call.selectedVideoIn ? { exact: call.selectedVideoIn } : undefined } as any })
      .then(async (stream) => {
        const newTrack = stream.getVideoTracks()[0] || null
        // 清理已结束的旧视频轨并添加新轨到本地流
        try {
          const old = call.localStream.getVideoTracks()
          for (const t of old) { if (t.readyState === 'ended') { try { call.localStream.removeTrack(t) } catch (_) {} } }
          if (newTrack) { try { call.localStream.addTrack(newTrack) } catch (_) {} }
        } catch (_) {}
        await setVideoSenderTrack(newTrack)
      })
      .catch(() => {
        call.getLocalStream().then(async () => {
          const newTrack = call.localStream?.getVideoTracks?.()[0] || null
          await setVideoSenderTrack(newTrack)
        })
      })
  }
}


function regenerateKeypair() {
  call.generatePair().then(() => {
    // 重新生成后确保加载到全局状态
    call.loadPair();
    ShareLink();
  })
}


const qrsharelink = ref('')

function ShareLink(){
    const shareData = {
    roomName: roomName.value || 'E2EE Video Call',
    keypair: call.pair,
    signalingOrigin: call.signalingOrigin,
    timestamp: Date.now()
  }
  
 qrsharelink.value = `TALKFLOW_SHARE:${btoa(JSON.stringify(shareData))}`
  
}

// watch(qrsharelink, (newValue) => {
//   if (newValue) {
   
//     ShareLink();
//   }
// })

function quickShareRoom() {
  if (!call.hasPrivate || !call.pair) {
    alert('The room key is empty. Please make it the key.')
    return
  }
  
  // 直接生成并复制分享字符串
  const shareData = {
    roomName: roomName.value || 'E2EE Video Call',
    keypair: call.pair,
    signalingOrigin: call.signalingOrigin,
    timestamp: Date.now()
  }
  
  const shareStr = `TALKFLOW_SHARE:${btoa(JSON.stringify(shareData))}`
  
  try {
    navigator.clipboard.writeText(shareStr)
    alert('Copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy:', err)
    alert('Failed to copy')
  }
}

// 已提前上移声明

function handleStartMeeting() {

 // console.log('handleStartMeeting 被调用')
  if (call.connected) {
   // console.log('当前已连接，执行停止操作')
    call.stop()
  } else {
      localopen.value = true
   // console.log('当前未连接，执行开始会议操作')
    enterVideoCall()
    // 不自动打开全屏窗口；由 Menu.vue 的开关控制
  }
}

function handleEndMeeting() {
  localopen.value = false
 // console.log('handleEndMeeting 被调用 - 挂断会议')
  if (call.connected) {
    call.stop()
  //  console.log('会议已挂断')
  }
  // 不关闭全屏窗口；由 Menu.vue 的开关控制
}

function enterVideoCall() {

  // console.log('当前状态:', { 
  //   hasPrivate: call.hasPrivate, 
  //   roomPub: call.roomPub, 
  //   pair: call.pair,
  //   connected: call.connected 
  // })
  
  if (!call.hasPrivate) {
   // console.log('没有私钥，提示创建房间')
    alert('The room key is empty. Please make it the key.')
    return
  }
  
  // 确保密钥对象存在
  if (!call.pair) {
    //console.log('密钥对象不存在，尝试重新加载')
    call.loadPair()
    
    if (!call.pair) {
   //   console.log('重新加载后仍然没有密钥对象')
      alert('The room key is empty. Please make it the key.')
      return
    }
  }
  
  // console.log('开始视频通话，密钥对象:', call.pair)
  // console.log('房间状态:', { hasPrivate: call.hasPrivate, roomPub: call.roomPub })
  
  try {
    // 启动视频通话
  //  console.log('调用 call.start()')
    call.start().then(async ()=>{ await nextTick(); bindLocalVideoElement(); })
  //  console.log('call.start() 调用完成')
  } catch (error) {
  //  console.error('启动视频通话时出错:', error)
    alert(error.message)
  }
}

// 通话时长计时器
const callStartTime = ref<number|null>(null)
const durationTick = ref(0)
let durationInterval: any = null

watch(() => call.connected, (val) => {
  if (val) {
    callStartTime.value = Date.now()
    durationTick.value = Date.now()
    if (durationInterval) clearInterval(durationInterval)
    durationInterval = setInterval(() => {
      durationTick.value = Date.now()
    }, 1000)
  } else {
    callStartTime.value = null
    if (durationInterval) { clearInterval(durationInterval); durationInterval = null }
  }
})

onBeforeUnmount(() => { if (durationInterval) clearInterval(durationInterval) })

const callDurationText = computed(() => {
  if (!callStartTime.value) return '00:00'
  const elapsed = Math.floor((durationTick.value - callStartTime.value) / 1000)
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  return (h > 0 ? `${String(h).padStart(2, '0')}:` : '') + `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// 摄像头翻转（在可用视频设备间切换）
function flipCamera() {
  try {
    const vids = call.devices.videoIn || []
    if (!vids.length) return
    const idx = vids.findIndex(d => d.deviceId === call.selectedVideoIn)
    const next = vids[(idx + 1) % vids.length]
    call.selectedVideoIn = next.deviceId
    call.getLocalStream().then(() => {
      const newTrack = call.localStream?.getVideoTracks?.()[0]
      if (!newTrack) return
      Object.values(call.peers).forEach(pc => {
        pc.getSenders().forEach(s => {
          if (s.track && s.track.kind === 'video') {
            try { (s as RTCRtpSender).replaceTrack(newTrack) } catch(_) { }
          }
        })
      })
    })
  } catch(e) { /* ignore */ }
}

// 漂浮窗拖拽
const pipPos = ref({ x: 10, y: 70 })
const pipDragging = ref(false)
let pipOffset = { x: 0, y: 0 }

function initPipDefault(){
  // 默认右下角偏移
  // 等容器渲染后设定一个合理初始值
  nextTick(() => {
    try {
      const container = document.querySelector('.video-section') as HTMLElement
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      const pipW = 160, pipH = 120, margin = 12
      pipPos.value.x = Math.max(margin, w - pipW - margin)
      pipPos.value.y = Math.max(margin, h - pipH - margin)
    } catch(_) {}
  })
}

function onPipMouseDown(e: MouseEvent){
  pipDragging.value = true
  pipOffset = { x: e.clientX - pipPos.value.x, y: e.clientY - pipPos.value.y }
  document.addEventListener('mousemove', onPipMouseMove)
  document.addEventListener('mouseup', onPipMouseUp)
}
function onPipMouseMove(e: MouseEvent){
  if (!pipDragging.value) return
  const container = document.querySelector('.video-section') as HTMLElement
  if (!container) return
  const pipW = 160, pipH = 120, margin = 12
  const maxX = container.clientWidth - pipW - margin
  const maxY = container.clientHeight - pipH - margin
  let x = e.clientX - pipOffset.x
  let y = e.clientY - pipOffset.y
  pipPos.value.x = Math.max(margin, Math.min(maxX, x))
  pipPos.value.y = Math.max(margin, Math.min(maxY, y))
}
function onPipMouseUp(){
  pipDragging.value = false
  document.removeEventListener('mousemove', onPipMouseMove)
  document.removeEventListener('mouseup', onPipMouseUp)
}

function onPipTouchStart(ev: TouchEvent){
  const t = ev.touches[0]
  pipDragging.value = true
  pipOffset = { x: t.clientX - pipPos.value.x, y: t.clientY - pipPos.value.y }
  document.addEventListener('touchmove', onPipTouchMove, { passive: false })
  document.addEventListener('touchend', onPipTouchEnd)
}
function onPipTouchMove(ev: TouchEvent){
  if (!pipDragging.value) return
  const t = ev.touches[0]
  const container = document.querySelector('.video-section') as HTMLElement
  if (!container) return
  const pipW = 160, pipH = 120, margin = 12
  const maxX = container.clientWidth - pipW - margin
  const maxY = container.clientHeight - pipH - margin
  let x = t.clientX - pipOffset.x
  let y = t.clientY - pipOffset.y
  pipPos.value.x = Math.max(margin, Math.min(maxX, x))
  pipPos.value.y = Math.max(margin, Math.min(maxY, y))
}
function onPipTouchEnd(){
  pipDragging.value = false
  document.removeEventListener('touchmove', onPipTouchMove)
  document.removeEventListener('touchend', onPipTouchEnd)
}


async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    pasteString.value = text
    alert('Done')
  } catch (err) {
    console.error('Failed to paste:', err)
  }
}

function parseShareString() {
  if (!pasteString.value.trim()) return
  
  try {
    if (!pasteString.value.startsWith('TALKFLOW_SHARE:')) {
      throw new Error('Invalid format')
    }
    
    const base64Data = pasteString.value.replace('TALKFLOW_SHARE:', '')
    const shareData = JSON.parse(atob(base64Data))
    
    // 自动填充数据
    if (shareData.keypair) {
      call.pairText = JSON.stringify(shareData.keypair, null, 2)
      call.loadPair()
    }
    
    if (shareData.signalingOrigin) {
      call.signalingOrigin = shareData.signalingOrigin
      call.saveSignalingOrigin()
    }
    
    if (shareData.roomName) {
      roomName.value = shareData.roomName
    }
    
    alert('Done')
    
    // 切换到创建房间面板显示加载的信息
    activeTab.value = 'create'
    
  } catch (err) {
   // console.error('Parse error:', err)
    alert(err)
  }
}

function shortId(id: string){
  if (!id) return ''
  return id.slice(0, 4) + '…' + id.slice(-4)
}

// 获取当前可见的指定 ID 的 video 元素，避免绑定到被隐藏的节点
function getVisibleVideoById(id: string){
  try {
    const els = document.querySelectorAll(`video#${id}`) as NodeListOf<HTMLVideoElement>
    for (const el of Array.from(els)){
      const style = getComputedStyle(el)
      const styleVisible = style.display !== 'none' && style.visibility !== 'hidden'
      const rectVisible = el.getClientRects().length > 0 || el.offsetWidth > 0 || el.offsetHeight > 0
      if (styleVisible && rectVisible) return el
    }
    return els[0] || null
  } catch(_) { return null }
}

// 重新绑定本地视频到当前可见的 localVideo 元素
function bindLocalVideoElement(){
  try {
    const el = getVisibleVideoById('localVideo')
    if (el && call.localStream) {
      el.srcObject = call.localStream
      ;(el as any).play?.().catch(()=>{})
    }
  } catch(_) {}
}

// 重新绑定远程视频到当前存在的 remote-<id> 元素
async function bindRemoteVideoElements(){
  try {
    for (const pid of call.remotePeers) {
      const elId = `remote-${pid}`
      const el = getVisibleVideoById(elId)
      const stream = (call as any).remoteStreams?.[pid]
      if (el && stream) {
        el.autoplay = true
        ;(el as any).playsInline = true
        el.srcObject = stream
        try { (el as any).play?.() } catch(_) {}
        // 绑定远端音频元素，提升 setSinkId 应用的稳定性
        try {
          const audEl = document.getElementById(`remote-audio-${pid}`) as HTMLAudioElement | null
          if (audEl) {
            audEl.autoplay = true
            audEl.srcObject = stream
            try { (audEl as any).play?.() } catch(_) {}
          }
        } catch(_) {}
        // 远端视频绑定后，应用当前的音频输出模式（Web 原生 setSinkId）
        try { await setAudioOutput(audioMode.value as any) } catch(_) {}
      }
    }
  } catch(_) {}
}

// 当通话布局发生变化（远端人数变化或本地窗口打开）时，确保本地视频重新绑定
watch(() => call.remotePeers.length, async () => { await nextTick(); bindLocalVideoElement(); bindRemoteVideoElements() })
watch(localopen, async (v) => { if (v) { await nextTick(); bindLocalVideoElement() } })
watch(() => overlay.minimized, async () => {
  await nextTick()
  bindLocalVideoElement()
  bindRemoteVideoElements()
  // 进一步等待布局稳定再尝试一次，提升小窗绑定成功率
  setTimeout(() => { bindRemoteVideoElements() }, 120)
})
watch(() => overlay.visible, async () => { await nextTick(); bindLocalVideoElement(); bindRemoteVideoElements() })

// Open/close visual transitions
watch(() => overlay.visible, (v, old) => {
  if (v && !old){
    openingTransition.value = true
    setTimeout(()=>{ openingTransition.value = false }, 600)
  } else if (!v && old){
    closingTransition.value = true
    setTimeout(()=>{ closingTransition.value = false }, 600)
  }
})

// Trigger blur veil when toggling footer visibility
const triggerBarTransition = () => {
  barTransition.value = true
  setTimeout(() => { barTransition.value = false }, 600)
}

// Click handler on video area to toggle bottom bar visibility with blur effect
const onVideoAreaClick = () => {
  if (!overlay.minimized && overlay.visible && localopen.value) {
    footerVisible.value = !footerVisible.value
    triggerBarTransition()
  }
}

// Reset footer when overlay hidden
watch(() => overlay.visible, (v) => { if (!v) footerVisible.value = true })

// 最小化小窗逻辑
// 优先展示对方视频：有远端就显示第一个；否则显示本地
const showRemoteMini = computed(() => call.remotePeers.length > 0)
const miniPos = ref({ x: 12, y: 120 })
let miniDragging = false
let miniOffset = { x: 0, y: 0 }

function onMiniMouseDown(e: MouseEvent){
  miniDragging = true
  miniOffset = { x: e.clientX - miniPos.value.x, y: e.clientY - miniPos.value.y }
  document.addEventListener('mousemove', onMiniMouseMove)
  document.addEventListener('mouseup', onMiniMouseUp)
}
function onMiniMouseMove(e: MouseEvent){
  if (!miniDragging) return
  const pipW = 160, pipH = 120, margin = 8
  const maxX = window.innerWidth - pipW - margin
  const maxY = window.innerHeight - pipH - margin
  let x = e.clientX - miniOffset.x
  let y = e.clientY - miniOffset.y
  miniPos.value.x = Math.max(margin, Math.min(maxX, x))
  miniPos.value.y = Math.max(margin, Math.min(maxY, y))
}

// 点击小窗时，重试远端视频播放（解决部分浏览器的自动播放限制）
function onMiniClick(){
  try {
    bindRemoteVideoElements()
  } catch(_) {}
}
function onMiniMouseUp(){
  miniDragging = false
  document.removeEventListener('mousemove', onMiniMouseMove)
  document.removeEventListener('mouseup', onMiniMouseUp)
}
function onMiniTouchStart(ev: TouchEvent){
  const t = ev.touches[0]
  miniDragging = true
  miniOffset = { x: t.clientX - miniPos.value.x, y: t.clientY - miniPos.value.y }
  document.addEventListener('touchmove', onMiniTouchMove, { passive: false })
  document.addEventListener('touchend', onMiniTouchEnd)
}
function onMiniTouchMove(ev: TouchEvent){
  if (!miniDragging) return
  const t = ev.touches[0]
  const pipW = 160, pipH = 120, margin = 8
  const maxX = window.innerWidth - pipW - margin
  const maxY = window.innerHeight - pipH - margin
  let x = t.clientX - miniOffset.x
  let y = t.clientY - miniOffset.y
  miniPos.value.x = Math.max(margin, Math.min(maxX, x))
  miniPos.value.y = Math.max(margin, Math.min(maxY, y))
}
function onMiniTouchEnd(){
  miniDragging = false
  document.removeEventListener('touchmove', onMiniTouchMove)
  document.removeEventListener('touchend', onMiniTouchEnd)
}
</script>

<style scoped>
.global-call-overlay{ position: fixed; inset: 0; z-index: 1000000; }
.global-call-overlay.hidden{ display: none; }
.global-call-overlay.minimized > ion-page{ display: none; }
.global-call-overlay.minimized{ pointer-events: none; }
.global-call-overlay.minimized .mini-overlay, .global-call-overlay.minimized .mini-overlay * { pointer-events: auto; }

/* Blur veil for open/close transition */
.blurveil{ position: fixed; inset: 0; z-index: 1000002; pointer-events: none;
   background: rgba(0, 0, 0, 0);
   }
/* @keyframes overlay-blur-in-out {
  0% { backdrop-filter: blur(0px); opacity: 0; }
  30% { backdrop-filter: blur(50px); opacity: 1; }
  100% { backdrop-filter: blur(0px); opacity: 0; }
} */
.blurveil.opening{ animation: overlay-blur-in-out 600ms ease-in-out forwards; }
.blurveil.closing{ animation: overlay-blur-in-out 600ms ease-in-out forwards; }

/* Fade for content page */
.call-page-fade-enter-active, .call-page-fade-leave-active { transition: opacity 300ms ease; }
.call-page-fade-enter-from, .call-page-fade-leave-to { opacity: 0; }

/* Fade for footer bar */
.call-footer-fade-enter-active, .call-footer-fade-leave-active { transition: opacity 300ms ease; }
.call-footer-fade-enter-from, .call-footer-fade-leave-to { opacity: 0; }

/* Footer-only blur veil (scoped to footer area) */
.call-footer { position: relative; 

 
}
ion-toolbar {
    --opacity: 0.7;
  }
  ion-footer{
  --background:transparent;
  background:transparent;
  }

.footer-blurveil { position: absolute; inset: 0; pointer-events: none; }
.footer-blurveil.opening { animation: overlay-blur-in-out 600ms ease-in-out forwards; }

.call-content {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ion-background-color);
}

/* 视频区域 - 占据上半部分 */
.video-section {
  flex: 1;
  min-height: 70vh;
  background: #000;
  position: relative;
  overflow: hidden;
}

.video-container {
  width: 100%;
  height: 100vh;
  padding: 0px;
  position: fixed;
  top:0;
  left:0;
  z-index:9999;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: minmax(120px, 1fr);
  gap: 8px;
  height: 100%;
}

.nine-grid {
  grid-template-columns: repeat(3, 1fr);
}

.remote-full {
  position: absolute;
  inset: 0px;
  border-radius: 0px;
  overflow: hidden;
  background: #1a1a1a;
}

.remote-full video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-item {
  position: relative;
  background: #1a1a1a;
  border-radius: 0px;
  overflow: hidden;
  border: none;
  transition: border-color 0.3s ease;
}

.video-item.local-video {
  border-color: var(--ion-color-primary);
}

.video-item.remote-video {
  border-color: var(--ion-color-success);
}

.video-item.full-screen {
  grid-column: span 2;
  grid-row: span 2;
}

.video-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.video-overlay.soft {
  background: linear-gradient(transparent, rgba(0,0,0,0.4));
}

.video-label {
  color: white;
  font-size: 12px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.video-controls {
  display: flex;
  gap: 4px;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.05);
}

.placeholder-content {
  text-align: center;
  color: rgba(255,255,255,0.6);
}

.placeholder-content ion-icon {
  margin-bottom: 8px;
  opacity: 0.5;
}

.placeholder-content p {
  margin: 0;
  font-size: 12px;
}


.call-footer ion-toolbar {
  --background: transparent;
  /* --color: #fff; */
}
.call-footer ion-button {
  --border-radius:50%;
  padding: 3px 3px;
}
.duration-title {
  text-align: center;
  font-variant-numeric: tabular-nums;
  display: flex;
  justify-content: center;
  align-items: center;
}
.call-b{
 
        border-radius: 50px;
        border:1px solid #87878721;
        backdrop-filter: blur(10px);
        background: var(--background-color-no);
        
}
/* 快捷操作按钮 */
.quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
}

.quick-actions ion-button {
  flex: 1;
  max-width: 140px;
}

/* 选项卡区域 */
.tabs-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 创建房间面板 */
.create-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 16px;
}

.form-group ion-item {
  --background: transparent;
  --border-color: var(--ion-color-medium);
  margin-bottom: 12px;
}

.keypair-display {
  background: var(--ion-color-step-50);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--ion-color-medium);
}

.keypair-display h4 {
  margin: 0 0 12px 0;
  color: var(--ion-color-primary);
  font-size: 16px;
  font-weight: 600;
}

.keypair-item {
  --background: var(--ion-color-step-100);
  border-radius: 8px;
  margin-bottom: 12px;
}

/* 加入房间面板 */
.join-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 分享模态框 */
.share-string-item {
  margin-top: 16px;
  --background: var(--ion-color-step-50);
  border-radius: 8px;
}

/* 浮动本地窗口（FaceTime/WhatsApp 风格） */
.pip-window {
  position: absolute;
  width: 160px;
  height: 120px;
  right: 12px;
  bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  border: 2px solid rgba(255,255,255,0.1);
  touch-action: none;
  z-index: 10;
}
.pip-window video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pip-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
  padding: 6px 8px;
}

/* 最小化小窗 */
.mini-overlay{ position: fixed; z-index: 1000001; width: 160px; pointer-events: auto; }
.mini-window{ width: 160px; height: 120px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.35); background: #000; }
.mini-window video{ width: 100%; height: 100%; object-fit: cover; }
.mini-max-btn{ margin-top: 8px; --border-radius: 20px; }

/* 响应式设计 */
@media (max-height: 600px) {
  .video-section {
    min-height: 40vh;
  }
  
  .toolbar-section {
    max-height: 60vh;
  }
}

@media (max-width: 768px) {
  .media-controls {
    flex-direction: column;
    gap: 8px;
  }
  
  .main-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .main-actions ion-button {
    max-width: none;
  }
}

@media (min-width: 768px) {
  .toolbar-section {
    padding: 24px;
  }
  
  .room-status-card {
    padding: 24px;
  }
  
  .tab-content {
    padding: 24px;
  }
  
  .video-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .video-item.full-screen {
    grid-column: span 2;
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .video-section {
    background: #000;
  }
  
  .video-item {
    background: #2a2a2a;
  }
  
  .placeholder {
    border-color: rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.03);
  }
  
  .keypair-display {
    background: var(--ion-color-step-150);
    border-color: var(--ion-color-step-200);
  }
}
</style>
