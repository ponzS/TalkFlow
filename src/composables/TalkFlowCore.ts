import { ref, computed, Ref } from 'vue';
import Gun from 'gun';
import 'gun/sea';
import * as cryptoJs from 'crypto-js';
import router from '@/router/index';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getCurrentInstance } from 'vue';
import StorageService, { FileData } from '../services/storageService';
import { useToast } from '@/composables/useToast';
import { v4 as uuidv4 } from 'uuid';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
const { showToast } = useToast();
import { sqliteServ, dbVerServ, storageServ } from '../services/globalServices';
import { useAIAutoReply } from '@/composables/useAIAutoReply';
import { generateReply } from '@/composables/ollamaService';
 import { ChatMessage } from '@/types/chat';

// import { getGunSQLiteAdapter } from '@/composables/GunStorageAdapter';

// const gunSQLiteAdapter = getGunSQLiteAdapter(sqliteServ, dbVerServ, storageServ);


// Initialize AI auto-reply
const aiAutoReply = useAIAutoReply(storageServ);







// 保存已注销账户到 SQLite
async function saveDeactivatedAccount(pubKey: string): Promise<void> {
  try {
    await storageServ.run(
      'INSERT OR IGNORE INTO deactivated_accounts (pub_key) VALUES (?)',
      [pubKey]
    );
    console.log('已注销账户记录保存:', pubKey);
  } catch (err) {
    console.error('保存已注销账户记录失败:', err);
    throw err;
  }
}
// 检查账户是否已注销
async function isAccountDeactivated(pubKey: string): Promise<boolean> {
  try {
    const result = await storageServ.query(
      'SELECT pub_key FROM deactivated_accounts WHERE pub_key = ?',
      [pubKey]
    );
    return result.values?.length > 0;
  } catch (err) {
    console.log('查询已注销账户失败，假设账户未被注销:', err);
    return false;
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

// 本地存储的消息（包含明文）
export interface LocalChatMessage {
  id?: number;
  chatID: string;
  from: string;
  type: MessageType;
  text?: string; // 明文仅本地存储
  audioUrl?: string; // 明文仅本地存储
  fileId?: string; // 明文仅本地存储
  content?: string; // 用于本地存储文件消息的加密内容
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
  
}

// 网络存储的消息（仅加密数据）
export interface NetworkChatMessage {
  chatID: string;
  from: string;
  type: MessageType;
  textForBuddy?: string; // 加密
  textForMe?: string; // 加密
  audioForBuddy?: string; // 加密
  audioForMe?: string; // 加密
  content?: string; // 文件的加密内容
  signature: string;
  hash: string;
  timestamp: number;
  msgId: string;
  duration?: number; // 非敏感数据，可保留
}

export interface Buddy {
  pub: string;
  addedByMe: boolean;
  timestamp: number;
  alias?: string;
  avatar?: string;
}

export interface ReceivedRequest {
  from: string;
  message?: string;
  alias?: string;
  avatar?: string;
}

export type MessageType = 'text' | 'voice' | 'file' | 'transcription';
export type MessageStatus = 'pending' | 'sent' | 'failed';

export interface ChatPreview {
  pub: string;
  lastMsg: string;
  lastTime: string;
  hidden: boolean;
  hasNew: boolean;
}

// gunSQLiteAdapter.initialize().then(() => {
//   console.log('Gun SQLite adapter initialized and ready.');
// }).catch(err => {
//   console.error('Failed to initialize Gun SQLite adapter:', err);
// });

// sharedStorage.create().then(() => {
//    console.log('缓存适配器 SQLite 初始化完成');
// });
/**
 * * https://gun-manhattan.herokuapp.com/gun
* https://peer.wallie.io/gun
* https://gundb-relay-mlccl.ondigitalocean.app/gun
* https://plankton-app-6qfp3.ondigitalocean.app/
* https://gun.defucc.me/gun
 */
const peersList = ref<string[]>([
  'https://peer.wallie.io/gun',
  'https://gun.defucc.me/gun',
  'http://123.57.225.210:8080/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gundb-relay-mlccl.ondigitalocean.app/gun',
 


]);

const enabledPeer = ref<string>(peersList.value[0]);






let gun = Gun({
 
  peers: [ enabledPeer.value],
  radisk: true,
  localStorage: false,
  // gunSQLiteAdapter: {
  //   key: 'talkflowdb',
  // },
});

const isLargeScreen = ref(window.innerWidth > 768);

const currentComponent = shallowRef('Chat')
const previousComponent = ref('Chat')



const hasPadChat = ref(false);
// 消息发送队列
const sendQueue: { msg: NetworkChatMessage; resolve: () => void; reject: (err: Error) => void }[] = [];
const MAX_CONCURRENT = 3;
let activeSends = 0;
const user = gun.user();
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
const buddyList: Ref<Buddy[]> = ref([]);
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

export function useChatFlow() {
  const appInstance = getCurrentInstance();
  if (!appInstance) throw new Error('useChatFlow must be called within a Vue component setup');
  const storageServ = appInstance.appContext.config.globalProperties.$storageServ as StorageService;


  // gunSQLiteAdapter.initialize().then(() => {
  //   console.log('Gun SQLite adapter initialized and ready.');
  // }).catch(err => {
  //   console.error('Failed to initialize Gun SQLite adapter:', err);
  // });

  function switchTo(componentName: string) {
    if (currentComponent.value === componentName) return
    previousComponent.value = currentComponent.value
    currentComponent.value = componentName
    Haptics.impact({ style: ImpactStyle.Light })
  }
  async function triggerLightHaptic(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      // console.error('触发震动失败:', error);
    }
  }

  const lastNotifiedTimestamp: Ref<Record<string, number>> = ref({});

  function updatePeers(newPeers: string[]) {
    peersList.value = newPeers;
    enabledPeer.value = newPeers[0];
    gun.opt({ peers: [enabledPeer.value] });
  //  showToast('The node has been updated', 'success');
    // console.log('Peers 更新为:', newPeers);
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
      // console.error('解密失败:', err);
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
    const pass = newPassphrase.value;

    if (!pass) {
      generateMsg.value = 'Please enter the password(used to encrypt the private key)';
      showToast(generateMsg.value, 'warning');
      return;
    }

    // const networkAvailable = await pingNetworkAndPeers();
    // if (!networkAvailable) {
    //   generateMsg.value = 'error,check you network';
    //   showToast(generateMsg.value, 'error');
    //   return;
    // }

    const MAX_RETRIES = 5;
    let retries = 0;
    let unique = false;
    let pair: any = null;
    let existingPubKeys: Set<string> = new Set();

    // generateMsg.value = 'Ensuring the uniqueness of identity...';
    // showToast(generateMsg.value, 'info');
    // try {
    //   existingPubKeys = await fetchAllPubKeys();
    // } catch (err) {
    //   generateMsg.value = err instanceof Error ? err.message : 'error,check you network';
    //   showToast(generateMsg.value, 'error');
    //   return;
    // }

    // generateMsg.value = 'The key pair is being generated,please wait a moment...';
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
        //  showToast(`build identity conflicts,please try agin. (${retries}/${MAX_RETRIES})`, 'warning');
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
      generateMsg.value = 'Unable to generate the key,please try agin.';
   //   showToast(generateMsg.value, 'error');
      return;
    }

    const dataStr = JSON.stringify({ ...pair, alias });
    const encrypted = encryptData(dataStr, pass);
    encryptedKeyPair.value = encrypted;
    await storageServ.saveUser(pair.pub, alias, undefined, encrypted);
    generateMsg.value = 'The key is successfully generated. Please copy and save the encrypted private key and the decryption password you set, and provide it only once.';
 //   showToast(generateMsg.value, 'success');
    KeyDown.value = true;
    newAlias.value = '';
    newPassphrase.value = '';
  }

  async function importKeyPair(): Promise<void> {
    if (!encryptedKeyInput.value.trim() || !passphrase.value) {
      loginError.value = 'Please fill in the decryption password and encryption private key.';
    //  showToast(loginError.value, 'warning');
      return;
    }
    const decrypted = decryptData(encryptedKeyInput.value.trim(), passphrase.value);
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
   //   showToast(loginError.value, 'error');
      return;
    }
    if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
      loginError.value = 'The key pair is incomplete.';
   //   showToast(loginError.value, 'error');
      return;
    }
