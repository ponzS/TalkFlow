<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
        <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>{{ currentGroupName }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col>
            <!-- 用户加入时间显示区域 -->
            <div class="join-time-section" v-if="currentUserJoinTime">
              <ion-card class="join-time-card">
                <ion-card-content>
                  <div class="join-time-info">
                    <ion-icon name="time-outline" class="join-time-icon"></ion-icon>
                    <div class="join-time-text">
                      <h3>Your Join Time</h3>
                      <p>{{ formatJoinTime(currentUserJoinTime) }}</p>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            </div>
            
            <ion-list>
              <ion-list-header>Members List</ion-list-header>
              <ion-item v-for="member in displayedMembers" :key="member.member_pub" lines="full">
                <img class="member-avatar" :src="getGunAvatar(member.member_pub)" alt="" slot="start" @click="goToProfile(member.member_pub)" />
                <ion-label>
                  <div class="member-info">
                    <span class="member-alias">{{ member.alias }}</span>
                    <!-- Removed the status dot as per new requirement -->
                  </div>
                  <p class="member-pubkey">Public Key: {{ formatPubKey(member.member_pub) }}</p>
                </ion-label>
              </ion-item>
              <ion-item lines="none" v-if="members.length > 2">
                <ion-button fill="clear" @click="toggleShowMore">
                  {{ showAllMembers ? 'Show Less' : 'Show More' }}
                </ion-button>
              </ion-item>
            </ion-list>
            
            <!-- 新的投票模块设计 -->
            <div class="vote-module" v-if="!isLoadingVoteData">
              <ion-list-header class="vote-header">Clear Chat History Vote</ion-list-header>
              <div class="vote-status-bar">
                <div class="vote-progress" :style="{ width: voteProgress + '%' }"></div>
                <span class="vote-count">{{ agreeCount }} / {{ members.length }}</span>
              </div>
              
              <div class="agreed-members-avatars" v-if="simulatedVotedMembers.length > 0">
                <span class="agreed-label">Agreed Members:</span>
                <div class="avatars-list">
                  <img
                    v-for="member in simulatedVotedMembers"
                    :key="member.member_pub"
                    class="voted-avatar"
                    :src="getGunAvatar(member.member_pub)"
                    :alt="member.alias"
                  />
                </div>
              </div>

              <ion-item lines="none" class="vote-checkbox-item">
                <ion-checkbox
                  slot="start"
                  :checked="localVoteStatus"
                  @ionChange="toggleVote($event)"
                  label-placement="end"
                  justify="start"
                >Agree to Clear Chat History</ion-checkbox>
              </ion-item>
            </div>
            <div v-else class="vote-module-loading">
                <ion-spinner name="crescent"></ion-spinner>
                <p>Loading vote data...</p>
            </div>

            <!-- 清除聊天记录按钮 - 放在退出群聊上方，仅在所有人都同意时显示 -->
            <ion-button
              expand="block"
              color="danger"
              class="clear-chat-button"
              v-if="canClearChat && !isLoadingVoteData"
              @click="initiateClearChat(currentGroup!)"
            >
              Clear Chat History
            </ion-button>

          </ion-col>
        </ion-row>
      </ion-grid>
      
      <!-- 邀请好友按钮 -->
      <ion-button expand="block" color="primary" class="invite-friends-button" @click="openInviteFriendsModal">
        Invite Friends
      </ion-button>
      
      <ion-button expand="block" color="danger" class="leave-group-button" @click="leaveGroup">
        Leave Group
      </ion-button>
      
      <!-- 邀请好友模态窗口 -->
      <ion-modal :is-open="isInviteFriendsModalOpen" @did-dismiss="closeInviteFriendsModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Invite Friends to {{ currentGroupName }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeInviteFriendsModal">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <!-- 搜索框 -->
          <ion-searchbar
            v-model="contactSearchQuery"
            placeholder="Search contacts..."
            @ionInput="onContactSearch"
            class="contact-searchbar"
          ></ion-searchbar>
          
          <!-- 已选择的联系人 -->
          <div v-if="selectedContacts.length > 0" class="selected-contacts-section">
            <ion-list-header>Selected Contacts ({{ selectedContacts.length }})</ion-list-header>
            <div class="selected-contacts-chips">
              <ion-chip
                v-for="contact in selectedContacts"
                :key="contact.pub"
                color="primary"
                @click="removeFromSelection(contact.pub)"
              >
                <ion-avatar>
                  <img :src="getGunAvatar(contact.pub)" :alt="contact.alias" />
                </ion-avatar>
                <ion-label>{{ contact.alias }}</ion-label>
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-chip>
            </div>
          </div>
          
          <!-- 联系人列表 -->
          <ion-list>
            <ion-list-header>Available Contacts</ion-list-header>
            <ion-item
              v-for="contact in filteredContacts"
              :key="contact.pub"
              @click="toggleContactSelection(contact)"
              button
            >
              <ion-avatar slot="start">
                <img :src="getGunAvatar(contact.pub)" :alt="contact.alias" />
              </ion-avatar>
              <ion-label>
                <h2>{{ contact.alias }}</h2>
                <p>{{ formatPubKey(contact.pub) }}</p>
              </ion-label>
              <ion-checkbox
                slot="end"
                :checked="isContactSelected(contact)"
                @click.stop
              ></ion-checkbox>
            </ion-item>
            <ion-item v-if="filteredContacts.length === 0">
              <ion-label>
                <p>No contacts available</p>
              </ion-label>
            </ion-item>
          </ion-list>
          
          <!-- 发送邀请按钮 -->
          <ion-button
            expand="block"
            color="primary"
            :disabled="selectedContacts.length === 0"
            @click="sendGroupInvitations"
            class="send-invitations-button"
          >
            Send Invitations ({{ selectedContacts.length }})
          </ion-button>
        </ion-content>
      </ion-modal>
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
  IonList,
  IonItem,
  IonLabel,
  IonListHeader,
  IonButton,
  IonButtons,
  IonIcon,
  IonCheckbox,
  IonModal,
  IonSearchbar,
  IonChip,
  IonAvatar,
  IonCard,
  IonCardContent,
  alertController,
  toastController,
  IonBackButton,
  IonSpinner // Import IonSpinner
} from '@ionic/vue';
import { useGroupChat } from '@/composables/useGroupChat';
import { useRoute, useRouter } from 'vue-router';
import { computed, onMounted, ref, watch } from 'vue';
import { chevronBackOutline, closeOutline, timeOutline } from 'ionicons/icons';
import { gunAvatar, mountClass } from 'gun-avatar';

