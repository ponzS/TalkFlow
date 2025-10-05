import { ref, computed, Ref } from 'vue';
import { gun,peersList,enabledPeers,CreateNewGun} from './useGun'
import * as cryptoJs from 'crypto-js';
import router from '@/router/index';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getCurrentInstance } from 'vue';
import StorageService, { FileData, } from '../services/storageService';
import { v4 as uuidv4 } from 'uuid';
import { toastController } from '@ionic/vue';


// Use Ionic Toast instead of custom Toast
async function showToast(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info', duration: number = 3000) {
  const colorMap = {
    success: 'success',
    warning: 'warning', 
    error: 'danger',
    info: 'primary'
  };
  
  const toast = await toastController.create({
    message,
    duration,
    position: 'top',
    color: colorMap[type],
    buttons: [{
      text: 'Close',
      role: 'cancel'
    }]
  });
  await toast.present();
}
import { sqliteServ, dbVerServ, storageServ } from '../services/globalServices';

// 🆕 用户数据缓存机制
interface UserData {
  pub: string;
  alias: string;
  avatar: string;
  epub: string;
  timestamp: number;
}


// 全局用户数据缓存
const userDataCache = ref<Map<string, UserData>>(new Map());
const CACHE_EXPIRE_TIME = 30 * 60 * 1000; // 30分钟过期

// 统一的用户数据获取函数
const getUserDataOnce = async (pub: string, forceRefresh = false): Promise<UserData> => {
  const cached = userDataCache.value.get(pub);
  const now = Date.now();
  
  if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_EXPIRE_TIME) {
    return cached;
  }
  
  const userData = await fetchUserDataFromGun(pub);
  userDataCache.value.set(pub, { ...userData, timestamp: now });
  return userData;
};

// 从Gun.js获取用户数据的函数
const fetchUserDataFromGun = (pub: string): Promise<UserData> => {
  return new Promise((resolve) => {
    const userData: UserData = { pub, alias: '', avatar: '', epub: '', timestamp: Date.now() };
    gun.get('users').get(pub).once((data: any) => {
      if (data) {
        userData.alias = data.alias || '';
        userData.avatar = data.avatar || '';
        userData.epub = data.epub || '';
      }
      resolve(userData);
    });
  });
};

// 预加载用户数据（在搜索时调用）
const preloadUserData = async (pub: string): Promise<void> => {
  try {
    await getUserDataOnce(pub);
  } catch (error) {
    // 预加载失败不影响主流程
  }
};

// 🆕 自动实时数据保存管理器
class AutoSaveManager {
  private saveQueue: Set<string> = new Set();
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly SAVE_DELAY = 100; // 100ms 防抖延迟
  private readonly MAX_RETRY = 3;
  private isEnabled = true;
  private lastSaveTime = 0;
  private readonly MIN_SAVE_INTERVAL = 50; // 最小保存间隔50ms

  constructor() {
    // 监听页面生命周期事件
    this.setupPageLifecycleHandlers();
  }

  // 设置页面生命周期处理器
  private setupPageLifecycleHandlers(): void {
    // 页面可见性变化时保存
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.forceSave('visibilitychange');
      }
    });

    // 页面卸载前保存
    window.addEventListener('beforeunload', () => {
      this.forceSave('beforeunload');
    });

    // 页面失去焦点时保存
    window.addEventListener('blur', () => {
      this.forceSave('blur');
    });
  }

  // 请求自动保存
  requestSave(operation: string = 'database_operation'): void {
    if (!this.isEnabled) return;

    this.saveQueue.add(operation);
    
    // 清除之前的定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // 设置防抖保存
    this.saveTimer = setTimeout(() => {
      this.performSave();
    }, this.SAVE_DELAY);
  }

  // 强制立即保存
  async forceSave(reason: string = 'force'): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.performSave(reason);
  }

  // 执行保存操作
  private async performSave(reason: string = 'auto'): Promise<void> {
    if (this.saveQueue.size === 0) return;

    const now = Date.now();
    if (now - this.lastSaveTime < this.MIN_SAVE_INTERVAL) {
      // 太频繁，延迟保存
      this.saveTimer = setTimeout(() => this.performSave(reason), this.MIN_SAVE_INTERVAL);
      return;
    }

    const operations = Array.from(this.saveQueue);
    this.saveQueue.clear();
    this.lastSaveTime = now;

    let retryCount = 0;
    while (retryCount < this.MAX_RETRY) {
      try {
        const dbName = storageServ.getDatabaseName();
        await sqliteServ.saveToStore(dbName);
        
        // 保存成功日志（仅在开发模式）
        if (process.env.NODE_ENV === 'development') {
         // console.log(`✅ 自动保存成功 [${reason}]:`, operations.join(', '));
        }
        return;
      } catch (error) {
        retryCount++;
        if (retryCount >= this.MAX_RETRY) {
         // console.error(`❌ 自动保存失败 [${reason}] (重试${this.MAX_RETRY}次):`, error);
          // 保存失败时的应急措施
        //  this.handleSaveFailure(operations, error);
        } else {
          // 指数退避重试
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        }
      }
    }
  }



  // 启用/禁用自动保存
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  // 获取保存统计信息
  getStats(): { enabled: boolean; queueSize: number; lastSaveTime: number } {
    return {
      enabled: this.isEnabled,
      queueSize: this.saveQueue.size,
      lastSaveTime: this.lastSaveTime
    };
  }
}

// 创建全局自动保存管理器实例
const autoSaveManager = new AutoSaveManager();

// 🆕 自动保存包装器 - 包装storageServ的方法以自动触发保存
const createAutoSaveWrapper = () => {
  const originalMethods = {
    insertMessage: storageServ.insertMessage.bind(storageServ),
    updateMessage: storageServ.updateMessage.bind(storageServ),
    saveBuddy: storageServ.saveBuddy.bind(storageServ),
    saveUser: storageServ.saveUser.bind(storageServ),
    saveChatPreview: storageServ.saveChatPreview.bind(storageServ),
    saveFile: storageServ.saveFile.bind(storageServ),
    saveEpub: storageServ.saveEpub.bind(storageServ),
    saveFriendRemark: storageServ.saveFriendRemark.bind(storageServ),
    saveBlacklist: storageServ.saveBlacklist.bind(storageServ),
    saveModalState: storageServ.saveModalState.bind(storageServ),
    saveGroup: storageServ.saveGroup.bind(storageServ),
    saveGroupMember: storageServ.saveGroupMember.bind(storageServ),
    insertGroupMessage: storageServ.insertGroupMessage.bind(storageServ),
    deleteMessage: storageServ.deleteMessage.bind(storageServ),
    deleteChatPreview: storageServ.deleteChatPreview.bind(storageServ),
    deleteGroup: storageServ.deleteGroup.bind(storageServ),
    deleteGroupMember: storageServ.deleteGroupMember.bind(storageServ),
    deleteGroupPreview: storageServ.deleteGroupPreview.bind(storageServ),
    clearGroupMessages: storageServ.clearGroupMessages.bind(storageServ),
    cleanupInvalidGroupMessages: storageServ.cleanupInvalidGroupMessages.bind(storageServ)
  };

  // 包装每个方法以自动触发保存
  const wrapMethod = <T extends (...args: any[]) => Promise<any>>(
    methodName: string,
    originalMethod: T
  ): T => {
    return (async (...args: any[]) => {
      try {
        const result = await originalMethod(...args);
        // 数据库操作成功后请求自动保存
        autoSaveManager.requestSave(methodName);
        return result;
      } catch (error) {
        // 即使操作失败也记录，但不触发保存
     //   console.error(`数据库操作失败 [${methodName}]:`, error);
        throw error;
      }
    }) as T;
  };

  // 返回包装后的storageServ对象
  return {
    ...storageServ,
    insertMessage: wrapMethod('insertMessage', originalMethods.insertMessage),
    updateMessage: wrapMethod('updateMessage', originalMethods.updateMessage),
    saveBuddy: wrapMethod('saveBuddy', originalMethods.saveBuddy),
    saveUser: wrapMethod('saveUser', originalMethods.saveUser),
    saveChatPreview: wrapMethod('saveChatPreview', originalMethods.saveChatPreview),
    saveFile: wrapMethod('saveFile', originalMethods.saveFile),
    saveEpub: wrapMethod('saveEpub', originalMethods.saveEpub),
    saveFriendRemark: wrapMethod('saveFriendRemark', originalMethods.saveFriendRemark),
    saveBlacklist: wrapMethod('saveBlacklist', originalMethods.saveBlacklist),
    saveModalState: wrapMethod('saveModalState', originalMethods.saveModalState),
    saveGroup: wrapMethod('saveGroup', originalMethods.saveGroup),
    saveGroupMember: wrapMethod('saveGroupMember', originalMethods.saveGroupMember),
    insertGroupMessage: wrapMethod('insertGroupMessage', originalMethods.insertGroupMessage),
    deleteMessage: wrapMethod('deleteMessage', originalMethods.deleteMessage),
    deleteChatPreview: wrapMethod('deleteChatPreview', originalMethods.deleteChatPreview),
    deleteGroup: wrapMethod('deleteGroup', originalMethods.deleteGroup),
    deleteGroupMember: wrapMethod('deleteGroupMember', originalMethods.deleteGroupMember),
    deleteGroupPreview: wrapMethod('deleteGroupPreview', originalMethods.deleteGroupPreview),
    clearGroupMessages: wrapMethod('clearGroupMessages', originalMethods.clearGroupMessages),
    cleanupInvalidGroupMessages: wrapMethod('cleanupInvalidGroupMessages', originalMethods.cleanupInvalidGroupMessages),
    // 添加读取方法（这些不需要自动保存）
    getUser: storageServ.getUser.bind(storageServ),
    query: storageServ.query.bind(storageServ),
    getModalState: storageServ.getModalState.bind(storageServ)
  };
};

// 🆕 使用自动保存包装器替换原始storageServ
const autoSaveStorageServ = createAutoSaveWrapper();

// Export the auto-save wrapper for use in other files
export { autoSaveStorageServ };

import { useWebLLMChat } from '@/composables/useWebLLMChat';
import type { ChatRole } from '@/composables/useWebLLMChat';
import { ChatMessage } from '@/types/chat';
import { Capacitor } from '@capacitor/core';
import { settingsService } from '@/services/settingsService';

// Platform detection
const isWebPlatform = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

// localStorage key constants
const STORAGE_KEYS = {
  USER_CREDENTIALS: 'talkflow_user_credentials',
  USER_ALIAS: 'talkflow_user_alias',
  USER_AVATAR: 'talkflow_user_avatar',
  BUDDY_LIST: 'talkflow_buddy_list',
  FRIEND_REMARKS: 'talkflow_friend_remarks',
  CHAT_PREVIEWS: 'talkflow_chat_previews',
  BACKUP_TIMESTAMP: 'talkflow_backup_timestamp'
};

// Save credentials to IndexedDB (web platform only)
const saveCredentialsToDb = async (credentials: string): Promise<void> => {
  if (isWebPlatform()) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, credentials);
      localStorage.setItem(STORAGE_KEYS.BACKUP_TIMESTAMP, new Date().toISOString());
      // Credentials saved to localStorage
      } catch (error) {
        // Failed to save credentials to localStorage
    }
  }
};

// ✅ Temporary credential recovery function - helps read previously encrypted data
const generateLegacyLocalStorageKey = (): string => {
  // Generate key using previous device characteristics
  const stableFeatures = [
    navigator.language || 'en-US',
    new Date().getTimezoneOffset().toString(),
    (navigator.hardwareConcurrency || 4).toString(),
    navigator.platform || 'unknown',
    window.location.hostname
  ];
  
  let hash = 5381;
  const combined = stableFeatures.join('|');
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  
  return 'talkflow_' + Math.abs(hash).toString(36);
};

const decryptLegacyCredentials = (encryptedData: string): string | null => {
  try {
    if (!encryptedData.startsWith('TALKFLOW_ENCRYPTED:')) {
      return encryptedData; // Already plaintext
    }
    
    const actualEncryptedData = encryptedData.substring('TALKFLOW_ENCRYPTED:'.length);
    const key = generateLegacyLocalStorageKey();
    
    const encryptedBytes = new Uint8Array(
      atob(actualEncryptedData)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = new Uint8Array(encryptedBytes.length);
    
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    // Decryption failed
    return null;
  }
};

// Get credentials from IndexedDB (web platform only)
const getCredentialsFromDb = async (): Promise<string | null> => {
  if (isWebPlatform()) {
    try {
      const storedCredentials = localStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);

      if (!storedCredentials) return null;
      
      // ✅ Check if it's encrypted data, if so decrypt and convert to plaintext storage
      if (storedCredentials.startsWith('TALKFLOW_ENCRYPTED:')) {
        // Encrypted credentials detected, decrypting and converting to plaintext storage...
        const decryptedCredentials = decryptLegacyCredentials(storedCredentials);
        
        if (decryptedCredentials) {
          // Convert to plaintext storage
          localStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, decryptedCredentials);
          // ✅ Credentials successfully converted to plaintext storage
          return decryptedCredentials;
        } else {
          // ❌ Credential decryption failed
          return null;
        }
      }
      
      return storedCredentials;
    } catch (error) {
      // Failed to read credentials from localStorage
      return null;
    }
  }
  return null;
};

// Clear credentials from IndexedDB (web platform only)
const clearCredentialsFromDb = async (): Promise<void> => {
  if (isWebPlatform()) {
    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        localStorage.removeItem(key);
      }
      // localStorage user data cleared
    } catch (error) {
      // Failed to clear localStorage user data
    }
  }
};

// ✅ IndexedDB diagnostic tool
const diagnoseDbStorage = async (): Promise<void> => {
  if (!isWebPlatform()) {
    // 🔍 localStorage diagnostic: Non-web platform, skipping check
    return;
  }

  // localStorage credential diagnostic started...
  
  try {
    const credentials = localStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
    
    if (!credentials) {
      // Diagnostic result: No user credentials found
      // Suggestion: Need to re-login to create new identity credentials
      return;
    }
    
    // Credential status:
      // Data length: ${credentials.length} characters
      // Is encrypted: ${credentials.startsWith('TALKFLOW_ENCRYPTED:') ? 'Yes' : 'No'}
    
    const backupTimestamp = localStorage.getItem(STORAGE_KEYS.BACKUP_TIMESTAMP) || 'Unknown';
    // Storage time: ${backupTimestamp}
    
    // 检查是否可以正常读取
    const testRead = await getCredentialsFromDb();
    if (testRead) {
      // ✅ Credentials can be read normally
      try {
        const parsed = JSON.parse(testRead);
        // ✅ JSON parsing successful
          // Included fields: ${Object.keys(parsed).join(', ')}
      } catch {
        // ❌ JSON parsing failed
      }
    } else {
      // ❌ Credential reading failed
    }
    
  } catch (error) {
    // ❌ localStorage diagnostic failed
  }
  
  // 🔍 localStorage credential diagnostic completed
};

// Save user alias to IndexedDB (web platform only)
const saveUserAliasToDb = async (alias: string): Promise<void> => {
  if (isWebPlatform() && alias) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_ALIAS, alias);
      // User alias saved to localStorage
    } catch (error) {
      // Failed to save alias to localStorage
    }
  }
};

// Get user alias from IndexedDB (web platform only)
const getUserAliasFromDb = async (): Promise<string | null> => {
  if (isWebPlatform()) {
    try {
      return localStorage.getItem(STORAGE_KEYS.USER_ALIAS);
    } catch (error) {
      // Failed to read alias from localStorage
      return null;
    }
  }
  return null;
};

// Save user avatar to IndexedDB (web platform only)
const saveUserAvatarToDb = async (avatar: string): Promise<void> => {
  if (isWebPlatform() && avatar) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_AVATAR, avatar);
      // User avatar saved to localStorage
    } catch (error) {
      // Failed to save avatar to localStorage
    }
  }
};

// Get user avatar from IndexedDB (web platform only)
const getUserAvatarFromDb = async (): Promise<string | null> => {
  if (isWebPlatform()) {
    try {
      return localStorage.getItem(STORAGE_KEYS.USER_AVATAR);
    } catch (error) {
      // Failed to read avatar from localStorage
      return null;
    }
  }
  return null;
};

// Save buddy list to IndexedDB (web platform only)
const saveBuddyListToDb = async (buddies: Buddy[]): Promise<void> => {
  if (isWebPlatform() && buddies) {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDDY_LIST, JSON.stringify(buddies));
      // Buddy list saved to localStorage
    } catch (error) {
      // Failed to save buddy list to localStorage
    }
  }
};

// Get buddy list from IndexedDB (web platform only)
const getBuddyListFromDb = async (): Promise<Buddy[]> => {
  if (isWebPlatform()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BUDDY_LIST);
      if (stored) {
        const buddies = JSON.parse(stored) as Buddy[];
        // Restored buddy list from localStorage
        return buddies;
      }
    } catch (error) {
      // Failed to read buddy list from localStorage
    }
  }
  return [];
};

// Save friend remarks to IndexedDB (web platform only)
const saveFriendRemarksToDb = async (remarks: Record<string, { remark: string; remarkInfo: string }>): Promise<void> => {
  if (isWebPlatform() && remarks) {
    try {
      localStorage.setItem(STORAGE_KEYS.FRIEND_REMARKS, JSON.stringify(remarks));
      // Friend remarks saved to localStorage
    } catch (error) {
      // Failed to save friend remarks to localStorage
    }
  }
};

// Get friend remarks from IndexedDB (web platform only)
const getFriendRemarksFromDb = async (): Promise<Record<string, { remark: string; remarkInfo: string }>> => {
  if (isWebPlatform()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FRIEND_REMARKS);
      if (stored) {
        const remarks = JSON.parse(stored);
        // Restored friend remarks from localStorage
        return remarks;
      }
    } catch (error) {
      // Failed to read friend remarks from localStorage
    }
  }
  return {};
};

// Save chat previews to IndexedDB (web platform only)
const saveChatPreviewsToDb = async (previews: ChatPreview[]): Promise<void> => {
  if (isWebPlatform() && previews) {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_PREVIEWS, JSON.stringify(previews));
      // Chat previews saved to localStorage
    } catch (error) {
      // Failed to save chat previews to localStorage
    }
  }
};

// Get chat previews from IndexedDB (web platform only)
const getChatPreviewsFromDb = async (): Promise<ChatPreview[]> => {
  if (isWebPlatform()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_PREVIEWS);
      if (stored) {
        const previews = JSON.parse(stored) as ChatPreview[];
        // Restored chat previews from localStorage
        return previews;
      }
    } catch (error) {
      // Failed to read chat previews from localStorage
    }
  }
  return [];
};


export interface KeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
  alias?: string;
}



// Save deactivated account to SQLite
async function saveDeactivatedAccount(pubKey: string): Promise<void> {
  try {
    await storageServ.run(
      'INSERT OR IGNORE INTO deactivated_accounts (pub_key) VALUES (?)',
      [pubKey]
    );
    // Deactivated account record saved
    } catch (err) {
      // Failed to save deactivated account record
    throw err;
  }
}

declare global {
  interface Window {
    global: Window;
  }
}
if (typeof window.global === 'undefined') {
  window.global = window;
}

// Locally stored messages (including plaintext)
export interface LocalChatMessage {
  id?: number;
  chatID: string;
  from: string;
  type: MessageType;
  text?: string; // Plaintext for local storage only
  audioUrl?: string; // Plaintext for local storage only
  fileId?: string; // Plaintext for local storage only
  content?: string; // Encrypted content for local storage of file messages
  textForBuddy?: string;
  textForMe?: string;
  audioForBuddy?: string;
  audioForMe?: string;
  signature?: string;
  hash?: string;
  timestamp: number;
  msgId: string;
  sent: boolean;
  status: MessageStatus;
  isSending: boolean;
  duration?: number;
  senderAlias?:any;
  justSent?: boolean; // Send success confirmation status, used for checkmark animation

}

// Network stored messages (encrypted data only)
export interface NetworkChatMessage {
  chatID: string;
  from: string;
  type: MessageType;
  textForBuddy?: string; // Encrypted
  textForMe?: string; // Encrypted
  audioForBuddy?: string; // Encrypted
  audioForMe?: string; // Encrypted
  content?: string; // Encrypted content of files
  signature: string;
  hash: string;
  timestamp: number;
  msgId: string;
  duration?: number; 
}

// Message receipt interface
export interface MessageReceipt {
  chatID: string;
  from: string;
  originalMsgId: string;
  receiptTimestamp: number;
  signature: string;
}

export interface Buddy {
  pub: string;
  addedByMe?: boolean;
  timestamp?: number;
  alias?: string;
  avatar?: string;
  epub?: string;
}

// 🔐 Extended buddy interface with verification status support
export interface VerifiedBuddy extends Buddy {
  pub: string;
  addedByMe?: boolean;
  timestamp?: number;
  alias?: string;
  avatar?: string;
  
  // Verification status fields (simplified design)
  epub?: string;                    // Locally cached epub (existence means verified)
  verificationTime?: number;       // Verification timestamp
  lastEpubSync?: number;           // Last epub sync time
  epubSource?: 'local' | 'shared' | 'network'; // epub source
  
  // Connection status
  connectionStatus?: 'online' | 'offline' | 'unknown';
  lastSeen?: number;
  
  // Self-healing mechanism
  syncRetryCount?: number;         // Sync retry count
}

// epub格式验证函数
function isValidEpub(epub: string): boolean {
  if (!epub || typeof epub !== 'string') {
    return false;
  }
  
  // 检查基本长度
  if (epub.length < 20 || epub.length > 2000) {
    return false;
  }
  
  try {
    // 首先尝试解析为JSON
    const parsed = JSON.parse(epub);
    
    // 检查必需字段
    if (!parsed.m || !parsed.s) {
      return false;
    }
    
    return true;
  } catch (error) {
    // 如果不是JSON格式，检查是否是直接的加密公钥格式
    // Gun.SEA的加密公钥通常包含点号分隔符和base64字符
    if (epub.includes('.') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(epub)) {
      return true;
    }
    
    return false;
  }
}

// 📊 Verification status calculation functions
export function isVerified(buddy: VerifiedBuddy): boolean {
  // 检查epub是否存在且有效
  if (!buddy.epub) return false;
  
  // 使用isValidEpub函数验证epub的有效性
  return isValidEpub(buddy.epub);
}

export function needsSync(buddy: VerifiedBuddy): boolean {
  return !buddy.epub && (buddy.syncRetryCount || 0) < 10; // No epub and not exceeding retry limit
}

export function getVerificationStatus(buddy: VerifiedBuddy): 'verified' | 'syncing' | 'unverified' {
  if (isVerified(buddy)) return 'verified';
  if (needsSync(buddy)) return 'syncing';
  return 'unverified';
}

// 🔐 Buddy verification manager
export class BuddyVerificationManager {
  private verificationCache = new Map<string, VerifiedBuddy>();
  
  async updateBuddyVerification(pub: string): Promise<VerifiedBuddy> {
    let buddy = this.verificationCache.get(pub);
    if (!buddy) {
      buddy = await this.loadBuddyFromDB(pub);
    }
    
    // Check local epub
    const localEpub = await this.getLocalEpub(pub);
    if (localEpub) {
      buddy.epub = localEpub;
      buddy.epubSource = 'local';
      buddy.verificationTime = Date.now();
      
      // 🔧 Key: When local epub exists, clean up buddy's epub in shared node
      await this.cleanupBuddyEpubInSharedNode(pub);
      
      this.verificationCache.set(pub, buddy);
      return buddy;
    }
    
    // Try to get epub from shared node
    const sharedEpub = await this.getEpubFromSharedNode(pub);
    if (sharedEpub) {
      buddy.epub = sharedEpub;
      buddy.epubSource = 'shared';
      buddy.verificationTime = Date.now();
      
      // Save to local and clean up buddy's epub in network
      await this.saveEpubLocally(pub, sharedEpub);
      await this.cleanupBuddyEpubInSharedNode(pub);
      
      this.verificationCache.set(pub, buddy);
      return buddy;
    }
    
    // Unverified status - no epub
    this.verificationCache.set(pub, buddy);
    return buddy;
  }
  
