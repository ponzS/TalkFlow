<template>
  <ion-page>
    <!-- 顶部栏 -->
    <ion-header  :translucent="true"  collapse="fade">
      <ion-toolbar>

   <ion-buttons slot="start">
            <!-- <ion-menu-button >
              <div style="width: 30px; height: 30px; border-radius: 50%; overflow: hidden;margin: auto 10px;">
                  <img
              v-if="userAvatars[currentUserPub!]"
              :src="userAvatars[currentUserPub!]"
        
            />
            <img
              v-else
              :src="avatarurl"
             
            /></div>
      
            </ion-menu-button> -->
          </ion-buttons>

        <ion-title >Contact</ion-title>
 
        <ion-buttons slot="end">
          <!-- 新朋友按钮 -->
          <ion-button  fill="clear" @click="goToNewFriends">
            <div class="new-friends-button">
              <ion-icon  :icon="personAddOutline"></ion-icon>
              <!-- 红点通知 -->
              <div v-if="hasNewRequests && !requestsViewed" class="notification-dot"></div>
            </div>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      
      <!-- 搜索栏 -->
      <!-- <ion-toolbar>
        <ion-searchbar    
        show-cancel-button="focus"
           :animated="true"
          v-model="searchQuery" 
          placeholder="Search" 
          @keydown.enter.prevent="onSearchEnter"
        />
      </ion-toolbar> -->
    </ion-header>

    <ion-content :fullscreen="true" class="friend-content" ref="contentRef">
      <!-- 下拉刷新 -->
      <ion-refresher slot="fixed" @ionRefresh="refreshContacts($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
    
      <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
           Contact
            </h1>
          </ion-toolbar>
        </ion-header>


<!--  placeholder="Search"  -->
        <ion-searchbar    
        
          
          v-model="searchQuery" 
         placeholder="Search" 
          @keydown.enter.prevent="onSearchEnter"
          
        />


      <!-- 通讯录列表 -->
      <div class="view-container">
        <ion-list class="friend-list">
          <template v-for="(group, letter) in sortedGroupedBuddyList" :key="letter">
            <ion-list-header class="group-header" :id="'group-' + letter">
              {{ letter }}
            </ion-list-header>

            <ion-item-sliding v-for="friend in group" :key="friend.pub"
                             @ionDrag="handleItemDrag"
                             @ionDidOpen="handleItemOpen"
                             @ionDidClose="handleItemClose"
                             :ref="(el: any) => { if (el) itemSlidingRefs[friend.pub] = el; }">
              <ion-item @click="openChat(friend.pub)" class="friend-item">
                <div class="avatar-container" slot="start">
                  <ion-avatar v-if="userAvatars[friend.pub]" style="border: 2px solid black; ">
                    <img style="width: 100%;height: 100%;object-fit: cover;" :src="userAvatars[friend.pub]" />
                  </ion-avatar>
                  <ion-avatar v-else style="border: 2px solid black; ">
                    <img style="width: 100%;height: 100%;object-fit: cover;" :src="getGunAvatar(friend.pub)" />
                  </ion-avatar>
                  
                  <!-- 验证状态徽章 -->
                  <div class="verification-badge" :class="getVerificationBadgeClass(friend)">
                    <ion-icon :icon="getVerificationIcon(friend)" class="badge-icon"></ion-icon>
                  </div>
                </div>
                
                <ion-label>
                  <div class="friend-info">
                    <p class="friend-name">{{ getDisplayName(friend.pub) }}</p>
                    <p class="verification-status">{{ getVerificationStatusText(friend) }}</p>
                  </div>
                </ion-label>
              </ion-item>
              <ion-item-options side="end">
                <ion-button fill="clear" color="danger" @click.stop="removeBuddy(friend.pub)">
                  <ion-icon size="large" :icon="trashOutline" />
                </ion-button>
              </ion-item-options>
            </ion-item-sliding>
          </template>
        </ion-list>

        <!-- Friend Count -->
        <ion-text class="friend-count">
         Total:{{ filteredBuddyList.length }} 
        </ion-text>
      </div>
    </ion-content>

    <!-- Alphabetical Index Bar (Fixed) - 移到 ion-content 外面 -->
    <div 
      class="index-bar"
      ref="indexBarRef"
      @touchstart="handleIndexTouchStart"
      @touchmove="handleIndexTouchMove"
      @touchend="handleIndexTouchEnd"
    >
      <div
        v-for="letter in indexLetters"
        :key="letter"
        class="index-letter"
        :data-letter="letter"
                    @click.stop="handleLetterClick(letter)"
      >
        {{ letter }}
      </div>
    </div>

    <!-- 浮动字母提示 -->
    <div v-if="isIndexTouching" class="letter-preview">
      {{ currentTouchLetter }}
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { pinyin } from 'pinyin-pro';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonListHeader,
  IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonIcon, IonAvatar,
  IonSearchbar, IonText, IonRefresher, IonRefresherContent,  IonMenuButton,
} from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import { 
  personAddOutline, trashOutline, checkmarkCircleOutline, syncOutline, helpCircleOutline
} from 'ionicons/icons';
import { getTalkFlowCore, isVerified, getVerificationStatus, type VerifiedBuddy } from '@/composables/TalkFlowCore';
import { gunAvatar, mountClass } from "gun-avatar";
import { watch } from 'vue';

