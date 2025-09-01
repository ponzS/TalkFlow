<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>群聊</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-grid>
        <!-- 创建群聊 -->
        <ion-row>
          <ion-col>
            <ion-input v-model="newGroupName" placeholder="输入群名称"></ion-input>
            <ion-button @click="createGroup">创建群聊</ion-button>
          </ion-col>
        </ion-row>

        <!-- 加入群聊 -->
        <ion-row>
          <ion-col>
            <ion-input v-model="joinGroupKey" placeholder="粘贴群密钥对 JSON"></ion-input>
            <ion-button @click="joinGroup">加入群聊</ion-button>
          </ion-col>
        </ion-row>

        <!-- 群密钥对显示 -->
        <ion-row v-if="tempKeyPair">
          <ion-col>
            <ion-card>
              <ion-card-header>
                <ion-card-title>新群密钥对（请保存！）</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <pre>{{ JSON.stringify(tempKeyPair, null, 2) }}</pre>
                <ion-button @click="copyKeyPair(tempKeyPair)">复制密钥对</ion-button>
                <ion-button @click="tempKeyPair = null">关闭</ion-button>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <!-- 群列表 -->
        <ion-row>
          <ion-col>
            <ion-list>
              <ion-list-header>群聊列表</ion-list-header>
              <ion-item v-for="group in groups" :key="group.pub">
                <ion-label>{{ group.name }}</ion-label>
                <ion-button @click="selectGroup(group.pub)">进入聊天</ion-button>
                <ion-button color="danger" @click="deleteGroup(group.pub)">删除</ion-button>
              </ion-item>
            </ion-list>
          </ion-col>
        </ion-row>

        <!-- 群密钥对管理 -->
        <ion-row>
          <ion-col>
            <ion-list>
              <ion-list-header>群密钥对管理</ion-list-header>
              <ion-item v-for="group in groups" :key="group.pub">
                <ion-label>
                  <h2>{{ group.name }}</h2>
                  <p>公钥: {{ group.pub }}</p>
                  <pre>{{ JSON.stringify(group.pair, null, 2) }}</pre>
                </ion-label>
                <ion-button @click="copyKeyPair(group.pair)">复制密钥对</ion-button>
                <ion-button color="danger" @click="deleteGroup(group.pub)">删除</ion-button>
              </ion-item>
            </ion-list>
          </ion-col>
        </ion-row>

        <!-- 消息列表、成员列表和投票 -->
        <ion-row v-if="selectedGroup">
          <ion-col>
            <ion-list>
              <ion-list-header>群成员列表</ion-list-header>
              <ion-item v-for="member in membersByGroup[selectedGroup] || []" :key="member.pubKey">
                <ion-label>{{ member.alias }} ({{ member.isOnline ? '在线' : '离线' }})</ion-label>
              </ion-item>
            </ion-list>
            <ion-list>
              <ion-list-header>清空聊天记录投票 ({{ agreeCount }}/{{ (membersByGroup[selectedGroup] || []).length }} 成员同意)</ion-list-header>
              <ion-item>
                <ion-button @click="voteToClear">同意清空</ion-button>
                <ion-button @click="cancelVote">取消同意</ion-button>
                <ion-button v-if="canClearChat" color="danger" @click="initiateClearChat">清空聊天记录</ion-button>
              </ion-item>
            </ion-list>
            <ion-item>
              <ion-label>加密发送消息</ion-label>
              <ion-checkbox v-model="encryptMessages"></ion-checkbox>
            </ion-item>
            <ion-item>
              <ion-label>解密接收消息</ion-label>
              <ion-checkbox v-model="decryptMessages"></ion-checkbox>
            </ion-item>
            <ion-list>
              <ion-list-header>消息列表 - 当前群聊：{{ currentGroupName }}</ion-list-header>
              <ion-item v-for="message in messagesByGroup[selectedGroup] || []" :key="message.id">
                <ion-label>{{ message.sender }}: {{ message.text }}</ion-label>
                <ion-note slot="end">{{ message.formattedTime }}</ion-note>
              </ion-item>
            </ion-list>
            <ion-input v-model="newMessage" placeholder="输入消息"></ion-input>
            <ion-button @click="sendMessage">发送</ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonInput,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonListHeader,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonCheckbox,
  IonNote,
} from '@ionic/vue';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
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

