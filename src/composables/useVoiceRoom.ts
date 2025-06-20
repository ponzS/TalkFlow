import { ref, computed, onUnmounted, reactive } from 'vue'
import Gun from 'gun'
import 'gun/sea'
import { useToast } from '@/composables/useToast'
import { getTalkFlowCore } from '@/composables/TalkFlowCore'

以下是一段概念性的代码，非真正的实现，同时也没有真正在项目中使用，用于给愿意帮助媒体流模块开发的开发者一些思路，在稳定版本模块完成后这个文件会被覆盖。

const { showToast } = useToast()

// 房间密钥对接口
export interface RoomKeyPair {
  pub: string
  priv: string
  epub: string
  epriv: string
}

// 房间成员接口
export interface RoomMember {
  userPub: string
  userAlias: string
  joinedAt: number
  isHost: boolean
  audioEnabled: boolean
  speaking: boolean
}

// 信令消息类型
export type SignalingMessageType = 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'audio-toggle'

// 信令消息接口
export interface SignalingMessage {
  type: SignalingMessageType
  from: string
  to?: string
  data: any
  timestamp: number
  signature?: string
}

// WebRTC配置 - 参考Meething项目增强
const ICE_SERVERS = [
  // STUN服务器 - 用于NAT穿透
  { urls: 'stun:stun.l.google.com:19302' },
  
  // 免费TURN服务器 - 用于对称NAT环境
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject', 
    credential: 'openrelayproject'
  }
]

