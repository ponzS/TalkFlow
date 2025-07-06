<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import { 
  IonIcon, 
  IonCheckbox,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonButtons
} from '@ionic/vue';
import { addCircleSharp, closeCircleSharp, searchSharp, closeSharp, refreshOutline, speedometerOutline, flashOutline } from 'ionicons/icons';
import StorageService from '@/services/storageService';
import { getCurrentInstance } from 'vue';
import Gun from 'gun';

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
const selectedPeer = ref('');
const isModalOpen = ref(false);
const notes = ref<Record<string, string>>({});
const isResetting = ref(false); 

// 测速相关的状态
const peerLatencies = ref<Record<string, number | null>>({});
const testingPeers = ref<string[]>([]);
const isTestingAllSpeeds = ref(false);
const isInitialSpeedTest = ref(false);

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

// 测试单个节点的连接延迟 - 只测试网络可用的节点
async function testPeerLatency(peer: string, isInitialTest = false): Promise<number | null> {
  if (testingPeers.value.includes(peer)) {
    return null;
  }
  
  // 如果节点网络异常，不进行测速
  if (peerStatuses.value[peer] === 'disconnected') {
    return null;
  }
  
  testingPeers.value.push(peer);
  
  try {
    const startTime = performance.now();
    
    // 创建临时Gun实例用于测试连接
    const tempGun = Gun({ 
      peers: [peer],
      radisk: false,
      localStorage: false 
    });
    
    // 设置超时时间
    const timeoutMs = isInitialTest ? 5000 : 8000;
    
    // 创建连接测试Promise
    const connectionPromise = new Promise<number>((resolve, reject) => {
      let isResolved = false;
      
      // 监听连接建立事件
      const checkConnection = () => {
        // 尝试获取根节点来检测连接状态
        tempGun.get('~').once((data: any) => {
          if (!isResolved) {
            isResolved = true;
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            resolve(latency);
          }
        });
      };
      
      // 立即检查连接
      checkConnection();
      
      // 设置多次检查以确保能捕获到连接建立
      const checkInterval = setInterval(() => {
        if (!isResolved) {
          checkConnection();
        } else {
          clearInterval(checkInterval);
        }
      }, 100);
      
      // 超时处理
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          clearInterval(checkInterval);
          reject(new Error('连接超时'));
        }
      }, timeoutMs);
    });
    
    // 等待连接建立或超时
    const latency = await connectionPromise;
    
    // 保存测试结果
    peerLatencies.value[peer] = latency;
    
    return latency;
    
  } catch (err) {
    // 连接失败，设置为null
    peerLatencies.value[peer] = null;
    
    return null;
  } finally {
    // 从测试队列中移除
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
  // 如果节点网络异常，不显示延迟信息，直接返回网络异常状态
  if (peerStatuses.value[peer] === 'disconnected') {
    return t('networkUnavailable');
  }
  
  if (testingPeers.value.includes(peer)) {
    return t('testingLatency');
  }
  
  const latency = peerLatencies.value[peer];
  if (latency === null || latency === undefined) {
    return t('notTested');
  }
  
  // 将毫秒转换为秒，保留2位小数
  const latencyInSeconds = (latency / 1000).toFixed(2);
  return `${latencyInSeconds}s`;
}

// 获取延迟状态的CSS类
function getLatencyClass(peer: string): string {
  // 如果节点网络异常，显示为网络不可用状态
  if (peerStatuses.value[peer] === 'disconnected') {
    return 'latency-poor'; // 红色：网络异常
  }
  
  if (testingPeers.value.includes(peer)) {
    return 'latency-testing';
  }
  
  const latency = peerLatencies.value[peer];
  if (latency === null || latency === undefined) {
    return 'latency-unknown';
  }
  
  // 按毫秒计算颜色分级：<1000ms(1秒)绿色，1000-2000ms(1-2秒)黄色，2000-3000ms(2-3秒)橙色，3000-4000ms(3-4秒)红色
  if (latency < 1000) {
    return 'latency-excellent'; // 绿色：小于1秒
  } else if (latency < 2000) {
    return 'latency-good'; // 黄色：1-2秒
  } else if (latency < 3000) {
    return 'latency-fair'; // 橙色：2-3秒
  } else {
    return 'latency-poor'; // 红色：3秒以上
  }
}

// 节点列表过滤（仅搜索过滤，不需要按延迟排序因为是并行连接）
const sortedPeers = computed(() => {
  return peersList.value
    .slice()
    .filter((peer) => {
      const searchLower = searchQuery.value.toLowerCase();
      const peerLower = peer.toLowerCase();
      const noteLower = (peersNotes.value[peer] || '').toLowerCase();
      return peerLower.includes(searchLower) || noteLower.includes(searchLower);
    });
});