mountClass();
import { useTheme } from '@/composables/useTheme';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';


const route = useRoute();
const router = useRouter();
const { isDark } = useTheme();
const { gun } = getTalkFlowCore();
const {
  membersByGroup,
  currentGroup,
  currentGroupName,
  agreeCount,
  canClearChat,
  voteToClear,
  cancelVote,
  initiateClearChat,
  getCurrentGroup,
  setCurrentGroup,
  safeUserPub,
  deleteGroup,
  selectGroup, // Ensure selectGroup is available from useGroupChat
  groups // Add groups to the destructured variables
} = useGroupChat();

const { buddyList, sendChat, currentChatPub, storageServ } = getTalkFlowCore();

const members = computed(() => {
  return currentGroup.value ? membersByGroup.value[currentGroup.value] || [] : [];
});

const voteProgress = computed(() => {
  if (members.value.length === 0) return 0;
  return (agreeCount.value / members.value.length) * 100;
});

const isLoadingVoteData = ref(true); // New loading state for vote module

// Whether to show all members
const showAllMembers = ref(false);

// Displayed members list (up to 8 or all)
const displayedMembers = computed(() => {
  return showAllMembers.value ? members.value : members.value.slice(0, 8);
});

// Current user's vote status
const localVoteStatus = ref(false);

// 邀请好友相关状态
const isInviteFriendsModalOpen = ref(false);
const contactSearchQuery = ref('');
const selectedContacts = ref<any[]>([]);

// 当前用户加入时间
const currentUserJoinTime = ref<number | null>(null);