// 检查账户是否已被删除
const isDeactivated = await isAccountDeactivated(pair.pub);
if (isDeactivated) {
  loginError.value = 'The account does not exist.';
 // showToast(loginError.value, 'error');
  return;
}
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
            await storageServ.saveUser(pair.pub, pair.alias || 'DefaultUser', undefined, encryptedKeyInput.value.trim());
            userData = await storageServ.getUser(pair.pub);
          }
          currentUserAlias.value = userData!.alias || '';
          userAvatars.value[pair.pub] = userData!.avatar || '';
          currentUserAlias1.value = '';

          try {
            const encryptedCredentials = encryptData(
              JSON.stringify({
                encryptedKeyPair: encryptedKeyInput.value.trim(),
                passphrase: passphrase.value,
              }),
              'talkflow-secret-key'
            );
            await storageServ.run('INSERT OR REPLACE INTO credentials (key, value) VALUES (?, ?)', ['userCredentials', encryptedCredentials]);
          } catch (err) {
            // console.warn('凭证保存失败:', err);
          }
         
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
          chatPreviewList.value = await restoreChatPreviews(pair.pub);
          friendRemarks.value = await storageServ.getFriendRemarks(pair.pub);
          blacklist.value = await storageServ.getBlacklist();
          setupListeners(pair.pub);

          passphrase.value = '';
          encryptedKeyInput.value = '';
          router.replace('/index');
          resolve();
        }
      });
    });
  }

  async function restoreLoginState(): Promise<void> {
    console.log('正在恢复登录状态...');
    
    try {
      // 1. 从本地数据库加载凭据
      const credentialsResult = await storageServ.query('SELECT value FROM credentials WHERE key = ?', ['userCredentials']);
      if (!credentialsResult.values || !credentialsResult.values.length) {
        console.log('未找到本地凭据，登录恢复终止');
        return;
      }
      
      // 2. 解密凭据
      const encryptedCredentials = credentialsResult.values[0].value as string;
      const decryptedCredentials = decryptData(encryptedCredentials, 'talkflow-secret-key');
      if (!decryptedCredentials) {
        console.log('凭据解密失败，登录恢复终止');
        return;
      }
  
      // 3. 获取和验证密钥对
      const { encryptedKeyPair: storedKeyPair, passphrase: storedPass } = 
        JSON.parse(decryptedCredentials) as { encryptedKeyPair: string; passphrase: string };
      
      const decrypted = decryptData(storedKeyPair, storedPass);
      if (!decrypted) {
       // console.log('密钥对解密失败，登录恢复终止');
        return;
      }
      
      const pair: any = JSON.parse(decrypted);
      if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
       // console.log('密钥对不完整，登录恢复终止');
        return;
      }
  
      // 4. 设置用户状态 
      //console.log(`从本地恢复用户状态: ${pair.pub.substring(0, 10)}...`);
      
      // 防止递归和堆栈溢出
      const safeSetUserData = () => {
        user.auth(pair); //避免有时被搜索时搜不到，所以在每次重启时都在网络中验证一次身份。
        isLoggedIn.value = true;
        currentUserPub.value = pair.pub;
        currentUserPair = pair;
      };
      
      // 安全调用，避免堆栈溢出
      try {
        safeSetUserData();
      } catch (e) {
        console.warn('设置用户状态时发生错误，重试...', e);
        setTimeout(safeSetUserData, 0);
      }
  
      // 5. 加载本地用户数据 - 并行处理以提高性能
    //  console.log('正在加载本地用户数据...');
      
      try {
        const userData = await storageServ.getUser(pair.pub);
        if (userData) {
          currentUserAlias.value = userData.alias || '';
          userAvatars.value[pair.pub] = userData.avatar || '';
          // currentUserAlias1.value = userData.signature || '';
        } else {
         // console.log('本地未找到用户数据，使用默认值');
        }
      } catch (e) {
        //console.warn('加载用户数据失败，使用默认值', e);
      }
  
      // 6. 并行加载其他本地数据
    //  console.log('正在并行加载本地数据...');
      
      try {
        const [buddies, remarks, previews, blockedUsers] = await Promise.all([
          loadBuddies(pair.pub).catch(e => { 
            console.warn('加载好友列表失败', e); 
            return []; 
          }),
          storageServ.getFriendRemarks(pair.pub).catch(e => { 
            console.warn('加载好友备注失败', e); 
            return {}; 
          }),
          restoreChatPreviews(pair.pub).catch(e => { 
            console.warn('加载聊天预览失败', e); 
            return []; 
          }),
          storageServ.getBlacklist().catch(e => { 
            console.warn('加载黑名单失败', e); 
            return []; 
          })
        ]);
  
        buddyList.value = buddies;
        friendRemarks.value = remarks;
        chatPreviewList.value = previews;
        blacklist.value = blockedUsers;
        
      //  console.log(`已加载 ${buddies.length} 个好友和 ${previews.length} 个聊天预览`);
      } catch (e) {
       // console.warn('并行加载本地数据时出错', e);
      }
  
      // 7. 设置监听器 (使用安全包装)
    //  console.log('设置数据监听器...');
      try {
        const safeSetupListeners = () => {
          try {
            setupListeners(pair.pub);
          } catch (e) {
         //   console.warn('设置监听器失败，应用可能缺少部分实时功能', e);
          }
        };
        
        // 使用 setTimeout 避免潜在的堆栈溢出
        setTimeout(safeSetupListeners, 100);
      } catch (e) {
     //   console.warn('安排监听器设置失败', e);
      }
  
      // 8. 导航到主页
    //  console.log('恢复完成，导航到主页');
      router.replace('/index');
      
      // 9. 后台加载删除时间戳 (非关键操作)
      setTimeout(() => {
        try {
        //  console.log('后台加载聊天删除时间戳...');
          Promise.all(buddyList.value.map(buddy => {
            return new Promise<void>(resolve => {
              const chatId = generateChatId(pair.pub, buddy.pub);
              deletedRecordsMap.value[chatId] = 0; // 默认值
              
              // 设置超时，防止无限等待
              const timeout = setTimeout(() => {
              //  console.log(`加载聊天 ${chatId} 的删除时间戳超时`);
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
          //      console.warn(`获取聊天 ${chatId} 删除时间戳失败`, e);
                clearTimeout(timeout);
                resolve();
              }
            });
          }))
          .then(() => console.log('所有删除时间戳加载完成'))
          .catch(err => console.warn('加载删除时间戳过程中出错', err));
        } catch (e) {
      //    console.warn('初始化删除时间戳加载失败', e);
        }
      }, 500);
      
    } catch (error) {
      // 确保任何错误都不会导致应用崩溃
  //    console.error('恢复登录状态过程中发生错误:', error);
      isLoggedIn.value = false;
      
      // 可选：记录错误以便后续诊断
      try {
        localStorage.setItem('last_login_error', JSON.stringify({
          time: new Date().toISOString(),
          error: error?.toString() || 'Unknown error'
        }));
      } catch (e) {}
    }
  }

  // async function restoreLoginState1(): Promise<void> {
  //   const credentialsResult = await storageServ.query('SELECT value FROM credentials WHERE key = ?', ['userCredentials']);
  //   if (!credentialsResult.values!.length) return;
  //   const encryptedCredentials = credentialsResult.values![0].value as string;
  //   const decryptedCredentials = decryptData(encryptedCredentials, 'talkflow-secret-key');
  //   if (!decryptedCredentials) return;

  //   const { encryptedKeyPair: storedKeyPair, passphrase: storedPass } = JSON.parse(decryptedCredentials) as { encryptedKeyPair: string; passphrase: string };
  //   const decrypted = decryptData(storedKeyPair, storedPass);
  //   if (!decrypted) return;
  //   const pair: any = JSON.parse(decrypted);
  //   if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) return;

  //   await new Promise<void>((resolve) => {
  //     user.auth(pair, async (ack: any) => {
  //       if (ack.err) {
  //         isLoggedIn.value = false;
  //         resolve();
  //       } else {
  //         isLoggedIn.value = true;
  //         currentUserPub.value = pair.pub;
  //         currentUserPair = pair;

  //         const userData = await storageServ.getUser(pair.pub);
  //         currentUserAlias.value = userData!.alias || '';
  //         userAvatars.value[pair.pub] = userData!.avatar || '';
  //         currentUserAlias1.value = '';

  //         buddyList.value = await loadBuddies(pair.pub);
  //         friendRemarks.value = await storageServ.getFriendRemarks(pair.pub);
  //         chatPreviewList.value = await restoreChatPreviews(pair.pub);
  //         blacklist.value = await storageServ.getBlacklist();

  //         gun.get('users').get(pair.pub).once((data: any) => {
  //           if (data?.alias && data.alias !== currentUserAlias.value) {
  //             currentUserAlias.value = data.alias;
  //             storageServ.saveUser(pair.pub, data.alias, userAvatars.value[pair.pub]);
  //           }
  //           if (data?.signature) currentUserAlias1.value = data.signature;
  //           if (data?.avatar) userAvatars.value[pair.pub] = data.avatar;
  //         });

  //         setupListeners(pair.pub);
  //         resolve();
  //       }
  //     });
  //   });
  // }

  async function loadBuddies(userPub: string): Promise<Buddy[]> {
    try {
      return await storageServ.getBuddies(userPub);
    } catch (err) {
    //  console.error(`Failed to load buddies for ${userPub}:`, err);
     // showToast('Failed to load buddies', 'error');
      return [];
    }
  }

// async function loadBuddies(userPub: string): Promise<Buddy[]> {
//   // 首先尝试从本地加载
//   let localBuddies: Buddy[] = [];
//   try {
//     localBuddies = await storageServ.getBuddies(userPub);
//     // 如果本地有好友数据，直接返回
//     if (localBuddies && localBuddies.length > 0) {
//       return localBuddies;
//     }
//     // 如果本地没有好友，继续尝试从Gun加载
//   } catch (err) {
//     console.error(`从本地加载好友列表失败 ${userPub}:`, err);
//     // 本地加载失败，继续尝试从Gun加载
//   }

