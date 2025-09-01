<template>
    <ion-page>
      <ion-header class="ion-no-border" style="--background: transparent !important;">
        <ion-toolbar>
          <ion-title>10 min From World</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content>
        <ion-refresher slot="fixed" @ionRefresh="refreshMoments($event)">
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>
        <div class="moments-container" v-if="moments.length > 0">
          <div v-for="moment in moments" :key="moment.momentId" class="moment-card">
            <div class="moment-header">
              <ion-avatar class="avatar" @click="navigateToProfile(moment.userPub)">
                <img :src="getAvatar(moment.userPub)" alt="Avatar" />
              </ion-avatar>
              <div class="header-info">
                <h2 class="clickable-name" @click="navigateToProfile(moment.userPub)">
                  {{ getBuddyAlias(moment.userPub) }}
                </h2>
                <p class="timestamp"> Life: {{ getRemainingTime(moment.timestamp) }}</p>
              </div>
            </div>
            <div class="content-wrapper">
              <p class="content">{{ moment.content }}</p>
            </div>
          </div>
        </div>
        <div v-else class="no-moments">
          <ion-icon :icon="chatbubblesOutline" size="large"></ion-icon>
          <p>{{ loading ? 'Loading...' : 'No moments yet' }}</p>
        </div>
        <ion-infinite-scroll @ionInfinite="loadMore($event)" threshold="100px" :disabled="!hasMore">
          <ion-infinite-scroll-content loading-text="Loading..."></ion-infinite-scroll-content>
        </ion-infinite-scroll>
  
    
     
      </ion-content>

      <ion-footer collapse="fade" class="ion-no-border" >
      
        <div class="post-container" :style="{ transform: `translateY(-${keyboardOffset}px)` }">
          <div class="input-wrapper">
            <ion-textarea
              ref="textareaRef"
              color="dark"
              v-model="newMomentContent"
              placeholder="(disappears in 10 minutes)"
              auto-grow
              @keydown.enter="handleEnterKey"
              @ionFocus="onFocus"
              @ionBlur="onBlur"
              :rows="1"
              class="dynamic-textarea"
            ></ion-textarea>
            <div
              v-if="newMomentContent.trim()"
              class="send-button"
              @click="postMoment"
              :disabled="loading"
            >
              <ion-icon :icon="sendOutline"></ion-icon>
            </div>
          </div>
        </div>
      
        <!-- <ion-toolbar>
  
        </ion-toolbar> -->



      </ion-footer>



    </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonIcon, IonAvatar, IonRefresher, IonRefresherContent, 
  IonInfiniteScroll, IonInfiniteScrollContent, IonTextarea ,IonFooter 
} from '@ionic/vue';
import { chatbubblesOutline, sendOutline } from 'ionicons/icons';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useToast } from '@/composables/useToast';
import { v4 as uuidv4 } from 'uuid';
import { gunAvatar, mountClass } from 'gun-avatar';
import { Keyboard, KeyboardResize, KeyboardInfo } from '@capacitor/keyboard';
import type { Ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';

mountClass();
const { showToast } = useToast();
const router = useRouter();
const chatFlowStore = getTalkFlowCore();
const { 
  currentUserPub, getAliasRealtime, gun, buddyList, searchUserProfile, setSelectedFriendPub,
  ensurePeerAvailable, peersList
} = chatFlowStore;

interface EphemeralMoment {
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
}

const moments = ref<EphemeralMoment[]>([]);
const newMomentContent = ref('');
const loading = ref(false);
const hasMore = ref(true);
const lastTimestamp = ref<number | undefined>(undefined);
const textareaRef: Ref<ComponentPublicInstance<typeof IonTextarea> | null> = ref(null);
const keyboardHeight = ref(0);
const keyboardOffset = ref(0);
const isFocused = ref(false);
let expirationInterval: NodeJS.Timeout | null = null;
let listenerInterval: NodeJS.Timeout | null = null;

// 初始化
const initialize = async () => {
  console.log('Initializing TenMinutes with peers:', peersList.value);
  const peerAvailable = await ensurePeerAvailable();
  if (!peerAvailable) {
    showToast('无法连接到任何节点，请检查网络或节点状态', 'error');
    console.error('No peers available after retries');
    return;
  }
  moments.value = [];
  hasMore.value = true;
  lastTimestamp.value = undefined;
  await loadMoments();
  listenMoments();
  startExpirationCheck();
  listenerInterval = setInterval(listenMoments, 30000);
};

// 发布动态
const postMoment = async () => {
  if (!currentUserPub.value) {
    showToast('请先登录', 'warning');
    return;
  }
  if (!newMomentContent.value.trim()) {
    showToast('内容不能为空', 'warning');
    return;
  }

  const moment: EphemeralMoment = {
    momentId: uuidv4(),
    userPub: currentUserPub.value,
    content: newMomentContent.value.trim(),
    timestamp: Date.now(),
  };

  loading.value = true;
  try {
    let retries = 3;
    while (retries > 0) {
      try {
        await new Promise<void>((resolve, reject) => {
          gun.get('ephemeralMoments').get(moment.momentId).put(moment, (ack: any) => {
            if (ack.err) {
              console.error('Post failed:', ack.err);
              reject(new Error(ack.err));
            } else {
              console.log('Post successful:', moment);
              resolve();
            }
          });
        });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        console.log(`Retrying post, attempts left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    newMomentContent.value = '';
    showToast('动态发布成功，将在10分钟后自动删除', 'success');
  } catch (err) {
    newMomentContent.value = '';
    console.error('Post error:', err);
    showToast('动态发布失败，可能未同步到节点', 'error');
  } finally {
    newMomentContent.value = '';
    loading.value = false;
  }
};

// 处理回车键发送
const handleEnterKey = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    postMoment();
  }
};

// 输入框聚焦时调整位置
const onFocus = () => {
  isFocused.value = true;
  if (keyboardHeight.value > 0) {
    keyboardOffset.value = keyboardHeight.value + 10;
  }
  const textarea = textareaRef.value;
  if (textarea && textarea.$el) {
    setTimeout(() => textarea.$el.focus(), 100);
  }
};

// 输入框失去焦点时重置位置
const onBlur = () => {
  isFocused.value = false;
  keyboardOffset.value = 0;
};

// 加载动态（无过滤，接收全球数据）
const loadMoments = async (limit: number = 10, append: boolean = false) => {
  if (loading.value || !hasMore.value) return;

  console.log('Loading all global moments');
  loading.value = true;

  try {
    const networkMoments: EphemeralMoment[] = [];
    await new Promise<void>((resolve) => {
      gun.get('ephemeralMoments').map().once((data: any, momentId: string) => {
        if (data && data.userPub && data.content && data.timestamp) {
          const ageInSeconds = (Date.now() - data.timestamp) / 1000;
          if (ageInSeconds > 600) {
            gun.get('ephemeralMoments').get(momentId).put(null);
            console.log(`Removed expired moment: ${momentId}`);
            return;
          }
          const moment: EphemeralMoment = {
            momentId,
            userPub: data.userPub,
            content: data.content,
            timestamp: data.timestamp,
          };
          if (!append || (moment.timestamp < (lastTimestamp.value || Infinity))) {
            networkMoments.push(moment);
            console.log(`Loaded global moment: ${momentId}, userPub: ${data.userPub}, content: ${data.content}`);
          }
        }
      });
      setTimeout(resolve, 3000);
    });

    const sortedMoments = networkMoments
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    if (append) {
      moments.value = [...moments.value, ...sortedMoments];
    } else {
      moments.value = sortedMoments;
    }

    if (sortedMoments.length > 0) {
      lastTimestamp.value = sortedMoments[sortedMoments.length - 1].timestamp;
    }
    hasMore.value = sortedMoments.length === limit;
    console.log('Global moments loaded:', moments.value);
  } catch (err) {
    console.error('Load moments error:', err);
    showToast('加载动态失败，可能未连接到节点', 'error');
  } finally {
    loading.value = false;
  }
};

// 实时监听动态（无过滤，接收全球数据）
const listenMoments = () => {
  console.log('Starting/restarting real-time listener for all global moments');
  if (listenerInterval) {
    gun.get('ephemeralMoments').map().off();
  }
  gun.get('ephemeralMoments').map().on((data: any, momentId: string) => {
    console.log('Received real-time update:', { momentId, data });
    if (data && data.userPub && data.content && data.timestamp) {
      const ageInSeconds = (Date.now() - data.timestamp) / 1000;
      if (ageInSeconds > 600) {
        gun.get('ephemeralMoments').get(momentId).put(null);
        moments.value = moments.value.filter(m => m.momentId !== momentId);
        console.log(`Removed expired moment in listener: ${momentId}`);
        return;
      }
      const moment: EphemeralMoment = {
        momentId,
        userPub: data.userPub,
        content: data.content,
        timestamp: data.timestamp,
      };
      const existingIndex = moments.value.findIndex(m => m.momentId === momentId);
      if (existingIndex === -1) {
        moments.value.unshift(moment);
        moments.value = moments.value.sort((a, b) => b.timestamp - a.timestamp);
        console.log(`Added new global moment: ${momentId}, userPub: ${data.userPub}, content: ${data.content}`);
      } else {
        moments.value[existingIndex] = moment;
        console.log(`Updated global moment: ${momentId}`);
      }
      moments.value = [...moments.value];
    } else if (!data) {
      moments.value = moments.value.filter(m => m.momentId !== momentId);
      console.log(`Removed global moment: ${momentId}`);
    }
  }, { change: true });
};

// 定期检查过期动态
const startExpirationCheck = () => {
  expirationInterval = setInterval(() => {
    const now = Date.now();
    moments.value = moments.value.filter(moment => {
      const ageInSeconds = (now - moment.timestamp) / 1000;
      if (ageInSeconds > 600) {
        gun.get('ephemeralMoments').get(moment.momentId).put(null);
        console.log(`Removed expired moment in check: ${moment.momentId}`);
        return false;
      }
      return true;
    });
  }, 1000);
};

// 清空所有动态（用于调试）
const clearMoments = async () => {
  try {
    await new Promise<void>((resolve) => {
      gun.get('ephemeralMoments').map().once((data: any, momentId: string) => {
        if (data) {
          gun.get('ephemeralMoments').get(momentId).put(null);
        }
      });
      setTimeout(resolve, 1000);
    });
    moments.value = [];
    showToast('Cleared all global moments', 'success');
  } catch (err) {
    console.error('Clear moments error:', err);
    showToast('Failed to clear moments', 'error');
  }
};

// 下拉刷新
const refreshMoments = async (event: CustomEvent) => {
  try {
    await loadMoments();
    console.log('Refreshed global moments:', moments.value);
    event.detail.complete();
  } catch (error) {
    console.error('Refresh error:', error);
    event.detail.complete();
  }
};

// 加载更多
const loadMore = async (event: CustomEvent) => {
  try {
    await loadMoments(10, true);
    console.log('Loaded more global moments:', moments.value);
    (event.target as HTMLIonInfiniteScrollElement).complete();
  } catch (error) {
    console.error('Load more error:', error);
    (event.target as HTMLIonInfiniteScrollElement).complete();
  }
};

import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

// 获取头像（直接使用 userPub）
const getAvatar = (userPub: string): string => {
  try {
    const avatar = gunAvatar({ pub: userPub, size: 200, svg: true, dark: isDark });
    if (!avatar) throw new Error('Empty avatar generated');
    console.log(`Generated avatar for ${userPub}`);
    return avatar;
  } catch (err) {
    console.error(`Failed to generate avatar for ${userPub}:`, err);
    return 'https://via.placeholder.com/59';
  }
};

// 获取昵称
const getBuddyAlias = (pub: string): string => {
  return getAliasRealtime(pub);
};

// 格式化时间戳
const formatTimestamp = (timestamp: number): string => {
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Invalid Date';
};

// 获取剩余时间
const getRemainingTime = (timestamp: number): string => {
  const ageInSeconds = (Date.now() - timestamp) / 1000;
  const remainingSeconds = Math.max(0, 600 - ageInSeconds);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = Math.floor(remainingSeconds % 60);
  return `${minutes}m${seconds}s`;
};

// 跳转到用户主页
const navigateToProfile = async (pub: string) => {
  if (!pub) {
    showToast('无效的用户公钥', 'error');
    return;
  }

  const isFriend = buddyList.value.some(b => b.pub === pub);
  try {
    const userExists = await searchUserProfile(pub);
    if (userExists) {
      setSelectedFriendPub(pub);
      if (isFriend) {
        router.push({ path: '/friend-profile', query: { pub } });
      } else {
        router.push({ path: '/stranger-profile', query: { pub } });
      }
    } else {
      showToast('用户不存在于当前节点', 'error');
    }
  } catch (err) {
    console.error('Profile navigation error:', err);
    showToast('无法加载用户信息，请检查节点状态', 'error');
  }
};

// 组件挂载和卸载
onMounted(() => {
  (window as any).Gun.log = console.log;
  initialize();

  const hasCapacitor = 'Capacitor' in window;
  if (hasCapacitor) {
    Keyboard.setResizeMode({ mode: KeyboardResize.None });

    Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
      keyboardHeight.value = info.keyboardHeight;
      if (isFocused.value) {
        keyboardOffset.value = keyboardHeight.value - 90;
        const textarea = textareaRef.value;
        if (textarea && textarea.$el) {
          textarea.$el.focus();
        }
      }
    });

    Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0;
      keyboardOffset.value = 0;
    });
  } else {
    if (window.visualViewport) {
      const resizeHandler = () => {
        const vh = window.visualViewport!.height;
        const wh = window.innerHeight;
        const newHeight = wh - vh;
        keyboardHeight.value = newHeight;
        if (isFocused.value && newHeight > 0) {
          keyboardOffset.value = newHeight + 10;
        } else {
          keyboardOffset.value = 0;
        }
      };
      window.visualViewport.addEventListener('resize', resizeHandler);
      onUnmounted(() => {
        window.visualViewport!.removeEventListener('resize', resizeHandler);
      });
    }
  }
});

onUnmounted(() => {
  if (expirationInterval !== null) clearInterval(expirationInterval);
  if (listenerInterval !== null) clearInterval(listenerInterval);
  gun.get('ephemeralMoments').map().off();

  const hasCapacitor = 'Capacitor' in window;
  if (hasCapacitor) {
    Keyboard.removeAllListeners();
  }
});
</script>

<style scoped>
ion-content {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  display: flex;
  flex-direction: column;
}

.post-container {
  padding: 16px;
  position: fixed;
  bottom: 110px;
  width: 100%;
  transition: all 0.3s ease;
  z-index: 100;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: 50px;
  animation: glow1 4s linear infinite;
  overflow: visible;
  transition: all 0.3s ease;
}

.post-container ion-textarea {
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  border-radius: 50px;
  background: var(--ion-background-color);
  font-size: 16px;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
  flex: 1;
  overflow: visible;
}

.post-container ion-textarea.dynamic-textarea {
  transition: width 0.5s ease;
  width: calc(100% - 55px); /* Adjust width when button is visible */
}

.post-container ion-textarea.dynamic-textarea.no-button {
  width: 100%; /* Full width when button is hidden */
  transition: width 0.5s ease;
}

.post-container ion-textarea:focus {
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
}

@keyframes glow {
  0% {
    box-shadow: 0 0 15px rgba(255, 105, 180, 0.8), 0 0 20px rgba(255, 165, 0, 0.5);
  }
  33% {
    box-shadow: 0 0 15px rgba(0, 191, 255, 0.8), 0 0 20px rgba(255, 105, 180, 0.5);
  }
  66% {
    box-shadow: 0 0 15px rgba(255, 165, 0, 0.8), 0 0 20px rgba(0, 191, 255, 0.5);
  }
  100% {
    box-shadow: 0 0 15px rgba(255, 105, 180, 0.8), 0 0 20px rgba(255, 165, 0, 0.5);
  }
}

@keyframes glow1 {
  0% {
    box-shadow: 0 0 35px rgba(255, 105, 180, 0.8), 0 0 50px rgba(255, 165, 0, 0.5);
  }
  33% {
    box-shadow: 0 0 35px rgba(0, 191, 255, 0.8), 0 0 50px rgba(255, 105, 180, 0.5);
  }
  66% {
    box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), 0 0 50px rgba(0, 191, 255, 0.5);
  }
  100% {
    box-shadow: 0 0 35px rgba(255, 105, 180, 0.8), 0 0 50px rgba(255, 165, 0, 0.5);
  }
}

.send-button {
  border: none;
  height: 39px;
  width: 39px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: 10px;
  opacity: 1;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.send-button.hide {
  opacity: 0;
  transform: scale(0);
}

.send-button ion-icon {
  font-size: 20px;
}

.moments-container {
  padding: 16px 0;
  flex: 1;
  margin-bottom: 200px;
}

.moment-card {
  border-radius: 16px;
  margin-bottom: 16px;
  padding: 0;
}

.moment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 3px;
}

.avatar {
  width: 59px;
  height: 59px;
  overflow: hidden;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
}

.clickable-name {
  font-size: 1.3em;
  font-weight: 600;
  margin: 0;
  cursor: pointer;
}

.timestamp {
  color: #4a4a4a;
  font-size: 0.85em;
  margin: 2px 0 0;
}

.content-wrapper {
  margin: 0;
  margin-left: 17%;
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 1.3em;
  line-height: 1.6;
  margin: 0;
  text-shadow: 0 0 5px rgba(224, 224, 255, 0.3);
}

.no-moments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: #767676;
}

.no-moments ion-icon {
  margin-bottom: 12px;
}

img {
  opacity: 1;
  transition: opacity 0.3s ease;
}
</style>