// 过滤联系人列表（排除已在群聊中的成员）
const filteredContacts = computed(() => {
  const memberPubs = new Set(members.value.map(member => member.member_pub));
  let contacts = buddyList.value.filter(contact => !memberPubs.has(contact.pub));
  
  if (contactSearchQuery.value.trim()) {
    const query = contactSearchQuery.value.toLowerCase();
    contacts = contacts.filter(contact => 
      contact.alias.toLowerCase().includes(query) ||
      contact.pub.toLowerCase().includes(query)
    );
  }
  
  return contacts;
});

// Function to synchronize localVoteStatus with Gun
const syncLocalVoteStatus = async (groupPub: string) => {
  if (!groupPub || !safeUserPub.value) {
    console.log('syncLocalVoteStatus: 缺少必要参数', { groupPub, safeUserPub: safeUserPub.value });
    return;
  }
  console.log('syncLocalVoteStatus: 开始同步', groupPub);
  return new Promise<void>((resolve) => {
    gun.get(`group_${groupPub}_clear_votes`).get(safeUserPub.value).once((voteData: any) => {
      console.log('syncLocalVoteStatus: 获取到投票数据', voteData);
      localVoteStatus.value = voteData?.agreed === true;
      console.log('syncLocalVoteStatus: 本地投票状态更新为', localVoteStatus.value);
      resolve();
    });
    // 设置超时，避免无限等待
    setTimeout(() => {
      console.log('syncLocalVoteStatus: 超时，结束等待');
      resolve();
    }, 3000);
  });
};

// Simulated voted members (based on agreeCount)
const simulatedVotedMembers = computed(() => {
  const votedMembers = [];
  if (localVoteStatus.value) {
    const currentMember = members.value.find(member => member.member_pub === safeUserPub.value);
    if (currentMember) votedMembers.push(currentMember);
  }
  const remainingCount = agreeCount.value - (localVoteStatus.value ? 1 : 0);
  const otherMembers = members.value.filter(member => member.member_pub !== safeUserPub.value);
  return votedMembers.concat(otherMembers.slice(0, remainingCount));
});

// Toggle show more/less
const toggleShowMore = () => {
  showAllMembers.value = !showAllMembers.value;
};
const goToProfile = (userPub: string) => {
    router.push({ path: '/friend-profile', query: { pub: userPub } });
};

// 邀请好友相关函数
const openInviteFriendsModal = () => {
  isInviteFriendsModalOpen.value = true;
  selectedContacts.value = [];
  contactSearchQuery.value = '';
};

const closeInviteFriendsModal = () => {
  isInviteFriendsModalOpen.value = false;
  selectedContacts.value = [];
  contactSearchQuery.value = '';
};

const isContactSelected = (contact: any) => {
  return selectedContacts.value.some(c => c.pub === contact.pub);
};

