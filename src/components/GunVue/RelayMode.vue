<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import { 
  IonIcon, 
  IonButton,
  IonToggle
} from '@ionic/vue';
import { addCircleSharp, searchSharp, trashOutline, speedometerOutline } from 'ionicons/icons';
import StorageService from '@/services/storageService';
import { getCurrentInstance } from 'vue';
import { createIsolatedGun, destroyGunInstance } from '@/composables/useGun';


const { t } = useI18n();

const appInstance = getCurrentInstance();
const storageServ = appInstance?.appContext.config.globalProperties.$storageServ as StorageService;

const {
  networkStatus,
  peersStatus,
  currentMode,
  peerStatuses,
  peersList,
  enabledPeers,
  addPeer,
  removePeer,
  enablePeer,
  disablePeer,
  peersNotes,
  savePeerNote,
} = useNetworkStatus(storageServ);

const newPeerUrl = ref('');
const searchQuery = ref('');
const notes = ref<Record<string, string>>({});

// 测速相关的状态
const peerLatencies = ref<Record<string, number | null>>({});
const testingPeers = ref<string[]>([]);
const isTestingAllSpeeds = ref(false);
const isInitialSpeedTest = ref(false);

// 接收父组件传入的主网络启用状态，并提供切换事件
const props = defineProps<{ enabled: boolean }>();

// 向父组件回传统计信息与启用切换
const emit = defineEmits<{
  (e: 'stats', id: string, enabledCount: number, totalCount: number): void;
  (e: 'toggleMainEnabled', enabled: boolean): void;
}>();
function emitStats() {
  try { emit('stats', 'main', enabledPeers.value.length, peersList.value.length); } catch {}
}
function onToggleMainChange(ev: CustomEvent) {
  const checked = (ev.detail as any)?.checked ?? false;
  emit('toggleMainEnabled', !!checked);
}

// 当启用集合或列表发生变化时，回传统计
watch([enabledPeers, peersList], () => { emitStats(); }, { deep: true });

onMounted(async () => {
  try {
    const savedNotes = localStorage.getItem('relayNotes');
    if (savedNotes) {
      const notes = JSON.parse(savedNotes);
      for (const [peer, note] of Object.entries(notes)) {
        await savePeerNote(peer as string, note as string);
      }
      localStorage.removeItem('relayNotes'); // 迁移后删除
    }
  } catch (e) {
    // Failed to migrate relay notes
  }
  
  // 初始化本地notes，同步peersNotes的数据
  for (const [peer, note] of Object.entries(peersNotes.value)) {
    notes.value[peer] = note || '';
  }
  
  // 等待节点列表加载完成
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 初始化所有已启用节点的延迟状态
  enabledPeers.value.forEach(peer => {
    if (!(peer in peerLatencies.value)) {
      peerLatencies.value[peer] = null;
    }
  });
  
  // 初次回传一次统计
  emitStats();
  
  // 自动进行初始测速
  await performInitialSpeedTest();
});