const openModal = (peer: string) => {
  selectedPeer.value = peer;
  // 加载现有的note到本地notes
  notes.value[peer] = peersNotes.value[peer] || '';
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedPeer.value = '';
};

const handlePeerToggle = (peer: string) => {
  if (enabledPeers.value.includes(peer)) {
    disablePeer(peer);
  } else {
    enablePeer(peer);
  }
};

const switchToPeer = (peer: string) => {
  enablePeer(peer);
  closeModal();
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
  <div class="relay-container">
    <!-- 紧凑的顶部信息区域 -->
    <div class="header-compact">
      <div class="title-row">
        <h2 class="page-title">Gun Database</h2>
        <div class="connection-status" :class="networkStatus">
          <div class="status-dot"></div>
          <span>{{ networkStatus === 'online' ? t('online') : t('offline') }}</span>
        </div>
      </div>
      
      <div class="info-row">
        <div class="current-node-info">
          <span class="label">{{ t('enabledNodes') }}</span>
          <span class="node-url-compact">{{ enabledPeersDisplay }}</span>
        </div>
        
        <div class="node-status-compact">
          <!-- <span class="mode-tag">{{ t('singleNodeConnection') }}</span> -->
          <span v-if="enabledPeers" class="latency-compact" :class="enabledPeersLatencyClass">
            {{ enabledPeersLatency }}
          </span>
        </div>
      </div>
      
      <div class="actions-row">
        <div v-if="isInitialSpeedTest" class="testing-status">
          <div class="spinner"></div>
          <span>{{ t('initialSpeedTesting') }}</span>
        </div>
        <button 
          v-else
          class="test-all-btn"
          @click="testAllPeersLatency"
          :disabled="isTestingAllSpeeds"
        >
          <ion-icon :icon="speedometerOutline" />
          {{ isTestingAllSpeeds ? t('testing') : t('testAllSpeed') }}
        </button>
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
      </div>
    </div>

    <!-- 节点列表 -->
    <div class="nodes-section">
      <div class="section-header">
        <h3 class="section-title">{{ t('gunRelays') }}</h3>
        <span class="nodes-count">{{ sortedPeers.length }} {{ t('relay') }}</span>
      </div>
      
      <div class="nodes-list-compact">
        <div 
          v-for="peer in sortedPeers" 
          :key="peer" 
          class="node-item"
          :class="{ 'active': enabledPeers.includes(peer) }"
          @click="openModal(peer)"
        >
          <div class="node-content">
            <div class="node-main">
              <div class="node-info">
                <div class="node-header">
                  <span class="node-url">{{ peer }}</span>
                  <div class="node-badges">
                    <span class="node-status" :class="peerStatuses[peer] === 'connected' ? 'available' : peerStatuses[peer] === 'disconnected' ? 'unavailable' : 'checking'">
                      {{ peerStatuses[peer] === 'connected' ? t('networkAvailable') : peerStatuses[peer] === 'disconnected' ? t('networkUnavailable') : t('checking') }}
                    </span>
                    <div v-if="enabledPeers.includes(peer)" class="current-badge">
                      <ion-icon :icon="flashOutline" />
                      {{ t('enabled') }}
                    </div>
                  </div>
                </div>
                
                <div class="node-note" v-if="peersNotes[peer]">
                  {{ peersNotes[peer] }}  
                </div>
              </div>
           
              <ion-checkbox
                @click.stop
                :checked="enabledPeers.includes(peer)"
                @ionChange="handlePeerToggle(peer)"
                color="primary"
              />
            </div>
            
            <div class="node-tools">
              <div class="latency-display" :class="getLatencyClass(peer)">
                {{ getLatencyText(peer) }}
              </div>
            
              <div class="node-actions">
                <ion-button 
                  fill="clear" 
                  size="small" 
                  @click.stop="testPeerLatency(peer)"
                  :disabled="testingPeers.includes(peer) || peerStatuses[peer] === 'disconnected'"
                >
                  <ion-icon 
                    :icon="testingPeers.includes(peer) ? refreshOutline : speedometerOutline" 
                    :class="{ 'spin-animation': testingPeers.includes(peer) }"
                  />
                </ion-button>
                
                <!-- <ion-button 
                  fill="clear" 
                  size="small" 
                  color="danger" 
                  @click.stop="removePeer(peer)"
                >
                  <ion-icon :icon="closeCircleSharp" />
                </ion-button> -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 优化后的模态框 -->
    <ion-modal :is-open="isModalOpen" @didDismiss="closeModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ t('gunRelays') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeModal">
              <ion-icon :icon="closeSharp" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content class="modal-content">
        <div class="modal-body" v-if="selectedPeer">
          
          <!-- Relay URL -->
          <div class="info-section">
            <div class="info-label">{{ t('relayURL') }}</div>
            <div class="info-value relay-url">{{ selectedPeer }}</div>
          </div>
          
          <!-- Status -->
          <div class="info-section">
            <div class="info-label">{{ t('status') }}</div>
            <div class="status-badge" :class="peerStatuses[selectedPeer] === 'connected' ? 'available' : peerStatuses[selectedPeer] === 'disconnected' ? 'unavailable' : 'checking'"
              >
              <div class="status-dot"></div>
              <span>{{ peerStatuses[selectedPeer] === 'connected' ? t('networkAvailable') : peerStatuses[selectedPeer] === 'disconnected' ? t('networkUnavailable') : t('checking') }}</span>
            </div>
          </div>
          
          <!-- Connection Latency -->
          <div class="info-section">
            <div class="info-label">{{ t('connectionLatency') }}</div>
            <div class="latency-section">
              <div class="latency-display-modal" :class="getLatencyClass(selectedPeer)">
                {{ getLatencyText(selectedPeer) }}
              </div>
              <button 
                class="test-btn-modal"
                @click="testPeerLatency(selectedPeer, false)"
                :disabled="testingPeers.includes(selectedPeer) || isInitialSpeedTest || peerStatuses[selectedPeer] === 'disconnected'"
              >
                <ion-icon :icon="speedometerOutline" />
                {{ testingPeers.includes(selectedPeer) ? t('testing') : t('testLatency') }}
              </button>
            </div>
          </div>
          
          <!-- Note -->
          <div class="info-section">
            <div class="info-label">{{ t('note') }}</div>
            <div class="note-input-wrapper">
                             <input 
                 v-model="notes[selectedPeer]" 
                 placeholder="Add a note..."
                 class="note-input"
                 type="text"
               />
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <ion-button 
            v-if="!enabledPeers.includes(selectedPeer)"
            expand="block" 
            color="primary" 
            @click="switchToPeer(selectedPeer!)"
            class="action-button"
          >
            {{ t('enableThisNode') }}
          </ion-button>
          <ion-button 
            expand="block" 
            color="danger" 
            @click="removePeer(selectedPeer!); closeModal()"
            class="action-button"
          >
            {{ t('removeRelay') }}
          </ion-button>
          <ion-button 
            expand="block" 
            color="medium" 
            @click="closeModal"
            class="action-button"
          >
            {{ t('close') }}
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </div>
</template>

<style scoped>
.relay-container {
  padding: 12px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
  min-height: 100vh;
  width: 100%;
  background: transparent;
}

/* 紧凑的顶部区域 */
.header-compact {
  padding: 12px;
  background: rgba(130, 130, 130, 0.1);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: inherit;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  backdrop-filter: blur(4px);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.connection-status.online {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 0.9));
  color: #065f46;
}