//   // 从Gun节点加载好友列表
//   try {
//     return await new Promise<Buddy[]>((resolve) => {
//       let gunBuddies: Buddy[] = [];
//       let resolved = false;
      
//       // 设置超时以避免无限等待
//       const timeout = setTimeout(() => {
//         if (!resolved) {
//           resolved = true;
//           console.warn('从Gun加载好友列表超时');
//           resolve(localBuddies); // 超时时返回本地数据（可能为空）
//         }
//       }, 5000);
      
//       gun.get('users').get(userPub).get('buddies').map().once(async (data, key) => {
//         if (data && key && !resolved) {
//           try {
//             const timestamp = data.timestamp || Date.now();
//             const epub = data.epub || await getUserEpub(key);
            
//             // 正确传递所有必需的参数，包括epub
//             await storageServ.saveBuddy(
//               userPub,
//               key,
//               true, // addedByMe
//               timestamp,
//               data.alias,
//               data.avatar,
//               epub
//             );
            
//             const buddy: Buddy = {
//               pub: key,
//               addedByMe: true,
//               timestamp,
//               alias: data.alias,
//               avatar: data.avatar
//             };
            
//             gunBuddies.push(buddy);
//           } catch (e) {
//             console.error('处理Gun好友数据时出错:', e);
//           }
//         }
//       });
      
