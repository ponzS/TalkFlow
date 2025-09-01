
import { ref } from 'vue';
import Gun, { IGunInstance } from 'gun';

// 模块级别的单例状态
const isOnline = ref(navigator.onLine);
const peersConnected = ref(false);
const checkInterval = 60000; // 每 60 秒检查一次

// 单例初始化标志和变量
let initialized = false;
let intervalId: number | null = null;
let currentGunInstance: IGunInstance<any> | null = null;
let instance: ReturnType<typeof createNetwork> | null = null;

function createNetwork(gunInstance: IGunInstance<any>) {
  // Ping测试函数 - 参考RelayMode.vue中的准确测速方法
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
        //  console.log(`[useNetwork] Successfully connected to ${endpoint}, status: ${response.status}, latency: ${latency}ms`);
          return {
            success: true,
            latency: latency
          };
        } catch (endpointError: any) {
          // 继续尝试下一个端点
         // console.log(`[useNetwork] Failed to connect to ${endpoint}: ${endpointError.message}`);
          continue;
        }
      }
      
      // 如果所有端点都失败，进行通用连接测试
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(peer, {
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
        //  console.log(`[useNetwork] CORS error for ${peer}, assuming reachable: ${fetchError.message}`);
          return {
            success: true,
            latency: latency
          };
        }
        
        // 检查是否是真正的网络错误
        if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('unreachable')) {
         // console.log(`[useNetwork] Network error for ${peer}: ${fetchError.message}`);
          return {
            success: false,
            error: `Network error: ${fetchError.message}`
          };
        }
        
        // 对于其他类型的错误，我们假设服务器是可达的（保守策略）
        const latency = Math.round(performance.now() - startTime);
       // console.log(`[useNetwork] Unknown error for ${peer}, assuming reachable: ${fetchError.message}`);
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

  // 检查 Gun.js 对等节点 - 使用ping测试方法提高准确性
  async function checkPeers(): Promise<boolean> {
    try {
      // 获取当前配置的peers列表
       const peers: string[] = [];
       try {
         // 尝试从Gun实例获取peers配置
         const gunOpt = (gunInstance as any)?.opt;
         if (gunOpt && gunOpt.peers) {
           if (Array.isArray(gunOpt.peers)) {
             peers.push(...gunOpt.peers);
           } else if (typeof gunOpt.peers === 'object') {
             peers.push(...Object.keys(gunOpt.peers));
           }
         }
       } catch (error) {
       //  console.warn('[checkPeers] Failed to get peers from Gun instance:', error);
       }
      
      if (peers.length === 0) {
        peersConnected.value = false;
        return false;
      }
      
      // 使用ping测试检查节点连通性
      const pingResults = await Promise.all(
        peers.map(async (peer) => {
          const result = await pingTest(peer);
          return { peer, success: result.success, latency: result.latency };
        })
      );
      
      // 如果至少有一个节点连通，则认为网络可用
      const hasConnectedPeer = pingResults.some(result => result.success);
      
      if (hasConnectedPeer) {
        const connectedPeers = pingResults.filter(result => result.success);
       // console.log(`[checkPeers] Connected peers:`, connectedPeers.map(p => `${p.peer} (${p.latency}ms)`));
      } else {
        //console.log(`[checkPeers] No peers are reachable`);
      }
      
      peersConnected.value = hasConnectedPeer;
      return hasConnectedPeer;
    } catch (error) {
    //  console.warn('[checkPeers] Error checking peers:', error);
      peersConnected.value = false;
      return false;
    }
  }

  async function updateNetworkStatus() {
    isOnline.value = navigator.onLine;
    peersConnected.value = await checkPeers();
  }

  function handleOnline() {
    updateNetworkStatus();
  }

  function handleOffline() {
    isOnline.value = false;
    peersConnected.value = false;
  }

  function startChecking() {
    updateNetworkStatus();
    intervalId = window.setInterval(updateNetworkStatus, checkInterval);
  }

  function stopChecking() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  // 单例初始化逻辑
  if (!initialized || currentGunInstance !== gunInstance) {
    if (initialized && currentGunInstance !== gunInstance) {
      // 如果 Gun 实例变了，清理旧的事件监听器和定时器
      stopChecking();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }

    initialized = true;
    currentGunInstance = gunInstance;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    startChecking();
  }

  return {
    isOnline,
    peersConnected,
    updateNetworkStatus,
    checkPeers,
  };
}

// 导出单例
export function useNetwork(gunInstance: IGunInstance<any>) {
  if (!instance || currentGunInstance !== gunInstance) {
    instance = createNetwork(gunInstance);
  }
  return instance;
}

// 清理函数（可选，用于测试或应用卸载时）
export function cleanupNetwork() {
  if (instance) {
    window.removeEventListener('online', instance.updateNetworkStatus);
    window.removeEventListener('offline', instance.updateNetworkStatus);
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    instance = null;
    initialized = false;
    currentGunInstance = null;
  }
}