.connection-status.offline {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0.9));
  color: #fff;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.8;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 12px;
}

.current-node-info {
  flex: 1;
  min-width: 0;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: inherit;
  margin-right: 8px;
}

.node-url-compact {
  font-size: 12px;
  color: inherit;
  opacity: 0.8;
  word-break: break-all;
}

.node-status-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.mode-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  background: rgba(130, 130, 130, 0.3);
  color: inherit;
}

.latency-compact {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
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

.test-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 0.9));
  color: #065f46;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.test-all-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(34, 197, 94, 1));
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(34, 197, 94, 0.3);
}

.test-all-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 5px rgba(34, 197, 94, 0.2);
}

.test-all-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: rgba(150, 150, 150, 0.4);
  color: #666;
}

.test-all-btn ion-icon {
  font-size: 16px;
}

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

.toolbar-content {
  display: flex;
  gap: 8px;
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

.nodes-section {
  background: rgba(130, 130, 130, 0.05);
  border-radius: 8px;
  padding: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(130, 130, 130, 0.2);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: inherit;
}

.nodes-count {
  font-size: 12px;
  font-weight: 500;
  color: inherit;
  opacity: 0.8;
}

.nodes-list-compact {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.node-item {
  padding: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(130, 130, 130, 0.2);
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.node-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.12);
}

.node-item.active {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.1));
  border-color: rgba(34, 197, 94, 0.5);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
}

.node-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.node-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.node-url {
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  word-break: break-all;
}

.node-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.node-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.node-status.available {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.15));
  color: #22c55e;
}

.node-status.unavailable {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.15));
  color: #ef4444;
}

.node-status.connected {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.15));
  color: #22c55e;
}

.node-status.disconnected {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.15));
  color: #ef4444;
}

.node-status.checking {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.15));
  color: #f59e0b;
}

.current-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: #065f46;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

.node-note {
  font-size: 12px;
  color: inherit;
  opacity: 0.7;
}

.node-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.latency-display {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}