//       // 给Gun一些时间来收集数据
//       setTimeout(() => {
//         clearTimeout(timeout);
//         if (!resolved) {
//           resolved = true;
//           resolve(gunBuddies.length > 0 ? gunBuddies : localBuddies);
//         }
//       }, 3000);
//     });
//   } catch (gunErr) {
//     console.error(`从Gun加载好友列表失败:`, gunErr);
//     showToast('加载好友列表失败', 'error');
//     return localBuddies; // 返回本地数据（可能为空）
//   }
// }



  async function getUserEpub(pub: string): Promise<string | null> {
    if (epubCache[pub]) return epubCache[pub];
    const localEpub = await storageServ.getEpub(pub);
    if (localEpub) {
      epubCache[pub] = localEpub;
      return localEpub;
    }
  
    const maxRetries = 10;
    let retries = 0;
    while (retries < maxRetries) {
      const epub = await new Promise<string | null>((resolve) => {
        gun.get('users').get(pub).get('epub').once(async (val: string | undefined) => {
          const epubVal = val as string | undefined;
          if (epubVal) {
            epubCache[pub] = epubVal;
            await storageServ.saveEpub(pub, epubVal);
            resolve(epubVal);
          } else {
            resolve(null);
          }
        });
      });
      if (epub) return epub;
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待1秒后重试
      }
    }
   // console.warn(`经过${maxRetries}次重试后仍无法获取${pub}的epub`);
    return null;
  }
  async function refreshBuddyList(): Promise<void> {
    if (!currentUserPub.value) return;
    const myPub = currentUserPub.value;
    for (const buddy of buddyList.value) {
      const data = await fetchUserInfo(buddy.pub);
      buddy.alias = data.alias;
      buddy.avatar = data.avatar;
      await storageServ.saveBuddy(myPub, buddy.pub, buddy.addedByMe, buddy.timestamp, data.alias, data.avatar);
    }
    buddyList.value = [...buddyList.value];
  //  showToast('friend list updated', 'success');
  }

  function updateFriendRemark(friendPub: string, remark: string, remarkInfo: string): void {
    if (!currentUserPub.value) return;
    friendRemarks.value[friendPub] = { remark, remarkInfo };
    storageServ.saveFriendRemark(currentUserPub.value, friendPub, remark, remarkInfo);
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
   //   showToast('未登录，无需退出', 'info');
      return;
    }
  
    const myPub = currentUserPub.value;
  
    // 1. 清理 Gun.js 用户状态
    user.leave();
  
    // 2. 重置内存中的状态
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
    aliasMap.value = {};
    signatureMap.value = {};
    userAvatars.value = {};
    sentMessages.value.clear();
  
    // 3. 清理监听器
    for (const pub in chatListeners.value) {
      chatListeners.value[pub]();
    }
    chatListeners.value = {};
  
    // 4. 清理缓存
    for (const key in epubCache) {
      delete epubCache[key];
    }
    for (const key in secretCache) {
      delete secretCache[key];
    }
  
    try {
      // 5. 清理 SQLite 数据库中的用户相关数据
      await storageServ.run('DELETE FROM users WHERE pubKey = ?', [myPub]); // 用户信息
      await storageServ.run('DELETE FROM epubs WHERE pub = ?', [myPub]); // 当前用户的 epub
      await storageServ.run('DELETE FROM credentials WHERE key = ?', ['userCredentials']); // 凭证
     // await storageServ.run('DELETE FROM buddies WHERE userPub = ?', [myPub]); // 好友关系
     // await storageServ.run('DELETE FROM messages WHERE sender = ?', [myPub]); // 发送的消息
      await storageServ.execute('DELETE FROM chat_previews'); // 会话预览
     // await storageServ.execute('DELETE FROM blacklist'); // 黑名单
      await storageServ.run('DELETE FROM friend_remarks WHERE userPub = ?', [myPub]); // 好友备注
      await storageServ.run('DELETE FROM sent_requests WHERE fromPub = ?', [myPub]); // 已发送的好友请求
  
      // 注意：这里没有清理其他用户的 epub（epubs 表中的其他记录），以避免影响好友数据
      // 如果需要完全清理，可以使用：await storageServ.execute('DELETE FROM epubs');
  
      // 6. 重置 Gun 实例
      // gun = Gun({
      //   gunIonicAdapter,
      //   peers: [enabledPeer.value],
      //   radisk: false,
      //   localStorage: false,
      // });
  
    //  showToast('已退出登录并清理所有个人数据', 'success');
    } catch (err) {
      //console.error('退出登录时清理数据失败:', err);
      //showToast('退出登录成功，但部分数据清理失败', 'warning');
    }
  
    router.replace({ path: '/' });
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
    buddyList.value.forEach((buddy) => listenChat(buddy.pub));
  }

  async function saveBuddyWithValidation(userPub: string, buddyPub: string, timestamp: number, alias?: string, avatar?: string): Promise<void> {
    try {
      await storageServ.saveBuddy(userPub, buddyPub, true, timestamp, alias, avatar);
      const savedBuddies = await storageServ.getBuddies(userPub);
      if (!savedBuddies.some(b => b.pub === buddyPub)) {
        throw new Error(`Buddy ${buddyPub} not found in SQLite after save`);
      }
    } catch (err) {
    //  console.error(`Failed to save buddy ${buddyPub} for ${userPub}:`, err);
      //showToast('Failed to save buddy,please try agin.', 'error');
      throw err;
    }
  }




  async function requestAddBuddy(): Promise<void> {
    if (!currentUserPub.value) {
      buddyError.value = 'Please log in first.';
      showToast(buddyError.value, 'warning');
      return;
    }
    const pubB = friendPub.value.trim();
    if (!pubB) {
      buddyError.value = 'Please enter the public key of the other party.';
      showToast(buddyError.value, 'warning');
      return;
    }
    if (isInMyBlacklist(pubB)) {
      buddyError.value = 'You have blocked the other party and can`t send a friend request.';
      showToast(buddyError.value, 'warning');
      return;
    }
    if (buddyList.value.some(b => b.pub === pubB)) {
      showToast('Already a friend, no need to add again.', 'info');
      return;
    }

    // const networkAvailable = await pingNetworkAndPeers();
    // if (!networkAvailable) {
    //   buddyError.value = 'The network is not available. Please check the connection and try again.';
    //   showToast(buddyError.value, 'warning');
    //   return;
    // }
  
    buddyError.value = '';
    const timestamp = Date.now();
    const userInfo = await fetchUserInfo(pubB);
    const myInfo = await fetchUserInfo(currentUserPub.value);
    const buddy: Buddy = { pub: pubB, addedByMe: true, timestamp, alias: userInfo.alias, avatar: userInfo.avatar };
    await saveBuddyWithValidation(currentUserPub.value, pubB, timestamp, userInfo.alias, userInfo.avatar);
    buddyList.value.push(buddy);
    gun.get('users').get(currentUserPub.value).get('buddy').get(pubB).put(true);
  
    await new Promise<void>((resolve, reject) => {
      gun.get('requests').get(pubB).get('received').set({ 
        from: currentUserPub.value, 
        alias: myInfo.alias, 
        avatar: myInfo.avatar 
      }, async (ack: any) => {
        if (ack.err) {
          buddyError.value = 'Failed to send a friend application:' + ack.err;
          showToast(buddyError.value, 'error');
          buddyList.value = buddyList.value.filter(b => b.pub !== pubB);
          await storageServ.run('DELETE FROM buddies WHERE userPub = ? AND buddyPub = ?', [currentUserPub.value, pubB]);
          reject(new Error(ack.err));
        } else {
          showToast('The friend request has been sent', 'success');
          friendPub.value = '';
          await storageServ.run('INSERT INTO sent_requests (fromPub, toPub, timestamp) VALUES (?, ?, ?)', 
            [currentUserPub.value, pubB, Date.now()]);
          
          // 自动发送打招呼消息
          currentChatPub.value = pubB;
          await sendChat('text', `Hi,Im ${myInfo.alias || ''}`);
          listenChat(pubB); // 确保监听已建立
          resolve();
        }
      });
    });
  }

  async function acceptBuddyRequest(fromPub: string): Promise<void> {
    if (!currentUserPub.value) return;
    const myPub = currentUserPub.value;
    if (buddyList.value.some(b => b.pub === fromPub)) return;
  
    // const networkAvailable = await pingNetworkAndPeers();
    // if (!networkAvailable) {
    //   showToast('The network is not available. Please check the connection and try again.', 'warning');
    //   return;
    // }
  
    const timestamp = Date.now();
    const userInfo = await fetchUserInfo(fromPub);
    const myInfo = await fetchUserInfo(myPub);
    const buddy: Buddy = { pub: fromPub, addedByMe: true, timestamp, alias: userInfo.alias, avatar: userInfo.avatar };
    
    // 预取并缓存epub
    const buddyEpub = await getUserEpub(fromPub);
    if (!buddyEpub) {
      showToast(`Unable to get the epub of ${fromPub}, you may not be able to send messages temporarily.`, 'warning');
    }
  
    await saveBuddyWithValidation(myPub, fromPub, timestamp, userInfo.alias, userInfo.avatar);
    buddyList.value.push(buddy);
    gun.get('users').get(myPub).get('buddy').get(fromPub).put(true);
    gun.get('requests').get(myPub).get('received').get(fromPub).put(null);
    showToast('Agreed to the friend request', 'success');

    // 自动发送打招呼消息
  currentChatPub.value = fromPub;
  await sendChat('text', `Hi,Im ${myInfo.alias || ''}`);
  listenChat(fromPub); 
    // listenChat(fromPub);
  }

  function rejectBuddyRequest(fromPub: string): void {
    if (!currentUserPub.value) return;
    const myPub = currentUserPub.value;
    gun.get('requests').get(myPub).get('received').get(fromPub).put(null);
    showToast('The friend application has been rejected.', 'success');
  }

  async function listenMyBuddyList(myPub: string): Promise<void> {
    gun.get('users').get(myPub).get('buddy').map().once(async (val: boolean, pubKey: string) => {
      const existingIndex = buddyList.value.findIndex(b => b.pub === pubKey);
      if (!val && existingIndex !== -1) {
        const localBuddy = await storageServ.getBuddies(pubKey);
        if (localBuddy) return;
        buddyList.value.splice(existingIndex, 1);
        await storageServ.run('DELETE FROM buddies WHERE userPub = ? AND buddyPub = ?', [myPub, pubKey]);
        showToast(`${pubKey} You have been removed as a friend.`, 'info');
      }
    });
  }

  function removeBuddy(pubKey: string): void {
    if (!currentUserPub.value) return;
    const myPub = currentUserPub.value;
    buddyList.value = buddyList.value.filter(b => b.pub !== pubKey);
    storageServ.run('DELETE FROM buddies WHERE userPub = ? AND buddyPub = ?', [myPub, pubKey]);
    gun.get('users').get(myPub).get('buddy').get(pubKey).put(null);
    if (chatListeners.value[pubKey]) {
      chatListeners.value[pubKey]();
      delete chatListeners.value[pubKey];
    }
    chatPreviewList.value = chatPreviewList.value.filter(c => c.pub !== pubKey);
    delete chatMessages.value[pubKey];
    storageServ.deleteChatPreview(pubKey);
    gun.get('users').get(pubKey).get('notifications').set({
      from: myPub,
      type: 'friend_removed',
      timestamp: Date.now(),
      message: `${currentUserAlias.value || 'Someone'} You have been removed from the friend list.`,
    });
    showToast('Deleted friends', 'success');
  }

  function addToBlacklist(pubKey?: string): void {
    const targetPub = pubKey || blockPub.value.trim();
    if (!targetPub || !currentUserPub.value) return;
    if (blacklist.value.includes(targetPub)) return;
    gun.get('users').get(currentUserPub.value).get('blacklist').get(targetPub).put(true);
    blacklist.value.push(targetPub);
    storageServ.saveBlacklist(targetPub, true);
    blockPub.value = '';
    showToast('It has been blacklisted.', 'success');
  }

  function removeFromBlacklist(pubKey?: string): void {
    const targetPub = pubKey || blockPub.value.trim();
    if (!targetPub || !currentUserPub.value) return;
    gun.get('users').get(currentUserPub.value).get('blacklist').get(targetPub).put(null);
    blacklist.value = blacklist.value.filter(p => p !== targetPub);
    storageServ.saveBlacklist(targetPub, false);
    blockPub.value = '';
    showToast('Removed from the blacklist', 'success');
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



  // function getPreviewText(msg: LocalChatMessage): string {


  //   switch (msg.type) {
  //     case 'text': return msg.text || '';
  //     case 'voice': return '[Voice]';
  //     case 'file': return '[File]';
  //     default: return '';
  //   }
  // }
  function getPreviewText(msg: LocalChatMessage): string {
    const MAX_PREVIEW_LENGTH = 20; // 限制预览文本长度为 20 个字符
  
    switch (msg.type) {
      case 'text':
        if (!msg.text) return '';
        // 检查是否可能是 Base64 字符串（图片或视频）
        if (isBase64Media(msg.text)) {
          return isBase64Image(msg.text) ? '[Image]' : '[Video]';
        }
        // 普通文本，取前 20 个字符
        return msg.text.length > MAX_PREVIEW_LENGTH 
          ? `${msg.text.slice(0, MAX_PREVIEW_LENGTH)}...` 
          : msg.text;
      case 'voice':
        return '[Voice]';
      case 'file':
        return '[File]';
      default:
        return '';
    }
  }
  
  // 辅助函数：检测是否是 Base64 媒体
  function isBase64Media(text: string): boolean {
    return /^data:(image|video)\/[\w+.-]+;base64,/.test(text);
  }
  
  // 辅助函数：检测是否是 Base64 图片
  function isBase64Image(text: string): boolean {
    return /^data:image\/[\w+.-]+;base64,/.test(text);
  }


  async function encryptPayload(targetPub: string, payload: string): Promise<{ encryptedForBuddy: string; encryptedForMe: string }> {
    if (!currentUserPair) throw new Error('未登录');
    user.auth(currentUserPair)
    const buddyEpub = await getUserEpub(targetPub);
    if (!buddyEpub) throw new Error('无法获取对方的 epub');
    const secretBuddyKey = `${buddyEpub}-${currentUserPair.pub}`;
    delete secretCache[secretBuddyKey]; // 刷新密钥
    const secretBuddy = await Gun.SEA.secret(buddyEpub, currentUserPair);
    if (!secretBuddy) throw new Error('无法生成对方的密钥');
    const encryptedForBuddy = await Gun.SEA.encrypt(payload, secretBuddy);
  
    const myEpub = currentUserPair.epub as string;
    const secretMeKey = `${myEpub}-${currentUserPair.pub}`;
    delete secretCache[secretMeKey]; // 刷新密钥
    const secretMe = await Gun.SEA.secret(myEpub, currentUserPair);
    if (!secretMe) throw new Error('无法生成自己的密钥');
    const encryptedForMe = await Gun.SEA.encrypt(payload, secretMe);
    return { encryptedForBuddy, encryptedForMe };
  }
  async function requestAddBuddyWithMessage(message: string): Promise<void> {
    if (!currentUserPub.value) {
      buddyError.value = '请先登录';
      showToast(buddyError.value, 'warning');
      throw new Error('未登录');
    }
    const pubB = friendPub.value.trim();
    if (!pubB) {
      buddyError.value = '请输入对方的公钥';
      showToast(buddyError.value, 'warning');
      throw new Error('请输入对方的公钥');
    }
    if (isInMyBlacklist(pubB)) {
      buddyError.value = '您已屏蔽对方，无法发送好友请求';
      showToast(buddyError.value, 'warning');
      throw new Error('对方在黑名单中');
    }
    if (buddyList.value.some(b => b.pub === pubB)) {
      showToast('已是好友，无需重复添加', 'info');
      return;
    }
    buddyError.value = '';
    const timestamp = Date.now();
    const userInfo = await fetchUserInfo(pubB);
    const myInfo = await fetchUserInfo(currentUserPub.value);
    const buddy: Buddy = { pub: pubB, addedByMe: true, timestamp, alias: userInfo.alias, avatar: userInfo.avatar };
    await saveBuddyWithValidation(currentUserPub.value, pubB, timestamp, userInfo.alias, userInfo.avatar);
    buddyList.value.push(buddy);
    gun.get('users').get(currentUserPub.value).get('buddy').get(pubB).put(true);
    await new Promise<void>((resolve, reject) => {
      gun.get('requests').get(pubB).get('received').set({
        from: currentUserPub.value,
        message,
        alias: myInfo.alias,
        avatar: myInfo.avatar,
      }, async (ack: any) => {
        if (ack.err) {
          buddyError.value = '发送好友请求失败:' + ack.err;
          showToast(buddyError.value, 'error');
          buddyList.value = buddyList.value.filter(b => b.pub !== pubB);
          await storageServ.run('DELETE FROM buddies WHERE userPub = ? AND buddyPub = ?', [currentUserPub.value, pubB]);
          reject(new Error(ack.err));
        } else {
          showToast('好友请求已发送', 'success');
          friendPub.value = '';
          await storageServ.run('INSERT INTO sent_requests (fromPub, toPub, timestamp) VALUES (?, ?, ?)', [currentUserPub.value, pubB, Date.now()]);
          listenChat(pubB);
          resolve();
        }
      });
    });
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
    let retries = 0;
    while (retries < maxRetries) {
      if (await checkPeerHealth(enabledPeer.value)) return true;
      retries++;
      enabledPeer.value = peersList.value[retries % peersList.value.length];
      gun.opt({ peers: [enabledPeer.value] });
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
// 离线恢复机制
window.addEventListener('online', async () => {
  if (!currentUserPub.value) return;
  const pendingMsgs = await storageServ.query('SELECT * FROM messages WHERE status = ?', ['pending']);
  for (const msg of pendingMsgs.values || []) {
    const localMsg = msg as LocalChatMessage;
    const targetPub = localMsg.chatID.split('_').find(pub => pub !== currentUserPub.value)!;
    currentChatPub.value = targetPub;
    await resendMessage(targetPub, localMsg);
  }
  //showToast('网络恢复，正在尝试重发未发送消息', 'info');
});

async function sendChat(messageType: MessageType, payload: string | null = null, duration?: number): Promise<void> {
  if (!currentUserPub.value || !currentChatPub.value) {
    // showToast('未登录或未选择聊天对象', 'warning');
    // console.log('未登录或未选择聊天对象');
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
    if (!encryptResult.encryptedForBuddy || !encryptResult.encryptedForMe) throw new Error('加密失败');
    if (!hash) throw new Error('哈希生成失败');

    const signData: any = { from: myPub, hash, timestamp: now };
    if (messageType === 'voice' && duration !== undefined) signData.duration = duration;
    const signature = await Gun.SEA.sign(JSON.stringify(signData), currentUserPair);
    if (!signature) throw new Error('签名失败');

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

    await storageServ.updateMessage(chatId, msgId, localMsg);
    chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
    chatMessages.value = { ...chatMessages.value };

    if (!navigator.onLine || !(await ensurePeerAvailable())) {
      localMsg.status = 'pending';
      await storageServ.updateMessage(chatId, msgId, localMsg);
     // showToast('网络或节点不可用，消息将等待网络恢复后发送', 'warning');
      return;
    }

    const MAX_RETRIES = 3;
    let retries = 0;
    let isSent = false;

    while (retries < MAX_RETRIES && !isSent) {
      try {
        await Promise.race([
          queueSendChat(networkMsg),
          new Promise((_, reject) => setTimeout(() => reject(new Error('发送超时')), 10000)),
        ]);
        isSent = true;
        localMsg.sent = true;
        localMsg.status = 'sent';
        localMsg.isSending = false;
        sentMessages.value.add(msgId);
        await storageServ.updateMessage(chatId, msgId, localMsg);
        chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
        chatMessages.value = { ...chatMessages.value };
      //  console.log(`消息 ${msgId} 发送成功`);
        break;
      } catch (err: any) {
        retries++;
        const errorMsg = err.message || '未知错误';
        if (retries === MAX_RETRIES) {
          localMsg.status = 'sent';
          localMsg.isSending = false;
          await storageServ.updateMessage(chatId, msgId, localMsg);
          chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
          chatMessages.value = { ...chatMessages.value };
          showToast(`消息 ${msgId} 发送失败: ${errorMsg}`, 'error');
        } else {
          showToast(`消息 ${msgId} 发送失败 (第 ${retries}/${MAX_RETRIES} 次尝试): ${errorMsg}，1秒后重试`, 'warning');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    if (localMsg.status === 'sent') { // 仅在成功时更新预览
      await triggerLightHaptic();
      const preview = chatPreviewList.value.find(c => c.pub === targetPub);
      if (preview) {
        preview.lastMsg = getPreviewText(localMsg);
        preview.lastTime = formatTimestamp(now);
        preview.hasNew = false;
        preview.hidden = false;
        await storageServ.saveChatPreview(preview);
      } else {
        const newPreview: ChatPreview = {
          pub: targetPub,
          lastMsg: getPreviewText(localMsg),
          lastTime: formatTimestamp(now),
          hidden: false,
          hasNew: false,
        };
        chatPreviewList.value.push(newPreview);
        await storageServ.saveChatPreview(newPreview);
      }
      chatPreviewList.value = [...chatPreviewList.value];
    }
  } catch (err: any) {
    // localMsg.status = 'failed';
     localMsg.status = 'sent';
    localMsg.isSending = false;
    await storageServ.updateMessage(chatId, msgId, localMsg);
    chatMessages.value[targetPub] = chatMessages.value[targetPub].map(m => m.msgId === msgId ? { ...localMsg } : m);
    chatMessages.value = { ...chatMessages.value };
   // showToast(`消息 ${msgId} 发送失败: ${err.message || '未知错误'}`, 'error');
  }
}
  async function resendMessage(pub: string, msg: LocalChatMessage): Promise<void> {
    if (!navigator.onLine ) {
      showToast('Currently offline, please try again after restoring the network.', 'warning');
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
      // showToast('消息内容为空，无法重发', 'warning');
      console.log('消息内容为空，无法重发')
      return;
    }
    console.log('重发开始')
    currentChatPub.value = pub;
    await sendChat(msg.type, payload, msg.duration);
  }

  async function openChat(pubKey: string): Promise<void> {
    router.push('/chatpage');
    if (!currentUserPub.value) {
      // showToast('未登录，无法打开聊天', 'warning');
      return;
    }
    user.auth(currentUserPair)
    currentChatPub.value = pubKey;
    const chat = chatPreviewList.value.find(c => c.pub === pubKey);
    if (chat) {
      chat.hasNew = false;
      await storageServ.saveChatPreview(chat);
    }
    if (chatListeners.value[pubKey]) {
      chatListeners.value[pubKey]();
      delete chatListeners.value[pubKey];
    }
    // 始终初始化消息数组并加载历史消息
    chatMessages.value[pubKey] = chatMessages.value[pubKey] || [];
    await loadMoreChatHistory(pubKey); // 强制加载初始历史消息
    listenChat(pubKey);
  }

  async function openChatPad(pubKey: string): Promise<void> {
    hasPadChat.value = true;
    switchTo('Chat');
    // router.push('/chatpage');
    if (!currentUserPub.value) {
      // showToast('未登录，无法打开聊天', 'warning');
      return;
    }
    user.auth(currentUserPair)
    currentChatPub.value = pubKey;
    const chat = chatPreviewList.value.find(c => c.pub === pubKey);
    if (chat) {
      chat.hasNew = false;
      await storageServ.saveChatPreview(chat);
    }
    if (chatListeners.value[pubKey]) {
      chatListeners.value[pubKey]();
      delete chatListeners.value[pubKey];
    }
    // 始终初始化消息数组并加载历史消息
    chatMessages.value[pubKey] = chatMessages.value[pubKey] || [];
    await loadMoreChatHistory(pubKey); // 强制加载初始历史消息
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
      const newMessages = await storageServ.getMessages(chatId, 10, fetchBeforeId, 'DESC');
      if (newMessages.length > 0) {
        const existingIds = new Set(messages.map(m => m.id));
        const filteredMessages = newMessages.filter(m => !existingIds.has(m.id));
        if (filteredMessages.length > 0) {
          chatMessages.value[pubKey] = [...filteredMessages.reverse(), ...messages];
          chatMessages.value = { ...chatMessages.value };
        }
      }
    } catch (err) {
      // console.error(`加载更多历史消息 ${pubKey} 失败:`, err);
      // showToast('加载更多历史消息失败', 'error');
    } finally {
      isLoadingHistory.value = false;
    }
  }

  // async function listenChat(pubKey: string): Promise<void> {
  //   if (!currentUserPub.value) return;
  //   const myPub = currentUserPub.value;
  //   const chatId = generateChatId(myPub, pubKey);

  //   if (!buddyList.value.some(b => b.pub === pubKey && b.addedByMe)) return;
  //   if (chatListeners.value[pubKey]) return;
  //   gun.get('chats').get(chatId).get('deleted').get(myPub).once((val: any) => {
  //     deletedRecordsMap.value[chatId] = typeof val === 'number' ? val : 0;
  //   });

  //   const deletedListener = gun.get('chats').get(chatId).get('deleted').get(myPub).once((val: any) => {
  //     deletedRecordsMap.value[chatId] = typeof val === 'number' ? val : 0;
  //     chatMessages.value[pubKey] = (chatMessages.value[pubKey] || []).filter(m => m.timestamp > deletedRecordsMap.value[chatId]);
  //     chatMessages.value = { ...chatMessages.value };
  //   });

  //   const messageListener = gun.get('chats').get(chatId).get('messages').map().on(async (data: NetworkChatMessage | undefined, msgId: string) => {
  //     if (!data || !data.from || sentMessages.value.has(msgId)) return;
  //     if (!buddyList.value.some(b => b.pub === data.from && b.addedByMe)) return;
  //     if (data.from !== myPub && data.from !== pubKey) return;

  //     const cutoff = deletedRecordsMap.value[chatId] || 0;
  //     if (data.timestamp <= cutoff) return;

  //     const existingInSqlite = await storageServ.query('SELECT id FROM messages WHERE chatID = ? AND msgId = ?', [chatId, msgId]);
  //     if (existingInSqlite.values?.length > 0) return;

  //     const localMsg = await decryptMessage(data, pubKey);
  //     if (!localMsg) return;

  //     localMsg.chatID = chatId;
  //     const insertedId = await storageServ.insertMessage(chatId, localMsg);
  //     localMsg.id = insertedId;

  //     chatMessages.value[pubKey] = chatMessages.value[pubKey] || [];
  //     chatMessages.value[pubKey].push(localMsg);
  //     chatMessages.value = { ...chatMessages.value };

  //     if (data.from !== myPub) {
  //       const lastNotified = lastNotifiedTimestamp.value[pubKey] || 0;
  //       if (localMsg.timestamp > lastNotified && localMsg.timestamp <= Date.now()) {
  //         lastNotifiedTimestamp.value[pubKey] = localMsg.timestamp;
  //         await triggerLightHaptic();
  //       }
  //     }

  //     const shortMsg = getPreviewText(localMsg).length > 10 ? getPreviewText(localMsg).slice(0, 10) + '...' : getPreviewText(localMsg);
  //     const timeStr = formatTimestamp(localMsg.timestamp);
  //     const idx = chatPreviewList.value.findIndex(c => c.pub === pubKey);
  //     if (idx >= 0) {
  //       chatPreviewList.value[idx].lastMsg = shortMsg;
  //       chatPreviewList.value[idx].lastTime = timeStr;
  //       chatPreviewList.value[idx].hidden = false;
  //       chatPreviewList.value[idx].hasNew = data.from !== myPub && currentChatPub.value !== pubKey;
  //       await storageServ.saveChatPreview(chatPreviewList.value[idx]);
  //     } else {
  //       const newPreview: ChatPreview = {
  //         pub: pubKey,
  //         lastMsg: shortMsg,
  //         lastTime: timeStr,
  //         hidden: false,
  //         hasNew: data.from !== myPub && currentChatPub.value !== pubKey,
  //       };
  //       chatPreviewList.value.push(newPreview);
  //       await storageServ.saveChatPreview(newPreview);
  //     }
  //     chatPreviewList.value = [...chatPreviewList.value];
  //   });

  //   chatListeners.value[pubKey] = () => {
  //     deletedListener.off();
  //     messageListener.off();
  //   };
  // }

  async function listenChat(pubKey: string): Promise<void> {
    if (!currentUserPub.value) return;
    const myPub = currentUserPub.value;
    const chatId = generateChatId(myPub, pubKey);

    if (!buddyList.value.some(b => b.pub === pubKey && b.addedByMe)) return;
    if (chatListeners.value[pubKey]) return;
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
      if (!buddyList.value.some(b => b.pub === data.from && b.addedByMe)) return;
      if (data.from !== myPub && data.from !== pubKey) return;

      const cutoff = deletedRecordsMap.value[chatId] || 0;
      if (data.timestamp <= cutoff) return;

      const existingInSqlite = await storageServ.query('SELECT id FROM messages WHERE chatID = ? AND msgId = ?', [chatId, msgId]);
      if (existingInSqlite.values?.length > 0) return;

      const localMsg = await decryptMessage(data, pubKey);
      if (!localMsg) return;

      localMsg.chatID = chatId;
      const insertedId = await storageServ.insertMessage(chatId, localMsg);
      localMsg.id = insertedId;

      chatMessages.value[pubKey] = chatMessages.value[pubKey] || [];
      chatMessages.value[pubKey].push(localMsg);
      chatMessages.value = { ...chatMessages.value };

      // Handle AI auto-reply
      if (
        data.from !== myPub &&
        aiAutoReply.isAutoReplyEnabledForBuddy(pubKey) &&
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

          // Generate AI reply
          const { settings } = aiAutoReply.state;
          const reply = await generateReply(settings.model, messages, settings.mode, settings.stream);

          // Send reply after delay
          setTimeout(async () => {
            currentChatPub.value = pubKey; // Set current chat to send message
            await sendChat('text', reply);
            console.log(`AI auto-reply sent to ${pubKey}: ${reply}`);
          }, settings.replyDelay);
        } catch (error) {
          console.error('AI auto-reply failed:', error);
          showToast('Failed to generate AI reply', 'error');
        }
      }

      if (data.from !== myPub) {
        const lastNotified = lastNotifiedTimestamp.value[pubKey] || 0;
        if (localMsg.timestamp > lastNotified && localMsg.timestamp <= Date.now()) {
          lastNotifiedTimestamp.value[pubKey] = localMsg.timestamp;
          await triggerLightHaptic();
        }
      }

      const shortMsg = getPreviewText(localMsg).length > 10 ? getPreviewText(localMsg).slice(0, 10) + '...' : getPreviewText(localMsg);
      const timeStr = formatTimestamp(localMsg.timestamp);
      const idx = chatPreviewList.value.findIndex(c => c.pub === pubKey);
      if (idx >= 0) {
        chatPreviewList.value[idx].lastMsg = shortMsg;
        chatPreviewList.value[idx].lastTime = timeStr;
        chatPreviewList.value[idx].hidden = false;
        chatPreviewList.value[idx].hasNew = data.from !== myPub && currentChatPub.value !== pubKey;
        await storageServ.saveChatPreview(chatPreviewList.value[idx]);
      } else {
        const newPreview: ChatPreview = {
          pub: pubKey,
          lastMsg: shortMsg,
          lastTime: timeStr,
          hidden: false,
          hasNew: data.from !== myPub && currentChatPub.value !== pubKey,
        };
        chatPreviewList.value.push(newPreview);
        await storageServ.saveChatPreview(newPreview);
      }
      chatPreviewList.value = [...chatPreviewList.value];
    });

    chatListeners.value[pubKey] = () => {
      deletedListener.off();
      messageListener.off();
    };
  }


  async function retractMessage(chatId: string, msgId: string): Promise<void> {
    if (!currentChatPub.value) return;
    const pubKey = currentChatPub.value;
    const msg = chatMessages.value[pubKey]?.find(m => m.msgId === msgId);
    if (msg && msg.id) {
      await storageServ.deleteMessage(chatId, msg.id);
      chatMessages.value[pubKey] = chatMessages.value[pubKey].filter(m => m.msgId !== msgId);
      chatMessages.value = { ...chatMessages.value };
      showToast(` ${msgId} Deleted from the local area`, 'success');
    }
    gun.get('chats').get(chatId).get('messages').get(msgId).put(null);
  }

  async function exportDataToGun(): Promise<{ syncCode: string; totalSize: number }> {
    if (!currentUserPub.value) {
      showToast('Not logged in', 'warning');
      throw new Error('Not logged in');
    }

    const myPub = currentUserPub.value;
    const syncCode = uuidv4();
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

    for (let i = 0; i < chunks.length; i++) {
      await new Promise((resolve) => {
        gun.get('migration').get(syncCode).get(`chunk_${i}`).put(chunks[i], (ack: any) => {
          if (ack.err) throw new Error(ack.err);
          resolve(null);
        });
      });
      exportProgress.value = Math.round(((i + 1) / chunks.length) * 100);
    }

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
      gun.get('migration').get(syncCode).map().once((data: any, key: string) => {
        if (key.startsWith('chunk_')) {
          chunks[parseInt(key.split('_')[1])] = data;
          totalChunks = Math.max(totalChunks, parseInt(key.split('_')[1]) + 1);
        }
      });

      setTimeout(async () => {
        if (chunks.length === 0) {
          showToast('Invalid synchronization code or data not found', 'error');
          reject(new Error('Invalid synchronization code'));
          return;
        }

        const fullData = chunks.join('');
        const data = JSON.parse(fullData) as { buddies: Buddy[], messages: LocalChatMessage[], chatPreviews: ChatPreview[] };

        for (let i = 0; i < data.buddies.length; i++) {
          const buddy = data.buddies[i];
          await storageServ.saveBuddy(myPub, buddy.pub, buddy.addedByMe, buddy.timestamp, buddy.alias, buddy.avatar);
          importProgress.value = Math.round(((i + 1) / (data.buddies.length + data.messages.length + data.chatPreviews.length)) * 100);
        }

        for (let i = 0; i < data.messages.length; i++) {
          const message = data.messages[i];
          await storageServ.insertMessage(message.chatID!, message);
          importProgress.value = Math.round(((data.buddies.length + i + 1) / (data.buddies.length + data.messages.length + data.chatPreviews.length)) * 100);
        }

        for (let i = 0; i < data.chatPreviews.length; i++) {
          const preview = data.chatPreviews[i];
          await storageServ.saveChatPreview(preview);
          importProgress.value = Math.round(((data.buddies.length + data.messages.length + i + 1) / (data.buddies.length + data.messages.length + data.chatPreviews.length)) * 100);
        }

        buddyList.value = await storageServ.getBuddies(myPub);
        chatPreviewList.value = await storageServ.getAllChatPreviews();
        if (currentChatPub.value) await openChat(currentChatPub.value);

        showToast('Data import is successful', 'success');
        resolve();
      }, 2000);
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
      // console.error(`解密消息 ${data.msgId} 出错:`, err);
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
      // showToast('请选择一个文件', 'warning');
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
    await storageServ.saveFile(file);
    await sendChat('file', fileId);
    fileData.value = null;
    filePreviewUrl.value = null;
  }

  // function onDeleteChatClick(pub: string): void {
  //   if (!pub || !currentUserPub.value) return;
  //   const chatId = generateChatId(currentUserPub.value, pub);
  //   const cutoff = Date.now();
  //   deletedRecordsMap.value[chatId] = cutoff;
  //   chatMessages.value[pub] = [];
  //   chatMessages.value = { ...chatMessages.value };
  //   storageServ.run('DELETE FROM messages WHERE chatID = ?', [chatId]);
  //   showToast(` ${chatId} The local record has been deleted`, 'success');
  //   gun.get('chats').get(chatId).get('deleted').get(currentUserPub.value).put(cutoff);
  // }
  async function onDeleteChatClick(pub: string): Promise<void> {
    if (!pub || !currentUserPub.value) return;
    const chatId = generateChatId(currentUserPub.value, pub);
    await new Promise<void>((resolve) => {
      gun.get('chats').get(chatId).get('messages').map().once((data: any, msgId: string) => {
        if (data) {
          gun.get('chats').get(chatId).get('messages').get(msgId).put(null, (ack: any) => {
            if (ack.err) {
              console.error(`Failed to delete message ${msgId}:`, ack.err);
            }
          });

        }
      });
      // 等待清理完成
      setTimeout(resolve, 1000); // 增加延迟以确保 Gun.js 同步
    });
    try {
      // 本地清理
      chatMessages.value[pub] = [];
      chatMessages.value = { ...chatMessages.value };
      await storageServ.run('DELETE FROM messages WHERE chatID = ?', [chatId]);
      await storageServ.deleteChatPreview(pub); // 删除聊天预览
  
      // 远程清理所有消息
      await new Promise<void>((resolve) => {
        gun.get('chats').get(chatId).get('messages').map().once((data: any, msgId: string) => {
          if (data) {
            gun.get('chats').get(chatId).get('messages').get(msgId).put(null, (ack: any) => {
              if (ack.err) {
                console.error(`Failed to delete message ${msgId}:`, ack.err);
              }
            });

          }
        });
        // 等待清理完成
        setTimeout(resolve, 1000); // 增加延迟以确保 Gun.js 同步
      });
  
      // 可选：清理 deleted 标记（如果仍需保留）
      gun.get('chats').get(chatId).get('deleted').get(currentUserPub.value).put(null);
  
      showToast(`Chat ${chatId} has been completely deleted`, 'success');
    } catch (err) {
      console.error(`Failed to delete chat ${chatId}:`, err);
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
        await storageServ.saveUser(myPub, data.alias, userAvatars.value[myPub]);
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
          await storageServ.saveBuddy(currentUserPub.value, pub, buddyList.value[buddyIndex].addedByMe, buddyList.value[buddyIndex].timestamp, val, buddyList.value[buddyIndex].avatar);
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
          await storageServ.saveBuddy(currentUserPub.value, pub, buddyList.value[buddyIndex].addedByMe, buddyList.value[buddyIndex].timestamp, buddyList.value[buddyIndex].alias, val);
          buddyList.value = [...buddyList.value];
        }
      }
    });
  }

  // function listenUserData(pub: string): void {
  //   gun.get('users').get(pub).on(async (data: any) => {
  //     if (data) {
  //       const newAlias = data.alias || 'No Name';
  //       const newAvatar = data.avatar || '';
  //       const newSignature = data.signature || '';
  //       if (newAlias !== aliasMap.value[pub] || newAvatar !== userAvatars.value[pub] || newSignature !== signatureMap.value[pub]) {
  //         aliasMap.value[pub] = newAlias;
  //         userAvatars.value[pub] = newAvatar;
  //         signatureMap.value[pub] = newSignature;
  //         const buddyIndex = buddyList.value.findIndex(b => b.pub === pub);
  //         if (buddyIndex !== -1 && currentUserPub.value) {
  //           buddyList.value[buddyIndex] = { ...buddyList.value[buddyIndex], alias: newAlias, avatar: newAvatar };
  //           await storageServ.saveBuddy(currentUserPub.value, pub, buddyList.value[buddyIndex].addedByMe, buddyList.value[buddyIndex].timestamp, newAlias, newAvatar);
  //           buddyList.value = [...buddyList.value];
  //         }
  //       }
  //     }
  //   });
  // }
  async function onDeleteAccount(): Promise<void> {
    if (!currentUserPub.value) {
      showToast('未登录，无需删除账户', 'warning');
      return;
    }
    const myPub = currentUserPub.value;
    try {
      buddyList.value.forEach(buddy => {
        gun.get('users').get(buddy.pub).get('notifications').set({
          from: myPub,
          type: 'friend_removed',
          timestamp: Date.now(),
          message: `${currentUserAlias.value || 'Someone'} 已删除账户并将您从好友列表移除`,
        });
      });
      await saveDeactivatedAccount(myPub);
      gun.get('users').get(myPub).put(null);
      await storageServ.run('DELETE FROM users WHERE pubKey = ?', [myPub]);
      await storageServ.run('DELETE FROM epubs WHERE pub = ?', [myPub]);
      await storageServ.run('DELETE FROM buddies WHERE userPub = ?', [myPub]);
      await storageServ.run('DELETE FROM messages WHERE from = ?', [myPub]);
      await storageServ.execute('DELETE FROM chat_previews');
      await storageServ.run('DELETE FROM friend_remarks WHERE userPub = ?', [myPub]);
      await storageServ.run('DELETE FROM sent_requests WHERE fromPub = ?', [myPub]);
      await storageServ.run('DELETE FROM credentials WHERE key = ?', ['userCredentials']);
      user.leave();
      isLoggedIn.value = false;
      currentUserPub.value = null;
      currentUserAlias.value = null;
      currentUserPair = null;
      buddyList.value = [];
      receivedRequests.value = [];
      chatPreviewList.value = [];
      chatMessages.value = {};
      aliasMap.value = {};
      signatureMap.value = {};
      userAvatars.value = {};
      sentMessages.value.clear();
      for (const pub in chatListeners.value) {
        chatListeners.value[pub]();
      }
      chatListeners.value = {};
      showToast('账户已删除，所有相关数据已清理', 'success');
      router.replace({ path: '/' });
    } catch (err) {
      console.error('删除账户失败:', err);
      showToast('账户删除失败，请重试', 'error');
    }
  }
  async function setupListeners(pub: string): Promise<void> {
    listenMyBuddyList(pub);
    listenMyAlias(pub);
    // listenUserData(pub);
    listenMyBlacklist(pub);
    listenMyRequests(pub);
    listenAllChats(pub);
    listenMyAvatar(pub);
    buddyList.value.forEach(buddy => {
      listenUserAlias(buddy.pub);
      listenUserAvatar(buddy.pub);
      listenFriendSignature(buddy.pub);
    });
    await loadRequestsViewedState();
    // await aiAutoReply.loadState();
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

    // const networkAvailable = await pingNetworkAndPeers();
    // if (!networkAvailable) {
    //   updateAliasMsg.value = 'check you network';
    //   showToast(updateAliasMsg.value, 'warning');
    //   return;
    // }

    try {
      gun.get('users').get(currentUserPub.value).put({ alias: newAliasValue });
      await storageServ.saveUser(currentUserPub.value, newAliasValue);
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

    // const networkAvailable = await pingNetworkAndPeers();
    // if (!networkAvailable) {
    //   updateAliasMsg1.value = 'check you network';
    //   showToast(updateAliasMsg1.value, 'warning');
    //   return;
    // }

    try {
      gun.get('users').get(currentUserPub.value).put({ signature: newAliasValue1 });
      updateAliasMsg1.value = 'Successful update';
      showToast(updateAliasMsg1.value, 'success');
      newAliasInput1.value = '';
      currentUserAlias1.value = newAliasValue1;
    } catch (err) {
      updateAliasMsg1.value = 'error';
      showToast(updateAliasMsg1.value, 'error');
      // console.error('签名更新失败:', err);
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
// 新增函数：删除旧头像
async function deleteOldAvatar(pubKey: string): Promise<void> {
  try {
    // 获取当前用户数据以获取旧头像
    const userData = await storageServ.getUser(pubKey);
    
    if (userData && userData.avatar) {
      // 记录旧头像已删除
     // console.log(`删除用户 ${pubKey} 的旧头像`);
      
      // 1. 从用户表中将avatar字段置为null
      await storageServ.run(
        'UPDATE users SET avatar = NULL WHERE pubKey = ?',
        [pubKey]
      );
      
      // 2. 同时从内存缓存中移除
      delete userAvatars.value[pubKey];
      
      // 3. 通知组件刷新
      setTimeout(() => {
        const event = new CustomEvent('avatar-updated', { detail: { pubKey } });
        window.dispatchEvent(event);
      }, 10);
    }
  } catch (error) {
   // console.error('删除旧头像失败:', error);
    // 继续执行，不阻断新头像的设置
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

    // const networkAvailable = await pingNetworkAndPeers();
    // if (!networkAvailable) {
    //   updateAvatarMsg.value = 'check you network';
    //   showToast(updateAvatarMsg.value, 'warning');
    //   return;
    // }

    try {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;

            // 清空Gun.js中的avatar字段
        gun.get('users').get(currentUserPub.value!).put({ avatar: null });
              // 删除旧头像 - 先从数据库删除
        await deleteOldAvatar(currentUserPub.value!);
        
      
        
         await gun.get('users').get(currentUserPub.value!).put({ avatar: base64 });
          await storageServ.saveUser(currentUserPub.value!, currentUserAlias.value || undefined, base64);

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
      // console.error('头像更新失败:', err);
    }
  }

  function listenMyAvatar(myPub: string): void {
    gun.get('users').get(myPub).get('avatar').on(async (val: string) => {
      if (val !== userAvatars.value[myPub]) {
        userAvatars.value[myPub] = val;
        await storageServ.saveUser(myPub, currentUserAlias.value || undefined, val);
      }
    });
  }

  function UserCardMode(): void {
    showUserCard.value = !showUserCard.value;
  }
 

  async function searchUserProfile(pub: string): Promise<{ pub: string; alias?: string; avatar?: string } | null> {
    user.auth(currentUserPair)
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
        showToast(`No user was found in the current node. ${pub}`, 'warning');
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return null;
  }



  function prioritizePeer(peer: string): void {
    enabledPeer.value = peer;
    // restartGun();
    // console.log(`优先使用 Peer: ${peer}`);
  }

  function disablePeer(): void {
    enabledPeer.value = peersList.value[0];
    // restartGun();
    // console.log('禁用 Peer，使用默认第一个 Peer');
  }

  // async function checkEnabledPeer(): Promise<boolean> {
  //   return pingNetworkAndPeers();
  // }

  function listenFriendSignature(pub: string): void {
    gun.get('users').get(pub).get('signature').on(async (val: string) => {
      if (val !== signatureMap.value[pub]) {
        signatureMap.value[pub] = val || '';
        // console.log(`更新 ${pub} 的签名: ${val}`);
      }
    });
  }
  async function clearAllChats(): Promise<void> {
    if (!currentUserPub.value) {
      showToast('Not logged in', 'warning');
      return;
    }
    const myPub = currentUserPub.value;
  
    try {
      // 清理现有监听器
      for (const pub in chatListeners.value) {
        chatListeners.value[pub]();
        delete chatListeners.value[pub];
      }
  
      // 本地清理
      await storageServ.execute('DELETE FROM messages');
      await storageServ.execute('DELETE FROM chat_previews');
      await storageServ.execute('DELETE FROM chat_indexes');
      chatMessages.value = {};
      chatPreviewList.value = [];
      chatChunkRangeMap.value = {};
      sentMessages.value.clear();
      deletedRecordsMap.value = {};
  
      // 远程清理所有聊天的消息
      const buddies = buddyList.value.map(b => b.pub);
      for (const buddyPub of buddies) {
        const chatId = generateChatId(myPub, buddyPub);
        await new Promise<void>((resolve) => {
          gun.get('chats').get(chatId).get('messages').map().once((data: any, msgId: string) => {
            if (data) {
              gun.get('chats').get(chatId).get('messages').get(msgId).put(null, (ack: any) => {
                if (ack.err) {
                  console.error(`Failed to delete message ${msgId} in chat ${chatId}:`, ack.err);
                }
              });
            }
          });
          setTimeout(resolve, 1000); 
        });
  
        // 可选：清理 deleted 标记
       // gun.get('chats').get(chatId).get('deleted').get(myPub).put(null);
      }
  
      showToast('All chat records have been completely cleared', 'success');
    } catch (err) {
      console.error('Failed to clear all chats:', err);
      showToast('Failed to clear all chats', 'error');
    }
  }

  async function deactivateAccount(): Promise<void> {
    if (!currentUserPub.value) {
      showToast('error', 'warning');
      return;
    }

    const myPub = currentUserPub.value;
    // console.log('开始注销账户:', myPub);

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
          deleted: true, // 添加 deleted 标记
        }, (ack: any) => {
          if (ack.err) {
            console.error('无法标记账户为已删除:', ack.err);
            reject(new Error(ack.err));
          } else {
            resolve();
          }
        });
      });
      gun.get('requests').get(myPub).get('received').put(null);

      await storageServ.run('DELETE FROM users WHERE pubKey = ?', [myPub]);
      await storageServ.run('DELETE FROM buddies WHERE userPub = ?', [myPub]);
      await storageServ.execute('DELETE FROM messages');
      await storageServ.execute('DELETE FROM chat_previews');
      await storageServ.execute('DELETE FROM chat_indexes');
      await storageServ.run('DELETE FROM credentials WHERE key = ?', ['userCredentials']);
      await storageServ.run('DELETE FROM sent_requests WHERE fromPub = ?', [myPub]);
      await storageServ.execute('DELETE FROM blacklist');
      await storageServ.run('DELETE FROM friend_remarks WHERE userPub = ?', [myPub]);
      await gunIonicAdapter.clearCache();
      // 记录已删除的账户到本地 JSON 文件
    await saveDeactivatedAccount(myPub);
      user.leave();
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
      aliasMap.value = {};
      signatureMap.value = {};
      userAvatars.value = {};
      sentMessages.value.clear();
      friendRemarks.value = {};
      blacklist.value = [];
      currentChatPub.value = null;

      await gunIonicAdapter.clearCache();

      showToast('The account has been logged out, and all local data and friend relationships have been cleared.', 'success');
      router.replace({ path: '/' });
    } catch (err) {
      showToast('error', 'error');
    
    }
  }

  const exportProgress = ref(0);
  const importProgress = ref(0);

  const setSelectedFriendPub = (pub: string) => {
    selectedFriendPub.value = pub;

  };

  const requestsViewed = ref(false);

  // 保存好友请求查看状态到 SQLite