mountClass();
const chatFlowStore = getTalkFlowCore();
const {
  buddyList, receivedRequests, removeBuddy,
  getAliasRealtime, userAvatars, friendRemarks, 
  requestsViewed, loadRequestsViewedState, saveRequestsViewedState, 
  currentUserPub, setSelectedFriendPub, openChat, refreshBuddyList, refreshContactsFromGun,
  listenUserAlias, listenUserAvatar
} = chatFlowStore;
const { t } = useI18n();
const router = useRouter();
const searchQuery = ref('');
const contentRef = ref<any>(null);
const isItemOpen = ref(false);
const itemSlidingRefs = ref<Record<string, any>>({});
const indexBarRef = ref<any>(null);
const isIndexTouching = ref(false);
const currentTouchLetter = ref('');
const avatarurl = computed(() => gunAvatar({ pub: currentUserPub.value, round: false, dark: isDark.value, svg: true }as any));

// 是否有新好友申请
const hasNewRequests = computed(() => {
  // 过滤掉已经在通讯录中存在的好友的申请
  const validRequests = receivedRequests.value.filter(request => {
    // 检查申请者是否已经在好友列表中
    return !buddyList.value.some(buddy => buddy.pub === request.from);
  });
  return validRequests.length > 0;
});

// 进入新朋友页面
function goToNewFriends() {
  // 标记为已查看
  if (hasNewRequests.value && !requestsViewed.value) {
    requestsViewed.value = true;
    saveRequestsViewedState();
  }
  // 跳转到新朋友页面
  router.push('/FriendRequests');
}

// 初始化时加载状态
onMounted(() => {
  loadRequestsViewedState();
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.addEventListener('touchstart', detectSwipeDirection);
  }
  
  // 🔄 为每个好友设置实时监听器，确保昵称和头像能实时更新
  buddyList.value.forEach(buddy => {
    listenUserAlias(buddy.pub);
    listenUserAvatar(buddy.pub);
  });
  
  // 🔄 启动定期epub状态同步（优化版）
  startEpubStatusSync();
});

// 🔄 监听好友列表变化，为新添加的好友设置监听器
watch(buddyList, (newList, oldList) => {
  // 找出新添加的好友
  const newBuddies = newList.filter(newBuddy => 
    !oldList?.some(oldBuddy => oldBuddy.pub === newBuddy.pub)
  );
  
  // 为新好友设置监听器
  newBuddies.forEach(buddy => {
    listenUserAlias(buddy.pub);
    listenUserAvatar(buddy.pub);
  });
}, { deep: true });

onBeforeUnmount(() => {
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.removeEventListener('touchstart', detectSwipeDirection);
  }
  
  // 🔄 清理epub同步定时器
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    
  }
});

