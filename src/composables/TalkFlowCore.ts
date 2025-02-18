/* eslint-disable prefer-const */
// src/composables/TalkFlowCore.ts
import { ref, computed, nextTick } from 'vue'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import 'gun/sea'
import 'gun/axe'
import * as crypto from 'crypto-js'
import router from '@/router/index'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import gunIonicAdapter from './gun-ionic-adapter'
import { sharedStorage } from './sharedStorage'; 
import { Flint } from 'gun-flint'

// ---------- 分块最大容量 ----------
const CHUNK_SIZE = 10

/* 数据类型定义 */
interface Buddy {
  pub: string
  hasMe: boolean
}

interface ReceivedRequest {
  from: string
}

type MessageType = 'text' | 'voice' | 'video' | 'image'

export interface ChatMessage {
  from: string
  type: MessageType
  text?: string
  audioUrl?: string
  videoUrl?: string
  imageUrl?: string
  timestamp: number
  msgId?: string
}

interface ChatPreview {
  pub: string
  lastMsg: string
  lastTime: string
  hidden: boolean
  hasNew: boolean
}

/* 主逻辑入口 */
export function useChatFlow() {


sharedStorage.create().then(() => {
  console.log('sqlite 初始化完成');
});


const storage = sharedStorage

  const gun = Gun({
   gunIonicAdapter,
   peers: ['https://peer.wallie.io/gun','https://gun-manhattan.herokuapp.com/gun','wss://gunjs.herokuapp.com/gun'],
 
   radisk:false,
   localStorage:false,
   axe:true,
   
 })

 const user = gun.user()


  async function triggerLightHaptic() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
      console.log('轻微震动已触发')
    } catch (error) {
      console.error('触发震动失败：', error)
    }
  }

  async function notifyNewMessage(title: string, body: string) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(), // 使用时间戳作为通知 ID（保证唯一）
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) }, // 1秒后触发通知
            sound: 'default', // 如需要可指定铃声文件
          },
        ],
      })
      console.log('本地通知已发送')
    } catch (error) {
      console.error('发送本地通知失败:', error)
    }
  }

  // 全局状态
  const LoginData = ref(0)
  const isOpen = ref(false)
  const setOpen = (open: boolean) => (isOpen.value = open)

  // AES 加解密（用于离线存储私钥）
  function encryptData(data: string, pass: string): string {
    return crypto.AES.encrypt(data, pass).toString()
  }
  function decryptData(encrypted: string, pass: string): string | null {
    try {
      const bytes = crypto.AES.decrypt(encrypted, pass)
      const decoded = bytes.toString(crypto.enc.Utf8)
      return decoded || null
    } catch (err) {
      console.error('[decryptData] err:', err)
      return null
    }
  }

  function copyPub(pub: string | null) {
    if (!pub) {
      alert('无效的密钥')
      return
    }
    navigator.clipboard
      .writeText(pub)
      .then(() => alert('已复制密钥'))
      .catch((err) => {
        console.error('复制失败:', err)
        // alert('复制失败，请手动复制')
      })
  }

 

  /* 生成聊天 ID（双方公钥按照字典序拼接） */
  function generateChatId(pubA: string, pubB: string): string {
    return pubA < pubB ? `${pubA}_${pubB}` : `${pubB}_${pubA}`
  }

  /* 用于缓存对方 epub */
  const epubCache: Record<string, string> = {}
  function getUserEpub(pub: string): Promise<string | null> {
    return new Promise((resolve) => {
      if (epubCache[pub]) return resolve(epubCache[pub])
      gun
        .get('users')
        .get(pub)
        .get('epub')
        .once((val) => {
          if (val) {
            epubCache[pub] = val
            resolve(val)
          } else {
            resolve(null)
          }
        })
    })
  }

  /* 时间戳格式化 */
  function formatTimestamp(ts: number): string {
    const d = new Date(ts)
    return d.toLocaleString()
  }

  /* 全局状态变量 */
  const showUserCard = ref(false)
  const lastReadTimestamps = ref<Record<string, number>>({})

  const isLoggedIn = ref(false)
  const currentUserPub = ref<string | null>(null)
  const currentUserAlias = ref<string | null>(null)
  const currentUserAlias1 = ref<string | null>(null)
  const loginError = ref<string | null>(null)
  // 好友备注数据（私有，仅自己可见）
  const friendRemarks = ref<Record<string, { remark: string; remarkInfo: string }>>({})

  // 当前用户密钥对
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentUserPair: any = null
  const KeyDown = ref(false)


  // 注册相关
  const newAlias = ref('')
  const newPassphrase = ref('')
  const generateMsg = ref('')
  const encryptedKeyPair = ref<string | null>(null)

  // 登录相关
  const passphrase = ref('')
  const encryptedKeyInput = ref('')

  // 黑名单
  const blockPub = ref('')
  const blacklist = ref<string[]>([])

  // 好友 & 好友申请
  const friendPub = ref('')
  const buddyError = ref('')
  const buddyList = ref<Buddy[]>([])
  const receivedRequests = ref<ReceivedRequest[]>([])

  // 聊天相关
  const currentChatPub = ref<string | null>(null)
  const newMsg = ref('')
  const chatMessages = ref<ChatMessage[]>([])
  const messagesMap: Record<string, ChatMessage> = {}
  // 存储聊天监听器的卸载函数

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const chatListeners = ref<Record<string, Function>>({})
  const chatListRef = ref<HTMLUListElement | null>(null)
  const aliasMap = ref<Record<string, string>>({})
  const signatureMap = ref<Record<string, string>>({})
  const deletedRecordsMap: Record<string, number> = {}

  /* 聊天列表预览 */
  const chatPreviewList = ref<ChatPreview[]>([])

  /** 根据 pub 获取别名 */
  function getAliasRealtime(pub: string): string {
    return aliasMap.value[pub] || 'No Name'
  }
  /** 根据 pub 获取签名 */
  function getFriendSignature(pub: string): string {
    return signatureMap.value[pub] || ''
  }

  /* 计算可见的聊天预览列表 */
  const visibleChatPreviewList = computed(() =>
    chatPreviewList.value.filter((chat) => !chat.hidden || chat.hasNew),
  )

  /* 通知相关 */
  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
        chatPreviewList.value.forEach((chat) => {
          chat.hasNew = true
      })
    }
  }
  function showNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }

  /* 获取所有公钥（用于注册时确保密钥唯一） */
  async function fetchAllPubKeys(): Promise<Set<string>> {
    return new Promise((resolve, reject) => {
      const pubKeys = new Set<string>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let timeout: any
      const timeoutDuration = 5000
      timeout = setTimeout(() => {
        reject(new Error('网络超时，无法获取公钥列表'))
      }, timeoutDuration)
      gun
        .get('users')
        .map()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .once((data: any, pub: string) => {
          if (pub) {
            pubKeys.add(pub)
          }
        })
      setTimeout(() => {
        clearTimeout(timeout)
        resolve(pubKeys)
      }, 3000)
    })
  }

  // 从存储中加载已有的备注数据（如果存在）
  storage.get('friendRemarks').then((data: any) => {
    if (data) {
      try {
        friendRemarks.value = JSON.parse(data)
      } catch (err) {
        console.error('解析 friendRemarks 存储数据失败', err)
      }
    }
  })
  /**
   * - 更新（或新增）某个好友的备注数据
   * - @param friendPub 好友的公钥（备注对象的 key，与聊天模块中的 currentChatPub 对应）
   * - @param remark 好友备注（例如昵称或备注名称）
   * - @param remarkInfo 附加的备注信息
   */
  function updateFriendRemark(friendPub: string, remark: string, remarkInfo: string) {
    friendRemarks.value[friendPub] = { remark, remarkInfo }
    // 保存到 Ionic Storage
    storage.set('friendRemarks', JSON.stringify(friendRemarks.value))
  }

  /**
   * - 获取某个好友的备注数据；如果没有则返回空的备注
   * - @param friendPub 好友的公钥
   */
  function getFriendRemark(friendPub: string): { remark: string; remarkInfo: string } {
    return friendRemarks.value[friendPub] || { remark: '', remarkInfo: '' }
  }

  /* ========== 1. 注册 ========== */
  async function generateKeyPair() {
    const alias = newAlias.value.trim()
    const pass = newPassphrase.value

    if (!pass) {
      generateMsg.value = '请输入离线密码(用于加密私钥)'
      return
    }

    const MAX_RETRIES = 5
    let retries = 0
    let unique = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pair: any = null
    let existingPubKeys: Set<string> = new Set()

    generateMsg.value = '正在确保密钥唯一性...'
    try {
      existingPubKeys = await fetchAllPubKeys()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // console.error('[fetchAllPubKeys] err:', err)
      generateMsg.value = err.message || '确保密钥唯一性时出现错误'
      return
    }

    generateMsg.value = '正在生成密钥对并验证唯一性，请稍候...'
    try {
      while (!unique && retries < MAX_RETRIES) {
        pair = await Gun.SEA.pair()
        const pubKey = pair.pub
        if (!existingPubKeys.has(pubKey)) {
          unique = true
        } else {
          retries++
          console.warn(`公钥已存在，正在重新生成... (${retries}/${MAX_RETRIES})`)
        }
      }
      if (!unique) {
        generateMsg.value = '注册量已超过万亿级，无法生成唯一的密钥对，请稍后再试'
        return
      }
      const dataStr = JSON.stringify({ ...pair, alias })
      const encrypted = encryptData(dataStr, pass)
      encryptedKeyPair.value = encrypted
      generateMsg.value = '密钥对生成成功，请妥善保存加密私钥与解密密码'
      KeyDown.value = true
      newAlias.value = ''
      newPassphrase.value = ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('[generateKeyPair] err:', err)
      generateMsg.value = err.message || '生成过程中出现错误'
    }
  }


  /* ========== 2. 导入私钥 & 登录 ========== */
  async function importKeyPair() {
    if (!encryptedKeyInput.value.trim() || !passphrase.value) {
      loginError.value = '请填写解密密码和加密私钥'
      return
    }
    const decrypted = decryptData(encryptedKeyInput.value.trim(), passphrase.value)
    if (!decrypted) {
      loginError.value = '解密失败或密码不正确'
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pair: any
    try {
      pair = JSON.parse(decrypted)
    } catch (e) {
      console.error('[importKeyPair] JSON parse error:', e)
      loginError.value = '解密成功，但 JSON 解析出错'
      return
    }
    if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
      loginError.value = '密钥对不完整'
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.auth(pair, async (ack: any) => {
      if (ack.err) {
        loginError.value = ack.err
        isLoggedIn.value = false
      } else {
        console.log('[importKeyPair] 登录成功, pub=', pair.pub)
        loginError.value = null
        isLoggedIn.value = true
        LoginData.value = 1
        currentUserPub.value = pair.pub
        currentUserPair = pair

        if (pair.alias) {
          gun.get('users').get(pair.pub).put({ alias: pair.alias })
          currentUserAlias.value = pair.alias
        } else {
          gun
            .get('users')
            .get(pair.pub)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on((data: any) => {
              currentUserAlias.value = data?.alias || null
            })
        }
        gun.get('users').get(pair.pub).put({ epub: pair.epub })

        // 重新建立所有监听
        listenMyBuddyList(pair.pub)
        listenMyAlias(pair.pub)
        listenUserAlias(pair.pub)
        listenUserData(pair.pub)
        listenMyBlacklist(pair.pub)
        listenMyRequests(pair.pub)
        listenAllChats(pair.pub)
        listenMyAvatar(pair.pub)
        listenUserAvatar(pair.pub)

        passphrase.value = ''
        encryptedKeyInput.value = ''

        await requestNotificationPermission()
        await storage.set('currentUserPub', pair.pub)
        await storage.set('currentUserAlias', pair.alias)
        // 保存整个密钥对（注意安全风险，实际使用时建议加密后存储）
       await storage.set('encryptedKeyPair', JSON.stringify(pair))
      }
    })
  }

  /* ========== 监听所有聊天 ========== */
  function listenAllChats(myPub: string) {
    buddyList.value.forEach((buddy) => {
      listenChat(buddy.pub)
    })
    gun
      .get('users')
      .get(myPub)
      .get('buddy')
      .map()
      .on((val: boolean, buddyPub: string) => {
        if (val) {
          if (!chatListeners.value[buddyPub]) {
            listenChat(buddyPub)
          }
        } else {
          if (chatListeners.value[buddyPub]) {
            chatListeners.value[buddyPub]()
            delete chatListeners.value[buddyPub]
          }
          chatPreviewList.value = chatPreviewList.value.filter((c) => c.pub !== buddyPub)
        }
      })
  }

  /* ========== 好友申请处理 ========== */
  function requestAddBuddy() {
    if (!currentUserPub.value) {
      buddyError.value = '请先登录'
      return
    }
    const pubB = friendPub.value.trim()
    if (!pubB) {
      buddyError.value = '请输入对方公钥'
      return
    }
    if (isInMyBlacklist(pubB)) {
      buddyError.value = '你已拉黑对方，无法发送好友申请'
      return
    }
    buddyError.value = ''
    gun
      .get('requests')
      .get(pubB)
      .get('received')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ from: currentUserPub.value }, (ack: any) => {
        if (ack.err) {
          buddyError.value = '发送好友申请失败:' + ack.err
        } else {
          alert('好友申请已发送')
          friendPub.value = ''
        }
      })
  }
  function acceptBuddyRequest(fromPub: string) {
    if (!currentUserPub.value) return
    const myPub = currentUserPub.value
    gun
      .get('users')
      .get(myPub)
      .get('buddy')
      .get(fromPub)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .put(true, (ack: any) => {
        if (ack.err) {
          alert('同意失败:' + ack.err)
          return
        }
        gun.get('users').get(fromPub).get('buddy').get(myPub).put(true)
        gun.get('requests').get(myPub).get('received').get(fromPub).put(null)
        alert('已同意好友申请')
        listenChat(fromPub)
      })
  }
  function rejectBuddyRequest(fromPub: string) {
    if (!currentUserPub.value) return
    const myPub = currentUserPub.value
    gun.get('requests').get(myPub).get('received').get(fromPub).put(null)
    alert('已拒绝好友申请')
  }

  /* ========== 监听我的好友列表 ========== */
  function listenMyBuddyList(myPub: string) {
    buddyList.value = []
    gun
      .get('users')
      .get(myPub)
      .get('buddy')
      .map()
      .on((val: boolean, pubKey: string) => {
        if (val) {
          if (!buddyList.value.find((b) => b.pub === pubKey)) {
            buddyList.value.push({ pub: pubKey, hasMe: false })
            watchBuddyReverse(pubKey, myPub)
            listenUserAlias(pubKey)
            listenUserData(pubKey)
            listenChat(pubKey)
            listenUserAvatar(pubKey)
          }
        } else {
          buddyList.value = buddyList.value.filter((b) => b.pub !== pubKey)
          if (chatListeners.value[pubKey]) {
            chatListeners.value[pubKey]()
            delete chatListeners.value[pubKey]
          }
          chatPreviewList.value = chatPreviewList.value.filter((c) => c.pub !== pubKey)
        }
      })
  }
  function watchBuddyReverse(targetPub: string, myPub: string) {
    gun
      .get('users')
      .get(targetPub)
      .get('buddy')
      .get(myPub)
      .on((val: boolean) => {
        const item = buddyList.value.find((b) => b.pub === targetPub)
        if (item) {
          item.hasMe = !!val
        }
      })
  }
  function removeBuddy(pubKey: string) {
    if (!currentUserPub.value) return
    gun
      .get('users')
      .get(currentUserPub.value)
      .get('buddy')
      .get(pubKey)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .put(null, (ack: any) => {
        if (ack.err) {
          // alert('删除失败:' + ack.err)
        } else {
          // alert('已删除好友:' + pubKey)
        }
      })
  }

  /* ========== 黑名单 ========== */
  function addToBlacklist() {
    if (!currentUserPub.value) return
    const targetPub = blockPub.value.trim()
    if (!targetPub) {
      alert('请输入要拉黑的公钥')
      return
    }
    gun
      .get('users')
      .get(currentUserPub.value)
      .get('blacklist')
      .get(targetPub)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .put(true, (ack: any) => {
        if (ack.err) {
          alert('拉黑失败:' + ack.err)
        } else {
          alert('已拉黑:' + targetPub)
          blockPub.value = ''
        }
      })
  }
  function removeFromBlacklist(pubKey?: string) {
    if (!currentUserPub.value) return
    const targetPub = pubKey || blockPub.value.trim()
    if (!targetPub) {
      alert('请输入要移除黑名单的身份钥匙')
      return
    }
    gun
      .get('users')
      .get(currentUserPub.value)
      .get('blacklist')
      .get(targetPub)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .put(null, (ack: any) => {
        if (ack.err) {
          alert('移除黑名单失败:' + ack.err)
        } else {
          alert('已移除黑名单:' + targetPub)
          blockPub.value = ''
        }
      })
  }
  function listenMyBlacklist(myPub: string) {
    blacklist.value = []
    gun
      .get('users')
      .get(myPub)
      .get('blacklist')
      .map()
      .on((val: boolean, pubKey: string) => {
        if (val) {
          if (!blacklist.value.includes(pubKey)) {
            blacklist.value.push(pubKey)
          }
        } else {
          blacklist.value = blacklist.value.filter((p) => p !== pubKey)
        }
      })
  }
  function isInMyBlacklist(targetPub: string): boolean {
    return blacklist.value.includes(targetPub)
  }

  /* ========== 好友申请接收 ========== */
  function listenMyRequests(myPub: string) {
    receivedRequests.value = []
    gun
      .get('requests')
      .get(myPub)
      .get('received')
      .map()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on((data: any, key: string) => {
        if (!data || !data.from) {
          receivedRequests.value = receivedRequests.value.filter((r) => r.from !== key)
        } else {
          if (isInMyBlacklist(data.from)) {
            gun.get('requests').get(myPub).get('received').get(key).put(null)
            return
          }
          if (!receivedRequests.value.find((r) => r.from === data.from)) {
            receivedRequests.value.push({ from: data.from })
          }
        }
      })
  }

  /* ========== 聊天 ========== */
  function checkIfBuddy(targetPub: string): Promise<boolean> {
    return new Promise((resolve) => {
      gun
        .get('users')
        .get(targetPub)
        .get('buddy')
        .get(currentUserPub.value!)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .once((val: any) => {
          resolve(!!val)
        })
    })
  }
  async function encryptPayload(
    targetPub: string,
    payload: string,
  ): Promise<{ encryptedForBuddy: string; encryptedForMe: string }> {
    if (!currentUserPair) throw new Error('未登录')
    const buddyEpub = await getUserEpub(targetPub)
    if (!buddyEpub) throw new Error('无法获取对方 epub')
    const secretBuddy = await Gun.SEA.secret(buddyEpub, currentUserPair)
    if (!secretBuddy) throw new Error('无法生成对方 secret')
    const encryptedForBuddy = await Gun.SEA.encrypt(payload, secretBuddy)

    const myEpub = currentUserPair.epub
    const secretMe = await Gun.SEA.secret(myEpub, currentUserPair)
    if (!secretMe) throw new Error('无法生成自己的 secret')
    const encryptedForMe = await Gun.SEA.encrypt(payload, secretMe)
    return { encryptedForBuddy, encryptedForMe }
  }

