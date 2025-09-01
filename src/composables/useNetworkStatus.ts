import { ref, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import { useNetwork } from '@/composables/useNetwork';
import StorageService from '@/services/storageService';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';

import { gun, peersList, enabledPeers, savePeersListToStorage, saveEnabledPeersToStorage } from './useGun'
 
// 模块级别的单例状态 (保持不变)
const networkStatus = ref<'online' | 'offline'>('online');
const peersStatus = ref<'connected' | 'disconnected'>('disconnected');
const currentMode = ref<'direct' | 'relay'>('direct');
const peerStatuses = ref<Record<string, 'connected' | 'disconnected' | 'checking'>>({});

// 单例初始化标志
let initialized = false;
let instance: ReturnType<typeof createNetworkStatus> | null = null;

function createNetworkStatus(storageService: StorageService) {
  const {isRelaySharingEnabled, toggleRelaySharing } = getTalkFlowCore();
  const { showToast } = useToast();
  const { isOnline, peersConnected, updateNetworkStatus, checkPeers } = useNetwork(gun);
  
  // 移动到函数内部的响应式状态和函数
  const peersNotes = ref<Record<string, string>>({});
  const peerLatencies = ref<Record<string, number | null>>({});
  const testingPeers = ref<string[]>([]);
  const isTestingAllSpeeds = ref(false);
  const isInitialSpeedTest = ref(false);

  // 测速相关的函数 (也移动到函数内部)
  async function performInitialSpeedTest() {
    if (enabledPeers.value.length === 0) {
      return;
    }
    
    isInitialSpeedTest.value = true;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const maxConcurrent = 1000;
      
      for (let i = 0; i < enabledPeers.value.length; i += maxConcurrent) {
        const batch = enabledPeers.value.slice(i, i + maxConcurrent);
        
        await Promise.all(
          batch.map(async peer => {
            const result = await testPeerLatency(peer, true);
            return { peer, result };
          })
        );
        
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

  // 测试单个节点的连接延迟 - 使用ping测试方法提高准确性
  async function testPeerLatency(peer: string, isInitialTest = false): Promise<number | null> {
    if (testingPeers.value.includes(peer)) {
      return null;
    }
    
    testingPeers.value.push(peer);
    
    try {
      // 使用ping测试检查节点连通性和延迟
      const pingResult = await pingTest(peer);
      
      if (pingResult.success && pingResult.latency !== undefined) {
        peerLatencies.value[peer] = pingResult.latency;
        return pingResult.latency;
      } else {
        peerLatencies.value[peer] = null;
        return null;
      }
      
    } catch (err) {
      peerLatencies.value[peer] = null;
      return null;
    } finally {
      testingPeers.value = testingPeers.value.filter(p => p !== peer);
    }
  }

  // 测试所有已启用节点的延迟 (确保能访问到内部的 ref)
  async function testAllPeersLatency() {
    if (isTestingAllSpeeds.value || isInitialSpeedTest.value) {
      return;
    }
    
    if (enabledPeers.value.length === 0) {
      return;
    }
    
    isTestingAllSpeeds.value = true;
    
    try {
      const maxConcurrent = 1000;
      const peers = [...enabledPeers.value];
      
      for (let i = 0; i < peers.length; i += maxConcurrent) {
        const batch = peers.slice(i, i + maxConcurrent);
        
        await Promise.all(
          batch.map(async peer => {
            const result = await testPeerLatency(peer, false); 
            return { peer, result };
          })
        );
        
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

  // 获取延迟显示文本 (确保能访问到内部的 ref)
  function getLatencyText(peer: string): string {
    if (testingPeers.value.includes(peer)) {
      return '测速中'; // Assuming 't' is a global function or imported elsewhere
    }
    
    const latency = peerLatencies.value[peer];
    if (latency === null || latency === undefined) {
      // 如果没有延迟数据，检查连接状态
      if (peerStatuses.value[peer] === 'disconnected') {
        return '连接失败';
      } else if (peerStatuses.value[peer] === 'checking') {
        return '检测中';
      }
      return '未测速';
    }
    
    const latencyInSeconds = (latency / 1000).toFixed(2);
    return `${latencyInSeconds}s`;
  }

  // 获取延迟状态的CSS类 (确保能访问到内部的 ref)
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

  // 防抖保存函数 (确保能访问到内部的 ref)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  // 监听本地notes变化，防抖保存
  watch(peersNotes, async (newNotes) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(async () => {
      for (const [peer, note] of Object.entries(newNotes)) {
        if (note !== undefined && note !== peersNotes.value[peer]) {
          await savePeerNote(peer, note.trim());
        }
      }
    }, 2000); 
  }, { deep: true });

  // 监听节点列表变化，更新延迟状态
  watch(peersList, (newPeers, oldPeers = []) => {
    oldPeers.forEach(peer => {
      if (!newPeers.includes(peer)) {
        delete peerLatencies.value[peer];
      }
    });
  }, { deep: true, immediate: true });

  // 监听启用节点变化，为新启用的节点初始化延迟状态并触发测速
  watch(enabledPeers, async (newEnabledPeers, oldEnabledPeers = []) => {
    newEnabledPeers.forEach(peer => {
      if (!(peer in peerLatencies.value)) {
        peerLatencies.value[peer] = null;
      }
    });
    
    oldEnabledPeers.forEach(peer => {
      if (!newEnabledPeers.includes(peer)) {
        delete peerLatencies.value[peer];
      }
    });
    
    if (oldEnabledPeers.length === 0 && newEnabledPeers.length > 0 && !isInitialSpeedTest.value) {
      const hasAnyLatencyData = newEnabledPeers.some(peer => peerLatencies.value[peer] !== null);
      if (!hasAnyLatencyData) {
        setTimeout(() => {
          performInitialSpeedTest();
        }, 1000);
      }
    }

    if (isRelaySharingEnabled.value) {
      try {
        await toggleRelaySharing(true, true);
      } catch (error) {
      }
    }
    saveEnabledPeer(); // 确保保存启用节点状态
    updateStatus(); // 确保更新网络状态
  }, { deep: true, immediate: true });

  // localStorage操作辅助函数
  function getFromLocalStorage(key: string, defaultValue: any = null) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  function setToLocalStorage(key: string, value: any) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
    }
  }

  // 保存 enabledPeer 到 localStorage
  async function saveEnabledPeer() {
    try {
      // 保存启用的节点列表
      saveEnabledPeersToStorage(enabledPeers.value);
      
      // 保存节点的启用状态和备注
      const peersData = getFromLocalStorage('gun_peers_data', {});
      
      // 重置所有节点为未启用
      for (const peer of peersList.value) {
        if (!peersData[peer]) {
          peersData[peer] = { is_enabled: false, note: '' };
        } else {
          peersData[peer].is_enabled = false;
        }
      }
      
      // 设置启用的节点
      for (const peer of enabledPeers.value) {
        if (!peersData[peer]) {
          peersData[peer] = { is_enabled: true, note: peersNotes.value[peer] || '' };
        } else {
          peersData[peer].is_enabled = true;
          peersData[peer].note = peersNotes.value[peer] || '';
        }
      }
      
      setToLocalStorage('gun_peers_data', peersData);
    } catch (err) {
      // showToast('无法保存启用节点', 'error');
    }
  }

  // 保存节点备注
  async function savePeerNote(peer: string, note: string) {
    try {
      const peersData = getFromLocalStorage('gun_peers_data', {});
      
      if (!peersData[peer]) {
        peersData[peer] = { is_enabled: enabledPeers.value.includes(peer), note: note };
      } else {
        peersData[peer].note = note;
      }
      
      setToLocalStorage('gun_peers_data', peersData);
      peersNotes.value[peer] = note;
    } catch (err) {
      // showToast('无法保存节点备注', 'error');
    }
  }

  async function loadPeers() {
    try {
        // 从localStorage加载节点数据
        const peersData = getFromLocalStorage('gun_peers_data', {});
        
        // 如果localStorage为空，初始化默认数据
        if (Object.keys(peersData).length === 0) {
            for (const peerUrl of peersList.value) {
                peersData[peerUrl] = { is_enabled: false, note: '' };
            }
            setToLocalStorage('gun_peers_data', peersData);
        }
        
        // 确保peersList包含所有存储的节点
        const storedPeers = Object.keys(peersData);
        
        // 检查是否有新的默认节点需要添加（默认不启用）
        const missingPeers = peersList.value.filter(defaultPeer => !storedPeers.includes(defaultPeer));
        if (missingPeers.length > 0) {
            for (const peerUrl of missingPeers) {
                peersData[peerUrl] = { is_enabled: false, note: '' };
            }
            setToLocalStorage('gun_peers_data', peersData);
        }
        
        // 更新peersList为包含所有节点（存储的 + 默认的）
        const allPeers = [...new Set([...storedPeers, ...peersList.value])];
        peersList.value = allPeers;
        savePeersListToStorage(allPeers);
        
        // 加载备注
        peersNotes.value = {};
        for (const [peer, data] of Object.entries(peersData)) {
            peersNotes.value[peer] = (data as any).note || '';
        }
        
        // 优先使用全局启用列表
        const globalEnabled = getFromLocalStorage('gun_enabled_peers', []);
        let nextEnabled: string[] = [];
        
        if (Array.isArray(globalEnabled) && globalEnabled.length > 0) {
            nextEnabled = globalEnabled.filter(p => allPeers.includes(p));
        } else {
            // 兼容旧版：从 peersData 中读取已启用项（不再默认全部启用）
            nextEnabled = Object.entries(peersData)
                .filter(([_, data]) => (data as any).is_enabled)
                .map(([peer]) => peer)
                .filter(peer => allPeers.includes(peer));
        }
        
        // 不再默认“全部启用”，直接使用计算结果
        enabledPeers.value = nextEnabled;
        
        // 保存更新后的启用节点列表（保持存储一致）
        saveEnabledPeersToStorage(enabledPeers.value);
    } catch (err) {
        // showToast('无法加载节点列表', 'error');
    }
}
  // 更新网络和 Peer 状态
  async function updateStatus() {
    networkStatus.value = isOnline.value ? 'online' : 'offline';
    peersStatus.value = peersConnected.value ? 'connected' : 'disconnected';
    currentMode.value = peersConnected.value && enabledPeers.value.length > 0 ? 'relay' : 'direct';
    await updatePeerStatuses();
  }

  // Ping测试函数 - 与useNetwork.ts保持一致的准确测试方法
  async function pingTest(peer: string): Promise<{ success: boolean; latency?: number; error?: string }> {
    try {
      const startTime = performance.now();
      
      // 提取URL的主机名和端口
      const url = new URL(peer);
      const host = url.hostname;
      const port = url.port || (url.protocol === 'https:' ? '443' : '80');
      
      // 首先尝试访问Gun.js特定端点
      const gunEndpoints = [
        `${peer}/gun`,
        `${peer}/gun/`,
        peer // 原始地址
      ];
      
      for (const endpoint of gunEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(endpoint, {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache'
          });
          
          clearTimeout(timeoutId);
          const latency = Math.round(performance.now() - startTime);
          
          // 任何HTTP响应都表示连接成功
          return {
            success: true,
            latency: latency
          };
        } catch (endpointError: any) {
          // 继续尝试下一个端点
          continue;
        }
      }
      
      // 如果所有端点都失败，进行通用连接测试
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100000);
      
      try {
        await fetch(peer, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        const latency = Math.round(performance.now() - startTime);
        
        // 任何HTTP响应都表示连接成功
        return {
          success: true,
          latency: latency
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // 检查是否是CORS错误（表示服务器可达）
        const errorMessage = fetchError.message?.toLowerCase() || '';
        const isCorsError = errorMessage.includes('cors') || 
                           errorMessage.includes('cross-origin') ||
                           errorMessage.includes('network error') ||
                           errorMessage.includes('failed to fetch');
        
        if (isCorsError) {
          // CORS错误通常意味着服务器是可达的，只是不允许跨域请求
          const latency = Math.round(performance.now() - startTime);
          return {
            success: true,
            latency: latency
          };
        }
        
        // 检查是否是真正的网络错误
        if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('unreachable')) {
          return {
            success: false,
            error: `Network error: ${fetchError.message}`
          };
        }
        
        // 对于其他类型的错误，我们假设服务器是可达的（保守策略）
        const latency = Math.round(performance.now() - startTime);
        return {
          success: true,
          latency: latency
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Ping test error: ${error.message}`
      };
    }
  }

  // 检查单个 Peer 的状态（用于 UI 展示）- 使用ping测试方法提高准确性
  async function checkPeerStatus(peer: string): Promise<'connected' | 'disconnected'> {
    peerStatuses.value[peer] = 'checking';

    try {
      // 使用ping测试检查节点连通性
      const pingResult = await pingTest(peer);
      
      if (pingResult.success) {
        return 'connected';
      } else {
        return 'disconnected';
      }
    } catch (error) {
      return 'disconnected';
    }
  }

  // 更新所有 Peer 的状态（并行处理）
  async function updatePeerStatuses() {
    const promises = peersList.value.map(async (peer) => {
      const status = await checkPeerStatus(peer);
      peerStatuses.value[peer] = status;
    });
    await Promise.all(promises);
  }

  // 用户手动启用某个 Peer - 支持多节点选择
  async function enablePeer(peer: string) {
    if (!peersList.value.includes(peer)) {
      showToast(`节点 ${peer} 不在列表中`, 'warning');
      return;
    }
    if (enabledPeers.value.includes(peer)) {
      showToast(`${peer} 已是启用状态`, 'info');
      return;
    }

    if (enabledPeers.value.length >= 1000) {
      showToast('已达到最大节点数量限制（1000个）', 'warning');
      return;
    }

    enabledPeers.value.push(peer);
    await saveEnabledPeer();
    
    try {
      //await reinitializeGunInstance(enabledPeers.value);
      showToast(`启用节点: ${peer}`, 'success');
    } catch (error) {
      showToast(`启用节点失败: ${error}`, 'error');
      enabledPeers.value = enabledPeers.value.filter(p => p !== peer);
      await saveEnabledPeer();
      return;
    }
    
    await updateStatus();
  }

  // 用户禁用指定的 Peer
  async function disablePeer(peer?: string) {
    if (!peer) {
      if (enabledPeers.value.length === 0) {
        showToast('无启用的节点', 'info');
        return;
      }
      const oldPeers = [...enabledPeers.value];
      enabledPeers.value = [];
      await saveEnabledPeer();
      
      try {
      //  await reinitializeGunInstance(enabledPeers.value);
        showToast(`禁用所有节点: ${oldPeers.join(', ')}`, 'success');
      } catch (error) {
        showToast(`禁用节点失败: ${error}`, 'error');
        enabledPeers.value = oldPeers;
        await saveEnabledPeer();
        return;
      }
    } else {
      if (!enabledPeers.value.includes(peer)) {
        showToast(`节点 ${peer} 未启用`, 'info');
        return;
      }
      const oldPeers = [...enabledPeers.value];
      enabledPeers.value = enabledPeers.value.filter(p => p !== peer);
      await saveEnabledPeer();
      
      try {
      //  await reinitializeGunInstance(enabledPeers.value);
        showToast(`禁用节点: ${peer}`, 'success');
      } catch (error) {
        showToast(`禁用节点失败: ${error}`, 'error');
        enabledPeers.value = oldPeers;
        await saveEnabledPeer();
        return;
      }
    }
    
    await updateStatus();
  }

  // 添加 Peer（允许任意输入）
  async function addPeer(url: string) {
    if (!url) {
        showToast('请输入节点地址', 'warning');
        return;
    }
    const trimmedUrl = url.trim();
    if (peersList.value.includes(trimmedUrl)) {
        showToast('该节点已存在', 'warning');
        return;
    }
    
    if (peersList.value.length >= 1000) {
        showToast('已达到最大节点数量限制（1000个）', 'warning');
        return;
    }
    
    try {
        // 添加到localStorage
        const peersData = getFromLocalStorage('gun_peers_data', {});
        peersData[trimmedUrl] = { is_enabled: true, note: '' };
        setToLocalStorage('gun_peers_data', peersData);
        
        // 更新节点列表
        peersList.value.push(trimmedUrl);
        savePeersListToStorage(peersList.value);
        
        if (enabledPeers.value.length < 1000) {
            enabledPeers.value.push(trimmedUrl);
            saveEnabledPeersToStorage(enabledPeers.value);
            showToast(`节点已添加并启用: ${trimmedUrl}`, 'success');
        } else {
            showToast(`节点已添加: ${trimmedUrl}（因达到启用限制未自动启用）`, 'success');
        }
        
        await updatePeerStatuses();
    } catch (err: any) {
        showToast(`添加节点失败: ${err.message || '未知错误'}`, 'error');
    }
}

  // 移除 Peer
  async function removePeer(peer: string) {
    try {
      if (enabledPeers.value.includes(peer)) {
        const oldEnabledPeers = [...enabledPeers.value];
        enabledPeers.value = enabledPeers.value.filter(p => p !== peer);
        saveEnabledPeersToStorage(enabledPeers.value);
        await saveEnabledPeer();
        showToast(`已从启用列表中移除节点 ${peer}`, 'info');
      }
      
      // 从localStorage删除节点数据
      const peersData = getFromLocalStorage('gun_peers_data', {});
      delete peersData[peer];
      setToLocalStorage('gun_peers_data', peersData);
      
      // 更新节点列表
      peersList.value = peersList.value.filter(p => p !== peer);
      savePeersListToStorage(peersList.value);
      delete peerStatuses.value[peer];
      
      showToast(`删除节点 ${peer}`, 'success');
      await updatePeerStatuses();
    } catch (err) {
        showToast('删除节点失败', 'error');
    }
  }

  // 处理网络状态变化
  function handleOnline() {
    updateNetworkStatus();
    updateStatus();
  }

  function handleOffline() {
    updateNetworkStatus();
    updateStatus();
  }

  // 初始化逻辑，只执行一次
  if (!initialized) {
    initialized = true;
    loadPeers();
    updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    watch(peersList, () => {
      updatePeerStatuses();
    });
    watch(enabledPeers, async (newEnabledPeers, oldEnabledPeers = []) => {
      newEnabledPeers.forEach(peer => {
        if (!(peer in peerLatencies.value)) {
          peerLatencies.value[peer] = null;
        }
      });
      
      oldEnabledPeers.forEach(peer => {
        if (!newEnabledPeers.includes(peer)) {
          delete peerLatencies.value[peer];
        }
      });
      
      if (oldEnabledPeers.length === 0 && newEnabledPeers.length > 0 && !isInitialSpeedTest.value) {
        const hasAnyLatencyData = newEnabledPeers.some(peer => peerLatencies.value[peer] !== null);
        if (!hasAnyLatencyData) {
          setTimeout(() => {
            performInitialSpeedTest();
          }, 1000);
        }
      }

      if (isRelaySharingEnabled.value) {
        try {
          await toggleRelaySharing(true, true);
      } catch (error) {
        }
      }
      saveEnabledPeer(); 
      updateStatus(); 
    }, { deep: true, immediate: true });
  }

  return {
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
    updateStatus,
    peersNotes,
    savePeerNote,
    peerLatencies,
    testingPeers,
    isTestingAllSpeeds,
    isInitialSpeedTest,
    performInitialSpeedTest,
    testPeerLatency, // 确保也返回这个函数，如果外部有调用
    testAllPeersLatency, // 确保也返回这个函数
    getLatencyText, // 确保也返回这个函数
    getLatencyClass, // 确保也返回这个函数
  };
}

// 导出单例
export function useNetworkStatus(storageService: StorageService) {
  if (!instance) {
    instance = createNetworkStatus(storageService);
  }
  return instance;
}