const chatFlow = getTalkFlowCore();
const { currentUserPub, currentUserAlias, currentUserPair, gun } = chatFlow;

// 确保 currentUserPub 和 currentUserAlias 是 string 类型
const safeUserPub = ref<string>(currentUserPub.value || '匿名用户');
const safeUserAlias = ref<string>(currentUserAlias.value || '匿名用户');

const newGroupName = ref('');
const joinGroupKey = ref('');
const groups = ref<Group[]>([]);
const selectedGroup = ref<string | null>(null);
const currentGroupName = ref<string>('');
const messagesByGroup = ref<{ [groupPub: string]: Message[] }>({});
const membersByGroup = ref<{ [groupPub: string]: Member[] }>({});
const votesByGroup = ref<{ [groupPub: string]: Vote[] }>({});
const newMessage = ref('');
const tempKeyPair = ref<KeyPair | null>(null);
const encryptMessages = ref(true);
const decryptMessages = ref(true);

// 存储监听器，用于停止监听
const messageListeners: { [groupPub: string]: any } = {};
const memberListeners: { [groupPub: string]: any } = {};
const voteListeners: { [groupPub: string]: any } = {};
const signalListeners: { [groupPub: string]: any } = {};

// 计算同意清空的成员数量
const agreeCount = computed(() => {
  if (!selectedGroup.value) return 0;
  return (votesByGroup.value[selectedGroup.value] || []).filter((v) => v.agreed).length;
});

// 是否可以清空聊天记录（投票全票通过）
const canClearChat = computed(() => {
  if (!selectedGroup.value) return false;
  return agreeCount.value === (membersByGroup.value[selectedGroup.value] || []).length && (membersByGroup.value[selectedGroup.value] || []).length > 0;
});

// 格式化消息时间
const formatMessageTime = (timestamp: number): string => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
};

// 复制密钥对
const copyKeyPair = async (pair: KeyPair) => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(pair, null, 2));
    const toast = await toastController.create({
      message: '密钥对已复制到剪贴板',
      duration: 2000,
      position: 'top',
    });
    await toast.present();
  } catch (error) {
    console.error('复制密钥对失败:', error);
  }
};

// 加载本地存储的群组
const loadGroups = async () => {
  try {
    const groupData = localStorage.getItem('groupKeyPairs');
    if (groupData) {
      groups.value = JSON.parse(groupData);
      // 不再全局监听，仅在 selectGroup 时启动
    }
  } catch (error) {
    console.error('加载群组失败:', error);
  }
};

// 保存群组到本地
const saveGroups = () => {
  localStorage.setItem('groupKeyPairs', JSON.stringify(groups.value));
};

// 生成密钥对
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