  // Generate shared node ID
  private generateSharedNodeId(myPub: string, buddyPub: string): string {
    const pubs = [myPub, buddyPub].sort(); // Ensure consistent order
    return `epub_share_${pubs[0]}_${pubs[1]}`;
  }
  
  // Send own epub to shared node
  async sendEpubToSharedNode(buddyPub: string): Promise<void> {
    if (!currentUserPub.value || !currentUserPair) return;
    
    const sharedNodeId = this.generateSharedNodeId(currentUserPub.value, buddyPub);
    const myEpub = currentUserPair.epub;
    const timestamp = Date.now();
    
    const epubData = {
      from: currentUserPub.value,
      to: buddyPub,
      epub: myEpub,
      timestamp,
      signature: await Gun.SEA.sign(`${myEpub}:${buddyPub}:${timestamp}`, currentUserPair)
    };
    
    // 🌐 Use Gun.js network to store epub data
    gun.get('epub_sharing').get(sharedNodeId).get(currentUserPub.value).put(epubData);
    // Send epub to shared node
  }
  
  // Get buddy's epub from shared node (enhanced security verification)
  private async getEpubFromSharedNode(buddyPub: string): Promise<string | null> {
    if (!currentUserPub.value) return null;
    
    const sharedNodeId = this.generateSharedNodeId(currentUserPub.value, buddyPub);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Timeout getting epub
        resolve(null);
      }, 3000);
      
      gun.get('epub_sharing').get(sharedNodeId).get(buddyPub).once(async (data: any) => {
        clearTimeout(timeout);
        
        try {
          // 1. Basic data validation
          if (!data || !data.epub || !data.from || !data.to || !data.signature || !data.timestamp) {
            // Shared node data incomplete
            resolve(null);
            return;
          }
          
          // 2. Sender and receiver verification
          if (data.from !== buddyPub || data.to !== currentUserPub.value) {
            // Shared node data sender or receiver mismatch
            resolve(null);
            return;
          }
          
          // 3. Timestamp verification (prevent replay attacks)
          const now = Date.now();
          const dataTimestamp = data.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hour validity period
          
          if (!dataTimestamp || typeof dataTimestamp !== 'number') {
            // Shared node data timestamp invalid
            resolve(null);
            return;
          }
          
          if (now - dataTimestamp > maxAge) {
            // Shared node data expired
            resolve(null);
            return;
          }
          
          if (dataTimestamp > now + 60000) { // Allow 1 minute clock skew
            // Shared node data timestamp anomaly (future time)
            resolve(null);
            return;
          }
          
          // 4. epub format verification
          if (!this.isValidEpub(data.epub)) {
            // Shared node epub format invalid
            resolve(null);
            return;
          }
          
          // 5. Content integrity verification (verify signature content)
          const expectedSignContent = `${data.epub}:${data.to}:${data.timestamp}`;
          const isSignatureValid = await Gun.SEA.verify(data.signature, data.from);
          
          if (!isSignatureValid) {
            // Shared node epub signature verification failed
            resolve(null);
            return;
          }
          
          // 6. Public key verification (ensure epub's public key matches sender)
          if (!this.verifyEpubOwnership(data.epub, buddyPub)) {
            // Shared node epub ownership verification failed
            resolve(null);
            return;
          }
          
          // Securely obtained epub from shared node
          resolve(data.epub);
          
        } catch (error) {
          // Error occurred while verifying shared node epub
          resolve(null);
        }
      });
    });
  }
  
  // epub format verification
  private isValidEpub(epub: string): boolean {
    if (!epub || typeof epub !== 'string') {
      return false;
    }
    
    // Check basic epub format (Gun.SEA generated epub is usually base64 encoded JSON)
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(epub);
      
      // Check required fields
      if (!parsed.m || !parsed.s) {
        return false;
      }
      
      // Check reasonable length
      if (epub.length < 100 || epub.length > 2000) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // epub ownership verification
  private verifyEpubOwnership(epub: string, expectedPub: string): boolean {
    try {
      // Parse epub to get public key information
      const parsed = JSON.parse(epub);
      
      // Extract public key from epub (Gun.SEA epub structure)
      if (parsed.m && parsed.m.pub) {
        return parsed.m.pub === expectedPub;
      }
      
      // If unable to verify, temporarily allow pass (backward compatibility)
      return true;
    } catch (error) {
      // epub ownership verification failed
      return false;
    }
  }
  
  // 🔧 Smart cleanup: only clean up buddy's epub (indicates I have obtained buddy's epub)
  async cleanupBuddyEpubInSharedNode(buddyPub: string): Promise<void> {
    if (!currentUserPub.value) return;
    
    const sharedNodeId = this.generateSharedNodeId(currentUserPub.value, buddyPub);
    
    // Only clean up buddy's epub, keep own (until buddy also gets my epub and cleans up)
    gun.get('epub_sharing').get(sharedNodeId).get(buddyPub).put(null);
   // Clean up buddy's epub in shared node
  }
  

  // Helper methods
  private async loadBuddyFromDB(pub: string): Promise<VerifiedBuddy> {
    try {
      const buddies = await storageServ.getBuddies(currentUserPub.value || '');
      const buddy = buddies.find(b => b.pub === pub);
      return buddy ? (buddy as VerifiedBuddy) : {
        pub,
        addedByMe: true,
        timestamp: Date.now(),
        syncRetryCount: 0
      };
    } catch (error) {
      // Failed to load buddy
      return {
        pub,
        addedByMe: true,
        timestamp: Date.now(),
        syncRetryCount: 0
      };
    }
  }
  
  private async getLocalEpub(pub: string): Promise<string | null> {
    // Get epub from cache and database
    const { getUserEpub } = getTalkFlowCore();
    return await getUserEpub(pub);
  }
  
  private async saveEpubLocally(pub: string, epub: string): Promise<void> {
    // Save to cache and database
    await autoSaveStorageServ.saveEpub(pub, epub);
   // Save epub locally
  }
  
  private markVerificationComplete(buddyPub: string): void {
    const buddy = this.verificationCache.get(buddyPub);
    if (buddy && buddy.epub) {
     // Buddy verification complete
      // Here can trigger UI updates or other completion callbacks
    }
  }
}

// 🔄 Auto-healing mechanism manager
export class AutoHealingManager {
  private syncQueue: string[] = [];
  private isProcessing = false;
  private verificationManager = new BuddyVerificationManager();
  
  // Start healing process when user comes online
  async startHealingProcess(): Promise<void> {
    if (!currentUserPub.value) return;
    
  // Start buddy relationship healing process
    
    // 1. Get all buddies that need sync (buddies without epub)
    const unverifiedBuddies = buddyList.value.filter(b => !(b as VerifiedBuddy).epub && ((b as VerifiedBuddy).syncRetryCount || 0) < 10);
    
    // 2. Send own epub to all buddies
    for (const buddy of buddyList.value) {
      await this.verificationManager.sendEpubToSharedNode(buddy.pub);
    }
    
    // 3. Try to get epub of unverified buddies
    this.syncQueue = unverifiedBuddies.map(b => b.pub);
    this.processHealingQueue();
    
 
  }
  
  private async processHealingQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) return;
    
    this.isProcessing = true;
  // Processing healing queue
    
    while (this.syncQueue.length > 0) {
      const buddyPub = this.syncQueue.shift()!;
      
      try {
        await this.healBuddyRelation(buddyPub);
        // Avoid too frequent requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
      // Buddy healing failed
        // Re-queue failed ones for later retry
        this.syncQueue.push(buddyPub);
      }
    }
    
    this.isProcessing = false;
  }
  
  private async healBuddyRelation(buddyPub: string): Promise<void> {
    // 1. Try to update verification status
    const buddy = await this.verificationManager.updateBuddyVerification(buddyPub);
    
    // 2. If still unverified (no epub), continue monitoring
    if (!buddy.epub) {
      this.listenForBuddyEpub(buddyPub);
    }
    
    // 3. Update database
    await this.updateBuddyInDB(buddy);
    
    // 4. Update UI status
    this.updateBuddyInList(buddy);
    
   // Buddy healing complete
  }
  
  // Continuously monitor buddy epub
  private listenForBuddyEpub(buddyPub: string): void {
    if (!currentUserPub.value) return;
    
    const sharedNodeId = this.generateSharedNodeId(currentUserPub.value, buddyPub);
    
    gun.get('epub_sharing').get(sharedNodeId).get(buddyPub).on(async (data: any) => {
      if (data && data.epub && data.from === buddyPub) {
        // Detected buddy's epub
        
        // Verify and save
        const isValid = await Gun.SEA.verify(data.signature, data.from);
        if (isValid) {
          await this.saveEpubAndUpdateStatus(buddyPub, data.epub);
          // Clean up shared node
          await this.verificationManager.cleanupBuddyEpubInSharedNode(buddyPub);
        }
      }
    });
  }
  

  
  // Helper methods
  private generateSharedNodeId(myPub: string, buddyPub: string): string {
    const pubs = [myPub, buddyPub].sort();
    return `epub_share_${pubs[0]}_${pubs[1]}`;
  }
  
  private async saveEpubAndUpdateStatus(buddyPub: string, epub: string): Promise<void> {
    try {
      await autoSaveStorageServ.saveEpub(buddyPub, epub);
      
      // Update verification status in buddy list
      const buddyIndex = buddyList.value.findIndex(b => b.pub === buddyPub);
      if (buddyIndex !== -1) {
        const verifiedBuddy = buddyList.value[buddyIndex] as VerifiedBuddy;
        verifiedBuddy.epub = epub;
        verifiedBuddy.epubSource = 'shared';
        verifiedBuddy.verificationTime = Date.now();
        buddyList.value = [...buddyList.value]; // Trigger reactive update
      }
      
      // Save and update buddy's epub status
    } catch (error) {
      // Failed to save buddy epub
    }
  }
  
  private async updateBuddyInDB(buddy: VerifiedBuddy): Promise<void> {
    try {
      if (currentUserPub.value) {
        await autoSaveStorageServ.saveBuddy(
          currentUserPub.value,
          buddy.pub,
          buddy.addedByMe,
          buddy.timestamp,
          buddy.alias,
          buddy.avatar
        );
      }
    } catch (error) {
      // Failed to update buddy database
    }
  }
  
  private updateBuddyInList(buddy: VerifiedBuddy): void {
    const index = buddyList.value.findIndex(b => b.pub === buddy.pub);
    if (index !== -1) {
      buddyList.value[index] = buddy;
      buddyList.value = [...buddyList.value]; // Trigger reactive update
    }
  }
}



export interface ReceivedRequest {
  from: string;
  message?: string;
  alias?: string;
  avatar?: string;
  epub?: string;
  timestamp?: number;
}

export type MessageType = 'text' | 'voice' | 'file' | 'transcription';
export type MessageStatus = 'pending' | 'sent';

export interface ChatPreview {
  pub: string;
  lastMsg: string;
  lastTime: string;
  hidden: boolean;
  hasNew: boolean;
}

  


const isLargeScreen = ref(window.innerWidth > 768);

const currentComponent = shallowRef('Chat')
const previousComponent = ref('Chat')


const temppub : Ref<string | null> = ref(null);

interface Group {
  name: string;
  pub: string;
  pair: KeyPair;
}

interface Message {
  id: string;
  sender: string;
  senderPub: string;
  text: string;
  timestamp: number;
  formattedTime: string;
}

interface Member {
  pubKey: string;
  alias: string;
  lastActive: number;
  joinedAt: number;
  isOnline: boolean;
}

interface Vote {
  pubKey: string;
  agreed: boolean;
}
// Global state for selected moment
const momentState = reactive({
  selectedMomentId: null as string | null,
  showComments: false,
});

const newGroupName = ref('');
const joinGroupKey = ref('');
const groups = ref<Group[]>([]);
const currentGroup = ref<string | null>(null);
const currentGroupName = ref<string>('');
  const messagesByGroup = ref<{ [groupPub: string]: Message[] }>({});
  
  // Helper function for safely accessing group chat messages
  const safeGetGroupMessages = (groupPub: string): Message[] => {
    if (!messagesByGroup.value[groupPub]) {
      messagesByGroup.value[groupPub] = [];
    }
    return messagesByGroup.value[groupPub];
  };
const membersByGroup = ref<{ [groupPub: string]: Member[] }>({});
const votesByGroup = ref<{ [groupPub: string]: Vote[] }>({});
const newMessage = ref('');
const tempKeyPair = ref<KeyPair | null>(null);
const encryptMessages = ref(true);
const decryptMessages = ref(true);


const hasPadChat = ref('1');
// Persistent message sending queue instance
// Initialize persistent queue - using global singleton
const initializePersistentQueue = async () => {
  const { globalMessageQueue } = await import('@/services/globalServices');
  return globalMessageQueue;
};
// let gun = null

// Traditional queue retained as fallback (deprecated, maintaining compatibility)
const sendQueue: { msg: NetworkChatMessage; resolve: () => void; reject: (err: Error) => void }[] = [];
const MAX_CONCURRENT = 3;
let activeSends = 0;

const isDragging = ref(false);
const showCards = ref(true);
const startY = ref(0);
const translateY = ref(0);
const cardsTranslateY = ref(0);
const velocity = ref(0);
const lastTouchTime = ref(0);
const lastTouchY = ref(0);
const panelVisible = ref(false);
const panelContent = ref<'pubkey' | 'qrcode' | null>(null);
const isLoading = ref(true);
const isLoggedIn: Ref<boolean> = ref(false);
const currentUserPub: Ref<string | null> = ref(null);
const currentUserAlias: Ref<string | null> = ref(null);
const currentUserAlias1: Ref<string | null> = ref(null);
const loginError: Ref<string | null> = ref(null);
const friendRemarks: Ref<Record<string, { remark: string; remarkInfo: string }>> = ref({});
let currentUserPair: any = null;
const isCallWindow = ref(false);
const isCallButton = ref(false);
const KeyDown: Ref<boolean> = ref(false);
const newAlias: Ref<string> = ref('');
const newPassphrase: Ref<string> = ref('');
const generateMsg: Ref<string> = ref('');
const encryptedKeyPair: Ref<string | null> = ref(null);
const passphrase: Ref<string> = ref('');
const encryptedKeyInput: Ref<string> = ref('');
const blockPub: Ref<string> = ref('');
const blacklist: Ref<string[]> = ref([]);
const friendPub: Ref<string> = ref('');
const buddyError: Ref<string> = ref('');
const buddyList: Ref<VerifiedBuddy[]> = ref([]);
const receivedRequests: Ref<ReceivedRequest[]> = ref([]);
const currentChatPub: Ref<string | null> = ref(null);
const newMsg: Ref<string> = ref('');
const chatMessages: Ref<Record<string, LocalChatMessage[]>> = ref({});
const chatListeners: Ref<Record<string, () => void>> = ref({});
const aliasMap: Ref<Record<string, string>> = ref({});
const signatureMap: Ref<Record<string, string>> = ref({});
const deletedRecordsMap: Ref<Record<string, number>> = ref({});
const chatPreviewList: Ref<ChatPreview[]> = ref([]);
const chatChunkRangeMap: Ref<Record<string, { minIndex: number; maxIndex: number }>> = ref({});
const sentMessages: Ref<Set<string>> = ref(new Set());
const offlineNotice: Ref<string | null> = ref(null);
const userAvatars: Ref<Record<string, string>> = ref({});
const selectedFriendPub: Ref<string | null> = ref(null);
const TempLoginValue : Ref<string | null> = ref(null);
  // Listener management

  const activeListeners = new Map<string, () => void>()
const strangerAlias = ref<string | null>(null);
const strangerAvatar = ref<string | null>(null);
  


const user = gun.user();

// 设置Gun实例为全局可访问，供队列服务使用
if (typeof window !== 'undefined') {
  (window as any).gun = gun;
}


// Fullscreen modal window state
const fullscreenModalVisible = ref(false);
async function getMyKeyPair(){
  const credentialsResult = await storageServ.query('SELECT value FROM credentials WHERE key = ?', ['userCredentials']);
    const encryptedCredentials = credentialsResult.values[0].value as string;


  let pair: KeyPair;
  try {
    pair = JSON.parse(encryptedCredentials);
  } catch (e) {
    // Key pair parsing failed
    return null;
  }

  return pair;

} 


export function useChatFlow() {
  const appInstance = getCurrentInstance();
  if (!appInstance) throw new Error('useChatFlow must be called within a Vue component setup');
  const storageServ = appInstance.appContext.config.globalProperties.$storageServ as StorageService;

  function switchTo(componentName: string) {
    if (currentComponent.value === componentName) return
    previousComponent.value = currentComponent.value
    currentComponent.value = componentName
    Haptics.impact({ style: ImpactStyle.Light })
    // 保存导航状态
    saveNavigationState()
  }

  // 保存导航状态到 JSON 文件
  async function saveNavigationState() {
    if (currentUserPub.value) {
      try {
        // 根据当前组件确定 activeTab
        let activeTab = '0' // 默认值
        switch (currentComponent.value) {
          case 'Chat':
            activeTab = '0'
            break
          case 'Contacts':
            activeTab = '1'
            break
          case 'Link':
            activeTab = '2'
            break
          case 'KeyPair':
            activeTab = '3'
            break
          case 'Profile':
            activeTab = '4'
            break
        }
        
        const { navigationStateService } = await import('../services/navigationStateService')
        await navigationStateService.saveNavigationState(
          currentUserPub.value,
          currentComponent.value,
          activeTab
        )
      } catch (error) {
        // Failed to save navigation state
      }
    }
  }

  // Restore navigation state
  async function restoreNavigationState() {
    if (currentUserPub.value) {
      try {
        const { navigationStateService } = await import('../services/navigationStateService')
        const savedState = await navigationStateService.getNavigationState(currentUserPub.value)
        if (savedState) {
          currentComponent.value = savedState.currentComponent
          return {
            currentComponent: savedState.currentComponent,
            activeTab: savedState.activeTab
          }
        }
      } catch (error) {
        // Failed to restore navigation state
      }
    }
    return null
  }
  async function triggerLightHaptic(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      // console.error('Failed to trigger haptic feedback:', error);
    }
  }

  const lastNotifiedTimestamp: Ref<Record<string, number>> = ref({});

  function updatePeers(newPeers: string[]) {
    peersList.value = newPeers;
    // Keep currently enabled nodes, only add new nodes to enabled list
    const newEnabledPeers = [...enabledPeers.value];
    
    // Remove nodes not in the new list
    enabledPeers.value = enabledPeers.value.filter(peer => newPeers.includes(peer));
    
    // Add new nodes to enabled list (enable all new nodes by default)
    newPeers.forEach(peer => {
      if (!enabledPeers.value.includes(peer)) {
        enabledPeers.value.push(peer);
      }
    });
    
    // Update Gun instance peers configuration
    gun.opt({ peers: enabledPeers.value });
    
    //  showToast('The node has been updated', 'success');
    // console.log('Peers updated to:', newPeers);
  }

  const isOpen: Ref<boolean> = ref(false);
  const setOpen = (open: boolean): void => {
    isOpen.value = open;
  };

  function encryptData(data: string, pass: string): string {
    return cryptoJs.AES.encrypt(data, pass).toString();
  }

  function decryptData(encrypted: string, pass: string): string | null {
    try {
      const bytes = cryptoJs.AES.decrypt(encrypted, pass);
      return bytes.toString(cryptoJs.enc.Utf8) || null;
    } catch (err) {
      // console.error('Decryption failed:', err);
      return null;
    }
  }

  function copyPub(pub: string | null): void {
    if (!pub) return;
    navigator.clipboard
      .writeText(pub)
      .then(() => showToast('Copied', 'success'))
      .catch(() => showToast('Failed to copy', 'error'));
  }

  function generateChatId(pubA: string, pubB: string): string {
    return pubA < pubB ? `${pubA}_${pubB}` : `${pubB}_${pubA}`;
  }

  // Public key validation function
  function isValidGunPublicKey(pub: string): boolean {
    try {
      // Gun.SEA 公钥通常是 base64 编码的特定长度
      if (!pub || typeof pub !== 'string') return false;
      if (pub.length < 40 || pub.length > 200) return false;
      // Check if it's valid base64 characters
      if (!/^[A-Za-z0-9+/=]+$/.test(pub)) return false;
      return true;
    } catch {
      return false;
    }
  }

  // Network status check function - using relay connection detection instead of pinging external services
  async function checkNetworkStatus(): Promise<{ available: boolean; message: string }> {
    try {
      // Check basic network connection
      if (!navigator.onLine) {
        return { available: false, message: 'Device offline, please check network connection' };
      }
      
      // Check if there are enabled relay nodes
      if (enabledPeers.value.length === 0) {
        return { available: false, message: 'No enabled relay nodes' };
      }
      
      // Test if at least one relay node is connectable
      const testPromises = enabledPeers.value.slice(0, 3).map(async (peer) => {
        try {
          const tempGun = Gun({ 
            peers: [peer],
            radisk: false,
            localStorage: false 
          });
          
          return new Promise<boolean>((resolve) => {
            let isResolved = false;
            
            const timer = setTimeout(() => {
              if (!isResolved) {
                isResolved = true;
                resolve(false);
              }
            }, 3000);
            
            tempGun.get('~').once(() => {
              if (!isResolved) {
                isResolved = true;
                clearTimeout(timer);
                resolve(true);
              }
            });
          });
        } catch {
          return false;
        }
      });
      
      const results = await Promise.all(testPromises);
      const connectedCount = results.filter(Boolean).length;
      
      if (connectedCount > 0) {
        return { available: true, message: `${connectedCount} relay nodes connectable` };
      } else {
        return { available: false, message: 'All relay nodes connection failed' };
      }
    } catch {
      return { available: false, message: 'Network status check failed' };
    }
  }

  const epubCache: Record<string, string> = {};

  async function fetchUserInfo(pub: string): Promise<{ alias?: string; avatar?: string }> {
    return new Promise((resolve) => {
      gun.get('users').get(pub).once((data: any) => {
        resolve({
          alias: data?.alias || '',
          avatar: data?.avatar || '',

        });
      });
    });
  }

  // 🆕 优化的用户信息获取函数（用于刷新，参考FriendProfile.vue的fetchStrangerData方法）
  async function fetchUserInfoForRefresh(pub: string): Promise<{ alias?: string; avatar?: string }> {
    // 刷新功能应该直接从Gun网络获取最新数据，不使用本地缓存
    console.log(`[fetchUserInfoForRefresh] 从Gun网络刷新用户信息: ${pub}`);
    
    // 🔄 检查实时监听的aliasMap和userAvatars，但要过滤掉空值和Loading状态
    const realtimeAlias = aliasMap.value[pub];
    const realtimeAvatar = userAvatars.value[pub];
    
    // 检查是否有有效的实时数据（昵称或头像至少有一个有效）
    const hasValidAlias = realtimeAlias && realtimeAlias !== 'Loading..' && realtimeAlias.trim() !== '';
    const hasValidAvatar = realtimeAvatar && realtimeAvatar.trim() !== '';
    
    // 如果有完整的实时数据（昵称和头像都有效），直接使用
    if (hasValidAlias && hasValidAvatar) {
      console.log(`[fetchUserInfoForRefresh] 使用完整的实时监听数据: alias="${realtimeAlias}", avatar="有"`);
      return {
        alias: realtimeAlias,
        avatar: realtimeAvatar
      };
    }
    
    // 从Gun网络获取最新用户数据
    //console.log(`[fetchUserInfoForRefresh] 从Gun网络获取数据，当前实时数据: alias="${hasValidAlias ? realtimeAlias : '无'}", avatar="${hasValidAvatar ? '有' : '无'}"`);
    
    try {
      const userData = await fetchUserDataFromGun(pub);
      
      // 合并Gun数据和有效的实时数据
      const finalAlias = userData.alias || (hasValidAlias ? realtimeAlias : '');
      const finalAvatar = userData.avatar || (hasValidAvatar ? realtimeAvatar : '');
      
      // 更新本地缓存
      if (finalAlias) {
        aliasMap.value[pub] = finalAlias;
        userDataCache.value[pub] = {
          ...userDataCache.value[pub],
          alias: finalAlias,
          lastUpdated: Date.now()
        };
      }
      if (finalAvatar) {
        userAvatars.value[pub] = finalAvatar;
      }
      
      console.log(`[fetchUserInfoForRefresh] 成功从Gun获取用户数据:`, userData);
      return {
        alias: finalAlias,
        avatar: finalAvatar
      };
    } catch (error) {
      console.log(`[fetchUserInfoForRefresh] 从Gun获取失败，使用可用的实时数据:`, error);
      
      // 如果有部分有效的实时数据，使用它们
      if (hasValidAlias || hasValidAvatar) {
        return {
          alias: hasValidAlias ? realtimeAlias : '',
          avatar: hasValidAvatar ? realtimeAvatar : ''
        };
      }
    }
    
    // 如果Gun网络获取失败，回退到实时监听数据或本地缓存
    const existingAlias = realtimeAlias || getAliasRealtime(pub);
    const existingAvatar = realtimeAvatar || userAvatars.value[pub];
    
    if (existingAlias || existingAvatar) {
      console.log(`[fetchUserInfoForRefresh] 使用本地缓存数据: alias="${existingAlias || '(空)'}", avatar="${existingAvatar ? '有' : '无'}"`);
      return {
        alias: existingAlias || '',
        avatar: existingAvatar || ''
      };
    }
    
    // 最后回退到SQLite数据库
    try {
      const buddies = await storageServ.getBuddies(currentUserPub.value!);
      const buddy = buddies.find(b => b.pub === pub);
      
      if (buddy) {
        console.log(`[fetchUserInfoForRefresh] 使用SQLite数据库数据`);
        return {
          alias: buddy?.alias || '',
          avatar: buddy?.avatar || ''
        };
      }
    } catch (error) {
      console.error('[fetchUserInfoForRefresh] SQLite获取失败:', error);
    }
    
    // 如果都失败了，返回空值
    console.log(`[fetchUserInfoForRefresh] 所有数据源都失败，返回空值`);
    return { alias: '', avatar: '' };
  }

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString();
  }

  const showUserCard: Ref<boolean> = ref(false);
  const lastReadTimestamps: Ref<Record<string, number>> = ref({});
  const isLoadingHistory: Ref<boolean> = ref(false);
  const chatListRef: Ref<HTMLDivElement | null> = ref(null);
  const LoginData = computed(() => ({
    isLoggedIn: isLoggedIn.value,
    currentUserPub: currentUserPub.value,
    loginError: loginError.value,
  }));

  if (!Gun.SEA) throw new Error('SEA Unable to enable');



  async function generateKeyPair(): Promise<void> {
    const alias = newAlias.value.trim();

    const MAX_RETRIES = 5;
    let retries = 0;
    let unique = false;
    let pair: any = null;
    let existingPubKeys: Set<string> = new Set();

    while (!unique && retries < MAX_RETRIES) {
      try {
        pair = await Promise.race([
          Gun.SEA.pair(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('warning-Overrun')), 5000)),
        ]);
        if (!pair || !pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
          throw new Error('SEA.pair The necessary fields are missing,please try agin.');
        }
        if (!existingPubKeys.has(pair.pub)) {
          unique = true;
        
        } else {
          retries++;
        //  showToast(`Build identity conflicts, please try again. (${retries}/${MAX_RETRIES})`, 'warning');
        }
      } catch (err) {
        retries++;
        generateMsg.value = err instanceof Error ? err.message : 'Failed to generate key pairs';
    //    showToast(generateMsg.value, 'error');
        if (retries >= MAX_RETRIES) return;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!unique || !pair) {
      generateMsg.value = 'Unable to generate the key, please try again.';
   //   showToast(generateMsg.value, 'error');
      return;
    }

    //  const dataStr = JSON.stringify({ ...pair, alias });
    const encrypted = JSON.stringify({ ...pair, alias });
    encryptedKeyPair.value = encrypted;
    

    temppub.value = pair.pub
    TempLoginValue.value = pair.value

    generateMsg.value = 'The key is successfully generated. Please copy and save the encrypted private key and the decryption password you set, and provide it only once.';

    KeyDown.value = true;
  
  }




  async function simpleLogin(TempLoginKey: any){

  const decrypted = TempLoginKey!;
  if (!decrypted) {
    loginError.value = 'Decryption failure or incorrect password';

    return;
  }
  let pair: any;
  try {
    pair = JSON.parse(decrypted);
  } catch (e) {
    loginError.value = 'Decryption is successful, but the key format is wrong.';

    return;
  }
  if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
    loginError.value = 'The key pair is incomplete.';

    return;
  }
  await new Promise<void>((resolve, reject) => {
    user.auth(pair, async (ack: any) => {
      if (ack.err) {
        loginError.value = ack.err;
   
        isLoggedIn.value = false;
        reject(new Error(ack.err));
      } else {
        loginError.value = null;
        isLoggedIn.value = true;
        currentUserPub.value = pair.pub;
         currentUserPair = pair;

        let userData = ref('') as any;
        if (!userData) {
          await autoSaveStorageServ.saveUser(pair.pub, pair.alias || 'No Name', undefined, pair);
           userData = await storageServ.getUser(pair.pub);
        }
        currentUserAlias.value = pair.alias || '';
        userAvatars.value[pair.pub] = userData!.avatar || '';
        currentUserAlias1.value = '';

//           await storageServ.run(
//   'INSERT INTO users (pubKey, alias, priv, epub, epriv) VALUES (?, ?, ?, ?, ?)',
//   [pair.pub, pair.alias, pair.priv, pair.epub, pair.epriv]
// );


const encryptedCredentials = TempLoginKey;

  await storageServ.run('INSERT OR REPLACE INTO credentials (key, value) VALUES (?, ?)', ['userCredentials', encryptedCredentials]);
        // Also save to IndexedDB (web version only)
        await saveCredentialsToDb(encryptedCredentials);
        // Backup alias and avatar to IndexedDB (web version only)
        if (currentUserAlias.value) {
          await saveUserAliasToDb(currentUserAlias.value);
        }
        if (userData?.avatar) {
          await saveUserAvatarToDb(userData.avatar);
        }
        // await storageServ.run('INSERT OR REPLACE INTO credentials (key, value) VALUES (?, ?)', ['userCredentials', pair]);
        router.replace('/index');

        gun.get('users').get(pair.pub).put({ epub: pair.epub, alias: currentUserAlias.value });
        gun.get('users').get(pair.pub).once((data: any) => {
          if (data?.alias && data.alias !== currentUserAlias.value) {
            currentUserAlias.value = data.alias;
            storageServ.saveUser(pair.pub, data.alias, userAvatars.value[pair.pub]);
          }
          if (data?.signature) currentUserAlias1.value = data.signature;
          if (data?.avatar) userAvatars.value[pair.pub] = data.avatar;
        });

        buddyList.value = await loadBuddies(pair.pub);
        // Buddy List loaded in simpleLogin
        chatPreviewList.value = await restoreChatPreviews(pair.pub);
        friendRemarks.value = await storageServ.getFriendRemarks(pair.pub);
        blacklist.value = await storageServ.getBlacklist();
        setupListeners(pair.pub);

       encryptedKeyInput.value = '';
        router.replace('/index');
        resolve();
      }
    });
  });

  }



  async function importKeyPair(): Promise<void> {
    if (!encryptedKeyInput.value.trim()) {
      loginError.value = 'Please fill in the decryption password and encryption private key.';
    //  showToast(loginError.value, 'warning');
      return;
    }
    const decrypted = encryptedKeyInput.value.trim();
    if (!decrypted) {
      loginError.value = 'Decryption failure or incorrect password';
    //  showToast(loginError.value, 'error');
      return;
    }
    let pair: any;
    
    try {
      pair = JSON.parse(decrypted);
    } catch (e) {
      loginError.value = 'Decryption is successful, but the key format is wrong.';
      return;
    }
    if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
      loginError.value = 'The key pair is incomplete.';
   //   showToast(loginError.value, 'error');
      return;
    }
