import { ref, Ref, computed } from 'vue';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import axios from 'axios';
import { useToast } from '@/composables/useToast';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';

interface BarkSettings {
  enabled: boolean;
  serverUrl: string;
  deviceKey: string;
}

interface BarkUrlParts {
  serverUrl: string;
  deviceKey: string;
}

interface PubKeyBarkConfig {
  pubKey: string;
  serverUrl: string;
  deviceKey: string;
  enabled: boolean;
  updatedAt: number;
}

// IndexedDB 数据库配置
const DB_NAME = 'BarkNotificationDB';
const DB_VERSION = 1;
const STORE_NAME = 'pubKeyBarkConfigs';

// IndexedDB 操作函数
async function initBarkDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'pubKey' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

async function savePubKeyBarkConfig(config: PubKeyBarkConfig): Promise<void> {
  const db = await initBarkDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(config);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getPubKeyBarkConfig(pubKey: string): Promise<PubKeyBarkConfig | null> {
  const db = await initBarkDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(pubKey);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function getAllPubKeyBarkConfigs(): Promise<PubKeyBarkConfig[]> {
  const db = await initBarkDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deletePubKeyBarkConfig(pubKey: string): Promise<void> {
  const db = await initBarkDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(pubKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function useBarkNotification() {
  const chatFlowStore = getTalkFlowCore();
  const { currentChatPub, currentUserPub } = chatFlowStore;
  const { showToast } = useToast();
  
  // 当前用户和聊天对象的Bark配置
  const currentUserBarkConfig = ref<PubKeyBarkConfig | null>(null);
  const currentChatBarkConfig = ref<PubKeyBarkConfig | null>(null);
  const allBarkConfigs = ref<PubKeyBarkConfig[]>([]);
  
  // 兼容性：保留原有的全局设置
  const enabled = ref(false);
  const serverUrl = ref('https://api.day.app');
  const deviceKey = ref('');
  const BARK_SETTINGS_FILE = 'bark_settings.json';
  
  // 计算属性：当前有效的Bark配置
  const effectiveBarkConfig = computed(() => {
    if (currentChatPub.value && currentChatBarkConfig.value?.enabled) {
      return currentChatBarkConfig.value;
    }
    if (currentUserPub.value && currentUserBarkConfig.value?.enabled) {
      return currentUserBarkConfig.value;
    }
    return null;
  });

  // 解析 Bark URL，提取服务器域名和设备 Key
  function parseBarkUrl(url: string): BarkUrlParts | null {
    try {
      // 支持多种格式：
      // https://api.day.app/deviceKey
      // https://api.day.app/deviceKey/
      // https://custom.domain.com/deviceKey
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      if (pathParts.length >= 1) {
        const deviceKey = pathParts[0];
        const serverUrl = `${urlObj.protocol}//${urlObj.host}`;
        return { serverUrl, deviceKey };
      }
      return null;
    } catch (error) {
      console.error('解析 Bark URL 失败:', error);
      return null;
    }
  }

  // 加载 Bark 设置
  async function loadBarkSettings(): Promise<BarkSettings> {
    const defaultSettings: BarkSettings = {
      enabled: false,
      serverUrl: 'https://api.day.app',
      deviceKey: ''
    };
    
    try {
      const result = await Filesystem.readFile({
        path: BARK_SETTINGS_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      const data = typeof result.data === 'string' ? result.data : await result.data.text();
      return JSON.parse(data) || defaultSettings;
    } catch (err) {
      console.log('未找到 Bark 设置文件，使用默认值');
      return defaultSettings;
    }
  }

  // 保存 Bark 设置
  async function saveBarkSettings(settings: BarkSettings): Promise<void> {
    try {
      await Filesystem.writeFile({
        path: BARK_SETTINGS_FILE,
        data: JSON.stringify(settings),
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      console.log('Bark 设置已保存:', settings);
    } catch (err) {
      showToast('保存 Bark 设置失败', 'error');
      console.error('保存 Bark 设置失败:', err);
    }
  }

  // 初始化设置
  async function initBarkSettings(): Promise<void> {
    try {
      // 加载所有公钥配置
      allBarkConfigs.value = await getAllPubKeyBarkConfigs();
      
      // 加载当前用户配置
      if (currentUserPub.value) {
        currentUserBarkConfig.value = await getPubKeyBarkConfig(currentUserPub.value);
      }
      
      // 加载当前聊天对象配置
      if (currentChatPub.value) {
        currentChatBarkConfig.value = await getPubKeyBarkConfig(currentChatPub.value);
      }
      
      // 兼容性：加载旧的全局设置
      const settings = await loadBarkSettings();
      enabled.value = settings.enabled;
      serverUrl.value = settings.serverUrl;
      deviceKey.value = settings.deviceKey;
    } catch (error) {
      console.error('初始化Bark设置失败:', error);
    }
  }
  
  // 为指定公钥设置Bark配置
  async function setBarkConfigForPubKey(
    pubKey: string, 
    barkUrl: string, 
    enabled: boolean = true
  ): Promise<boolean> {
    const parsed = parseBarkUrl(barkUrl);
    if (!parsed) {
      showToast('无效的 Bark URL 格式', 'error');
      return false;
    }
    
    const config: PubKeyBarkConfig = {
      pubKey,
      serverUrl: parsed.serverUrl,
      deviceKey: parsed.deviceKey,
      enabled,
      updatedAt: Date.now()
    };
    
    try {
      await savePubKeyBarkConfig(config);
      
      // 更新本地状态
      allBarkConfigs.value = await getAllPubKeyBarkConfigs();
      
      if (pubKey === currentUserPub.value) {
        currentUserBarkConfig.value = config;
      }
      if (pubKey === currentChatPub.value) {
        currentChatBarkConfig.value = config;
      }
      
      showToast('Bark 配置已保存', 'success');
      return true;
    } catch (error) {
      console.error('保存Bark配置失败:', error);
      showToast('保存 Bark 配置失败', 'error');
      return false;
    }
  }
  
  // 获取指定公钥的Bark配置
  async function getBarkConfigForPubKey(pubKey: string): Promise<PubKeyBarkConfig | null> {
    try {
      return await getPubKeyBarkConfig(pubKey);
    } catch (error) {
      console.error('获取Bark配置失败:', error);
      return null;
    }
  }
  
  // 删除指定公钥的Bark配置
  async function deleteBarkConfigForPubKey(pubKey: string): Promise<boolean> {
    try {
      await deletePubKeyBarkConfig(pubKey);
      
      // 更新本地状态
      allBarkConfigs.value = await getAllPubKeyBarkConfigs();
      
      if (pubKey === currentUserPub.value) {
        currentUserBarkConfig.value = null;
      }
      if (pubKey === currentChatPub.value) {
        currentChatBarkConfig.value = null;
      }
      
      showToast('Bark 配置已删除', 'success');
      return true;
    } catch (error) {
      console.error('删除Bark配置失败:', error);
      showToast('删除 Bark 配置失败', 'error');
      return false;
    }
  }
  
  // 切换指定公钥的Bark配置启用状态
  async function toggleBarkConfigForPubKey(pubKey: string): Promise<boolean> {
    const config = await getBarkConfigForPubKey(pubKey);
    if (!config) {
      showToast('未找到该公钥的 Bark 配置', 'warning');
      return false;
    }
    
    config.enabled = !config.enabled;
    config.updatedAt = Date.now();
    
    try {
      await savePubKeyBarkConfig(config);
      
      // 更新本地状态
      allBarkConfigs.value = await getAllPubKeyBarkConfigs();
      
      if (pubKey === currentUserPub.value) {
        currentUserBarkConfig.value = config;
      }
      if (pubKey === currentChatPub.value) {
        currentChatBarkConfig.value = config;
      }
      
      showToast(`Bark 通知已${config.enabled ? '启用' : '禁用'}`, 'success');
      return true;
    } catch (error) {
      console.error('切换Bark配置失败:', error);
      showToast('切换 Bark 配置失败', 'error');
      return false;
    }
  }

  // 发送 Bark 远程通知（支持基于公钥的配置）
  async function sendBarkNotification(
    title: string,
    content: string,
    customDeviceKey?: string,
    customServerUrl?: string,
    jumpUrl?: string,
    iconUrl?: string,
    targetPubKey?: string
  ): Promise<boolean> {
    try {
      let finalDeviceKey = customDeviceKey;
      let finalServerUrl = customServerUrl;
      
      // 如果没有自定义参数，尝试使用基于公钥的配置
      if (!finalDeviceKey || !finalServerUrl) {
        let config: PubKeyBarkConfig | null = null;
        
        // 优先使用指定的目标公钥配置
        if (targetPubKey) {
          config = await getBarkConfigForPubKey(targetPubKey);
        }
        // 其次使用当前有效配置
        else if (effectiveBarkConfig.value) {
          config = effectiveBarkConfig.value;
        }
        // 最后使用旧的全局设置
        else {
          const settings = await loadBarkSettings();
          finalDeviceKey = finalDeviceKey || settings.deviceKey;
          finalServerUrl = finalServerUrl || settings.serverUrl;
        }
        
        if (config && config.enabled) {
          finalDeviceKey = finalDeviceKey || config.deviceKey;
          finalServerUrl = finalServerUrl || config.serverUrl;
        }
      }
      
      if (!finalDeviceKey) {
        console.warn('Bark 设备 Key 未配置');
        return false;
      }
      
      // 构建 Bark API URL
      let barkUrl = `${finalServerUrl}/${encodeURIComponent(finalDeviceKey)}/${encodeURIComponent(title)}/${encodeURIComponent(content)}`;
      
      // 添加查询参数
      const params = new URLSearchParams();
      if (jumpUrl && jumpUrl.trim()) {
        params.append('url', jumpUrl.trim());
      }
      if (iconUrl && iconUrl.trim()) {
        params.append('icon', iconUrl.trim());
      }
      
      if (params.toString()) {
        barkUrl += `?${params.toString()}`;
      }
      
      console.log('发送 Bark 通知:', barkUrl);
      
      const response = await axios.get(barkUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10秒超时
      });
      
      if (response.status >= 200 && response.status < 300) {
        console.log('Bark 通知发送成功:', response.data);
        return true;
      } else {
        console.error('Bark 通知发送失败:', response.status, response.data);
        return false;
      }
    } catch (error) {
      console.error('发送 Bark 通知时出错:', error);
      return false;
    }
  }



  // 更新 Bark 配置
  async function updateBarkConfig(
    newEnabled: boolean,
    newServerUrl: string,
    newDeviceKey: string
  ): Promise<void> {
    const settings: BarkSettings = {
      enabled: newEnabled,
      serverUrl: newServerUrl,
      deviceKey: newDeviceKey
    };
    
    enabled.value = newEnabled;
    serverUrl.value = newServerUrl;
    deviceKey.value = newDeviceKey;
    
    await saveBarkSettings(settings);
   showToast(`Bark 通知已${newEnabled ? '启用' : '禁用'}`, 'success');
  }

  // 从 Bark URL 设置配置
  async function setBarkConfigFromUrl(barkUrl: string): Promise<boolean> {
    const parsed = parseBarkUrl(barkUrl);
    if (!parsed) {
      showToast('无效的 Bark URL 格式', 'error');
      return false;
    }
    
    await updateBarkConfig(true, parsed.serverUrl, parsed.deviceKey);
    showToast('Bark 配置已更新', 'success');
    return true;
  }

  // 测试 Bark 通知
  async function testBarkNotification(customTitle?: string, customContent?: string, customUrl?: string, customIcon?: string): Promise<boolean> {
    const title = customTitle ;
    const content = customContent ;
    const success = await sendBarkNotification(title, content, undefined, undefined, customUrl, customIcon);
    if (success) {
      showToast('测试通知发送成功', 'success');
    } else {
      showToast('测试通知发送失败', 'error');
    }
    return success;
  }

  return {
    // 兼容性：原有的全局设置
    enabled,
    serverUrl,
    deviceKey,
    initBarkSettings,
    loadBarkSettings,
    saveBarkSettings,
    updateBarkConfig,
    setBarkConfigFromUrl,
    parseBarkUrl,
    testBarkNotification,
    
    // 新的基于公钥的配置管理
    currentUserBarkConfig,
    currentChatBarkConfig,
    allBarkConfigs,
    effectiveBarkConfig,
    setBarkConfigForPubKey,
    getBarkConfigForPubKey,
    deleteBarkConfigForPubKey,
    toggleBarkConfigForPubKey,
    
    // 增强的通知发送功能
    sendBarkNotification
  };
}

export default useBarkNotification;