// 滑动事件处理
const handleItemDrag = (event: CustomEvent) => {
  const { amount } = event.detail;
  if (Math.abs(amount) > 5) {
    document.body.classList.add('disable-scroll');
  }
};

const handleItemOpen = () => {
  isItemOpen.value = true;
  document.body.classList.add('disable-scroll');
};

const handleItemClose = () => {
  isItemOpen.value = false;
  setTimeout(() => {
    document.body.classList.remove('disable-scroll');
  }, 100);
};

const detectSwipeDirection = (event: TouchEvent) => {
  const touch = event.touches[0];
  const startX = touch.clientX;
  const startY = touch.clientY;

  const moveHandler = (moveEvent: TouchEvent) => {
    const moveTouch = moveEvent.touches[0];
    const deltaX = moveTouch.clientX - startX;
    const deltaY = moveTouch.clientY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
      document.body.classList.add('disable-scroll');
    }
  };

  const endHandler = () => {
    if (!isItemOpen.value) {
      setTimeout(() => {
        document.body.classList.remove('disable-scroll');
      }, 100);
    }
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('touchend', endHandler);
  };

  document.addEventListener('touchmove', moveHandler);
  document.addEventListener('touchend', endHandler);
};

// 页面导航
function goToFriendProfile(userPub: string) {
  if (userPub) {
    router.push({ path: '/friend-profile', query: { pub: userPub } });
  }
}

const goToProfile = (userPub: string) => {
  if (userPub === currentUserPub.value) {
    router.push('/MyMoments');
  } else {
    setSelectedFriendPub(userPub);
    router.push('/FriendMoments');
  }
};

function getDisplayName(pub: string): string {
  const remark = friendRemarks.value[pub]?.remark;
  return remark && remark.trim() !== '' ? remark : getAliasRealtime(pub);
}

const filteredBuddyList = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return buddyList.value;
  return buddyList.value.filter(b => getDisplayName(b.pub).toLowerCase().includes(q));
});

function getInitialLetter(pub: string): string {
  const displayName = getDisplayName(pub);
  const letter = pinyin(displayName, { pattern: 'first', type: 'array' })[0] || '#';
  const upper = letter.toUpperCase();
  return /^[A-Z]$/.test(upper) ? upper : '#';
}

const sortedGroupedBuddyList = computed(() => {
  const groups: Record<string, typeof buddyList.value> = {};
  filteredBuddyList.value.forEach(b => {
    const letter = getInitialLetter(b.pub);
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(b);
  });

  for (const letter in groups) {
    groups[letter].sort((a, b) => getDisplayName(a.pub).localeCompare(getDisplayName(b.pub)));
  }

  const sortedKeys = Object.keys(groups).sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
  const sortedObj: Record<string, typeof buddyList.value> = {};
  sortedKeys.forEach(k => sortedObj[k] = groups[k]);
  return sortedObj;
});

const indexLetters = computed(() => {
  const letters = Object.keys(sortedGroupedBuddyList.value);
  return letters.length > 0 ? letters : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];
});

