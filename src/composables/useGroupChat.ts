import { ref, computed, watch, onUnmounted } from 'vue';
import Gun from 'gun';
import 'gun/sea';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { toastController } from '@ionic/vue';
import dayjs from 'dayjs';

interface KeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
  alias?: string;
}

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

interface ClearSignal {
  initiator: string;
  timestamp: number;
  cleared: boolean;
}

export const useGroupChat = () => {
  const chatFlow = getTalkFlowCore();
  const { currentUserPub, currentUserAlias, gun, newGroupName, joinGroupKey, groups, currentGroup, currentGroupName, messagesByGroup, membersByGroup, votesByGroup, newMessage, tempKeyPair, encryptMessages, decryptMessages } = chatFlow;

  const safeUserPub = computed(() => currentUserPub.value || 'No Name');
  const safeUserAlias = computed(() => currentUserAlias.value || 'No Name');

  const messageListeners: { [groupPub: string]: any } = {};
  const memberListeners: { [groupPub: string]: any } = {};
  const voteListeners: { [groupPub: string]: any } = {};
  const signalListeners: { [groupPub: string]: any } = {};

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

  const copyKeyPair = async (pair: KeyPair) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(pair, null, 2));
      const toast = await toastController.create({
        message: 'Copied',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      console.error('复制密钥对失败:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const groupData = localStorage.getItem('groupKeyPairs');
      if (groupData) {
        groups.value = JSON.parse(groupData);
      }
    } catch (error) {
      console.error('加载群组失败:', error);
    }
  };

  const saveGroups = () => {
    localStorage.setItem('groupKeyPairs', JSON.stringify(groups.value));
  };

  const generateKeyPair = async (): Promise<KeyPair> => {
    try {
      const pair = await Promise.race([
        Gun.SEA.pair(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('密钥生成超时')), 5000)
        ),
      ]);
      return pair as KeyPair;
    } catch (error) {
      console.error('生成密钥对失败:', error);
      throw error;
    }
  };

  const updateMemberActivity = async (groupPub: string) => {
    if (!safeUserPub.value || !safeUserAlias.value) {
      console.log(`用户公钥或别名缺失，跳过更新: pub=${safeUserPub.value}, alias=${safeUserAlias.value}`);
      return;
    }

    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) {
      console.log(`用户未加入群 ${groupPub}，跳过更新活跃状态`);
      return;
    }

    console.log(`更新成员活跃状态: 群=${groupPub}, 用户=${safeUserPub.value}`);
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
      console.log(`清除旧定时器，启动新定时器: 群=${groupPub}`);
      clearInterval(activityInterval);
    }
    activityInterval = setInterval(() => {
      updateMemberActivity(groupPub);
    }, 30000);
  };

  const stopActivityUpdates = () => {
    if (activityInterval) {
      console.log('停止活跃状态更新');
      clearInterval(activityInterval);
      activityInterval = null;
    }
  };

  const createGroup = async () => {
    if (!newGroupName.value) return;

    try {
      const pair = await generateKeyPair();
      const newGroup: Group = {
        name: newGroupName.value,
        pub: pair.pub,
        pair,
      };

      await gun.get(`group_${pair.pub}_meta`).put({ name: newGroupName.value });

      await updateMemberActivity(pair.pub);
      await initializeVote(pair.pub);

      groups.value.push(newGroup);
      saveGroups();
      tempKeyPair.value = pair;
      newGroupName.value = ''; 
      messagesByGroup.value[pair.pub] = [];
      membersByGroup.value[pair.pub] = [];
      votesByGroup.value[pair.pub] = [];
    } catch (error) {
      console.error('创建群聊失败:', error);
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
      const pair: KeyPair = JSON.parse(joinGroupKey.value);
      if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
        throw new Error('Error keypair');
      }

      const metaNode = gun.get(`group_${pair.pub}_meta`);
      const metaData = await new Promise<any>((resolve) => {
        metaNode.once((data) => resolve(data));
      });

      const groupName = metaData?.name || `${pair.pub.slice(0, 8)}`;

      const newGroup: Group = {
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

      const toast = await toastController.create({
        message: 'Success',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      console.error('加入群聊失败:', error);
      const toast = await toastController.create({
        message: 'failed',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    }
  };

  const joinGroupWithKeyPair = async (keyPairString: string): Promise<KeyPair | null> => {
    try {
      const pair: KeyPair = JSON.parse(keyPairString);
      if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
        throw new Error('无效的密钥对格式');
      }

      const metaNode = gun.get(`group_${pair.pub}_meta`);
      const metaData = await new Promise<any>((resolve) => {
        metaNode.once((data) => resolve(data));
      });

      const groupName = metaData?.name || `群聊_${pair.pub.slice(0, 8)}`;

      const newGroup: Group = {
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
      console.error('加入群聊失败:', error);
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
      console.error('删除群聊失败:', error);
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
      console.error('投票失败:', error);
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
      console.error('取消投票失败:', error);
    }
  };

  const initiateClearChat = async () => {
    if (!currentGroup.value || !safeUserPub.value) return;
    try {
      const signalData: ClearSignal = {
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
      console.error('发起清空失败:', error);
    }
  };

  const loadGroupMessages = async (groupPub: string) => {
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) {
      console.error(`未找到群聊: ${groupPub}`);
      return;
    }

    const clearedData = await new Promise<any>((resolve) => {
      gun.get(`group_${groupPub}_cleared`).once((data) => resolve(data));
    });
    if (clearedData?.cleared) {
      console.log(`群聊 ${groupPub} 已清空，无需加载历史消息`);
      messagesByGroup.value[groupPub] = [];
      return;
    }

    messagesByGroup.value[groupPub] = [];
    console.log(`开始加载群聊 ${groupPub} 的历史消息`);

    const node = gun.get(`group_${groupPub}`);
    node.map().once(async (data: any, id: string) => {
      if (!data) {
        console.warn(`无效消息数据: ID=${id}, 数据=${JSON.stringify(data)}`);
        return;
      }

      try {
        let messageText: string;
        if (data.encrypted) {
          console.log(`消息加密数据: ID=${id}, 加密内容=${data.encrypted}`);
          if (decryptMessages.value) {
            const decrypted = await Gun.SEA.decrypt(data.encrypted, group.pair);
            messageText = decrypted ? String(decrypted) : '[Failed]';
            console.log(`解密结果: ID=${id}, 内容=${messageText}`);
          } else {
            messageText = String(data.encrypted);
          }
        } else if (data.text !== undefined) {
          console.log(`消息明文: ID=${id}, 内容=${data.text}, 类型=${typeof data.text}`);
          messageText = String(data.text);
        } else {
          console.warn(`未知消息格式: ID=${id}, 数据=${JSON.stringify(data)}`);
          messageText = '[Null]';
        }

        const message: Message = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: messageText,
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          messagesByGroup.value[groupPub].push(message);
          messagesByGroup.value[groupPub].sort((a, b) => a.timestamp - b.timestamp);
        }
      } catch (error) {
        console.error(`处理消息失败 ID=${id}:`, error);
        const message: Message = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: '[Failed]',
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          messagesByGroup.value[groupPub].push(message);
          messagesByGroup.value[groupPub].sort((a, b) => a.timestamp - b.timestamp);
        }
      }
    });
  };

  const listenToGroupMessages = (groupPub: string) => {
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) {
      console.log(`未找到群 ${groupPub}，跳过消息监听`);
      return;
    }

    if (messageListeners[groupPub]) {
      messageListeners[groupPub].off();
    }

    const node = gun.get(`group_${groupPub}`);
    const listener = node.map().on(async (data: any, id: string) => {
      if (!data) return;

      try {
        let messageText: string;
        if (data.encrypted) {
          console.log(`实时消息加密数据: ID=${id}, 加密内容=${data.encrypted}`);
          if (decryptMessages.value) {
            const decrypted = await Gun.SEA.decrypt(data.encrypted, group.pair);
            messageText = decrypted ? String(decrypted) : '[Failed]';
            console.log(`实时解密结果: ID=${id}, 内容=${messageText}`);
          } else {
            messageText = String(data.encrypted);
          }
        } else if (data.text !== undefined) {
          console.log(`实时消息明文: ID=${id}, 内容=${data.text}, 类型=${typeof data.text}`);
          messageText = String(data.text);
        } else {
          console.warn(`实时未知消息格式: ID=${id}, 数据=${JSON.stringify(data)}`);
          messageText = '[Null]';
        }

        const message: Message = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: messageText,
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          messagesByGroup.value[groupPub].push(message);
          messagesByGroup.value[groupPub].sort((a, b) => a.timestamp - b.timestamp);
        }
      } catch (error) {
        console.error('处理实时消息失败:', error);
        const message: Message = {
          id,
          sender: data.sender || 'Null',
          senderPub: data.senderPub || 'unknown',
          text: '[Failed]',
          timestamp: Date.now(),
          formattedTime: formatMessageTime(Date.now()),
        };
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          messagesByGroup.value[groupPub].push(message);
          messagesByGroup.value[groupPub].sort((a, b) => a.timestamp - b.timestamp);
        }
      }
    });

    messageListeners[groupPub] = listener;
  };

  const listenToGroupMembers = (groupPub: string) => {
    membersByGroup.value[groupPub] = [];
    console.log(`开始监听群聊 ${groupPub} 的成员`);

    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) {
      console.log(`未找到群 ${groupPub}，跳过成员监听`);
      return;
    }

    if (memberListeners[groupPub]) {
      memberListeners[groupPub].off();
    }

    const listener = gun
      .get(`group_${groupPub}_members`)
      .map()
      .on((data: any, pubKey: string) => {
        if (!data) {
          membersByGroup.value[groupPub] = membersByGroup.value[groupPub].filter((m) => m.pubKey !== pubKey);
          console.log(`成员离开: ${pubKey} 从群 ${groupPub}`);
          return;
        }

        const isGroupMember = groups.value.some((g) => g.pub === groupPub);
        if (!isGroupMember) {
          console.log(`用户 ${pubKey} 无群 ${groupPub} 密钥对，忽略成员数据`);
          return;
        }

        const lastActive = data.lastActive || 0;
        const isOnline = Date.now() - lastActive < 60000;

        const member: Member = {
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
          console.log(`新成员加入: ${member.alias} (${pubKey}) 到群 ${groupPub}`);
        }

        membersByGroup.value[groupPub].sort((a, b) => a.joinedAt - b.joinedAt);
      });

    memberListeners[groupPub] = listener;
  };

  const listenToClearVotes = (groupPub: string) => {
    votesByGroup.value[groupPub] = [];
    console.log(`开始监听群聊 ${groupPub} 的清空投票`);

    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) {
      console.log(`未找到群 ${groupPub}，跳过投票监听`);
      return;
    }

    if (voteListeners[groupPub]) {
      voteListeners[groupPub].off();
    }

    const listener = gun
      .get(`group_${groupPub}_clear_votes`)
      .map()
      .on((data: any, pubKey: string) => {
        if (!data) {
          votesByGroup.value[groupPub] = votesByGroup.value[groupPub].filter((v) => v.pubKey !== pubKey);
          console.log(`投票移除: ${pubKey} 从群 ${groupPub}`);
          return;
        }

        const vote: Vote = {
          pubKey,
          agreed: data.agreed || false,
        };

        const existingIndex = votesByGroup.value[groupPub].findIndex((v) => v.pubKey === pubKey);
        if (existingIndex >= 0) {
          votesByGroup.value[groupPub][existingIndex] = vote;
        } else {
          votesByGroup.value[groupPub].push(vote);
          console.log(`投票更新: ${pubKey} -> ${vote.agreed ? '同意' : '不同意'} 在群 ${groupPub}`);
        }
      });

    voteListeners[groupPub] = listener;
  };

  const listenToClearSignal = (groupPub: string) => {
    console.log(`开始监听群聊 ${groupPub} 的清除信号`);

    if (signalListeners[groupPub]) {
      signalListeners[groupPub].off();
    }

    const listener = gun
      .get(`group_${groupPub}_clear_signal`)
      .on(async (data: ClearSignal | null) => {
        if (!data || data.cleared) return;

        console.log(`收到清除信号: 发起者=${data.initiator}, 时间=${data.timestamp}`);

        const selfMember = (membersByGroup.value[groupPub] || []).find((m) => m.pubKey === safeUserPub.value);
        if (!selfMember || !selfMember.isOnline) {
          console.log(`当前设备不在线，忽略清除信号`);
          return;
        }

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
      const toast = await toastController.create({
        message: 'Cleared',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
    } catch (error) {
      console.error('清空聊天记录失败:', error);
    }
  };

  const selectGroup = (pub: string) => {
    console.log(`尝试进入群聊: ${pub}`);

    if (currentGroup.value && currentGroup.value !== pub) {
      if (messageListeners[currentGroup.value]) {
        messageListeners[currentGroup.value].off();
        delete messageListeners[currentGroup.value];
      }
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
    if (!messageContent || !currentGroup.value) return;

    const group = groups.value.find((g) => g.pub === currentGroup.value);
    if (!group) {
      console.log(`未找到群 ${currentGroup.value}，无法发送消息`);
      return;
    }

    const isGroupMember = groups.value.some((g) => g.pub === currentGroup.value);
    if (!isGroupMember) {
      console.log(`用户 ${safeUserPub.value} 无群 ${currentGroup.value} 密钥对，禁止发送消息`);
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
        console.log(`发送加密消息: 内容=${ensuredStringContent}, 加密后=${messageData.encrypted}, 群=${currentGroup.value}`);
      } else {
        messageData.text = ensuredStringContent;
        console.log(`发送明文消息: 内容=${ensuredStringContent}, 存储为=${messageData.text}, 群=${currentGroup.value}`);
      }

      console.log('messageData:', JSON.stringify(messageData, null, 2));
      const node = gun.get(`group_${currentGroup.value}`);
      await node.set(messageData);

      newMessage.value = '';
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const sendImage = async (messageContent: string = newMessage.value) => {
    if (!messageContent || !currentGroup.value) return;

    const group = groups.value.find((g) => g.pub === currentGroup.value);
    if (!group) {
      console.log(`未找到群 ${currentGroup.value}，无法发送消息`);
      return;
    }

    const isGroupMember = groups.value.some((g) => g.pub === currentGroup.value);
    if (!isGroupMember) {
      console.log(`用户 ${safeUserPub.value} 无群 ${currentGroup.value} 密钥对，禁止发送消息`);
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
        console.log(`发送加密消息: 内容=${ensuredStringContent}, 加密后=${messageData.encrypted}, 群=${currentGroup.value}`);
      } else {
        messageData.text = ensuredStringContent;
        console.log(`发送明文消息: 内容=${ensuredStringContent}, 存储为=${messageData.text}, 群=${currentGroup.value}`);
      }

      console.log('messageData:', JSON.stringify(messageData, null, 2));
      const node = gun.get(`group_${currentGroup.value}`);
      await node.set(messageData);

      newMessage.value = '';
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const loadGroupMessages1 = async (groupPub: string, loadMore = false, maxMessages = 10) => {
    const group = groups.value.find((g) => g.pub === groupPub);
    if (!group) {
      console.error(`未找到群聊: ${groupPub}`);
      return;
    }
  
    const clearedData = await new Promise<any>((resolve) => {
      gun.get(`group_${groupPub}_cleared`).once((data) => resolve(data));
    });
    if (clearedData?.cleared) {
      console.log(`群聊 ${groupPub} 已清空，无需加载历史消息`);
      messagesByGroup.value[groupPub] = [];
      return;
    }
  
    if (!loadMore) {
      messagesByGroup.value[groupPub] = [];
    }
    console.log(`开始加载群聊 ${groupPub} 的历史消息，loadMore=${loadMore}`);
  
    const node = gun.get(`group_${groupPub}`);
    let messageCount = 0;
  
    node.map().once(async (data: any, id: string) => {
      if (!data || messageCount >= maxMessages) return;
  
      try {
        let messageText: string;
        if (data.encrypted) {
          console.log(`消息加密数据: ID=${id}, 加密内容=${data.encrypted}`);
          if (decryptMessages.value) {
            const decrypted = await Gun.SEA.decrypt(data.encrypted, group.pair);
            messageText = decrypted ? String(decrypted) : '[Failed]';
            console.log(`解密结果: ID=${id}, 内容=${messageText}`);
          } else {
            messageText = String(data.encrypted);
          }
        } else if (data.text !== undefined) {
          console.log(`消息明文: ID=${id}, 内容=${data.text}, 类型=${typeof data.text}`);
          messageText = String(data.text);
        } else {
          console.warn(`未知消息格式: ID=${id}, 数据=${JSON.stringify(data)}`);
          messageText = '[Null]';
        }
  
        const message: Message = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: messageText,
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
  
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          if (loadMore) {
            messagesByGroup.value[groupPub].unshift(message);
          } else {
            messagesByGroup.value[groupPub].push(message);
          }
          messageCount++;
        }
  
        messagesByGroup.value[groupPub].sort((a, b) => a.timestamp - b.timestamp);
      } catch (error) {
        console.error(`处理消息失败 ID=${id}:`, error);
        const message: Message = {
          id,
          sender: data.sender || 'No Name',
          senderPub: data.senderPub || 'unknown',
          text: '[Failed]',
          timestamp: data.timestamp || Date.now(),
          formattedTime: formatMessageTime(data.timestamp || Date.now()),
        };
        if (!messagesByGroup.value[groupPub].find((m) => m.id === message.id)) {
          if (loadMore) {
            messagesByGroup.value[groupPub].unshift(message);
          } else {
            messagesByGroup.value[groupPub].push(message);
          }
          messageCount++;
        }
        messagesByGroup.value[groupPub].sort((a, b) => a.timestamp - b.timestamp);
      }
    });
  };

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
    loadGroupMessages1,
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
  };
};