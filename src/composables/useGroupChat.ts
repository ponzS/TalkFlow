import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import Gun from 'gun';
import 'gun/sea';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { toastController } from '@ionic/vue';
import dayjs from 'dayjs';
import router from '@/router';

interface GroupChatKeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
  alias?: string;
}

interface GroupChatGroup {
  name: string;
  pub: string;
  pair: GroupChatKeyPair;
}

interface GroupChatMessage {
  id: string;
  sender: string;
  senderPub: string;
  text: string;
  timestamp: number;
  formattedTime: string;
  status?: 'sent' | 'pending' | 'failed';
  isSending?: boolean;
  duration?: number;
}

interface GroupChatMember {
  pubKey: string;
  alias: string;
  lastActive: number;
  joinedAt: number;
  isOnline: boolean;
}

interface GroupChatVote {
  pubKey: string;
  agreed: boolean;
}

interface GroupChatClearSignal {
  initiator: string;
  timestamp: number;
  cleared: boolean;
}

interface GroupChatSession {
  groupPub: string;
  groupName: string;
  isRead: boolean;
  previewMessage: GroupChatMessage | null;
}

export const useGroupChat = () => {
  const chatFlow = getTalkFlowCore();
  const { currentUserPub, currentUserAlias, gun, encryptMessages, decryptMessages, triggerLightHaptic } = chatFlow;

  // 重新定义群聊相关的响应式变量，避免类型冲突
  const newGroupName = ref('');
  const joinGroupKey = ref('');
  const groups = ref<GroupChatGroup[]>([]);
  const currentGroup = ref<string | null>(null);
  const currentGroupName = ref('');
  const messagesByGroup = ref<{ [groupPub: string]: GroupChatMessage[] }>({});
  const membersByGroup = ref<{ [groupPub: string]: GroupChatMember[] }>({});
  const votesByGroup = ref<{ [groupPub: string]: GroupChatVote[] }>({});
  const newMessage = ref('');
  const tempKeyPair = ref<GroupChatKeyPair | null>(null);

  const safeUserPub = computed(() => currentUserPub.value || 'No Name');
  const safeUserAlias = computed(() => currentUserAlias.value || 'No Name');

  const groupSessions = ref<GroupChatSession[]>([]);
  const messageListeners: { [groupPub: string]: any } = {};
  const memberListeners: { [groupPub: string]: any } = {};
  const voteListeners: { [groupPub: string]: any } = {};
  const signalListeners: { [groupPub: string]: any } = {};
  const lastMessageTimestamps: { [groupPub: string]: number | undefined } = {};

  const agreeCount = computed(() => {
    if (!currentGroup.value) return 0;
    return (votesByGroup.value[currentGroup.value] || []).filter((v) => v.agreed).length;
  });

  const canClearChat = computed(() => {
    if (!currentGroup.value) return false;
    return agreeCount.value === (membersByGroup.value[currentGroup.value] || []).length && (membersByGroup.value[currentGroup.value] || []).length > 0;
  });

  const formatMessageTime = (timestamp: number): string => {
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
  };

  const copyKeyPair = async (pair: GroupChatKeyPair) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(pair, null, 2));
      const toast = await toastController.create({
        message: 'Copied',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      // Handle error silently
    }
  };

  const loadGroups = async () => {
    console.log('🔄 开始加载群组...');
    try {
      const groupData = localStorage.getItem('groupKeyPairs');
      console.log('📱 localStorage 原始数据:', groupData);
      
      if (groupData) {
        const parsedGroups = JSON.parse(groupData);
        console.log('📋 解析后的群组数据:', parsedGroups);
        console.log('📊 群组数量:', parsedGroups.length);
        
        console.log('🔧 设置 groups.value 前的状态:', groups.value.length);
        groups.value = parsedGroups;
        console.log('✅ 设置 groups.value 后的状态:', groups.value.length);
        
        // 验证每个群组的结构
        groups.value.forEach((group, index) => {
          console.log(`🏷️ 群组 ${index + 1}:`, {
            name: group.name,
            pub: group.pub?.slice(0, 8) + '...',
            hasPair: !!group.pair
          });
        });
      } else {
        console.log('📭 localStorage 中没有群组数据');
        groups.value = [];
      }
      
      const sessionData = localStorage.getItem('groupChatSessions');
      if (sessionData) {
        groupSessions.value = JSON.parse(sessionData);
        console.log('💬 加载了群组会话数据:', groupSessions.value.length);
      }
      
      groups.value.forEach(group => {
        if (!groupSessions.value.find(s => s.groupPub === group.pub)) {
          groupSessions.value.push({
            groupPub: group.pub,
            groupName: group.name,
            isRead: true,
            previewMessage: null,
          });
        }
      });
      groupSessions.value = [...groupSessions.value];
      saveSessions();
      
      console.log('🎉 群组加载完成! 最终数量:', groups.value.length);
      console.log('🎯 最终群组列表:', groups.value.map(g => g.name));
    } catch (error) {
      console.error('❌ 加载群组时出错:', error);
      groups.value = [];
    }
  };

  const saveGroups = () => {
    console.log('💾 开始保存群组...');
    console.log('📊 保存群组数量:', groups.value.length);
    console.log('📋 保存群组数据:', groups.value.map(g => ({
      name: g.name,
      pub: g.pub?.slice(0, 8) + '...',
      hasPair: !!g.pair
    })));
    
    const dataToSave = JSON.stringify(groups.value);
    console.log('💿 序列化后的数据长度:', dataToSave.length);
    console.log('💿 数据大小:', (dataToSave.length / 1024).toFixed(2) + ' KB');
    
    try {
      // 检查 localStorage 可用空间
      const testKey = '__test__';
      const testData = 'test';
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      
      // 尝试保存
      localStorage.setItem('groupKeyPairs', dataToSave);
      
      // 验证保存是否成功
      const saved = localStorage.getItem('groupKeyPairs');
      const parsedSaved = saved ? JSON.parse(saved) : [];
      console.log('✅ 保存验证 - 保存后读取到的数量:', parsedSaved.length);
      console.log('🎉 群组保存完成!');
      
    } catch (error) {
      console.error('❌ 保存群组数据失败:', error);
      
      if (error.name === 'QuotaExceededError') {
        console.error('💾 localStorage 存储空间不足!');
        
        // 显示存储使用情况
        let total = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length;
          }
        }
        console.error('📊 当前 localStorage 使用:', (total / 1024).toFixed(2) + ' KB');
        
                 // 尝试清理 localStorage 为群组数据腾出空间
         const cleanupResult = cleanupLocalStorage();
         
         if (cleanupResult.cleanedCount > 0) {
           console.log(`🧹 清理了 ${cleanupResult.cleanedCount} 项，释放 ${cleanupResult.cleanedSizeKB.toFixed(2)} KB`);
           
           // 再次尝试保存
           try {
             localStorage.setItem('groupKeyPairs', dataToSave);
             console.log('✅ 清理后保存成功!');
           } catch (retryError) {
             console.error('❌ 清理后仍然保存失败:', retryError);
             throw retryError;
           }
         } else {
           console.error('💾 无法清理出足够空间');
           throw error;
         }
      } else {
        throw error;
      }
    }
  };

  const saveSessions = () => {
    localStorage.setItem('groupChatSessions', JSON.stringify(groupSessions.value));
  };

  // 清理 localStorage 空间的函数
  const cleanupLocalStorage = () => {
    console.log('🧹 开始清理 localStorage...');
    
    // 获取清理前的使用情况
    let totalBefore = 0;
    const beforeData: { [key: string]: number } = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        beforeData[key] = localStorage[key].length;
        totalBefore += localStorage[key].length;
      }
    }
    console.log('🔍 清理前总大小:', (totalBefore / 1024).toFixed(2) + ' KB');
    
    // 定义可以安全清理的键
    const cleanupKeys = [
      'talkflow_backup_timestamp',
      'talkflow_chat_previews', 
      'talkflow_user_avatar',
      'talkflow_friend_remarks',
      'debug_logs',
      'temp_data',
      // 添加其他临时或非必要的键
    ];
    
    let cleanedCount = 0;
    let cleanedSize = 0;
    
    cleanupKeys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        cleanedSize += item.length;
        localStorage.removeItem(key);
        cleanedCount++;
        console.log(`🗑️ 清理了: ${key} (${(item.length / 1024).toFixed(2)} KB)`);
      }
    });
    
    // 获取清理后的使用情况
    let totalAfter = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalAfter += localStorage[key].length;
      }
    }
    
    console.log('📊 清理结果:');
    console.log('  清理项目数:', cleanedCount);
    console.log('  释放空间:', (cleanedSize / 1024).toFixed(2) + ' KB');
    console.log('  清理前:', (totalBefore / 1024).toFixed(2) + ' KB');
    console.log('  清理后:', (totalAfter / 1024).toFixed(2) + ' KB');
    
    return {
      cleanedCount,
      cleanedSizeKB: (cleanedSize / 1024),
      totalBeforeKB: (totalBefore / 1024),
      totalAfterKB: (totalAfter / 1024)
    };
  };

  const generateKeyPair = async (): Promise<GroupChatKeyPair> => {
    try {
      const pair = await Promise.race([
        Gun.SEA.pair(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('密钥生成超时')), 5000)
        ),
      ]);
              return pair as GroupChatKeyPair;
    } catch (error) {
      throw error;
    }
  };

  const updateMemberActivity = async (groupPub: string) => {
    if (!safeUserPub.value || !safeUserAlias.value) return;
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) return;
    const memberData = {
      alias: safeUserAlias.value,
      lastActive: Date.now(),
      joinedAt: Date.now(),
    };
    await gun.get(`group_${groupPub}_members`).get(safeUserPub.value).put(memberData);
  };

  const initializeVote = async (groupPub: string) => {
    if (!safeUserPub.value) return;
    await gun.get(`group_${groupPub}_clear_votes`).get(safeUserPub.value).put({ agreed: false });
  };

  let activityInterval: NodeJS.Timeout | null = null;
  const startActivityUpdates = (groupPub: string) => {
    if (activityInterval) {
      clearInterval(activityInterval);
    }
    activityInterval = setInterval(() => {
      updateMemberActivity(groupPub);
    }, 30000);
  };

  const stopActivityUpdates = () => {
    if (activityInterval) {
      clearInterval(activityInterval);
      activityInterval = null;
    }
  };

  const createGroup = async () => {
    if (!newGroupName.value) return;
    console.log('🚀 开始创建群组:', newGroupName.value);
    console.log('📊 创建前群组数量:', groups.value.length);
    
    try {
      const pair = await generateKeyPair();
      const newGroup: GroupChatGroup = {
        name: newGroupName.value,
        pub: pair.pub,
        pair,
      };
      
      console.log('🔑 生成的群组信息:', {
        name: newGroup.name,
        pub: newGroup.pub?.slice(0, 8) + '...',
        hasPair: !!newGroup.pair
      });
      
      await gun.get(`group_${pair.pub}_meta`).put({ name: newGroupName.value });
      await updateMemberActivity(pair.pub);
      await initializeVote(pair.pub);
      
      console.log('➕ 添加群组到数组前的数量:', groups.value.length);
      groups.value.push(newGroup);
      console.log('✅ 添加群组到数组后的数量:', groups.value.length);
      console.log('📋 当前所有群组:', groups.value.map(g => g.name));
      
      saveGroups();
      tempKeyPair.value = pair;
      newGroupName.value = '';
      messagesByGroup.value[pair.pub] = [];
      membersByGroup.value[pair.pub] = [];
      votesByGroup.value[pair.pub] = [];
      groupSessions.value.push({
        groupPub: pair.pub,
        groupName: newGroup.name,
        isRead: true,
        previewMessage: null,
      });
      groupSessions.value = [...groupSessions.value];
      saveSessions();
      listenToGroupMessages(pair.pub);
      
      console.log('🎉 群组创建完成!');
    } catch (error) {
      console.error('❌ 创建群组时出错:', error);
      
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // localStorage 空间不足的特殊处理
        const toast = await toastController.create({
          message: '存储空间不足，请清理浏览器数据后重试',
          duration: 4000,
          position: 'top',
          color: 'danger',
        });
        await toast.present();
      } else {
        // 其他错误的通用处理
        const toast = await toastController.create({
          message: '创建群组失败，请重试',
          duration: 2000,
          position: 'top',
          color: 'danger',
        });
        await toast.present();
      }
      
      throw error;
    }
  };

  const joinGroup = async () => {
    if (!joinGroupKey.value) {
      const toast = await toastController.create({
        message: 'please input',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
      return;
    }
    try {
      const pair: GroupChatKeyPair = JSON.parse(joinGroupKey.value);
      if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
        throw new Error('Error keypair');
      }
      const metaNode = gun.get(`group_${pair.pub}_meta`);
      const metaData = await new Promise<any>((resolve) => {
        metaNode.once((data) => resolve(data));
      });
      const groupName = metaData?.name || `${pair.pub.slice(0, 8)}`;
      const newGroup: GroupChatGroup = {
        name: groupName,
        pub: pair.pub,
        pair,
      };
      if (groups.value.some((group) => group.pub === pair.pub)) {
        const toast = await toastController.create({
          message: 'Already',
          duration: 2000,
          position: 'top',
        });
        await toast.present();
        return;
      }
      await updateMemberActivity(pair.pub);
      await initializeVote(pair.pub);
      groups.value.push(newGroup);
      saveGroups();
      joinGroupKey.value = '';
      messagesByGroup.value[pair.pub] = [];
      membersByGroup.value[pair.pub] = [];
      votesByGroup.value[pair.pub] = [];
      groupSessions.value.push({
        groupPub: pair.pub,
        groupName: newGroup.name,
        isRead: true,
        previewMessage: null,
      });
      groupSessions.value = [...groupSessions.value];
      saveSessions();
      listenToGroupMessages(pair.pub);
      const toast = await toastController.create({
        message: 'Success',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      const toast = await toastController.create({
        message: 'failed',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    }
  };

  const joinGroupWithKeyPair = async (keyPairString: string): Promise<GroupChatKeyPair | null> => {
    try {
      const pair: GroupChatKeyPair = JSON.parse(keyPairString);
      if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
        throw new Error('无效的密钥对格式');
      }
      const metaNode = gun.get(`group_${pair.pub}_meta`);
      const metaData = await new Promise<any>((resolve) => {
        metaNode.once((data) => resolve(data));
      });
      const groupName = metaData?.name || `群聊_${pair.pub.slice(0, 8)}`;
      const newGroup: GroupChatGroup = {
        name: groupName,
        pub: pair.pub,
        pair,
      };
      if (groups.value.some((group) => group.pub === pair.pub)) {
        const toast = await toastController.create({
          message: 'Already exist',
          duration: 2000,
          position: 'top',
        });
        await toast.present();
        return null;
      }
      await updateMemberActivity(pair.pub);
      await initializeVote(pair.pub);
      groups.value.push(newGroup);
      saveGroups();
      messagesByGroup.value[pair.pub] = [];
      membersByGroup.value[pair.pub] = [];
      votesByGroup.value[pair.pub] = [];
      groupSessions.value.push({
        groupPub: pair.pub,
        groupName: newGroup.name,
        isRead: true,
        previewMessage: null,
      });
      groupSessions.value = [...groupSessions.value];
      saveSessions();
      listenToGroupMessages(pair.pub);
      const toast = await toastController.create({
        message: 'Success',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
      return {
        pub: pair.pub,
        priv: pair.priv,
        epub: pair.epub,
        epriv: pair.epriv,
      };
    } catch (error) {
      const toast = await toastController.create({
        message: 'Failed',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
      return null;
    }
  };

  const deleteGroup = async (pub: string) => {
    try {
      await gun.get(`group_${pub}_members`).get(safeUserPub.value).put(null);
      await gun.get(`group_${pub}_clear_votes`).get(safeUserPub.value).put(null);
      groups.value = groups.value.filter((group) => group.pub !== pub);
      saveGroups();
      groupSessions.value = groupSessions.value.filter((session) => session.groupPub !== pub);
      groupSessions.value = [...groupSessions.value];
      saveSessions();
      if (currentGroup.value === pub) {
        currentGroup.value = null;
        currentGroupName.value = '';
        messagesByGroup.value[pub] = [];
        membersByGroup.value[pub] = [];
        votesByGroup.value[pub] = [];
        if (messageListeners[pub]) {
          messageListeners[pub].off();
          delete messageListeners[pub];
        }
        if (memberListeners[pub]) {
          memberListeners[pub].off();
          delete memberListeners[pub];
        }
        if (voteListeners[pub]) {
          voteListeners[pub].off();
          delete voteListeners[pub];
        }
        if (signalListeners[pub]) {
          signalListeners[pub].off();
          delete signalListeners[pub];
        }
        stopActivityUpdates();
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const voteToClear = async () => {
    if (!currentGroup.value || !safeUserPub.value) return;
    try {
      await gun.get(`group_${currentGroup.value}_clear_votes`).get(safeUserPub.value).put({ agreed: true });
      const toast = await toastController.create({
        message: 'Voted to agree to clear the record',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      // Handle error silently
    }
  };

  const cancelVote = async () => {
    if (!currentGroup.value || !safeUserPub.value) return;
    try {
      await gun.get(`group_${currentGroup.value}_clear_votes`).get(safeUserPub.value).put({ agreed: false });
      const toast = await toastController.create({
        message: 'Canceled consent to clear the record',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      // Handle error silently
    }
  };

  const initiateClearChat = async () => {
    if (!currentGroup.value || !safeUserPub.value) return;
    try {
      const signalData: GroupChatClearSignal = {
        initiator: safeUserPub.value,
        timestamp: Date.now(),
        cleared: false,
      };
      await gun.get(`group_${currentGroup.value}_clear_signal`).put(signalData);
      const toast = await toastController.create({
        message: 'Cleaning up',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      // Handle error silently
    }
  };

  const updateSessionPreview = (groupPub: string, message: GroupChatMessage) => {
    const sessionIndex = groupSessions.value.findIndex((s) => s.groupPub === groupPub);
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) return;
    const isCurrentGroup = currentGroup.value === groupPub && router.currentRoute.value.path.includes(`/group/${groupPub}/messages`);
    const newSession = {
      groupPub,
      groupName: group.name,
      isRead: isCurrentGroup,
      previewMessage: { ...message },
    };
    if (sessionIndex >= 0) {
      groupSessions.value[sessionIndex] = newSession;
    } else {
      groupSessions.value.push(newSession);
    }
    groupSessions.value = [...groupSessions.value];
    saveSessions();
  };

  const markSessionAsRead = (groupPub: string) => {
    const session = groupSessions.value.find((s) => s.groupPub === groupPub);
    if (session && router.currentRoute.value.path.includes(`/group/${groupPub}/messages`)) {
      session.isRead = true;
      groupSessions.value = [...groupSessions.value];
      saveSessions();
    }
  };

  const loadGroupMessages = async (groupPub: string) => {
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) return;
    const clearedData = await new Promise<any>((resolve) => {
      gun.get(`group_${groupPub}_cleared`).once((data) => resolve(data));
    });
    if (clearedData?.cleared) {
      messagesByGroup.value[groupPub] = [];
      const session = groupSessions.value.find((s) => s.groupPub === groupPub);
      if (session) {
        session.previewMessage = null;
        groupSessions.value = [...groupSessions.value];
        saveSessions();
      }
      return;
    }
    messagesByGroup.value[groupPub] = [];
    const node = gun.get(`group_${groupPub}`);
    const tempMessages: GroupChatMessage[] = [];
    node.map().once(async (data: any, id: string) => {
      if (!data) return;
      try {
        let messageText: string;
        if (data.encrypted) {
          if (decryptMessages.value) {
            const decrypted = await Gun.SEA.decrypt(data.encrypted, group.pair);
            messageText = decrypted ? String(decrypted) : '[Failed]';
          } else {
            messageText = String(data.encrypted);
          }
        } else if (data.text !== undefined) {
          messageText = String(data.text);
        } else {
          messageText = '[Null]';
        }
        const message: GroupChatMessage = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: messageText,
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
        tempMessages.push(message);
        // Sort by timestamp ascending and take the latest 10
        tempMessages.sort((a, b) => a.timestamp - b.timestamp);
        if (tempMessages.length > 100) {
          tempMessages.shift();
        }
        messagesByGroup.value[groupPub] = [...tempMessages];
        if (tempMessages.length > 0) {
          lastMessageTimestamps[groupPub] = tempMessages[0].timestamp;
        }
      } catch (error) {
        const message: GroupChatMessage = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: '[Failed]',
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
        tempMessages.push(message);
        tempMessages.sort((a, b) => a.timestamp - b.timestamp);
        if (tempMessages.length > 100) {
          tempMessages.shift();
        }
        messagesByGroup.value[groupPub] = [...tempMessages];
        if (tempMessages.length > 0) {
          lastMessageTimestamps[groupPub] = tempMessages[0].timestamp;
        }
      }
    });
    markSessionAsRead(groupPub);
  };

  const loadMoreMessages = async (groupPub: string) => {
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) return;
    const lastTimestamp = lastMessageTimestamps[groupPub];
    if (!lastTimestamp) return;
    const node = gun.get(`group_${groupPub}`);
    const tempMessages: GroupChatMessage[] = [];
    let messageCount = 0;
    node.map().once(async (data: any, id: string) => {
      if (!data || messageCount >= 20) return;
      if (data.timestamp >= lastTimestamp) return;
      try {
        let messageText: string;
        if (data.encrypted) {
          if (decryptMessages.value) {
            const decrypted = await Gun.SEA.decrypt(data.encrypted, group.pair);
            messageText = decrypted ? String(decrypted) : '[Failed]';
          } else {
            messageText = String(data.encrypted);
          }
        } else if (data.text !== undefined) {
          messageText = String(data.text);
        } else {
          messageText = '[Null]';
        }
        const message: GroupChatMessage = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: messageText,
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          tempMessages.push(message);
          messageCount++;
        }
      } catch (error) {
        const message: GroupChatMessage = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: '[Failed]',
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          tempMessages.push(message);
          messageCount++;
        }
      }
    });
    if (tempMessages.length > 0) {
      tempMessages.sort((a, b) => a.timestamp - b.timestamp);
      messagesByGroup.value[groupPub] = [...tempMessages, ...messagesByGroup.value[groupPub]];
      lastMessageTimestamps[groupPub] = tempMessages[0].timestamp;
    }
    markSessionAsRead(groupPub);
  };

  const listenToGroupMessages = (groupPub: string) => {
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) return;
    if (messageListeners[groupPub]) {
      messageListeners[groupPub].off();
    }
    const node = gun.get(`group_${groupPub}`);
    const listener = node.map().on(async (data: any, id: string) => {
      if (!data) return;
      try {
        let messageText: string;
        if (data.encrypted) {
          if (decryptMessages.value) {
            const decrypted = await Gun.SEA.decrypt(data.encrypted, group.pair);
            messageText = decrypted ? String(decrypted) : '[Failed]';
          } else {
            messageText = String(data.encrypted);
          }
        } else if (data.text !== undefined) {
          messageText = String(data.text);
        } else {
          messageText = '[Null]';
        }
        const message: GroupChatMessage = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: messageText,
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          messagesByGroup.value[groupPub].push(message);
          // No need to sort, as new messages are appended and naturally newer
          updateSessionPreview(groupPub, message);
        }
      } catch (error) {
        const message: GroupChatMessage = {
          id,
          sender: data.sender || 'Null',
          senderPub: data.senderPub || 'unknown',
          text: '[Failed]',
          timestamp: Date.now(),
          formattedTime: formatMessageTime(Date.now()),
        };
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          messagesByGroup.value[groupPub].push(message);
          updateSessionPreview(groupPub, message);
        }
      }
    });
    messageListeners[groupPub] = listener;
  };

  const listenToGroupMembers = (groupPub: string) => {
    membersByGroup.value[groupPub] = [];
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) return;
    if (memberListeners[groupPub]) {
      memberListeners[groupPub].off();
    }
    const listener = gun
      .get(`group_${groupPub}_members`)
      .map()
      .on((data: any, pubKey: string) => {
        if (!data) {
          membersByGroup.value[groupPub] = membersByGroup.value[groupPub].filter((m) => m.pubKey !== pubKey);
          return;
        }
        const isGroupMember = groups.value.some((g) => g.pub === groupPub);
        if (!isGroupMember) return;
        const lastActive = data.lastActive || 0;
        const isOnline = Date.now() - lastActive < 60000;
        const member: GroupChatMember = {
          pubKey,
          alias: data.alias || 'No Name',
          lastActive,
          joinedAt: data.joinedAt || Date.now(),
          isOnline,
        };
        const existingIndex = membersByGroup.value[groupPub].findIndex((m) => m.pubKey === pubKey);
        if (existingIndex >= 0) {
          membersByGroup.value[groupPub][existingIndex] = member;
        } else {
          membersByGroup.value[groupPub].push(member);
        }
        membersByGroup.value[groupPub].sort((a, b) => a.joinedAt - b.joinedAt);
      });
    memberListeners[groupPub] = listener;
  };

  const listenToClearVotes = (groupPub: string) => {
    votesByGroup.value[groupPub] = [];
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) return;
    if (voteListeners[groupPub]) {
      voteListeners[groupPub].off();
    }
    const listener = gun
      .get(`group_${groupPub}_clear_votes`)
      .map()
      .on((data: any, pubKey: string) => {
        if (!data) {
          votesByGroup.value[groupPub] = votesByGroup.value[groupPub].filter((v) => v.pubKey !== pubKey);
          return;
        }
        const vote: GroupChatVote = {
          pubKey,
          agreed: data.agreed || false,
        };
        const existingIndex = votesByGroup.value[groupPub].findIndex((v) => v.pubKey === pubKey);
        if (existingIndex >= 0) {
          votesByGroup.value[groupPub][existingIndex] = vote;
        } else {
          votesByGroup.value[groupPub].push(vote);
        }
      });
    voteListeners[groupPub] = listener;
  };

  const listenToClearSignal = (groupPub: string) => {
    if (signalListeners[groupPub]) {
      signalListeners[groupPub].off();
    }
    const listener = gun
      .get(`group_${groupPub}_clear_signal`)
      .on(async (data: GroupChatClearSignal | null) => {
        if (!data || data.cleared) return;
        const selfMember = (membersByGroup.value[groupPub] || []).find((m) => m.pubKey === safeUserPub.value);
        if (!selfMember || !selfMember.isOnline) return;
        await executeClearChat(groupPub);
      });
    signalListeners[groupPub] = listener;
  };

  const executeClearChat = async (groupPub: string) => {
    try {
      await gun.get(`group_${groupPub}`).put(null);
      await gun.get(`group_${groupPub}_clear_signal`).put({
        initiator: safeUserPub.value,
        timestamp: Date.now(),
        cleared: true,
      });
      await gun.get(`group_${groupPub}_cleared`).put({
        cleared: true,
        timestamp: Date.now(),
      });
      messagesByGroup.value[groupPub] = [];
      lastMessageTimestamps[groupPub] = undefined;
      const session = groupSessions.value.find((s) => s.groupPub === groupPub);
      if (session) {
        session.previewMessage = null;
        groupSessions.value = [...groupSessions.value];
        saveSessions();
      }
      const toast = await toastController.create({
        message: 'Cleared',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      // Handle error silently
    }
  };

  const selectGroup = (pub: string) => {
    if (currentGroup.value && currentGroup.value !== pub) {
      if (memberListeners[currentGroup.value]) {
        memberListeners[currentGroup.value].off();
        delete memberListeners[currentGroup.value];
      }
      if (voteListeners[currentGroup.value]) {
        voteListeners[currentGroup.value].off();
        delete voteListeners[currentGroup.value];
      }
      if (signalListeners[currentGroup.value]) {
        signalListeners[currentGroup.value].off();
        delete signalListeners[currentGroup.value];
      }
      stopActivityUpdates();
    }
    currentGroup.value = pub;
    const group = groups.value.find((g) => g.pub === pub);
    currentGroupName.value = group ? group.name : '';
    messagesByGroup.value[pub] = messagesByGroup.value[pub] || [];
    membersByGroup.value[pub] = membersByGroup.value[pub] || [];
    votesByGroup.value[pub] = votesByGroup.value[pub] || [];
    loadGroupMessages(pub);
    listenToGroupMessages(pub);
    listenToGroupMembers(pub);
    listenToClearVotes(pub);
    listenToClearSignal(pub);
    updateMemberActivity(pub);
    startActivityUpdates(pub);
    markSessionAsRead(pub);
  };

  const setCurrentGroup = (pub: string | null) => {
    if (pub) {
      selectGroup(pub);
    } else {
      currentGroup.value = null;
      currentGroupName.value = '';
      stopActivityUpdates();
    }
  };

  const getCurrentGroup = () => {
    return currentGroup.value;
  };

  const sendMessage = async (messageContent: string = newMessage.value) => {
    const ensuredStringContent = String(messageContent);
    if (!messageContent || !currentGroup.value) return;
    const group = groups.value.find((g) => g.pub === currentGroup.value);
    if (!group) return;
    const isGroupMember = groups.value.some((g) => g.pub === currentGroup.value);
    if (!isGroupMember) {
      const toast = await toastController.create({
        message: 'Not joined',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
      return;
    }
    try {
      const messageData: any = {
        sender: safeUserAlias.value,
        senderPub: safeUserPub.value,
        timestamp: Date.now(),
      };
   
      if (encryptMessages.value) {
        messageData.encrypted = await Gun.SEA.encrypt(ensuredStringContent, group.pair);
      } else {
        messageData.text = ensuredStringContent;
      }
      const node = gun.get(`group_${currentGroup.value}`);
      await node.set(messageData);
      const message: GroupChatMessage = {
        id: Date.now().toString(),
        sender: safeUserAlias.value,
        senderPub: safeUserPub.value,
        text: ensuredStringContent,
        timestamp: Date.now(),
        formattedTime: formatMessageTime(Date.now()),
        status: 'sent',
        isSending: false,
      };
      messagesByGroup.value[currentGroup.value].push(message);
      updateSessionPreview(currentGroup.value, message);
      newMessage.value = '';
    } catch (error) {
      const message: GroupChatMessage = {
        id: Date.now().toString(),
        sender: safeUserAlias.value,
        senderPub: safeUserPub.value,
        text: ensuredStringContent,
        timestamp: Date.now(),
        formattedTime: formatMessageTime(Date.now()),
        status: 'failed',
        isSending: false,
      };
      messagesByGroup.value[currentGroup.value].push(message);
      updateSessionPreview(currentGroup.value, message);
      newMessage.value = '';
    }
  };

  const sendImage = async (messageContent: string = newMessage.value) => {
    if (!messageContent || !currentGroup.value) return;
    const group = groups.value.find((g) => g.pub === currentGroup.value);
    if (!group) return;
    const isGroupMember = groups.value.some((g) => g.pub === currentGroup.value);
    if (!isGroupMember) {
      const toast = await toastController.create({
        message: 'Not joined',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
      return;
    }
    try {
      const messageData: any = {
        sender: safeUserAlias.value,
        senderPub: safeUserPub.value,
        timestamp: Date.now(),
      };
      const ensuredStringContent = String(messageContent);
      if (encryptMessages.value) {
        messageData.encrypted = await Gun.SEA.encrypt(ensuredStringContent, group.pair);
      } else {
        messageData.text = ensuredStringContent;
      }
      const node = gun.get(`group_${currentGroup.value}`);
      await node.set(messageData);
      const message: GroupChatMessage = {
        id: Date.now().toString(),
        sender: safeUserAlias.value,
        senderPub: safeUserPub.value,
        text: ensuredStringContent,
        timestamp: Date.now(),
        formattedTime: formatMessageTime(Date.now()),
        status: 'sent',
        isSending: false,
      };
      messagesByGroup.value[currentGroup.value].push(message);
      updateSessionPreview(currentGroup.value, message);
      newMessage.value = '';
    } catch (error) {
         const ensuredStringContent = String(messageContent);
      const message: GroupChatMessage = {
        id: Date.now().toString(),
        sender: safeUserAlias.value,
        senderPub: safeUserPub.value,
        text: ensuredStringContent,
        timestamp: Date.now(),
        formattedTime: formatMessageTime(Date.now()),
        status: 'failed',
        isSending: false,
      };
      messagesByGroup.value[currentGroup.value].push(message);
      updateSessionPreview(currentGroup.value, message);
      newMessage.value = '';
    }
  };

  // 移除了 onMounted，因为它会在每个使用此 composable 的组件中都执行
  // 现在由 Card.vue 组件的 onMounted 负责调用 loadGroups()

  watch(groups, () => {
    groups.value.forEach(group => {
      if (!messageListeners[group.pub]) {
        listenToGroupMessages(group.pub);
        listenToGroupMembers(group.pub);
        listenToClearVotes(group.pub);
        listenToClearSignal(group.pub);
      }
    });
  }, { deep: true });

  watch(decryptMessages, () => {
    if (currentGroup.value) {
      loadGroupMessages(currentGroup.value);
    }
  });

  onUnmounted(() => {
    stopActivityUpdates();
    Object.values(messageListeners).forEach((listener) => listener.off());
    Object.values(memberListeners).forEach((listener) => listener.off());
    Object.values(voteListeners).forEach((listener) => listener.off());
    Object.values(signalListeners).forEach((listener) => listener.off());
  });

  return {
    newGroupName,
    joinGroupKey,
    groups,
    currentGroup,
    currentGroupName,
    messagesByGroup,
    membersByGroup,
    votesByGroup,
    newMessage,
    tempKeyPair,
    encryptMessages,
    decryptMessages,
    agreeCount,
    canClearChat,
    copyKeyPair,
    loadGroups,
    createGroup,
    joinGroup,
    deleteGroup,
    voteToClear,
    cancelVote,
    initiateClearChat,
    selectGroup,
    setCurrentGroup,
    getCurrentGroup,
    sendMessage,
    safeUserAlias,
    safeUserPub,
    sendImage,
    joinGroupWithKeyPair,
    groupSessions,
    markSessionAsRead,
    loadGroupMessages,
    loadMoreMessages,
    triggerLightHaptic,
    cleanupLocalStorage,
  };
}; 