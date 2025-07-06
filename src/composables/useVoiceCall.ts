import { ref, Ref, onUnmounted } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { Device } from '@capacitor/device';

interface User {
  id: string;
  joinedAt: number;
}

interface RoomStatus {
  state: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';
  error?: string;
}

interface KeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
}

interface EncryptedData {
  data: string;
  id: string;
}

export function useVoiceRoom() {
  const chatFlow = getTalkFlowCore();
  const { gun, showToast, triggerLightHaptic } = chatFlow;

  const tempUserId = uuidv4();
  const isInRoom: Ref<boolean> = ref(false);
  const roomId: Ref<string> = ref('');
  const roomStatus: Ref<RoomStatus> = ref({ state: 'idle' });
  const users: Ref<User[]> = ref([]);
  const tempKeyPair: Ref<KeyPair | null> = ref(null);
  let peerConnections: Record<string, RTCPeerConnection> = {};
  let mediaStream: MediaStream | null = null;

  // 生成临时密钥对
  const generateKeyPair = async (): Promise<{ keyPair: string } | null> => {
    try {
      const pair = await Gun.SEA.pair();
      tempKeyPair.value = pair;
      roomId.value = pair.pub;
      const pairStr = JSON.stringify(pair, null, 2);
      await triggerLightHaptic();
      return { keyPair: pairStr };
    } catch (err) {
      console.error('生成密钥对失败:', err);
      showToast('生成密钥对失败', 'danger');
      return null;
    }
  };

  // 检查并请求麦克风权限
  const checkMicPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // 立即关闭临时流
      console.log('麦克风权限已授予');
      return true;
    } catch (err) {
      console.error('获取麦克风权限失败:', err);
      showToast('用户拒绝麦克风权限', 'danger');
      return false;
    }
  };

  // 开始获取音频流
  const startAudioStream = async () => {
    try {
      const hasPermission = await checkMicPermission();
      if (!hasPermission) throw new Error('无麦克风权限');

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // 确保一致的采样率
        },
      });

      // 确保 AudioContext 启动（适配 iOS）
      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      await audioContext.close(); // 仅用于启动，不保留

      console.log('音频流已启动');
    } catch (err) {
      console.error('获取音频流失败:', err);
      showToast('获取音频流失败', 'danger');
      mediaStream = null;
    }
  };

  // 停止音频流
  const stopAudioStream = async () => {
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
      }
      console.log('音频流已停止');
    } catch (err) {
      console.error('停止音频流失败:', err);
      showToast('停止音频流失败', 'danger');
    }
  };

  // 加入房间
  const joinRoom = async (keyPairStr: string): Promise<boolean> => {
    if (!keyPairStr) {
      showToast('请粘贴密钥对', 'danger');
      return false;
    }
    try {
      const pair: KeyPair = JSON.parse(keyPairStr);
      if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
        showToast('密钥对无效', 'danger');
        return false;
      }
      tempKeyPair.value = pair;
      roomId.value = pair.pub;
      isInRoom.value = true;
      roomStatus.value = { state: 'connecting' };
      await initializeRoom();
      await triggerLightHaptic();
      showToast('成功加入房间', 'success');
      return true;
    } catch (err) {
      console.error('加入房间失败:', err);
      showToast('加入房间失败：密钥对格式错误', 'danger');
      return false;
    }
  };

  // 初始化房间
  const initializeRoom = async () => {
    try {
      await startAudioStream();
      if (!mediaStream) throw new Error('无法获取音频流');

      gun.get(`voiceRooms/${roomId.value}/users`).get(tempUserId).put({ joinedAt: Date.now() });

      gun.get(`voiceRooms/${roomId.value}/users`).map().on((data: { joinedAt: number }, userId: string) => {
        if (data) {
          users.value = [...users.value.filter(u => u.id !== userId), { id: userId, joinedAt: data.joinedAt }];
          if (userId !== tempUserId) {
            initiateCall(userId);
          }
        } else {
          users.value = users.value.filter(u => u.id !== userId);
          if (peerConnections[userId]) {
            peerConnections[userId].close();
            delete peerConnections[userId];
          }
        }
      });

      const deviceInfo = await Device.getLanguageCode();
      const systemLanguage = deviceInfo.value || 'en-US';
      console.log('系统语言:', systemLanguage);
    } catch (err) {
      console.error('初始化房间失败:', err);
      roomStatus.value = { state: 'failed', error: '初始化失败' };
      showToast('初始化房间失败', 'danger');
    }
  };

  // 发起通话
  const initiateCall = async (targetUserId: string) => {
    if (peerConnections[targetUserId] || !tempKeyPair.value || !mediaStream) return;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnections[targetUserId] = pc;

    mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream!));

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.play().catch(err => {
        console.error('播放远程音频失败:', err);
        showToast('播放远程音频失败', 'danger');
      });
      roomStatus.value = { state: 'connected' };
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const encryptedCandidate = await Gun.SEA.encrypt(
          JSON.stringify(event.candidate),
          tempKeyPair.value!.epub
        );
        const candidateData: EncryptedData = {
          data: encryptedCandidate,
          id: uuidv4(),
        };
        gun.get(`voiceRooms/${roomId.value}/signaling/${tempUserId}/${targetUserId}/ice`).set(candidateData);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        pc.close();
        delete peerConnections[targetUserId];
        roomStatus.value = { state: 'disconnected' };
        showToast('与用户断开连接', 'danger');
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const encryptedOffer = await Gun.SEA.encrypt(
        JSON.stringify(pc.localDescription),
        tempKeyPair.value!.epub
      );
      gun.get(`voiceRooms/${roomId.value}/signaling/${tempUserId}/${targetUserId}/offer`).put({ data: encryptedOffer });
    } catch (err) {
      console.error('创建 Offer 失败:', err);
      showToast('发起通话失败', 'danger');
    }

    setupSignaling(targetUserId);
  };

  // 配置信令
  const setupSignaling = (targetUserId: string) => {
    if (!tempKeyPair.value) return;

    gun.get(`voiceRooms/${roomId.value}/signaling/${targetUserId}/${tempUserId}/offer`).on(async (data: { data: string }) => {
      if (data?.data) {
        const decrypted = await Gun.SEA.decrypt(data.data, tempKeyPair.value!.epriv);
        if (decrypted) {
          const offer = JSON.parse(decrypted);
          let pc = peerConnections[targetUserId];
          if (!pc) {
            pc = new RTCPeerConnection({
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });
            peerConnections[targetUserId] = pc;

            pc.ontrack = (event) => {
              const audio = new Audio();
              audio.srcObject = event.streams[0];
              audio.autoplay = true;
              audio.play().catch(err => {
                console.error('播放远程音频失败:', err);
                showToast('播放远程音频失败', 'danger');
              });
              roomStatus.value = { state: 'connected' };
            };

            pc.onicecandidate = async (event) => {
              if (event.candidate) {
                const encryptedCandidate = await Gun.SEA.encrypt(
                  JSON.stringify(event.candidate),
                  tempKeyPair.value!.epub
                );
                const candidateData: EncryptedData = {
                  data: encryptedCandidate,
                  id: uuidv4(),
                };
                gun.get(`voiceRooms/${roomId.value}/signaling/${tempUserId}/${targetUserId}/ice`).set(candidateData);
              }
            };

            mediaStream!.getTracks().forEach(track => pc.addTrack(track, mediaStream!));
          }

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            const encryptedAnswer = await Gun.SEA.encrypt(
              JSON.stringify(pc.localDescription),
              tempKeyPair.value!.epub
            );
            gun.get(`voiceRooms/${roomId.value}/signaling/${tempUserId}/${targetUserId}/answer`).put({ data: encryptedAnswer });
          } catch (err) {
            console.error('处理 Offer 失败:', err);
            showToast('处理通话失败', 'danger');
          }
        }
      }
    });

    gun.get(`voiceRooms/${roomId.value}/signaling/${targetUserId}/${tempUserId}/answer`).on(async (data: { data: string }) => {
      if (data?.data) {
        const decrypted = await Gun.SEA.decrypt(data.data, tempKeyPair.value!.epriv);
        if (decrypted) {
          const answer = JSON.parse(decrypted);
          try {
            await peerConnections[targetUserId].setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error('处理 Answer 失败:', err);
            showToast('处理通话失败', 'danger');
          }
        }
      }
    });

    gun.get(`voiceRooms/${roomId.value}/signaling/${targetUserId}/${tempUserId}/ice`).map().on(async (data: EncryptedData) => {
      if (data?.data) {
        const decrypted = await Gun.SEA.decrypt(data.data, tempKeyPair.value!.epriv);
        if (decrypted) {
          const candidate = JSON.parse(decrypted);
          try {
            await peerConnections[targetUserId].addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('添加 ICE 候选失败:', err);
          }
        }
      }
    });
  };

  // 离开房间
  const leaveRoom = () => {
    stopAudioStream();
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    gun.get(`voiceRooms/${roomId.value}/users`).get(tempUserId).put(null);
    isInRoom.value = false;
    roomId.value = '';
    roomStatus.value = { state: 'idle' };
    users.value = [];
    tempKeyPair.value = null;
    triggerLightHaptic();
    showToast('已退出房间', 'success');
  };

  onUnmounted(() => {
    leaveRoom();
  });

  return {
    isInRoom,
    roomId,
    roomStatus,
    users,
    generateKeyPair,
    joinRoom,
    leaveRoom,
  };
}