async function saveRequestsViewedState() {
  try {
    await storageServ.run(
      'INSERT OR REPLACE INTO requests_viewed (id, viewed) VALUES (1, ?)',
      [requestsViewed.value ? 1 : 0]
    );
    console.log('保存好友请求已读状态:', requestsViewed.value);
  } catch (err) {
    console.error('保存已读状态失败:', err);
  }
}
// 从 SQLite 加载好友请求查看状态
async function loadRequestsViewedState() {
  try {
    const result = await storageServ.query('SELECT viewed FROM requests_viewed WHERE id = 1');
    if (result.values?.length > 0) {
      requestsViewed.value = result.values[0].viewed === 1;
    } else {
      requestsViewed.value = false;
    }
    console.log('加载好友请求已读状态:', requestsViewed.value);
  } catch (err) {
    console.log('未找到已读状态记录，默认为未读:', err);
    requestsViewed.value = false;
  }
}


  const updateScreenSize = () => {
    isLargeScreen.value = window.innerWidth > 768;
    switchTo('Chat');
  };



  async function listenMyRequests(myPub: string): Promise<void> {
    gun.get('requests').get(myPub).get('received').map().on(async (data: any, key: string) => {
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
          receivedRequests.value.push({ 
            from: data.from, 
            message: data.message || '', 
            alias: data.alias || userInfo.alias,
            avatar: data.avatar || userInfo.avatar
          });
          // showToast(`收到好友请求 from ${data.alias || userInfo.alias}`, 'info');
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

  // setupNetworkListener();
  loadRequestsViewedState();

  return {
    exportDataToGun,
    importDataFromGun,
    exportProgress,
    importProgress,
    deactivateAccount,
    clearAllChats,
    // checkEnabledPeer,
    storageServ,
    lastReadTimestamps,
    UserCardMode,
    showUserCard,
    listenChat,
    listenUserAlias,
    listenUserAvatar,
    // listenUserData,
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
    currentChatPub,
    newMsg,
    chatMessages,
    chatPreviewList,
    visibleChatPreviewList,
    openChat,
    openChatPad,
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
    peersList,
    updatePeers,
    prioritizePeer,
    enabledPeer,
    // restartGun,
    disablePeer,
    refreshBuddyList,
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
    // restoreLoginState1,
    // pingNetworkAndPeers,
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
    aiAutoReply,
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