/** 
   * 新增：获取并设置最新块号
   */
async function getLatestChatChunkIndex(chatId: string): Promise<number> {
  return new Promise<number>((resolve) => {
    gun
      .get('chats')
      .get(chatId)
      .get('latestChunk')
      .once((val: number) => {
        resolve(val || 0)
      })
  })
}


async function setLatestChatChunkIndex(chatId: string, newChunkIndex: number) {
  return new Promise<void>((resolve) => {
    gun
      .get('chats')
      .get(chatId)
      .get('latestChunk')
      .put(newChunkIndex, (ack: any) => {
        if (ack.err) console.error('setLatestChatChunkIndex失败:', ack.err)
        resolve()
      })
  })
}

/**
   * 统计该块下已有多少条消息
   */
async function getChunkCount(chatId: string, chunkIndex: number): Promise<number> {
  return new Promise<number>((resolve) => {
    let count = 0
    gun
      .get('chats')
      .get(chatId)
      .get('chunks')
      .get(String(chunkIndex))
      .map()
      .once((msg: any) => {
        if (msg) count++
      })
    setTimeout(() => resolve(count), 100)
  })
}

 /**
   * 在 sendChat 中使用的“分块存储”逻辑
   */
 async function publishChatMessage(chatId: string, msgObj: any) {
  // 1) 获取最新块号
  let latest = await getLatestChatChunkIndex(chatId)
  // 2) 判断块是否已满
  const count = await getChunkCount(chatId, latest)
  if (count >= CHUNK_SIZE) {
    latest++
    await setLatestChatChunkIndex(chatId, latest)
  }
  // 3) 写入 chunkX
  gun
    .get('chats')
    .get(chatId)
    .get('chunks')
    .get(String(latest))
    .set(msgObj, (ack: any) => {
      if (ack.err) {
        console.error('发布消息失败:', ack.err)
      } else {
        console.log(`消息成功写到 chunk=${latest}`)
      }
    })
}


  // async function sendChat(messageType: MessageType, payload: string | null = null) {
  //   if (!currentUserPub.value || !currentChatPub.value) {
  //     // alert('请先选择好友并登录')
  //     return
  //   }
  //   const myPub = currentUserPub.value
  //   const targetPub = currentChatPub.value
  //   const now = Date.now()
  //   const chatId = generateChatId(myPub, targetPub)
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   const msgObj: any = {
  //     from: myPub,
  //     type: messageType,
  //     timestamp: now,
  //   }
  //   let dataToSend = ''
  //   let previewText = ''

  //   if (messageType === 'text') {
  //     const text = newMsg.value.trim()
  //     if (!text) {
  //       // alert('消息不能为空')
  //       return
  //     }
  //     dataToSend = text
  //     previewText = text
  //   } else if (messageType === 'voice') {
  //     if (!payload) {
  //       // alert('语音数据为空')
  //       return
  //     }
  //     dataToSend = payload
  //     previewText = '[语音消息]'
  //   } else if (messageType === 'video') {
  //     if (!payload) {
  //       // alert('视频数据为空')
  //       return
  //     }
  //     dataToSend = payload
  //     previewText = '[视频消息]'
  //   } else if (messageType === 'image') {
  //     if (!payload) {
  //       // alert('图片数据为空')
  //       return
  //     }
  //     dataToSend = payload
  //     previewText = '[图片消息]'
  //   } else {
  //     // alert('未知的消息类型')
  //     return
  //   }

  //   try {
  //     const buddyExists = await checkIfBuddy(targetPub)
  //     if (!buddyExists) {
  //       alert('我们已被对方删除。')
  //     }
  //     const { encryptedForBuddy, encryptedForMe } = await encryptPayload(targetPub, dataToSend)
  //     switch (messageType) {
  //       case 'text':
  //         msgObj.textForBuddy = encryptedForBuddy
  //         msgObj.textForMe = encryptedForMe
  //         break
  //       case 'voice':
  //         msgObj.audioForBuddy = encryptedForBuddy
  //         msgObj.audioForMe = encryptedForMe
  //         break
  //       case 'video':
  //         msgObj.videoForBuddy = encryptedForBuddy
  //         msgObj.videoForMe = encryptedForMe
  //         break
  //       case 'image':
  //         msgObj.imageForBuddy = encryptedForBuddy
  //         msgObj.imageForMe = encryptedForMe
  //         break
  //     }
  //     gun
  //       .get('chats')
  //       .get(chatId)
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       .set(msgObj, (ack: any) => {
  //         if (ack.err) {
  //           // alert('发送失败:' + ack.err)
  //         } else {
  //           if (messageType === 'text') newMsg.value = ''
  //           updateChatPreview(targetPub, previewText, now)
  //         }
  //       })
  //   } catch (err) {
  //     console.error('sendChat error:', err)
  //     // alert('发送消息时发生错误')
  //   }
  // }
/**
   * “新的” sendChat：内部改为分块写入
   */
async function sendChat(messageType: MessageType, payload: string | null = null) {
  if (!currentUserPub.value || !currentChatPub.value) return
  const myPub = currentUserPub.value
  const targetPub = currentChatPub.value
  const now = Date.now()
  const chatId = generateChatId(myPub, targetPub)

  // 构造 msgObj（和原先一样）
  const msgObj: any = {
    from: myPub,
    type: messageType,
    timestamp: now,
  }
  let dataToSend = ''
  let previewText = ''
  if (messageType === 'text') {
    const text = newMsg.value.trim()
    if (!text) return
    dataToSend = text
    previewText = text
  } else if (messageType === 'voice') {
    if (!payload) return
    dataToSend = payload
    previewText = '[语音消息]'
  } else if (messageType === 'video') {
    if (!payload) return
    dataToSend = payload
    previewText = '[视频消息]'
  } else if (messageType === 'image') {
    if (!payload) return
    dataToSend = payload
    previewText = '[图片消息]'
  } else {
    return
  }

  try {
    const buddyExists = await checkIfBuddy(targetPub)
    if (!buddyExists) alert('我们已被对方删除。')

    // 加密
    const { encryptedForBuddy, encryptedForMe } = await encryptPayload(targetPub, dataToSend)
    switch (messageType) {
      case 'text':
        msgObj.textForBuddy = encryptedForBuddy
        msgObj.textForMe = encryptedForMe
        break
      case 'voice':
        msgObj.audioForBuddy = encryptedForBuddy
        msgObj.audioForMe = encryptedForMe
        break
      case 'video':
        msgObj.videoForBuddy = encryptedForBuddy
        msgObj.videoForMe = encryptedForMe
        break
      case 'image':
        msgObj.imageForBuddy = encryptedForBuddy
        msgObj.imageForMe = encryptedForMe
        break
    }

    // ---------------------------
    // 分块写消息
    // ---------------------------
    await publishChatMessage(chatId, msgObj)

    // 若文本，则清空输入框
    if (messageType === 'text') {
      newMsg.value = ''
    }

    // 更新预览
    updateChatPreview(targetPub, previewText, now)
  } catch (err) {
    console.error('sendChat error:', err)
  }
}


  function openChat(pubKey: string) {
    router.push('/chatpage')
    if (!currentUserPub.value) {
      // alert('请先登录')
      return
    }
    const iAdded = buddyList.value.some((b) => b.pub === pubKey)
    if (!iAdded) {
      // alert('你未添加对方为好友，无法聊天')
      return
    }
    currentChatPub.value = pubKey

    const chat = chatPreviewList.value.find((c) => c.pub === pubKey)
    if (chat) {
      chat.hasNew = false
    }
    if (chatListeners.value[pubKey]) {
      chatListeners.value[pubKey]()
      delete chatListeners.value[pubKey]
    }
    for (const k in messagesMap) {
      delete messagesMap[k]
    }
    chatMessages.value = []
    listenChat(pubKey)
  }


  function closeChat() {
    if (currentChatPub.value) {
      const chatId = generateChatId(currentUserPub.value!, currentChatPub.value)
      delete chatEarliestChunkMap.value[chatId] // 重置
    }
    currentChatPub.value = null
  }
  function hideCurrentChat() {
    if (!currentChatPub.value) return
    const pubKey = currentChatPub.value
    const chat = chatPreviewList.value.find((c) => c.pub === pubKey)
    if (chat) {
      chat.hidden = !chat.hidden
      chat.hasNew = false
    }
    currentChatPub.value = null
  }
  function showCurrentChat() {
    if (!currentChatPub.value) return
    const pubKey = currentChatPub.value
    const chat = chatPreviewList.value.find((c) => c.pub === pubKey)
    if (chat) {
      chat.hidden = false
      chat.hasNew = false
    }
    currentChatPub.value = null
  }
  function refreshChat() {
    if (!currentUserPub.value || !currentChatPub.value) {
      return
    }
    if (chatListeners.value[currentChatPub.value]) {
      chatListeners.value[currentChatPub.value]()
      delete chatListeners.value[currentChatPub.value]
    }
    for (const k in messagesMap) {
      delete messagesMap[k]
    }
    chatMessages.value = []
    listenChat(currentChatPub.value)
    // alert('聊天记录已刷新')
  }

  function refreshMessagesUI(chatId: string) {
    const cutoff = deletedRecordsMap[chatId] || 0
    const rawList = Object.values(messagesMap)
    const filtered = rawList.filter((m) => m.timestamp > cutoff)
    filtered.sort((a, b) => a.timestamp - b.timestamp)
    chatMessages.value = filtered
    autoScrollToBottom()
  }

  function updateChatPreview(pubKey: string, lastMsg: string, ts: number) {

    // 生成聊天ID（当前用户和对方）
    const chatId = generateChatId(currentUserPub.value!, pubKey)
    // 获取该聊天的删除截止时间，默认为 0
    const cutoff = deletedRecordsMap[chatId] || 0
    // 如果新消息的时间戳小于等于截止时间，则不更新预览
    if (ts <= cutoff) {
      return
    }

    const shortMsg = lastMsg.length > 10 ? lastMsg.slice(0, 10) + '...' : lastMsg
    const timeStr = formatTimestamp(ts)
    const idx = chatPreviewList.value.findIndex((c) => c.pub === pubKey)
    if (idx >= 0) {
      chatPreviewList.value[idx].lastMsg = shortMsg
      chatPreviewList.value[idx].lastTime = timeStr
      // 自动取消隐藏状态
      chatPreviewList.value[idx].hidden = false
    } else {
      chatPreviewList.value.push({
        pub: pubKey,
        lastMsg: shortMsg,
        lastTime: timeStr,
        hidden: false,
        hasNew: false,
      })
    }
  }
// 响应式变量，用于跟踪各会话最后通知的时间戳
const lastNotifiedTimestamp = ref<Record<string, number>>({});

//   function listenChat(pubKey: string) {
//     if (!currentUserPub.value) return
//     const myPub = currentUserPub.value
//     const chatId = generateChatId(myPub, pubKey)
//     if (chatListeners.value[pubKey]) return

//     let initialLoad = true
//     // 2秒后认为初始加载完成
//     setTimeout(() => {
//       initialLoad = false
//     }, 2000)

//     const deletedListener = gun
//       .get('chats')
//       .get(chatId)
//       .get('deleted')
//       .get(myPub)
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       .on((val: any) => {
//         if (typeof val === 'number') {
//           deletedRecordsMap[chatId] = val
//         } else {
//           deletedRecordsMap[chatId] = 0
//         }
//         refreshMessagesUI(chatId)
//       })

//     const messageListener = gun
//       .get('chats')
//       .get(chatId)
//       .map()
//       .on(async (data: any, msgId: string) => {
//         if (!data || !data.from) return
//         if (messagesMap[msgId]) return
//         let decryptedText = '(解密失败)'
//         let decryptedAudioUrl = ''
//         let decryptedVideoUrl = ''
//         let decryptedImageUrl = ''
//         if (data.type === 'text') {
//           if (data.from === myPub) {
//             decryptedText = await decryptMessageWithMyEpub(data.textForMe)
//           } else {
//             decryptedText = await decryptMessageWithBuddyEpub(data.from, data.textForBuddy)
//           }
//         } else if (data.type === 'voice') {
//           if (data.from === myPub && data.audioForMe) {
//             decryptedAudioUrl = await decryptMessageWithMyEpub(data.audioForMe)
//           } else if (data.audioForBuddy) {
//             decryptedAudioUrl = await decryptMessageWithBuddyEpub(data.from, data.audioForBuddy)
//           }
//         } else if (data.type === 'video') {
//           if (data.from === myPub && data.videoForMe) {
//             decryptedVideoUrl = await decryptMessageWithMyEpub(data.videoForMe)
//           } else if (data.videoForBuddy) {
//             decryptedVideoUrl = await decryptMessageWithBuddyEpub(data.from, data.videoForBuddy)
//           }
//         } else if (data.type === 'image') {
//           if (data.from === myPub && data.imageForMe) {
//             decryptedImageUrl = await decryptMessageWithMyEpub(data.imageForMe)
//           } else if (data.imageForBuddy) {
//             decryptedImageUrl = await decryptMessageWithBuddyEpub(data.from, data.imageForBuddy)
//           }
//         }
//         const finalObj: ChatMessage = {
//           from: data.from,
//           type: data.type,
//           text: decryptedText || undefined,
//           audioUrl: decryptedAudioUrl || undefined,
//           videoUrl: decryptedVideoUrl || undefined,
//           imageUrl: decryptedImageUrl || undefined,
//           timestamp: data.timestamp || 0,
//         }
//         messagesMap[msgId] = finalObj
//         refreshMessagesUI(chatId)
//         const previewText =
//           data.type === 'text'
//             ? decryptedText
//             : data.type === 'voice'
//               ? '[语音消息]'
//               : data.type === 'video'
//                 ? '[视频消息]'
//                 : data.type === 'image'
//                   ? '[图片消息]'
//                   : ''
//         updateChatPreview(pubKey, previewText, finalObj.timestamp)

//  // 推送通知：仅对非初始加载、非自己发送的、且当前未打开该聊天的情况触发
//  if (!initialLoad && data.from !== myPub && currentChatPub.value !== data.from) {
//   const lastNotified = lastNotifiedTimestamp.value[pubKey] || 0;
//   if (data.timestamp > lastNotified) {
//     // 更新最后通知时间戳，确保只对这条新消息推送一次通知
//     lastNotifiedTimestamp.value[pubKey] = data.timestamp;
//     const title = `${getAliasRealtime(data.from)}`;
//     notifyNewMessage(title, previewText);
//     // triggerLightHaptic();
//     const chat = chatPreviewList.value.find((c) => c.pub === pubKey)
//     if (chat) {
//       chat.hasNew = true
//     }
//   }
// }
// });

//     chatListeners.value[pubKey] = () => {
//       deletedListener.off()
//       messageListener.off()
//     }
//   }
 /**
   * “新的” listenChat: 只监听“最新块” + 监听 latestChunk 字段
   */
 function listenChat(pubKey: string) {
  if (!currentUserPub.value) return
  const myPub = currentUserPub.value
  const chatId = generateChatId(myPub, pubKey)

  // 如果已在监听，就不重复
  if (chatListeners.value[pubKey]) return

  let initialLoad = true
  setTimeout(() => { initialLoad = false }, 2000)

  // 监听 deleted(与原逻辑相同)
  const deletedListener = gun
    .get('chats')
    .get(chatId)
    .get('deleted')
    .get(myPub)
    .on((val: any) => {
      if (typeof val === 'number') {
        deletedRecordsMap[chatId] = val
      } else {
        deletedRecordsMap[chatId] = 0
      }
      refreshMessagesUI(chatId)
    })
  
  // 先取消旧的 .map() on 整个 chatId (删掉老逻辑)
  // 新逻辑: 监听 latestChunk, 并对“当前块” .map().on()
  let offChunk: any = null

  // 监听 latestChunk
  const offLatestChunk = gun
    .get('chats')
    .get(chatId)
    .get('latestChunk')
    .on(async (chunkIndex: number) => {
      if (!chunkIndex) chunkIndex = 0
      // 切换到 chunkIndex
      if (offChunk) {
        offChunk.off() // 取消上一个块监听
      }
      offChunk = gun
        .get('chats')
        .get(chatId)
        .get('chunks')
        .get(String(chunkIndex))
        .map()
        .on(async (data: any, msgId: string) => {
          if (!data || !data.from) return
          if (messagesMap[msgId]) return
          // 解密
          let decryptedText = '(解密失败)'
          let decryptedAudioUrl = ''
          let decryptedVideoUrl = ''
          let decryptedImageUrl = ''
          if (data.type === 'text') {
            if (data.from === myPub) {
              decryptedText = await decryptMessageWithMyEpub(data.textForMe)
            } else {
              decryptedText = await decryptMessageWithBuddyEpub(data.from, data.textForBuddy)
            }
          } else if (data.type === 'voice') {
            if (data.from === myPub && data.audioForMe) {
              decryptedAudioUrl = await decryptMessageWithMyEpub(data.audioForMe)
            } else if (data.audioForBuddy) {
              decryptedAudioUrl = await decryptMessageWithBuddyEpub(data.from, data.audioForBuddy)
            }
          } else if (data.type === 'video') {
            if (data.from === myPub && data.videoForMe) {
              decryptedVideoUrl = await decryptMessageWithMyEpub(data.videoForMe)
            } else if (data.videoForBuddy) {
              decryptedVideoUrl = await decryptMessageWithBuddyEpub(data.from, data.videoForBuddy)
            }
          } else if (data.type === 'image') {
            if (data.from === myPub && data.imageForMe) {
              decryptedImageUrl = await decryptMessageWithMyEpub(data.imageForMe)
            } else if (data.imageForBuddy) {
              decryptedImageUrl = await decryptMessageWithBuddyEpub(data.from, data.imageForBuddy)
            }
          }
          const finalObj: ChatMessage = {
            from: data.from,
            type: data.type,
            text: decryptedText || undefined,
            audioUrl: decryptedAudioUrl || undefined,
            videoUrl: decryptedVideoUrl || undefined,
            imageUrl: decryptedImageUrl || undefined,
            timestamp: data.timestamp || 0,
          }
          messagesMap[msgId] = finalObj
          refreshMessagesUI(chatId)
          const previewText =
            data.type === 'text' ? decryptedText
              : data.type === 'voice' ? '[语音消息]'
              : data.type === 'video' ? '[视频消息]'
              : data.type === 'image' ? '[图片消息]' : ''
          updateChatPreview(pubKey, previewText, finalObj.timestamp)

          // 推送通知
          if (!initialLoad && data.from !== myPub && currentChatPub.value !== data.from) {
            const lastNotified = lastNotifiedTimestamp.value[pubKey] || 0
            if (data.timestamp > lastNotified) {
              lastNotifiedTimestamp.value[pubKey] = data.timestamp
              const title = `${getAliasRealtime(data.from)}`
              notifyNewMessage(title, previewText)
              const chat = chatPreviewList.value.find((c) => c.pub === pubKey)
              if (chat) {
                chat.hasNew = true
              }
            }
          }
        })
    })

  // 合并2个 off
  chatListeners.value[pubKey] = () => {
    deletedListener.off()
    offLatestChunk.off()
    if (offChunk) offChunk.off()
  }
}
  function onDeleteChatClick(pub: string) {
    if (!pub) return
    // 获取当前时间作为删除截止时间
    const cutoff = Date.now()
    // 生成聊天 ID（例如通过字典序拼接）
    const chatId = generateChatId(currentUserPub.value!, pub)
    // 写入 Gun 数据库中的删除截止时间
    gun.get('chats').get(chatId).get('deleted').get(currentUserPub.value!).put(cutoff)

    // 更新本地删除截止时间缓存（假设你使用 deletedRecordsMap 保存各聊天截止时间）
    deletedRecordsMap[chatId] = cutoff

    // alert(`已删除 ${formatTimestamp(cutoff)} 前的消息`)
  }
 /**
   *  新增：加载更早历史块
   *  - 假设你想在UI点“加载更多”时调用
   *  - chunkIndex-- 并监听它
   */
// 在 TalkFlowCore.ts 顶部或文件中部新增一个记录每个对话最早 chunk 的映射:
const chatEarliestChunkMap = ref<Record<string, number>>({})

/**
 * 加载更早历史块
 * - 在 UI 点击“加载更多”时调用。
 * - 先从 chatEarliestChunkMap[chatId] 找到当前已加载的最早块，
 *   然后 chunkIndex = earliest - 1，再用 .map().once() 读取并解密消息。
 */
async function loadMoreChatHistory(pubKey: string) {
  if (!currentUserPub.value) return
  const myPub = currentUserPub.value
  const chatId = generateChatId(myPub, pubKey)

  // 如果我们还没记录过这个对话的最早chunk，则先初始化为最新chunk
  if (chatEarliestChunkMap.value[chatId] === undefined) {
    // 先获取最新块
    const latest = await getLatestChatChunkIndex(chatId)
    // 假设你已经监听了 latest 块 => earliest 也先设为 latest
    chatEarliestChunkMap.value[chatId] = latest
  }

  let earliest = chatEarliestChunkMap.value[chatId]
  // 计算下一个更早块
  const olderChunk = earliest - 1
  if (olderChunk < 0) {
    console.log(`[loadMoreChatHistory] 对话 ${chatId} 已没有更早的块可加载(已经到0)。`)
    return
  }

  // 开始加载 chunk=olderChunk
  console.log(`[loadMoreChatHistory] 开始加载对话 ${chatId} 的块 ${olderChunk}`)

  // 用 once 即一次性读取数据，如果你想保持持续监听，可以换 on
  gun
    .get('chats')
    .get(chatId)
    .get('chunks')
    .get(String(olderChunk))
    .map()
    .once(async (data: any, msgId: string) => {
      // 忽略空数据或无 from 字段
      if (!data || !data.from) return
      // 如果 messagesMap 已有这条消息，就跳过
      if (messagesMap[msgId]) return

      // 解密流程，跟 listenChat 内部一致
      let decryptedText = '(解密失败)'
      let decryptedAudioUrl = ''
      let decryptedVideoUrl = ''
      let decryptedImageUrl = ''
      if (data.type === 'text') {
        if (data.from === myPub) {
          decryptedText = await decryptMessageWithMyEpub(data.textForMe)
        } else {
          decryptedText = await decryptMessageWithBuddyEpub(data.from, data.textForBuddy)
        }
      } else if (data.type === 'voice') {
        if (data.from === myPub && data.audioForMe) {
          decryptedAudioUrl = await decryptMessageWithMyEpub(data.audioForMe)
        } else if (data.audioForBuddy) {
          decryptedAudioUrl = await decryptMessageWithBuddyEpub(data.from, data.audioForBuddy)
        }
      } else if (data.type === 'video') {
        if (data.from === myPub && data.videoForMe) {
          decryptedVideoUrl = await decryptMessageWithMyEpub(data.videoForMe)
        } else if (data.videoForBuddy) {
          decryptedVideoUrl = await decryptMessageWithBuddyEpub(data.from, data.videoForBuddy)
        }
      } else if (data.type === 'image') {
        if (data.from === myPub && data.imageForMe) {
          decryptedImageUrl = await decryptMessageWithMyEpub(data.imageForMe)
        } else if (data.imageForBuddy) {
          decryptedImageUrl = await decryptMessageWithBuddyEpub(data.from, data.imageForBuddy)
        }
      }
      // 构造 finalObj
      const finalObj: ChatMessage = {
        from: data.from,
        type: data.type,
        text: decryptedText || undefined,
        audioUrl: decryptedAudioUrl || undefined,
        videoUrl: decryptedVideoUrl || undefined,
        imageUrl: decryptedImageUrl || undefined,
        timestamp: data.timestamp || 0,
      }
      // 存入 messagesMap
      messagesMap[msgId] = finalObj
    })

  // 等待一定时间再做刷新 UI
   setTimeout(() => {
    refreshMessagesUI(chatId)
   }, 100)

  // 更新最早chunk记录
  chatEarliestChunkMap.value[chatId] = olderChunk
}




  async function autoScrollToBottom() {
    await nextTick()
  }

  async function decryptMessageWithMyEpub(encryptedText: string): Promise<string> {
    if (!currentUserPair) return '(未登录)'
    const myEpub = currentUserPair.epub
    const secretMe = await Gun.SEA.secret(myEpub, currentUserPair)
    if (!secretMe) return '(生成secret失败)'
    return await Gun.SEA.decrypt(encryptedText, secretMe)
  }
  async function decryptMessageWithBuddyEpub(
    buddyPub: string,
    encryptedText: string,
  ): Promise<string> {
    if (!currentUserPair) return '(未登录)'
    const buddyEpub = await getUserEpub(buddyPub)
    if (!buddyEpub) return '(无buddyEpub)'
    const secretBuddy = await Gun.SEA.secret(buddyEpub, currentUserPair)
    if (!secretBuddy) return '(生成secret失败)'
    return await Gun.SEA.decrypt(encryptedText, secretBuddy)
  }

  /* ========== 监听 alias ========== */
  function listenMyAlias(myPub: string) {
    gun
      .get('users')
      .get(myPub)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on((data: any) => {
        if (data?.alias) {
          currentUserAlias.value = data.alias
          aliasMap.value[myPub] = data.alias
        }
        if (data?.signature) {
          signatureMap.value[myPub] = data.signature
          currentUserAlias1.value = data.signature
        }
      })
  }
  function listenUserAlias(pub: string) {
    gun
      .get('users')
      .get(pub)
      .get('alias')
      .on((val: string) => {
        aliasMap.value[pub] = val || ''
      })
  }
  function listenUserData(pub: string) {
    gun
      .get('users')
      .get(pub)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on((data: any) => {
        if (data) {
          // 监听昵称
          aliasMap.value[pub] = data.alias || ''
          // 监听签名
          signatureMap.value[pub] = data.signature || ''
        }
      })
  }

  /* ========== 修改昵称 ========== */
  const newAliasInput = ref('')
  const updateAliasMsg = ref('')
  async function updateAlias() {
    if (!currentUserPub.value) {
      updateAliasMsg.value = '请先登录'
      return
    }
    const newAliasValue = newAliasInput.value.trim()
    if (!newAliasValue) {
      updateAliasMsg.value = '别名不能为空'
      return
    }
    try {
      gun.get('users').get(currentUserPub.value).put({ alias: newAliasValue })
      updateAliasMsg.value = '别名更新成功'
      newAliasInput.value = ''
      currentUserAlias.value = newAliasValue
      await storage.set('currentUserAlias', newAliasValue)
    } catch (err) {
      console.error('[updateAlias] err:', err)
      updateAliasMsg.value = '更新过程中出现错误'
    }
  }

  /* ========== 修改签名 ========== */
  const newAliasInput1 = ref('')
  const updateAliasMsg1 = ref('')
  async function updateAlias1() {
    if (!currentUserPub.value) {
      updateAliasMsg1.value = '请先登录'
      return
    }
    const newAliasValue1 = newAliasInput1.value.trim()
    // if (!newAliasValue1) {
    //   updateAliasMsg1.value = '签名不能为空'
    //   return
    // }
    try {
      gun.get('users').get(currentUserPub.value).put({ signature: newAliasValue1 })
      updateAliasMsg1.value = '签名更新成功'
      newAliasInput1.value = ''
      currentUserAlias1.value = newAliasValue1
      await storage.set('currentUserSignature', newAliasValue1)
    } catch (err) {
      console.error('[updateAlias] err:', err)
      updateAliasMsg1.value = '更新过程中出现错误'
    }
  }

  /* ========== 头像相关 ========== */
  const avatarFile = ref<File | null>(null)
  const avatarUrl = ref<string | null>(null)
  const updateAvatarMsg = ref('')
  function handleAvatarUpload(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
      avatarFile.value = target.files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        avatarUrl.value = e.target?.result as string
      }
      reader.readAsDataURL(target.files[0])
    }
  }
  async function updateAvatar() {
    if (!currentUserPub.value) {
      updateAvatarMsg.value = '请先登录'
      return
    }
    if (!avatarFile.value) {
      updateAvatarMsg.value = '请先选择一个头像文件'
      return
    }
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        gun.get('users').get(currentUserPub.value!).put({ avatar: base64 })
        updateAvatarMsg.value = '头像更新成功'
        avatarFile.value = null
        avatarUrl.value = null
      }
      reader.readAsDataURL(avatarFile.value)
    } catch (err) {
      console.error('[updateAvatar] err:', err)
      updateAvatarMsg.value = '更新过程中出现错误'
    }
  }
  function listenMyAvatar(myPub: string) {
    gun
      .get('users')
      .get(myPub)
      .get('avatar')
      .on((val: string) => {
        // 可扩展：存储头像信息到其他状态
      })
  }
  const userAvatars = ref<Record<string, string>>({})
  function listenUserAvatar(pub: string) {
    gun
      .get('users')
      .get(pub)
      .get('avatar')
      .on((val: string) => {
        userAvatars.value[pub] = val || ''
      })
  }

  /* =========================
     语音录制部分
  ========================= */
  const audioStream = ref<MediaStream | null>(null)
  const isRecording = ref(false)
  const recordedAudio = ref<Blob | null>(null)
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioChunks = ref<Blob[]>([])

  async function startRecording() {
    if (isRecording.value) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStream.value = stream
      mediaRecorder.value = new MediaRecorder(stream)
      audioChunks.value = []
      mediaRecorder.value.ondataavailable = (event) => {
        audioChunks.value.push(event.data)
      }
      mediaRecorder.value.onstop = () => {
        recordedAudio.value = new Blob(audioChunks.value, { type: 'audio/mp4' })
      }
      mediaRecorder.value.start()
      isRecording.value = true
    } catch (err) {
      console.error('[startRecording] err:', err)
      alert('无法启用麦克风，请检查权限设置')
    }
  }

  function stopRecording() {
    if (!isRecording.value || !mediaRecorder.value) return
    mediaRecorder.value.stop()
    if (audioStream.value) {
      audioStream.value.getTracks().forEach((track) => track.stop())
      audioStream.value = null
    }
    isRecording.value = false
  }

  async function sendVoiceMessage() {
    if (!recordedAudio.value) {
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Audio = reader.result as string
      sendChat('voice', base64Audio)
    }
    reader.readAsDataURL(recordedAudio.value)
  }

  /* =========================
     图片发送相关
  ========================= */
  const imageFile = ref<File | null>(null)
  const imagePreviewUrl = ref<string | null>(null)
  function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
      imageFile.value = target.files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        imagePreviewUrl.value = e.target?.result as string
      }
      reader.readAsDataURL(target.files[0])
    }
  }
  async function sendImageMessage() {
    if (!imageFile.value) {
      alert('请选择一个图片文件')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Image = reader.result as string
      sendChat('image', base64Image)
    }
    reader.readAsDataURL(imageFile.value)
  }

  /* =========================
     视频发送相关
  ========================= */
  const videoFile = ref<File | null>(null)
  const videoPreviewUrl = ref<string | null>(null)
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024
  function handleVideoUpload(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
      const file = target.files[0]
      if (file.size > MAX_VIDEO_SIZE) {
        alert('视频文件过大，请选择一个小于50MB的视频')
        videoFile.value = null
        videoPreviewUrl.value = null
        return
      }
      videoFile.value = file
      const reader = new FileReader()
      reader.onload = (e) => {
        videoPreviewUrl.value = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }
  async function sendVideoMessage() {
    if (!videoFile.value) {
      alert('请选择一个视频文件')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Video = reader.result as string
      sendChat('video', base64Video)
    }
    reader.readAsDataURL(videoFile.value)
  }

  async function onLogout() {
    user.leave()

 

console.log('logout后 storage.keys():', await storage.keys());
    window.localStorage.removeItem('gun')
    storage.remove('currentUserPub')
    gun.get('users').put({ __command: 'remove', key: 'currentUserPub' });
    gun.get('users').put({ __command: 'remove', key: 'currentUserAlias' });
    gun.get('users').put({ __command: 'remove', key: 'currentUserPair' });
    gun.get('users').put({ __command: 'remove', key: 'encryptedKeyPair' });
    currentUserPub.value=null
    isLoggedIn.value = false
    currentUserPub.value = null
    currentUserAlias.value = null
    loginError.value = null
    currentUserPair = null
    buddyList.value = []
    receivedRequests.value = []
    chatPreviewList.value = []
    chatMessages.value = []
    aliasMap.value = {}
    signatureMap.value = {}
    userAvatars.value = {}
  
    // 清除所有监听
    for (const pub in chatListeners.value) {
      if (chatListeners.value[pub]) {
        chatListeners.value[pub]()
      }
    }
    chatListeners.value = {}
    
    // 移除特定登录相关的数据
    await storage.remove('currentUserPub')
    await storage.remove('currentUserAlias')
    await storage.remove('currentUserPair')
    await storage.remove('encryptedKeyPair')

   
    const keys = await storage.keys();
    console.log('清空后存储的所有键：', keys);
    router.replace({ path: '/' })
  
  }

  // 恢复登录状态函数（包括恢复 currentUserPub、currentUserAlias 和 currentUserPair）
  async function restoreLoginState() {
    const storedPub = await storage.get('currentUserPub')
    const storedAlias = await storage.get('currentUserAlias')
    const storedEncryptedKeyPair = await storage.get('encryptedKeyPair')
    if (storedPub && storedEncryptedKeyPair) {
      currentUserPub.value = storedPub
      currentUserAlias.value = storedAlias
      currentUserPair = JSON.parse(storedEncryptedKeyPair)
      isLoggedIn.value = true
      console.log('恢复登录状态成功:', storedPub, storedAlias)
      // 重新初始化所有实时监听器
      listenMyBuddyList(storedPub)
      listenMyAlias(storedPub)
      listenUserAlias(storedPub)
      listenUserData(storedPub)
      listenMyBlacklist(storedPub)
      listenMyRequests(storedPub)
      listenAllChats(storedPub)
      listenMyAvatar(storedPub)
      listenUserAvatar(storedPub)
      router.replace('/index')
    }
  }




  function UserCardMode() {
    showUserCard.value = !showUserCard.value
  }








  return {
    storage,
    lastReadTimestamps,
    UserCardMode,
    showUserCard,

    listenChat,
    listenUserAlias,
    listenUserAvatar,
    listenUserData,
    // 获取签名
    getFriendSignature,
    currentUserAlias1,
    // 修改签名
    newAliasInput1,
    updateAlias1,
    updateAliasMsg1,

    // notifyNewMessage,
    // 图片/视频模块
    videoFile,
    videoPreviewUrl,
    handleVideoUpload,
    sendVideoMessage,
    handleImageUpload,
    sendImageMessage,
    imageFile,
    imagePreviewUrl,
    // Modal
    isOpen,
    setOpen,
    // 注册相关
    KeyDown,
    newAlias,
    newPassphrase,
    generateMsg,
    encryptedKeyPair,
    generateKeyPair,

    // 登录相关
    passphrase,
    encryptedKeyInput,
    importKeyPair,
    isLoggedIn,
    currentUserPub,
    currentUserAlias,
    loginError,
    // 退出登录
    onLogout,
    // 黑名单
    blockPub,
    blacklist,
    addToBlacklist,
    removeFromBlacklist,
    isInMyBlacklist,
    // 好友与请求
    friendPub,
    buddyError,
    buddyList,
    receivedRequests,
    requestAddBuddy,
    acceptBuddyRequest,
    rejectBuddyRequest,
    listenMyRequests,
    // 聊天
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
    refreshChat,
    onDeleteChatClick,
    // 别名
    getAliasRealtime,
    newAliasInput,
    updateAlias,
    updateAliasMsg,
    // 头像
    avatarFile,
    avatarUrl,
    handleAvatarUpload,
    updateAvatar,
    updateAvatarMsg,
    userAvatars,
    // 通知
    showNotification,
    // 工具函数
    formatTimestamp,
    // Refs
    chatListRef,
    copyPub,
    removeBuddy,
    LoginData,
    // 语音录制
    isRecording,
    startRecording,
    stopRecording,
    sendVoiceMessage,
    recordedAudio,
    // 恢复登录状态
    restoreLoginState,
    // 震动
    triggerLightHaptic,
    gun,
    friendRemarks,
    updateFriendRemark,
    getFriendRemark,
    generateChatId,
    loadMoreChatHistory,
    publishChatMessage

  }
}

// 单例模式导出
const chatFlowStore = useChatFlow()
export default chatFlowStore

