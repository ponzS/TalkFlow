<template>
  <ion-page @click="closeOpenedItems">
    <ion-header collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <!-- <ion-buttons slot="start">
          <ion-button color="dark" @click="goToChatRoom">
            <ion-icon :icon="chatbubblesOutline"></ion-icon>
          </ion-button>
        </ion-buttons> -->
        <ion-title>TalkFlow</ion-title>
        <ion-buttons slot="end">
          <ion-button color="dark" @click="showHelpModal = true">
            <ion-icon :icon="helpCircleOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" ref="contentRef" class="cosmic-content">
      <ion-searchbar v-model="searchQuery" placeholder="" />

      <!-- Pinned Chats List -->
      <ion-list v-if="pinnedChats.length > 0" class="pinned-list" ref="pinnedListRef">
        <ion-item-sliding v-for="chat in sortedPinnedChats" :key="chat.pub" 
                         @ionDrag="handleItemDrag" 
                         @ionDidOpen="handleItemOpen"
                         @ionDidClose="handleItemClose"
                         :ref="(el: any) => { if (el) itemSlidingRefs[chat.pub] = el; }">
          <ion-item @click="openChat(chat.pub)">
            <ion-avatar slot="start" v-if="userAvatars[chat.pub]">
              <img :src="userAvatars[chat.pub]" />
            </ion-avatar>
            <ion-avatar slot="start" v-else>
              <img :src="getGunAvatar(chat.pub)" alt="Avatar" />
            </ion-avatar>
            <ion-label>
              <div class="top-line">
                <span class="chat-name">
                  {{ getDisplayName(chat.pub) }}
                  <span v-if="chat.hasNew" class="new-message-dot"></span>
                </span>
                <span class="chat-time">{{ chat.lastTime }}</span>
              </div>
              <div class="bottom-line">{{ chat.lastMsg }}</div>
            </ion-label>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" style="width: 80px;" @click.stop="deleteChat(chat.pub)">
              <ion-icon size="large" :icon="trashOutline" />
            </ion-item-option>
            <ion-item-option color="medium" style="width: 90px;" @click.stop="unpinChat(chat.pub)">
              <ion-icon size="large" :icon="heartDislikeOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
        <ion-list-header><ion-icon :icon="golfOutline" /></ion-list-header>
      </ion-list>

      <!-- Regular Chats List -->
      <ion-list class="regular-list" ref="regularListRef">
        <ion-item-sliding v-for="chat in sortedUnpinnedChats" :key="chat.pub" 
                         @ionDrag="handleItemDrag" 
                         @ionDidOpen="handleItemOpen"
                         @ionDidClose="handleItemClose"
                         :ref="(el: any) => { if (el) itemSlidingRefs[chat.pub] = el; }">
          <ion-item @click="openChat(chat.pub)">
            <ion-avatar slot="start" v-if="userAvatars[chat.pub]">
              <img :src="userAvatars[chat.pub]" />
            </ion-avatar>
            <ion-avatar slot="start" v-else>
              <img :src="getGunAvatar(chat.pub)" />
            </ion-avatar>
            <ion-label>
              <div class="top-line">
                <span class="chat-name">
                  {{ getDisplayName(chat.pub) }}
                  <span v-if="chat.hasNew" class="new-message-dot"></span>
                </span>
                <span class="chat-time">{{ chat.lastTime }}</span>
              </div>
              <div class="bottom-line">{{ chat.lastMsg }}</div>
            </ion-label>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" style="width: 80px;" @click.stop="deleteChat(chat.pub)">
              <ion-icon size="large" :icon="trashOutline" />
            </ion-item-option>
            <ion-item-option color="warning" style="width: 90px;" @click.stop="hideChat(chat.pub)">
              <ion-icon size="large" :icon="eyeOffOutline" />
            </ion-item-option>
            <ion-item-option color="tertiary" style="width: 100px;" @click.stop="pinChat(chat.pub)">
              <ion-icon size="large" :icon="heartOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <!-- Help Modal -->
      <ion-modal
        :is-open="showHelpModal"
        css-class="help-modal"
        @didDismiss="showHelpModal = false"
        :backdrop-dismiss="true"
        :initial-breakpoint="0.75"
        :breakpoints="[0, 0.75, 1]"
      >
        <ion-content class="ion-padding">
          <ion-header>
            <ion-toolbar>
              <ion-title>{{$t('help')}}</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="showHelpModal = false">
                  <ion-icon color="dark" :icon="closeOutline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <div class="help-content">
            <ion-list>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help1')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help2')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help3')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help4')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help5')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help6')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help7')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help8')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help9')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help10')}}
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{$t('help11')}}
                </ion-label>
              </ion-item>
            </ion-list>
          </div>

          <ion-button expand="block" color="dark" @click="showHelpModal = false">
            Close
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  IonPage, IonHeader, IonTitle, IonToolbar, IonSearchbar, IonContent, IonList, IonItem,
  IonItemSliding, IonItemOptions, IonItemOption, IonAvatar, IonLabel, IonListHeader,
  IonModal, IonButton, IonButtons, IonIcon, IonContent as IonContentType,
} from '@ionic/vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { eyeOffOutline, golfOutline, heartDislikeOutline, heartOutline, trashOutline, helpCircleOutline, closeOutline, chatbubblesOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';

const router = useRouter();
const chatFlowStore = getTalkFlowCore();
const {
  visibleChatPreviewList, openChat, userAvatars, hideCurrentChat, onDeleteChatClick,
  currentChatPub, friendRemarks, getAliasRealtime,
} = chatFlowStore;

