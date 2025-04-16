<template>
    <ion-page>
      <ion-header collapse="fade">
        <ion-toolbar class="liquid-toolbar">
          <ion-buttons slot="start">
            <ion-button @click="goToFriendRequests">
              <ion-icon color="dark" :icon="personAddOutline"></ion-icon>
              <ion-badge v-if="hasNewRequests && !requestsViewed" color="danger" slot="end">Hi</ion-badge>
            </ion-button>
          </ion-buttons>
          <ion-title>Contacts</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="toggleAddFriendModal">
              <ion-icon color="dark" :icon="addCircleOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        <ion-toolbar class="liquid-toolbar">
          <ion-searchbar v-model="searchQuery" placeholder="" value="Value"/>
        </ion-toolbar>
      </ion-header>
  
      <ion-content :fullscreen="true" class="friend-content" ref="contentRef">
        <!-- Friend List -->
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
              <ion-item @click="openChatPad(friend.pub)" class="friend-item">
                <ion-avatar slot="start" v-if="userAvatars[friend.pub]">
                  <img :src="userAvatars[friend.pub]" />
                </ion-avatar>
                <ion-avatar slot="start" v-else>
                  <img :src="getGunAvatar(friend.pub)" />
                </ion-avatar>
                <ion-label>
                  <p style="font-size: 1.5rem; color: var(--ion-color-dark, #333);">{{ getDisplayName(friend.pub) }}</p>
                </ion-label>
              </ion-item>
              <ion-item-options side="end">
                <ion-item-option color="danger" @click.stop="removeBuddy(friend.pub)">
                  <ion-icon size="large" :icon="trashOutline" />
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </template>
        </ion-list>
  
        <!-- Alphabetical Index Bar (Fixed) -->
        <div class="index-bar">
          <div
            v-for="letter in indexLetters"
            :key="letter"
            class="index-letter"
            @click="scrollToLetter(letter)"
          >
            {{ letter }}
          </div>
        </div>
  
        <!-- Friend Count -->
        <ion-text class="friend-count">
          {{ filteredBuddyList.length }} {{ $t('afriend') }}
        </ion-text>
      </ion-content>
  
      <ion-modal :is-open="showAddFriendModal" @didDismiss="toggleAddFriendModal(false)">
        <ion-header :translucent="true" collapse="fade">
          <ion-toolbar>
            <ion-title></ion-title>
            <ion-buttons slot="end">
              <ion-button color="dark" @click="toggleAddFriendModal(false)">{{ $t('close') }}</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-toolbar class="liquid-toolbar1">
            <ion-input
              label="PublicKey"
              fill="outline"
              v-model="friendPub"
              placeholder="input..."
              @ionInput="friendPub = $event.target.value"
            ></ion-input>
            <ion-buttons slot="end">
              <ion-button color="dark" fill="outline" expand="block" @click="searchUser">
                <ion-icon :icon="searchOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
          <ion-text v-if="buddyError" color="danger" style="margin-left: 10px;">{{ buddyError }}</ion-text>
          <ion-button style="margin-top: 30px;" color="dark" fill="outline" expand="block" @click="gotoscanner">
            <ion-icon :icon="scanOutline"></ion-icon>
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
  import { useRouter } from 'vue-router';
  import { pinyin } from 'pinyin-pro';
  import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonListHeader,
    IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonIcon, IonAvatar, IonModal,
    IonSearchbar, IonText, IonBadge, IonContent as IonContentType,
  } from '@ionic/vue';
  
  import { addCircleOutline, personAddOutline, scanOutline, searchOutline, trashOutline } from 'ionicons/icons';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  import { gunAvatar, mountClass } from "gun-avatar";
  
  mountClass();
  const chatFlowStore = getTalkFlowCore();
  const {
    buddyList, receivedRequests, friendPub, buddyError, requestAddBuddy, openChat, removeBuddy,
    getAliasRealtime, userAvatars, friendRemarks, copyPub, searchUserProfile, requestsViewed,
    loadRequestsViewedState, saveRequestsViewedState, currentUserPub, setSelectedFriendPub,
    hasPadChat,
    currentComponent,
    previousComponent,
    switchTo,
    openChatPad
  } = chatFlowStore;
  
  const router = useRouter();
  const showAddFriendModal = ref(false);
  const searchQuery = ref('');
  const contentRef = ref<InstanceType<typeof IonContentType> | null>(null);
  const isItemOpen = ref(false);
  const itemSlidingRefs = ref<Record<string, any>>({});
  
  // 是否有新好友申请
  const hasNewRequests = computed(() => receivedRequests.value.length > 0);
  
  // 初始化时加载状态
  onMounted(() => {
    loadRequestsViewedState();
    const content = contentRef.value?.$el as HTMLElement | undefined;
    if (content) {
      content.addEventListener('touchstart', detectSwipeDirection);
    }
  });
  
  onBeforeUnmount(() => {
    const content = contentRef.value?.$el as HTMLElement | undefined;
    if (content) {
      content.removeEventListener('touchstart', detectSwipeDirection);
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
  function goToFriendRequests() {
    router.push('/FriendRequests');
    if (hasNewRequests.value && !requestsViewed.value) {
      requestsViewed.value = true;
      saveRequestsViewedState();
    }
  }
  
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
  
  function toggleAddFriendModal(val?: boolean) {
    showAddFriendModal.value = typeof val === 'boolean' ? val : !showAddFriendModal.value;
    if (!showAddFriendModal.value) {
      friendPub.value = '';
      buddyError.value = '';
    }
  }
  
  function gotoscanner() {
    toggleAddFriendModal();
    router.push('ScanPage');
  }
  
  async function searchUser() {
    const pubRaw = friendPub.value.trim();
    console.log('=== searchUser 开始 ===');
    console.log('手动输入的原始值 (friendPub.value):', friendPub.value);
    console.log('经过 trim() 处理后的 pubRaw:', pubRaw);
  
    if (!pubRaw) {
      buddyError.value = '请输入对方公钥';
      console.log('公钥为空，设置 buddyError:', buddyError.value);
      return;
    }
  
    const pub = pubRaw.replace('pubkey:', '');
    console.log('移除 pubkey: 前缀后的 pub:', pub);
  
    const isFriend = buddyList.value.some(b => b.pub === pub);
    console.log('是否已是好友 (isFriend):', isFriend);
    console.log('当前 buddyList:', buddyList.value.map(b => b.pub));
  
    try {
      console.log('调用 searchUserProfile，传入 pub:', pub);
      const userExists = await searchUserProfile(pub);
      console.log('searchUserProfile 返回结果:', userExists);
  
      if (userExists) {
        console.log('用户存在，准备跳转');
        if (isFriend) {
          console.log('跳转到 /friend-profile，pub:', pub);
          router.push({ path: '/friend-profile', query: { pub } });
        } else {
          console.log('跳转到 /stranger-profile，pub:', pub);
          router.push({ path: '/stranger-profile', query: { pub } });
        }
        toggleAddFriendModal(false);
        console.log('关闭添加好友模态框');
      } else {
        buddyError.value = '用户不存在';
        console.log('用户不存在，设置 buddyError:', buddyError.value);
      }
    } catch (err) {
      buddyError.value = '搜索失败，请检查网络';
      console.error('搜索用户失败:', err);
      console.log('捕获到错误，设置 buddyError:', buddyError.value);
    }
    console.log('=== searchUser 结束 ===');
  }
  
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
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  import { useTheme } from '@/composables/useTheme';
  const { isDark } = useTheme();
  
  const getGunAvatar = (pub: string) => {
    return gunAvatar({
      pub: pub,
      round: false,
      size: 200,
      dark: isDark.value
    });
  };
  </script>
  
  <style scoped>
  /* Toolbar */
  .liquid-toolbar {
    --border-color: transparent;
  }
  
  /* Content */
  .friend-content {
    --background: transparent;
    position: relative;
    overflow: visible;
    touch-action: auto;
  }
  
  /* Friend List */
  .friend-list {
    padding: 0;
    margin-bottom: 50px;
    background: transparent;
  }
  
  .group-header {
    --background: var(--ion-background-color, #fff);
    --color: var(--ion-color-step-600, #666);
    font-size: 12px;
    font-weight: 500;
    min-height: 10px;
    padding-left: 10px;
    padding-top: 3px;
    padding-bottom: 3px;
    text-transform: uppercase;
    position: sticky;
    top: 0px;
    z-index: 5;
  }
  
  .friend-item {
    --inner-padding-end: 0;
    --min-height: 50px;
  }
  
  ion-avatar {
    width: 55px;
    height: 55px;
  }
  
  ion-item-option {
    padding: 0 15px;
    font-size: 14px;
    min-width: 60px;
  }
  
  /* Alphabetical Index Bar */
  .index-bar {
    position: fixed;
    top: 60%;
    right: 5px;
    transform: translateY(-50%);
    width: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: transparent;
    user-select: none;
    z-index: 10;
  }
  
  .index-letter {
    font-size: 10px;
    padding: 2px 0;
    cursor: pointer;
    text-align: center;
  }
  
  .index-letter:active {
    color: #38ffc0;
  }
  
  /* Friend Count */
  .friend-count {
    display: block;
    text-align: center;
    padding: 10px 0;
    font-size: 12px;
    margin-bottom: 200px;
  }
  
  /* Modal Toolbar */
  .liquid-toolbar1 {
    --border-color: transparent;
    border-radius: 20px;
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
  </style>