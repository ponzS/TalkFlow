<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>

         <ion-buttons slot="start">
        <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <IonTitle>Relay Manager</IonTitle>
        <ion-buttons slot="end">
          <IonButton size="small" @click="runAllTests" :disabled="connectedPeers.length === 0">Test All</IonButton>
        </ion-buttons>
      </IonToolbar>
    </IonHeader>
    <IonContent :fullscreen="true">
      <div class="section">
        <h2>Add Relay  <span style="cursor: pointer;"><a href="https://github.com/DeFUCC/gun-vue/tree/main/relay/skin/gun-vue-call-relay" target="_blank"><ion-icon :icon="helpCircleOutline"></ion-icon></a> </span></h2>

       
        <IonItem>
          <IonInput v-model="newRelayUrl" placeholder="Input relay URL"></IonInput>
          <IonButton slot="end" @click="onAddRelay" :disabled="!canAdd">Add</IonButton>
        </IonItem>
      </div>

      <div class="section">
        <h2>Relay List</h2>
        <IonList>
          <IonItemSliding v-for="url in peersList" :key="url">
            <IonItem>
              <div slot="start" class="status-dot" :class="{ connected: connectedPeersSet.has(url) }"></div>
              <IonLabel class="relay-url">
                <div class="url-line" @click.stop="() => runTest(url)">{{ url }}</div>
                <div class="latency-row">
                  <span class="dot">•</span>
                  <span>WS: {{ formatMs(latencyByPeer[url]?.wsMs) }}</span>
                  <span class="dot">•</span>
                  <span>ACK: {{ formatMs(latencyByPeer[url]?.putMs) }}</span>
                </div>
              </IonLabel>
              <IonToggle
                :checked="enabledPeersSet.has(url)"
                @ionChange="(ev) => onToggleEnable(url, !!ev.detail.checked)"
              ></IonToggle>
            </IonItem>
            <IonItemOptions side="end">
              <IonItemOption color="danger" @click="onRemove(url)">
                <IonIcon :icon="trashOutline"></IonIcon>
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
        </IonList>
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonToggle,
  IonButton,
  IonIcon,
  IonInput,
  IonButtons,
  IonBackButton
} from '@ionic/vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gun, peersList, enabledPeers } from '@/composables/useGun'
import { addRelay, removeRelay, setRelayEnabled, createIsolatedGun } from '@/composables/useGun'
import { v4 as uuidv4 } from 'uuid'
import { helpCircleOutline, helpCircleSharp, trashOutline } from 'ionicons/icons'

const newRelayUrl = ref('')
const canAdd = computed(() => {
  const u = newRelayUrl.value.trim()
  return !!u && !peersList.value.includes(u)
})

function onAddRelay() {
  const u = newRelayUrl.value.trim()
  if (!u) return
  addRelay(u)
  // 默认不启用，用户可自行切换；如需默认启用，可取消下一行注释
  // setRelayEnabled(u, true)
  newRelayUrl.value = ''
}

function onToggleEnable(url: string, enabled: boolean) {
  setRelayEnabled(url, enabled)
}

function onRemove(url: string) {
  removeRelay(url)
}

// 计算集合以便快速判断启用状态
const enabledPeersSet = computed(() => new Set(enabledPeers.value))
const connectedPeersSet = computed(() => new Set(connectedPeers.value))

// 根据给定代码获取 gun 当前使用的 relay（已连接的）
const connectedPeers = ref<string[]>([])
let timer: number | undefined

function refreshConnectedPeers() {
  try {
    const opt_peers = (gun as any).back('opt.peers') as Record<string, any>
    const list = Object.entries(opt_peers)
      .filter(([, peer]) => {
        return (
          peer &&
          peer.wire &&
          peer.wire.readyState === 1 &&
          peer.wire.OPEN === 1 &&
          peer.wire.constructor?.name === 'WebSocket'
        )
      })
      .map(([url]) => url)
    connectedPeers.value = list
  } catch {
    connectedPeers.value = []
  }
}

onMounted(() => {
  refreshConnectedPeers()
  timer = window.setInterval(refreshConnectedPeers, 1500)

  runAllTests()
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

// —— 延迟测速 ——
type Latency = { wsMs?: number; putMs?: number; ts?: number }
const latencyByPeer = ref<Record<string, Latency>>({})

function formatMs(ms?: number): string {
  if (ms === undefined) return '-'
  if (!isFinite(ms)) return '∞'
  return `${Math.round(ms)} ms`
}

function toWSUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.protocol === 'http:') u.protocol = 'ws:'
    if (u.protocol === 'https:') u.protocol = 'wss:'
    return u.toString()
  } catch {
    return url
  }
}

function testWS(url: string): Promise<number> {
  return new Promise((resolve) => {
    const wsUrl = toWSUrl(url)
    const start = performance.now()
    let settled = false
    try {
      const ws = new WebSocket(wsUrl)
      const done = (ms: number) => {
        if (settled) return
        settled = true
        try { ws.close() } catch {}
        resolve(ms)
      }
      ws.onopen = () => done(performance.now() - start)
      ws.onerror = () => done(Infinity)
      ws.onclose = () => done(performance.now() - start)
      // 超时保护：5s
      setTimeout(() => done(Infinity), 5000)
    } catch {
      resolve(Infinity)
    }
  })
}

function testGunPutAck(url: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const g = createIsolatedGun([url])
      const start = performance.now()
      const key = uuidv4()
      // 使用独立的根键，避免与已有节点类型冲突
      g.get(`tf-relay-ping-${key}`).put({ t: Date.now(), k: key }, (ack: any) => {
        if (ack?.err) return resolve(Infinity)
        resolve(performance.now() - start)
      })
      // 超时保护：5s
      setTimeout(() => resolve(Infinity), 5000)
    } catch {
      resolve(Infinity)
    }
  })
}

async function runTest(url: string) {
  const wsMs = await testWS(url)
  const putMs = await testGunPutAck(url)
  latencyByPeer.value[url] = { wsMs, putMs, ts: Date.now() }
}

async function runAllTests() {
  for (const url of peersList.value) {
    await runTest(url)
  }
}
</script>

<style scoped>
.section {
  padding: 12px;
}
h2 {
  margin: 8px 0 12px;
  font-size: 16px;
  font-weight: 600;
}
.relay-url {
  font-size: 14px;
}
.url-line {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.latency-row {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ion-text-color-step-600);
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
  white-space: nowrap;

}
.dot { opacity: 0.6; }

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9e9e9e; /* 默认灰色 */
  margin-right: 8px;
}
.status-dot.connected {
  background: #2dd36f; /* Ionic 绿色 */
}
</style>