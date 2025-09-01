<template>
    <div class="user-count">
      <p>当前用户总数: {{ userCount }}</p>
      <p v-if="isLoading">正在获取用户表...</p>
      <p v-if="error">{{ error }}</p>
      <div class="user-list" v-if="!isLoading && !error">
        <div v-for="(user, pub) in userTable" :key="pub" class="user-item">
          <img :src="user.avatar || defaultAvatar" alt="Avatar" class="user-avatar" />
          <span class="user-alias">{{ user.alias || 'Unknown' }}</span>
          <span class="user-pub">{{ pub }}</span>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  import Gun from 'gun';
  
  // Gun.js 初始化
  const peersList = [
    'https://peer.wallie.io/gun',
    'https://gun-manhattan.herokuapp.com/gun',
    'wss://gunjs.herokuapp.com/gun',
  ];
  const gun = Gun({
    peers: [peersList[0]], // 默认使用第一个 Peer
    radisk: false,
    localStorage: false,
  });
  
  // 组件状态
  const userCount = ref(0);
  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const userTable = ref<Record<string, { alias?: string; avatar?: string }>>({});
  const defaultAvatar = 'https://via.placeholder.com/40'; // 默认头像占位图
  
  // 初始化并实时监听用户表
  function initializeUserTable() {
    isLoading.value = true;
    error.value = null;
  
    try {
      // 使用 map().on() 实时监听所有用户
      gun.get('users').map().on((data: any, key: string) => {
        if (data && key) {
          // 更新用户表
          userTable.value[key] = {
            alias: data.alias || 'Unknown',
            avatar: data.avatar || '',
          };
          // 更新用户总数
          userCount.value = Object.keys(userTable.value).length;
          console.log(`更新用户 ${key}:`, userTable.value[key]);
        }
        // 首次加载完成后关闭加载状态
        if (isLoading.value) {
          isLoading.value = false;
          console.log('用户表初次加载完成，用户总数:', userCount.value);
        }
      });
    } catch (err) {
      error.value = `获取用户表失败: ${err instanceof Error ? err.message : String(err)}`;
      console.error(error.value);
      isLoading.value = false;
    }
  }
  
  // 检查网络状态（从 TalkFlowCore.ts 简化和复用）
  async function pingNetworkAndPeers(maxRetries = 3): Promise<boolean> {
    console.log('开始 Ping 网络和 Peer');
    let retries = 0;
    while (retries < maxRetries) {
      if (navigator.onLine) {
        // 简单模拟 Peer 检查
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟网络请求
          console.log(`网络和 Peer ${peersList[0]} 可用`);
          return true;
        } catch (err) {
          retries++;
          console.log(`Peer ${peersList[0]} 不可用，重试 ${retries}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else {
        retries++;
        console.log(`无网络连接，重试 ${retries}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log('网络或 Peer 不可用，已达最大重试次数');
    return false;
  }
  
  // 组件生命周期
  onMounted(async () => {
    const networkAvailable = await pingNetworkAndPeers();
    if (!networkAvailable) {
      error.value = '网络不可用，请检查连接后重试';
      isLoading.value = false;
      return;
    }
    initializeUserTable();
  });
  
  onUnmounted(() => {
    // Gun.js 的 .on() 监听器会自动清理，但可手动关闭以确保资源释放
    gun.get('users').map().off();
    console.log('UserCount 组件卸载，监听已关闭');
  });
  </script>
  
  <style scoped>
  .user-count {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-size: 14px;
    max-height: 80vh; /* 最大高度，占屏幕 80% */
    overflow: hidden; /* 防止溢出 */
  }
  
  .user-list {
    max-height: 60vh; /* 列表最大高度 */
    overflow-y: auto; /* 独立滚动 */
    margin-top: 10px;
  }
  
  .user-item {
    display: flex;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 10px;
  }
  
  .user-alias {
    flex: 1;
    font-weight: bold;
  }
  
  .user-pub {
    font-size: 12px;
    opacity: 0.7;
    word-break: break-all;
    max-width: 200px; /* 限制公钥宽度 */
  }
  </style>