const searchQuery = ref('');
const showHelpModal = ref(false);
const pinnedListRef = ref(null);
const regularListRef = ref(null);
// 明确指定 contentRef 的类型为 IonContentType
const contentRef = ref<InstanceType<typeof IonContentType> | null>(null);
const isItemOpen = ref(false); // Track if any item is open
const itemSlidingRefs = ref<Record<string, any>>({}); // Refs to sliding items

// 处理滑动事件
const handleItemDrag = (event: CustomEvent) => {
  const { amount } = event.detail; // 获取滑动距离
  if (Math.abs(amount) > 5) { // 设置阈值，避免误触
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

// 检测滑动方向
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

// 点击关闭打开的选项栏
const closeOpenedItems = (event: Event) => {
  if (!isItemOpen.value) return;
  const target = event.target as HTMLElement;
  if (target.closest('ion-item-option') || target.closest('ion-button')) {
    return;
  }
  Object.values(itemSlidingRefs.value).forEach(slider => {
    if (slider && typeof slider.closeOpened === 'function') {
      slider.closeOpened();
    }
  });
};

onMounted(() => {
  // 使用类型断言确保 contentRef.value 是正确的类型
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.addEventListener('touchstart', detectSwipeDirection);
  }
  const stored = localStorage.getItem('pinnedChats');
  if (stored) {
    pinnedChatsMap.value = JSON.parse(stored);
  }
});

onBeforeUnmount(() => {
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.removeEventListener('touchstart', detectSwipeDirection);
  }
});

function goToChatRoom() {
  router.push('/GroupChatList');
}

// 管理置顶聊天
const pinnedChatsMap = ref<Record<string, boolean>>({});
const savePinnedChats = () => {
  localStorage.setItem('pinnedChats', JSON.stringify(pinnedChatsMap.value));
};

const pinChat = (pub: string) => {
  pinnedChatsMap.value[pub] = true;
  savePinnedChats();
};

const unpinChat = (pub: string) => {
  delete pinnedChatsMap.value[pub];
  savePinnedChats();
};

// 显示名称逻辑
const getDisplayName = (pub: string): string => {
  const remark = friendRemarks.value[pub]?.remark;
  return (remark && remark.trim() !== '') ? remark : getAliasRealtime(pub);
};

// 过滤聊天列表
const filteredChatPreviewList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return visibleChatPreviewList.value;
  return visibleChatPreviewList.value.filter(chat => {
    const displayName = getDisplayName(chat.pub).toLowerCase();
    return displayName.includes(q);
  });
});

// 分离置顶和非置顶聊天
const pinnedChats = computed(() => {
  return filteredChatPreviewList.value.filter(chat => pinnedChatsMap.value[chat.pub]);
});

const unpinnedChats = computed(() => {
  return filteredChatPreviewList.value.filter(chat => !pinnedChatsMap.value[chat.pub]);
});

// 按时间排序
const sortedPinnedChats = computed(() => {
  return pinnedChats.value.slice().sort((a, b) => {
    const aTime = new Date(a.lastTime).getTime();
    const bTime = new Date(b.lastTime).getTime();
    return bTime - aTime;
  });
});

const sortedUnpinnedChats = computed(() => {
  return unpinnedChats.value.slice().sort((a, b) => {
    const aTime = new Date(a.lastTime).getTime();
    const bTime = new Date(b.lastTime).getTime();
    return bTime - aTime;
  });
});

// 删除和隐藏聊天
const deleteChat = async (pub: string) => {
  if (confirm('Sure?')) {
    currentChatPub.value = pub;
    await onDeleteChatClick(pub);
    await hideCurrentChat();
    delete pinnedChatsMap.value[pub];
    savePinnedChats();
  }
};

const hideChat = async (pub: string) => {
  currentChatPub.value = pub;
  await hideCurrentChat();
};

import { gunAvatar, mountClass } from "gun-avatar";
mountClass();
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
.liquid-toolbar {
  --border-color: transparent;
}

ion-avatar {
  width: 55px;
  height: 55px;
}

.top-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-name {
  font-size: 1.5rem;
  color: var(--ion-color-dark, #333);
}

.chat-time {
  font-size: 0.85rem;
  color: #999;
}

.bottom-line {
  margin-top: 4px;
  font-size: 0.9rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.new-message-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: red;
  border-radius: 50%;
  margin-left: 5px;
}

.pinned-list {
  margin-bottom: 10px;
}

.regular-list {
  --background: transparent;
  padding-bottom: 200px;
  overflow-y: auto;
  background: transparent;
}

ion-list-header {
  font-size: 1.2rem;
  color: var(--ion-color-dark, #333);
  padding-left: 16px;
}

ion-item-option[color="primary"] {
  --background: linear-gradient(45deg, #66ccff, #99eeff);
}

/* Help Modal */
.help-modal {
  --border-radius: 16px;
}

.help-modal ion-toolbar {
  --border-width: 0;
  --background: transparent;
}

.help-content {
  padding: 0 0 20px;
}

.help-content ion-list {
  background: transparent;
  margin-bottom: 15px;
}

.help-content ion-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.help-content ion-label {
  color: #666 !important;
  font-size: 1rem;
}

ion-button[color="dark"] {
  --background: #333;
  --border-radius: 12px;
  height: 44px;
}

/* 滑动优化样式 */
.cosmic-content {
  --background: transparent;
  position: relative;
  overflow: visible;
  touch-action: auto;
}

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

.pinned-list,
.regular-list {
  touch-action: auto;
}

:global(.disable-scroll .cosmic-content) {
  overflow: hidden !important;
}
</style>