<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start">
            <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title> 
          <!-- {{ roomName }} -->
          <h2 v-if="roomName"></h2>
            <h2 v-else class="no-room"></h2>
            <p v-if="call.roomPub" class="room-id">Room ID: {{ shortId(call.roomPub) }}</p>
            <p v-if="!call.hasPrivate" class="warning">请先配置房间密钥</p></ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openLogs = !openLogs">log</ion-button>
        
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen class="call-content">
      <!-- 视频窗口区域 -->
      <div class="video-section"  v-if="localopen">
        <div class="video-container">
          <div class="video-grid" >
            <!-- 本地视频 -->
            <div class="video-item local-video" :class="{ 'full-screen': call.remotePeers.length === 0 }">
              <video id="localVideo" muted playsinline autoplay></video>
              <div class="video-overlay">
                <div class="video-label">Local</div>
         
              </div>
            </div>
            
            <!-- 远程视频 -->
            <div
            v-if="call.remotePeers.length !== 0"
              v-for="pid in call.remotePeers"
              :key="pid"
              class="video-item remote-video"
            >
              <video :id="`remote-${pid}`" playsinline autoplay></video>
              <div class="video-overlay">
                <div class="video-label">{{ shortId(pid) }}</div>
              </div>
            </div>
            
          
          </div>
        </div>
      </div>

      <!-- 工具栏区域 -->
      <div class="toolbar-section">
        <div class="room-status-card">
   
          
          <div class="room-actions">
            <!-- 媒体控制器 -->
            <div class="media-controls">
             
              <ion-buttons slot="start" style="display: flex; gap: 10px;">

                   <ion-button 
                v-if="!call.connected"
             
                color="success" 
                 size="small" 
                fill="solid"
                :disabled="!call.hasPrivate" 
                @click="handleStartMeeting"
             
              >
                <ion-icon v-if="!localopen" :icon="callOutline" slot="icon-only"></ion-icon>
                 
            <ion-spinner v-else name="dots"></ion-spinner>
              
              </ion-button>
              
              <ion-button 
                v-if="call.connected"
                  size="small" 
                fill="outline"
                color="danger" 
                @click="handleEndMeeting"
              >
              <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
              </ion-button>

              <ion-button 
                size="small" 
                fill="outline"
                :color="call.enableMic ? 'dark' : 'danger'" 
                @click="toggleMic"
                :disabled="!call.hasPrivate"
              >
          
                <ion-icon :icon="micOutline" slot="icon-only"></ion-icon>
              </ion-button>
              
              <ion-button 
                size="small" 
                fill="outline"
                :color="call.enableCam ? 'dark' : 'danger'" 
                @click="toggleCamera"
                :disabled="!call.hasPrivate"
              >
              
                <ion-icon :icon="cameraOutline" slot="icon-only"></ion-icon>
              </ion-button>
               
              </ion-buttons>
            </div>
    
          </div>
        </div>
      </div>

      <div style="display: flex; margin:0 auto;width: 200px;justify-content: center;">
  <QrShow :data="qrsharelink" />
  
</div>
<div style="display: flex; margin:5px auto;width: 200px;justify-content: center;">
 <ion-button fill="outline" size="small" @click="quickShareRoom" :disabled="!call.hasPrivate">
                 
                  复制当前房间分享链接
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
                  label="使用分享链接加入房间"
                  label-placement="stacked"
                  v-model="pasteString"
                  placeholder="在此粘贴房间分享链接..."
                />
               
              </ion-item>
              
              <ion-buttons class="ion-margin-top">
                <ion-button @click="parseShareString" :disabled="!pasteString.trim()" expand="block" color="primary">
                  加入房间
                </ion-button>
             
                <ion-button  @click="pasteFromClipboard" expand="block">
                  从剪贴板粘贴
                </ion-button>
              </ion-buttons>
              <ion-item>
                <ion-input
                  label="信令服务器"
                  label-placement="stacked"
                  v-model="call.signalingOrigin"
                  placeholder="https://your-signaling-server"
                />
                      <ion-button size="small" fill="outline" :href="relayDocs" target="_blank" rel="noopener">部署私人信令指南</ion-button>
              </ion-item>
    
         
          
          <ion-item lines="none">
            <ion-textarea
              readonly
              auto-grow
              :rows="3"
              label="通话加密密钥(JSON)"
              label-placement="stacked"
              :value="call.pairText"
            />
          </ion-item>
          
          <ion-buttons class="ion-margin-top">
            <ion-button @click="regenerateKeypair" expand="block" color="warning">
             
              重新生成密钥对
            </ion-button>
 
          </ion-buttons>
            
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
            <ion-title>日志</ion-title>
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
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonBackButton, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonItem, IonInput, IonTextarea, IonToggle, IonSelect, IonSelectOption,
  IonList, IonLabel, IonModal, IonSegment, IonSegmentButton, IonIcon,IonRefresherContent, IonSpinner
} from '@ionic/vue'
import { useCall } from '@/composables/useCall'
import { micCircleOutline,micOutline,micOffOutline,cameraOutline, callOutline, closeOutline } from 'ionicons/icons'
 
