<template>






  <ion-content style="margin:0;padding:0;--background: transparent;" :scroll-y="false">

  <div style="height:77px"></div>



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
        v-for="(group, index) in groups"
        :key="group.pub"
        class="card"
        :data-index="index"
        :data-pub="group.pub"
      >
      <!--  v-show="!showCard" -->
        
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
          <QrShow v-else-if="showQRCode && qrcode" :data="'keypair:' + qrcode" class="qrcode-image" />
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
        <!-- <button class="left-button down" @click="openStartMenu">
          <ion-icon :icon="compassOutline"></ion-icon>
        </button> -->
        <!-- <button class="left-button down" @click="openEndMenu">
          <ion-icon :icon="settingsOutline"></ion-icon>
        </button> -->
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
        <!-- <button class="side-button down" @click="openEndMenu">
          <ion-icon :icon="settingsOutline"></ion-icon>
        </button> -->
        
      </div>
      <div class="gameboy-buttons">
        <img  src="@/assets/gun.svg" style=" width: 15%; min-width: 150px;">
      
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
          v-model="searchQuery"
          placeholder="Search groups..."
          
        ></ion-searchbar>
        <ion-list>
          <ion-item v-for="group in filteredGroups" :key="group.pub" @click="selectGroup(group.pub)">
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
          <ion-item v-if="filteredGroups.length === 0">
            <ion-label>No groups found</ion-label>
          </ion-item>
          <ion-item >
            <ion-label>Total Rooms: {{ filteredGroups.length }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>


    <!-- <ion-menu side="end" contentId="main-content" menuId="end" type="push" >
<Settings/>
</ion-menu>

<ion-menu side="start" contentId="main-content" menuId="start"  type="push">
<DiscoverS/>
</ion-menu> -->
  </ion-content>
</template>

<script lang="ts" setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonIcon,
  IonInput,
  IonButton,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonSearchbar,
  alertController,
  toastController,
  IonMenu
} from '@ionic/vue';
import { useGroupChat } from '@/composables/useGroupChat';
import { useRouter } from 'vue-router';
import { ref, computed, onMounted, watch, shallowRef } from 'vue';
import {
  chevronBackOutline,
  copyOutline,
  trashOutline,
  arrowBackOutline,
  arrowForwardOutline,
  qrCodeOutline,
  chatbubbleEllipsesOutline,
  addCircleOutline,
  personAddOutline,
  scanSharp,
  reorderThreeOutline,
  settingsOutline,
  compassOutline
} from 'ionicons/icons';
import { debounce } from 'lodash';


const router = useRouter();
const {
  newGroupName,
  joinGroupKey,
  groups,
  tempKeyPair,
  copyKeyPair,
  loadGroups,
  createGroup,
  joinGroup,
  deleteGroup,
  setCurrentGroup,
  joinGroupWithKeyPair,
} = useGroupChat();
import { menuController } from '@ionic/vue';


function openEndMenu() {
  menuController.open('end');
}
function openStartMenu() {
  menuController.open('start');
}

const centeredCard = ref<{ pub: string; index: number } | null>(null);
const cardContainer = ref<HTMLElement | null>(null);
const isAtLeftEdge = ref(true);
const isAtRightEdge = ref(false);
const showQRCode = ref(false);
const showCreateGroup = ref(false);
const showJoinGroup = ref(false);
const showScanner = ref(false);
const showCard = ref(false);
const statusDotColor = ref('#ff0000');
const isGroupListModalOpen = ref(false);
const searchQuery = ref('');

const selectedKeyPair = computed(() => {
  if (!centeredCard.value) return null;
  const group = groups.value.find((g) => g.pub === centeredCard.value?.pub);
  return group ? group.pair : null;
});

const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) return groups.value;
  const query = searchQuery.value.toLowerCase();
  return groups.value.filter(
    (group) =>
      group.name.toLowerCase().includes(query) 
      // group.pub.toLowerCase().includes(query)
  );
});

const keyPairText = shallowRef('');
const qrcode = keyPairText;



import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

onMounted(async () => {
  console.log('🎬 Card 组件开始挂载...');
  console.log('📊 挂载前 groups 数量:', groups.value.length);
  
  mountClass();
  await loadGroups();
  
  console.log('📊 loadGroups 后 groups 数量:', groups.value.length);
  console.log('📋 当前群组列表:', groups.value.map(g => g.name));

  setTimeout(async () => {
    await updateCenteredCard();
    await updateEdgeStatus();
    
    statusDotColor.value = centeredCard.value ? '#00ff00' : '#ff0000';
    
    console.log('🎯 Card 组件挂载完成!');
    console.log('📊 最终 groups 数量:', groups.value.length);
  }, 500);
});



