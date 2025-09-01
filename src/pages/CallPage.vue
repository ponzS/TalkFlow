<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start">
           <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>{{ t('videoCall') }}</ion-title>
        <ion-buttons slot="end">
        
          <ion-button @click="openLogs = !openLogs">{{ t('logs') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen>
        <ion-select v-model="lang" interface="popover" style="min-width: 120px; margin-right: 8px">
            <ion-select-option value="en">English</ion-select-option>
            <ion-select-option value="zh">中文</ion-select-option>
          </ion-select>
      <ion-grid class="ion-padding">
        <ion-row>
          <ion-col size="12">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ t('roomKeyPair') }}</ion-card-title>
                <ion-card-subtitle>{{ t('roomKeyPairSub') }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <ion-item lines="none">
                  <ion-textarea
                    auto-grow
                    :rows="4"
                    :label="t('keypairJsonLabel')"
                    label-placement="stacked"
                    v-model="call.pairText"
                    :placeholder="t('keypairJsonPlaceholder')"
                  />
                </ion-item>
                <ion-buttons class="ion-margin-top">
                  <ion-button color="primary" @click="call.generatePair">{{ t('generateKeypair') }}</ion-button>
                  <ion-button color="medium" @click="call.loadPair">{{ t('loadKeypair') }}</ion-button>
                </ion-buttons>
                <div class="meta">
                  <div>{{ t('roomPub') }}<b>{{ call.roomPub || t('notGenerated') }}</b></div>
                  <div>{{ t('hasPrivateKey') }}<b>{{ call.hasPrivate ? t('yes') : t('no') }}</b></div>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col size="12">
            <ion-card>
              <ion-card-header>
                <div class="header-row">
                  <ion-card-title>{{ t('signalingDevices') }}</ion-card-title>
                  <ion-button size="small" fill="outline" :href="relayDocs" target="_blank" rel="noopener">{{ t('helpSignaling') }}</ion-button>
                </div>
              </ion-card-header>
              <ion-card-content>
                <ion-item>
                  <ion-input
                    :label="t('signalingOriginLabel')"
                    label-placement="stacked"
                    v-model="call.signalingOrigin"
                    :placeholder="t('signalingOriginPlaceholder')"
                  />
                </ion-item>
                <ion-buttons class="ion-margin-top">
                  <ion-button @click="call.saveSignalingOrigin">{{ t('save') }}</ion-button>
                  <ion-button fill="outline" @click="call.fetchIce">{{ t('refreshIce') }}</ion-button>
                </ion-buttons>

                <ion-item class="ion-margin-top">
                  <ion-select :label="t('microphone')" interface="popover" v-model="call.selectedAudioIn" @ionChange="onDeviceChanged">
                    <ion-select-option v-for="d in call.devices.audioIn" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('microphone') }}</ion-select-option>
                  </ion-select>
                </ion-item>
                <ion-item>
                  <ion-select :label="t('camera')" interface="popover" v-model="call.selectedVideoIn" @ionChange="onDeviceChanged">
                    <ion-select-option v-for="d in call.devices.videoIn" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('camera') }}</ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item>
                  <ion-toggle v-model="call.enableMic">{{ t('enableMic') }}</ion-toggle>
                </ion-item>
                <ion-item>
                  <ion-toggle v-model="call.enableCam">{{ t('enableCam') }}</ion-toggle>
                </ion-item>
                <ion-item>
                  <ion-toggle v-model="call.enableE2EE">{{ t('enableE2EE') }}</ion-toggle>
                </ion-item>

                <ion-buttons class="ion-margin-top">
                  <ion-button color="success" :disabled="!call.hasPrivate" @click="startCall">{{ t('joinRoom') }}</ion-button>
                  <ion-button color="danger" :disabled="!call.connected" @click="call.stop">{{ t('end') }}</ion-button>
                </ion-buttons>

                <div class="meta">
                  <div>{{ t('connectionStatus') }}<b :class="{ ok: call.connected }">{{ call.connected ? t('connected') : t('disconnected') }}</b></div>
                  <div v-if="call.selfId">{{ t('myId') }}<b>{{ call.selfId }}</b></div>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col size="12">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ t('video') }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="video-grid">
                  <div class="video-item self">
                    <video id="localVideo" muted playsinline autoplay></video>
                    <div class="label">{{ t('local') }}</div>
                  </div>
                  <div
                    v-for="pid in call.remotePeers"
                    :key="pid"
                    class="video-item remote"
                  >
                    <video :id="`remote-${pid}`" playsinline autoplay></video>
                    <div class="label">{{ t('remote') }}：{{ shortId(pid) }}</div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-modal :is-open="openLogs" @didDismiss="openLogs=false">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ t('logs') }}</ion-title>
            <ion-buttons slot="end"><ion-button @click="openLogs=false">{{ t('close') }}</ion-button></ion-buttons>
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
  IonList, IonLabel, IonModal
} from '@ionic/vue'
import { useCall } from '@/composables/useCall'