// 更新成员活跃状态（验证密钥对）
const updateMemberActivity = async (groupPub: string) => {
  if (!safeUserPub.value || !safeUserAlias.value) {
    console.log(`用户公钥或别名缺失，跳过更新: pub=${safeUserPub.value}, alias=${safeUserAlias.value}`);
    return;
  }

  // 验证用户是否拥有群密钥对
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

// 初始化投票状态
const initializeVote = async (groupPub: string) => {
  if (!safeUserPub.value) return;
  await gun.get(`group_${groupPub}_clear_votes`).get(safeUserPub.value).put({ agreed: false });
};

// 定期更新活跃状态
let activityInterval: NodeJS.Timeout | null = null;
const startActivityUpdates = (groupPub: string) => {
  if (activityInterval) {
    console.log(`清除旧定时器，启动新定时器: 群=${groupPub}`);
    clearInterval(activityInterval);
  }
  activityInterval = setInterval(() => {
    updateMemberActivity(groupPub);
  }, 30000); // 每 30 秒更新
};

// 停止活跃状态更新
const stopActivityUpdates = () => {
  if (activityInterval) {
    console.log('停止活跃状态更新');
    clearInterval(activityInterval);
    activityInterval = null;
  }
};

// 创建群聊
const createGroup = async () => {
  if (!newGroupName.value) return;

  try {
    const pair = await generateKeyPair();
    const newGroup: Group = {
      name: newGroupName.value,
      pub: pair.pub,
      pair,
    };

    // 存储群聊元数据（包括群名称）
    await gun.get(`group_${pair.pub}_meta`).put({ name: newGroupName.value });

    // 注册创建者为成员并初始化投票
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

// 加入群聊
const joinGroup = async () => {
  if (!joinGroupKey.value) {
    const toast = await toastController.create({
      message: '请输入群密钥对',
      duration: 2000,
      position: 'top',
    });
    await toast.present();
    return;
  }

  try {
    const pair: KeyPair = JSON.parse(joinGroupKey.value);
    if (!pair.pub || !pair.priv || !pair.epub || !pair.epriv) {
      throw new Error('无效的密钥对格式');
    }

    // 从 Gun.js 获取群名称
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

    // 检查是否已存在该群
    if (groups.value.some((group) => group.pub === pair.pub)) {
      const toast = await toastController.create({
        message: '该群聊已存在',
        duration: 2000,
        position: 'top',
      });
      await toast.present();
      return;
    }

    // 注册加入者为成员并初始化投票
    await updateMemberActivity(pair.pub);
    await initializeVote(pair.pub);

    groups.value.push(newGroup);
    saveGroups();
    joinGroupKey.value = '';
    messagesByGroup.value[pair.pub] = [];
    membersByGroup.value[pair.pub] = [];
    votesByGroup.value[pair.pub] = [];

    const toast = await toastController.create({
      message: '成功加入群聊',
      duration: 2000,
      position: 'top',
    });
    await toast.present();
  } catch (error) {
    console.error('加入群聊失败:', error);
    const toast = await toastController.create({
      message: '加入群聊失败：无效的密钥对',
      duration: 2000,
      position: 'top',
    });
    await toast.present();
  }
};

// 删除群密钥对（离开群聊）
const deleteGroup = async (pub: string) => {
  try {
    // 从成员列表和投票列表移除当前用户
    await gun.get(`group_${pub}_members`).get(safeUserPub.value).put(null);
    await gun.get(`group_${pub}_clear_votes`).get(safeUserPub.value).put(null);
    groups.value = groups.value.filter((group) => group.pub !== pub);
    saveGroups();
    if (selectedGroup.value === pub) {
      selectedGroup.value = null;
      currentGroupName.value = '';
      messagesByGroup.value[pub] = [];
      membersByGroup.value[pub] = [];
      votesByGroup.value[pub] = [];
      // 停止监听
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

// 投票同意清空
const voteToClear = async () => {
  if (!selectedGroup.value || !safeUserPub.value) return;
  try {
    await gun.get(`group_${selectedGroup.value}_clear_votes`).get(safeUserPub.value).put({ agreed: true });
    const toast = await toastController.create({
      message: '已投票同意清空聊天记录',
      duration: 2000,
      position: 'top',
    });
    await toast.present();
  } catch (error) {
    console.error('投票失败:', error);
  }
};

// 取消投票
const cancelVote = async () => {
  if (!selectedGroup.value || !safeUserPub.value) return;
  try {
    await gun.get(`group_${selectedGroup.value}_clear_votes`).get(safeUserPub.value).put({ agreed: false });
    const toast = await toastController.create({
      message: '已取消同意清空聊天记录',
      duration: 2000,
      position: 'top',
    });
    await toast.present();
  } catch (error) {
    console.error('取消投票失败:', error);
  }
};

// 发起清空聊天记录
const initiateClearChat = async () => {
  if (!selectedGroup.value || !safeUserPub.value) return;
  try {
    const signalData: ClearSignal = {
      initiator: safeUserPub.value,
      timestamp: Date.now(),
      cleared: false,
    };
    await gun.get(`group_${selectedGroup.value}_clear_signal`).put(signalData);
    const toast = await toastController.create({
      message: '已发起清空聊天记录，在线设备正在处理',
      duration: 2000,
      position: 'top',
    });
    await toast.present();
  } catch (error) {
    console.error('发起清空失败:', error);
  }
};

// 执行清空聊天记录
const executeClearChat = async (groupPub: string) => {
  try {
    // 清空消息节点
    await gun.get(`group_${groupPub}`).put(null);
    // 更新清除信号
    await gun.get(`group_${groupPub}_clear_signal`).put({
      initiator: safeUserPub.value,
      timestamp: Date.now(),
      cleared: true,
    });
    // 写入已清空标记
    await gun.get(`group_${groupPub}_cleared`).put({
      cleared: true,
      timestamp: Date.now(),
    });
    messagesByGroup.value[groupPub] = [];
    const toast = await toastController.create({
      message: '聊天记录已清空',
      duration: 2000,
      position: 'top',
    });
    await toast.present();
  } catch (error) {
    console.error('清空聊天记录失败:', error);
  }
};

// 加载历史消息
const loadGroupMessages = async (groupPub: string) => {
  const group = groups.value.find((g) => g.pub === groupPub);
  if (!group) {
    console.error(`未找到群聊: ${groupPub}`);
    return;
  }

  // 检查是否已清空
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
          messageText = decrypted || '[解密失败]';
          console.log(`解密结果: ID=${id}, 内容=${messageText}`);
        } else {
          messageText = data.encrypted;
        }
      } else if (data.text) {
        console.log(`消息明文: ID=${id}, 内容=${data.text}`);
        messageText = data.text;
      } else {
        console.warn(`未知消息格式: ID=${id}`);
        messageText = '[未知格式]';
      }

      const message: Message = {
        id,
        sender: data.sender || '未知用户',
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
        sender: data.sender || '未知用户',
        text: '[处理失败]',
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

// 监听群消息
const listenToGroupMessages = (groupPub: string) => {
  const group = groups.value.find((g) => g.pub === groupPub);
  if (!group) {
    console.log(`未找到群 ${groupPub}，跳过消息监听`);
    return;
  }

  // 停止旧监听
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
          messageText = decrypted || '[解密失败]';
          console.log(`实时解密结果: ID=${id}, 内容=${messageText}`);
        } else {
          messageText = data.encrypted;
        }
      } else if (data.text) {
        console.log(`实时消息明文: ID=${id}, 内容=${data.text}`);
        messageText = data.text;
      } else {
        console.warn(`实时未知消息格式: ID=${id}`);
        messageText = '[未知格式]';
      }

      const message: Message = {
        id,
        sender: data.sender || '未知用户',
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
        sender: data.sender || '未知用户',
        text: '[处理失败]',
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

// 监听群成员（过滤无密钥对成员）
const listenToGroupMembers = (groupPub: string) => {
  membersByGroup.value[groupPub] = [];
  console.log(`开始监听群聊 ${groupPub} 的成员`);

  // 验证群是否存在
  const group = groups.value.find((g) => g.pub === groupPub);
  if (!group) {
    console.log(`未找到群 ${groupPub}，跳过成员监听`);
    return;
  }

  // 停止旧监听
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

      // 验证成员是否为群成员（拥有密钥对）
      const isGroupMember = groups.value.some((g) => g.pub === groupPub);
      if (!isGroupMember) {
        console.log(`用户 ${pubKey} 无群 ${groupPub} 密钥对，忽略成员数据`);
        return;
      }

      const lastActive = data.lastActive || 0;
      const isOnline = Date.now() - lastActive < 60000;

      const member: Member = {
        pubKey,
        alias: data.alias || '未知用户',
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

// 监听清空投票
const listenToClearVotes = (groupPub: string) => {
  votesByGroup.value[groupPub] = [];
  console.log(`开始监听群聊 ${groupPub} 的清空投票`);

  // 验证群是否存在
  const group = groups.value.find((g) => g.pub === groupPub);
  if (!group) {
    console.log(`未找到群 ${groupPub}，跳过投票监听`);
    return;
  }

  // 停止旧监听
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

// 监听清除信号
const listenToClearSignal = (groupPub: string) => {
  console.log(`开始监听群聊 ${groupPub} 的清除信号`);

  // 停止旧监听
  if (signalListeners[groupPub]) {
    signalListeners[groupPub].off();
  }

  const listener = gun
    .get(`group_${groupPub}_clear_signal`)
    .on(async (data: ClearSignal | null) => {
      if (!data || data.cleared) return;

      console.log(`收到清除信号: 发起者=${data.initiator}, 时间=${data.timestamp}`);

      // 检查是否在线（60秒内活跃）
      const selfMember = (membersByGroup.value[groupPub] || []).find((m) => m.pubKey === safeUserPub.value);
      if (!selfMember || !selfMember.isOnline) {
        console.log(`当前设备不在线，忽略清除信号`);
        return;
      }

      // 执行清空
      await executeClearChat(groupPub);
    });

  signalListeners[groupPub] = listener;
};

// 选择群聊
const selectGroup = (pub: string) => {
  console.log(`尝试进入群聊: ${pub}`);

  // 停止旧群的监听
  if (selectedGroup.value && selectedGroup.value !== pub) {
    if (messageListeners[selectedGroup.value]) {
      messageListeners[selectedGroup.value].off();
      delete messageListeners[selectedGroup.value];
    }
    if (memberListeners[selectedGroup.value]) {
      memberListeners[selectedGroup.value].off();
      delete memberListeners[selectedGroup.value];
    }
    if (voteListeners[selectedGroup.value]) {
      voteListeners[selectedGroup.value].off();
      delete voteListeners[selectedGroup.value];
    }
    if (signalListeners[selectedGroup.value]) {
      signalListeners[selectedGroup.value].off();
      delete signalListeners[selectedGroup.value];
    }
    stopActivityUpdates();
  }

  selectedGroup.value = pub;
  const group = groups.value.find((g) => g.pub === pub);
  currentGroupName.value = group ? group.name : '';

  // 初始化当前群的数据
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

// 发送消息（验证密钥对）
const sendMessage = async () => {
  if (!newMessage.value || !selectedGroup.value) return;

  const group = groups.value.find((g) => g.pub === selectedGroup.value);
  if (!group) {
    console.log(`未找到群 ${selectedGroup.value}，无法发送消息`);
    return;
  }

  // 验证用户是否有群密钥对
  const isGroupMember = groups.value.some((g) => g.pub === selectedGroup.value);
  if (!isGroupMember) {
    console.log(`用户 ${safeUserPub.value} 无群 ${selectedGroup.value} 密钥对，禁止发送消息`);
    const toast = await toastController.create({
      message: '您未加入该群，无法发送消息',
      duration: 2000,
      position: 'top',
    });
    await toast.present();
    return;
  }

  try {
    const messageData: any = {
      sender: safeUserAlias.value,
      timestamp: Date.now(),
    };

    if (encryptMessages.value) {
      messageData.encrypted = await Gun.SEA.encrypt(newMessage.value, group.pair);
      console.log(`发送加密消息: 内容=${newMessage.value}, 加密后=${messageData.encrypted}, 群=${selectedGroup.value}`);
    } else {
      messageData.text = newMessage.value;
      console.log(`发送明文消息: 内容=${newMessage.value}, 群=${selectedGroup.value}`);
    }

    // 发送消息
    const node = gun.get(`group_${selectedGroup.value}`);
    await node.set(messageData);

    newMessage.value = '';
  } catch (error) {
    console.error('发送消息失败:', error);
  }
};

// 监听解密开关变化，重新加载消息
watch(decryptMessages, () => {
  if (selectedGroup.value) {
    loadGroupMessages(selectedGroup.value);
  }
});

// 清理
onUnmounted(() => {
  stopActivityUpdates();
  // 停止所有监听
  Object.values(messageListeners).forEach((listener) => listener.off());
  Object.values(memberListeners).forEach((listener) => listener.off());
  Object.values(voteListeners).forEach((listener) => listener.off());
  Object.values(signalListeners).forEach((listener) => listener.off());
});

onMounted(() => {
  loadGroups();
});
</script>

<style scoped>
.ion-padding {
  padding: 16px;
}
pre {
  background: #f4f4f4;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}
ion-note {
  font-size: 12px;
  color: #666;
  margin-left: 10px;
}
</style>