// 执行初始自动测速 - 只测试已启用的节点
async function performInitialSpeedTest() {
  if (enabledPeers.value.length === 0) {
    return;
  }
  
  isInitialSpeedTest.value = true;
  
  try {
    // 延迟500ms让界面先渲染完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 使用保守的策略避免过载
    const maxConcurrent = 1000;
    
    for (let i = 0; i < enabledPeers.value.length; i += maxConcurrent) {
      const batch = enabledPeers.value.slice(i, i + maxConcurrent);
      
      const results = await Promise.all(
        batch.map(async peer => {
          const result = await testPeerLatency(peer, true);
          return { peer, result };
        })
      );
      
      // Gun.js支持大量并行，减少批次间延迟
      if (i + maxConcurrent < enabledPeers.value.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (err) {
    // Initial speed test failed
  } finally {
    isInitialSpeedTest.value = false;
  }
}

watch(peersNotes, async (newNotes) => {
  // 同步peersNotes到本地notes
  for (const [peer, note] of Object.entries(newNotes)) {
    notes.value[peer] = note || '';
  }
}, { deep: true });

// 防抖保存函数
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// 监听本地notes变化，防抖保存
watch(notes, async (newNotes) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(async () => {
    for (const [peer, note] of Object.entries(newNotes)) {
      if (note !== undefined && note !== peersNotes.value[peer]) {
        await savePeerNote(peer, note.trim());
      }
    }
  }, 500); // 500ms防抖延迟
}, { deep: true });

// 监听节点列表变化，更新延迟状态
watch(peersList, (newPeers, oldPeers = []) => {
  // 清理已删除节点的延迟状态
  oldPeers.forEach(peer => {
    if (!newPeers.includes(peer)) {
      delete peerLatencies.value[peer];
    }
  });
}, { deep: true, immediate: true });

// 监听启用节点变化，为新启用的节点初始化延迟状态并触发测速
watch(enabledPeers, (newEnabledPeers, oldEnabledPeers = []) => {
  // 为新启用的节点初始化延迟状态
  newEnabledPeers.forEach(peer => {
    if (!(peer in peerLatencies.value)) {
      peerLatencies.value[peer] = null;
    }
  });
  
  // 清理不再启用节点的延迟状态
  oldEnabledPeers.forEach(peer => {
    if (!newEnabledPeers.includes(peer)) {
      delete peerLatencies.value[peer];
    }
  });
  
  // 如果是第一次加载启用节点且之前没有进行过初始测速，则自动测速
  if (oldEnabledPeers.length === 0 && newEnabledPeers.length > 0 && !isInitialSpeedTest.value) {
    const hasAnyLatencyData = newEnabledPeers.some(peer => peerLatencies.value[peer] !== null);
    if (!hasAnyLatencyData) {
      setTimeout(() => {
        performInitialSpeedTest();
      }, 1000);
    }
  }
}, { deep: true, immediate: true });

// Gun.js连接测试函数 - 使用多种方法测试连接
async function pingTest(peer: string): Promise<{ success: boolean; latency?: number; error?: string }> {
  const startTime = performance.now();
  
  try {
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
      // 继续尝试其他方法
    }
    
    // 如果前面的方法都失败了，直接返回失败
    clearTimeout(timeoutId);
    return { success: false, error: 'All connection methods failed' };
    
  } catch (error: any) {
    return { success: false, error: `Ping test error: ${error?.message}` };
  }
}

// 当传统 ping 失败时，进行一次 Gun 操作作为回退：对远端进行一次 put 并等待 ack
/*
async function gunFallbackLatency(peer: string, timeoutMs = 6000): Promise<{ success: boolean; latency?: number; error?: string }> {
  // removed
}
*/

// 测试单个节点的连接延迟 - 先ping测试，再Gun.js连接检测
async function testPeerLatency(peer: string, isInitialTest = false): Promise<number | null> {
  if (testingPeers.value.includes(peer)) {
    return null;
  }
  
  testingPeers.value.push(peer);
  // 设置节点状态为检查中
  peerStatuses.value[peer] = 'checking';
  
  try {
    // 仅使用 HEAD /gun 的 HTTP 测速，不再进行任何 Gun 操作回退，避免额外连接
    const pingResult = await pingTest(peer);
    if (!pingResult.success) {
      peerLatencies.value[peer] = null;
      peerStatuses.value[peer] = 'disconnected';
      return null;
    }

    // Ping测试成功，直接返回ping延迟
    const pingLatency = pingResult.latency!;
    peerLatencies.value[peer] = pingLatency;
    // 更新节点状态为已连接
    peerStatuses.value[peer] = 'connected';
    return pingLatency;
  } catch (err) {
    peerLatencies.value[peer] = null;
    return null;
  } finally {
    testingPeers.value = testingPeers.value.filter(p => p !== peer);
  }
}

// 测试所有已启用节点的延迟
async function testAllPeersLatency() {
  if (isTestingAllSpeeds.value || isInitialSpeedTest.value) {
    return;
  }
  
  if (enabledPeers.value.length === 0) {
    return;
  }
  
  isTestingAllSpeeds.value = true;
  
  try {
    // 并行测试所有已启用节点，Gun.js支持大量并行同步
    const maxConcurrent = 1000;
    const peers = [...enabledPeers.value];
    
    for (let i = 0; i < peers.length; i += maxConcurrent) {
      const batch = peers.slice(i, i + maxConcurrent);
      
      const results = await Promise.all(
        batch.map(async peer => {
          const result = await testPeerLatency(peer, false); // 明确标记为手动测试
          return { peer, result };
        })
      );
      
      // Gun.js支持大量并行，减少批次间延迟
      if (i + maxConcurrent < peers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (err) {
    // Test all peers latency failed
  } finally {
    isTestingAllSpeeds.value = false;
  }
}

// 获取延迟显示文本
function getLatencyText(peer: string): string {
  if (testingPeers.value.includes(peer)) {
    return t('testingLatency');
  }
  
  const latency = peerLatencies.value[peer];
  if (latency === null || latency === undefined) {
    // 如果没有延迟数据，检查连接状态
    if (peerStatuses.value[peer] === 'disconnected') {
      return t('connectionFailed');
    } else if (peerStatuses.value[peer] === 'checking') {
      return t('checking');
    }
    return t('notTested');
  }
  
  // 将毫秒转换为秒，保留2位小数
  const latencyInSeconds = (latency / 1000).toFixed(2);
  return `${latencyInSeconds}s`;
}

// 获取延迟状态的CSS类
function getLatencyClass(peer: string): string {
  if (testingPeers.value.includes(peer)) {
    return 'latency-testing';
  }
  
  const latency = peerLatencies.value[peer];
  if (latency === null || latency === undefined) {
    // 如果没有延迟数据，根据连接状态决定样式
    if (peerStatuses.value[peer] === 'disconnected') {
      return 'latency-poor'; // 红色：连接失败
    } else if (peerStatuses.value[peer] === 'checking') {
      return 'latency-testing'; // 测试中
    }
    return 'latency-unknown'; // 灰色：未知状态
  }
  
  // 根据延迟值分级：<500ms优秀，500-1500ms良好，1500-3000ms一般，>3000ms差
  if (latency < 500) {
    return 'latency-excellent'; // 绿色：小于0.5秒
  } else if (latency < 1500) {
    return 'latency-good'; // 黄色：0.5-1.5秒
  } else if (latency < 3000) {
    return 'latency-fair'; // 橙色：1.5-3秒
  } else {
    return 'latency-poor'; // 红色：3秒以上
  }
}

// 节点列表过滤（仅搜索过滤，不需要按延迟排序因为是并行连接）
const filteredPeers = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return peersList.value.filter(p => p.toLowerCase().includes(q) || (peersNotes.value[p] || '').toLowerCase().includes(q));
});

// 切换节点启用状态
const togglePeer = (peer: string) => {
  if (enabledPeers.value.includes(peer)) {
    disablePeer(peer);
  } else {
    enablePeer(peer);
  }
};

// 手动保存指定节点的note
const saveNote = async (peer: string) => {
  if (notes.value[peer] !== undefined) {
    const note = notes.value[peer].trim();
    await savePeerNote(peer, note);
  }
};

// 计算显示的启用节点信息
const enabledPeersDisplay = computed(() => {
  if (enabledPeers.value.length === 0) {
    return t('noNodeSelected');
  } else if (enabledPeers.value.length === 1) {
    return enabledPeers.value[0];
  } else {
    return `${enabledPeers.value.length} ${t('nodesEnabled')}`;
  }
});

// 获取启用节点的延迟信息
const enabledPeersLatency = computed(() => {
  if (enabledPeers.value.length === 0) return '';
  if (enabledPeers.value.length === 1) {
    return getLatencyText(enabledPeers.value[0]);
  }
  const latencies = enabledPeers.value
    .map(peer => peerLatencies.value[peer])
    .filter(latency => latency !== undefined && latency !== null);
  if (latencies.length === 0) return '';
  const avgLatency = Math.round(latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length);
  // 将毫秒转换为秒，保留2位小数
  const avgLatencyInSeconds = (avgLatency / 1000).toFixed(2);
  return `${avgLatencyInSeconds}s (avg)`;
});

// 获取启用节点的延迟样式
const enabledPeersLatencyClass = computed(() => {
  if (enabledPeers.value.length === 0) return '';
  if (enabledPeers.value.length === 1) {
    return getLatencyClass(enabledPeers.value[0]);
  }
  const latencies = enabledPeers.value
    .map(peer => peerLatencies.value[peer])
    .filter(latency => latency !== undefined && latency !== null);
  if (latencies.length === 0) return '';
  const avgLatency = Math.round(latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length);
  
  // 使用与单个节点相同的分级标准
  if (avgLatency < 1000) return 'latency-excellent';
  if (avgLatency < 2000) return 'latency-good';
  if (avgLatency < 3000) return 'latency-fair';
  return 'latency-poor';
});

</script>

<template>

    <!-- 紧凑的顶部信息区域 -->
    <div class="header-compact">
      <div class="title-row">
        <h2 class="page-title">Gun Database</h2>
        <div class="connection-status" :class="networkStatus">
          
          <div class="status-dot"></div>
          <span>{{ networkStatus === 'online' ? t('online') : t('offline') }}</span>
        </div>
      </div>
      
      <!-- <div class="info-row">
        <div class="current-node-info">
          <span class="label">{{ t('enabledNodes') }}</span>
          <span class="node-url-compact">{{ enabledPeersDisplay }}</span>
        </div>
        
        <div class="node-status-compact">
          <span v-if="enabledPeers" class="latency-compact" :class="enabledPeersLatencyClass">
            {{ enabledPeersLatency }}
          </span>
        </div>
      </div> -->
      
      <div class="actions-row">
        <div v-if="isInitialSpeedTest" class="testing-status">
          <div class="spinner"></div>
          <span>{{ t('initialSpeedTesting') }}</span>
        </div>
        <!-- Removed test-all button from header to align with CustomRelayMode toolbar -->
      </div>
    </div>

    <!-- 吸附工具栏 -->
    <div class="sticky-toolbar">
      <div class="toolbar-content">
        <div class="add-section">
          <input 
            v-model="newPeerUrl" 
            :placeholder="t('enterRelayURL')"
            class="url-input"
            @keyup.enter="addPeer(newPeerUrl); newPeerUrl = ''"
          />
          <button 
            class="add-btn"
            @click="addPeer(newPeerUrl); newPeerUrl = ''"
          >
            <ion-icon :icon="addCircleSharp" />
          </button>
        </div>
        
        <div class="search-section">
          <div class="search-wrapper">
            <ion-icon :icon="searchSharp" class="search-icon" />
            <input 
              v-model="searchQuery" 
              :placeholder="t('searchRelays')" 
              class="search-input"
            />
          </div>
        </div>

        <!-- <div class="actions">
          <label class="enabled-inline">
            <span class="enabled-text">Enabled</span>
            <ion-toggle :checked="props.enabled" @ionChange="onToggleMainChange" />
          </label>
          <ion-button size="small" fill="outline" :disabled="isTestingAllSpeeds" @click="testAllPeersLatency">
            {{ isTestingAllSpeeds ? t('testing') : t('testAllSpeed') }}
          </ion-button>
        </div> -->
      </div>
    </div>

    <div class="peers">
      <div v-for="peer in filteredPeers" :key="peer" class="peer-row">
        <div class="line url-line">
          <span class="url">{{ peer }}</span>
        </div>
        <div class="line note-line">
          <input class="note" v-model="notes[peer]" :placeholder="t('note')" />
        </div>
        <div class="line controls-line">
          <label class="enable">
            <input type="checkbox" :checked="enabledPeers.includes(peer)" @change="togglePeer(peer)" />
            <span class="enable-text">{{ enabledPeers.includes(peer) ? t('enabled') : t('disabled') }}</span>
          </label>
          <span class="latency" :class="getLatencyClass(peer)">
            {{ getLatencyText(peer) }}
          </span>
          <div class="spacer"></div>
          <ion-button size="small" fill="outline" @click="testPeerLatency(peer)">
            {{ testingPeers.includes(peer) ? t('Testing') : t('Test') }}
          </ion-button>
          <ion-button size="small" fill="outline" color="danger" @click="removePeer(peer)">
            <ion-icon :icon="trashOutline" />
          </ion-button>
        </div>
      </div>
      <div v-if="filteredPeers.length === 0" class="empty">{{ t('noPeers') }}</div>
    </div>



</template>

<style scoped>



.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* margin-bottom: 16px; */
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 14px;
  backdrop-filter: blur(10px);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.current-node-info {
  flex: 1;
}

.label {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
  word-break: break-all;
}

.node-url-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  opacity: 0.9;
}

.node-status-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 12px;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
}

