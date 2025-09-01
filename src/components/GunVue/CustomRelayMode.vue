<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { 
  IonIcon,
  IonButton,
  IonToggle
} from '@ionic/vue';
import { addCircleSharp, searchSharp, trashOutline } from 'ionicons/icons';
// import { recreateGunWithPeers } from '@/composables/useGun';
import { createIsolatedGun, destroyGunInstance } from '@/composables/useGun';

interface GroupInfo {
  id: string;
  name: string;
  enabled: boolean;
}

const props = defineProps<{ group: GroupInfo }>();
const emit = defineEmits<{
  (e: 'rename', id: string, name: string): void;
  (e: 'toggleEnabled', id: string, enabled: boolean): void;
  (e: 'delete', id: string): void;
  (e: 'stats', id: string, enabledCount: number, totalCount: number): void;
}>();

const prefix = computed(() => `gun_group_${props.group.id}`);

function getFromLocalStorage<T>(key: string, def: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
}
function setToLocalStorage<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// 读取全局（默认主网络）启用的节点，用于与本群组状态对齐
function getGlobalEnabledPeers(): string[] {
  try {
    // 仅读取明确的全局启用列表；若不存在则返回空，避免把“全部节点列表”当成启用集
    const s = localStorage.getItem('gun_enabled_peers');
    const parsed = s ? JSON.parse(s) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

const peersList = ref<string[]>([]);
const enabledPeers = ref<string[]>([]);
const peersNotes = ref<Record<string, string>>({});

const peerLatencies = ref<Record<string, number | null>>({});
const peerStatuses = ref<Record<string, 'checking' | 'connected' | 'disconnected'>>({});
const testingPeers = ref<string[]>([]);
const isTestingAllSpeeds = ref(false);
const isInitialSpeedTest = ref(false);

const newPeerUrl = ref('');
const searchQuery = ref('');

// 独立 Gun 实例（仅在本群组启用时维持）
const groupGun = ref<any>(null);

function loadPeersFromStorage() {
  const list = getFromLocalStorage<string[]>(`${prefix.value}_peers_list`, []);
  const data = getFromLocalStorage<Record<string, { is_enabled: boolean; note: string }>>(`${prefix.value}_peers_data`, {});
  // 不再默认启用全部，缺省为空，由全局启用集来对齐
  const enabledKey = `${prefix.value}_enabled_peers`;
  const hasEnabledKey = !!localStorage.getItem(enabledKey);
  const enabled = getFromLocalStorage<string[]>(enabledKey, []);

  peersList.value = Array.from(new Set([ ...list, ...Object.keys(data) ]));
  const notes: Record<string,string> = {};
  for (const [peer, d] of Object.entries(data)) { notes[peer] = (d as any).note || ''; }
  peersNotes.value = notes;

  enabledPeers.value = Array.isArray(enabled)
    ? enabled.filter(p => peersList.value.includes(p))
    : [];

  // 与全局启用集对齐：若全局未启用某URL，则本群组也不启用；
  // 若本群组尚无本地启用记录，则采用“全局启用 ∩ 本群组列表”作为初始启用集
  const globalEnabled = getGlobalEnabledPeers();
  if (globalEnabled.length) {
    const gset = new Set(globalEnabled);
    if (enabledPeers.value.length) {
      enabledPeers.value = enabledPeers.value.filter(p => gset.has(p));
    } else {
      enabledPeers.value = peersList.value.filter(p => gset.has(p));
    }
  }

  for (const p of enabledPeers.value) { if (!(p in peerLatencies.value)) peerLatencies.value[p] = null; }

  // 首次加载时若没有本地启用键，立刻持久化一次，避免刷新后再次回退
  if (!hasEnabledKey) {
    persistPeers();
  }
}

function persistPeers() {
  setToLocalStorage(`${prefix.value}_peers_list`, peersList.value);
  // 关键修复：完全以当前 peersList 重建 peers_data，防止被删除的 peer 通过旧数据回流
  const newData: Record<string, { is_enabled: boolean; note: string }> = {};
  for (const p of peersList.value) {
    newData[p] = {
      is_enabled: enabledPeers.value.includes(p),
      note: peersNotes.value[p] || ''
    };
  }
  setToLocalStorage(`${prefix.value}_peers_data`, newData);
  setToLocalStorage(`${prefix.value}_enabled_peers`, enabledPeers.value);
  // emit stats to parent
  emit('stats', props.group.id, enabledPeers.value.length, peersList.value.length);
}

// 确保独立 Gun 实例与当前启用状态/节点一致
function ensureGroupGun() {
  const shouldEnable = !!props.group.enabled && enabledPeers.value.length > 0;
  if (shouldEnable) {
    if (!groupGun.value) {
      groupGun.value = createIsolatedGun(enabledPeers.value);
      // 可选：暴露到 window 便于调试
      if (typeof window !== 'undefined') {
        (window as any)[`gun_group_${props.group.id}`] = groupGun.value;
      }
    } else {
      try { groupGun.value.opt({ peers: enabledPeers.value }); } catch {}
    }
  } else {
    if (groupGun.value) {
      destroyGunInstance(groupGun.value);
      groupGun.value = null;
      if (typeof window !== 'undefined') {
        try { delete (window as any)[`gun_group_${props.group.id}`]; } catch {}
      }
    }
  }
}

onMounted(async () => {
  loadPeersFromStorage();
  // 初始化所有已启用节点的延迟状态
  enabledPeers.value.forEach(peer => {
    if (!(peer in peerLatencies.value)) {
      peerLatencies.value[peer] = null;
    }
  });
  // 初始同步一次统计
  emit('stats', props.group.id, enabledPeers.value.length, peersList.value.length);
  ensureGroupGun();
  await performInitialSpeedTest();
});

onUnmounted(() => {
  if (groupGun.value) {
    destroyGunInstance(groupGun.value);
    groupGun.value = null;
    if (typeof window !== 'undefined') {
      try { delete (window as any)[`gun_group_${props.group.id}`]; } catch {}
    }
  }
});

watch([peersList, enabledPeers, peersNotes], () => {
  persistPeers();
}, { deep: true });

// 仅允许 http/https 的绝对URL
function isAbsoluteHttpUrl(u: string) {
  return /^https?:\/\//i.test(u.trim());
}

// Gun.js连接测试函数 - 使用多种方法测试连接
async function pingTest(peer: string): Promise<{ success: boolean; latency?: number; error?: string }> {
  const startTime = performance.now();
  
  try {
    if (!isAbsoluteHttpUrl(peer)) {
      return { success: false, error: 'Invalid URL' };
    }

    let testUrl: URL;
    try {
      testUrl = new URL(peer);
    } catch {
      return { success: false, error: 'Invalid URL' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 增加超时时间
    
    // 方法1: 尝试GET请求根路径（Gun.js通常在根路径提供服务）
    try {
      const rootResponse = await fetch(testUrl.origin, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      const latency = Math.round(performance.now() - startTime);
      clearTimeout(timeoutId);
      
      // 只接受真正成功的响应状态码
      if (rootResponse.status >= 200 && rootResponse.status < 400) {
        return { success: true, latency };
      }
    } catch (rootError) {
      // 如果根路径失败，尝试其他路径
    }
    
    // 方法2: 尝试/gun路径
    const gunUrl = new URL(testUrl.origin);
    gunUrl.pathname = '/gun';
    
    try {
      const gunResponse = await fetch(gunUrl.href, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      const latency = Math.round(performance.now() - startTime);
      clearTimeout(timeoutId);
      
      // 只接受真正成功的响应状态码
      if (gunResponse.status >= 200 && gunResponse.status < 400) {
        return { success: true, latency };
      }
    } catch (gunError) {
   
    }
    
    // 如果前面的方法都失败了，直接返回失败
    clearTimeout(timeoutId);
    return { success: false, error: 'All connection methods failed' };
    
  } catch (error: any) {
    return { success: false, error: `Ping test error: ${error?.message}` };
  }
}

// 与 RelayMode.vue 行为一致的单节点测试
async function testPeerLatency(peer: string, isInitialTest = false): Promise<number | null> {
  if (testingPeers.value.includes(peer)) return null;
  testingPeers.value.push(peer);
  peerStatuses.value[peer] = 'checking';
  try {
    const res = await pingTest(peer);
    if (!res.success) {
      peerLatencies.value[peer] = null;
      peerStatuses.value[peer] = 'disconnected';
      return null;
    }
    const latency = res.latency!;
    peerLatencies.value[peer] = latency;
    peerStatuses.value[peer] = 'connected';
    return latency;
  } catch {
    peerLatencies.value[peer] = null;
    peerStatuses.value[peer] = 'disconnected';
    return null;
  } finally {
    testingPeers.value = testingPeers.value.filter(p => p !== peer);
  }
}

// 初始自动测速（仅测试已启用节点）
async function performInitialSpeedTest() {
  if (enabledPeers.value.length === 0) return;
  isInitialSpeedTest.value = true;
  try {
    await new Promise(r => setTimeout(r, 500));
    const maxConcurrent = 1000;
    for (let i = 0; i < enabledPeers.value.length; i += maxConcurrent) {
      const batch = enabledPeers.value.slice(i, i + maxConcurrent);
      await Promise.all(batch.map(peer => testPeerLatency(peer, true)));
      if (i + maxConcurrent < enabledPeers.value.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
  } finally {
    isInitialSpeedTest.value = false;
  }
}

// 监听节点列表变化，清理已删除节点的延迟状态
watch(peersList, (newPeers, oldPeers = []) => {
  oldPeers.forEach(peer => {
    if (!newPeers.includes(peer)) {
      delete peerLatencies.value[peer];
      delete peerStatuses.value[peer];
    }
  });
}, { deep: true, immediate: true });

// 监听启用节点变化，为新启用节点初始化并触发测速，同时调整独立实例
watch(enabledPeers, (newEnabled, oldEnabled = []) => {
  newEnabled.forEach(peer => {
    if (!(peer in peerLatencies.value)) peerLatencies.value[peer] = null;
  });
  oldEnabled.forEach(peer => {
    if (!newEnabled.includes(peer)) {
      delete peerLatencies.value[peer];
      delete peerStatuses.value[peer];
    }
  });
  ensureGroupGun();
  if (oldEnabled.length === 0 && newEnabled.length > 0 && !isInitialSpeedTest.value) {
    const hasAnyLatency = newEnabled.some(p => peerLatencies.value[p] != null);
    if (!hasAnyLatency) setTimeout(() => { performInitialSpeedTest(); }, 1000);
  }
}, { deep: true, immediate: true });

// 监听启用开关（来自父组件）变化，保持独立实例状态
watch(() => props.group.enabled, () => {
  ensureGroupGun();
});

// Test all enabled peers
async function testAllPeersLatency() {
  if (isTestingAllSpeeds.value || isInitialSpeedTest.value) return;
  if (enabledPeers.value.length === 0) return;
  isTestingAllSpeeds.value = true;
  try {
    const maxConcurrent = 1000;
    const peers = [...enabledPeers.value];
    for (let i = 0; i < peers.length; i += maxConcurrent) {
      const batch = peers.slice(i, i + maxConcurrent);
      await Promise.all(batch.map(peer => testPeerLatency(peer, false)));
      if (i + maxConcurrent < peers.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
  } finally {
    isTestingAllSpeeds.value = false;
  }
}

// 添加/删除/切换节点
function addPeer(url: string) {
  const u = (url || '').trim();
  if (!u) return;
  if (!isAbsoluteHttpUrl(u)) return;
  if (peersList.value.includes(u)) return;
  peersList.value.push(u);
  if (!enabledPeers.value.includes(u) && enabledPeers.value.length < 1000) {
    enabledPeers.value.push(u);
  }
  newPeerUrl.value = '';
  ensureGroupGun();
  persistPeers();
}

function removePeer(peer: string) {
  peersList.value = peersList.value.filter(p => p !== peer);
  enabledPeers.value = enabledPeers.value.filter(p => p !== peer);
  const { [peer]: _, ...rest } = peersNotes.value; peersNotes.value = rest;
  const { [peer]: __, ...restLat } = peerLatencies.value; peerLatencies.value = restLat;
  const { [peer]: ___, ...restStatus } = peerStatuses.value; peerStatuses.value = restStatus as any;
  ensureGroupGun();
  // 立即持久化，避免刷新前未触发 watch 导致数据回流
  persistPeers();
}

function togglePeer(peer: string) {
  if (enabledPeers.value.includes(peer)) {
    enabledPeers.value = enabledPeers.value.filter(p => p !== peer);
  } else {
    if (enabledPeers.value.length < 1000) enabledPeers.value.push(peer);
  }
  ensureGroupGun();
  persistPeers();
}

// 响应启用开关，交由父组件存储启用状态，但本组件负责实例生命周期
function onToggleEnabled(val: boolean) {
  emit('toggleEnabled', props.group.id, val);
  // 立即根据开关值调整独立实例，避免等待父组件回传导致的滞后
  const shouldEnable = !!val && enabledPeers.value.length > 0;
  if (shouldEnable) {
    if (!groupGun.value) {
      groupGun.value = createIsolatedGun(enabledPeers.value);
      if (typeof window !== 'undefined') { (window as any)[`gun_group_${props.group.id}`] = groupGun.value; }
    } else {
      try { groupGun.value.opt({ peers: enabledPeers.value }); } catch {}
    }
  } else {
    if (groupGun.value) {
      destroyGunInstance(groupGun.value);
      groupGun.value = null;
      if (typeof window !== 'undefined') { try { delete (window as any)[`gun_group_${props.group.id}`]; } catch {} }
    }
  }
}
function onToggleChange(ev: CustomEvent) {
  const checked = (ev.detail as any)?.checked ?? false;
  onToggleEnabled(!!checked);
}

const filteredPeers = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return peersList.value.filter(p => p.toLowerCase().includes(q) || (peersNotes.value[p] || '').toLowerCase().includes(q));
});

// 显示与样式与 RelayMode.vue 一致
function getLatencyText(peer: string): string {
  if (testingPeers.value.includes(peer)) return 'Testing';
  const latency = peerLatencies.value[peer];
  if (latency == null) {
    const st = peerStatuses.value[peer];
    if (st === 'disconnected') return 'Connection Failed';
    if (st === 'checking') return 'Checking';
    return 'Not Tested';
  }
  return `${(latency / 1000).toFixed(2)}s`;
}
function getLatencyClass(peer: string): string {
  if (testingPeers.value.includes(peer)) return 'latency-testing';
  const latency = peerLatencies.value[peer];
  if (latency == null) {
    const st = peerStatuses.value[peer];
    if (st === 'disconnected') return 'latency-poor';
    if (st === 'checking') return 'latency-testing';
    return 'latency-unknown';
  }
  if (latency < 500) return 'latency-excellent';
  if (latency < 1500) return 'latency-good';
  if (latency < 3000) return 'latency-fair';
  return 'latency-poor';
}
</script>

<template>
  <div class="custom-relay">
  

 
    <div class="sticky-toolbar">
      <div class="toolbar-content">
        <div class="add-section">
          <input 
            v-model="newPeerUrl"
            :placeholder="'Enter relay URL'"
            class="url-input"
            @keyup.enter="addPeer(newPeerUrl)"
          />
          <button 
            class="add-btn"
            @click="addPeer(newPeerUrl)"
          >
            <ion-icon :icon="addCircleSharp" />
          </button>
        </div>
        
        <div class="search-section">
          <div class="search-wrapper">
            <ion-icon :icon="searchSharp" class="search-icon" />
            <input 
              v-model="searchQuery"
              :placeholder="'Search relays or notes'"
              class="search-input"
            />
          </div>
        </div>

        <div class="actions">
          <ion-button size="small" fill="outline" color="danger" @click="emit('delete', group.id)">
            <ion-icon :icon="trashOutline" />
          </ion-button>
          <div class="row-spacer"></div>
          <label class="enabled-inline">
            <span class="enabled-text">Enabled</span>
            <ion-toggle :checked="group.enabled" @ionChange="onToggleChange" />
          </label>
          <ion-button size="small" fill="outline" :disabled="isTestingAllSpeeds" @click="testAllPeersLatency">
            {{ isTestingAllSpeeds ? 'Testing...' : 'Test All' }}
          </ion-button>
        </div>
      </div>
    </div>

    <div class="peers">
      <div v-for="peer in filteredPeers" :key="peer" class="peer-row">
        <div class="line url-line">
          <span class="url">{{ peer }}</span>
        </div>
        <div class="line note-line">
          <input class="note" v-model="peersNotes[peer]" placeholder="note" />
        </div>
        <div class="line controls-line">
          <label class="enable">
            <input type="checkbox" :checked="enabledPeers.includes(peer)" @change="togglePeer(peer)" />
            <span class="enable-text">{{ enabledPeers.includes(peer) ? 'Enabled' : 'Disabled' }}</span>
          </label>
          <span class="latency" :class="getLatencyClass(peer)">
            {{ getLatencyText(peer) }}
          </span>
          <div class="spacer"></div>
          <ion-button size="small" fill="outline" @click="testPeerLatency(peer)">Test</ion-button>
          <ion-button size="small" fill="outline" color="danger" @click="removePeer(peer)">Remove</ion-button>
        </div>
      </div>
      <div v-if="filteredPeers.length === 0" class="empty">No peers. Add one above.</div>
    </div>
  </div>
</template>

<style scoped>
.custom-relay { display: flex; flex-direction: column; gap: 12px; }

/* Sticky toolbar styles copied from RelayMode.vue for consistency */
.sticky-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 8px;
  background: rgba(130, 130, 130, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(130, 130, 130, 0.2);
}

.toolbar-content { display: flex; gap: 8px; align-items: stretch; flex-wrap: wrap; }
/* 移除原先单独靠左的删除按钮容器 */
.actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.actions .row-spacer { flex: 1; }
.add-section { flex: 1; display: flex; gap: 8px; }
.url-input {
  flex: 1;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: rgba(150, 150, 150, 0.2);
  font-size: 13px;
  transition: all 0.2s ease;
  outline: none;
}
.url-input:hover,
.url-input:focus {
  background: rgba(150, 150, 150, 0.25);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(102, 204, 255, 0.8), rgba(102, 204, 255, 0.9));
  color: #1e40af;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.add-btn:hover {
  background: linear-gradient(135deg, rgba(102, 204, 255, 0.9), rgba(102, 204, 255, 1));
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 204, 255, 0.3);
}
.add-btn:active { transform: translateY(0); box-shadow: 0 1px 4px rgba(102, 204, 255, 0.2); }

.search-section { flex: 1; }
.search-wrapper { position: relative; width: 100%; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #777; font-size: 16px; }
.search-input {
  width: 100%;
  padding: 8px 10px 8px 30px;
  border: none;
  border-radius: 8px;
  background: rgba(150, 150, 150, 0.2);
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}
.search-input:hover,
.search-input:focus {
  background: rgba(150, 150, 150, 0.25);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.enabled-inline { display: inline-flex; align-items: center; gap: 6px; }
.enabled-text { font-size: 12px; color: var(--ion-color-medium); }

/* Mobile: stack rows so URL input occupies one line, search occupies one line */
@media (max-width: 640px) {
  .toolbar-content { flex-direction: column; }
  .actions-left, .add-section, .search-section, .actions { width: 100%; }
  .actions { justify-content: space-between; }
}

/* Keep existing peers list styles */
.peers { display: flex; flex-direction: column; gap: 8px; }
.peer-row { display: flex; flex-direction: column; align-items: stretch; gap: 6px; padding: 10px; border: 1px solid var(--ion-color-light); border-radius: 8px; }
.peer-row .line { display: flex; align-items: center; gap: 8px; width: 100%; }
.url-line .url { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; word-break: break-word; }
.note-line .note { padding: 6px 8px; border: 1px solid var(--ion-color-light); border-radius: 6px; width: 100%; }
.controls-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.controls-line .enable { display: inline-flex; align-items: center; gap: 6px; }
.controls-line .enable-text { font-size: 12px; color: var(--ion-color-medium); }
.controls-line .spacer { flex: 1; }
.latency { min-width: 90px; text-align: right; font-size: 12px; }
.latency-excellent { color: var(--ion-color-success); }
.latency-good { color: #c6a700; }
.latency-fair { color: #ff8f00; }
.latency-poor { color: var(--ion-color-danger); }
.latency-testing { color: var(--ion-color-medium); }
.latency-unknown { color: var(--ion-color-medium); }
</style>