<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonSearchbar, IonContent, IonList, IonItem,IonButtons,
  IonItemSliding, IonItemOptions, IonItemOption, IonAvatar, IonLabel, IonBadge, IonListHeader, IonContent as IonContentType,
  IonSegment, IonSegmentButton, IonTitle, IonButton, IonIcon, IonInput, IonModal, IonPopover, alertController, toastController,
  IonRefresher, IonRefresherContent
} from '@ionic/vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useGroupChat } from '@/composables/useGroupChat';
import { 
  eyeOffOutline, heartDislikeOutline,
  heartOutline, trashOutline,
  addCircleOutline, personAddOutline, scanSharp, reorderThreeOutline,
  chatbubbleEllipsesOutline, qrCodeOutline, copyOutline, arrowBackOutline, addOutline,peopleOutline,closeOutline, scanOutline,
  arrowForwardOutline,
  refreshCircleOutline,
  walletOutline
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { Browser } from '@capacitor/browser';
import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
import { useDateFormatter } from '@/composables/useDateFormatter';
import { useSegmentState } from '@/composables/useSegmentState';
import { shallowRef } from 'vue';
import { debounce } from 'lodash';
import { useI18n } from 'vue-i18n';

mountClass();
const router = useRouter();
const chatFlowStore = getTalkFlowCore();
const groupChat = useGroupChat();
const { isDark } = useTheme();
const { formatLastTime } = useDateFormatter();
const { t } = useI18n();

const {
  visibleChatPreviewList, openChat: openPrivateChat, userAvatars, hideCurrentChat,
  onDeleteChatClick, currentChatPub, friendRemarks, getAliasRealtime,sendChat,buddyList,currentUserPub,
  restartAllListeners,triggerLightHaptic
} = chatFlowStore;

const {
  groupSessions, deleteGroup, selectGroup, loadGroups,
  newGroupName, joinGroupKey, groups, tempKeyPair, copyKeyPair,
  createGroup, joinGroup, deleteGroup: deleteRoomGroup, setCurrentGroup,
  groupPreviews, markGroupAsRead, membersByGroup,
} = groupChat;

const searchQuery = ref('');
const isSearchFocused = ref(false);
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
const searchedGroupInfo = ref<{ name: string; pub: string } | null>(null);
const isSearchingGroup = ref(false);
const showJoinGroup = ref(false);
const showScanner = ref(false);
const showCard = ref(false);
const statusDotColor = ref('#ff0000');
const isGroupListModalOpen = ref(false);
const roomSearchQuery = ref('');
const titleRef = ref<HTMLElement | null>(null);
const isAnimating = ref(false);
const page = ref<any>(null);
const presentingElement = ref<HTMLElement | undefined>(undefined);
onMounted(() => {
  presentingElement.value = (page as any)?.value?.$el || (page as any)?.value || undefined;
});

// Room groups computed
const roomGroups = computed(() => groups.value);

// 获取群聊成员数量的计算属性
const getGroupMemberCount = (groupPub: string): number => {
  const members = membersByGroup.value[groupPub] || [];
  return members.length;
};
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
  markGroupAsRead(pub);
  closeGroupListModal();
  router.push(`/group/${pub}/messages`);
};

const enterGroupChat = (pub: string | undefined) => {
  if (!pub) return;
  setCurrentGroup(pub);
  markGroupAsRead(pub);
  router.push(`/group/${pub}/messages`);
};