const toggleContactSelection = (contact: any) => {
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

const sendGroupInvitations = async () => {
  if (selectedContacts.value.length === 0 || !currentGroup.value) return;
  
  try {
    // 获取当前群聊信息
    const groupName = currentGroupName.value;
    const group = groups.value.find(g => g.pub === currentGroup.value);
    if (!group) {
      throw new Error('Group not found');
    }
    
    const keyPair = group.pair; // 从群聊对象中获取密钥对
    
    // 构建群聊邀请消息（使用XML标签格式，与ChatS.vue保持一致）
    const groupInvitation = `🎯GROUP_INVITATION_START🎯<group>${groupName}</group><pub>${keyPair.pub}</pub><priv>${keyPair.priv}</priv><epub>${keyPair.epub}</epub><epriv>${keyPair.epriv}</epriv><inviter>${safeUserPub.value}</inviter><time>${new Date().toISOString()}</time>🎯GROUP_INVITATION_END🎯`;
    
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
      message: `Invitations sent to ${selectedContacts.value.length} contacts`,
      duration: 3000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
    
    closeInviteFriendsModal();
  } catch (error) {
    console.error('Failed to send invitations:', error);
    const toast = await toastController.create({
      message: 'Failed to send invitations',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};

// Toggle vote status
const toggleVote = async (event: CustomEvent) => {
  const isChecked = event.detail.checked;
  console.log('toggleVote: 开始投票操作', { isChecked, currentGroup: currentGroup.value, safeUserPub: safeUserPub.value });
  try {
    if (isChecked) {
      console.log('toggleVote: 执行同意投票');
      await voteToClear();
      localVoteStatus.value = true;
      console.log('toggleVote: 同意投票完成，当前 agreeCount:', agreeCount.value);
    } else {
      console.log('toggleVote: 执行取消投票');
      await cancelVote();
      localVoteStatus.value = false;
      console.log('toggleVote: 取消投票完成，当前 agreeCount:', agreeCount.value);
    }
  } catch (error) {
    console.error('Vote failed:', error);
  }
};

// Go back to previous page
const goBack = () => {
  router.go(-1);
};

// Format public key, showing only the first 6 characters
const formatPubKey = (pubKey: string) => {
  return pubKey.length > 6 ? `${pubKey.slice(0, 6)}...` : pubKey;
};

// Format join time
const formatJoinTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Generate avatar
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  } as any);
};

// Function to leave the group
const leaveGroup = async () => {
  if (!currentGroup.value) return;

  const alert = await alertController.create({
    header: 'Confirm Leave',
    message: `Are you sure you want to leave "${currentGroupName.value}"? This action cannot be undone.`, // Use currentGroupName
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Leave',
        role: 'destructive',
        handler: async () => {
          try {
            await deleteGroup(currentGroup.value!); // Use deleteGroup from useGroupChat
            router.replace('/index'); // Redirect to /index as per new requirement
          } catch (error) {
            console.error('Failed to leave group:', error);
            // Optionally show a toast error
          }
        },
      },
    ],
  });
  await alert.present();
};

// 获取当前用户的加入时间
const loadCurrentUserJoinTime = async (groupPub: string) => {
  try {
    const group = await storageServ.getGroup(groupPub);
    if (group && group.joined_at) {
      currentUserJoinTime.value = group.joined_at;
    }
  } catch (error) {
    console.error('Failed to load user join time:', error);
  }
};

// Initialize data when component mounts or currentGroup changes
onMounted(async () => {
  console.log('GroupMembers onMounted: 开始加载');
  isLoadingVoteData.value = true; // Set loading to true on mount
  const pub = getCurrentGroup();
  if (!pub) {
    const routePub = route.params.pub as string;
    if (routePub) {
      console.log('GroupMembers onMounted: 选择群组', routePub);
      await selectGroup(routePub); // Await selectGroup to ensure data is loaded
      await loadCurrentUserJoinTime(routePub); // Load user join time
      console.log('GroupMembers onMounted: 同步投票状态');
      await syncLocalVoteStatus(routePub); // Sync local vote status
    } else {
      router.push('/groups');
      return;
    }
  } else {
    console.log('GroupMembers onMounted: 选择当前群组', pub);
    await selectGroup(pub); // Await selectGroup to ensure data is loaded
    await loadCurrentUserJoinTime(pub); // Load user join time
    console.log('GroupMembers onMounted: 同步投票状态');
    await syncLocalVoteStatus(pub); // Sync local vote status
  }
  console.log('GroupMembers onMounted: 加载完成');
  isLoadingVoteData.value = false; // Set loading to false after data is loaded
});

watch(currentGroup, async (newGroupPub) => {
  if (newGroupPub) {
    console.log('GroupMembers watch: 群组变更', newGroupPub);
    isLoadingVoteData.value = true; // Set loading to true on group change
    await selectGroup(newGroupPub); // Await selectGroup to ensure data is loaded
    console.log('GroupMembers watch: 同步投票状态');
    await syncLocalVoteStatus(newGroupPub); // Sync local vote status
    console.log('GroupMembers watch: 加载完成');
    isLoadingVoteData.value = false; // Set loading to false after data is loaded
  }
});

// Add styles for the new vote module and invite friends modal
</script>

<style scoped>
.ion-padding {
  padding: 16px;
}