// Check if account has been deleted
// const isDeactivated = await isAccountDeactivated(pair.pub);

// if (isDeactivated) {
//   loginError.value = 'The account does not exist.';
//  // showToast(loginError.value, 'error');
//   return;
// }
    await new Promise<void>((resolve, reject) => {
      user.auth(pair, async (ack: any) => {
        if (ack.err) {
          loginError.value = ack.err;
       //   showToast(`Login failed: ${ack.err}`, 'error');
          isLoggedIn.value = false;
          reject(new Error(ack.err));
        } else {
          loginError.value = null;
          isLoggedIn.value = true;
          currentUserPub.value = pair.pub;
           currentUserPair = pair;

          let userData = await storageServ.getUser(pair.pub);
          if (!userData) {
            await autoSaveStorageServ.saveUser(pair.pub, pair.alias || 'No Name', undefined);
            userData = await storageServ.getUser(pair.pub);
          }
          currentUserAlias.value = userData!.alias || '';
          userAvatars.value[pair.pub] = userData!.avatar || '';
          currentUserAlias1.value = '';

//           await storageServ.run(
//   'INSERT INTO users (pubKey, alias, priv, epub, epriv) VALUES (?, ?, ?, ?, ?)',
//   [pair.pub, pair.alias, pair.priv, pair.epub, pair.epriv]
// );


const encryptedCredentials = TempLoginValue.value!;

await storageServ.run('INSERT OR REPLACE INTO credentials (key, value) VALUES (?, ?)', ['userCredentials', encryptedCredentials]);
          // Also save to IndexedDB (web version only)
          await saveCredentialsToDb(encryptedCredentials);
          // Backup alias and avatar to IndexedDB (web version only)
          if (userData?.alias) {
            await saveUserAliasToDb(userData.alias);
          }
          if (userData?.avatar) {
            await saveUserAvatarToDb(userData.avatar);
          }
          // await storageServ.run('INSERT OR REPLACE INTO credentials (key, value) VALUES (?, ?)', ['userCredentials', pair]);


          gun.get('users').get(pair.pub).put({ epub: pair.epub, alias: currentUserAlias.value });
          gun.get('users').get(pair.pub).once((data: any) => {
            if (data?.alias && data.alias !== currentUserAlias.value) {
              currentUserAlias.value = data.alias;
              storageServ.saveUser(pair.pub, data.alias, userAvatars.value[pair.pub]);
            }
            if (data?.signature) currentUserAlias1.value = data.signature;
            if (data?.avatar) userAvatars.value[pair.pub] = data.avatar;
          });

          buddyList.value = await loadBuddies(pair.pub);
          // Buddy List loaded in importKeyPair
          chatPreviewList.value = await restoreChatPreviews(pair.pub);
          friendRemarks.value = await storageServ.getFriendRemarks(pair.pub);
          blacklist.value = await storageServ.getBlacklist();
          setupListeners(pair.pub);

       
          encryptedKeyInput.value = '';
          router.replace('/index');
          resolve();
        }
      });
    });
  }

 




  async function restoreLoginState(): Promise<void> {
    // console.log('Restoring login state...');
    
    try {

    // await initializeDatabase();

      // 1. Load credentials from local database
      let encryptedCredentials = await getCredentialsFromDb();
      
      if (!encryptedCredentials) {
        // Credentials not found in localStorage, trying to load from SQLite
        const credentialsResult = await storageServ.query('SELECT value FROM credentials WHERE key = ?', ['userCredentials']);
        
        if (credentialsResult.values && credentialsResult.values.length > 0) {
          encryptedCredentials = credentialsResult.values[0].value as string;
          // Successfully loaded credentials from SQLite database, syncing to localStorage
          await saveCredentialsToDb(encryptedCredentials);
        } else {
          // Credentials not found in SQLite either, login restoration terminated
          return;
        }
      }
      
      // 2. Decrypt credentials
   
      
      const pair: any = JSON.parse(encryptedCredentials);
      if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
       // console.log('Key pair incomplete, login restoration terminated');
        return;
      }
  
      // Prevent recursion and stack overflow
      const safeSetUserData = () => {
        user.auth(pair); // Avoid sometimes not being found when searched, so verify identity on the network every restart.
        isLoggedIn.value = true;
        currentUserPub.value = pair.pub;
         currentUserPair = pair;
      };
      
      // Safe call to avoid stack overflow
      try {
        safeSetUserData();
      } catch (e) {
       // console.warn('Error occurred while setting user status, retrying...', e);
        setTimeout(safeSetUserData, 0);
      }
  
      
      try {
        const userData = await storageServ.getUser(pair.pub);
        if (userData) {
          currentUserAlias.value = userData.alias || pair.alias || '';
          userAvatars.value[pair.pub] = userData.avatar || '';
          // currentUserAlias1.value = userData.signature || '';
          // Restored user data from SQLite
        } else {
          // If no local user data, try multiple ways to restore
          let aliasToUse = pair.alias || '';
          let avatarToUse = '';
          
          // Try to restore alias and avatar from IndexedDB (web version only)
          const localAlias = await getUserAliasFromDb();
          const localAvatar = await getUserAvatarFromDb();
          
          if (localAlias) {
            aliasToUse = localAlias;
            // Restored alias from IndexedDB
          }
          
          if (localAvatar) {
            avatarToUse = localAvatar;
            // Restored avatar from IndexedDB
          }
          
          currentUserAlias.value = aliasToUse;
          userAvatars.value[pair.pub] = avatarToUse;
          
          // User data not found in SQLite, using backup data
          
          // Save user data to SQLite for next use
          if (aliasToUse || avatarToUse) {
            await autoSaveStorageServ.saveUser(pair.pub, aliasToUse, avatarToUse, pair);
            // Backup user data saved to SQLite
          }
        }
        
        // Asynchronously sync latest user info from network (non-blocking login process)
        setTimeout(async () => {
          gun.get('users').get(pair.pub).put({ epub: pair.epub, alias: currentUserAlias.value });
          try {
            gun.get('users').get(pair.pub).once(async (data: any) => {
                             if (data?.alias && data.alias !== currentUserAlias.value) {
                 // Synced updated alias from network
                 currentUserAlias.value = data.alias;
                 await autoSaveStorageServ.saveUser(pair.pub, data.alias, userAvatars.value[pair.pub], pair);
                 // Also update to IndexedDB (web version only)
                 await saveUserAliasToDb(data.alias);
               }
               if (data?.signature) {
                 currentUserAlias1.value = data.signature;
               }
               if (data?.avatar && data.avatar !== userAvatars.value[pair.pub]) {
                 // Synced updated avatar from network
                 userAvatars.value[pair.pub] = data.avatar;
                 await autoSaveStorageServ.saveUser(pair.pub, currentUserAlias.value, data.avatar, pair);
                 // Also update to IndexedDB (web version only)
                 await saveUserAvatarToDb(data.avatar);
               }
            });
          } catch (syncError) {
            // Failed to sync user info from network
          }
        }, 1000);
        
      } catch (e) {
        gun.get('users').get(pair.pub).put({ epub: pair.epub, alias: currentUserAlias.value });
        // Failed to load user data, using alias from credentials
        // Even if loading fails, try to use alias from credentials
        currentUserAlias.value = pair.alias || '';
      }
  

      
      try {
        // Try to load data from SQLite
        let [buddies, remarks, previews, blockedUsers] = await Promise.all([
          loadBuddies(pair.pub).catch(e => { 
            // Failed to load buddy list from SQLite 
            return []; 
          }),
          storageServ.getFriendRemarks(pair.pub).catch(e => { 
            // Failed to load friend remarks from SQLite 
            return {}; 
          }),
          restoreChatPreviews(pair.pub).catch(e => { 
            // Failed to load chat previews from SQLite 
            return []; 
          }),
          storageServ.getBlacklist().catch(e => { 
             // Failed to load blacklist from SQLite 
             return []; 
           })
        ]);

        // If SQLite data is empty, try to restore from IndexedDB (web version only)
        if (buddies.length === 0 && isWebPlatform()) {
          const localBuddies = await getBuddyListFromDb();
          if (localBuddies.length > 0) {
            buddies = localBuddies;
            // console.log('Successfully restored buddy list from IndexedDB');
            // Asynchronously sync back to SQLite
            setTimeout(async () => {
              try {
                for (const buddy of buddies) {
                  await autoSaveStorageServ.saveBuddy(pair.pub, buddy.pub, buddy.timestamp, buddy.alias, buddy.avatar);
                }
                // console.log('Buddy list synced back to SQLite');
              } catch (syncError) {
                // console.warn('Failed to sync buddy list to SQLite:', syncError);
              }
            }, 0);
          }
        }

        if (Object.keys(remarks).length === 0 && isWebPlatform()) {
          const localRemarks = await getFriendRemarksFromDb();
          if (Object.keys(localRemarks).length > 0) {
            remarks = localRemarks;
            // console.log('Successfully restored friend remarks from IndexedDB');
            // Asynchronously sync back to SQLite
            setTimeout(async () => {
              try {
                for (const [friendPub, remarkData] of Object.entries(remarks)) {
                  await autoSaveStorageServ.saveFriendRemark(pair.pub, friendPub, remarkData.remark, remarkData.remarkInfo);
                }
                // console.log('Friend remarks synced back to SQLite');
              } catch (syncError) {
                // console.warn('Failed to sync friend remarks to SQLite:', syncError);
              }
            }, 0);
          }
        }

        if (previews.length === 0 && isWebPlatform()) {
          const localPreviews = await getChatPreviewsFromDb();
          if (localPreviews.length > 0) {
            previews = localPreviews;
            // console.log('Successfully restored chat previews from IndexedDB');
            // Asynchronously sync back to SQLite
            setTimeout(async () => {
              try {
                for (const preview of previews) {
                  await autoSaveStorageServ.saveChatPreview(preview);
                }
                // console.log('Chat previews synced back to SQLite');
              } catch (syncError) {
                // console.warn('Failed to sync chat previews to SQLite:', syncError);
              }
            }, 0);
          }
        }
  
        buddyList.value = buddies;
        friendRemarks.value = remarks;
        chatPreviewList.value = previews;
        blacklist.value = blockedUsers;
        
        // console.log(`Loaded ${buddies.length} buddies and ${previews.length} chat previews`);
        
        // Immediately backup to IndexedDB after successful login (web version only)
        await saveBuddyListToDb(buddies);
        await saveFriendRemarksToDb(remarks);
        await saveChatPreviewsToDb(previews);
        gun.get('users').get(pair.pub).put({ epub: pair.epub, alias: currentUserAlias.value });
      } catch (e) {
        // console.warn('Error occurred while loading local data in parallel', e);
      }


  
      try {
        const safeSetupListeners = () => {
          try {
            setupListeners(pair.pub);
          } catch (e) {
         //   console.warn('Failed to setup listeners, app may lack some real-time features', e);
          }
        };
        
        // 使用 setTimeout 避免潜在的堆栈溢出
        setTimeout(safeSetupListeners, 100);
      } catch (e) {
     //   console.warn('Failed to schedule listener setup', e);
      }
  

      // 9. 导航到主页
    //  console.log('Restoration complete, navigating to homepage');
      router.replace('/');
      
      // 9. Background loading of deletion timestamps (non-critical operation)
      setTimeout(() => {
        try {
        //  console.log('Background loading chat deletion timestamps...');
          Promise.all(buddyList.value.map(buddy => {
            return new Promise<void>(resolve => {
              const chatId = generateChatId(pair.pub, buddy.pub);
              deletedRecordsMap.value[chatId] = 0; // 默认值
              
              // 设置超时，防止无限等待
              const timeout = setTimeout(() => {
              // Loading deletion timestamp for chat timed out
                resolve();
              }, 3000);
              
              try {
                gun.get('chats').get(chatId).get('deleted').get(pair.pub).once((val: any) => {
                  clearTimeout(timeout);
                  if (typeof val === 'number') {
                    deletedRecordsMap.value[chatId] = val;
                  }
                  resolve();
                });
              } catch (e) {
          // Failed to get deletion timestamp for chat
                clearTimeout(timeout);
                resolve();
              }
            });
          }))
          .then(() => {/* All deletion timestamps loaded */})
          .catch(err => {/* Error occurred while loading deletion timestamps */});
        } catch (e) {
      //    console.warn('Failed to initialize deletion timestamp loading', e);
        }
      }, 500);
      
    } catch (error) {
      // Ensure any errors don't cause app crash
  //    console.error('Error occurred during login state restoration:', error);
      isLoggedIn.value = false;
      
      // Optional: log error for subsequent diagnosis
      try {
        localStorage.setItem('last_login_error', JSON.stringify({
          time: new Date().toISOString(),
          error: error?.toString() || 'Unknown error'
        }));
      } catch (e) {}
    }
  }

  async function loadBuddies(userPub: string): Promise<VerifiedBuddy[]> {
    try {
      const buddies = await storageServ.getBuddies(userPub);
      
      // 🔄 将Buddy转换为VerifiedBuddy并同步验证状态
      const verifiedBuddies: VerifiedBuddy[] = await Promise.all(
        buddies.map(async (buddy) => {
          const verifiedBuddy: VerifiedBuddy = {
            ...buddy,
            epubSource: 'network',
            connectionStatus: 'unknown',
            syncRetryCount: 0
          };
          
          // 🔐 检查epub - 使用与发送消息相同的三级缓存机制
          try {
            // 先检查当前epub状态，以便准确判断来源
            const wasInCache = !!epubCache[buddy.pub];
            const wasInDB = !!(await storageServ.getEpub(buddy.pub));
            
            // 🚀 统一使用getUserEpub，确保与发送消息的epub获取逻辑完全一致
            const buddyEpub = await getUserEpub(buddy.pub);
            if (buddyEpub) {
              verifiedBuddy.epub = buddyEpub;
              // 准确判断epub来源
              if (wasInCache) {
                verifiedBuddy.epubSource = 'local'; // 来自内存缓存
              } else if (wasInDB) {
                verifiedBuddy.epubSource = 'local'; // 来自数据库
              } else {
                verifiedBuddy.epubSource = 'network'; // 刚从网络获取
              }
              verifiedBuddy.verificationTime = Date.now();
              // Buddy epub confirmed, verification status: verified
            } else {
              // Buddy has no epub, status: pending verification
            }
          } catch (error) {
            // Failed to check buddy epub
          }
          
          return verifiedBuddy;
        })
      );
      
      // Loaded buddies with verification status
      return verifiedBuddies;
    } catch (err) {
      // Failed to load buddies
      return [];
    }
  }

  // 🔄 Real-time epub status sync function
  async function syncEpubStatusForBuddy(buddyPub: string): Promise<void> {
    const buddyIndex = buddyList.value.findIndex(b => b.pub === buddyPub);
    if (buddyIndex === -1) return;
    
    const buddy = buddyList.value[buddyIndex] as VerifiedBuddy;
    
    // 🔍 直接检查缓存和数据库（避免递归调用getUserEpub）
    let currentEpub = epubCache[buddyPub];
    if (!currentEpub) {
      try {
        currentEpub = await storageServ.getEpub(buddyPub);
        if (currentEpub) {
          epubCache[buddyPub] = currentEpub;
        }
      } catch (error) {
        // Failed to check buddy epub
        return;
      }
    }
    
    const wasVerified = isVerified(buddy);
    let hasChanged = false;
    
    if (currentEpub && !wasVerified) {
      // From unverified to verified
      buddy.epub = currentEpub;
      buddy.epubSource = 'local';
      buddy.verificationTime = Date.now();
      hasChanged = true;
      // Buddy verification status updated: unverified → verified
    } else if (!currentEpub && wasVerified) {
      // From verified to unverified (rare case)
      buddy.epub = undefined;
      buddy.epubSource = 'network';
      buddy.verificationTime = undefined;
      hasChanged = true;
      // Buddy verification status updated: verified → unverified
    }
    
    // 🔄 If there are changes, forcefully trigger reactive updates
    if (hasChanged) {
      // Update object in array
      buddyList.value[buddyIndex] = { ...buddy };
      // Trigger reactive update of array
      buddyList.value = [...buddyList.value];
      
      // Force refresh UI status for buddy
    }
  }

  // 🚫 Emergency performance fix: optimize batch sync mechanism
  async function syncAllBuddiesEpubStatus(): Promise<void> {
    // Starting optimized batch sync
    
    // ⚠️ Emergency performance fix: limit sync count to avoid performance issues
    const maxSyncCount = 5; // Maximum 5 buddies synced at once
    const needsSyncBuddies = buddyList.value
      .filter(buddy => !(buddy as VerifiedBuddy).epub)
      .slice(0, maxSyncCount);
    
    if (needsSyncBuddies.length === 0) {
      // All buddies verified, skipping sync
      return;
    }
    
    // Syncing unverified buddies with limit
    
    // 🚫 Serial processing instead of parallel to avoid resource contention
    for (const buddy of needsSyncBuddies) {
      try {
        await syncEpubStatusForBuddy(buddy.pub);
        // Small delay to avoid blocking UI
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Failed to sync buddy
      }
    }
    
   
  }









  async function getUserEpub(pub: string): Promise<string | null> {
    // 1. Check memory cache
    if (epubCache[pub]) {
      return epubCache[pub];
    }
    
    // 2. 优先从本地数据库获取epub
    const localEpub = await storageServ.getEpub(pub);
    if (localEpub) {
      epubCache[pub] = localEpub;
      // 🔄 Debounced sync UI state (avoid frequent calls)
    
      return localEpub;
    }
  
    // 3. 只有在本地数据库没有epub时才从网络获取
    const maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries) {
      const epub = await new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => resolve(null), 2000);
        gun.get('users').get(pub).get('epub').once(async (data: any, key: string) => {
          clearTimeout(timeout);
          // 对于 gun.get('users').get(pub).get('epub')，我们需要的是data，不是key
          // 但是需要确保data是字符串类型的epub值
          let epubVal: string | undefined;
          
          if (typeof data === 'string') {
            epubVal = data;
          } else if (data && typeof data === 'object') {
            // 如果data是对象，遍历所有属性寻找有效的epub值
            // 优先查找 epub 字段
            if (data.epub && typeof data.epub === 'string' && isValidEpub(data.epub)) {
              epubVal = data.epub;
            } else {
              // 遍历对象的所有字符串属性，寻找有效的epub值
              for (const [objKey, objValue] of Object.entries(data)) {
                if (typeof objValue === 'string' && isValidEpub(objValue)) {
                  epubVal = objValue;
                  console.log(`Found valid epub in field '${objKey}':`, objValue.substring(0, 50) + '...');
                  break;
                }
              }
            }
          } else {
            epubVal = undefined;
          }
          
          // 添加调试日志
          console.log('getUserEpub - Gun data received:', {
            pub,
            dataType: typeof data,
            keyType: typeof key,
            dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'N/A',
            epubVal: epubVal?.substring(0, 50) + '...',
            isValidEpub: epubVal ? isValidEpub(epubVal) : false
          });
          
          // 验证获取到的epub是否为有效的加密公钥格式
          if (epubVal && isValidEpub(epubVal)) {
            epubCache[pub] = epubVal;
            // 使用storageServ.saveEpub同步保存到本地数据库
            await storageServ.saveEpub(pub, epubVal);
            resolve(epubVal);
          } else {
            resolve(null);
          }
        });
      });
      if (epub) {
 
        return epub;
      }
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    return null;
  }
  async function refreshBuddyList(): Promise<void> {
    if (!currentUserPub.value) return;
    const myPub = currentUserPub.value;
    for (const buddy of buddyList.value) {
      const data = await fetchUserInfoForRefresh(buddy.pub);
      buddy.alias = data.alias;
      buddy.avatar = data.avatar;
      await autoSaveStorageServ.saveBuddy(myPub, buddy.pub, buddy.timestamp, data.alias, data.avatar);
    }
    buddyList.value = [...buddyList.value];
  //  showToast('friend list updated', 'success');
  }

  /**
   * 刷新整个通讯录的昵称和头像
   * 强制从Gun网络获取最新数据并保存到本地
   */
  async function refreshContactsFromGun(): Promise<void> {
    if (!currentUserPub.value) {
      //console.warn('[refreshContactsFromGun] 当前用户未登录');
      return;
    }

    const myPub = currentUserPub.value;
    
    // 🔄 首先重新从数据库加载最新的好友列表
   // console.log('[refreshContactsFromGun] 重新加载好友列表...');
    buddyList.value = await storageServ.getBuddies(myPub);
    
    const totalBuddies = buddyList.value.length;
    
    if (totalBuddies === 0) {
      //console.log('[refreshContactsFromGun] 通讯录为空，无需刷新');
      //showToast('通讯录为空', 'info');
      return;
    }

    //console.log(`[refreshContactsFromGun] 开始强制刷新 ${totalBuddies} 个联系人的信息`);
    
    let successCount = 0;
    let failCount = 0;
    let cacheHitCount = 0;

    // 并发处理所有好友，但限制并发数量避免过载
    const concurrencyLimit = 100;
    const chunks = [];
    for (let i = 0; i < buddyList.value.length; i += concurrencyLimit) {
      chunks.push(buddyList.value.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (buddy) => {
        try {
          // 使用fetchUserInfoForRefresh获取最新用户数据，它有更好的回退机制
          const userData = await fetchUserInfoForRefresh(buddy.pub);
          
          // 调试日志：显示获取到的数据
        //  console.log(`[refreshContactsFromGun] 获取数据: ${buddy.pub.slice(0,8)}... 本地昵称:"${buddy.alias || '(空)'}", 刷新昵称:"${userData.alias || '(空)'}", 本地头像:"${buddy.avatar ? '有' : '无'}", 刷新头像:"${userData.avatar ? '有' : '无'}"`);
          
          let updated = false;
          let newAlias = buddy.alias;
          let newAvatar = buddy.avatar;

          // 检查昵称更新（特别处理空昵称的情况）
          if (userData.alias && userData.alias.trim() !== '' && userData.alias !== buddy.alias) {
            newAlias = userData.alias;
            buddy.alias = userData.alias;
            updated = true;
         //   console.log(`[refreshContactsFromGun] 更新昵称: ${buddy.pub.slice(0,8)}... "${buddy.alias || '(空)'}" -> "${userData.alias}"`);
          }

          // 检查头像更新（特别处理空头像的情况）
          if (userData.avatar && userData.avatar.trim() !== '' && userData.avatar !== buddy.avatar) {
            newAvatar = userData.avatar;
            buddy.avatar = userData.avatar;
            // 同时更新内存中的头像缓存
            userAvatars.value[buddy.pub] = userData.avatar;
            updated = true;
          //  console.log(`[refreshContactsFromGun] 更新头像: ${buddy.pub.slice(0,8)}...`);
          }

          // 如果有更新，保存到数据库
          if (updated) {
            await autoSaveStorageServ.saveBuddy(
              myPub, 
              buddy.pub, 
              buddy.timestamp, 
              newAlias, 
              newAvatar
            );
            successCount++;
          } else {
            // 即使没有更新，也算作成功获取到数据
            cacheHitCount++;
          }

        } catch (error) {
         // console.error(`[refreshContactsFromGun] 刷新失败: ${buddy.pub.slice(0,8)}...`, error);
          failCount++;
        }
      }));
    }

    // 触发响应式更新
    buddyList.value = [...buddyList.value];

   // console.log(`[refreshContactsFromGun] 刷新完成: 更新 ${successCount}/${totalBuddies}, 无变化 ${cacheHitCount}, 失败 ${failCount}`);
    
    // 显示结果提示
    if (successCount > 0) {
     // showToast(`通讯录刷新完成: 更新了 ${successCount} 个联系人`, 'success');
    } else if (failCount === 0) {
    //  showToast(`通讯录刷新完成: 所有 ${totalBuddies} 个联系人信息已是最新`, 'success');
    } else {
     // showToast(`刷新完成: 成功 ${successCount + cacheHitCount}/${totalBuddies}, 失败 ${failCount}`, 'warning');
    }
  }

  function updateFriendRemark(friendPub: string, remark: string, remarkInfo: string): void {
    if (!currentUserPub.value) return;
    friendRemarks.value[friendPub] = { remark, remarkInfo };
    storageServ.saveFriendRemark(currentUserPub.value, friendPub, remark, remarkInfo);
    // Backup friend remarks to IndexedDB (web version only)
    saveFriendRemarksToDb(friendRemarks.value);
  }

  function getAliasRealtime(pub: string): string {
    const remark = friendRemarks.value[pub]?.remark;
    const buddy = buddyList.value.find(b => b.pub === pub);
    return remark && remark.trim() !== '' ? remark : buddy?.alias || aliasMap.value[pub] || '';
  }

  function getAliasRealtime1(pub: string): string {
    const buddy = buddyList.value.find(b => b.pub === pub);
    return buddy?.alias || aliasMap.value[pub] || '';
  }

  async function onLogout(): Promise<void> {
    if (!currentUserPub.value) {
   //   showToast('Not logged in, no need to logout', 'info');
      return;
    }
  
    const myPub = currentUserPub.value;
  
    // 1. Clean up Gun.js user state
    user.leave();
  

    // 2. Reset in-memory state
    isLoggedIn.value = false;
    currentUserPub.value = null;
    currentUserAlias.value = null;
    currentUserAlias1.value = null;
     currentUserPair = null;
    loginError.value = null;
    buddyList.value = [];
    receivedRequests.value = [];
    chatPreviewList.value = [];
    chatMessages.value = {};
    chatPreviewList.value = [];
    aliasMap.value = {};
    signatureMap.value = {};
    userAvatars.value = {};
    sentMessages.value.clear();
  
    // 3. Clean up listeners
    for (const pub in chatListeners.value) {
      chatListeners.value[pub]();
    }
    chatListeners.value = {};
    
    // 4. Clean up active listener manager
    activeListeners.forEach((cleanup, key) => {
      try {
        cleanup();
      } catch (error) {
        // Failed to clean up listener
      }
    });
    activeListeners.clear();
  
    // 5. Clean up cache
    for (const key in epubCache) {
      delete epubCache[key];
    }
    for (const key in secretCache) {
      delete secretCache[key];
    }
  
    try {
      // 6. Clean up user-related data in SQLite database
      await storageServ.run('DELETE FROM users WHERE pubKey = ?', [myPub]); // User info
      await storageServ.run('DELETE FROM epubs WHERE pub = ?', [myPub]); // Current user's epub
      await storageServ.run('DELETE FROM credentials WHERE key = ?', ['userCredentials']); // Credentials
      // Also clean up credentials in IndexedDB (web version only)
      await clearCredentialsFromDb();
     // await storageServ.run('DELETE FROM buddies WHERE userPub = ?', [myPub]); // Buddy relationships
     // await storageServ.run('DELETE FROM messages WHERE sender = ?', [myPub]); // Sent messages
    //  await storageServ.execute('DELETE FROM chat_previews'); // Chat previews
      await storageServ.run('DELETE FROM chat_previews'); 
     // await storageServ.execute('DELETE FROM blacklist'); // Blacklist
      await storageServ.run('DELETE FROM friend_remarks WHERE userPub = ?', [myPub]); // Friend remarks
      await storageServ.run('DELETE FROM sent_requests WHERE fromPub = ?', [myPub]); // Sent friend requests
  
            // Note: Other users' epub (other records in epubs table) are not cleaned here to avoid affecting buddy data
      // For complete cleanup, use: await storageServ.execute('DELETE FROM epubs');

      // 7. Reset Gun instance
      // gun = Gun({
      //   gunIonicAdapter,
      //   peers: [enabledPeer.value],
      //   radisk: false,
      //   localStorage: false,
      // });
  
    //  showToast('Logged out and cleaned all personal data', 'success');
    } catch (err) {
      //console.error('Failed to clean data during logout:', err);
      //showToast('Logout successful, but some data cleanup failed', 'warning');
    }
  
   // router.replace({ path: '/' });
  }
  async function restoreChatPreviews(myPub: string): Promise<ChatPreview[]> {
    const storedPreviews = await storageServ.getAllChatPreviews();
    return storedPreviews.map(stored => ({
      pub: stored.pub,
      lastMsg: stored.lastMsg,
      lastTime: stored.lastTime,
      hidden: stored.hidden,
      hasNew: stored.hasNew,
    }));
  }

  async function fetchAllPubKeys(): Promise<Set<string>> {
    return new Promise((resolve) => {
      const pubKeys = new Set<string>();
      gun.get('users').map().once((data: any, pub: string) => {
        if (pub) pubKeys.add(pub);
      });
      setTimeout(() => resolve(pubKeys), 5000);
    });
  }

  function getFriendRemark(friendPub: string): { remark: string; remarkInfo: string } {
    return friendRemarks.value[friendPub] || { remark: '', remarkInfo: '' };
  }

  function getFriendSignature(pub: string): string {
    return signatureMap.value[pub] || '';
  }

  const visibleChatPreviewList = computed(() => chatPreviewList.value.filter((chat) => !chat.hidden || chat.hasNew));

  // async function requestNotificationPermission(): Promise<void> {
  //   if ('Notification' in window && Notification.permission === 'default') {
  //     await Notification.requestPermission();
  //     chatPreviewList.value.forEach((chat) => (chat.hasNew = true));
  //   }
  // }

  function showNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }


  function listenAllChats(myPub: string): void {
    // Resetting all chat listeners
    
    // 1. Clean up existing listeners
    activeListeners.forEach((cleanup, key) => {
      try {
        cleanup()
        // Cleaning up listener
      } catch (error) {
        // Failed to clean up listener
      }
    })
    activeListeners.clear()
    
    // 2. Register new listeners
    buddyList.value.forEach((buddy) => {
      try {
        const cleanup = listenChat(buddy.pub)
        if (cleanup) {
          activeListeners.set(buddy.pub, cleanup)
          // Registered listener
        }
      } catch (error) {
        // Failed to register listener
      }
    })
    
    // Active listener count
  }


  async function saveBuddyWithValidation(userPub: string, buddyPub: string, timestamp: number, alias?: string, avatar?: string, epub?:string): Promise<void> {
    try {
      // 调试日志：记录保存前的数据
      // console.log('🔍 saveBuddyWithValidation 开始保存:', {
      //   userPub: userPub?.slice(0, 8),
      //   buddyPub: buddyPub?.slice(0, 8),
      //   timestamp,
      //   alias,
      //   avatar: avatar ? '有头像' : '无头像',
      //   epub: epub ? '有epub' : '无epub'
      // });
      
      // 使用直接的storageServ方法，避免立即触发自动保存
      await storageServ.saveBuddy(userPub, buddyPub, timestamp, alias, avatar, epub);
      
      // 延迟触发自动保存，减少阻塞
      setTimeout(() => {
        autoSaveManager.requestSave('saveBuddy_delayed');
      }, 100); // 100ms延迟
      
      // 调试日志：记录保存后的验证
      // console.log('🔍 saveBuddyWithValidation 保存完成，开始验证');
      
      const savedBuddies = await storageServ.getBuddies(userPub);
      const foundBuddy = savedBuddies.find(b => b.pub === buddyPub);
      
      // console.log('🔍 saveBuddyWithValidation 验证结果:', {
      //   totalBuddies: savedBuddies.length,
      //   foundBuddy: foundBuddy ? {
      //     pub: foundBuddy.pub?.slice(0, 8),
      //     alias: foundBuddy.alias,
      //     timestamp: foundBuddy.timestamp
      //   } : '未找到'
      // });
      
      if (!foundBuddy) {
        throw new Error(`Buddy ${buddyPub} not found in SQLite after save`);
      }
      
      // console.log('🔍 saveBuddyWithValidation 验证成功');
    } catch (err) {
      // console.error('🔍 saveBuddyWithValidation 错误:', {
       //   error: err,
       //   errorMessage: err?.message || 'No error message',
       //   errorType: typeof err,
       //   errorString: String(err),
       //   errorStack: err?.stack,
       //   userPub: userPub?.slice(0, 8),
       //   buddyPub: buddyPub?.slice(0, 8),
       //   timestamp,
       //   alias,
       //   avatar: avatar ? '有头像' : '无头像',
       //   epub: epub ? '有epub' : '无epub'
       // });
      throw err;
    }
  }




  async function requestAddBuddy(): Promise<void> {
    // 1. Login status check
    if (!currentUserPub.value) {
      buddyError.value = 'Please login first before adding friends';
      showToast(buddyError.value, 'warning');
      return;
    }

    // 2. Public key input validation
    const pubB = friendPub.value.trim();
    if (!pubB) {
      buddyError.value = 'Please enter the other party\'s public key';
      showToast(buddyError.value, 'warning');
      return;
    }

    // 3. Public key format validation
    if (!isValidGunPublicKey(pubB)) {
      buddyError.value = 'Invalid public key format, please check and re-enter';
      showToast(buddyError.value, 'warning');
      return;
    }

    // 4. Check for adding oneself
    if (pubB === currentUserPub.value) {
      buddyError.value = 'Cannot add yourself as a friend';
      showToast(buddyError.value, 'warning');
      return;
    }

    // 5. Blacklist check
    if (isInMyBlacklist(pubB)) {
      buddyError.value = 'The other party is in your blacklist, cannot send friend request';
      showToast('The other party is in blacklist, please unblock first', 'warning');
      return;
    }

    // 6. Duplicate friend check
    if (buddyList.value.some(b => b.pub === pubB)) {
      showToast('Already friends, no need to add again', 'info');
      return;
    }

    // 7. Network status check
    const networkStatus = await checkNetworkStatus();
    if (!networkStatus.available) {
      buddyError.value = networkStatus.message;
      showToast(networkStatus.message, 'warning');
      return;
    }

    // 8. Show loading status
    buddyError.value = '';
    showToast('Sending friend request...', 'info', 1500);

    try {
      const timestamp = Date.now();
      
      // 9. Get user information
      const [userInfo, myInfo] = await Promise.all([
        fetchUserInfo(pubB),
        fetchUserInfo(currentUserPub.value)
      ]);

      // 10. Create buddy object
      const buddy: Buddy = { 
        pub: pubB, 
        addedByMe: true, 
        timestamp, 
        alias: userInfo.alias || `User${pubB.slice(0, 8)}`, 
        avatar: userInfo.avatar 
      };

      // 11. Save to local database
      await saveBuddyWithValidation(currentUserPub.value, pubB, timestamp, buddy.alias, buddy.avatar);
      buddyList.value.push(buddy);
      await saveBuddyListToDb(buddyList.value);
      gun.get('users').get(currentUserPub.value).get('buddy').get(pubB).put({ v: true });

      // 12. Send friend request to network
      await new Promise<void>((resolve, reject) => {
        const requestData = {
          from: currentUserPub.value,
          message: `Hi, I am ${myInfo.alias}`,
          alias: myInfo.alias,
          avatar: myInfo.avatar,
          timestamp: Date.now()
        };

        gun.get('requests').get(pubB).get('received').set(requestData, async (ack: any) => {
          if (ack.err) {
            // Failed to send friend request
            reject(new Error(ack.err));
          } else {
            // Record sent request
            await storageServ.run(
              'INSERT INTO sent_requests (fromPub, toPub, timestamp) VALUES (?, ?, ?)', 
              [currentUserPub.value, pubB, Date.now()]
            );
            resolve();
          }
        });
      });

      // 13. Success feedback
      showToast(`Friend request sent to ${buddy.alias}`, 'success');
      friendPub.value = '';
      
      // 14. Automatically start chat listening and user info listening
      listenChat(pubB);
      listenUserAlias(pubB);
      listenUserAvatar(pubB);
      listenFriendSignature(pubB);
      

      
    } catch (error: any) {
      // Failed to add friend
      
      // Rollback local changes
      buddyList.value = buddyList.value.filter(b => b.pub !== pubB);
      await storageServ.run('DELETE FROM buddies WHERE userPub = ? AND buddyPub = ?', [currentUserPub.value, pubB]);
      await saveBuddyListToDb(buddyList.value);
      
      // Error message
      const errorMessage = error.message?.includes('timeout') 
        ? 'Network timeout, please check network connection and retry'
        : 'Failed to send friend request, please try again later';
      
      buddyError.value = errorMessage;
      showToast(errorMessage, 'error');
    }
  }

  async function acceptBuddyRequest(fromPub: string): Promise<void> {
    showToast('Accepting friend request...', 'info', 1500);
    // 1. Basic validation
    if (!currentUserPub.value) {
      showToast('Please login first', 'warning');
      return;
    }
    
  
    // 2. Duplicate friend check
    if (buddyList.value.some(b => b.pub === fromPub)) {
      showToast('Already friends', 'info');
      return;
    }

    // 3. Blacklist check
    if (isInMyBlacklist(fromPub)) {
      showToast('The other party is in blacklist, cannot accept friend request', 'warning');
      return;
    }
  // const myPub = currentUserPub.value;
    
    try {
      const timestamp = Date.now();
      
      // 🆕 4. 直接从好友申请中获取用户信息和epub（避免重复网络请求）
      const requestData = receivedRequests.value.find(req => req.from === fromPub);
      let userInfo = { alias: '', avatar: '', epub: '' };
      
      // 调试日志：检查接收到的好友请求数据
      // console.log('🔍 接收到的好友请求数据:', {
      //   fromPub: fromPub?.slice(0, 8),
      //   requestData: requestData ? {
      //     from: requestData.from?.slice(0, 8),
      //     message: requestData.message,
      //     alias: requestData.alias,
      //     avatar: requestData.avatar ? '有头像' : '无头像',
      //     epub: requestData.epub ? '有epub' : '无epub'
      //   } : '未找到请求数据'
      // });
      
      if (requestData && typeof requestData === 'object') {
        // 从好友申请中获取已有的用户信息
        userInfo = {
          alias: requestData.alias || '',
          avatar: requestData.avatar || '',
          epub: requestData.epub || ''
        };
      } else {
         // 如果申请中没有信息，则使用缓存获取（非阻塞）
        // const fetchedInfo = await getUserDataOnce(fromPub);
         userInfo = {
           alias:  '',
           avatar: '',
           epub: '' // 如果申请中没有epub，暂时为空
         };
       }
       
       // 调试日志：检查处理后的用户信息
       // console.log('🔍 处理后的用户信息:', {
       //   alias: userInfo.alias,
       //   avatar: userInfo.avatar ? '有头像' : '无头像',
       //   epub: userInfo.epub ? '有epub' : '无epub'
       // });
      
      // 获取自己的信息
      // const myInfo = await fetchUserInfo(myPub);

      // 7. Create buddy object
      const buddy: Buddy = { 
        pub: fromPub, 
        addedByMe: true, 
        timestamp, 
        alias: userInfo.alias, 
        avatar: userInfo.avatar,
        epub: userInfo.epub
      };

      // 🆕 8. 优化epub处理（直接使用申请中的epub或异步获取）
      let epubStatus = 'verified';
      if (userInfo.epub) {
        // 直接保存申请中的epub到本地
        epubCache[fromPub] = userInfo.epub;
        await autoSaveStorageServ.saveEpub(fromPub, userInfo.epub);
      } else {
        // 如果申请中没有epub，异步获取（不阻塞主流程）
        epubStatus = 'pending';
        setTimeout(async () => {
          try {
            const buddyEpub = await getUserEpub(fromPub);
            if (buddyEpub) {
              epubCache[fromPub] = buddyEpub;
              await autoSaveStorageServ.saveEpub(fromPub, buddyEpub);
            }
          } catch (error) {
            // epub获取失败，不影响主流程
          }
        }, 100);
      }

      // 9. Save to local database
      await saveBuddyWithValidation(currentUserPub.value, fromPub, timestamp, buddy.alias, buddy.avatar, buddy.epub);
      
      // 确保响应式更新：使用扩展运算符创建新数组
      buddyList.value = [...buddyList.value, buddy];
     // await saveBuddyListToDb(buddyList.value);
      
      // 10. Update Gun network status
      gun.get('users').get(currentUserPub.value).get('buddy').get(fromPub).put({ v: true });
      gun.get('requests').get(currentUserPub.value).get('received').get(fromPub).put(null);

      // 🆕 10.5. 向对方发送自己的epub到epub池
      try {
        const myEpub = currentUserPair.epub as string;
        if (myEpub) {
          // 发送到对方的epub池节点
          gun.get('epub_pool').get(fromPub).get(currentUserPub.value).put(myEpub);
          console.log('📤 已向对方发送自己的epub:', {
            toPub: fromPub.slice(0, 8),
            myPub: currentUserPub.value.slice(0, 8),
            epub: myEpub ? '有epub' : '无epub'
          });
        }
      } catch (error) {
        console.warn('⚠️ 发送epub到对方epub池失败:', error);
      }

      // 11. Remove from request list
      receivedRequests.value = receivedRequests.value.filter(r => r.from !== fromPub);

      // 12. Success feedback
      const statusMessage = epubStatus === 'verified' 
        ? `Accepted ${buddy.alias}'s friend request, secure chat can now begin!`
        : `Accepted ${buddy.alias}'s friend request, establishing secure connection...`;
      
      showToast(statusMessage, 'success');

      // 🆕 13. 优化后续处理（移除阻塞，提升用户体验）
      // 立即开始聊天监听
      listenChat(fromPub);
      
      // 异步处理其他操作（不阻塞主流程）
      setTimeout(() => {
        // 监听用户信息更新（复用已获取的用户信息）
        listenUserAlias(fromPub);
        listenUserAvatar(fromPub);
        listenFriendSignature(fromPub);
        
        // 发送欢迎消息
        try {
          currentChatPub.value = fromPub;
          const welcomeMessage = `Hi ${userInfo.alias}, I'm ${currentUserAlias.value}`;
          sendChat('text', welcomeMessage).catch((error) => {
            // console.error('🔍 发送欢迎消息失败:', {
            //   error: error,
            //   errorMessage: error?.message || 'No error message',
            //   errorType: typeof error,
            //   errorString: String(error),
            //   fromPub: fromPub?.slice(0, 8),
            //   welcomeMessage
            // });
          });
        } catch (error) {
          // console.error('🔍 发送欢迎消息外层错误:', {
          //   error: error,
          //   errorMessage: error?.message || 'No error message',
          //   errorType: typeof error,
          //   errorString: String(error),
          //   fromPub: fromPub?.slice(0, 8)
          // });
        }

        // epub状态同步（仅在需要时执行）
        if (epubStatus !== 'verified' && !userInfo.epub) {
          syncEpubStatusForBuddy(fromPub).catch((error) => {
            // console.error('🔍 epub状态同步失败:', {
            //   error: error,
            //   errorMessage: error?.message,
            //   fromPub: fromPub?.slice(0, 8),
            //   epubStatus
            // });
          });
        }
      }, 100);
      
    } catch (error: any) {
      // Failed to accept friend request
      
      // 调试日志：详细记录错误信息
      // console.error('🔍 acceptBuddyRequest 错误详情:', {
      //   error: error,
      //   errorMessage: error?.message || 'No error message',
      //   errorType: typeof error,
      //   errorString: String(error),
      //   errorStack: error?.stack,
      //   fromPub: fromPub?.slice(0, 8),
      //   currentUserPub: currentUserPub.value?.slice(0, 8)
      // });
      
      const errorMessage = error?.message?.includes('timeout')
        ? 'Network timeout, please try again later'
        : `Failed to accept friend request: ${error?.message || 'Unknown error'}`;
      
      showToast(errorMessage, 'error');
    }
  }

   async function addFriend (targetPub: string, message?: string): Promise<void> {
     //   showToast('Sending friend request...', 'info', 500);
      // 1. Basic validation
      if (!currentUserPub.value) {
        showToast('Please log in first', 'warning');
        throw new Error('Not logged in, cannot add friend');
      }
      
      // 2. Public key format validation
      // if (!isValidGunPublicKey(targetPub)) {
      //   showToast('Invalid public key format', 'warning');
      //   throw new Error('Invalid public key format');
      // }
      
      // 3. Check for adding oneself
      if (targetPub === currentUserPub.value) {
        showToast('Cannot add yourself as friend', 'warning');
        throw new Error('Cannot add yourself as friend');
      }
      
      // 4. Blacklist check
      if (isInMyBlacklist(targetPub)) {
        showToast('User is in blacklist, please unblock first', 'warning');
        throw new Error('User is in blacklist');
      }
      
      // 5. Duplicate friend check
      if (buddyList.value.some(b => b.pub === targetPub)) {
        showToast('Already friends, no need to add again', 'info');
        return;
      }

      
      try {

        await new Promise<void>((resolve, reject) => {
         const requestData = {
            from: currentUserPub.value,
            message: message || `Hi, I'm ${currentUserAlias.value}, would like to be friends with you!`,
            alias: currentUserAlias.value,
            avatar: userAvatars.value || '',
            epub: currentUserPair?.epub || '', 
            timestamp: Date.now()
          };
          
          // 调试日志：检查发送的数据
          // console.log('🔍 发送好友请求数据:', {
          //   from: requestData.from?.slice(0, 8),
          //   message: requestData.message,
          //   alias: requestData.alias,
          //   avatar: requestData.avatar ? '有头像' : '无头像',
          //   epub: requestData.epub ? '有epub' : '无epub',
          //   timestamp: requestData.timestamp
          // });
          
          gun.get('requests').get(targetPub).get('received').put(requestData, async (ack: any) => {
            if (ack.err) {
               showToast('Failed to send friend request:' + ack.err, 'info');
             
              reject(new Error(ack.err));
            } else {
           //    showToast(`📤 Friend request sent to network: ${targetPub.slice(0, 8)}`, 'info');
              // console.log(`📤 Friend request sent to network: ${targetPub.slice(0, 8)}`);
              resolve();
            }
          });
        });
        
        // 10. After network request succeeds, add to local friend list and database
        let targetBuddy = buddyList.value.find(b => b.pub === targetPub);
        
        if (!targetBuddy) {
          // Create new verified buddy object
          const newBuddy: VerifiedBuddy = {
            pub: targetPub,
            addedByMe: true,
            timestamp: Date.now(),
            // alias: `${targetPub.slice(0, 8)}`,
            // avatar: '',
            epubSource: 'network',
            connectionStatus: 'unknown',
            syncRetryCount: 0
          };
          
          buddyList.value.push(newBuddy);
          targetBuddy = newBuddy;
         //  showToast(`✅ Friend added to local list: ${targetPub.slice(0, 8)}`, 'info');
        
        } else {
          // Update existing friend information (upgrade to VerifiedBuddy)
          const verifiedBuddy = targetBuddy as VerifiedBuddy;
          verifiedBuddy.alias =  verifiedBuddy.alias;
          verifiedBuddy.avatar = verifiedBuddy.avatar;
          verifiedBuddy.epubSource = verifiedBuddy.epubSource || 'network';
          verifiedBuddy.connectionStatus = verifiedBuddy.connectionStatus || 'unknown';
          verifiedBuddy.syncRetryCount = verifiedBuddy.syncRetryCount || 0;
         //  showToast(`✅ Friend information updated: ${targetPub.slice(0, 8)}`, 'info');
        }
        
        // 11. Save to database
        try {
          const buddy = targetBuddy as VerifiedBuddy;
          await saveBuddyWithValidation(currentUserPub.value!, buddy.pub, buddy.timestamp, buddy.alias, buddy.avatar,buddy.epub);
        //   showToast(`💾 Friend saved to database: ${targetPub.slice(0, 8)}`, 'info');
        } catch (dbError) {
          showToast('Failed to save friend to database:' + dbError, 'info');
          // Database save failure doesn't affect main flow
        }
        
        // 🆕 12. 优化监听和通知（移除阻塞）
        // 立即开始聊天监听
        listenChat(targetPub);
        
        // 异步处理其他监听（不阻塞主流程）
        setTimeout(() => {
          listenUserAlias(targetPub);
          listenUserAvatar(targetPub);
          listenFriendSignature(targetPub);
        }, 100);
        
        // 13. 成功通知
        // const userAlias = `${targetPub.slice(0, 8)}`;
        //showToast(`Friend request sent successfully`, 'success');
        
      } catch (error) {
        showToast('Failed to add friend:' + error, 'info');
        
        // 14. Error handling and rollback
        const errorMessage = error instanceof Error ? error.message : 'Failed to add friend';
        
        // Rollback local data
        const buddyIndex = buddyList.value.findIndex(b => b.pub === targetPub);
        if (buddyIndex !== -1) {
          buddyList.value.splice(buddyIndex, 1);
          // showToast(`🔄 Rolled back local friend list: ${targetPub.slice(0, 8)}`, 'info');
        }
        
        showToast(errorMessage, 'error');
        throw error;
      }
    }



  async function rejectBuddyRequest(fromPub: string): Promise<void> {
    // 1. Basic validation
    if (!currentUserPub.value) {
      showToast('Please login first', 'warning');
      return;
    }
    
    const myPub = currentUserPub.value;
    
    // 2. Network status check
    const networkStatus = await checkNetworkStatus();
    if (!networkStatus.available) {
      showToast(networkStatus.message, 'warning');
      return;
    }

    try {
      // 3. Get user info for friendly prompt
      let userAlias = `${fromPub.slice(0, 8)}`;
      try {
        const userInfo = await fetchUserInfo(fromPub);
        userAlias = userInfo.alias || userAlias;
      } catch (error) {
        // Failed to get user info
      }

      // 4. Remove request from Gun network
      gun.get('requests').get(myPub).get('received').get(fromPub).put(null);
      
      // 5. Remove from local request list
      receivedRequests.value = receivedRequests.value.filter(r => r.from !== fromPub);
      
      // 6. Success feedback
      showToast(`Rejected ${userAlias}'s friend request`, 'info');
      
    } catch (error: any) {
      // Failed to reject friend request
      
      const errorMessage = error.message?.includes('timeout')
        ? 'Network timeout, please try again later'
        : 'Failed to reject friend request, please try again later';
      
      showToast(errorMessage, 'error');
    }
  }

  async function listenMyBuddyList(myPub: string): Promise<void> {
    gun.get('users').get(myPub).get('buddy').map().once(async (val: boolean, pubKey: string) => {
      const existingIndex = buddyList.value.findIndex(b => b.pub === pubKey);
      if (!val && existingIndex !== -1) {
        const localBuddy = await storageServ.getBuddies(pubKey);
        if (localBuddy) return;
        buddyList.value.splice(existingIndex, 1);
        // Backup buddy list to IndexedDB (web version only)
        await saveBuddyListToDb(buddyList.value);
        await storageServ.run('DELETE FROM buddies WHERE userPub = ? AND buddyPub = ?', [myPub, pubKey]);
       // showToast(`${pubKey} You have been removed as a friend.`, 'info');
      }
    });
  }

  async function removeBuddy(pubKey: string): Promise<void> {
    if (!currentUserPub.value) return;
    const myPub = currentUserPub.value;
    buddyList.value = buddyList.value.filter(b => b.pub !== pubKey);
    // Backup buddy list to IndexedDB (web version only)
    await saveBuddyListToDb(buddyList.value);
    await storageServ.run('DELETE FROM buddies WHERE userPub = ? AND buddyPub = ?', [myPub, pubKey]);
    gun.get('users').get(myPub).get('buddy').get(pubKey).put(null);
    if (chatListeners.value[pubKey]) {
      chatListeners.value[pubKey]();
      delete chatListeners.value[pubKey];
    }
    chatPreviewList.value = chatPreviewList.value.filter(c => c.pub !== pubKey);
    // Backup chat previews to IndexedDB (web version only)
    await saveChatPreviewsToDb(chatPreviewList.value);
    delete chatMessages.value[pubKey];
    await autoSaveStorageServ.deleteChatPreview(pubKey);
    gun.get('users').get(pubKey).get('notifications').set({
      from: myPub,
      type: 'friend_removed',
      timestamp: Date.now(),
      message: `${currentUserAlias.value || 'Someone'} You have been removed from the friend list.`,
    });
  //  showToast('Deleted friends', 'success');
  }

  function addToBlacklist(pubKey?: string): void {
    const targetPub = pubKey || blockPub.value.trim();
    if (!targetPub || !currentUserPub.value) return;
    if (blacklist.value.includes(targetPub)) return;
    gun.get('users').get(currentUserPub.value).get('blacklist').get(targetPub).put({ v: true });
    blacklist.value.push(targetPub);
    storageServ.saveBlacklist(targetPub, true);
    blockPub.value = '';
   // showToast('It has been blacklisted.', 'success');
  }

  function removeFromBlacklist(pubKey?: string): void {
    const targetPub = pubKey || blockPub.value.trim();
    if (!targetPub || !currentUserPub.value) return;
    gun.get('users').get(currentUserPub.value).get('blacklist').get(targetPub).put(null);
    blacklist.value = blacklist.value.filter(p => p !== targetPub);
    storageServ.saveBlacklist(targetPub, false);
    blockPub.value = '';
  //  showToast('Removed from the blacklist', 'success');
  }

  function listenMyBlacklist(myPub: string): void {
    blacklist.value = [];
    gun.get('users').get(myPub).get('blacklist').map().on((val: boolean, pubKey: string) => {
      if (val) {
        if (!blacklist.value.includes(pubKey)) {
          blacklist.value.push(pubKey);
          storageServ.saveBlacklist(pubKey, true);
        }
      } else {
        blacklist.value = blacklist.value.filter(p => p !== pubKey);
        storageServ.saveBlacklist(pubKey, false);
      }
    });
  }

  function isInMyBlacklist(targetPub: string): boolean {
    return blacklist.value.includes(targetPub);
  }

  const secretCache: Record<string, string | undefined> = {};

  // Helper function: extract clean text content from message templates
  function extractCleanTextFromMessage(text: string): string {
    if (!text) return '';
    
    // Remove <think> tags and their content (quoted replies)
    const thinkRegex = /<think(?:\s+from=".*?"(?:\s+alias=".*?")?)?>([\s\S]*?)<\/think>/g;
    let cleanText = text.replace(thinkRegex, '').trim();
    
    // Remove <about> tags and their content
    const aboutRegex = /<about>([\s\S]*?)<\/about>/g;
    cleanText = cleanText.replace(aboutRegex, '').trim();
    
    // Remove <apiurl> tags and their content
    const apiurlRegex = /<apiurl>([\s\S]*?)<\/apiurl>/g;
    cleanText = cleanText.replace(apiurlRegex, '').trim();
    
    // Remove other potential template tags if needed
    // Add more regex patterns here for other template types
    
    return cleanText;
  }

  // Helper function: check if text is an API URL
  function isApiUrl(text: string): boolean {
    if (!text) return false;
    const trimmed = text.trim();
    
    // Check for <apiurl> tag format
    const apiurlTagRegex = /<apiurl>([\s\S]*?)<\/apiurl>/;
    if (apiurlTagRegex.test(trimmed)) {
      return true;
    }
    
    // Check for common API patterns in plain URLs
    const apiPatterns = [
      /\/api\//i,
      /\/v\d+\//i,
      /\.json$/i,
      /\.xml$/i,
      /\?.*api/i,
      /graphql/i,
      /rest\//i,
      /endpoint/i
    ];
    return isUrl(trimmed) && apiPatterns.some(pattern => pattern.test(trimmed));
  }

  // Helper function: check if text is a URL
  function isUrl(text: string): boolean {
    if (!text) return false;
    const trimmed = text.trim();
    try {
      new URL(trimmed);
      return true;
    } catch {
      // Also check for URLs without protocol
      const urlPattern = /^(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(\S*)?$/;
      return urlPattern.test(trimmed);
    }
  }

  // Helper function: get Base64 media type
  function getBase64MediaType(text: string): string {
    if (!text) return '[File]';
    const trimmed = text.trim();
    
    // Check data URL prefix
    if (trimmed.startsWith('data:')) {
      if (trimmed.includes('image/')) return '[Image]';
      if (trimmed.includes('video/')) return '[Video]';
      if (trimmed.includes('audio/')) return '[Audio]';
      if (trimmed.includes('application/pdf')) return '[PDF]';
      if (trimmed.includes('text/')) return '[Text File]';
      return '[File]';
    }
    
    // For plain Base64 strings, try to detect by common patterns
    if (isBase64Image(trimmed)) return '[Image]';
    
    // Default for other Base64 content
    return '[File]';
  }

  function getPreviewText(msg: LocalChatMessage): string {
    const MAX_PREVIEW_LENGTH = 20; // Limit preview text length to 20 characters
  
    switch (msg.type) {
      case 'text':
        if (!msg.text) return '';
        
        // Check if it might be a Base64 string (image, video, audio, or file) FIRST
        if (isBase64Media(msg.text)) {
          return getBase64MediaType(msg.text);
        }
        
        // Check if it's an API URL
         if (isApiUrl(msg.text)) {
           return 'Remote Notification Certificate';
         }
        
        // Check if it's a regular URL
        if (isUrl(msg.text)) {
          return '[Link]';
        }
        
        // Extract clean text content from message templates
        const cleanText = extractCleanTextFromMessage(msg.text);
        if (!cleanText) {
          // If no clean text remains after removing templates, show a generic message
          return '[Quote Reply]';
        }
        // Plain text, take first 20 characters
        return cleanText.length > MAX_PREVIEW_LENGTH 
          ? `${cleanText.slice(0, MAX_PREVIEW_LENGTH)}...` 
          : cleanText;
      case 'voice':
        return '[Voice]';
      case 'file':
        return '[File]';
      default:
        return '';
    }
  }
  
  // Helper function: detect if it's Base64 media
  function isBase64Media(text: string): boolean {
    return /^data:(image|video)\/[\w+.-]+;base64,/.test(text);
  }
  
  // Helper function: detect if it's Base64 image
  function isBase64Image(text: string): boolean {
    return /^data:image\/[\w+.-]+;base64,/.test(text);
  }

  // Generic function to update chat preview
  async function updateChatPreview(targetPub: string, msg: LocalChatMessage, timestamp: number, isFromSending: boolean = false, isJustSent: boolean = false): Promise<void> {
    try {
      const preview = chatPreviewList.value.find(c => c.pub === targetPub);
      let previewText = getPreviewText(msg);
      
      // Add prefix based on status
      if (isFromSending) {
        previewText = `⏳ ${previewText}`;
        // Preview sending
      } else if (isJustSent) {
        previewText = `✓ ${previewText}`;
        // Preview sent
      }
      
              if (preview) {
          preview.lastMsg = previewText;
          preview.lastTime = formatTimestamp(timestamp);
          preview.hasNew = false;
          preview.hidden = false;
          await autoSaveStorageServ.saveChatPreview(preview);
        } else {
          const newPreview: ChatPreview = {
            pub: targetPub,
            lastMsg: previewText,
            lastTime: formatTimestamp(timestamp),
            hidden: false,
            hasNew: false,
          };
          chatPreviewList.value.push(newPreview);
          await autoSaveStorageServ.saveChatPreview(newPreview);
        }
      
      // Force trigger reactive update
      await saveChatPreviewsToDb(chatPreviewList.value);
      chatPreviewList.value = [...chatPreviewList.value];
      
      // If just sent successfully, remove checkmark after 1.5 seconds
      if (isJustSent) {
        setTimeout(async () => {
          try {
                          const currentPreview = chatPreviewList.value.find(c => c.pub === targetPub);
              if (currentPreview && currentPreview.lastMsg.startsWith('✓ ')) {
                currentPreview.lastMsg = currentPreview.lastMsg.replace('✓ ', '');
                await autoSaveStorageServ.saveChatPreview(currentPreview);
                await saveChatPreviewsToDb(chatPreviewList.value);
                chatPreviewList.value = [...chatPreviewList.value];
                // Cleared sent indicator
              }
          } catch (error) {
            // Error cleaning sent status
          }
        }, 1500);
      }
    } catch (error) {
      // Error updating chat preview
    }
  }

  // Send message receipt
  async function sendMessageReceipt(chatId: string, originalMsgId: string): Promise<void> {
    if (!currentUserPub.value || !currentUserPair.value) return;
    
    try {
      const receiptTimestamp = Date.now();
      const receiptData = {
        chatID: chatId,
        from: currentUserPub.value,
        originalMsgId,
        receiptTimestamp,
      };
      
      // Sign receipt data
      const signature = await Gun.SEA.sign(JSON.stringify(receiptData), currentUserPair.value);
      if (!signature) throw new Error('Receipt signing failed');
      
      const receipt: MessageReceipt = {
        ...receiptData,
        signature,
      };
      
      // Send receipt to network
      gun.get('chats').get(chatId).get('receipts').get(originalMsgId).put(receipt, (ack: any) => {
        if (ack.err) {
          // Failed to send receipt
        } else {
          // Receipt sent for message
        }
      });
      
    } catch (error) {
      // Failed to send receipt
    }
  }

  // Listen for message receipts
  function listenMessageReceipts(chatId: string): void {
    gun.get('chats').get(chatId).get('receipts').map().on(async (receipt: MessageReceipt | undefined, receiptKey: string) => {
      if (!receipt || !currentUserPub.value) return;
      
      // Only process receipts from others (confirming my messages were received)
      if (receipt.from === currentUserPub.value) return;
      
      try {
        // Verify receipt signature
        const receiptDataToVerify = {
          chatID: receipt.chatID,
          from: receipt.from,
          originalMsgId: receipt.originalMsgId,
          receiptTimestamp: receipt.receiptTimestamp,
        };
        
        const verifiedPub = await Gun.SEA.verify(receipt.signature, JSON.stringify(receiptDataToVerify));
        if (verifiedPub !== receipt.from) {
          // Receipt signature verification failed
          return;
        }
        
        // Received valid receipt for message
        
        // After receiving receipt, clear original message from network (ensure eventual consistency)
        await clearNetworkMessageAfterReceipt(chatId, receipt.originalMsgId);
        
      } catch (error) {
        // Failed to process receipt
      }
    });
  }

  // Clear network message after receiving receipt
  async function clearNetworkMessageAfterReceipt(chatId: string, msgId: string): Promise<void> {
    try {
      // Ensure only clearing messages sent by current user
      if (!currentUserPub.value) return;
      
      // Check if message was indeed sent by current user
      const messageRef = gun.get('chats').get(chatId).get('messages').get(msgId);
      messageRef.once(async (data: NetworkChatMessage) => {
        if (data && data.from === currentUserPub.value) {
          // Confirmed as message sent by current user, safe to delete
          messageRef.put(null, (ack: any) => {
            if (ack.err) {
              // Failed to clear network message
            } else {
                        gun.get('chats').get(chatId).get('receipts').get(msgId).put(null);
              // Network message cleared after receipt
            }
          });
          
          // Also clear corresponding receipt
         // gun.get('chats').get(chatId).get('receipts').get(msgId).put(null);
        }
      });
      
    } catch (error) {
      // Failed to clear network message
    }
  }


  async function encryptPayload(targetPub: string, payload: string): Promise<{ encryptedForBuddy: string; encryptedForMe: string }> {
    if (!currentUserPair) throw new Error('Not logged in');
    user.auth(currentUserPair)
    const buddyEpub = await getUserEpub(targetPub);
    if (!buddyEpub) throw new Error('Unable to get buddy\'s epub');
    const secretBuddyKey = `${buddyEpub}-${currentUserPair.pub}`;
    delete secretCache[secretBuddyKey]; // Refresh key
    const secretBuddy = await Gun.SEA.secret(buddyEpub, currentUserPair);
    if (!secretBuddy) throw new Error('Unable to generate buddy\'s key');
    const encryptedForBuddy = await Gun.SEA.encrypt(payload, secretBuddy);
  
    const myEpub = currentUserPair.epub as string;
    const secretMeKey = `${myEpub}-${currentUserPair.pub}`;
    delete secretCache[secretMeKey]; // Refresh key
    const secretMe = await Gun.SEA.secret(myEpub, currentUserPair);
    if (!secretMe) throw new Error('Unable to generate own key');
    const encryptedForMe = await Gun.SEA.encrypt(payload, secretMe);
    return { encryptedForBuddy, encryptedForMe };
  }
  async function requestAddBuddyWithMessage(message: string, forceRequest: boolean = false): Promise<void> {
   showToast('Sending friend request...', 'info', 1500);
    // 1. Login status check
    if (!currentUserPub.value) {
      buddyError.value = 'Please login first';
      showToast(buddyError.value, 'warning');
      throw new Error('Not logged in');
    }
    
    // 2. Public key input validation
    const pubB = friendPub.value.trim();
    if (!pubB) {
      buddyError.value = 'Please enter the other party\'s public key';
      showToast(buddyError.value, 'warning');
      throw new Error('Please enter the other party\'s public key');
    }
    
    // 3. Public key format validation
    if (!isValidGunPublicKey(pubB)) {
      buddyError.value = 'Invalid public key format, please check and re-enter';
      showToast(buddyError.value, 'warning');
      throw new Error('Invalid public key format');
    }
    
    // 4. Self-addition check
    if (pubB === currentUserPub.value) {
      buddyError.value = 'Cannot add yourself as a friend';
      showToast(buddyError.value, 'warning');
      throw new Error('Cannot add yourself as a friend');
    }
    
    // 5. Blacklist check
    if (isInMyBlacklist(pubB)) {
      buddyError.value = 'You have blocked the other party, cannot send friend request';
      showToast('The other party is on the blacklist, please unblock first', 'warning');
      throw new Error('The other party is on the blacklist');
    }
    
    // 6. Duplicate friend check (if not forced request)
    if (!forceRequest && buddyList.value.some(b => b.pub === pubB)) {
      showToast('Already friends, no need to add again', 'info');
      return;
    }
    
    // 7. Message content validation
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      buddyError.value = 'Please enter friend request message';
      showToast(buddyError.value, 'warning');
      throw new Error('Please enter friend request message');
    }
    
    if (trimmedMessage.length > 200) {
      buddyError.value = 'Friend request message too long, please keep within 200 characters';
      showToast(buddyError.value, 'warning');
      throw new Error('Message too long');
    }
    
    // 8. Network status check
    const networkStatus = await checkNetworkStatus();
    if (!networkStatus.available) {
      buddyError.value = networkStatus.message;
      showToast(networkStatus.message, 'warning');
      throw new Error(networkStatus.message);
    }
    
    // 9. Show processing status
    buddyError.value = '';
    
    
    try {
      const timestamp = Date.now();
      
      // 10. Get user information
      const [userInfo, myInfo] = await Promise.all([
        fetchUserInfo(pubB),
        fetchUserInfo(currentUserPub.value)
      ]);
      
      // 11. Create buddy object
      const buddy: Buddy = { 
        pub: pubB, 
        addedByMe: true, 
        timestamp, 
        alias: userInfo.alias || `${pubB.slice(0, 8)}`, 
        avatar: userInfo.avatar 
      };
      
      // 12. Save to local database
      await saveBuddyWithValidation(currentUserPub.value, pubB, timestamp, buddy.alias, buddy.avatar);
      buddyList.value.push(buddy);
      await saveBuddyListToDb(buddyList.value);
      gun.get('users').get(currentUserPub.value).get('buddy').get(pubB).put({ v: true });
      
      // 13. Send friend request to network
      await new Promise<void>((resolve, reject) => {
        const requestData = {
          from: currentUserPub.value,
          message: trimmedMessage,
          alias: myInfo.alias,
          avatar: myInfo.avatar,
          timestamp: Date.now()
        };
        
        gun.get('requests').get(pubB).get('received').set(requestData, async (ack: any) => {
          if (ack.err) {
            // Failed to send friend request
            reject(new Error(ack.err));
          } else {
            // Record sent request
            try {
              await storageServ.run(
                'INSERT INTO sent_requests (fromPub, toPub, timestamp) VALUES (?, ?, ?)', 
                [currentUserPub.value, pubB, Date.now()]
              );
            } catch (dbError) {
              // Failed to record sent request
            }
            resolve();
          }
        });
      });
      
      // 14. Success feedback
      showToast(`Friend request sent to ${buddy.alias}`, 'success');
      friendPub.value = '';
      
      // 15. Automatically start chat listening and user info listening
      listenChat(pubB);
      listenUserAlias(pubB);
      listenUserAvatar(pubB);
      listenFriendSignature(pubB);
      
    } catch (error: any) {
      // Failed to send friend request
      
      // 16. Rollback local changes
      try {
        buddyList.value = buddyList.value.filter(b => b.pub !== pubB);
        await storageServ.run('DELETE FROM buddies WHERE userPub = ? AND buddyPub = ?', [currentUserPub.value, pubB]);
        await saveBuddyListToDb(buddyList.value);
      } catch (rollbackError) {
        // Rollback failed
      }
      
      // 17. Error message
      const errorMessage = error.message?.includes('timeout')
        ? 'Network timeout, please check network connection and try again'
        : 'Failed to send friend request, please try again later';
      
      buddyError.value = errorMessage;
      showToast(errorMessage, 'error');
      throw error;
    }
  }
  async function checkPeerHealth(peer: string, timeoutMs = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      const testKey = `health-check-${Date.now()}`;
      const timeout = setTimeout(() => resolve(false), timeoutMs);
      gun.get(testKey).put({ test: true }, (ack: any) => {
        clearTimeout(timeout);
        resolve(!ack.err);
      });
    });
  }
  
  async function ensurePeerAvailable(maxRetries = 3): Promise<boolean> {
    // Check if any enabled nodes are available
    for (const peer of enabledPeers.value) {
      if (await checkPeerHealth(peer)) {
        return true;
      }
    }
    
    // If all nodes are unavailable, try to reconnect
    let retries = 0;
    while (retries < maxRetries) {
      for (const peer of enabledPeers.value) {
        if (await checkPeerHealth(peer)) {
          return true;
        }
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }
  
 
  
  async function processQueue() {
    while (activeSends < MAX_CONCURRENT && sendQueue.length > 0) {
      const { msg, resolve, reject } = sendQueue.shift()!;
      activeSends++;
      try {
        await new Promise<void>((res, rej) => {
          gun.get('chats').get(msg.chatID).get('messages').get(msg.msgId)
            .put(msg, (ack: any) => ack.err ? rej(new Error(ack.err)) : res());
        });
        resolve();
      } catch (err) {
        reject(err as Error);
      } finally {
        activeSends--;
      }
    }
    if (sendQueue.length > 0) setTimeout(processQueue, 0);
  }
  async function queueSendChat(networkMsg: NetworkChatMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      sendQueue.push({ msg: networkMsg, resolve, reject });
      processQueue();
    });
  }