.node-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(102, 204, 255, 0.8), rgba(102, 204, 255, 0.9));
  color: #1e40af;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.test-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(102, 204, 255, 0.9), rgba(102, 204, 255, 1));
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 204, 255, 0.3);
}

.test-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(102, 204, 255, 0.2);
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: rgba(150, 150, 150, 0.3);
  color: #666;
}

.test-btn ion-icon {
  font-size: 14px;
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

.latency-excellent {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: #065f46;
}

.latency-good {
  background: linear-gradient(135deg, #facc15, #eab308);
  color: #713f12;
}

.latency-fair {
  background: linear-gradient(135deg, #fb923c, #f97316);
  color: #9a3412;
}

.latency-poor {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
}

.latency-testing {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
  animation: pulse 1.5s ease-in-out infinite;
}

.latency-unknown {
  background: rgba(150, 150, 150, 0.3);
  color: #666;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.modal-actions ion-button {
  --border-radius: 8px;
  --padding-start: 16px;
  --padding-end: 16px;
  margin: 0;
}

.status-display {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  background: rgba(150, 150, 150, 0.1);
}

.latency-info {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 0;
}

.latency-display {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  min-width: 60px;
}

.latency-display.large {
  padding: 8px 12px;
  font-size: 16px;
  min-width: 80px;
}

.speed-test-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(102, 204, 255, 0.8), rgba(102, 204, 255, 0.9));
  color: #1e40af;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 28px;
}

.speed-test-btn.large {
  padding: 10px 16px;
  font-size: 14px;
  min-height: 36px;
}

.speed-test-btn ion-icon {
  font-size: 16px;
}

.speed-test-btn.large ion-icon {
  font-size: 18px;
}

/* 模态框样式 */
.modal-content {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.modal-body {
  padding: 20px;
}

.info-section {
  margin-bottom: 24px;
}

.info-label {
  font-size: 14px;
  font-weight: 600;
  color: inherit;
  margin-bottom: 8px;
  opacity: 0.7;
}

.info-value {
  font-size: 14px;
  color: inherit;
  word-break: break-all;
  line-height: 1.4;
}

.relay-url {
  background: rgba(130, 130, 130, 0.1);
  padding: 12px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 13px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.available {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.1));
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-badge.available .status-dot {
  background: #22c55e;
}

.status-badge.unavailable {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.1));
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-badge.unavailable .status-dot {
  background: #ef4444;
}

.status-badge.checking {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-badge.checking .status-dot {
  background: #f59e0b;
}

.status-badge .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.latency-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.latency-display-modal {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
}

.latency-display-modal.latency-excellent {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: #065f46;
}

.latency-display-modal.latency-good {
  background: linear-gradient(135deg, #facc15, #eab308);
  color: #713f12;
}

.latency-display-modal.latency-fair {
  background: linear-gradient(135deg, #fb923c, #f97316);
  color: #9a3412;
}

.latency-display-modal.latency-poor {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
}

.test-btn-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(102, 204, 255, 0.8), rgba(102, 204, 255, 0.9));
  color: #1e40af;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 36px;
}

.test-btn-modal:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(102, 204, 255, 0.9), rgba(102, 204, 255, 1));
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 204, 255, 0.3);
}

.test-btn-modal:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: rgba(150, 150, 150, 0.3);
  color: #666;
}

.test-btn-modal ion-icon {
  font-size: 16px;
}

.note-input-wrapper {
  position: relative;
}

.note-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(130, 130, 130, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 14px;
  color: inherit;
  outline: none;
  transition: all 0.2s ease;
}

.note-input:focus {
  border-color: rgba(102, 204, 255, 0.6);
  box-shadow: 0 0 0 2px rgba(102, 204, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.note-input::placeholder {
  color: inherit;
  opacity: 0.5;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: rgba(130, 130, 130, 0.05);
  border-top: 1px solid rgba(130, 130, 130, 0.1);
}

.action-button {
  --border-radius: 8px;
  --padding-start: 16px;
  --padding-end: 16px;
  margin: 0;
  height: 48px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .relay-container {
    padding: 12px 16px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .toolbar-content {
    flex-direction: column;
    gap: 12px;
  }
  
  .node-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .node-controls {
    width: 100%;
    justify-content: space-between;
  }

  /* 模态框响应式 */
  .modal-body {
    padding: 16px;
  }
  
  .info-section {
    margin-bottom: 20px;
  }
  
  .latency-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .latency-display-modal {
    min-width: 100%;
  }
  
  .test-btn-modal {
    width: 100%;
    justify-content: center;
  }
  
  .modal-actions {
    padding: 16px;
    gap: 10px;
  }
  
  .action-button {
    height: 44px;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin-animation {
  animation: spin 1s linear infinite;
}
</style>