ion-list-header {
  font-size: 18px;
  font-weight: bold;
  color: var(--ion-color-dark);
  margin-bottom: 8px;
}

ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
  --background: transparent;
  margin-bottom: 8px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-right: 12px;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-alias {
  font-size: 16px;
  font-weight: 500;
  color: var(--ion-color-dark);
}

.member-pubkey {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin-top: 4px;
}

/* Removed status-dot styles */

ion-checkbox {
  --size: 20px;
  --border-radius: 4px;
  --background-checked: #01b872;
  --border-color: var(--ion-color-medium);
  --border-color-checked: #01b872;
  margin-right: 12px;
}

ion-button {
  --border-radius: 8px;
  --padding-start: 16px;
  --padding-end: 16px;
  margin: 0 8px;
}

ion-button[color="danger"] {
  --background: var(--ion-color-danger);
  --color: #fff;
}

.voted-avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.voted-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.leave-group-button {
  margin-top: 20px;
  margin-bottom: 20px;
}

.vote-module {
  background: var(--ion-color-light);
  border: 1px solid var(--ion-color-medium-shade);
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.vote-module-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  background: var(--ion-color-light);
  border-radius: 12px;
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  color: var(--ion-color-medium);
}

.vote-module-loading ion-spinner {
  margin-bottom: 10px;
}

.vote-header {
  --background: transparent;
  font-size: 16px;
  font-weight: bold;
  color: var(--ion-color-dark);
  padding: 0;
  margin-bottom: 12px;
}

.vote-status-bar {
  position: relative;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  margin-bottom: 12px;
  overflow: hidden;
}

.vote-progress {
  height: 100%;
  background: var(--ion-color-primary);
  border-radius: 4px;
  transition: width 0.3s ease-in-out;
}

.vote-count {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: bold;
  color: black;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}

.agreed-members-avatars {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.agreed-label {
  font-size: 14px;
  color: var(--ion-color-medium);
  font-weight: 500;
}

.avatars-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.vote-checkbox-item {
  --background: transparent;
  padding: 0;
}

.clear-chat-button {
  margin-top: 20px;
  margin-bottom: 10px;
  --background: var(--ion-color-danger);
  --color: #fff;
}

.invite-friends-button {
  margin-top: 20px;
  margin-bottom: 10px;
  --background: var(--ion-color-primary);
  --color: #fff;
}

/* 邀请好友模态窗口样式 */
.contact-searchbar {
  margin-bottom: 16px;
}

.selected-contacts-section {
  margin-bottom: 20px;
}

.selected-contacts-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.selected-contacts-chips ion-chip {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.selected-contacts-chips ion-chip:hover {
  transform: scale(0.95);
}

.selected-contacts-chips ion-chip ion-avatar {
  width: 24px;
  height: 24px;
}

.selected-contacts-chips ion-chip ion-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.send-invitations-button {
  margin-top: 20px;
  --border-radius: 8px;
}

/* 加入时间显示区域样式 */
.join-time-section {
  margin-bottom: 20px;
}

.join-time-card {
  --background: var(--ion-color-light);
  --color: var(--ion-color-dark);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.join-time-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.join-time-icon {
  font-size: 24px;
  color: var(--ion-color-primary);
}

.join-time-text h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ion-color-dark);
}

.join-time-text p {
  margin: 0;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.send-invitations-button:disabled {
  --opacity: 0.5;
}

/* 联系人列表项样式 */
ion-modal ion-item {
  --padding-start: 16px;
  --inner-padding-end: 16px;
  --background: transparent;
  margin-bottom: 4px;
}

ion-modal ion-item ion-avatar {
  width: 40px;
  height: 40px;
  margin-right: 12px;
}

ion-modal ion-item ion-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

ion-modal ion-item ion-label h2 {
  font-size: 16px;
  font-weight: 500;
  color: var(--ion-color-dark);
  margin: 0;
}

ion-modal ion-item ion-label p {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 4px 0 0 0;
}

ion-modal ion-checkbox {
  --size: 20px;
  --border-radius: 4px;
  --background-checked: var(--ion-color-primary);
  --border-color: var(--ion-color-medium);
  --border-color-checked: var(--ion-color-primary);
}
</style>