// Offline recovery mechanism
window.addEventListener('online', async () => {
  if (!currentUserPub.value) return;
  const pendingMsgs = await storageServ.query('SELECT * FROM messages WHERE status = ?', ['pending']);
  for (const msg of pendingMsgs.values || []) {
    const localMsg = msg as LocalChatMessage;
    const targetPub = localMsg.chatID.split('_').find(pub => pub !== currentUserPub.value)!;
    currentChatPub.value = targetPub;
    await resendMessage(targetPub, localMsg);
  }
  //showToast('Network restored, attempting to resend unsent messages', 'info');
});

async function sendChat(messageType: MessageType, payload: string | null = null, duration?: number): Promise<void> {
  if (!currentUserPub.value || !currentChatPub.value) {

    // console.log('Not logged in or no chat target selected');
    return;
  }

  
  const myPub = currentUserPub.value;
  const targetPub = currentChatPub.value;
  const now = Date.now();
  const chatId = generateChatId(myPub, targetPub);
  const msgId = uuidv4();
  const localMsg: LocalChatMessage = {
    chatID: chatId,
    from: myPub,
    type: messageType,
    timestamp: now,
    msgId,
    sent: false,
    status: 'pending',
    isSending: true,
  };
  let dataToSend = '';

  switch (messageType) {
    case 'text':
      dataToSend = payload || (newMsg.value ? newMsg.value.trim() : '');
      if (!dataToSend) return;
      localMsg.text = dataToSend;
      break;
    case 'voice':
      if (!payload) return;
      dataToSend = payload;
      localMsg.audioUrl = dataToSend;
      localMsg.duration = duration;
      break;
    case 'file':
      if (!payload) return;
      dataToSend = payload;
      localMsg.fileId = dataToSend;
      break;
    default:
      return;
  }

  try {
    chatMessages.value[targetPub] = chatMessages.value[targetPub] || [];
    const existing = await storageServ.query('SELECT id FROM messages WHERE chatID = ? AND msgId = ?', [chatId, msgId]);
  
    const dbPromise = existing.values?.length > 0
    ? storageServ.updateMessage(chatId, msgId, localMsg)
    : storageServ.insertMessage(chatId, localMsg).then(id => { localMsg.id = id; });
  chatMessages.value[targetPub].push(localMsg);
  chatMessages.value = { ...chatMessages.value };
    const [encryptResult, hash] = await Promise.all([
      encryptPayload(targetPub, dataToSend),
      Gun.SEA.work(dataToSend, null, null, { name: 'SHA-256' }),
    ]);
    await dbPromise; // 并行处理数据库操作
    if (!encryptResult.encryptedForBuddy || !encryptResult.encryptedForMe) throw new Error('Encryption failed');
    if (!hash) throw new Error('Hash generation failed');

    const signData: any = { from: myPub, hash, timestamp: now };
    if (messageType === 'voice' && duration !== undefined) signData.duration = duration;
    const signature = await Gun.SEA.sign(JSON.stringify(signData), currentUserPair!);
    if (!signature) throw new Error('Signing failed');

    const networkMsg: NetworkChatMessage = {
      chatID: chatId,
      from: myPub,
      type: messageType,
      timestamp: now,
      msgId,
      signature,
      hash,
    };
    switch (messageType) {
      case 'text':
        networkMsg.textForBuddy = encryptResult.encryptedForBuddy;
        networkMsg.textForMe = encryptResult.encryptedForMe;
        localMsg.textForBuddy = encryptResult.encryptedForBuddy;
        localMsg.textForMe = encryptResult.encryptedForMe;
        break;
      case 'voice':
        networkMsg.audioForBuddy = encryptResult.encryptedForBuddy;
        networkMsg.audioForMe = encryptResult.encryptedForMe;
        networkMsg.duration = duration;
        localMsg.audioForBuddy = encryptResult.encryptedForBuddy;
        localMsg.audioForMe = encryptResult.encryptedForMe;
        localMsg.duration = duration;
        break;
      case 'file':
        networkMsg.content = encryptResult.encryptedForBuddy;
        localMsg.content = encryptResult.encryptedForBuddy;
        break;
    }
    localMsg.signature = signature;
    localMsg.hash = hash;

    await autoSaveStorageServ.updateMessage(chatId, msgId, localMsg);
    chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
    chatMessages.value = { ...chatMessages.value };

    // Immediately update preview to show sending status
    await updateChatPreview(targetPub, localMsg, Date.now(), true);

    // Use persistent queue to send message (infinite retry until success)
    try {
      // Initialize persistent queue
      const queue = await initializePersistentQueue();
      
      // Create queued message
      const queuedMessage = {
        id: msgId,
        networkMsg,
        chatId,
        retryCount: 0,
        nextRetryTime: Date.now(),
        createdAt: now,
        lastAttempt: 0
      };
      
      // Register status callback to monitor sending status changes
      queue.registerStatusCallback(msgId, async (status: 'sending' | 'sent' | 'failed') => {
        try {
          if (status === 'sent') {
            // Message sent successfully
            localMsg.sent = true;
            localMsg.status = 'sent';
            localMsg.isSending = false;
            localMsg.justSent = true; // Set just sent flag
            sentMessages.value.add(msgId);
            await autoSaveStorageServ.updateMessage(chatId, msgId, localMsg);
            chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
            chatMessages.value = { ...chatMessages.value };
            
            // Immediately trigger haptic feedback (send success)
            await triggerLightHaptic();
            
            // Immediately update message preview (send success, show checkmark)
            await updateChatPreview(targetPub, localMsg, Date.now(), false, true);
            
            // 🔄 Sync buddy verification status after successful send (epub fetch success)
            syncEpubStatusForBuddy(targetPub).then(() => {
            //  forceUpdateBuddyList();
            }).catch(error => {
              // Failed to sync verification status after send success
            });
            
            // Clear justSent flag after 1.5 seconds
            setTimeout(async () => {
              localMsg.justSent = false;
              await storageServ.updateMessage(chatId, msgId, localMsg);
              chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
              chatMessages.value = { ...chatMessages.value };
            }, 1500);
            
            // Message confirmed sent
          } else if (status === 'sending') {
            // Message is being sent (including retries)
            localMsg.status = 'pending';
            localMsg.isSending = true;
            await storageServ.updateMessage(chatId, msgId, localMsg);
            chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
            chatMessages.value = { ...chatMessages.value };
            
            // Sending status should also update message preview (with loading indicator)
            await updateChatPreview(targetPub, localMsg, Date.now(), true);
          }
        } catch (error) {
          // Error in status callback
        }
      });
      
      // Add to persistent queue
      await queue.enqueue(queuedMessage);
      
      // Message added to global persistent queue
      
    } catch (error) {
      // Failed to use persistent queue, falling back to old method
      
      // Fallback to old queue method
      if (!navigator.onLine || !(await ensurePeerAvailable())) {
        localMsg.status = 'pending';
        await storageServ.updateMessage(chatId, msgId, localMsg);
        return;
      }
      
      // Simplified sending logic (no retry limit)
      try {
        await queueSendChat(networkMsg);
        localMsg.sent = true;
        localMsg.status = 'sent';
        localMsg.isSending = false;
        localMsg.justSent = true; // Set just sent flag
        sentMessages.value.add(msgId);
        await storageServ.updateMessage(chatId, msgId, localMsg);
        chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
        chatMessages.value = { ...chatMessages.value };
        
        // Fallback mode should also trigger haptic feedback and update preview (show checkmark)
        await triggerLightHaptic();
        await updateChatPreview(targetPub, localMsg, Date.now(), false, true);
        
        // Clear justSent flag after 1.5 seconds
        setTimeout(async () => {
          localMsg.justSent = false;
          await storageServ.updateMessage(chatId, msgId, localMsg);
          chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
          chatMessages.value = { ...chatMessages.value };
        }, 1500);
      } catch (err) {
        // Keep pending status, wait for network recovery
        localMsg.status = 'pending';
        localMsg.isSending = true;
        await storageServ.updateMessage(chatId, msgId, localMsg);
        chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
        chatMessages.value = { ...chatMessages.value };
      }
    }

    // Haptic feedback and preview updates are now handled in status callback, no need to repeat here
  } catch (err: any) {
    // Error in sendChat
    // Keep pending status, message will continue retrying until success
    localMsg.status = 'pending';
    localMsg.isSending = true;
    await storageServ.updateMessage(chatId, msgId, localMsg);
    chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
    chatMessages.value = { ...chatMessages.value };
    // Message will continue retrying to send
  }
}
  async function resendMessage(pub: string, msg: LocalChatMessage): Promise<void> {
    if (!navigator.onLine ) {
     // showToast('Currently offline, please try again after restoring the network.', 'warning');
      return;
    }
    if (!currentUserPub.value || !pub) return;

    let payload: string | null = null;
    switch (msg.type) {
      case 'text':
        payload = msg.text || '';
        break;
      case 'voice':
        payload = msg.audioUrl || '';
        break;
      case 'file':
        payload = msg.fileId || '';
        break;
    }

    if (!payload) {
      // showToast('Message content is empty, cannot resend', 'warning');
    //  console.log('Message content is empty, cannot resend')
      return;
    }
    //console.log('Resend started')
    currentChatPub.value = pub;
    await sendChat(msg.type, payload, msg.duration);
  }

  async function openChat(pubKey: string): Promise<void> {
    router.push('/chatpage');
    if (!currentUserPub.value) {
      // showToast('Not logged in, cannot open chat', 'warning');
      return;
    }
    user.auth(currentUserPair!)
    currentChatPub.value = pubKey;
    const chat = chatPreviewList.value.find(c => c.pub === pubKey);
    if (chat) {
      chat.hasNew = false;
      await autoSaveStorageServ.saveChatPreview(chat);
      // Backup chat previews to IndexedDB (web version only)
      await saveChatPreviewsToDb(chatPreviewList.value);
    }
    if (chatListeners.value[pubKey]) {
      chatListeners.value[pubKey]();
      delete chatListeners.value[pubKey];
    }
    // Always initialize message array and load history messages
    chatMessages.value[pubKey] = chatMessages.value[pubKey] || [];
    await loadMoreChatHistory(pubKey); // Force load initial history messages
    listenChat(pubKey);
  }


  async function loadMoreChatHistory(pubKey: string, beforeId?: number): Promise<void> {
    if (!currentUserPub.value || isLoadingHistory.value) return;

    const chatId = generateChatId(currentUserPub.value, pubKey);
    const messages = chatMessages.value[pubKey] || [];
    const oldestMsg = messages.length > 0 ? messages[0] : undefined;

    isLoadingHistory.value = true;
    try {
      const fetchBeforeId = beforeId !== undefined ? beforeId : oldestMsg?.id;
      const newMessages = await storageServ.getMessages(chatId, 15, fetchBeforeId, 'DESC');
      if (newMessages.length > 0) {
        const existingIds = new Set(messages.map(m => m.id));
        const filteredMessages = newMessages.filter(m => !existingIds.has(m.id));
        if (filteredMessages.length > 0) {
          chatMessages.value[pubKey] = [...filteredMessages.reverse(), ...messages];
          chatMessages.value = { ...chatMessages.value };
        }
      }
    } catch (err) {
      // console.error(`Failed to load more history messages for ${pubKey}:`, err);
      // showToast('Failed to load more history messages', 'error');
    } finally {
      isLoadingHistory.value = false;
    }
  }

  function listenChat(pubKey: string): (() => void) | null {
    const myPub = currentUserPub.value;
    const chatId = generateChatId(myPub, pubKey);

    if (!buddyList.value.some(b => b.pub === pubKey)) return null;
    if (chatListeners.value[pubKey]) return chatListeners.value[pubKey];
    gun.get('chats').get(chatId).get('deleted').get(myPub).once((val: any) => {
      deletedRecordsMap.value[chatId] = typeof val === 'number' ? val : 0;
    });

    const deletedListener = gun.get('chats').get(chatId).get('deleted').get(myPub).once((val: any) => {
      deletedRecordsMap.value[chatId] = typeof val === 'number' ? val : 0;
      chatMessages.value[pubKey] = (chatMessages.value[pubKey] || []).filter(m => m.timestamp > deletedRecordsMap.value[chatId]);
      chatMessages.value = { ...chatMessages.value };
    });

    const messageListener = gun.get('chats').get(chatId).get('messages').map().on(async (data: NetworkChatMessage | undefined, msgId: string) => {
      if (!data || !data.from || sentMessages.value.has(msgId)) return;
      if (!buddyList.value.some(b => b.pub === data.from )) return;
      if (data.from !== myPub && data.from !== pubKey) return;

      const cutoff = deletedRecordsMap.value[chatId] || 0;
      if (data.timestamp <= cutoff) return;

      const existingInSqlite = await storageServ.query('SELECT id FROM messages WHERE chatID = ? AND msgId = ?', [chatId, msgId]);
      if (existingInSqlite.values?.length > 0) return;

      const localMsg = await decryptMessage(data, pubKey);
      if (!localMsg) return;

      localMsg.chatID = chatId;
      const insertedId = await autoSaveStorageServ.insertMessage(chatId, localMsg);
      localMsg.id = insertedId;

      if(currentChatPub.value != null) {
        chatMessages.value[pubKey] = chatMessages.value[pubKey] || [];
        chatMessages.value[pubKey].push(localMsg);
        chatMessages.value = { ...chatMessages.value };
      }

      // Send message receipt (confirmation that the other party received the message)
      if (data.from !== myPub) {
        await sendMessageReceipt(chatId, msgId);
      }

      // Handle AI auto-reply (WebLLM)
      if (
        data.from !== myPub &&
        ((): boolean => {
          const { isAutoReplyEnabledForBuddy } = useWebLLMChat();
          return isAutoReplyEnabledForBuddy(pubKey);
        })() &&
        localMsg.type === 'text' && // Only reply to text messages for now
        localMsg.text
      ) {
        try {
          // Fetch conversation history for context
          const history = await storageServ.getMessages(chatId, 10, undefined, 'DESC');
          const messages: ChatMessage[] = history
            .filter((msg: LocalChatMessage) => msg.type === 'text' && msg.text)
            .map((msg: LocalChatMessage) => ({
              role: msg.from === myPub ? 'user' : 'assistant',
              content: msg.text!,
            }))
            .reverse(); // Ensure chronological order

          // Add the latest message
          messages.push({ role: 'user', content: localMsg.text });

          // Generate reply using WebLLM (non-streaming)
          const { generateWebLLMReply } = useWebLLMChat();
          const openAiMessages = messages.map(m => ({ role: m.role as ChatRole, content: m.content }));
          const reply = await generateWebLLMReply(openAiMessages);

          // Send reply immediately
          currentChatPub.value = pubKey;
          await sendChat('text', reply);
        } catch (error) {
        //  console.error('AI auto-reply failed:', error);
         // showToast('Failed to generate AI reply', 'error');
        }
      }

      if (data.from !== myPub) {
        const lastNotified = lastNotifiedTimestamp.value[pubKey] || 0;
        if (localMsg.timestamp > lastNotified && localMsg.timestamp <= Date.now()) {
          lastNotifiedTimestamp.value[pubKey] = localMsg.timestamp;
          await triggerLightHaptic();
        }
      }

      // Update chat preview, but avoid overwriting sending status
      const shortMsg = getPreviewText(localMsg).length > 10 ? getPreviewText(localMsg).slice(0, 10) + '...' : getPreviewText(localMsg);
      const timeStr = formatTimestamp(localMsg.timestamp);
      const idx = chatPreviewList.value.findIndex(c => c.pub === pubKey);
      
      // If it's a message sent by current user, check if sending status is being displayed to avoid overwriting
      const shouldUpdatePreview = data.from !== myPub || 
        (idx >= 0 && !chatPreviewList.value[idx].lastMsg.startsWith('⏳') && !chatPreviewList.value[idx].lastMsg.startsWith('✓'));
      
      if (shouldUpdatePreview) {
        if (idx >= 0) {
          chatPreviewList.value[idx].lastMsg = shortMsg;
          chatPreviewList.value[idx].lastTime = timeStr;
          chatPreviewList.value[idx].hidden = false;
          chatPreviewList.value[idx].hasNew = data.from !== myPub && currentChatPub.value !== pubKey;
          await autoSaveStorageServ.saveChatPreview(chatPreviewList.value[idx]);
        } else {
          const newPreview: ChatPreview = {
            pub: pubKey,
            lastMsg: shortMsg,
            lastTime: timeStr,
            hidden: false,
            hasNew: data.from !== myPub && currentChatPub.value !== pubKey,
          };
          chatPreviewList.value.push(newPreview);
          await autoSaveStorageServ.saveChatPreview(newPreview);
        }
        // Backup chat previews to IndexedDB (web version only)
        await saveChatPreviewsToDb(chatPreviewList.value);
        chatPreviewList.value = [...chatPreviewList.value];
      }
    });

    // Start receipt listening
    listenMessageReceipts(chatId);

    const cleanup = () => {
      deletedListener.off();
      messageListener.off();
    };
    
    chatListeners.value[pubKey] = cleanup;
    return cleanup;
  }

  async function retractMessage(chatId: string, msgId: string): Promise<void> {
    if (!currentChatPub.value) return;
    const pubKey = currentChatPub.value;
    const msg = chatMessages.value[pubKey]?.find(m => m.msgId === msgId);
    if (msg && msg.id) {
      await autoSaveStorageServ.deleteMessage(chatId, msg.id);
      chatMessages.value[pubKey] = chatMessages.value[pubKey].filter(m => m.msgId !== msgId);
      chatMessages.value = { ...chatMessages.value };
    //  showToast(` ${msgId} Deleted from the local area`, 'success');
    }
    gun.get('chats').get(chatId).get('messages').get(msgId).put(null);
  }

  async function exportDataToGun(): Promise<{ syncCode: string; totalSize: number }> {
    if (!currentUserPub.value) {
    //  showToast('Not logged in', 'warning');
      throw new Error('Not logged in');
    }

    const myPub = currentUserPub.value;
    // 生成6位随机数字验证码
    const syncCode = Math.floor(100000 + Math.random() * 900000).toString();
    const data = {
      buddies: await storageServ.getBuddies(myPub),
      messages: [],
      chatPreviews: await storageServ.getAllChatPreviews(),
    } as { buddies: Buddy[], messages: LocalChatMessage[], chatPreviews: ChatPreview[] };

    const chatIds = await storageServ.query('SELECT DISTINCT chatID FROM messages');
    for (const row of chatIds.values || []) {
      const chatId = row.chatID;
      const messages = await storageServ.getMessages(chatId, undefined, undefined, 'ASC');
      data.messages.push(...messages);
    }

    const totalSize = JSON.stringify(data).length;
    const chunkSize = 1024 * 1024;
    const serializedData = JSON.stringify(data);
    const chunks: any[] = [];
    for (let i = 0; i < serializedData.length; i += chunkSize) {
      chunks.push(serializedData.slice(i, i + chunkSize));
    }

    // 将数据存储到带有myPub前缀的路径
    for (let i = 0; i < chunks.length; i++) {
      await new Promise((resolve) => {
        gun.get('migration').get(myPub).get(syncCode).get(`chunk_${i}`).put(chunks[i], (ack: any) => {
          if (ack.err) throw new Error(ack.err);
          resolve(null);
        });
      });
      exportProgress.value = Math.round(((i + 1) / chunks.length) * 100);
    }

    // 导出成功后，在同步状态节点+1
    await new Promise((resolve) => {
      gun.get('migration').get(myPub).get(syncCode).get('sync_status').once((currentStatus: number) => {
        const newStatus = (currentStatus || 0) + 1;
        gun.get('migration').get(myPub).get(syncCode).get('sync_status').put(newStatus, (ack: any) => {
          if (ack.err) throw new Error(ack.err);
          resolve(null);
        });
      });
    });

    // 检查状态节点，如果>=2则清空数据和状态节点
    gun.get('migration').get(myPub).get(syncCode).get('sync_status').once((status: number) => {
      if (status >= 2) {
        // 清空数据节点和状态节点
        gun.get('migration').get(myPub).get(syncCode).put(null);
        showToast('The data has been exported and the cache data has been deleted', 'success');
      }
    });

    showToast('The data has been exported.', 'success');
    return { syncCode, totalSize };
  }

  async function importDataFromGun(syncCode: string): Promise<void> {
    if (!currentUserPub.value) {
      showToast('Please log in first.', 'warning');
      throw new Error('error');
    }

    const myPub = currentUserPub.value;

    const chunks: string[] = [];
    let totalChunks = 0;

    return new Promise((resolve, reject) => {
      // 从带有myPub前缀的路径获取数据
      gun.get('migration').get(myPub).get(syncCode).map().once((data: any, key: string) => {
        if (key.startsWith('chunk_')) {
          chunks[parseInt(key.split('_')[1])] = data;
          totalChunks = Math.max(totalChunks, parseInt(key.split('_')[1]) + 1);
        }
      });

      // 等待数据加载完成，增加重试机制
      const waitForData = async (retryCount = 0) => {
        if (retryCount > 10) { // 最多重试10次
          reject(new Error('Invalid synchronization code or data not found'));
          return;
        }

        if (chunks.length === 0 || chunks.some(chunk => chunk === undefined)) {
          setTimeout(() => waitForData(retryCount + 1), 1000);
          return;
        }

        try {
          const fullData = chunks.join('');
          const data = JSON.parse(fullData) as { buddies: Buddy[], messages: LocalChatMessage[], chatPreviews: ChatPreview[] };
          const totalItems = data.buddies.length + data.messages.length + data.chatPreviews.length;
          
          if (totalItems === 0) {
            showToast('No data to import', 'warning');
            resolve();
            return;
          }

          let processedItems = 0;

          // 导入好友数据
          for (let i = 0; i < data.buddies.length; i++) {
            const buddy = data.buddies[i];
            await autoSaveStorageServ.saveBuddy(myPub, buddy.pub, buddy.timestamp, buddy.alias, buddy.avatar);
            processedItems++;
            importProgress.value = Math.round((processedItems / totalItems) * 100);
          }

          // 导入消息数据
          for (let i = 0; i < data.messages.length; i++) {
            const message = data.messages[i];
            await autoSaveStorageServ.insertMessage(message.chatID!, message);
            processedItems++;
            importProgress.value = Math.round((processedItems / totalItems) * 100);
          }

          // 导入聊天预览数据
          for (let i = 0; i < data.chatPreviews.length; i++) {
            const preview = data.chatPreviews[i];
            await autoSaveStorageServ.saveChatPreview(preview);
            processedItems++;
            importProgress.value = Math.round((processedItems / totalItems) * 100);
          }

          // 刷新本地数据
          buddyList.value = await storageServ.getBuddies(myPub);
          chatPreviewList.value = await storageServ.getAllChatPreviews();
          if (currentChatPub.value) await openChat(currentChatPub.value);

          // 接收完全部数据后，在同步状态节点+1
          await new Promise((resolveStatus) => {
            gun.get('migration').get(myPub).get(syncCode).get('sync_status').once((currentStatus: number) => {
              const newStatus = (currentStatus || 0) + 1;
              gun.get('migration').get(myPub).get(syncCode).get('sync_status').put(newStatus, (ack: any) => {
                if (ack.err) throw new Error(ack.err);
                resolveStatus(null);
              });
            });
          });

          // 检查状态节点，如果>=2则清空数据和状态节点
          gun.get('migration').get(myPub).get(syncCode).get('sync_status').once((status: number) => {
            if (status >= 2) {
              // 清空数据节点和状态节点
              gun.get('migration').get(myPub).get(syncCode).put(null);
              showToast('The data has been imported and the cache data has been deleted', 'success');
            }
          });

          showToast('Data import is successful', 'success');
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      waitForData();
    });
  }

  function closeChat(): void {
    if (currentChatPub.value) {
      if (chatListeners.value[currentChatPub.value]) {
        chatListeners.value[currentChatPub.value]();
        delete chatListeners.value[currentChatPub.value];
      }
      delete chatMessages.value[currentChatPub.value];
      currentChatPub.value = null;
    }
  }

  function hideCurrentChat(): void {
    if (!currentChatPub.value) return;
    const pubKey = currentChatPub.value;
    const chat = chatPreviewList.value.find(c => c.pub === pubKey);
    if (chat) {
      chat.hidden = true;
      chat.hasNew = false;
      storageServ.saveChatPreview(chat);
    }
    currentChatPub.value = null;
  }

  function showCurrentChat(): void {
    if (!currentChatPub.value) return;
    const pubKey = currentChatPub.value;
    const chat = chatPreviewList.value.find(c => c.pub === pubKey);
    if (chat) {
      chat.hidden = false;
      chat.hasNew = false;
      storageServ.saveChatPreview(chat);
    }
    currentChatPub.value = null;
  }

  function refreshChat(): void {
    if (!currentUserPub.value || !currentChatPub.value) return;
    if (chatListeners.value[currentChatPub.value]) {
      chatListeners.value[currentChatPub.value]();
      delete chatListeners.value[currentChatPub.value];
    }
    chatMessages.value[currentChatPub.value] = [];
    listenChat(currentChatPub.value);
  }

  async function decryptMessage(data: NetworkChatMessage, pubKey: string): Promise<LocalChatMessage | null> {
    const myPub = currentUserPub.value!;
    let decryptedContent = '';

    try {
      if (data.type === 'text') {
        const encrypted = data.from === myPub ? data.textForMe : data.textForBuddy;
        decryptedContent = data.from === myPub
          ? await decryptMessageWithMyEpub(encrypted!)
          : await decryptMessageWithBuddyEpub(pubKey, encrypted!);
      } else if (data.type === 'voice') {
        const encrypted = data.from === myPub ? data.audioForMe : data.audioForBuddy;
        if (encrypted) {
          decryptedContent = data.from === myPub
            ? await decryptMessageWithMyEpub(encrypted)
            : await decryptMessageWithBuddyEpub(pubKey, encrypted);
        }
      } else if (data.type === 'file') {
        const encrypted = data.content;
        if (encrypted) {
          decryptedContent = data.from === myPub
            ? await decryptMessageWithMyEpub(encrypted)
            : await decryptMessageWithBuddyEpub(pubKey, encrypted);
        }
      }

      if (!decryptedContent) return null;

      if (data.signature && data.hash) {
        const verifiedData = await Gun.SEA.verify(data.signature, data.from);
        if (!verifiedData) return null;
        const parsedSignData = typeof verifiedData === 'string' ? JSON.parse(verifiedData) : verifiedData;
        const computedHash = await Gun.SEA.work(decryptedContent, null, null, { name: 'SHA-256' });
        if (computedHash !== data.hash || computedHash !== parsedSignData.hash) return null;
      }

      const localMsg: LocalChatMessage = {
        chatID: data.chatID,
        from: data.from,
        type: data.type,
        text: data.type === 'text' ? decryptedContent : undefined,
        audioUrl: data.type === 'voice' ? decryptedContent : undefined,
        fileId: data.type === 'file' ? decryptedContent : undefined,
        textForBuddy: data.textForBuddy,
        textForMe: data.textForMe,
        audioForBuddy: data.audioForBuddy,
        audioForMe: data.audioForMe,
        signature: data.signature,
        hash: data.hash,
        timestamp: data.timestamp,
        msgId: data.msgId,
        sent: true,
        status: 'sent',
        isSending: false,
        duration: data.type === 'voice' ? data.duration : undefined,
      };
      return localMsg;
    } catch (err) {
      // console.error(`Failed to decrypt message ${data.msgId}:`, err);
      return null;
    }
  }

  const fileData: Ref<File | null> = ref(null);
  const filePreviewUrl: Ref<string | null> = ref(null);

  function handleFileUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      fileData.value = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        filePreviewUrl.value = e.target?.result as string;
      };
      reader.readAsDataURL(target.files[0]);
    }
  }

  async function sendFileMessage(): Promise<void> {
    if (!fileData.value) {
      // showToast('Please select a file', 'warning');
      return;
    }
    // const networkAvailable = await pingNetworkAndPeers();
    // if (!networkAvailable) {
    //   // showToast('网络不可用，请检查连接后重试', 'warning');
    //   return;
    // }
    const fileId = uuidv4();
    const file: FileData = {
      fileId,
      chatID: generateChatId(currentUserPub.value!, currentChatPub.value!),
      sender: currentUserPub.value!,
      fileName: fileData.value.name,
      fileSize: fileData.value.size,
      fileType: fileData.value.type,
      fileUrl: filePreviewUrl.value!,
      timestamp: Date.now(),
    };
    await autoSaveStorageServ.saveFile(file);
    await sendChat('file', fileId);
    fileData.value = null;
    filePreviewUrl.value = null;
  }

  async function onDeleteChatClick(pub: string): Promise<void> {
    if (!pub || !currentUserPub.value) return;
    const chatId = generateChatId(currentUserPub.value, pub);
    await new Promise<void>((resolve) => {
      gun.get('chats').get(chatId).get('messages').map().once((data: any, msgId: string) => {
        if (data) {
          gun.get('chats').get(chatId).get('messages').get(msgId).put(null, (ack: any) => {
            if (ack.err) {
              // Failed to delete message
            }
          });

        }
      });
      // Wait for cleanup to complete
      setTimeout(resolve, 1000); // Add delay to ensure Gun.js sync
    });
    try {
      // Local cleanup
      chatMessages.value[pub] = [];
      chatMessages.value = { ...chatMessages.value };
      await storageServ.run('DELETE FROM messages WHERE chatID = ?', [chatId]);
      await autoSaveStorageServ.deleteChatPreview(pub); // Delete chat preview
  
      // Remote cleanup of all messages
      await new Promise<void>((resolve) => {
        gun.get('chats').get(chatId).get('messages').map().once((data: any, msgId: string) => {
          if (data) {
            gun.get('chats').get(chatId).get('messages').get(msgId).put(null, (ack: any) => {
              if (ack.err) {
                // Failed to delete message
              }
            });

          }
        });
        // Wait for cleanup to complete
        setTimeout(resolve, 1000); // Add delay to ensure Gun.js sync
      });
  
      // Optional: clear deleted marker (if still needed to retain)
      gun.get('chats').get(chatId).get('deleted').get(currentUserPub.value).put(null);
  
      showToast(`Chat ${chatId} has been completely deleted`, 'success');
    } catch (err) {
      // Failed to delete chat
      showToast('Failed to delete chat', 'error');
    }
  }

  async function decryptMessageWithMyEpub(encryptedText: string): Promise<string> {
    if (!currentUserPair) return '(Not logged in)';
    const myEpub = currentUserPair.epub as string;
    const secretMe = await Gun.SEA.secret(myEpub, currentUserPair);
    if (!secretMe) return '(Failed to generate secret)';
    const decrypted = await Gun.SEA.decrypt(encryptedText, secretMe);
    return decrypted || '';
  }

  async function decryptMessageWithBuddyEpub(buddyPub: string, encryptedText: string): Promise<string> {
    if (!currentUserPair) return '(Not logged in)';
    const buddyEpub = await getUserEpub(buddyPub);
    if (!buddyEpub) return '(NullbuddyEpub)';
    const secretBuddy = await Gun.SEA.secret(buddyEpub, currentUserPair);
    if (!secretBuddy) return '(Failed to generate secret)';
    const decrypted = await Gun.SEA.decrypt(encryptedText, secretBuddy);
    return decrypted || '';
  }

  function listenMyAlias(myPub: string): void {
    gun.get('users').get(myPub).on(async (data: any) => {
      if (data?.alias && data.alias !== currentUserAlias.value) {
        currentUserAlias.value = data.alias;
        aliasMap.value[myPub] = data.alias;
        await autoSaveStorageServ.saveUser(myPub, data.alias, userAvatars.value[myPub]);
        // Also save to IndexedDB (web version only)
        await saveUserAliasToDb(data.alias);
      }
      if (data?.signature) {
        signatureMap.value[myPub] = data.signature;
        currentUserAlias1.value = data.signature;
      }
    });
  }

  function listenUserAlias(pub: string): void {
    gun.get('users').get(pub).get('alias').on(async (val: string) => {
      if (val !== aliasMap.value[pub]) {
        aliasMap.value[pub] = val || 'Loading..';
        const buddyIndex = buddyList.value.findIndex(b => b.pub === pub);
        if (buddyIndex !== -1 && currentUserPub.value) {
          buddyList.value[buddyIndex].alias = val || 'Loading..';
          await autoSaveStorageServ.saveBuddy(currentUserPub.value, pub, buddyList.value[buddyIndex].timestamp, val, buddyList.value[buddyIndex].avatar);
          buddyList.value = [...buddyList.value];
        }
      }
    });
  }

  function listenUserAvatar(pub: string): void {
    gun.get('users').get(pub).get('avatar').on(async (val: string) => {
      if (val !== userAvatars.value[pub]) {
        userAvatars.value[pub] = val || '';
        const buddyIndex = buddyList.value.findIndex(b => b.pub === pub);
        if (buddyIndex !== -1 && currentUserPub.value) {
          buddyList.value[buddyIndex].avatar = val || '';
          await autoSaveStorageServ.saveBuddy(currentUserPub.value, pub, buddyList.value[buddyIndex].timestamp, buddyList.value[buddyIndex].alias, val);
          buddyList.value = [...buddyList.value];
        }
      }
    });
  }

  async function setupListeners(pub: string): Promise<void> {
    listenMyBuddyList(pub);
    listenMyAlias(pub);
    listenMyBlacklist(pub);
    listenMyRequests(pub);

    listenEpubPool(pub); 
    listenAllChats(pub);
    listenMyAvatar(pub);
    buddyList.value.forEach(buddy => {
      listenUserAlias(buddy.pub);
      listenUserAvatar(buddy.pub);
      listenFriendSignature(buddy.pub);
    });
    await loadRequestsViewedState();
    
    // 自动启用中继共享功能
    if (!isRelaySharingEnabled.value) {
     // console.log('[TalkFlowCore] 自动启用中继共享功能');
      await toggleRelaySharing(true, true);
    }

  }

  // 重启所有监听器的方法
  async function restartAllListeners() {

   await CreateNewGun();
  
  await setupListeners(currentUserPub.value);
      
   
  }

  const newAliasInput: Ref<string> = ref('');
  const updateAliasMsg: Ref<string> = ref('');
  async function updateAlias(): Promise<void> {
    if (!currentUserPub.value) {
      updateAliasMsg.value = 'Not logged in';
      showToast(updateAliasMsg.value, 'warning');
      return;
    }
    const newAliasValue = newAliasInput.value.trim();
    if (!newAliasValue) {
      updateAliasMsg.value = 'The name cannot be empty.';
      showToast(updateAliasMsg.value, 'warning');
      return;
    }

    try {
      gun.get('users').get(currentUserPub.value).put({ alias: newAliasValue });
      await autoSaveStorageServ.saveUser(currentUserPub.value, newAliasValue);
      // Also save to IndexedDB (web version only)
      await saveUserAliasToDb(newAliasValue);
      updateAliasMsg.value = 'Successful update';
      showToast(updateAliasMsg.value, 'success');
      newAliasInput.value = '';
      currentUserAlias.value = newAliasValue;
    } catch (err) {
      updateAliasMsg.value = 'error';
      showToast(updateAliasMsg.value, 'error');
    }
  }

  const newAliasInput1: Ref<string> = ref('');
  const updateAliasMsg1: Ref<string> = ref('');
  async function updateAlias1(): Promise<void> {
    if (!currentUserPub.value) {
      updateAliasMsg1.value = 'error';
      showToast(updateAliasMsg1.value, 'warning');
      return;
    }
    const newAliasValue1 = newAliasInput1.value.trim();

    try {
      gun.get('users').get(currentUserPub.value).put({ signature: newAliasValue1 });
      updateAliasMsg1.value = 'Successful update';
   //   showToast(updateAliasMsg1.value, 'success');
      newAliasInput1.value = '';
      currentUserAlias1.value = newAliasValue1;
    } catch (err) {
      updateAliasMsg1.value = 'error';
     // showToast(updateAliasMsg1.value, 'error');
      // console.error('Signature update failed:', err);
    }
  }

  const avatarFile: Ref<File | null> = ref(null);
  const avatarUrl: Ref<string | null> = ref(null);
  const updateAvatarMsg: Ref<string> = ref('');

  function handleAvatarUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      avatarFile.value = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarUrl.value = e.target?.result as string;
      };
      reader.readAsDataURL(target.files[0]);
    }
  }

