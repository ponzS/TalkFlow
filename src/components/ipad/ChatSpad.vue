<template>
  <ion-page @click="closeOpenedItems">
    <ion-header :translucent="true"   class=" ion-no-border">
      <ion-toolbar>
        <ion-searchbar
          show-cancel-button="always"
          cancel-button-text="TalkFlow"
          color="light"
          v-model="searchQuery"
          placeholder="Search"
          @keydown.enter.prevent="onSearchEnter"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" ref="contentRef" class="cosmic-content">
      
      <!-- Segment Tabs -->
      <ion-toolbar>
        <ion-title>
          <ion-segment style="margin: 0 16px;" v-model="selectedSegment" @ionChange="onSegmentChange">
            <ion-segment-button value="chats">
              <ion-label>{{ $t('Chats') || 'Chats' }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="rooms">
              <ion-label>{{ $t('Rooms') || 'Rooms' }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-title>
      </ion-toolbar>

      <!-- Chats View -->
      <div v-show="selectedSegment === 'chats'" class="view-container">
        <!-- Pinned Chats List -->
        <ion-list v-if="pinnedChats.length > 0" class="pinned-list" ref="pinnedListRef">
          <ion-list-header>Pinned Chats</ion-list-header>
          <ion-item-sliding
            v-for="chat in sortedPinnedChats"
            :key="chat.pub"
            @ionDrag="handleItemDrag"
            @ionDidOpen="handleItemOpen"
            @ionDidClose="handleItemClose"
            :ref="(el: any) => { if (el) itemSlidingRefs[chat.pub] = el; }"
          >
            <ion-item @click="openChat(chat.pub, chat.type)">
              <ion-avatar slot="start" :style="{ border: chat.type === 'group' ? '2px solid #28a745' : '2px solid black', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.649)' }">
                <img style="width: 100%;height: 100%;object-fit: cover;" v-if="chat.type === 'private' && userAvatars[chat.pub]" :src="userAvatars[chat.pub]" />
                <img style="width: 100%;height: 100%;object-fit: cover;" v-else :src="getGunAvatar(chat.pub)" alt="Avatar" />
                <ion-badge v-if="chat.type === 'group'" color="success" style="position: absolute; bottom: -5px; font-size: 10px;padding:3px 5px;text-align: center;align-items: center;justify-content: center;display: flex;width: 100%;margin:0 auto;">Room</ion-badge>
              </ion-avatar>
              <ion-label>
                <div class="top-line">
                  <span class="chat-name">
                    {{ chat.name }}
                    <span v-if="chat.hasNew" class="new-message-dot"></span>
                  </span>
                  <span class="chat-time">{{ formatLastTime(chat.lastTime) }}</span>
                </div>
                <div class="bottom-line">{{ chat.lastMsg || 'No messages yet' }}</div>
              </ion-label>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option
                :color="chat.type === 'group' ? 'danger' : 'danger'"
                style="width: 80px;"
                @click.stop="deleteChat(chat.pub, chat.type)"
              >
                <ion-icon size="large" :icon="trashOutline" />
              </ion-item-option>
              <ion-item-option
                v-if="chat.type === 'private' && !pinnedChatsMap[chat.pub]"
                color="warning"
                style="width: 90px;"
                @click.stop="hideChat(chat.pub)"
              >
                <ion-icon size="large" :icon="eyeOffOutline" />
              </ion-item-option>
              <ion-item-option
                color="medium"
                style="width: 90px;"
                @click.stop="unpinChat(chat.pub)"
              >
                <ion-icon size="large" :icon="heartDislikeOutline" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>

        <!-- Regular Chats List -->
        <ion-list class="regular-list" ref="regularListRef">
          <ion-list-header v-if="pinnedChats.length > 0 && unpinnedChats.length > 0">Recent Chats</ion-list-header>
          <ion-item-sliding
            v-for="chat in sortedUnpinnedChats"
            :key="chat.pub"
            @ionDrag="handleItemDrag"
            @ionDidOpen="handleItemOpen"
            @ionDidClose="handleItemClose"
            :ref="(el: any) => { if (el) itemSlidingRefs[chat.pub] = el; }"
          >
            <ion-item @click="openChat(chat.pub, chat.type)">
              <ion-avatar slot="start" :style="{ border: chat.type === 'group' ? '2px solid #28a745' : '2px solid black', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.649)' }">
                <img style="width: 100%;height: 100%;object-fit: cover;" v-if="chat.type === 'private' && userAvatars[chat.pub]" :src="userAvatars[chat.pub]" />
                <img style="width: 100%;height: 100%;object-fit: cover;" v-else :src="getGunAvatar(chat.pub)" alt="Avatar" />
                <ion-badge v-if="chat.type === 'group'" color="success" style="position: absolute; bottom: -5px; font-size: 10px;padding:3px 5px;text-align: center;align-items: center;justify-content: center;display: flex;width: 100%;margin:0 auto;">Room</ion-badge>
              </ion-avatar>
              <ion-label>
                <div class="top-line">
                  <span class="chat-name">
                    {{ chat.name }}
                    <span v-if="chat.hasNew" class="new-message-dot"></span>
                  </span>
                  <span class="chat-time">{{ formatLastTime(chat.lastTime) }}</span>
                </div>
                <div class="bottom-line">{{ chat.lastMsg || 'No messages yet' }}</div>
              </ion-label>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option
                :color="chat.type === 'group' ? 'danger' : 'danger'"
                style="width: 80px;"
                @click.stop="deleteChat(chat.pub, chat.type)"
              >
                <ion-icon size="large" :icon="trashOutline" />
              </ion-item-option>
              <ion-item-option
                v-if="chat.type === 'private' && !pinnedChatsMap[chat.pub]"
                color="warning"
                style="width: 90px;"
                @click.stop="hideChat(chat.pub)"
              >
                <ion-icon size="large" :icon="eyeOffOutline" />
              </ion-item-option>
              <ion-item-option
                :color="chat.type === 'group' ? 'success' : 'tertiary'"
                style="width: 100px;"
                @click.stop="pinChat(chat.pub)"
              >
                <ion-icon size="large" :icon="heartOutline" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>

      <!-- Rooms View -->
      <div v-show="selectedSegment === 'rooms'" class="view-container rooms-view">
        <div v-if="showScanner" class="card-container" ref="cardContainer" @scroll="updateCenteredCard">
          <div class="card">
            <Scan />
            <div class="card-content">
              <p class="group-pubkey">SEA</p>
            </div>
          </div>
        </div>

        <div v-if="!showScanner" class="card-container" ref="cardContainer" @scroll="updateCenteredCard">
          <div
            v-for="(group, index) in roomGroups"
            :key="group.pub"
            class="card"
            :data-index="index"
            :data-pub="group.pub"
          >
            <object
              v-show="!showCard"
              class="gun-avatar"
              type="image/svg+xml"
              :src="group.pub"
              :key="group.pub"
              :data="
                gunAvatar({
                  pub: group.pub,
                  svg: 'interactive',
                  round: false,
                  dark: isDark,
                  p3: true,
                })
              "
            ></object>
            <div class="card-content" v-show="!showCard">
              <h2 class="group-name">{{ group.name }}</h2>
              <p class="group-pubkey">@{{ formatPubKey(group.pub) }}</p>
            </div>
          </div>
        </div>

        <div class="gameboy">
          <div class="card-reader">
            <div class="status-dot" :style="{ backgroundColor: statusDotColor }"></div>
          </div>
          <div class="gameboy-screen">
            <div class="screen-content">
              <div v-if="showCreateGroup" class="input-container">
                <input
                  v-model="newGroupName"
                  placeholder="Enter group name..."
                  maxlength="10"
                  class="screen-input"
                />
                <ion-button color="dark" fill="outline" @click="createGroupWithToast">Create</ion-button>
              </div>
              <div v-else-if="showJoinGroup" class="input-container">
                <input
                  v-model="joinGroupKey"
                  placeholder="Paste group key JSON..."
                  class="screen-input"
                />
                <ion-button color="dark" fill="outline" @click="joinGroupWithToast">Join</ion-button>
              </div>
              <div v-else-if="tempKeyPair" class="keypair-container">
                <pre>{{ JSON.stringify(tempKeyPair, null, 2) }}</pre>
                <ion-button color="dark" fill="outline" @click="copyKeyPairWithToast(tempKeyPair)">Copy</ion-button>
                <ion-button color="dark" fill="outline" @click="tempKeyPair = null">Close</ion-button>
              </div>
              <QrShow v-else-if="showQRCode && selectedKeyPair" :data="'keypair:' + JSON.stringify(selectedKeyPair)" class="qrcode-image" />
              <pre v-else-if="centeredCard" >{{ JSON.stringify(selectedKeyPair, null, 2) }}</pre>
              <p v-else class="placeholder">TalkFlow</p>
            </div>
          </div>
          <div class="left-buttons">
            <button class="left-button up" @click="toggleCreateGroup">
              <ion-icon :icon="addCircleOutline"></ion-icon>
            </button>
            <button class="left-button down" @click="toggleJoinGroup">
              <ion-icon :icon="personAddOutline"></ion-icon>
            </button>
            <button class="left-button down" @click="openGroupListModal">
              <ion-icon :icon="reorderThreeOutline"></ion-icon>
            </button>
            <button class="left-button down" @click="toggleScanner">
              <ion-icon :icon="scanSharp"></ion-icon>
            </button>
          </div>
          <div class="side-buttons">
            <button class="side-button up" @click="enterGroupChat(centeredCard?.pub)" :disabled="!centeredCard">
              <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
            </button>
            <button class="side-button down" @click="toggleQRCode" :disabled="!centeredCard">
              <ion-icon :icon="qrCodeOutline"></ion-icon>
            </button>
            <button class="side-button up" @click="copyKeyPairWithToast(selectedKeyPair)" :disabled="!centeredCard">
              <ion-icon :icon="copyOutline"></ion-icon>
            </button>
            <button class="side-button down" @click="confirmDelete(centeredCard?.pub)" :disabled="!centeredCard">
              <ion-icon :icon="trashOutline"></ion-icon>
            </button>
          </div>
          <div class="gameboy-buttons">
            <img src="@/assets/gun.svg" style=" width: 15%; min-width: 150px;">
            <button
              class="gameboy-button action"
              :class="{ disabled: isAtLeftEdge }"
              @click="debouncedScrollLeft"
              :disabled="isAtLeftEdge"
            >
              <ion-icon :icon="arrowBackOutline"></ion-icon>
            </button>
            <button
              class="gameboy-button action"
              :class="{ disabled: isAtRightEdge }"
              @click="debouncedScrollRight"
              :disabled="isAtRightEdge"
            >
              <ion-icon :icon="arrowForwardOutline"></ion-icon>
            </button>
          </div>
        </div>

        <!-- Modal for Group List -->
        <ion-modal :is-open="isGroupListModalOpen" @didDismiss="closeGroupListModal" 
        css-class="profile-modal"
            :breakpoints="[0, 1, 1]"
            :initial-breakpoint="1"
        >
          <ion-content>
            <ion-toolbar>
              <ion-buttons slot="end">
                <div @click="closeGroupListModal">Close</div>
              </ion-buttons>
            </ion-toolbar>
            <ion-searchbar
              v-model="roomSearchQuery"
              placeholder="Search groups..."
            ></ion-searchbar>
            <ion-list>
              <ion-item v-for="group in filteredRoomGroups" :key="group.pub" @click="selectRoomGroup(group.pub)">
                <ion-label >
                  <h2>{{ group.name }}</h2>
                  <p>@{{ formatPubKey(group.pub) }}</p>
                  <object
                    class="gun-background"
                    type="image/svg+xml"
                    :src="group.pub"
                    :key="group.pub"
                    :data="
                      gunAvatar({
                        pub: group.pub,
                        svg: 'interactive',
                        round: false,
                        dark: isDark,
                        p3: true,
                      })
                    "
                  ></object>
                </ion-label>
              </ion-item>
              <ion-item v-if="filteredRoomGroups.length === 0">
                <ion-label>No groups found</ion-label>
              </ion-item>
              <ion-item >
                <ion-label>Total Rooms: {{ filteredRoomGroups.length }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-content>
        </ion-modal>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonSearchbar, IonContent, IonList, IonItem,
  IonItemSliding, IonItemOptions, IonItemOption, IonAvatar, IonLabel, IonBadge, IonListHeader, IonContent as IonContentType,
  IonSegment, IonSegmentButton, IonTitle, IonButton, IonIcon, IonInput, IonModal, alertController, toastController,
} from '@ionic/vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useGroupChat } from '@/composables/useGroupChat';
import { 
  eyeOffOutline, heartDislikeOutline, heartOutline, trashOutline,
  addCircleOutline, personAddOutline, scanSharp, reorderThreeOutline,
  chatbubbleEllipsesOutline, qrCodeOutline, copyOutline, arrowBackOutline, 
  arrowForwardOutline
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { Browser } from '@capacitor/browser';
import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
import { useDateFormatter } from '@/composables/useDateFormatter';
import { useSegmentState } from '@/composables/useSegmentState';
import { shallowRef } from 'vue';
import { debounce } from 'lodash';
import Scan from '../phone/Scan.vue';
import QrShow from '../GUNtest/QrShow.vue';

mountClass();
const router = useRouter();
const chatFlowStore = getTalkFlowCore();
const groupChat = useGroupChat();
const { isDark } = useTheme();
const { formatLastTime } = useDateFormatter();

const {
  visibleChatPreviewList, openChat: openPrivateChat, userAvatars, hideCurrentChat,
  onDeleteChatClick, currentChatPub, friendRemarks, getAliasRealtime,
} = chatFlowStore;

const {
  groupSessions, deleteGroup, selectGroup, loadGroups,
  newGroupName, joinGroupKey, groups, tempKeyPair, copyKeyPair,
  createGroup, joinGroup, deleteGroup: deleteRoomGroup, setCurrentGroup,
} = groupChat;

const searchQuery = ref('');
const pinnedListRef = ref(null);
const regularListRef = ref(null);
const contentRef = ref<InstanceType<typeof IonContentType> | null>(null);
const isItemOpen = ref(false);
const itemSlidingRefs = ref<Record<string, any>>({});
const pinnedChatsMap = ref<Record<string, boolean>>({});

// Segment state with persistence - 默认显示聊天列表
const {
  selectedSegment,
  isLoading: isSegmentLoading,
  updateSegmentState
} = useSegmentState({
  pageId: 'ChatS',
  defaultSegment: 'chats',
  validSegments: ['chats', 'rooms']
});

// Handle segment change
function onSegmentChange(event: CustomEvent) {
  const selectedValue = event.detail.value;
  updateSegmentState(selectedValue);
  
  // 当切换到Rooms视图时，初始化Card相关状态
  if (selectedValue === 'rooms') {
    setTimeout(async () => {
      await updateCenteredCard();
      await updateEdgeStatus();
      statusDotColor.value = centeredCard.value ? '#00ff00' : '#ff0000';
    }, 100);
  }
}

// Card.vue related variables
const cardContainer = ref<HTMLElement | null>(null);
const centeredCard = ref<{ pub: string; index: number } | null>(null);
const isAtLeftEdge = ref(true);
const isAtRightEdge = ref(false);
const showQRCode = ref(false);
const showCreateGroup = ref(false);
const showJoinGroup = ref(false);
const showScanner = ref(false);
const showCard = ref(false);
const statusDotColor = ref('#ff0000');
const isGroupListModalOpen = ref(false);
const roomSearchQuery = ref('');

// Room groups computed
const roomGroups = computed(() => groups.value);
const filteredRoomGroups = computed(() => {
  if (!roomSearchQuery.value.trim()) return roomGroups.value;
  const query = roomSearchQuery.value.toLowerCase();
  return roomGroups.value.filter((group) =>
    group.name.toLowerCase().includes(query)
  );
});

const selectedKeyPair = computed(() => {
  if (!centeredCard.value) return null;
  const group = roomGroups.value.find((g) => g.pub === centeredCard.value?.pub);
  return group ? group.pair : null;
});

const keyPairText = shallowRef('');
const qrcode = keyPairText;

// Card.vue methods
const formatPubKey = (pub: string) => {
  return pub.length > 6 ? `${pub.slice(0, 6)}...` : pub;
};

const updateCenteredCard = () => {
  if (!cardContainer.value) {
    centeredCard.value = null;
    updateEdgeStatus();
    return;
  }
  const containerRect = cardContainer.value.getBoundingClientRect();
  const containerCenter = containerRect.left + containerRect.width / 2;
  let closestCard: { pub: string; index: number; distance: number } | null = null;
  const cards = cardContainer.value.querySelectorAll('.card');
  if (cards.length === 0) {
    centeredCard.value = null;
    updateEdgeStatus();
    return;
  }
  for (const [index, card] of Array.from(cards).entries()) {
    const cardRect = (card as HTMLElement).getBoundingClientRect();
    const cardCenter = cardRect.left + cardRect.width / 2;
    const distance = Math.abs(cardCenter - containerCenter);
    const pub = card.getAttribute('data-pub');
    if (pub) {
      if (closestCard === null || distance < closestCard.distance) {
        closestCard = { pub, index, distance };
      }
    }
  }
  if (closestCard) {
    centeredCard.value = { pub: closestCard.pub, index: closestCard.index };
  } else {
    centeredCard.value = null;
  }
  updateEdgeStatus();
};

const updateEdgeStatus = () => {
  if (!cardContainer.value) {
    isAtLeftEdge.value = true;
    isAtRightEdge.value = true;
    return;
  }
  const { scrollLeft, scrollWidth, clientWidth } = cardContainer.value;
  isAtLeftEdge.value = scrollLeft <= 0;
  isAtRightEdge.value = scrollLeft + clientWidth >= scrollWidth - 1;
};

const getCardWidth = () => {
  if (!cardContainer.value) return 300;
  const card = cardContainer.value.querySelector('.card') as HTMLElement | null;
  if (!card) return 300;
  const style = window.getComputedStyle(card);
  const width = card.offsetWidth;
  const marginRight = parseFloat(style.marginRight) || 0;
  return width + marginRight;
};

const scrollLeft = () => {
  if (cardContainer.value && !isAtLeftEdge.value) {
    const cardWidth = getCardWidth();
    cardContainer.value.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    setTimeout(() => {
      updateCenteredCard();
      updateEdgeStatus();
    }, 300);
  }
};

const scrollRight = () => {
  if (cardContainer.value && !isAtRightEdge.value) {
    const cardWidth = getCardWidth();
    cardContainer.value.scrollBy({ left: cardWidth, behavior: 'smooth' });
    setTimeout(() => {
      updateCenteredCard();
      updateEdgeStatus();
    }, 300);
  }
};

const debouncedScrollLeft = debounce(scrollLeft, 300, { leading: true, trailing: false });
const debouncedScrollRight = debounce(scrollRight, 300, { leading: true, trailing: false });

const toggleQRCode = () => {
  showQRCode.value = !showQRCode.value;
  showCreateGroup.value = false;
  showJoinGroup.value = false;
  showScanner.value = false;
};

const toggleCreateGroup = () => {
  showCreateGroup.value = !showCreateGroup.value;
  showJoinGroup.value = false;
  showQRCode.value = false;
  showScanner.value = false;
  newGroupName.value = '';
};

const toggleJoinGroup = () => {
  showJoinGroup.value = !showJoinGroup.value;
  showCreateGroup.value = false;
  showQRCode.value = false;
  showScanner.value = false;
  joinGroupKey.value = '';
};

const toggleScanner = () => {
  showScanner.value = !showScanner.value;
  showCreateGroup.value = false;
  showJoinGroup.value = false;
  showQRCode.value = false;
};

const openGroupListModal = () => {
  showCard.value = true;
  isGroupListModalOpen.value = true;
  roomSearchQuery.value = '';
};

const closeGroupListModal = () => {
  showCard.value = false;
  isGroupListModalOpen.value = false;
  roomSearchQuery.value = '';
};

const selectRoomGroup = (pub: string) => {
  setCurrentGroup(pub);
  closeGroupListModal();
  router.push(`/group/${pub}/messages`);
};

const enterGroupChat = (pub: string | undefined) => {
  if (!pub) return;
  setCurrentGroup(pub);
  router.push(`/group/${pub}/messages`);
};

const createGroupWithToast = async () => {
  if (!newGroupName.value.trim()) {
    const toast = await toastController.create({
      message: 'Please enter a group name',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
    return;
  }
  try {
    await createGroup();
    showCreateGroup.value = false;
    const toast = await toastController.create({
      message: 'Group created successfully',
      duration: 2000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
    setTimeout(async () => {
      await updateCenteredCard();
      await updateEdgeStatus();
      statusDotColor.value = centeredCard.value ? '#00ff00' : '#ff0000';
    }, 100);
  } catch (error) {
    console.error('Failed to create group:', error);
    const toast = await toastController.create({
      message: 'Failed to create group',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};

const joinGroupWithToast = async () => {
  if (!joinGroupKey.value.trim()) {
    const toast = await toastController.create({
      message: 'Please enter a group key',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
    return;
  }
  try {
    await joinGroup();
    showJoinGroup.value = false;
    const toast = await toastController.create({
      message: 'Joined group successfully',
      duration: 2000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
    setTimeout(async () => {
      await updateCenteredCard();
      await updateEdgeStatus();
      statusDotColor.value = centeredCard.value ? '#00ff00' : '#ff0000';
    }, 100);
  } catch (error) {
    console.error('Failed to join group:', error);
    const toast = await toastController.create({
      message: 'Failed to join group',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};

const copyKeyPairWithToast = async (pair: any) => {
  if (!pair) return;
  try {
    await copyKeyPair(pair);
    const toast = await toastController.create({
      message: 'Key pair copied',
      duration: 2000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  } catch (error) {
    console.error('Failed to copy key pair:', error);
    const toast = await toastController.create({
      message: 'Failed to copy key pair',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};

const confirmDelete = async (pub: string | undefined) => {
  if (!pub) return;
  const alert = await alertController.create({
    header: 'Confirm Delete',
    message: `Are you sure you want to delete the group ${roomGroups.value.find((g) => g.pub === pub)?.name || pub}? This action cannot be undone.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          try {
            await deleteRoomGroup(pub);
            centeredCard.value = null;
            const toast = await toastController.create({
              message: 'Group deleted',
              duration: 2000,
              position: 'top',
              color: 'success',
            });
            await toast.present();
            setTimeout(async () => {
              await updateCenteredCard();
              await updateEdgeStatus();
              statusDotColor.value = centeredCard.value ? '#00ff00' : '#ff0000';
            }, 100);
          } catch (error) {
            console.error('Failed to delete group:', error);
            const toast = await toastController.create({
              message: 'Failed to delete group',
              duration: 2000,
              position: 'top',
              color: 'danger',
            });
            await toast.present();
          }
        },
      },
    ],
  });
  await alert.present();
};

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

onMounted(async () => {
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.addEventListener('touchstart', detectSwipeDirection);
  }
  const stored = localStorage.getItem('pinnedChats');
  if (stored) {
    pinnedChatsMap.value = JSON.parse(stored);
  }
  
  // Card.vue initialization
  await loadGroups();
  
  setTimeout(async () => {
    await updateCenteredCard();
    await updateEdgeStatus();
    
    statusDotColor.value = centeredCard.value ? '#00ff00' : '#ff0000';
  }, 500);
});

onBeforeUnmount(() => {
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.removeEventListener('touchstart', detectSwipeDirection);
  }
});

const savePinnedChats = () => {
  localStorage.setItem('pinnedChats', JSON.stringify(pinnedChatsMap.value));
};

const pinChat = (pub: string) => {
  pinnedChatsMap.value = { ...pinnedChatsMap.value, [pub]: true };
  savePinnedChats();
};

const unpinChat = (pub: string) => {
  const newMap = { ...pinnedChatsMap.value };
  delete newMap[pub];
  pinnedChatsMap.value = newMap;
  savePinnedChats();
};

const getDisplayName = (pub: string, type: 'group' | 'private'): string => {
  if (type === 'group') {
    const session = groupSessions.value.find(s => s.groupPub === pub);
    return session?.groupName || `Group_${pub.slice(0, 8)}`;
  }
  const remark = friendRemarks.value[pub]?.remark;
  return (remark && remark.trim() !== '') ? remark : getAliasRealtime(pub);
};

const URL_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/;

async function onSearchEnter() {
  const q = searchQuery.value.trim();
  if (!q) return;
  if (URL_REGEX.test(q)) {
    const url = q.startsWith('http://') || q.startsWith('https://') ? q : `https://${q}`;
    await Browser.open({ url });
    return;
  }
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  await Browser.open({ url: googleUrl });
}

const combinedChats = computed(() => {
  const privateChats = visibleChatPreviewList.value.map(chat => ({
    type: 'private' as const,
    pub: chat.pub,
    name: getDisplayName(chat.pub, 'private'),
    lastMsg: chat.lastMsg || '',
    lastTime: chat.lastTime || new Date().toISOString(),
    hasNew: chat.hasNew || false,
  }));
  const groupChats = groupSessions.value.map(session => ({
    type: 'group' as const,
    pub: session.groupPub,
    name: session.groupName,
    lastMsg: session.previewMessage?.text || '',
    lastTime: session.previewMessage?.formattedTime || new Date().toISOString(),
    hasNew: !session.isRead,
  }));
  return [...privateChats, ...groupChats];
});

const filteredChats = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return combinedChats.value;
  return combinedChats.value.filter(chat => chat.name.toLowerCase().includes(q));
});

const pinnedChats = computed(() => {
  return filteredChats.value.filter(chat => !!pinnedChatsMap.value[chat.pub]);
});

const unpinnedChats = computed(() => {
  return filteredChats.value.filter(chat => !pinnedChatsMap.value[chat.pub]);
});

const sortedPinnedChats = computed(() => {
  return pinnedChats.value.sort((a, b) => {
    const aTime = new Date(a.lastTime).getTime();
    const bTime = new Date(b.lastTime).getTime();
    return bTime - aTime;
  });
});

const sortedUnpinnedChats = computed(() => {
  return unpinnedChats.value.sort((a, b) => {
    const aTime = new Date(a.lastTime).getTime();
    const bTime = new Date(b.lastTime).getTime();
    return bTime - aTime;
  });
});

const openChat = (pub: string, type: 'group' | 'private') => {
  if (type === 'group') {
    selectGroup(pub);
    router.push(`/group/${pub}/messages`);
  } else {
    openPrivateChat(pub);
  }
};

const deleteChat = async (pub: string, type: 'group' | 'private') => {
  if (confirm('Sure?')) {
    if (type === 'group') {
      await deleteGroup(pub);
    } else {
      currentChatPub.value = pub;
      await onDeleteChatClick(pub);
      await hideCurrentChat();
    }
    unpinChat(pub);
  }
};

const hideChat = async (pub: string) => {
  currentChatPub.value = pub;
  await hideCurrentChat();
};

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true,
  });
};

watch(groupSessions, () => {
  combinedChats.value; // Force recomputation
}, { deep: true });

watch(pinnedChatsMap, () => {
  // Trigger reactivity
}, { deep: true });

watch(pinnedChats, () => {
  // Trigger reactivity
}, { deep: true });

// Card.vue watchers
watch(selectedKeyPair, (newValue) => {
  keyPairText.value = newValue ? JSON.stringify(newValue, null, 2) : '';
});

watch(centeredCard, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    statusDotColor.value = '#0000ff'; // 蓝色表示切换中
    setTimeout(() => {
      statusDotColor.value = newValue ? '#00ff00' : '#ff0000'; // 绿色表示已选中，红色表示未选中
    }, 200);
  }
});

// 监听 groups 状态变化
watch(roomGroups, (newGroups, oldGroups) => {
  if (oldGroups && newGroups.length < oldGroups.length) {
    console.warn('⚠️ 群组数量减少! 可能存在数据重置问题');
  }
  
  if (oldGroups && oldGroups.length > 0 && newGroups.length === 0) {
    console.error('❌ 群组被清空! 这不应该发生');
  }
}, { deep: true });
</script>

<style scoped>
.liquid-toolbar {
  --border-color: transparent;
  --background: var(--background-color-no);
  backdrop-filter: blur(10px);
}

ion-avatar {
  width: 55px;
  height: 55px;
  position: relative;
  margin-right: 12px;
}

.top-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.chat-name {
  font-size: 1.5rem;
  color: var(--ion-color-dark, #333);
  font-weight: 500;
}

.chat-time {
  font-size: 0.85rem;
  color: #999;
  margin-left: 8px;
}

.bottom-line {
  margin-top: 4px;
  font-size: 0.9rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.new-message-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: red;
  border-radius: 50%;
  margin-left: 8px;
}

.pinned-list {
  --background: transparent;
  margin-bottom: 16px;
  padding: 0 8px;
}

.regular-list {
  --background: transparent;
  padding: 0 8px 200px 8px;
  overflow-y: auto;
  background: transparent;
}

ion-list-header {
  font-size: 1.2rem;
  color: var(--ion-color-dark, #333);
  padding: 16px 8px 8px 8px;
  margin: 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

ion-item {
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  --border-radius: 12px;
  /* margin-bottom: 8px; */
  /* --background: rgba(255, 255, 255, 0.1); */
  --border-color: transparent;
  /* backdrop-filter: blur(10px); */
  /* border: 1px solid rgba(255, 255, 255, 0.1); */
}

ion-item:hover {
  /* --background: rgba(255, 255, 255, 0.15); */
  /* transform: translateY(-1px); */
  transition: all 0.2s ease;
}

ion-item-option[color="success"] {
  --background: linear-gradient(45deg, #28a745, #34ce57);
}

.cosmic-content {
  --background: transparent;
  position: relative;
  overflow: visible;
  touch-action: auto;
  padding: 8px 0;
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

/* 为滑动选项添加更好的间距 */
ion-item-options {
  border-radius: 12px;
  margin: 0;
}

ion-item-option {
  margin: 0 2px;
  border-radius: 8px;
}

/* Segment Tabs */
.segment-tabs {
  --background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  position: relative;
}

.segment-tabs ion-segment-button {
  --background: transparent;
  --background-checked: var(--ion-color-primary);
  --color: var(--ion-color-dark);
  --color-checked: #fff;
  --indicator-color: transparent;
  border-radius: 8px;
  margin: 4px;
  position: relative;
}

/* View Containers */
.view-container {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s ease-in-out;
}

/* Rooms View Styles */
.rooms-view {
  padding: 0;
  margin: 0;
}

.gun-avatar {
  position: absolute;
  width: 300px;
  height: 200px;
  border-radius: 12px;
  z-index: -1;
  animation: cardFadeIn 0.5s ease forwards;
  transition: opacity 0.5s ease;
}

.group-name {
  font-size: 39px;
  font-weight: 600;
  color: var(--ion-color-dark);
  margin-bottom: 8px;
  position: absolute;
  bottom: 0;
  right: 15px;
}

.group-pubkey {
  font-size: 12px;
  color: var(--ion-color-medium);
  cursor: pointer;
  position: absolute;
  top: 0;
  left: 15px;
}

.card-container {
  margin: 0 auto;
  width: 100%;
  height: 200px;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.card-container::-webkit-scrollbar {
  display: none;
}

.card-container::before,
.card-container::after {
  content: '';
  width: 500px;
  flex-shrink: 0;
}

.card {
  display: inline-block;
  border-radius: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  margin-right: 10px;
  scroll-snap-align: center;
  flex-shrink: 0;
  max-width: 300px;
  max-height: 200px;
  min-height: 200px;
  min-width: 300px;
  width: 96%;
  height: 50%;
}

.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.gameboy {
  max-width: 500px;
  max-height: 500px;
  min-height: 300px;
  width: 96%;
  height: 50%;
  background: #d3d3d3;
  border-radius: 20px 20px 60px 20px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2), inset 0 2px 5px rgba(255, 255, 255, 0.5);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px auto;
}

.card-reader {
  width: 130px;
  height: 39px;
  background: #b0b0b0;
  border-radius: 5px;
  position: absolute;
  top: -23px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  position: relative;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  transition: background-color 0.3s ease;
}

.gameboy-screen {
  width: 260px;
  height: 300px;
  background: #2b2b2b;
  border: 10px solid #8b8b8b;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  scrollbar-width: none;
}

.gameboy-screen::-webkit-scrollbar {
  display: none;
}

.gameboy-screen:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.05) 0,
    rgba(255, 255, 255, 0.05) 2px,
    transparent 2px,
    transparent 4px
  );
  pointer-events: none;
}

.screen-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 10px;
  color: #c0c0c0;
  font-family: monospace;
  font-size: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  scrollbar-width: none;
  background: transparent;
}

.screen-content::-webkit-scrollbar {
  display: none;
}

.screen-content .placeholder {
  margin: 0;
  text-align: center;
  color: #888;
  font-style: italic;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  scrollbar-width: none;
  background: transparent;
}

.screen-content .qrcode-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  scrollbar-width: none;
  animation: cardFadeIn 0.5s ease forwards;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  align-items: center;
}

.screen-input {
  --background: #fff;
  --color: #000;
  font-size: 10px;
  width: 90%;
  border: none;
  outline: none;
  animation: cardFadeIn 0.5s ease forwards;
}

.keypair-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  width: 100%;
  scrollbar-width: none;
}

.keypair-container pre {
  background: #f4f4f4;
  padding: 5px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 8px;
  max-height: 200px;
  width: 90%;
  scrollbar-width: none;
}

.left-buttons {
  position: absolute;
  left: 10px;
  top: 50px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.left-button {
  width: 30px;
  height: 30px;
  border-radius: 15px;
  border: none;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #4a4a4a, #2e2e2e);
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4), -2px -2px 4px rgba(255, 255, 255, 0.1);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.left-button ion-icon {
  font-size: 16px;
  color: #fff;
}

.left-button:active {
  transform: translateY(1px);
  box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4), -1px -1px 2px rgba(255, 255, 255, 0.1);
}

.side-buttons {
  position: absolute;
  right: 10px;
  top: 50px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.side-button {
  width: 30px;
  height: 30px;
  border-radius: 15px;
  border: none;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #4a4a4a, #2e2e2e);
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4), -2px -2px 4px rgba(255, 255, 255, 0.1);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.side-button ion-icon {
  font-size: 16px;
  color: #fff;
}

.side-button:active {
  transform: translateY(1px);
  box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4), -1px -1px 2px rgba(255, 255, 255, 0.1);
}

.side-button:disabled {
  background: linear-gradient(145deg, #888, #666);
  box-shadow: none;
  cursor: not-allowed;
}

.side-button:disabled ion-icon {
  color: #ccc;
}

.gameboy-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px;
  justify-content: center;
}

.gameboy-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  border: none;
  outline: none;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.gameboy-button ion-icon {
  font-size: 20px;
  color: #fff;
}

.gameboy-button.action {
  background: linear-gradient(145deg, #4a4a4a, #2e2e2e);
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.1);
}

.gameboy-button:active:not(.disabled) {
  transform: translateY(2px);
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4), -1px -1px 3px rgba(255, 255, 255, 0.1);
}

.gameboy-button.disabled {
  background: linear-gradient(145deg, #888, #666);
  box-shadow: none;
  cursor: not-allowed;
}

.gameboy-button.disabled ion-icon {
  color: #ccc;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: cardFadeIn 0.5s ease forwards;
}

.gun-background {
  position: absolute;
  width: 60%;
  height: 90%;
  border-radius: 12px;
  z-index: -1;
  top: 6px;
  right: 0;
  animation: cardFadeIn 0.5s ease forwards;
}

ion-modal {
  --background: var(--ion-background-color, #fff);
  --border-radius: 10px;
  --max-width: 500px;
  --max-height: 80%;
}

</style> 