function scrollToLetter(letter: string) {
  const element = document.getElementById(`group-${letter}`);
  
  if (!element) {
    
    return;
  }
  
  
  
  const ionContent = contentRef.value;
  if (!ionContent) {
    
    return;
  }
  
  // 获取所有字母组，按顺序计算位置
  const allLetters = indexLetters.value;
  const targetIndex = allLetters.indexOf(letter);
  
  if (targetIndex === -1) {
    
    return;
  }
  
  // 计算目标位置（累加前面所有组的高度）
  let targetScrollTop = 0;
  
  // 获取实际的联系人项目高度
  const firstItem = document.querySelector('.friend-item');
  const itemHeight = firstItem ? firstItem.getBoundingClientRect().height : 80;
  
  
  for (let i = 0; i < targetIndex; i++) {
    const currentLetter = allLetters[i];
    const groupElement = document.getElementById(`group-${currentLetter}`);
    
    if (groupElement) {
      // 添加分组标题的高度
      const headerHeight = groupElement.getBoundingClientRect().height;
      targetScrollTop += headerHeight;
      
      // 计算该组下所有联系人的高度
      const groupData = sortedGroupedBuddyList.value[currentLetter];
      if (groupData && groupData.length > 0) {
        targetScrollTop += groupData.length * itemHeight;
      }
    }
  }
  
  // 如果是第一个字母，直接滚动到顶部
  if (targetIndex === 0) {
    targetScrollTop = 0;
    
  }
  
  
  
  // 使用 ion-content 的 scrollToPoint 方法
  if (ionContent.scrollToPoint) {
    ionContent.scrollToPoint(0, targetScrollTop, 300);
    
  } else {
    // 后备方案：直接操作滚动容器
    const contentEl = ionContent.$el;
    if (contentEl) {
      const scrollableEl = contentEl.querySelector('.inner-scroll') || 
                          contentEl.querySelector('main') || 
                          contentEl;
      
      if (scrollableEl) {
        scrollableEl.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
        
      }
    }
  }
}

// 处理字母点击
function handleLetterClick(letter: string) {
  
  scrollToLetter(letter);
}

// 索引条触摸事件处理
function handleIndexTouchStart(event: TouchEvent) {
  event.preventDefault();
  isIndexTouching.value = true;
  handleIndexTouch(event);
}

function handleIndexTouchMove(event: TouchEvent) {
  event.preventDefault();
  if (isIndexTouching.value) {
    handleIndexTouch(event);
  }
}

function handleIndexTouchEnd(event: TouchEvent) {
  event.preventDefault();
  isIndexTouching.value = false;
  currentTouchLetter.value = '';
  
  // 清除所有高亮状态
  const indexBar = indexBarRef.value?.$el || indexBarRef.value;
  if (indexBar) {
    const allLetters = indexBar.querySelectorAll('.index-letter');
    allLetters.forEach((el: any) => {
      el.style.color = '';
      el.style.background = '';
      el.style.transform = '';
    });
  }
}

function handleIndexTouch(event: TouchEvent) {
  const touch = event.touches[0];
  const indexBar = indexBarRef.value?.$el || indexBarRef.value;
  if (!indexBar) return;
  
  const rect = indexBar.getBoundingClientRect();
  const y = touch.clientY - rect.top;
  const totalHeight = rect.height;
  
  // 计算当前触摸位置对应的字母索引
  const letters = indexLetters.value;
  
  // 确保 y 在有效范围内
  const clampedY = Math.max(0, Math.min(y, totalHeight));
  
  // 计算字母索引，确保正确映射
  let letterIndex = Math.floor((clampedY / totalHeight) * letters.length);
  
  // 防止索引越界
  letterIndex = Math.max(0, Math.min(letterIndex, letters.length - 1));
  
  if (letterIndex >= 0 && letterIndex < letters.length) {
    const letter = letters[letterIndex];
    currentTouchLetter.value = letter;
    scrollToLetter(letter);
    
    // 高亮当前字母
    const allLetters = indexBar.querySelectorAll('.index-letter');
    allLetters.forEach((el: any, index: number) => {
      if (index === letterIndex) {
        el.style.color = 'var(--ion-color-primary, #3880ff)';
        el.style.background = 'rgba(56, 128, 255, 0.2)';
        el.style.transform = 'scale(1.1)';
      } else {
        el.style.color = '';
        el.style.background = '';
        el.style.transform = '';
      }
    });
    
    // 添加触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }
}

import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

// 刷新联系人列表
const refreshContacts = async (event: CustomEvent) => {
  try {
    // 使用新的刷新方法，直接从Gun网络获取最新的昵称和头像
    await refreshContactsFromGun();
    
    // 完成刷新
    await event.detail.complete();
  } catch (error) {
    //console.error('刷新联系人列表失败:', error);
    // 如果新方法失败，回退到原来的方法
    try {
      await refreshBuddyList();
    } catch (fallbackError) {
     // console.error('回退刷新方法也失败:', fallbackError);
    }
    await event.detail.complete();
  }
};

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  } as any);
};