async function deleteOldAvatar(pubKey: string): Promise<void> {
  try {
    // Get current user data to retrieve old avatar
    const userData = await storageServ.getUser(pubKey);
    
    if (userData && userData.avatar) {
         // Clear avatar field in Gun.js
         gun.get('users').get(pubKey).put({ avatar: null });
      // 1. Set avatar field to null in user table
      await storageServ.run(
        'UPDATE users SET avatar = NULL WHERE pubKey = ?',
        [pubKey]
      );
      
      // 2. Also remove from memory cache
      delete userAvatars.value[pubKey];
      
      // 3. Notify components to refresh
      setTimeout(() => {
        const event = new CustomEvent('avatar-updated', { detail: { pubKey } });
        window.dispatchEvent(event);
      }, 10);
    }
  } catch (error) {
   // console.error('Failed to delete old avatar:', error);
    // Continue execution, don't block new avatar setting
  }
}
  async function updateAvatar(): Promise<void> {
    if (!currentUserPub.value) {
      updateAvatarMsg.value = 'error';
      showToast(updateAvatarMsg.value, 'warning');
      return;
    }
    if (!avatarFile.value) {
      updateAvatarMsg.value = 'Please select an avatar file first.';
      showToast(updateAvatarMsg.value, 'warning');
      return;
    }


    try {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;

            // Clear avatar field in Gun.js
        gun.get('users').get(currentUserPub.value!).put({ avatar: null });
              // Delete old avatar - first delete from database
        await deleteOldAvatar(currentUserPub.value!);
        
      
        
         await gun.get('users').get(currentUserPub.value!).put({ avatar: base64 });
          await storageServ.saveUser(currentUserPub.value!, currentUserAlias.value || undefined, base64);
          // Also save to IndexedDB (web version only)
          await saveUserAvatarToDb(base64);

          updateAvatarMsg.value = 'success';
          showToast(updateAvatarMsg.value, 'success');
          avatarFile.value = null;
          avatarUrl.value = null;
          userAvatars.value[currentUserPub.value!] = base64;
          resolve();
        };
        reader.readAsDataURL(avatarFile.value!);
      });
    } catch (err: any) {
      updateAvatarMsg.value = 'error';
      showToast(`${updateAvatarMsg.value}: ${err.message || 'error'}`, 'error');
      // console.error('Avatar update failed:', err);
    }
  }

  function listenMyAvatar(myPub: string): void {
    gun.get('users').get(myPub).get('avatar').on(async (val: string) => {
      if (val !== userAvatars.value[myPub]) {
        userAvatars.value[myPub] = val;
        await storageServ.saveUser(myPub, currentUserAlias.value || undefined, val);
        // Also save to IndexedDB (web version only)
        if (val) {
          await saveUserAvatarToDb(val);
        }
      }
    });
  }

  function UserCardMode(): void {
    showUserCard.value = !showUserCard.value;
  }
 

  async function searchUserProfile(pub: string): Promise<{ pub: string; alias?: string; avatar?: string } | null> {
    user.auth(currentUserPair!)
    let retries = 0;
    const maxRetries = 3;
    while (retries < maxRetries) {
      const result = await new Promise<{ pub: string; alias?: string; avatar?: string } | null>((resolve) => {
       gun.get('users').get(pub).once((data: any) => {
          if (data) {
            resolve({ pub, alias: data.alias || '', avatar: data.avatar || '' });
          } else {
            resolve(null);
          }
        });
      });

      if (result) return result;
      retries++;
      if (retries === maxRetries) {
      //  showToast(`No user was found in the current node. ${pub}`, 'warning');
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return null;
  }



  function prioritizePeer(peer: string): void {
    // Move specified node to the top of enabled list
    enabledPeers.value = enabledPeers.value.filter(p => p !== peer);
    enabledPeers.value.unshift(peer);
    gun.opt({ peers: enabledPeers.value });
    // console.log(`Prioritize Peer: ${peer}`);
  }

  function disablePeer(): void {
    // Reset to use all nodes
    enabledPeers.value = [...peersList.value];
    gun.opt({ peers: enabledPeers.value });
    // console.log('Reset to use all Peers');
  }


  function listenFriendSignature(pub: string): void {
    gun.get('users').get(pub).get('signature').on(async (val: string) => {
      if (val !== signatureMap.value[pub]) {
        signatureMap.value[pub] = val || '';
        // console.log(`Update signature for ${pub}: ${val}`);
      }
    });
  }
  async function clearAllChats(): Promise<void> {
    if (!currentUserPub.value) {
     // showToast('Not logged in', 'warning');
      return;
    }
    const myPub = currentUserPub.value;
  
    try {
      // Clean up existing listeners
      for (const pub in chatListeners.value) {
        chatListeners.value[pub]();
        delete chatListeners.value[pub];
      }
  
      // Local cleanup
      await storageServ.run('DELETE FROM chat_previews'); 
      await storageServ.run('DELETE FROM messages');
      await storageServ.run('DELETE FROM chat_indexes');
      chatMessages.value = {};
      chatPreviewList.value = [];
      chatChunkRangeMap.value = {};
      sentMessages.value.clear();
      deletedRecordsMap.value = {};
  
      // Remote cleanup of all chat messages
      const buddies = buddyList.value.map(b => b.pub);
      for (const buddyPub of buddies) {
        const chatId = generateChatId(myPub, buddyPub);
        await new Promise<void>((resolve) => {
          gun.get('chats').get(chatId).get('messages').map().once((data: any, msgId: string) => {
            if (data) {
              gun.get('chats').get(chatId).get('messages').get(msgId).put(null, (ack: any) => {
                if (ack.err) {
                  // Failed to delete message in chat
                }
              });
            }
          });
          setTimeout(resolve, 1000); 
        });
  
  
      }
  
      showToast('All chat records have been completely cleared', 'success');
    } catch (err) {
   //   console.error('Failed to clear all chats:', err);
      showToast('Failed to clear all chats', 'error');
    }
  }

  // 监听同步状态节点
  function listenSyncStatus(syncCode: string): () => void {
    if (!currentUserPub.value) return () => {};
    
    const myPub = currentUserPub.value;
    
    const statusListener = gun.get('migration').get(myPub).get(syncCode).get('sync_status').on((status: number) => {
      if (status === 1) {
        otherDeviceExportStatus.value = true;
        showToast('The other device has exported the data. Please enter the verification code to receive the data', 'success');
      } else if (status >= 2) {
        // 双方都完成了，清理监听器
        statusListener.off();
        otherDeviceExportStatus.value = false;
        syncStatus.value = 0;
      }
    });
    
    return () => {
      statusListener.off();
    };
  }


  // 开始监听同步状态（在UI中调用）
  function startSyncStatusListener(syncCode: string): () => void {
    return listenSyncStatus(syncCode);
  }
  async function deactivateAccount(): Promise<void> {
    if (!currentUserPub.value) {
      showToast('error', 'warning');
      return;
    }

    const myPub = currentUserPub.value;
    // console.log('Starting account deactivation:', myPub);

    try {
      for (const pub in chatListeners.value) {
        chatListeners.value[pub]();
        delete chatListeners.value[pub];
      }

      const buddies = [...buddyList.value];
      for (const buddy of buddies) {
        gun.get('users').get(myPub).get('buddy').get(buddy.pub).put(null);
        gun.get('users').get(buddy.pub).get('notifications').set({
          from: myPub,
          type: 'friend_removed',
          timestamp: Date.now(),
          message: `${currentUserAlias.value || 'Someone'} This account has been invalidated.`,
        });
      }

      await new Promise<void>((resolve, reject) => {
        gun.get('users').get(myPub).put({
          alias: null,
          avatar: null,
          epub: null,
          signature: null,
          buddy: null,
          blacklist: null,
          deleted: true,
        }, (ack: any) => {
          if (ack.err) {
            // Unable to mark account as deleted
            reject(new Error(ack.err));
          } else {
            resolve();
          }
        });
      });
      gun.get('requests').get(myPub).get('received').put(null);

      await storageServ.run('DELETE FROM users WHERE pubKey = ?', [myPub]);
      await storageServ.run('DELETE FROM buddies WHERE userPub = ?', [myPub]);
      await storageServ.run('DELETE FROM messages');
      await storageServ.run('DELETE FROM chat_previews');
      await storageServ.run('DELETE FROM chat_indexes');
      await storageServ.run('DELETE FROM credentials WHERE key = ?', ['userCredentials']);
      await storageServ.run('DELETE FROM sent_requests WHERE fromPub = ?', [myPub]);
      await storageServ.run('DELETE FROM blacklist');
      await storageServ.run('DELETE FROM friend_remarks WHERE userPub = ?', [myPub]);
      // Also clear credentials in IndexedDB (web version only)
      await clearCredentialsFromDb();
     // await gunIonicAdapter.clearCache();
      // Record deleted account to local JSON file
    await saveDeactivatedAccount(myPub);
      user.leave();
      isLoggedIn.value = false;
      currentUserPub.value = null;
      currentUserAlias.value = null;
      currentUserAlias1.value = null;
       currentUserPair.value = null;
      loginError.value = null;
      buddyList.value = [];
      receivedRequests.value = [];
      chatPreviewList.value = [];
      chatMessages.value = {};
      aliasMap.value = {};
      signatureMap.value = {};
      userAvatars.value = {};
      sentMessages.value.clear();
      friendRemarks.value = {};
      blacklist.value = [];
      currentChatPub.value = null;

      //await gunIonicAdapter.clearCache();

    //  showToast('The account has been logged out, and all local data and friend relationships have been cleared.', 'success');
     // router.replace({ path: '/' });
    } catch (err) {
     // showToast('error', 'error');
    
    }
  }

  const exportProgress = ref(0);
  const importProgress = ref(0);
    const syncStatus = ref(0); // 同步状态：0=未开始，1=导出完成，2=导入完成
  const otherDeviceExportStatus = ref(false); // 对方设备导出状态

  const setSelectedFriendPub = (pub: string) => {
    selectedFriendPub.value = pub;

  };

  const requestsViewed = ref(false);

  // Save friend request viewed status to SQLite
async function saveRequestsViewedState() {
  try {
    await storageServ.run(
      'INSERT OR REPLACE INTO requests_viewed (id, viewed) VALUES (1, ?)',
      [requestsViewed.value ? 1 : 0]
    );
   // console.log('Save friend request read status:', requestsViewed.value);
  } catch (err) {
    //console.error('Failed to save read status:', err);
  }
}
// Load friend request viewed status from SQLite
async function loadRequestsViewedState() {
  try {
    const result = await storageServ.query('SELECT viewed FROM requests_viewed WHERE id = 1');
    if (result.values?.length > 0) {
      requestsViewed.value = result.values[0].viewed === 1;
    } else {
      requestsViewed.value = false;
    }
   // console.log('Load friend request read status:', requestsViewed.value);
  } catch (err) {
   // console.log('No read status record found, default to unread:', err);
    requestsViewed.value = false;
  }
}


  const updateScreenSize = () => {
    isLargeScreen.value = window.innerWidth > 768;
    switchTo('Chat');
  };




async function listenMyRequests(myPub: string): Promise<void> {
    gun.get('requests').get(myPub).get('received').on(async (data: any, key: string) => {
      if (!data || !data.from) {
        receivedRequests.value = receivedRequests.value.filter(r => r.from !== key);
      } else {
        if (isInMyBlacklist(data.from)) {
           gun.get('requests').get(myPub).get('received').get(key).put(null);
          return;
        }
        const userInfo = await fetchUserInfo(data.from);
        const existing = receivedRequests.value.find(r => r.from === data.from);
        if (!existing) {
          const newRequest = { 
            from: data.from, 
            message: data.message || '', 
            alias: data.alias || userInfo.alias,
            avatar: data.avatar || userInfo.avatar,
            epub: data.epub || ''
          };
          receivedRequests.value.push(newRequest);
          requestsViewed.value = false;
          await saveRequestsViewedState();
        } else if (existing.message !== data.message || existing.alias !== data.alias || existing.avatar !== data.avatar) {
          existing.message = data.message || '';
          existing.alias = data.alias || userInfo.alias;
          existing.avatar = data.avatar || userInfo.avatar;
        }
      }
    });
  }
 
  // 🆕 epub池监听函数
  async function listenEpubPool(myPub: string): Promise<void> {
   // console.log('📡 开始监听epub池:', { myPub: myPub.slice(0, 8) });
    
    gun.get('epub_pool').get(myPub).on(async (data: any, key: string) => {
      if (!data || typeof data !== 'string') {
    //    console.log('📡 epub池数据无效:', { key: key?.slice(0, 8), data });
        return;
      }
      
      // 检查发送者是否在好友列表中
      const isFriend = buddyList.value.some(buddy => buddy.pub === key);
      if (!isFriend) {
      //  console.log('📡 忽略非好友的epub:', { fromPub: key?.slice(0, 8) });
        return;
      }
      
      console.log('📡 收到好友epub:', {
        fromPub: key?.slice(0, 8),
        epub: data ? '有epub' : '无epub'
      });
      
      // 自动保存epub到本地
      try {
        await autoSaveStorageServ.saveEpub(key, data);
       // console.log('💾 已自动保存好友epub:', { fromPub: key?.slice(0, 8) });
        
        // 更新epub缓存
        epubCache[key] = data;
        
        // 可选：显示通知
        const buddy = buddyList.value.find(b => b.pub === key);
        if (buddy) {
         // showToast(`已更新 ${buddy.alias || 'Friend'} 的安全密钥`, 'success', 2000);
        }
      } catch (error) {
       // console.error('❌ 保存好友epub失败:', {
       //   fromPub: key?.slice(0, 8),
       //   error: error
       // });
      }
    });
  }

  loadRequestsViewedState();

  // New: shared relay status
  const isRelaySharingEnabled = ref(true);

  // Load initial state
  settingsService.isRelaySharingEnabled().then(value => {
    isRelaySharingEnabled.value = value;
  });

  // 中继共享定时器
  let relaySharingInterval: ReturnType<typeof setInterval> | null = null;

  // New: toggle and update relay sharing status
  async function toggleRelaySharing(enabled: boolean, isInitialLoad = false): Promise<void> {
    //console.log('[TalkFlowCore] toggleRelaySharing called:', { enabled, isInitialLoad, currentUserPub: currentUserPub.value });
    
    isRelaySharingEnabled.value = enabled;
    await settingsService.setRelaySharingEnabled(enabled);
    
    // 清除现有的定时器
    if (relaySharingInterval) {
      clearInterval(relaySharingInterval);
      relaySharingInterval = null;
    }
    
    if (currentUserPub.value && enabled) {
      // 立即分享一次
      shareRelaysToGlobalPool();
      
      // 设置定时器，每30秒更新一次中继共享状态
      relaySharingInterval = setInterval(() => {
        if (isRelaySharingEnabled.value && currentUserPub.value) {
          shareRelaysToGlobalPool();
        }
      }, 30000); // 30秒间隔
      
      if (!isInitialLoad) showToast('Relay sharing has been enabled', 'success');
    } else {
      //console.log('[TalkFlowCore] 中继共享已禁用，停止定时更新');
      if (!isInitialLoad) showToast('Relay sharing has been disabled', 'info');
    }
  }

  // 分享中继到全局池的函数 - 简化版本
  function shareRelaysToGlobalPool(): void {
    if (!currentUserPub.value || !isRelaySharingEnabled.value) return;
    
    const relayData = {
      relays: enabledPeers.value,
      alias: currentUserAlias.value || `User${currentUserPub.value.slice(0, 8)}`,
      timestamp: Date.now(),
      online: true
    };
    
    //console.log('[TalkFlowCore] 分享中继列表:', relayData);
    
    // 直接存储到 users/myPub/relaylist
    gun.get('users').get(currentUserPub.value).get('relaylist').put(JSON.stringify(relayData), (ack: any) => {
      if (ack && ack.err) {
    //    console.error('[TalkFlowCore] 分享中继失败:', ack.err);
      } else {
     //   console.log('[TalkFlowCore] 中继分享成功');
      }
    });
  }

  return {

    getMyKeyPair,
    Gun,
    exportDataToGun,
    importDataFromGun,
    exportProgress,
    importProgress,
     syncStatus,
    otherDeviceExportStatus,
    deactivateAccount,
    clearAllChats,
    storageServ,
    lastReadTimestamps,
    UserCardMode,
    showUserCard,
    listenChat,
    listenUserAlias,
    listenUserAvatar,
    getFriendSignature,
    currentUserAlias1,
    newAliasInput1,
    updateAlias1,
    updateAliasMsg1,
    isOpen,
    setOpen,
    KeyDown,
    newAlias,
    newPassphrase,
    generateMsg,
    encryptedKeyPair,
    generateKeyPair,
    passphrase,
    encryptedKeyInput,
    importKeyPair,
    isLoggedIn,
    currentUserPub,
    currentUserAlias,
    loginError,
    onLogout,
    blockPub,
    blacklist,
    addToBlacklist,
    removeFromBlacklist,
    isInMyBlacklist,
    friendPub,
    buddyError,
    buddyList,
    receivedRequests,
    requestAddBuddy,
    acceptBuddyRequest,
    rejectBuddyRequest,
    listenMyRequests,
    listenEpubPool, // epub池监听函数
    currentChatPub,
    newMsg,
    chatMessages,
    chatPreviewList,
    visibleChatPreviewList,
    openChat,

    closeChat,
    hideCurrentChat,
    showCurrentChat,
    sendChat,
    resendMessage,
    refreshChat,
    onDeleteChatClick,
    getAliasRealtime,
    newAliasInput,
    updateAlias,
    updateAliasMsg,
    avatarFile,
    avatarUrl,
    handleAvatarUpload,
    updateAvatar,
    updateAvatarMsg,
    userAvatars,
    showNotification,
    formatTimestamp,
    copyPub,
    removeBuddy,
    restoreLoginState,
    triggerLightHaptic,
    gun,
    friendRemarks,
    currentUserPair,
    updateFriendRemark,
    getFriendRemark,
    generateChatId,
    loadMoreChatHistory,
    offlineNotice,
    retractMessage,
    isLoadingHistory,
    chatChunkRangeMap,
    chatListRef,
    LoginData,
    loadBuddies,
    searchUserProfile,
    requestAddBuddyWithMessage,
    addFriend,
    // 🚀 Enhanced add friend functionality (supports offline and self-healing)
    addFriendWithHealing: async function(targetPub: string, message?: string): Promise<void> {
        showToast('Sending friend request...', 'info', 1500);
      // 1. Basic validation
      if (!currentUserPub.value) {
        showToast('Please log in first', 'warning');
        throw new Error('Not logged in, cannot add friend');
      }
      
      // 2. Public key format validation
      // if (!isValidGunPublicKey(targetPub)) {
      //   showToast('Invalid public key format', 'warning');
      //   throw new Error('Invalid public key format');
      // }
      
      // 3. Check for adding oneself
      if (targetPub === currentUserPub.value) {
        showToast('Cannot add yourself as friend', 'warning');
        throw new Error('Cannot add yourself as friend');
      }
      
      // 4. Blacklist check
      if (isInMyBlacklist(targetPub)) {
        showToast('User is in blacklist, please unblock first', 'warning');
        throw new Error('User is in blacklist');
      }
      
      // 5. Duplicate friend check
      if (buddyList.value.some(b => b.pub === targetPub)) {
        showToast('Already friends, no need to add again', 'info');
        return;
      }
            // 6. Show processing status
      // showToast('正在发送好友请求...', 'info', 1500);
     // console.log(`🚀 Start adding friend: ${targetPub.slice(0, 8)}`);
      // 7. Network status check
      // const networkStatus = await checkNetworkStatus();
      // if (!networkStatus.available) {
      //   showToast(networkStatus.message, 'warning');
      //   throw new Error(networkStatus.message);
      // }
      

      
      try {
        // 8. Get user information
         showToast('Syncing user information...', 'info');
        const [userInfo, myInfo] = await Promise.all([
          new Promise<{ alias?: string; avatar?: string }>((resolve) => {
            gun.get('users').get(targetPub).once((data: any) => {
              resolve({
                alias: data?.alias || '',
                avatar: data?.avatar || '',
              });
            });
          }),
          new Promise<{ alias?: string; avatar?: string }>((resolve) => {
            gun.get('users').get(currentUserPub.value).once((data: any) => {
              resolve({
                alias: data?.alias || '',
                avatar: data?.avatar || '',
              });
            });
          })
        ]);
        
        // 9. Send friend request to network
        friendPub.value = targetPub;
        
        await new Promise<void>((resolve, reject) => {
          const requestData = {
            from: currentUserPub.value,
            message: message || `Hi, I'm ${myInfo.alias}, would like to be friends with you!`,
            alias: myInfo.alias,
            avatar: myInfo.avatar,
            timestamp: Date.now()
          };
          
          gun.get('requests').get(targetPub).get('received').set(requestData, async (ack: any) => {
            if (ack.err) {
               showToast('Failed to send friend request:' + ack.err, 'info');
             
              reject(new Error(ack.err));
            } else {
               showToast(`📤 Friend request sent to network: ${targetPub.slice(0, 8)}`, 'info');
              // console.log(`📤 Friend request sent to network: ${targetPub.slice(0, 8)}`);
              resolve();
            }
          });
        });
        
        // 10. After network request succeeds, add to local friend list and database
        let targetBuddy = buddyList.value.find(b => b.pub === targetPub);
        
        if (!targetBuddy) {
          // Create new verified buddy object
          const newBuddy: VerifiedBuddy = {
            pub: targetPub,
            addedByMe: true,
            timestamp: Date.now(),
            alias: userInfo.alias || `User${targetPub.slice(0, 8)}`,
            avatar: userInfo.avatar,
            epubSource: 'network',
            connectionStatus: 'unknown',
            syncRetryCount: 0
          };
          
          buddyList.value.push(newBuddy);
          targetBuddy = newBuddy;
           showToast(`✅ Friend added to local list: ${targetPub.slice(0, 8)}`, 'info');
        
        } else {
          // Update existing friend information (upgrade to VerifiedBuddy)
          const verifiedBuddy = targetBuddy as VerifiedBuddy;
          verifiedBuddy.alias = userInfo.alias || verifiedBuddy.alias;
          verifiedBuddy.avatar = userInfo.avatar || verifiedBuddy.avatar;
          verifiedBuddy.epubSource = verifiedBuddy.epubSource || 'network';
          verifiedBuddy.connectionStatus = verifiedBuddy.connectionStatus || 'unknown';
          verifiedBuddy.syncRetryCount = verifiedBuddy.syncRetryCount || 0;
           showToast(`✅ Friend information updated: ${targetPub.slice(0, 8)}`, 'info');
        }
        
        // 11. Save to database
        try {
          const buddy = targetBuddy as VerifiedBuddy;
          await saveBuddyWithValidation(currentUserPub.value!, buddy.pub, buddy.timestamp, buddy.alias, buddy.avatar);
           showToast(`💾 Friend saved to database: ${targetPub.slice(0, 8)}`, 'info');
        } catch (dbError) {
          showToast('Failed to save friend to database:' + dbError, 'info');
          // Database save failure doesn't affect main flow
        }
        
        // 12. Start listening to chat
        listenChat(targetPub);
        
        // 13. Start listening to user alias and avatar updates
        listenUserAlias(targetPub);
        listenUserAvatar(targetPub);
        listenFriendSignature(targetPub);
        
        // 13. Success notification
        const userAlias = userInfo.alias || `User${targetPub.slice(0, 8)}`;
        showToast(`Friend request sent to ${userAlias}`, 'success');
        
      } catch (error) {
        showToast('Failed to add friend:' + error, 'info');
        
        // 14. Error handling and rollback
        const errorMessage = error instanceof Error ? error.message : 'Failed to add friend';
        
        // Rollback local data
        const buddyIndex = buddyList.value.findIndex(b => b.pub === targetPub);
        if (buddyIndex !== -1) {
          buddyList.value.splice(buddyIndex, 1);
          // showToast(`🔄 Rolled back local friend list: ${targetPub.slice(0, 8)}`, 'info');
        }
        
        showToast(errorMessage, 'error');
        throw error;
      }
    },

    // 🚀 New verification and self-healing functionality
    isVerified,
    needsSync,
    getVerificationStatus,
    BuddyVerificationManager,
    AutoHealingManager,
    syncEpubStatusForBuddy,
    syncAllBuddiesEpubStatus,

    
    // 🔄 Manual method to get and sync buddy's epub
    manualSyncBuddyEpub: async function(buddyPub: string): Promise<boolean> {
      showToast('Syncing security certificate...', 'info', 1500);

      if (!currentUserPub.value) {
        showToast('Please log in first', 'warning');
        return false;
      }
      
      // Check if user is a friend
      const buddy = buddyList.value.find(b => b.pub === buddyPub);
      if (!buddy) {
        showToast('User is not in friend list', 'warning');
        return false;
      }
      
      showToast('Getting buddy\'s epub...', 'info', 2000);
      
      try {
        // 1. Try to get epub from multiple sources
        let epub: string | null = null;
        
        // Try to get from Gun network
        try {
          epub = await new Promise<string | null>((resolve) => {
            const timeout = setTimeout(() => resolve(null), 5000); // 5 second timeout
            
            gun.get('users').get(buddyPub).get('epub').once((data: string) => {
              clearTimeout(timeout);
              resolve(data || null);
            });
          });
        } catch (error) {
          // Failed to get epub from Gun network
        }
        
        // If Gun network fails, try using getUserEpub function
         if (!epub) {
           try {
             epub = await getUserEpub(buddyPub);
           } catch (error) {
             // Failed to get epub from other sources
           }
         }
        
        if (!epub) {
          showToast('Unable to get buddy\'s epub, they may not have uploaded it or network connection issue', 'error');
          return false;
        }
        
        // 2. Validate epub format
        // try {
        //   const epubData = JSON.parse(epub);
        //   if (!epubData.epub || !epubData.pub || epubData.pub !== buddyPub) {
        //     throw new Error('Invalid epub format');
        //   }
        // } catch (error) {
        //   showToast('Retrieved epub format is invalid', 'error');
        //   return false;
        // }
        
        // 3. Update buddy's epub information
        const verifiedBuddy = buddy as VerifiedBuddy;
        verifiedBuddy.epub = epub;
        verifiedBuddy.verificationTime = Date.now();
        verifiedBuddy.lastEpubSync = Date.now();
        verifiedBuddy.epubSource = 'network';
        verifiedBuddy.syncRetryCount = 0;
        
        // 4. Save to database
        try {
          await saveBuddyWithValidation(
            currentUserPub.value,
            verifiedBuddy.pub,
            verifiedBuddy.timestamp,
            verifiedBuddy.alias,
            verifiedBuddy.avatar
          );
        } catch (dbError) {
          // Failed to save epub to database
        }
        
        // 5. Update UI
        const buddyIndex = buddyList.value.findIndex(b => b.pub === buddyPub);
        if (buddyIndex !== -1) {
          buddyList.value[buddyIndex] = verifiedBuddy;
        }
        
        // 6. Backup to IndexedDB
        try {
          await saveBuddyListToDb(buddyList.value);
        } catch (error) {
          // Failed to backup friend list
        }
        
        const userAlias = verifiedBuddy.alias || `User${buddyPub.slice(0, 8)}`;
        showToast(`Successfully got ${userAlias}'s epub, secure chat is now available`, 'success');
        
        // Manual epub sync successful
        return true;
        
      } catch (error) {
        // Manual epub sync failed
        const errorMessage = error instanceof Error ? error.message : 'Sync failed';
        showToast(`Epub sync failed: ${errorMessage}`, 'error');
        return false;
      }
    },
    peersList,
    updatePeers,
    prioritizePeer,
    enabledPeers,
    disablePeer,
    refreshBuddyList,
    refreshContactsFromGun,
    fetchUserInfoForRefresh,
    getAliasRealtime1,
    isDragging,
    showCards,
    startY,
    translateY,
    cardsTranslateY,
    velocity,
    lastTouchTime,
    lastTouchY,
    panelVisible,
    panelContent,
    selectedFriendPub,
    setSelectedFriendPub,
    requestsViewed,
    loadRequestsViewedState,
    saveRequestsViewedState,
    fileData,
    filePreviewUrl,
    handleFileUpload,
    sendFileMessage,
    showToast,
    decryptMessage,
    encryptPayload,
    sentMessages,
    getUserEpub,
    isLoading,
     encryptData,
    decryptData,
    listenMyBuddyList,
    isLargeScreen,
    updateScreenSize,
    hasPadChat,
    currentComponent,
    previousComponent,
    switchTo,
    setupListeners,
    restartAllListeners,

    decryptMessageWithMyEpub,
    user,
    // isAccountDeactivated,
    restoreChatPreviews,
    router,
    deleteOldAvatar,
    temppub,

    newGroupName,
    joinGroupKey,
    groups,
    currentGroup,
    currentGroupName,
    messagesByGroup,
    safeGetGroupMessages,
    membersByGroup,
    votesByGroup,
    newMessage,
    tempKeyPair,
    encryptMessages,
    decryptMessages,
    simpleLogin,
    ensurePeerAvailable,
    momentState,
    fullscreenModalVisible,
    saveNavigationState,
    restoreNavigationState,
    diagnoseDbStorage,
    // New additions
    isRelaySharingEnabled,
    toggleRelaySharing,
    startSyncStatusListener,


        // User data caching functions
    getUserDataOnce,
    fetchUserDataFromGun,
    preloadUserData,
    userDataCache,
    listenFriendSignature,
    strangerAlias,
    strangerAvatar,
    isCallWindow,
    isCallButton,
    CreateNewGun
  };
}


let instance: ReturnType<typeof useChatFlow> | null = null;


export function getTalkFlowCore() {
  if (!instance) {
    instance = useChatFlow();
  }
  return instance;
}

export default getTalkFlowCore;