const call = useCall()
const openLogs = ref(false)

// Language switch (default English)
const lang = ref<'en' | 'zh'>('en')
const dict: Record<string, Record<string, string>> = {
  en: {
    back: 'Back',
    videoCall: 'Video Call',
    logs: 'Logs',
    roomKeyPair: 'Room Key Pair',
    roomKeyPairSub: 'Used for signature auth and deriving the room identifier (pub)',
    keypairJsonLabel: 'Key Pair (JSON)',
    keypairJsonPlaceholder: '{"pub":"...","epub":"...","priv":"...","epriv":"..."}',
    generateKeypair: 'Generate Key Pair',
    loadKeypair: 'Load Key Pair',
    roomPub: 'Room Pub: ',
    notGenerated: 'Not generated',
    hasPrivateKey: 'Has Private Key: ',
    yes: 'Yes',
    no: 'No',
    signalingDevices: 'Signaling & Devices',
    signalingOriginLabel: 'Signaling Server Origin',
    signalingOriginPlaceholder: 'e.g. https://your-signaling-server',
    save: 'Save',
    refreshIce: 'Refresh ICE',
    microphone: 'Microphone',
    camera: 'Camera',
    enableMic: 'Enable Microphone',
    enableCam: 'Enable Camera',
    enableE2EE: 'End-to-End Encryption',
    joinRoom: 'Join Room',
    end: 'End',
    connectionStatus: 'Connection: ',
    connected: 'Connected',
    disconnected: 'Disconnected',
    myId: 'My ID: ',
    video: 'Video',
    local: 'Local',
    remote: 'Remote',
    close: 'Close',
    helpSignaling: 'Help: Get signaling / self-host'
  },
  zh: {
    back: '返回',
    videoCall: '视频通话',
    logs: '日志',
    roomKeyPair: '房间密钥对',
    roomKeyPairSub: '用于签名认证与生成房间标识（pub）',
    keypairJsonLabel: '密钥对(JSON)',
    keypairJsonPlaceholder: '{"pub":"...","epub":"...","priv":"...","epriv":"..."}',
    generateKeypair: '生成密钥对',
    loadKeypair: '加载密钥对',
    roomPub: '房间 Pub：',
    notGenerated: '未生成',
    hasPrivateKey: '是否包含私钥：',
    yes: '是',
    no: '否',
    signalingDevices: '信令与设备',
    signalingOriginLabel: '信令服务器 Origin',
    signalingOriginPlaceholder: '例如：https://your-signaling-server',
    save: '保存',
    refreshIce: '刷新 ICE',
    microphone: '麦克风',
    camera: '摄像头',
    enableMic: '启用麦克风',
    enableCam: '启用摄像头',
    enableE2EE: '端到端加密',
    joinRoom: '加入房间',
    end: '结束',
    connectionStatus: '连接状态：',
    connected: '已连接',
    disconnected: '未连接',
    myId: '我的 ID：',
    video: '视频',
    local: '本地',
    remote: '远端',
    close: '关闭',
    helpSignaling: '帮助：获取信令/自部署指南'
  }
}
const t = (k: string) => dict[lang.value][k] || k

const relayDocs = 'https://github.com/DeFUCC/gun-vue/tree/main/relay/skin/gun-vue-call-relay'

onMounted(async () => {
  // Auto-load keypair from storage if available, and enumerate devices
  call.loadPair()
  await call.enumerate()
})

function onDeviceChanged(){
  // Only refresh local stream if already present (no auto-permission on entry)
  if (call.localStream) {
    call.getLocalStream()
  }
}

async function startCall(){
  await call.start()
}

function shortId(id: string){
  if (!id) return ''
  return id.slice(0, 4) + '…' + id.slice(-4)
}
</script>

<style scoped>
.video-grid{
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: minmax(120px, auto);
  gap: 10px;
}
.video-item{
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}
.video-item video{
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video-item .label{
  position: absolute;
  left: 8px;
  bottom: 8px;
  background: rgba(0,0,0,.5);
  color: #fff;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
}
.self{
  grid-column: span 2;
  min-height: 180px;
}
.meta{font-size: 12px; opacity: .8; margin-top: 8px;}
.meta .ok{color: var(--ion-color-success)}
.header-row{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>