watch(selectedKeyPair, (newValue) => {
  keyPairText.value = newValue ? JSON.stringify(newValue, null, 2) : '';
});

watch(centeredCard, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    statusDotColor.value = '#0000ff';
    setTimeout(() => {
      statusDotColor.value = newValue ? '#00ff00' : '#ff0000';
    }, 200);
  }
});

// 监听 groups 状态变化，追踪数据丢失问题
watch(groups, (newGroups, oldGroups) => {
  console.log('🔍 Groups 状态变化检测:');
  console.log('  📊 新数量:', newGroups.length);
  console.log('  📊 旧数量:', oldGroups ? oldGroups.length : 'undefined');
  console.log('  📋 新群组列表:', newGroups.map(g => g.name));
  console.log('  📋 旧群组列表:', oldGroups ? oldGroups.map(g => g.name) : 'undefined');
  
  // 如果群组数量减少且不是删除操作，可能是数据被重置
  if (oldGroups && newGroups.length < oldGroups.length) {
    console.warn('⚠️ 群组数量减少! 可能存在数据重置问题');
    console.trace('调用堆栈:');
  }
  
  // 如果变成空数组，记录详细信息
  if (oldGroups && oldGroups.length > 0 && newGroups.length === 0) {
    console.error('❌ 群组被清空! 这不应该发生');
    console.trace('调用堆栈:');
  }
}, { deep: true });

const formatPubKey = (pub: string) => {
  return pub.length > 6 ? `${pub.slice(0, 6)}...` : pub;
};

const enterGroupChat = (pub: string | undefined) => {
  if (!pub) return;
  setCurrentGroup(pub);
  router.push(`/group/${pub}/messages`);
};

const openGroupListModal = () => {
  showCard.value = true
  isGroupListModalOpen.value = true;
  searchQuery.value = ''; 
};

const closeGroupListModal = () => {
  showCard.value = false
  isGroupListModalOpen.value = false;
  searchQuery.value = ''; 
};

const selectGroup = (pub: string) => {
  setCurrentGroup(pub);
  closeGroupListModal();
  router.push(`/group/${pub}/messages`);
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
    setTimeout(updateCenteredCard, 100);
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
    setTimeout(updateCenteredCard, 100);
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
    message: `Are you sure you want to delete the group ${groups.value.find((g) => g.pub === pub)?.name || pub}? This action cannot be undone.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          try {
            await deleteGroup(pub);
            centeredCard.value = null;
            const toast = await toastController.create({
              message: 'Group deleted',
              duration: 2000,
              position: 'top',
              color: 'success',
            });
            await toast.present();
            setTimeout(updateCenteredCard, 100);
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






</script>

<style scoped>
ion-menu::part(backdrop) {
  background-color: rgba(0, 255, 213, 0.5);
  /* z-index: 9999; */
}

ion-menu::part(container) {
  border-radius: 0 20px 20px 0;

  box-shadow: 4px 0px 16px rgba(0, 255, 213, 0.5);
  z-index: 9999;
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
.gun-avatar {
  position: absolute;
  width: 300px;
  height: 200px;
  border-radius: 12px;
  z-index: -1;
  /* opacity: 1; */
  animation: cardFadeIn 0.5s ease forwards;
  transition: opacity 0.5s ease; 
}


/* .gun-avatar.show {
  opacity: 1;
} */
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
.transparent-bg {
  --background: transparent !important;
  background: transparent !important;
}
.slide-down {
  transform: translateY(100vh) scale(0.95);
  opacity: 0;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-in-out, scale 0.4s ease-in-out;
}
ion-content:not(.slide-down) {
  transform: translateY(0) scale(1);
  opacity: 1;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-in-out, scale 0.4s ease-in-out;
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
.gameboy-button.directional {
  background: linear-gradient(145deg, #4a4a4a, #2e2e2e);
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.1);
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
ion-modal {
  --background: var(--ion-background-color, #fff);
  --border-radius: 10px;
  --max-width: 500px;
  --max-height: 80%;
}
ion-list {
  padding: 0;
}
ion-item {
  --padding-start: 16px;
  --padding-end: 16px;
  cursor: pointer;
}
/* ion-item:hover {
  --background: var(--ion-color-light);
} */
.search-bar {
  --background: #f4f4f4;
  --border-radius: 8px;
  --box-shadow: none;
  --padding-start: 16px;
  --padding-end: 16px;
  margin: 10px;
}
.total-rooms {
  --background: #f4f4f4;
  --padding-top: 10px;
  --padding-bottom: 10px;
  text-align: center;
}
</style>