.testing-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(139, 92, 246, 0.9));
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.sticky-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--ion-background-color, #ffffff);
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--ion-color-light, #f4f5f8);
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.search-container {
  flex: 1;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.main-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--ion-color-light, #f4f5f8);
  border-radius: 12px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--ion-color-dark, #222428);
}

.add-section {
  flex: 1;
  display: flex;
  gap: 8px;
}

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

.add-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(102, 204, 255, 0.2);
}

.search-section {
  flex: 1;
}

.search-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #777;
  font-size: 16px;
}

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

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.enabled-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.enabled-text {
  font-size: 14px;
  font-weight: 500;
}

.peers {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.peer-row {
  border: 1px solid var(--ion-color-light, #f4f5f8);
  border-radius: 12px;
  padding: 16px;
  background: var(--ion-background-color, #ffffff);
}

.line {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.line:last-child {
  margin-bottom: 0;
}

.url-line .url {
  font-weight: 500;
  color: var(--ion-color-dark, #222428);
  word-break: break-all;
}

.note-line .note {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--ion-color-light, #f4f5f8);
  border-radius: 8px;
  background: var(--ion-background-color, #ffffff);
  font-size: 14px;
}

.controls-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.enable {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.enable-text {
  font-size: 14px;
  font-weight: 500;
}

.latency {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
}

.latency-excellent {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.latency-good {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.latency-fair {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.latency-poor {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.latency-testing {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  animation: pulse 1.5s ease-in-out infinite;
}

.latency-unknown {
  background: var(--ion-color-light, #f4f5f8);
  color: var(--ion-color-medium, #92949c);
}

.spacer {
  flex: 1;
}

.empty {
  text-align: center;
  color: var(--ion-color-medium, #92949c);
  font-style: italic;
  padding: 32px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin-animation {
  animation: spin 1s linear infinite;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .relay-container {
    padding: 12px;
  }
  

  
  .page-title {
    font-size: 16px;
  }
  
  .toolbar-content {
    flex-direction: column;
    gap: 8px;
  }
  
  .toolbar-actions {
    width: 100%;
  }
  
  .main-controls {
    flex-wrap: wrap;
  }
  
  .controls-line {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .add-section, .search-section, .actions {
    width: 100%;
  }
  
  .actions {
    justify-content: flex-end;
  }
}
</style>