const createGroupWithToast = async () => {
  if (!newGroupName.value.trim()) {
    const toast = await toastController.create({
      message: 'Please enter group name',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
    return;
  }
  try {
    await createGroup();
    resetToDefaultState();
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
    
    const toast = await toastController.create({
      message: 'Failed to create group',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};

const onJoinGroupKeyInput = async () => {
  const keyValue = joinGroupKey.value.trim();
  
  if (!keyValue) {
    searchedGroupInfo.value = null;
    isSearchingGroup.value = false;
    return;
  }
  
  try {
    isSearchingGroup.value = true;
    searchedGroupInfo.value = null;
    
    // Try to parse the key pair
    const keyPair = JSON.parse(keyValue);
    if (!keyPair.pub || !keyPair.priv || !keyPair.epub || !keyPair.epriv) {
      throw new Error('Invalid key pair format');
    }
    
    // Check if already in this group
    const existingGroup = groups.value.find(g => g.pub === keyPair.pub);
    if (existingGroup) {
      searchedGroupInfo.value = {
        name: existingGroup.name,
        pub: existingGroup.pub
      };
      return;
    }
    
    // Try to fetch group name from network
    const { gun } = getTalkFlowCore();
    const groupNameData: any = await new Promise(resolve => {
      const timeout = setTimeout(() => resolve(null), 3000); // 3 second timeout
      gun.get(`group_name_${keyPair.pub}`).once((data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
    
    const groupName = groupNameData?.name || `Group ${keyPair.pub.slice(0, 8)}...`;
    
    searchedGroupInfo.value = {
      name: groupName,
      pub: keyPair.pub
    };
    
  } catch (error) {
    searchedGroupInfo.value = null;
  } finally {
    isSearchingGroup.value = false;
  }
};

const resetToDefaultState = () => {
  showCreateGroup.value = false;
  showJoinGroup.value = false;
  showQRCode.value = false;
  showScanner.value = false;
  tempKeyPair.value = null;
  newGroupName.value = '';
  joinGroupKey.value = '';
  searchedGroupInfo.value = null;
  isSearchingGroup.value = false;
};

const triggerTitleAnimation = () => {
  if (isAnimating.value || !titleRef.value) return;
  isAnimating.value = true;
  titleRef.value.classList.add('title-gradient-animation');
  
  setTimeout(() => {
    if (titleRef.value) {
      titleRef.value.classList.remove('title-gradient-animation');
    }
    isAnimating.value = false;
  }, 1000);
};

const joinGroupWithToast = async () => {
  if (!joinGroupKey.value.trim() || !searchedGroupInfo.value) {
    const toast = await toastController.create({
      message: 'Please enter a valid group key',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
    return;
  }
  try {
    await joinGroup();
    resetToDefaultState();
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
      message: t('keyPairCopied'),
      duration: 2000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  } catch (error) {
    
    const toast = await toastController.create({
      message: t('failedToCopyKeyPair'),
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
    header: t('confirmDelete'),
    message: t('confirmDeleteGroup', { groupName: roomGroups.value.find((g) => g.pub === pub)?.name || pub }),
    buttons: [
      { text: t('cancel'), role: 'cancel' },
      {
        text: t('delete'),
        role: 'destructive',
        handler: async () => {
          try {
            await deleteRoomGroup(pub);
            centeredCard.value = null;
            const toast = await toastController.create({
              message: t('groupDeleted'),
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
            
            const toast = await toastController.create({
              message: t('failedToDeleteGroup'),
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
  
  // 触发标题动画
  setTimeout(() => {
    triggerTitleAnimation();
  }, 100);
});

onBeforeUnmount(() => {
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.removeEventListener('touchstart', detectSwipeDirection);
  }
  
  // 清理长按定时器
  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
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

// 搜索框聚焦事件处理
function onSearchFocus() {
  isSearchFocused.value = true;
}

// 搜索框失焦事件处理
function onSearchBlur() {
  isSearchFocused.value = false;
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
    lastMsg: session.previewMessage?.content || '',
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
    // markGroupAsRead(pub);
    router.push(`/GroupMessages`);
  } else {
    openPrivateChat(pub);
  }
};

const deleteChat = async (pub: string, type: 'group' | 'private') => {
  if (confirm('Sure?')) {
    if (type === 'group') {
       deleteGroup(pub);
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
  } as any);
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
    
  }
  
  if (oldGroups && oldGroups.length > 0 && newGroups.length === 0) {
    
  }
}, { deep: true });




// Popover状态
const popoverRef = ref<any>(null);
const chatContextPopoverRef = ref<any>(null);
const selectedChatForContext = ref<{pub: string, type: 'group' | 'private'} | null>(null);
const longPressedChatPub = ref<string | null>(null);

// 发起群聊模态窗口状态
const isCreateGroupModalOpen = ref(false);
const isContactModalOpen = ref(false);
const contactSearchQuery = ref('');
const selectedContacts = ref<Array<{pub: string, name: string, avatar?: string}>>([]);
const groupNameInput = ref('');

// Rooms半屏幕模态窗口状态
const isRoomsModalOpen = ref(false);


// 下拉刷新函数
const refreshChats = async (event: CustomEvent) => {
  try {
    // 重新加载聊天列表和群组数据
    restartAllListeners();
    await loadGroups();
    
    // 完成刷新
    await event.detail.complete();
  } catch (error) {
    //console.error('刷新聊天列表失败:', error);
    await event.detail.complete();
  }
};

const closePopover = () => {
  if (popoverRef.value) {
    popoverRef.value.$el.dismiss();
  }
};

const openCreateGroupModal = () => {
  closePopover();
  isCreateGroupModalOpen.value = true;
  selectedContacts.value = [];
  contactSearchQuery.value = '';
  groupNameInput.value = ''; // 清空输入框，让用户自己设置名称
};

const closeCreateGroupModal = () => {
  isCreateGroupModalOpen.value = false;
  selectedContacts.value = [];
  contactSearchQuery.value = '';
  groupNameInput.value = '';
};
const openContactModal = () => {

  isContactModalOpen.value = true;

};

const closeContactModal = () => {
  isContactModalOpen.value = false;
};
// Rooms模态窗口相关函数
const openRoomsModal = () => {
  closePopover();
  isRoomsModalOpen.value = true;
};

const closeRoomsModal = () => {
  isRoomsModalOpen.value = false;
};

// 获取联系人列表 - 从好友列表中获取
const allContacts = computed(() => {
  return buddyList.value
    .filter(buddy => buddy.pub) // 确保有pub
    .map(buddy => ({
      pub: buddy.pub,
      name: getDisplayName(buddy.pub, 'private'),
      avatar: userAvatars.value[buddy.pub] || null
    }));
});

const filteredContacts = computed(() => {
  const query = contactSearchQuery.value.toLowerCase().trim();
  if (!query) return allContacts.value;
  return allContacts.value.filter(contact => 
    contact.name.toLowerCase().includes(query) ||
    contact.pub.toLowerCase().includes(query)
  );
});

const isContactSelected = (pub: string) => {
  return selectedContacts.value.some(contact => contact.pub === pub);
};

const toggleContactSelection = (contact: {pub: string, name: string, avatar?: string}) => {
  const index = selectedContacts.value.findIndex(c => c.pub === contact.pub);
  if (index >= 0) {
    selectedContacts.value.splice(index, 1);
  } else {
    selectedContacts.value.push(contact);
  }
};

const removeFromSelection = (pub: string) => {
  const index = selectedContacts.value.findIndex(c => c.pub === pub);
  if (index >= 0) {
    selectedContacts.value.splice(index, 1);
  }
};

const onContactSearch = () => {
  // 搜索逻辑已在computed中处理
};

const sendGroupChatInvitations = async () => {
  if (selectedContacts.value.length === 0) return;
  
  try {
    // 验证群聊名称
    const finalGroupName = groupNameInput.value.trim() || `CuteRoom`;
    
    // 创建真正的群聊
    newGroupName.value = finalGroupName;
    await createGroup();
    
    // 获取刚创建的群聊信息
    const newGroup = groups.value[groups.value.length - 1]; // 最新创建的群聊
    const keyPair = tempKeyPair.value || newGroup.pair;
    
    if (!keyPair) {
      throw new Error(t('createGroupFailedGetKeyPair'));
    }
    
   // 
    
    // 🚀 全新策略：使用XML标签格式，完全避免括号问题
    const groupInvitation = `🎯GROUP_INVITATION_START🎯<group>${finalGroupName}</group><pub>${keyPair.pub}</pub><priv>${keyPair.priv}</priv><epub>${keyPair.epub}</epub><epriv>${keyPair.epriv}</epriv><inviter>${currentUserPub.value}</inviter><time>${new Date().toISOString()}</time>🎯GROUP_INVITATION_END🎯`;
    
   // 
    
    // 为每个选中的联系人发送群聊邀请消息
    const invitationPromises = selectedContacts.value.map(async (contact) => {
      // 发送邀请消息到私聊
      const currentChatBackup = currentChatPub.value; // 备份当前聊天
      currentChatPub.value = contact.pub;
      await sendChat('text', groupInvitation);
      currentChatPub.value = currentChatBackup; // 恢复当前聊天
    });
    
    await Promise.all(invitationPromises);
    
    const toast = await toastController.create({
      message: t('invitationSent', { groupName: finalGroupName, count: selectedContacts.value.length }),
      duration: 3000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
    
    closeCreateGroupModal();
  } catch (error) {
    //
    const toast = await toastController.create({
      message: t('invitationFailed'),
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};

const goToAddFriend = () => {
  closePopover();
  router.push('/FriendRequests');
};

const goToScan = () => {
  closePopover();
  router.push('/ScanPage');
};

const goToJoinGroup = () => {
  closePopover();
  // Call toggleJoinGroup to display the join group input in the rooms view
  selectedSegment.value = 'rooms'; // Ensure the rooms view is active
  toggleJoinGroup();
};

// 长按相关方法
const handleChatLongPress = (chat: {pub: string, type: 'group' | 'private'}, event: Event) => {
  triggerLightHaptic(); // 触发震动
  selectedChatForContext.value = chat;
  longPressedChatPub.value = chat.pub; // 设置长按状态
  
  // 设置Popover的位置
  if (chatContextPopoverRef.value) {
    chatContextPopoverRef.value.$el.event = event;
    chatContextPopoverRef.value.$el.present();
  }
};

const closeChatContextPopover = () => {
  if (chatContextPopoverRef.value) {
    chatContextPopoverRef.value.$el.dismiss();
  }
  selectedChatForContext.value = null;
  longPressedChatPub.value = null; // 清除长按状态
};

const handleContextDelete = () => {
  if (selectedChatForContext.value) {
    deleteChat(selectedChatForContext.value.pub, selectedChatForContext.value.type);
  }
  closeChatContextPopover();
};

const handleContextHide = () => {
  if (selectedChatForContext.value && selectedChatForContext.value.type === 'private') {
    hideChat(selectedChatForContext.value.pub);
  }
  closeChatContextPopover();
};

const handleContextPin = () => {
  if (selectedChatForContext.value) {
    pinChat(selectedChatForContext.value.pub);
  }
  closeChatContextPopover();
};

const handleContextUnpin = () => {
  if (selectedChatForContext.value) {
    unpinChat(selectedChatForContext.value.pub);
  }
  closeChatContextPopover();
};

// 检查当前选中的聊天是否已置顶
const isSelectedChatPinned = computed(() => {
  if (!selectedChatForContext.value) return false;
  return !!pinnedChatsMap.value[selectedChatForContext.value.pub];
});

// 触摸事件处理（用于长按检测）
let touchTimer: NodeJS.Timeout | null = null;
let currentTouchChat: {pub: string, type: 'group' | 'private'} | null = null;

const handleTouchStart = (chat: {pub: string, type: 'group' | 'private'}, event: TouchEvent) => {
  currentTouchChat = chat;
  touchTimer = setTimeout(() => {
    if (currentTouchChat) {
      handleChatLongPress(chat, event);
    }
  }, 500); // 500ms长按
};

const handleTouchEnd = () => {
  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
  }
  currentTouchChat = null;
  // 如果没有显示Popover，清除长按状态
  if (!selectedChatForContext.value) {
    longPressedChatPub.value = null;
  }
};

const handleTouchMove = () => {
  // 如果用户移动手指，取消长按
  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
  }
  currentTouchChat = null;
  // 移动时清除长按状态
  if (!selectedChatForContext.value) {
    longPressedChatPub.value = null;
  }
};

</script>

<template>
  <ion-page ref="page" @click="closeOpenedItems">
    <ion-header :translucent="true"   collapse="fade">

      <ion-toolbar v-show="!isSearchFocused">
         <ion-buttons slot="start" v-show="!isSearchFocused">
          <ion-button  expand="block" fill="clear" @click="openRoomsModal">
            <!-- <ion-icon :icon="walletOutline" ></ion-icon> -->
             GroupCard
          </ion-button>
        </ion-buttons>

        <ion-title v-show="!isSearchFocused">
         TalkFlow
        </ion-title>

        <ion-buttons slot="end"  v-show="!isSearchFocused">
          <ion-button  expand="block" fill="clear" id="menu-trigger">
            <ion-icon  :icon="addOutline" ></ion-icon>
          </ion-button>
        </ion-buttons>

      </ion-toolbar>
    
    </ion-header>

    <!-- Popover 菜单 -->
    <ion-popover ref="popoverRef" trigger="menu-trigger" trigger-action="click">
      <ion-content>
        <ion-list>
          <ion-item button @click="openCreateGroupModal"  class="popover-item">
     <!-- <ion-icon :icon="peopleOutline" slot="start" class="popover-icon"></ion-icon> -->
            <ion-label  class="popover-label">{{ $t('startGroupChat') || '发起群聊' }}</ion-label>
          </ion-item>
         
          <ion-item button @click="goToAddFriend"  class="popover-item">
 <!-- <ion-icon :icon="personAddOutline" slot="start" class="popover-icon"></ion-icon> -->
            <ion-label  class="popover-label">{{ $t('addfriend1') || '添加好友' }}</ion-label>
          </ion-item>
          <ion-item button @click="goToScan" lines="none" class="popover-item">
  <!-- <ion-icon :icon="scanOutline" slot="start" class="popover-icon"></ion-icon> -->
            <ion-label  class="popover-label">{{ $t('scanner') || '扫一扫' }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <!-- 会话列表长按菜单 Popover -->
    <ion-popover ref="chatContextPopoverRef" trigger-action="click" @didDismiss="closeChatContextPopover">
      <ion-content>
        <ion-list>
          <ion-item button @click="handleContextDelete" class="popover-item">
            <ion-icon :icon="trashOutline" slot="start" class="popover-icon" color="danger"></ion-icon>
            <ion-label style="font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;" class="popover-label">{{ selectedChatForContext?.type === 'group' ? $t('deleteGroup') || '删除群聊' : $t('deleteChat') || '删除聊天' }}</ion-label>
          </ion-item>
          <ion-item v-if="selectedChatForContext?.type === 'private' && !isSelectedChatPinned" button @click="handleContextHide" class="popover-item">
            <ion-icon :icon="eyeOffOutline" slot="start" class="popover-icon" color="warning"></ion-icon>
            <ion-label style="font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;" class="popover-label">{{ $t('hideChat') || '隐藏聊天' }}</ion-label>
          </ion-item>
          <ion-item v-if="!isSelectedChatPinned" button @click="handleContextPin" lines="none" class="popover-item">
            <ion-icon :icon="heartOutline" slot="start" class="popover-icon" color="tertiary"></ion-icon>
            <ion-label style="font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;" class="popover-label">{{ $t('pinChat') || '置顶聊天' }}</ion-label>
          </ion-item>
          <ion-item v-if="isSelectedChatPinned" button @click="handleContextUnpin" lines="none" class="popover-item">
            <ion-icon :icon="heartDislikeOutline" slot="start" class="popover-icon" color="medium"></ion-icon>
            <ion-label style="font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;" class="popover-label">{{ $t('unpinChat') || '取消置顶' }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

   
    <ion-modal ref="modal" id="open-modal" :is-open="isRoomsModalOpen" @didDismiss="closeRoomsModal" 
     
      :presenting-element="presentingElement"
      :swipe-to-close="true"
      :can-dismiss="true"
    >
      <ion-header :translucent="true"   collapse="fade">
       

       <ion-toolbar >
          <!-- <ion-title >{{ $t('Rooms') || 'Rooms' }}</ion-title> -->
          <ion-buttons slot="end">
            <ion-button fill="clear" @click="closeRoomsModal">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
 <!-- Rooms View Content -->
        <div class="view-container rooms-view">
          <!-- Dashed Screen Container - replaces card container when needed -->
          <div v-if="showCreateGroup || showJoinGroup" class="dashed-screen-main-container">
            <!-- Create Group Mode -->
            <div v-if="showCreateGroup" class="dashed-screen-container">
              <div class="dashed-screen">
                <div class="screen-prompt">
                  <p v-if="!newGroupName.trim()" class="prompt-text">Enter group name in the input field below</p>
                  <p v-else class="prompt-text">Group name: "{{ newGroupName }}"</p>
                  <p class="sub-prompt">Click Create to start your group chat</p>
                </div>
              </div>
              <div class="input-container">
                <input
                  v-model="newGroupName"
                  placeholder="Enter group name..."
                  maxlength="20"
                  class="screen-input"
                />
                <ion-button color="dark" fill="outline" @click="createGroupWithToast">Create</ion-button>
              </div>
            </div>
            
            <!-- Join Group Mode -->
            <div v-else-if="showJoinGroup" class="dashed-screen-container">
              <div class="dashed-screen">
                <div class="screen-prompt">
                  <p v-if="!joinGroupKey.trim()" class="prompt-text">Paste group key pair in the input field to search for groups</p>
                  <div v-else-if="searchedGroupInfo" class="group-info">
                    <p class="prompt-text">Found Group:</p>
                    <p class="group-name">{{ searchedGroupInfo.name }}</p>
                    <p class="group-id">@{{ formatPubKey(searchedGroupInfo.pub) }}</p>
                    <p class="sub-prompt">Click Join to enter this group</p>
                  </div>
                  <div v-else-if="isSearchingGroup" class="searching-info">
                    <p class="prompt-text">Searching for group...</p>
                    <div class="loading-dots">...</div>
                  </div>
                  <div v-else class="error-info">
                    <p class="prompt-text">Invalid group key format</p>
                    <p class="sub-prompt">Please check your key pair</p>
                  </div>
                </div>
              </div>
              <div class="input-container">
                <input
                  v-model="joinGroupKey"
                  placeholder="Paste group key..."
                  class="screen-input"
                  @input="onJoinGroupKeyInput"
                />
                <ion-button color="dark" fill="outline" @click="joinGroupWithToast" :disabled="!searchedGroupInfo">Join</ion-button>
              </div>
            </div>
          </div>
          
          <!-- Scanner View -->
          <div v-else-if="showScanner" class="card-container" ref="cardContainer" @scroll="updateCenteredCard">
            <div class="card">
              <Scan />
              <div class="card-content">
                <p class="group-pubkey">SEA</p>
              </div>
            </div>
          </div>

          <!-- Normal Card Container -->
          <div v-else class="card-container" ref="cardContainer" @scroll="updateCenteredCard">
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
                  } as any)
                "
              ></object>
              <div class="card-content" v-show="!showCard">
                <h2 class="group-name" style="margin-bottom: 20px;">
                  {{ group.name }}
                  <!-- <span class="member-count">({{ getGroupMemberCount(group.pub) }})</span> -->
                </h2>
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
                <!-- Key Pair Display Mode -->
                <div v-if="tempKeyPair" class="keypair-container">
                  <pre>{{ JSON.stringify(tempKeyPair, null, 2) }}</pre>
                  <ion-button color="dark" fill="outline" @click="copyKeyPairWithToast(tempKeyPair)">Copy</ion-button>
                  <ion-button color="dark" fill="outline" @click="resetToDefaultState">Close</ion-button>
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
              <img src="@/assets/gun.svg" style=" width: 15%; min-width: 100px;margin-bottom: 50px;">
            
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
              <div style="height: 100px;"></div>
            </div>
          </div>
          
          <!-- Modal for Group List -->
          <ion-modal :is-open="isGroupListModalOpen" @didDismiss="closeGroupListModal" 
          css-class="profile-modal"
              :breakpoints="[0, 1, 1]"
              :initial-breakpoint="1"
              :presenting-element="presentingElement"
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
                        } as any)
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
    </ion-modal>

    <!-- 发起群聊模态窗口 -->
    <ion-modal

    :is-open="isCreateGroupModalOpen" @didDismiss="closeCreateGroupModal" 
    
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"

    
    >
      <ion-header :translucent="true"   collapse="fade">
        <ion-toolbar>
          <ion-title>Create Group</ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear" @click="closeCreateGroupModal">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content>

         <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
         Create Group
            </h1>
          </ion-toolbar>
        </ion-header>

        <!-- 群聊名称设置 -->
        <div class="group-name-section">
          <ion-item>
            <!-- <ion-label style="font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;font-weight: 900;" position="stacked">{{ $t('groupName') || '群聊名称' }}</ion-label> -->
            <ion-input
              v-model="groupNameInput"
              :placeholder="$t('enterGroupName') || '请输入群聊名称'"
              :maxlength="20"
              clear-input
            ></ion-input>
          </ion-item>
        </div>

        <!-- 搜索栏 -->
        <ion-searchbar
          v-model="contactSearchQuery"
          :placeholder="$t('searchContacts') || '搜索联系人'"
          @ionInput="onContactSearch"
        ></ion-searchbar>

        <!-- 联系人列表 -->
        <ion-list class="contacts-list">
          <ion-list-header>
            <ion-label style="font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;font-weight: 900;">{{ $t('contacts') || '联系人' }}</ion-label>
          </ion-list-header>
          <ion-item 
            v-for="contact in filteredContacts" 
            :key="contact.pub" 
            button 
            @click="toggleContactSelection(contact)"
            :class="{ 'selected': isContactSelected(contact.pub) }"
          >
            <ion-avatar slot="start">
              <img :src="contact.avatar || getGunAvatar(contact.pub)" :alt="contact.name" />
            </ion-avatar>
            <ion-label>
              <h3>{{ contact.name }}</h3>
              <p>@{{ contact.pub.slice(0, 8) }}...</p>
            </ion-label>
            <ion-checkbox 
              slot="end" 
              :checked="isContactSelected(contact.pub)"
              @ionChange="toggleContactSelection(contact)"
            />
          </ion-item>
          <ion-item v-if="filteredContacts.length === 0">
            <ion-label style="font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;font-weight: 900;">{{ $t('noContacts') || '没有联系人' }}</ion-label>
          </ion-item>
        </ion-list>

        <!-- 发起群聊按钮 -->
        <div class="create-group-button-container">
          <ion-button 
            expand="block"
            fill="outline"
            @click="sendGroupChatInvitations"
            :disabled="selectedContacts.length === 0"
           
            style="font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;font-weight: 900;"
          >
            <!-- <ion-icon :icon="peopleOutline" slot="start"></ion-icon> -->
            {{ $t('sendGroupInvitation') || '发送群聊邀请' }} ({{ selectedContacts.length }})
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>

  <!-- 通讯录窗口 -->
    <!-- <ion-modal :is-open="isContactModalOpen" @didDismiss="closeContactModal" 
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title style="font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;font-weight: 900;">{{ $t('startGroupChat') || '发起群聊' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear" @click="closeContactModal ">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content>
     
      </ion-content>
    </ion-modal> -->

    <ion-content :fullscreen="true" ref="contentRef" class="cosmic-content">
     
          <!-- <ion-header collapse="condense" >
          <ion-toolbar>
<ion-title>Chat</ion-title>
          </ion-toolbar>
        </ion-header> -->
     
     
      <ion-refresher slot="fixed" @ionRefresh="refreshChats($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      
      <!-- Chats View -->
      <div v-show="selectedSegment === 'chats'" class="view-container">
     
<ion-header collapse="condense" v-show="!isSearchFocused">
          <ion-toolbar>
            <h1 ref="titleRef" class="talkflow-header-title" style="margin: 10px;font-weight: 900;font-size: 39px;">
           <span style="color:var(--ion-text-color)">Talk</span>Flow
            </h1>
          </ion-toolbar>
        </ion-header>



        <div style="height: 50px;" v-show="isSearchFocused"></div>
               <ion-searchbar
        show-cancel-button="focus"
         :animated="true"
          v-model="searchQuery"
          placeholder="Search any"
          @keydown.enter.prevent="onSearchEnter"
          @ionFocus="onSearchFocus"
          @ionBlur="onSearchBlur"
        
        />

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
            <ion-item @click="openChat(chat.pub, chat.type)" @contextmenu.prevent="handleChatLongPress(chat, $event)" @touchstart="handleTouchStart(chat, $event)" @touchmove="handleTouchMove" @touchend="handleTouchEnd" :class="{ 'long-pressed': longPressedChatPub === chat.pub }">
              <ion-avatar slot="start" :style="{ border: chat.type === 'group' ? '2px solid #666' : '2px solid black', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.649)', position: 'relative' }">
                <img style="width: 100%;height: 100%;object-fit: cover;" v-if="chat.type === 'private' && userAvatars[chat.pub]" :src="userAvatars[chat.pub]" />
                <img style="width: 100%;height: 100%;object-fit: cover;" v-else :src="getGunAvatar(chat.pub)" alt="Avatar" />
                <span v-if="chat.hasNew" class="new-message-dot"></span>
                <!-- <ion-badge v-if="chat.type === 'group'" color="success" class="group-member-count">{{ getGroupMemberCount(chat.pub) }}</ion-badge> -->
              </ion-avatar>
              <ion-label>
                <div class="top-line">
                  <span class="chat-name" >
                    {{ chat.name }}<span class="chat-time">{{ chat.type === 'group' ? '('+ getGroupMemberCount(chat.pub) +')' : '' }} • {{ formatLastTime(chat.lastTime) }}</span>
                  </span>
                 
                </div>
                <div class="bottom-line">
                  <template v-if="chat.lastMsg && chat.lastMsg.startsWith('⏳')">
                    <SpinningLoader size="small" theme="primary" style="display: inline-block; margin-right: 6px;" />
                    <span class="sending-text">{{ chat.lastMsg.replace('⏳ ', '') }}</span>
                  </template>
                  <template v-else-if="chat.lastMsg && chat.lastMsg.startsWith('✓')">
                    <ion-icon name="checkmark-outline" color="success" style="font-size: 16px; margin-right: 4px;"></ion-icon>
                    <span class="sent-text">{{ chat.lastMsg.replace('✓ ', '') }}</span>
                  </template>
                  <template v-else>
                    {{ chat.lastMsg || 'No messages yet' }}
                  </template>
                </div>
              </ion-label>
            </ion-item>
            <ion-item-options side="end">
              <ion-button
                fill="clear"
                :color="chat.type === 'group' ? 'danger' : 'danger'"
                @click.stop="deleteChat(chat.pub, chat.type)"
              >
                <ion-icon slot="icon-only" size="large" :icon="trashOutline" />
              </ion-button>
              <ion-button
                fill="clear"
                v-if="chat.type === 'private' && !pinnedChatsMap[chat.pub]"
                color="warning"
                @click.stop="hideChat(chat.pub)"
              >
                <ion-icon slot="icon-only" size="large" :icon="eyeOffOutline" />
              </ion-button>
              <ion-button
                fill="clear"
                color="medium"
                @click.stop="unpinChat(chat.pub)"
              >
                <ion-icon slot="icon-only" size="large" :icon="heartDislikeOutline" />
              </ion-button>
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
            <ion-item @click="openChat(chat.pub, chat.type)" @contextmenu.prevent="handleChatLongPress(chat, $event)" @touchstart="handleTouchStart(chat, $event)" @touchmove="handleTouchMove" @touchend="handleTouchEnd" :class="{ 'long-pressed': longPressedChatPub === chat.pub }">
              <ion-avatar slot="start" :style="{ border: chat.type === 'group' ? '2px solid #666' : '2px solid black', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.649)', position: 'relative' }">
                <img style="width: 100%;height: 100%;object-fit: cover;" v-if="chat.type === 'private' && userAvatars[chat.pub]" :src="userAvatars[chat.pub]" />
                <img style="width: 100%;height: 100%;object-fit: cover;" v-else :src="getGunAvatar(chat.pub)" alt="Avatar" />
                <span v-if="chat.hasNew" class="new-message-dot"></span>
                <!-- <ion-badge v-if="chat.type === 'group'" color="primary" class="group-member-count">{{ getGroupMemberCount(chat.pub) }}</ion-badge> -->
              </ion-avatar>
              <ion-label>
                <div class="top-line">
                  <span class="chat-name" >
                            {{ chat.name }}<span class="chat-time">{{ chat.type === 'group' ? '('+ getGroupMemberCount(chat.pub) +')' : '' }} • {{ formatLastTime(chat.lastTime) }}</span>
                  </span>

                </div>
                <div class="bottom-line">
                  <template v-if="chat.lastMsg && chat.lastMsg.startsWith('⏳')">
                    <SpinningLoader size="small" theme="primary" style="display: inline-block; margin-right: 6px;" />
                    <span class="sending-text">{{ chat.lastMsg.replace('⏳ ', '') }}</span>
                  </template>
                  <template v-else-if="chat.lastMsg && chat.lastMsg.startsWith('✓')">
                    <ion-icon name="checkmark-outline" color="success" style="font-size: 16px; margin-right: 4px;"></ion-icon>
                    <span class="sent-text">{{ chat.lastMsg.replace('✓ ', '') }}</span>
                  </template>
                  <template v-else>
                    {{ chat.lastMsg || 'No messages yet' }}
                  </template>
                </div>
              </ion-label>
            </ion-item>
            <ion-item-options side="end">
              <ion-button
                fill="clear"
                :color="chat.type === 'group' ? 'danger' : 'danger'"
                @click.stop="deleteChat(chat.pub, chat.type)"
              >
                <ion-icon slot="icon-only" size="large" :icon="trashOutline" />
              </ion-button>
              <ion-button
                fill="clear"
                v-if="chat.type === 'private' && !pinnedChatsMap[chat.pub]"
                color="warning"
                @click.stop="hideChat(chat.pub)"
              >
                <ion-icon slot="icon-only" size="large" :icon="eyeOffOutline" />
              </ion-button>
              <ion-button
                fill="clear"
                :color="chat.type === 'group' ? 'success' : 'tertiary'"
                @click.stop="pinChat(chat.pub)"
              >
                <ion-icon slot="icon-only" size="large" :icon="heartOutline" />
              </ion-button>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>

    </ion-content>
  </ion-page>
</template>


<style scoped>
.liquid-toolbar {
  /* --border-color: transparent; */
  --background: var(--background-color-no);
  backdrop-filter: blur(10px);
}

ion-avatar {
  width: 55px;
  height: 55px;
  position: relative;
  margin-right: 13px;
  margin-bottom: 5px;
  margin-top: 5px;
  margin-left: 0px;
}

.group-member-count {
  position: absolute;
  bottom: -3px;
  font-size: 10px;
  text-align: right;
  align-items: center;
  justify-content: center;
  display: flex;
  margin: 0 auto;
  padding: 1px;
  color: var(--ion-text-color);
  background-color: #0165d7;
  border-radius: 50%;

}

.top-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.chat-name {
  font-size: 1.2rem;
  color: var(--ion-color-dark, #333);
  font-weight: 500;
}

.chat-time {
  font-size: 0.6rem;
  color: #999;
  margin-left: 8px;
}

.bottom-line {
  margin-top: 3px;
  font-size: 0.7rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.8;
}

.new-message-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background-color: red;
  border-radius: 50%;
  border: 1px solid var(--ion-background-color);
  z-index: 10;
}

.pinned-list {
  --background: transparent;
  margin-bottom: 16px;
  padding: 0px;
}

.regular-list {
  --background: transparent;
  padding: 0 0px 200px 0px;
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



ion-item-option[color="success"] {
  --background: linear-gradient(45deg, #28a745, #34ce57);
}

.cosmic-content {
  /* --background: transparent; */
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
  /* border-radius: 8px; */
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

.member-count {
  font-size: 24px;
  font-weight: 400;
  color: var(--ion-color-medium);
  margin-left: 8px;
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
  max-width: 390px;
  max-height: 390px;
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
  height: 300px;
  overflow-y: auto;
  padding: 30px;
  color: #c0c0c0;
  font-family: monospace;
  font-size: 12px;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
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
  margin-top: -20px;
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

/* 发送中状态样式 */
.sending-text {
  color: var(--ion-color-medium);
  font-style: italic;
}

.sent-text {
  color: var(--ion-color-success);
  font-weight: 500;
}

.bottom-line {
  display: flex;
  align-items: center;
}

/* 长按状态样式 */
ion-item {
  transition: all 0.2s ease-in-out;
}

ion-item.long-pressed {
  /* --padding-top: 20px;
  --padding-bottom: 20px; */
 
  /* background: rgba(var(--ion-color-primary-rgb), 0.05); */
  transform: scale(0.95);
  /* transition: padding 0.3s ease-in-out, background 0.2s ease-in-out, transform 0.2s ease-in-out; */
}

.bottom-line {
  flex-wrap: wrap;
  gap: 4px;
}



.popover-icon {
  margin-right: 12px;
  font-size: 20px;
  color: var(--ion-color-primary);

}









/* 发起群聊模态窗口样式 */
.create-group-modal {
  --width: 100%;
  --height: 80%;
  --max-width: 100%;
  --max-height: 100%;
  --border-radius: 15px;
}

.contacts-list ion-item.selected {
  --background: rgba(var(--ion-color-primary-rgb), 0.1);
}

/* .contacts-list ion-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  margin-bottom: 4px;
} */

.contacts-list ion-avatar {
  width: 50px;
  height: 50px;
  margin-right: 12px;
}

.create-group-button-container {
  position: sticky;
  bottom: 0;
  background: var(--ion-background-color);
  padding: 16px;
  border-top: 1px solid var(--ion-color-light);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

/* .create-group-button {
  --background: var(--ion-color-primary);
  --color: white;
  --border-radius: 12px;
  font-weight: 600;
  text-transform: none;
} */

.create-group-button:disabled {
  --background: var(--ion-color-medium);
  --color: var(--ion-color-medium-contrast);
}

.group-name-section {
  background: var(--ion-color-light);
  border-bottom: 1px solid var(--ion-color-light-shade);
  margin-bottom: 8px;
}

.group-name-section ion-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 16px;
  --padding-bottom: 16px;
}

.group-name-section ion-label {
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-bottom: 8px;
}

.group-name-section ion-input {
  --padding-start: 0;
  --padding-end: 0;
  font-size: 16px;
}
  /* 发送中状态样式 */
.sending-text {
  color: var(--ion-color-medium);
  font-style: italic;
}

.sent-text {
  color: var(--ion-color-success);
  font-weight: 500;
}

.bottom-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

/* Dashed Screen Main Container - replaces card container */
.dashed-screen-main-container {
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
   border: 2px dashed var(--ion-color-medium);


}

/* Dashed screen styles */
.dashed-screen-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  height: 100%;
  gap: 16px;
}

.dashed-screen {
  flex: 1;
  border: 2px dashed var(--ion-color-medium);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(var(--ion-color-light-rgb), 0.3);
  min-height: 120px;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  flex-shrink: 0;
}

.screen-input {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 6px;
  background: var(--ion-color-light);
  color: var(--ion-text-color);
  font-size: 14px;
}

.screen-input:focus {
  outline: none;
  border-color: var(--ion-color-primary);
}

.screen-prompt {
  text-align: center;
  color: var(--ion-color-dark);
}

.prompt-text {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px 0;
  color: var(--ion-color-primary);
}

.sub-prompt {
  font-size: 14px;
  margin: 0;
  color: var(--ion-color-medium);
}

.group-info {
  text-align: center;
}

.group-name {
  font-size: 18px;
  font-weight: 600;
  margin: 8px 0 4px 0;
  color: var(--ion-color-success);
}

.group-id {
  font-size: 12px;
  margin: 0 0 8px 0;
  color: var(--ion-color-medium);
  font-family: monospace;
}

.searching-info {
  text-align: center;
}

.loading-dots {
  font-size: 24px;
  color: var(--ion-color-primary);
  animation: pulse 1.5s infinite;
}

.error-info {
  text-align: center;
}

.error-info .prompt-text {
  color: var(--ion-color-danger);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.talkflow-header-title {
  transition: all 0.3s ease;
}

.title-gradient-animation {
  color: transparent !important;
  text-shadow: 0 0 10px 0 rgba(0, 255, 217, 0.5) !important;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0) !important;
  background: linear-gradient(-45deg, #52eed1, #000000, #23d5b4, #23d5ab) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  background-size: 200% 200% !important;
  animation: titleGradientBreath 3s ease !important;
}

@keyframes titleGradientBreath {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>