import { Browser } from '@capacitor/browser'
// URL 简单正则：带或不带协议都行
const URL_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/

async function onSearchEnter() {
  const q = searchQuery.value.trim()
  if (!q) {
    return
  }

  // 1) 如果看上去像 URL，就在内置浏览器打开
  if (URL_REGEX.test(q)) {
    const url = q.startsWith('http://') || q.startsWith('https://')
      ? q
      : `https://${q}`
    await Browser.open({ url })
    return
  }

  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`
  await Browser.open({ url: googleUrl })
}

// 🔐 验证状态相关函数
function getVerificationBadgeClass(friend: any): string {
  const verifiedFriend = friend as VerifiedBuddy;
  const status = getVerificationStatus(verifiedFriend);
  
  switch (status) {
    case 'verified':
      return 'badge-verified';
    case 'syncing':
      return 'badge-syncing';
    default:
      return 'badge-unverified';
  }
}

// 🔄 定期epub状态同步
let syncInterval: ReturnType<typeof setInterval> | null = null;

function startEpubStatusSync() {
  // 获取同步函数
  const { syncAllBuddiesEpubStatus } = chatFlowStore;
  
  // 🚫 紧急性能修复：大幅延迟首次同步，减少启动时的性能影响
  setTimeout(() => {
    syncAllBuddiesEpubStatus().catch(error => {
      
    });
  }, 10000); // 延迟10秒，让应用完全加载
  
  // 🚫 紧急性能修复：大幅降低同步频率，从2分钟增加到10分钟 (减少80%同步频率)
  syncInterval = setInterval(() => {
    // 只有在页面可见时才执行同步
    if (!document.hidden) {
      
      syncAllBuddiesEpubStatus().catch(error => {
        
      });
    }
  }, 600000); // 10分钟 (600000ms) - 减少80%的同步频率
  
  
}

function getVerificationIcon(friend: any): string {
  const verifiedFriend = friend as VerifiedBuddy;
  const status = getVerificationStatus(verifiedFriend);
  
  switch (status) {
    case 'verified':
      return checkmarkCircleOutline;
    case 'syncing':
      return syncOutline;
    default:
      return helpCircleOutline;
  }
}

function getVerificationStatusText(friend: any): string {
  const verifiedFriend = friend as VerifiedBuddy;
  const status = getVerificationStatus(verifiedFriend);
  
  switch (status) {
    case 'verified':
      return t('verifiedStatus');
    case 'syncing':
      return t('syncingStatus');
    default:
      return t('unverifiedStatus');
  }
}

</script>

<style scoped>
/* 顶部栏样式 */




/* 新朋友按钮样式 */
.new-friends-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

/* .new-friends-button ion-icon {
  font-size: 24px;
  
} */

/* 红点通知样式 */
.notification-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background-color: #ff4757;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
  animation: pulse 2s infinite;
  z-index: 10;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(255, 71, 87, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 71, 87, 0);
  }
}

/* Content */
.friend-content {
  --background: transparent;
  position: relative;
  overflow: visible;
  touch-action: auto;
  padding: 8px 0;
}

/* 确保 ion-page 不会影响固定定位 */
ion-page {
  position: relative;
}

/* View Containers */
.view-container {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s ease-in-out;
}

/* Friend List */
.friend-list {
  padding: 0 5px;
  /* margin-bottom: 50px; */
  /* background: transparent; */
}

/* 🔐 验证状态样式 */
.avatar-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.verification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--ion-background-color, #fff);
  z-index: 10;
}

.badge-icon {
  font-size: 12px;
  color: white;
}

.badge-verified {
  background: #22c55e; /* 绿色 - 已验证 */
}

.badge-verified .badge-icon {
  animation: none;
}

.badge-syncing {
  background: #3b82f6; /* 蓝色 - 同步中 */
}

.badge-syncing .badge-icon {
  animation: spin 2s linear infinite;
}

.badge-unverified {
  background: #64748b; /* 灰色 - 未验证 */
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 好友信息布局 */
.friend-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.friend-name {
  font-size: 1.2rem;
  color: var(--ion-color-dark, #333);
  font-weight: 500;
  margin: 0;
  line-height: 1.3;
}

.verification-status {
  font-size: 0.6rem;
  margin: 0;
  line-height: 1.2;
  opacity: 0.7;
}

.verification-status {
  color: var(--ion-color-medium, #666);
}

.group-header {
  --background: var(--ion-background-color, #fff);
  --color: var(--ion-color-step-600, #666);
  font-size: 12px;
  font-weight: 600;
  min-height: 10px;
  padding: 12px 8px 6px 8px;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0px;
  z-index: 5;
}

.friend-item {
  --inner-padding-end: 0;
  --min-height: 30px;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  --border-radius: 12px;
  --border-color: transparent;
}

.friend-item:hover {
  transition: all 0.2s ease;
}

ion-avatar {
  width: 55px;
  height: 55px;
  margin-right: 12px;
}



/* Alphabetical Index Bar */
.index-bar {
  position: fixed !important;
  top: 60% !important;
  right: 8px !important;
  transform: translateY(-50%) !important;
  width: 28px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 8px 4px;
  user-select: none;
  z-index: 99999 !important;
  touch-action: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: auto;
}

/* 浮动字母提示 */
.letter-preview {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 48px;
  font-weight: bold;
  border-radius: 50%;
  z-index: 999999 !important;
  pointer-events: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: letterPreviewShow 0.2s ease-out;
}

@keyframes letterPreviewShow {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.index-letter {
  font-size: 10px;
  padding: 2px 0;
  cursor: pointer;
  text-align: center;
  font-weight: 600;
  color: var(--ion-color-dark, #333);
  transition: all 0.2s ease;
  width: 100%;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 16px;
}

.index-letter:active {
  color: var(--ion-color-primary, #3880ff);
  background: rgba(56, 128, 255, 0.1);
  transform: scale(1.1);
}

/* 暗模式优化 */
@media (prefers-color-scheme: dark) {
  .index-bar {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .index-letter {
    color: var(--ion-color-light, #fff);
  }
  
  .index-letter:active {
    color: var(--ion-color-primary, #3880ff);
    background: rgba(56, 128, 255, 0.2);
  }
  
  .letter-preview {
    background: rgba(255, 255, 255, 0.9);
    color: #000;
  }
}

/* Friend Count */
.friend-count {
  display: block;
  text-align: center;
  padding: 16px 0;
  font-size: 12px;
  margin-bottom: 150px;
  margin-right:20px;
  margin-left: 20px;
  color: var(--ion-color-medium, #666);
  font-weight: 500;
  /* border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 30px; */

}

/* 滑动优化样式 */
:global(.disable-scroll) {
  overflow: hidden !important;
  position: fixed;
  width: 100%;
  height: 100%;
  touch-action: none;
}

:deep(ion-item-sliding.item-sliding-active-slide) {
  overflow: hidden !important;
  touch-action: pan-x !important;
}

.friend-list {
  touch-action: auto;
}

:global(.disable-scroll .friend-content) {
  overflow: hidden !important;
}

/* Responsive Design */
@media (max-width: 768px) {
  .new-friends-button {
    width: 36px;
    height: 36px;
  }
  
  .new-friends-button ion-icon {
    font-size: 20px;
  }
  
  .index-bar {
    width: 26px;
    right: 6px;
    max-height: 65vh;
    padding: 6px 3px;
  }
  
  .index-letter {
    font-size: 9px;
    min-height: 14px;
    padding: 1px 0;
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .index-bar {
    width: 24px;
    right: 4px;
    max-height: 60vh;
    padding: 4px 2px;
  }
  
  .index-letter {
    font-size: 8px;
    min-height: 12px;
    padding: 1px 0;
  }
}
</style>