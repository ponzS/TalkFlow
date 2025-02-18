


interface Post {
    pub: string  // 发布者的公钥
    content: string  // 动态内容
    timestamp: number  // 发布时间
    likes: number  // 点赞数
    likedBy: Set<string>  // 已点赞的用户集合
  }

  
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
    chatId?: string
  }
  
  interface ChatPreview {
    pub: string
    lastMsg: string
    lastTime: string
    hidden: boolean
    hasNew: boolean
  }

const LoginData = ref(0)
const isOpen = ref(false)
const setOpen = (open: boolean) => (isOpen.value = open)


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