export function useVoiceRoom() {
  // 获取共享的TalkFlow核心状态
  const chatFlow = getTalkFlowCore()
  const { gun, currentUserPub, currentUserAlias, userAvatars } = chatFlow
  
  // 状态管理
  const isInRoom = ref(false)
  const isHost = ref(false)
  const isConnecting = ref(false)
  const audioEnabled = ref(false) // 初始状态为false，音频初始化成功后才设为true
  const isSpeaking = ref(false)
  const currentRoomId = ref<string | null>(null)
  
  // 安全的用户信息
  const safeUserPub = computed(() => currentUserPub.value || 'anonymous')
  const safeUserAlias = computed(() => currentUserAlias.value || 'Anonymous')
  
  // 房间数据
  const roomMembers = ref<Map<string, RoomMember>>(new Map())
  const roomKeyPair = ref<RoomKeyPair | null>(null)
  
  // WebRTC连接管理
  const peerConnections = ref<Map<string, RTCPeerConnection>>(new Map())
  const localStream = ref<MediaStream | null>(null)
  const remoteStreams = ref<Map<string, MediaStream>>(new Map())
  
  // 音频分析
  const audioContext = ref<AudioContext | null>(null)
  const analyser = ref<AnalyserNode | null>(null)
  const microphone = ref<MediaStreamAudioSourceNode | null>(null)
  
  // 计算属性
  const memberCount = computed(() => roomMembers.value.size)
  const connectedMembers = computed(() => Array.from(roomMembers.value.values()))

  /**
   * 生成房间密钥对
   */
  async function generateRoomKeyPair(): Promise<RoomKeyPair> {
    try {
      const pair = await Gun.SEA.pair()
      if (!pair) {
        throw new Error('Failed to generate key pair')
      }
      
      const roomPair: RoomKeyPair = {
        pub: pair.pub,
        priv: pair.priv,
        epub: pair.epub,
        epriv: pair.epriv
      }
      
      showToast('房间密钥对生成成功', 'success')
      return roomPair
    } catch (error) {
      console.error('生成房间密钥对失败:', error)
      showToast('生成房间密钥对失败', 'error')
      throw error
    }
  }

  /**
   * 验证密钥对
   */
  async function validateKeyPair(keyPair: RoomKeyPair): Promise<boolean> {
    try {
      // 验证密钥对完整性
      if (!keyPair.pub || !keyPair.priv || !keyPair.epub || !keyPair.epriv) {
        return false
      }
      
      // 使用Gun.SEA验证密钥对的有效性
      const testMessage = 'validation_test'
      const encrypted = await Gun.SEA.encrypt(testMessage, keyPair)
      const decrypted = await Gun.SEA.decrypt(encrypted, keyPair)
      
      return decrypted === testMessage
    } catch (error) {
      console.error('密钥对验证失败:', error)
      return false
    }
  }

  /**
   * 创建房间
   */
  async function createRoom(keyPair: RoomKeyPair): Promise<string> {
    try {
      isConnecting.value = true
      
      // 使用传入的密钥对
      roomKeyPair.value = keyPair
      
      // 设置房间信息
      currentRoomId.value = keyPair.pub
      isHost.value = true
      
      // 获取音频权限
      await initializeAudio()
      
      // 设置房间监听
      await setupRoomListeners(keyPair.pub)
      
      // 先从Gun加载可能已存在的房间成员
      await loadRoomMembersFromGun(keyPair.pub)
      
      // 添加自己到房间成员
      const hostMember: RoomMember = {
        userPub: safeUserPub.value,
        userAlias: safeUserAlias.value,
        joinedAt: Date.now(),
        isHost: true,
        audioEnabled: audioEnabled.value, // 音频初始化后应该为true
        speaking: false
      }
      
      roomMembers.value.set(safeUserPub.value, hostMember)
      console.log('房主创建房间，添加自己到成员列表:', hostMember)
      
      // 将自己的成员信息同步到Gun数据库
      await syncMemberToGun(keyPair.pub, hostMember)
      
      // 发布房间信息到网络（只暴露公钥）
      await publishRoomInfo(keyPair.pub, safeUserAlias.value)
      
      isInRoom.value = true
      isConnecting.value = false
      
      console.log('房间创建完成，最终状态检查:')
      console.log('- 音频状态:', audioEnabled.value)
      console.log('- 本地音频流:', !!localStream.value)
      console.log('- 房间成员数:', roomMembers.value.size)
      
      showToast('房间创建成功', 'success')
      return keyPair.pub
    } catch (error) {
      console.error('创建房间失败:', error)
      isConnecting.value = false
      showToast('创建房间失败', 'error')
      throw error
    }
  }

  /**
   * 加入房间
   */
  async function joinRoom(keyPair: RoomKeyPair): Promise<void> {
    try {
      isConnecting.value = true
      
      // 验证密钥对
      const isValid = await validateKeyPair(keyPair)
      if (!isValid) {
        throw new Error('Invalid key pair')
      }
      
      roomKeyPair.value = keyPair
      currentRoomId.value = keyPair.pub
      isHost.value = false
      
      // 获取音频权限
      await initializeAudio()
      
      // 设置房间监听
      await setupRoomListeners(keyPair.pub)
      
      // 先从Gun加载现有房间成员
      await loadRoomMembersFromGun(keyPair.pub)
      
      // 添加自己到房间成员列表
      const selfMember: RoomMember = {
        userPub: safeUserPub.value,
        userAlias: safeUserAlias.value,
        joinedAt: Date.now(),
        isHost: false,
        audioEnabled: audioEnabled.value, // 音频初始化后应该为true
        speaking: false
      }
      roomMembers.value.set(safeUserPub.value, selfMember)
      console.log('新用户加入房间，添加自己到成员列表:', selfMember)
      
      // 将自己的成员信息同步到Gun数据库
      await syncMemberToGun(keyPair.pub, selfMember)
      
      // 发送加入房间信令
      await sendSignalingMessage({
        type: 'user-joined',
        from: safeUserPub.value,
        data: {
          userAlias: safeUserAlias.value,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      })
      
      // 等待一小段时间让其他用户收到加入信令
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 与现有的所有成员建立WebRTC连接
      console.log('开始与现有成员建立连接，当前成员数:', roomMembers.value.size)
      for (const [memberPub, member] of roomMembers.value) {
        if (memberPub !== safeUserPub.value) {
          console.log('与现有成员建立连接:', member.userAlias, memberPub)
          // 使用用户ID比较来避免重复连接
          const shouldInitiate = safeUserPub.value < memberPub
          if (shouldInitiate) {
            await createPeerConnection(memberPub)
          }
        }
      }
      
      isInRoom.value = true
      isConnecting.value = false
      
      console.log('加入房间完成，最终状态检查:')
      console.log('- 音频状态:', audioEnabled.value)
      console.log('- 本地音频流:', !!localStream.value)
      console.log('- 房间成员数:', roomMembers.value.size)
      
      showToast('成功加入房间', 'success')
    } catch (error) {
      console.error('加入房间失败:', error)
      isConnecting.value = false
      showToast('加入房间失败', 'error')
      throw error
    }
  }

  /**
   * 离开房间
   */
  async function leaveRoom(): Promise<void> {
    try {
      if (safeUserPub.value && currentRoomId.value) {
        // 从Gun数据库删除自己的成员信息
        await removeMemberFromGun(currentRoomId.value, safeUserPub.value)
        
        // 发送离开房间信令
        await sendSignalingMessage({
          type: 'user-left',
          from: safeUserPub.value,
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        })
      }
      
      // 清理WebRTC连接
      cleanupConnections()
      
      // 清理音频
      cleanupAudio()
      
      // 重置状态
      resetState()
      
      showToast('已离开房间', 'success')
    } catch (error) {
      console.error('离开房间失败:', error)
      showToast('离开房间失败', 'error')
    }
  }

  /**
   * 初始化音频
   */
  async function initializeAudio(): Promise<void> {
    try {
      // 获取用户媒体流
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        },
        video: false
      })
      
      localStream.value = stream
      
      // 设置音频分析
      setupAudioAnalysis(stream)
      
      // 确保音频轨道是启用的，并设置状态
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = true
        audioEnabled.value = true
        console.log('音频轨道已启用:', audioTrack.enabled)
        
        // 更新本地成员的音频状态
        if (safeUserPub.value) {
          const member = roomMembers.value.get(safeUserPub.value)
          if (member) {
            member.audioEnabled = audioEnabled.value
            roomMembers.value.set(safeUserPub.value, member)
            console.log('更新本地成员音频状态:', member.audioEnabled)
            
            // 同步到Gun数据库
            if (currentRoomId.value) {
              syncMemberToGun(currentRoomId.value, member)
            }
          }
        }
      }
      
      console.log('音频初始化成功，麦克风状态:', audioEnabled.value)
    } catch (error) {
      console.error('音频初始化失败:', error)
      showToast('无法访问麦克风', 'error')
      throw error
    }
  }

  /**
   * 设置音频分析（语音检测）
   */
  function setupAudioAnalysis(stream: MediaStream): void {
    try {
      audioContext.value = new AudioContext()
      analyser.value = audioContext.value.createAnalyser()
      microphone.value = audioContext.value.createMediaStreamSource(stream)
      
      analyser.value.fftSize = 256
      microphone.value.connect(analyser.value)
      
      // 开始语音检测
      startSpeakingDetection()
    } catch (error) {
      console.error('音频分析设置失败:', error)
    }
  }

  /**
   * 语音检测
   */
  function startSpeakingDetection(): void {
    if (!analyser.value) return
    
    const bufferLength = analyser.value.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    function detect() {
      if (!analyser.value) return
      
      analyser.value.getByteFrequencyData(dataArray)
      
      // 计算平均音量
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
      const threshold = 100 // 语音阈值
      
      const wasSpeaking = isSpeaking.value
      isSpeaking.value = average > threshold
      
      // 如果说话状态改变，通知其他用户
      if (wasSpeaking !== isSpeaking.value && safeUserPub.value) {
        const member = roomMembers.value.get(safeUserPub.value)
        if (member) {
          member.speaking = isSpeaking.value
          roomMembers.value.set(safeUserPub.value, member)
          
          // 同步到Gun数据库
          if (currentRoomId.value) {
            syncMemberToGun(currentRoomId.value, member) // 不等待，避免阻塞语音检测
          }
        }
      }
      
      requestAnimationFrame(detect)
    }
    
    detect()
  }

  /**
   * 切换音频开关
   */
  async function toggleAudio(): Promise<void> {
    if (!localStream.value) return
    
    const audioTrack = localStream.value.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      audioEnabled.value = audioTrack.enabled
      
      // 更新成员状态
      if (safeUserPub.value) {
        const member = roomMembers.value.get(safeUserPub.value)
        if (member) {
          member.audioEnabled = audioEnabled.value
          roomMembers.value.set(safeUserPub.value, member)
          
          // 同步到Gun数据库
          if (currentRoomId.value) {
            await syncMemberToGun(currentRoomId.value, member)
          }
        }
        
        // 通知其他用户
        await sendSignalingMessage({
          type: 'audio-toggle',
          from: safeUserPub.value,
          data: { audioEnabled: audioEnabled.value },
          timestamp: Date.now()
        })
      }
    }
  }

  /**
   * 将成员信息同步到Gun数据库
   */
  async function syncMemberToGun(roomId: string, member: RoomMember): Promise<void> {
    try {
      const memberData = {
        alias: member.userAlias,
        joinedAt: member.joinedAt,
        isHost: member.isHost,
        audioEnabled: member.audioEnabled,
        speaking: member.speaking,
        lastUpdate: Date.now()
      }
      
      gun.get('voice_room_members').get(roomId).get(member.userPub).put(memberData)
      console.log('成员信息已同步到Gun:', member.userPub, memberData)
    } catch (error) {
      console.error('同步成员信息到Gun失败:', error)
    }
  }

  /**
   * 从Gun数据库删除成员
   */
  async function removeMemberFromGun(roomId: string, memberPub: string): Promise<void> {
    try {
      gun.get('voice_room_members').get(roomId).get(memberPub).put(null)
      console.log('成员已从Gun删除:', memberPub)
    } catch (error) {
      console.error('从Gun删除成员失败:', error)
    }
  }

  /**
   * 从Gun数据库加载房间成员
   */
  async function loadRoomMembersFromGun(roomId: string): Promise<void> {
    try {
      gun.get('voice_room_members').get(roomId).once((data: any) => {
        if (data) {
          Object.keys(data).forEach(memberPub => {
            if (memberPub !== '_' && data[memberPub] && memberPub !== safeUserPub.value) {
              const memberData = data[memberPub]
              const member: RoomMember = {
                userPub: memberPub,
                userAlias: memberData.alias || 'Unknown',
                joinedAt: memberData.joinedAt || Date.now(),
                isHost: memberData.isHost || false,
                audioEnabled: memberData.audioEnabled !== undefined ? memberData.audioEnabled : true,
                speaking: memberData.speaking || false
              }
              roomMembers.value.set(memberPub, member)
              console.log('从Gun加载房间成员:', member)
            }
          })
        }
      })
    } catch (error) {
      console.error('从Gun加载房间成员失败:', error)
    }
  }

  /**
   * 发布房间信息
   */
  async function publishRoomInfo(roomId: string, hostAlias: string): Promise<void> {
    try {
      const roomInfo = {
        roomId,
        hostAlias,
        createdAt: Date.now(),
        memberCount: 1
      }
      
      // 只发布公钥信息，不暴露私钥
      gun.get('voice_rooms').get(roomId).put(roomInfo)
    } catch (error) {
      console.error('发布房间信息失败:', error)
    }
  }

  /**
   * 设置房间监听器
   */
  async function setupRoomListeners(roomId: string): Promise<void> {
    try {
      // 监听信令消息
      gun.get('voice_room_signaling').get(roomId).map().on(async (data: any, key: string) => {
        if (data && data.type && data.from !== safeUserPub.value) {
          await handleSignalingMessage(data)
        }
      })
      
      // 监听房间成员变化
      gun.get('voice_room_members').get(roomId).map().on((memberData: any, memberPub: string) => {
        if (memberData && memberPub && memberPub !== safeUserPub.value) {
          const wasInRoom = roomMembers.value.has(memberPub)
          const member: RoomMember = {
            userPub: memberPub,
            userAlias: memberData.alias || 'Unknown',
            joinedAt: memberData.joinedAt || Date.now(),
            isHost: memberData.isHost || false,
            audioEnabled: memberData.audioEnabled !== undefined ? memberData.audioEnabled : true,
            speaking: memberData.speaking || false
          }
          roomMembers.value.set(memberPub, member)
          console.log('从Gun同步房间成员:', member)
          
          // 如果是新加入的成员，显示提示
          if (!wasInRoom && isInRoom.value) {
            showToast(`${member.userAlias} 加入了房间`, 'success')
          }
        }
      })
      
      // 监听成员离开
      gun.get('voice_room_members').get(roomId).map().on((memberData: any, memberPub: string) => {
        if (memberData === null && memberPub !== safeUserPub.value) {
          const member = roomMembers.value.get(memberPub)
          roomMembers.value.delete(memberPub)
          console.log('从Gun同步成员离开:', memberPub)
          
          // 显示离开提示
          if (member && isInRoom.value) {
            showToast(`${member.userAlias} 离开了房间`, 'warning')
          }
        }
      })
      
      console.log('房间监听器设置完成')
    } catch (error) {
      console.error('设置房间监听器失败:', error)
    }
  }

  /**
   * 发送信令消息
   */
  async function sendSignalingMessage(message: SignalingMessage): Promise<void> {
    try {
      if (!currentRoomId.value || !roomKeyPair.value) return
      
      // 创建用于签名的消息内容（排除signature字段）
      const messageContent = {
        type: message.type,
        from: message.from,
        to: message.to,
        data: message.data,
        timestamp: message.timestamp
      }
      
      // 使用房间密钥签名消息内容
      message.signature = await Gun.SEA.sign(JSON.stringify(messageContent), roomKeyPair.value)
      
      // 发送到Gun网络
      const messageId = `${message.from}_${message.timestamp}_${Math.random()}`
      gun.get('voice_room_signaling').get(currentRoomId.value).get(messageId).put(message)
    } catch (error) {
      console.error('发送信令消息失败:', error)
    }
  }

  /**
   * 处理信令消息
   */
  async function handleSignalingMessage(message: SignalingMessage): Promise<void> {
    try {
      if (!roomKeyPair.value) return
      
      // 创建用于验证的消息内容（排除signature字段）
      const messageContent = {
        type: message.type,
        from: message.from,
        to: message.to,
        data: message.data,
        timestamp: message.timestamp
      }
      
      // 验证消息签名
      const verifiedPub = await Gun.SEA.verify(message.signature, JSON.stringify(messageContent))
      if (verifiedPub !== roomKeyPair.value.pub) {
        console.warn('收到无效签名的信令消息')
        return
      }
      
      switch (message.type) {
        case 'user-joined':
          await handleUserJoined(message)
          break
        case 'user-left':
          await handleUserLeft(message)
          break
        case 'offer':
          await handleOffer(message)
          break
        case 'answer':
          await handleAnswer(message)
          break
        case 'ice-candidate':
          await handleIceCandidate(message)
          break
        case 'audio-toggle':
          await handleAudioToggle(message)
          break
      }
    } catch (error) {
      console.error('处理信令消息失败:', error)
    }
  }

  /**
   * 处理用户加入
   */
  async function handleUserJoined(message: SignalingMessage): Promise<void> {
    const { userAlias } = message.data
    
    console.log('收到用户加入信令:', message.from, userAlias)
    
    // 确保本地音频流已准备好
    if (!localStream.value) {
      console.log('本地音频流未准备好，重新初始化')
      await initializeAudio()
    }
    
    // 所有在房间的用户都应该与新用户建立连接
    // 为了避免重复连接，使用用户ID比较来决定谁主动发起连接
    const shouldInitiate = safeUserPub.value < message.from
    
    if (shouldInitiate) {
      console.log('我将主动建立与新用户的连接:', message.from)
      await createPeerConnection(message.from)
    } else {
      console.log('等待新用户主动建立连接:', message.from)
    }
    
    showToast(`${userAlias} 加入了房间`, 'success')
  }

  /**
   * 处理用户离开
   */
  async function handleUserLeft(message: SignalingMessage): Promise<void> {
    console.log('收到用户离开信令:', message.from)
    
    // 清理WebRTC连接
    const connection = peerConnections.value.get(message.from)
    if (connection) {
      connection.close()
      peerConnections.value.delete(message.from)
    }
    
    // 清理远程流
    remoteStreams.value.delete(message.from)
    
    // 清理对应的音频元素
    const audioElements = document.querySelectorAll(`audio[data-user="${message.from}"]`)
    audioElements.forEach(el => el.remove())
    console.log('清理了用户的音频元素:', message.from)
    
    // 注意：成员移除已通过Gun数据库同步处理
  }

  /**
   * 创建WebRTC连接
   */
  async function createPeerConnection(targetUserId: string): Promise<void> {
    try {
      console.log('创建WebRTC连接到:', targetUserId)
      
      // 如果已经存在连接，先关闭旧连接
      const existingConnection = peerConnections.value.get(targetUserId)
      if (existingConnection) {
        existingConnection.close()
        peerConnections.value.delete(targetUserId)
      }
      
      const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      
      // 连接状态监控 - 参考Meething的诊断方式
      connection.onconnectionstatechange = () => {
        console.log(`WebRTC连接状态 ${targetUserId}:`, connection.connectionState)
        if (connection.connectionState === 'connected') {
          showToast(`与 ${targetUserId.slice(0,8)} 音频连接已建立`, 'success')
        } else if (connection.connectionState === 'failed') {
          console.error('WebRTC连接失败，详细信息:', {
            connectionState: connection.connectionState,
            iceConnectionState: connection.iceConnectionState,
            iceGatheringState: connection.iceGatheringState
          })
          showToast(`与 ${targetUserId.slice(0,8)} 连接失败`, 'error')
          // 可以在这里实现重连逻辑
        }
      }
      
      // ICE连接状态监控
      connection.oniceconnectionstatechange = () => {
        console.log(`ICE连接状态 ${targetUserId}:`, connection.iceConnectionState)
        if (connection.iceConnectionState === 'disconnected') {
          console.warn('ICE连接断开，尝试重连...')
        }
      }
      
      // ICE候选收集状态监控
      connection.onicegatheringstatechange = () => {
        console.log(`ICE收集状态 ${targetUserId}:`, connection.iceGatheringState)
      }
      
      // 添加本地音频流
      if (localStream.value) {
        console.log('添加本地音频流到WebRTC连接')
        localStream.value.getTracks().forEach(track => {
          console.log('添加音频轨道:', track.kind, track.enabled)
          connection.addTrack(track, localStream.value!)
        })
      } else {
        console.warn('本地音频流未准备好')
      }
      
      // 处理远程流
      connection.ontrack = (event) => {
        console.log('收到远程音频流:', targetUserId, event.streams)
        const [remoteStream] = event.streams
        remoteStreams.value.set(targetUserId, remoteStream)
        
        // 创建音频元素播放远程流 - 参考Meething的媒体处理
        setupRemoteAudio(targetUserId, remoteStream)
      }
      
      // 处理ICE候选
      connection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('发送ICE候选到:', targetUserId)
          await sendSignalingMessage({
            type: 'ice-candidate',
            from: safeUserPub.value,
            to: targetUserId,
            data: event.candidate,
            timestamp: Date.now()
          })
        }
      }
      
      // 保存连接
      peerConnections.value.set(targetUserId, connection)
      
      // 创建offer
      console.log('创建offer')
      const offer = await connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })
      await connection.setLocalDescription(offer)
      
      // 发送offer
      console.log('发送offer到:', targetUserId)
      await sendSignalingMessage({
        type: 'offer',
        from: safeUserPub.value,
        to: targetUserId,
        data: offer,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('创建WebRTC连接失败:', error)
      showToast('建立音频连接失败', 'error')
    }
  }

  /**
   * 处理Offer
   */
  async function handleOffer(message: SignalingMessage): Promise<void> {
    try {
      console.log('收到offer来自:', message.from)
      
      // 确保本地音频流已准备好
      if (!localStream.value) {
        console.log('本地音频流未准备好，重新初始化')
        await initializeAudio()
      }
      
      // 如果已经存在连接，先关闭旧连接
      const existingConnection = peerConnections.value.get(message.from)
      if (existingConnection) {
        existingConnection.close()
        peerConnections.value.delete(message.from)
      }
      
      const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      
      // 连接状态监控 - 参考Meething的诊断方式
      connection.onconnectionstatechange = () => {
        console.log(`WebRTC连接状态 ${message.from}:`, connection.connectionState)
        if (connection.connectionState === 'connected') {
          showToast(`与 ${message.from.slice(0,8)} 音频连接已建立`, 'success')
        } else if (connection.connectionState === 'failed') {
          console.error('WebRTC连接失败，详细信息:', {
            connectionState: connection.connectionState,
            iceConnectionState: connection.iceConnectionState,
            iceGatheringState: connection.iceGatheringState
          })
          showToast(`与 ${message.from.slice(0,8)} 连接失败`, 'error')
        }
      }
      
      // ICE连接状态监控
      connection.oniceconnectionstatechange = () => {
        console.log(`ICE连接状态 ${message.from}:`, connection.iceConnectionState)
      }
      
      // ICE候选收集状态监控
      connection.onicegatheringstatechange = () => {
        console.log(`ICE收集状态 ${message.from}:`, connection.iceGatheringState)
      }
      
      // 添加本地音频流
      if (localStream.value) {
        console.log('添加本地音频流到WebRTC连接')
        localStream.value.getTracks().forEach(track => {
          console.log('添加音频轨道:', track.kind, track.enabled)
          connection.addTrack(track, localStream.value!)
        })
      } else {
        console.warn('本地音频流未准备好')
      }
      
      // 处理远程流
      connection.ontrack = (event) => {
        console.log('收到远程音频流:', message.from, event.streams)
        const [remoteStream] = event.streams
        remoteStreams.value.set(message.from, remoteStream)
        
        // 创建音频元素播放远程流 - 参考Meething的媒体处理
        setupRemoteAudio(message.from, remoteStream)
      }
      
      // 处理ICE候选
      connection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('发送ICE候选到:', message.from)
          await sendSignalingMessage({
            type: 'ice-candidate',
            from: safeUserPub.value,
            to: message.from,
            data: event.candidate,
            timestamp: Date.now()
          })
        }
      }
      
      // 保存连接
      peerConnections.value.set(message.from, connection)
      
      // 设置远程描述并创建答案
      console.log('设置远程描述并创建answer')
      await connection.setRemoteDescription(message.data)
      const answer = await connection.createAnswer()
      await connection.setLocalDescription(answer)
      
      // 发送answer
      console.log('发送answer到:', message.from)
      await sendSignalingMessage({
        type: 'answer',
        from: safeUserPub.value,
        to: message.from,
        data: answer,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('处理Offer失败:', error)
      showToast('处理音频连接失败', 'error')
    }
  }

  /**
   * 处理Answer
   */
  async function handleAnswer(message: SignalingMessage): Promise<void> {
    try {
      const connection = peerConnections.value.get(message.from)
      if (connection) {
        await connection.setRemoteDescription(message.data)
      }
    } catch (error) {
      console.error('处理Answer失败:', error)
    }
  }

  /**
   * 处理ICE候选
   */
  async function handleIceCandidate(message: SignalingMessage): Promise<void> {
    try {
      const connection = peerConnections.value.get(message.from)
      if (connection) {
        await connection.addIceCandidate(message.data)
      }
    } catch (error) {
      console.error('处理ICE候选失败:', error)
    }
  }

  /**
   * 处理音频切换
   */
  async function handleAudioToggle(message: SignalingMessage): Promise<void> {
    const member = roomMembers.value.get(message.from)
    if (member) {
      member.audioEnabled = message.data.audioEnabled
      roomMembers.value.set(message.from, member)
    }
  }



  /**
   * 设置远程音频播放 - 参考Meething项目
   */
  function setupRemoteAudio(userId: string, stream: MediaStream): void {
    try {
      // 清理旧的音频元素
      const oldElements = document.querySelectorAll(`audio[data-user="${userId}"]`)
      oldElements.forEach(el => el.remove())
      
      // 创建新的音频元素
      const audioElement = document.createElement('audio')
      audioElement.srcObject = stream
      audioElement.autoplay = true
      audioElement.controls = false
      audioElement.style.display = 'none'
      audioElement.setAttribute('data-user', userId)
      
      // 设置音频属性
      audioElement.volume = 1.0
      audioElement.muted = false
      
      // 添加到页面
      document.body.appendChild(audioElement)
      
      // 确保音频开始播放
      audioElement.play().then(() => {
        console.log('远程音频流已设置并开始播放:', userId)
        showToast(`开始接收 ${userId.slice(0,8)} 的音频`, 'success')
      }).catch((error) => {
        console.error('音频播放失败:', error)
        // 尝试用户交互后播放
        const playOnInteraction = () => {
          audioElement.play()
          document.removeEventListener('click', playOnInteraction)
        }
        document.addEventListener('click', playOnInteraction)
      })
      
    } catch (error) {
      console.error('设置远程音频失败:', error)
    }
  }

  /**
   * 清理WebRTC连接
   */
  function cleanupConnections(): void {
    peerConnections.value.forEach(connection => {
      connection.close()
    })
    peerConnections.value.clear()
    remoteStreams.value.clear()
    
    // 清理所有远程音频元素
    const audioElements = document.querySelectorAll('audio[data-user]')
    audioElements.forEach(el => el.remove())
    console.log('清理了', audioElements.length, '个音频元素')
  }

  /**
   * 清理音频
   */
  function cleanupAudio(): void {
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => track.stop())
      localStream.value = null
    }
    
    if (audioContext.value) {
      audioContext.value.close()
      audioContext.value = null
    }
    
    analyser.value = null
    microphone.value = null
  }

  /**
   * 重置状态
   */
  function resetState(): void {
    isInRoom.value = false
    isHost.value = false
    isConnecting.value = false
    audioEnabled.value = false // 重置时设为false，待音频初始化成功后才设为true
    isSpeaking.value = false
    currentRoomId.value = null
    roomMembers.value.clear()
    roomKeyPair.value = null
    console.log('状态已重置，音频状态:', audioEnabled.value)
  }

  /**
   * 获取房间导出数据
   */
  function exportRoomData(): string | null {
    if (!roomKeyPair.value) return null
    
    return JSON.stringify({
      ...roomKeyPair.value,
      roomId: currentRoomId.value,
      createdAt: Date.now()
    })
  }

  /**
   * WebRTC诊断工具 - 参考Meething的诊断方法
   */
  function getConnectionDiagnostics(): any {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      roomState: {
        isInRoom: isInRoom.value,
        isHost: isHost.value,
        currentRoomId: currentRoomId.value,
        memberCount: memberCount.value
      },
      audioState: {
        audioEnabled: audioEnabled.value,
        isSpeaking: isSpeaking.value,
        hasLocalStream: !!localStream.value,
        localStreamTracks: localStream.value?.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        })) || []
      },
      webrtcConnections: Array.from(peerConnections.value.entries()).map(([userId, connection]) => ({
        userId: userId.slice(0, 8),
        connectionState: connection.connectionState,
        iceConnectionState: connection.iceConnectionState,
        iceGatheringState: connection.iceGatheringState,
        signalingState: connection.signalingState
      })),
      remoteStreams: Array.from(remoteStreams.value.entries()).map(([userId, stream]) => ({
        userId: userId.slice(0, 8),
        trackCount: stream.getTracks().length,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      })),
      mediaElements: Array.from(document.querySelectorAll('audio[data-user]')).map((el: any) => ({
        userId: el.getAttribute('data-user')?.slice(0, 8),
        paused: el.paused,
        volume: el.volume,
        muted: el.muted
      }))
    }
    
    console.log('WebRTC诊断信息:', diagnostics)
    return diagnostics
  }

  /**
   * 组件卸载时清理
   */
  onUnmounted(() => {
    if (isInRoom.value) {
      leaveRoom()
    }
  })

  return {
    // 状态
    isInRoom,
    isHost,
    isConnecting,
    audioEnabled,
    isSpeaking,
    currentRoomId,
    currentUserPub: safeUserPub,
    currentUserAlias: safeUserAlias,
    memberCount,
    connectedMembers,
    remoteStreams,
    
    // 方法
    generateRoomKeyPair,
    validateKeyPair,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleAudio,
    exportRoomData,
    getConnectionDiagnostics
  }
} 
