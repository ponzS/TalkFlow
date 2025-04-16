<template>
  <ion-page @click="closeOpenedItems">
    <ion-header :translucent="true" collapse="fade">
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
                         :ref="el => { if (el) itemSlidingRefs[chat.pub] = el; }">
          <ion-item @click="openChat(chat.pub)">
            <ion-avatar slot="start" v-if="userAvatars[chat.pub]">
              <img :src="userAvatars[chat.pub]" />
            </ion-avatar>
            <ion-avatar slot="start" v-else>
              <img :src="getGunAvatar(chat.pub)"  />
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
                         :ref="el => { if (el) itemSlidingRefs[chat.pub] = el; }">
          <ion-item @click="openChat(chat.pub)">
            <ion-avatar slot="start" v-if="userAvatars[chat.pub]">
              <img :src="userAvatars[chat.pub]" alt="Avatar" />
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
            <!-- <h2>How to Use TalkFlow</h2> -->
             
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
  IonModal, IonButton, IonButtons, IonIcon, 
} from '@ionic/vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { eyeOffOutline, golfOutline, heartDislikeOutline, heartOutline, trashOutline, helpCircleOutline, closeOutline,chatbubblesOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
const router = useRouter()
const chatFlowStore = getTalkFlowCore();
const {
  visibleChatPreviewList, openChat, userAvatars, hideCurrentChat, onDeleteChatClick,
  currentChatPub, friendRemarks, getAliasRealtime,
} = chatFlowStore;

const searchQuery = ref('');
const showHelpModal = ref(false);
const pinnedListRef = ref(null);
const regularListRef = ref(null);
const contentRef = ref(null);
const isItemOpen = ref(false); // Track if any item is open
const itemSlidingRefs = ref<Record<string, any>>({}); // Store refs to all sliding items

// Simplified swipe handling approach
const handleItemDrag = (event: CustomEvent) => {
  // Immediately disable scrolling for any horizontal swipe
  document.body.classList.add('disable-scroll');
  
  // We can access the amount swiped if needed
  // const amount = event.detail.amount;
  // console.log('Dragging, amount:', amount);
};

const handleItemOpen = () => {
  isItemOpen.value = true;
  document.body.classList.add('disable-scroll');
};

const handleItemClose = () => {
  isItemOpen.value = false;
  // Short delay to ensure animations complete
  setTimeout(() => {
    document.body.classList.remove('disable-scroll');
  }, 100);
};

// Function to close any open sliding items when clicking outside
const closeOpenedItems = (event: Event) => {
  // Only process if we have an open item and the click wasn't on an option
  if (!isItemOpen.value) return;
  
  // Get the clicked element
  const target = event.target as HTMLElement;
  
  // Don't close if clicking on the options or a button
  if (target.closest('ion-item-option') || target.closest('ion-button')) {
    return;
  }
  
  // Close all open items
  Object.values(itemSlidingRefs.value).forEach(slider => {
    if (slider && typeof slider.closeOpened === 'function') {
      slider.closeOpened();
    }
  });
};

// No need for complex event listeners
onMounted(() => {
  const stored = localStorage.getItem('pinnedChats');
  if (stored) {
    pinnedChatsMap.value = JSON.parse(stored);
  }
});

onBeforeUnmount(() => {
  // No cleanup needed for this approach
});

function goToChatRoom() {
  router.push('/GroupChatList');
}

// Load pinned chats from localStorage on mount
const pinnedChatsMap = ref<Record<string, boolean>>({});
onMounted(() => {
  const stored = localStorage.getItem('pinnedChats');
  if (stored) {
    pinnedChatsMap.value = JSON.parse(stored);
  }
});

// Save pinned chats to localStorage
const savePinnedChats = () => {
  localStorage.setItem('pinnedChats', JSON.stringify(pinnedChatsMap.value));
};

// Pin a chat
const pinChat = (pub: string) => {
  pinnedChatsMap.value[pub] = true;
  savePinnedChats();
};

// Unpin a chat
const unpinChat = (pub: string) => {
  delete pinnedChatsMap.value[pub];
  savePinnedChats();
};

// Display name logic
const getDisplayName = (pub: string): string => {
  const remark = friendRemarks.value[pub]?.remark;
  return (remark && remark.trim() !== '') ? remark : getAliasRealtime(pub);
};

// Filtered chat list based on search query
const filteredChatPreviewList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return visibleChatPreviewList.value;
  return visibleChatPreviewList.value.filter(chat => {
    const displayName = getDisplayName(chat.pub).toLowerCase();
    return displayName.includes(q);
  });
});

// Split into pinned and unpinned chats
const pinnedChats = computed(() => {
  return filteredChatPreviewList.value.filter(chat => pinnedChatsMap.value[chat.pub]);
});

const unpinnedChats = computed(() => {
  return filteredChatPreviewList.value.filter(chat => !pinnedChatsMap.value[chat.pub]);
});

// Sort pinned chats by lastTime (descending)
const sortedPinnedChats = computed(() => {
  return pinnedChats.value.slice().sort((a, b) => {
    const aTime = new Date(a.lastTime).getTime();
    const bTime = new Date(b.lastTime).getTime();
    return bTime - aTime;
  });
});

// Sort unpinned chats by lastTime (descending)
const sortedUnpinnedChats = computed(() => {
  return unpinnedChats.value.slice().sort((a, b) => {
    const aTime = new Date(a.lastTime).getTime();
    const bTime = new Date(b.lastTime).getTime();
    return bTime - aTime;
  });
});

// Delete chat
const deleteChat = async (pub: string) => {
  if (confirm('Sure?')) {
    currentChatPub.value = pub;
 await onDeleteChatClick(pub);
   await hideCurrentChat();
  await  delete pinnedChatsMap.value[pub]; // Remove from pinned if deleted
  await  savePinnedChats();
  }
};

// Hide chat
const hideChat = async (pub: string) => {
  currentChatPub.value = pub;
await  hideCurrentChat();
};

import { gunAvatar, extractFromFile, mountClass } from "gun-avatar";
mountClass();

// Generate avatar based on user's public key
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    // draw: 'squares'
  });
};
// const avatarurl = computed(() => gunAvatar({pub: sortedPinnedChats.value,round: false}));

</script>

<style scoped>
.liquid-toolbar {
  --border-color: transparent;
  /* backdrop-filter: blur(10px); */
}

ion-avatar {
  --border-radius: 50%;
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
  --background: transparent;
  background: transparent;
}

.regular-list {
  --background: transparent;
  padding-bottom: 200px;
  overflow-y: auto;

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

.help-content h2 {
  font-size: 1.25rem;
  margin: 20px 0 10px;
  color: #333;
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

/* Simplified styles for disabling scrolling */
:global(.disable-scroll) {
  overflow: hidden !important;
  position: fixed; /* This helps prevent any movement */
  width: 100%;
}

:deep(ion-item-sliding.item-sliding-active-slide) {
  overflow: hidden !important;
  touch-action: pan-x !important;
  -ms-touch-action: pan-x !important;
  -webkit-touch-action: pan-x !important;
}

.cosmic-content {
  --background: transparent;
  position: relative;
  overflow: visible; /* 避免裁切 */
}
</style>