const relayDocs = 'https://github.com/DeFUCC/gun-vue/tree/main/relay/skin/gun-vue-call-relay'

const call = useCall()
const openLogs = ref(false)
const activeTab = ref('create')
const roomName = ref('')

const pasteString = ref('')

onMounted(async () => {
ShareLink();
  try {
    // 首先尝试从 localStorage 加载已保存的密钥对
    const savedPair = localStorage.getItem('room_pair')
    if (savedPair) {
      call.pairText = savedPair
      call.loadPair()
    //  console.log('从存储加载密钥对:', call.pair)
    }
  } catch (e) {
    console.log('加载密钥对失败:', e)
  }
  
  await call.enumerate()
})

function toggleMic() {
  call.enableMic = !call.enableMic
  if (call.localStream) {
    call.getLocalStream()
  }
}

function toggleCamera() {
  call.enableCam = !call.enableCam
  if (call.localStream) {
    call.getLocalStream()
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
    alert('请先创建房间')
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
    alert('分享链接已复制到剪贴板！')
  } catch (err) {
    console.error('Failed to copy:', err)
    alert('复制失败，请手动复制')
  }
}

const localopen = ref(false)

function handleStartMeeting() {

 // console.log('handleStartMeeting 被调用')
  if (call.connected) {
    console.log('当前已连接，执行停止操作')
    call.stop()
  } else {
      localopen.value = true
    console.log('当前未连接，执行开始会议操作')
    enterVideoCall()
  }
}

function handleEndMeeting() {
  localopen.value = false
 // console.log('handleEndMeeting 被调用 - 挂断会议')
  if (call.connected) {
    call.stop()
    console.log('会议已挂断')
  }
}

function enterVideoCall() {

  // console.log('当前状态:', { 
  //   hasPrivate: call.hasPrivate, 
  //   roomPub: call.roomPub, 
  //   pair: call.pair,
  //   connected: call.connected 
  // })
  
  if (!call.hasPrivate) {
    console.log('没有私钥，提示创建房间')
    alert('请先创建房间')
    return
  }
  
  // 确保密钥对象存在
  if (!call.pair) {
    console.log('密钥对象不存在，尝试重新加载')
    call.loadPair()
    
    if (!call.pair) {
      console.log('重新加载后仍然没有密钥对象')
      alert('密钥对象丢失，请重新创建房间')
      return
    }
  }
  
  // console.log('开始视频通话，密钥对象:', call.pair)
  // console.log('房间状态:', { hasPrivate: call.hasPrivate, roomPub: call.roomPub })
  
  try {
    // 启动视频通话
    console.log('调用 call.start()')
    call.start()
    console.log('call.start() 调用完成')
  } catch (error) {
    console.error('启动视频通话时出错:', error)
    alert('启动视频通话失败: ' + error.message)
  }
}


async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    pasteString.value = text
    alert('分享字符串已从剪贴板粘贴！')
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
    
    alert('分享字符串解析成功！')
    
    // 切换到创建房间面板显示加载的信息
    activeTab.value = 'create'
    
  } catch (err) {
    console.error('Parse error:', err)
    alert('无效的分享字符串格式')
  }
}

function shortId(id: string){
  if (!id) return ''
  return id.slice(0, 4) + '…' + id.slice(-4)
}
</script>

<style scoped>
.call-content {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ion-background-color);
}

/* 视频区域 - 占据上半部分 */
.video-section {
  flex: 1;
  min-height: 50vh;
  background: #000;
  position: relative;
  overflow: hidden;
}

.video-container {
  width: 100%;
  height: 100%;
  padding: 8px;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: minmax(120px, 1fr);
  gap: 8px;
  height: 100%;
}

.video-item {
  position: relative;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
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

/* 工具栏区域 - 占据下半部分 */
.toolbar-section {
  flex: 0 0 auto;
  max-height: 50vh;
  padding: 12px;
  background: var(--ion-background-color);
  /* border-top: 1px solid var(--ion-color-light); */
}

.room-status-card {
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.room-info {
  text-align: center;
  margin-bottom: 16px;
}

.room-info h2 {
  margin: 0 0 6px 0;
  color: var(--ion-color-primary);
  font-size: 20px;
  font-weight: 600;
}

.room-info h2.no-room {
  color: var(--ion-color-medium);
  font-style: italic;
  font-size: 18px;
}

.room-id {
  margin: 4px 0;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.warning {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: var(--ion-color-warning);
  font-weight: 500;
}

.room-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.media-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.media-controls ion-button {
  width: 40px;
  height: 40px;
  --border-radius: 50%;
}

.main-actions {
  display: flex;
  justify-content: center;
}

.main-actions ion-button {
  min-width: 140px;
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ion-color-medium);
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--ion-color-step-50);
}

.connection-status.connected {
  color: var(--ion-color-success);
  background: var(--ion-color-success-tint);
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
  
  .room-status-card {
    background: var(--ion-color-step-100);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  
  .keypair-display {
    background: var(--ion-color-step-150);
    border-color: var(--ion-color-step-200);
  }
}
</style>