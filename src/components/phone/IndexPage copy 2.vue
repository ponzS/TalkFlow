<template>
  <ion-content :fullscreen="true" class="cosmic-content" v-if="isLargeScreen" :scroll-y="false">
    <!-- 大屏幕时的左侧导航栏 -->
    <div class="sidebar liquid-sidebar" v-if="isLargeScreen">
      <div class="nav-button" @click="switchTo('Chat')" :class="{ active: currentComponent === 'Chat' }">
        <ion-icon :icon="chatbubbleOutline" size="large" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Chat' }"></div>
      </div>
      <div class="nav-button" @click="switchTo('Contacts')" :class="{ active: currentComponent === 'Contacts' }">
        <ion-icon :icon="peopleOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Contacts' }"></div>
      </div>
      <div class="nav-button" @click="switchTo('Discover')" :class="{ active: currentComponent === 'Discover' }">
        <ion-icon :icon="walletOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Discover' }"></div>
      </div>
      <div class="nav-button" @click="handleLinkClick" :class="{ active: currentComponent === 'Link' }">
        <ion-icon :icon="currentComponent === 'Link' ? addOutline : planetOutline" 
                 :style="{ fontSize: currentComponent === 'Link' ? '48px' : '39px' }" 
                 class="cosmic-icon link-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Link' }"></div>
      </div>
      <div class="nav-button" @click="switchTo('Broswer')" :class="{ active: currentComponent === 'Broswer' }">
        <ion-icon :icon="compassOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Broswer' }"></div>
      </div>
      <div class="nav-button" @click="switchTo('Relay')" :class="{ active: currentComponent === 'Relay' }">
        <ion-icon :icon="rocketOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Relay' }"></div>
      </div>
      <div class="nav-button" @click="switchTo('Settings')" :class="{ active: currentComponent === 'Settings' }">
        <ion-icon :icon="settingsOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
        <div class="indicator" :class="{ active: currentComponent === 'Settings' }"></div>
      </div>
      <div class="nav-button" @click="switchTo('Profile')" :class="{ active: currentComponent === 'Profile' }">
        <img
          v-if="userAvatars[currentUserPub!]"
          :src="userAvatars[currentUserPub!]"
          class="cosmic-icon"
          style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover"
        />
        <img
          v-else
          :src="avatarurl"
          class="cosmic-icon"
          style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover"
        />
        <div class="indicator" :class="{ active: currentComponent === 'Profile' }"></div>
      </div>
    </div>
    <div class="components-container" :class="{ 'with-sidebar': isLargeScreen }">
      <div v-show="currentComponent === 'Chat'" class="page-component" :class="{ 'active': currentComponent === 'Chat' }">
        <ion-split-pane when="xs" content-id="main">
          <ion-menu content-id="main">
            <ion-content class="ion-padding">
              <ChatSpad />
            </ion-content>
          </ion-menu>
          <div class="ion-page" id="main">
            <ion-content class="ion-padding">
              <PadChatPage />
            </ion-content>
          </div>
        </ion-split-pane>
      </div>
      <div v-show="currentComponent === 'Group'" class="page-component" :class="{ 'active': currentComponent === 'Group' }">
        <Group />
      </div>
      <div v-show="currentComponent === 'Contacts'" class="page-component" :class="{ 'active': currentComponent === 'Contacts' }">
        <ContactPad />
      </div>
      <div v-show="currentComponent === 'Discover'" class="page-component" :class="{ 'active': currentComponent === 'Discover' }">
        <Card></Card>
      </div>
      <div v-if="currentComponent === 'Link'" class="page-component" :class="{ 'active': currentComponent === 'Link' }">
        <Moment />
      </div>
      <div v-show="currentComponent === 'Broswer'" class="page-component" :class="{ 'active': currentComponent === 'Broswer' }">
        <Discover />
      </div>
      <div v-show="currentComponent === 'Relay'" class="page-component" :class="{ 'active': currentComponent === 'Relay' }">
        <ion-header :translucent="true" collapse="fade">
          <ion-toolbar class="liquid-toolbar">
            <ion-title>Network Status</ion-title>
          </ion-toolbar>
        </ion-header>
        <RelayMode/>
      </div>
      <div v-show="currentComponent === 'Settings'" class="page-component" :class="{ 'active': currentComponent === 'Settings' }">
        <Settings/>
      </div>
      <div v-if="currentComponent === 'Profile'" class="page-component" :class="{ 'active': currentComponent === 'Profile' }">
        <MeS/>
      </div>
    </div>
  </ion-content>
  <ion-content :fullscreen="true" class="cosmic-content" v-if="!isLargeScreen" :scroll-y="false">
    <div class="components-container" :class="{ 'with-sidebar': isLargeScreen }">
      <div v-if="currentComponent === 'Chat'" class="page-component" :class="{ 'active': currentComponent === 'Chat' }">
        <Chat />
      </div>
      <div v-if="currentComponent === 'Contacts'" class="page-component" :class="{ 'active': currentComponent === 'Contacts' }">
        <Contacts />
      </div>
      <div v-if="currentComponent === 'Link'" class="page-component" :class="{ 'active': currentComponent === 'Link' }">
        <Moment ref="momentsRef"/>
      </div>
      <div v-if="currentComponent === 'KeyPair'" class="page-component" :class="{ 'active': currentComponent === 'KeyPair' }">
        <Card />
      </div>
      <div v-if="currentComponent === 'Profile'" class="page-component" :class="{ 'active': currentComponent === 'Profile' }">
        <MeS/>
      </div>
    </div>
  </ion-content>
  <!-- 小屏幕时的底部导航栏 -->
  <ion-footer collapse="fade" :translucent="true" class="liquid-toolbar" v-if="!isLargeScreen">
    <ion-toolbar class="liquid-toolbar">
      <div style="display: flex; justify-content: space-around; align-items: center;">
        <div class="nav-button" @click="switchTo('Chat')" :class="{ active: currentComponent === 'Chat' }">
          <ion-icon :icon="chatbubbleOutline" size="large" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Chat' }"></div>
        </div>
        <div class="nav-button" @click="switchTo('Contacts')" :class="{ active: currentComponent === 'Contacts' }">
          <ion-icon :icon="peopleOutline" style="font-size: 39px;" class="cosmic-icon"></ion-icon>
          <div v-if="hasNewRequests && !requestsViewed" class="redboom"></div>
          <div class="indicator" :class="{ active: currentComponent === 'Contacts' }"></div>
        </div>
        <div class="nav-button" @click="handleLinkClick" :class="{ active: currentComponent === 'Link' }">
          <ion-icon :icon="currentComponent === 'Link' ? addCircleOutline : planetOutline" 
                   :style="{ fontSize: currentComponent === 'Link' ? '50px' : '33px' }" 
                   class="cosmic-icon link-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'Link' }"></div>
        </div>
        <div class="nav-button" @click="switchTo('KeyPair')" :class="{ active: currentComponent === 'KeyPair' }">
          <ion-icon :icon="walletOutline" style="font-size: 33px;" class="cosmic-icon"></ion-icon>
          <div class="indicator" :class="{ active: currentComponent === 'KeyPair' }"></div>
        </div>
        <div class="nav-button" @click="switchTo('Profile')" :class="{ active: currentComponent === 'Profile' }">
          <img
            v-if="userAvatars[currentUserPub!]"
            :src="userAvatars[currentUserPub!]"
            class="cosmic-icon"
            style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover"
          />
          <img
            v-else
            :src="avatarurl"
            class="cosmic-icon"
            style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover"
          />
          <div class="indicator" :class="{ active: currentComponent === 'Profile' }"></div>
        </div>
      </div>
    </ion-toolbar>
  </ion-footer>
  <!-- Modal for Link -->
  <ion-modal :is-open="isModalOpen" @didDismiss="closeModal" class="custom-modal">
    <!-- <ion-header> -->
      <ion-toolbar>
      
        <ion-buttons slot="start">
          <ion-button @click="closeModal">Close</ion-button>
        </ion-buttons>
        <!-- <ion-title>Create New Link</ion-title> -->
        <ion-buttons slot="end">
          <ion-button 
              :disabled="!newMomentContent.trim() && selectedImages.length === 0 || isPosting" 
              strong
              @click="handlePost"
            >
              <ion-icon :icon="sendOutline"></ion-icon>
            </ion-button>
        </ion-buttons>
      </ion-toolbar>
 
    <!-- </ion-header> -->
    <ion-content class="ion-padding">
      <div class="input-container">
          <ion-textarea
            v-model="newMomentContent"
            auto-grow
            placeholder="Say something..."
            class="moment-textarea"
            :rows="3"
           
            :disabled="isPosting"
          ></ion-textarea>
          <p class="char-count" :class="{ 'over-limit': newMomentContent.length > 10000 }">
            {{ newMomentContent.length }}/10000
          </p>
        </div>
        <carousel
          v-if="selectedImages.length > 0"
          :items-to-show="1"
          :wrap-around="true"
          :transition="500"
          class="image-carousel"
        >
          <slide v-for="(image, index) in selectedImages" :key="index">
            <div class="image-item">
              <img :src="image" alt="Selected Image" class="moment-image" />
              <ion-button fill="clear" color="danger" class="remove-btn" @click="removeImage(index)" :disabled="isPosting">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </div>
          </slide>
          <template #addons>
            <navigation v-if="selectedImages.length > 1" />
            <pagination />
          </template>
        </carousel>
        <ion-buttom color="dark"  class="image-select-btn" @click="selectImages" :disabled="isPosting">
          <ion-icon :icon="imageOutline" slot="start"></ion-icon>
        
        </ion-buttom>
        <input type="file" ref="fileInput" multiple accept="image/*" @change="handleImageSelect" style="display: none;" />
        <ion-loading
          :is-open="isPosting"
          message="Posting your moment..."
          :duration="0"
        ></ion-loading>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue'
import Chat from './ChatS.vue'
import Contacts from './ContactsS.vue'
import Discover from './DiscoverS.vue'
import Profile from './MeS.vue'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { 
  chatbubblesOutline, 
  chatbubbleOutline, 
  peopleOutline, 
  personOutline, 
  planetOutline, 
  settingsOutline, 
  rocketOutline, 
  browsersOutline, 
  atOutline, 
  sparklesOutline, 
  chatbubbleEllipsesOutline, 
  compassOutline, 
  walletOutline, 
  reorderFourOutline, 
  reorderThreeOutline, 
  appsOutline, 
  addOutline,
  addCircleOutline,
  
} from 'ionicons/icons'
import {
  IonFooter,
  IonToolbar,
  IonContent,
  IonIcon,
  IonHeader, 
  IonMenu, 
  IonSplitPane, 
  IonTitle, 
  IonModal, 
  IonButtons, 
  IonButton, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonTextarea,
  IonBadge,
} from '@ionic/vue'
import { gunAvatar } from "gun-avatar";
import { useTheme } from '@/composables/useTheme';
import ChatSpad from '../ipad/ChatSpad.vue'
import RelayMode from '../GUNtest/RelayMode.vue'

const { isDark } = useTheme();
const chatFlowStore = getTalkFlowCore();

const {
  currentUserPub,
  currentUserAlias,
  currentUserAlias1,
  userAvatars,
  storageServ,
  gun,
  translateY,
  cardsTranslateY,
  panelVisible: _panelVisible,
  panelContent: _panelContent,
  isLargeScreen,
  currentComponent,
  switchTo,
  receivedRequests,
  requestsViewed,
} = chatFlowStore;
const hasNewRequests = computed(() => receivedRequests.value.length > 0);

const avatarurl = computed(() => gunAvatar({ pub: currentUserPub.value, round: false, dark: isDark.value, svg: true }));

const isModalOpen = ref(false);
const linkTitle = ref('');
const linkDescription = ref('');

const handleLinkClick = () => {
  if (currentComponent.value === 'Link') {
    isModalOpen.value = true;
  } else {
    switchTo('Link');
  }
};

const closeModal = () => {
  isModalOpen.value = false;
  linkTitle.value = '';
  linkDescription.value = '';
};



const midPoint = 0;
const positionState = ref('middle');
const encryptedPair = ref('');

onMounted(async () => {
  positionState.value = 'middle';
  translateY.value = midPoint;
  cardsTranslateY.value = 0;
  if (currentUserPub.value) {
    const userData = await storageServ.getUser(currentUserPub.value);
    if (userData) {
      currentUserAlias.value = userData.alias || '';
      userAvatars.value[currentUserPub.value] = userData.avatar || '';
      encryptedPair.value = userData.encryptedKeyPair || '';
    }
    gun.get('users').get(currentUserPub.value).once((data: any) => {
      if (data?.alias) currentUserAlias.value = data.alias;
      if (data?.signature) currentUserAlias1.value = data.signature;
      if (data?.avatar) userAvatars.value[currentUserPub.value!] = data.avatar;
    });
  }
});


import Moment from './Moment.vue'; // 假设你的组件文件

const momentsRef = ref<InstanceType<typeof Moment> | null>(null);

const triggerRefresh = () => {
  if (momentsRef.value) {
    // 模拟 ionRefresh 事件
    const mockEvent = { detail: { complete: () => {} } } as CustomEvent;
    momentsRef.value.refreshMoments(mockEvent);
  }
};



  import { closeOutline, sendOutline, imageOutline } from 'ionicons/icons'; 
  import { useMoments } from '@/composables/useMoments';
  import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel';
  import 'vue3-carousel/dist/carousel.css';
  
  const router = useRouter();
  const momentsCore = useMoments();
  const { newMomentContent, postMoment, } = momentsCore;
  
  const selectedImages = ref<string[]>([]);
  const fileInput = ref<HTMLInputElement | null>(null);
  const isPosting = ref(false);
  
  // 选择图片
  const selectImages = () => {
    fileInput.value?.click();
  };
  
  // 压缩图片函数
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const reader = new FileReader();
  
      reader.onload = (e) => {
        img.src = e.target!.result as string;
        img.onload = () => {
          const scale = maxWidth / img.width;
          const width = img.width > maxWidth ? maxWidth : img.width;
          const height = img.width > maxWidth ? img.height * scale : img.height;
  
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
  
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };
  
  // 处理图片选择并压缩
  const handleImageSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      for (const file of files) {
        try {
          const compressedBase64 = await compressImage(file, 800, 0.7);
          selectedImages.value.push(compressedBase64);
        } catch (error) {
          console.error('图片压缩失败:', error);
         // showToast('Failed to compress image', 'danger');
        }
      }
      input.value = '';
    }
  };
  
  // 移除图片
  const removeImage = (index: number) => {
    selectedImages.value.splice(index, 1);
  };
  
  // 添加超时 Promise 包装
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    );
    return Promise.race([promise, timeout]) as Promise<T>;
  };
  const {
  moments, loadMoments, isLiked, getLikeCount, getBuddyAlias, formatTimestamp, addLike,
  removeLike, momentComments, hasMore, loading, lastTimestamp,getComments,showMomentDetails
} = momentsCore;
  



  const handlePost = async () => {
    // if (isPosting.value) return;
    // isPosting.value = true;
    triggerRefresh();
    let content = newMomentContent.value.trim();
    if (selectedImages.value.length > 0) {
      const imageContent = selectedImages.value.map(img => `[IMAGE]\n${img}`).join('\n');
      content = content ? `${content}\n${imageContent}` : imageContent;
    }
    newMomentContent.value = content;
   // console.log('发送的动态内容:', content);
  //  isPosting.value = false;
    try {
     // await withTimeout(postMoment(), 10000); 
      postMoment()
    //  await withTimeout(postMoment(), 2000); // 10秒超时
      closeModal();
      moments.value = [];
    lastTimestamp.value = undefined;
    hasMore.value = true;
    // await  loadMoments();
    // await  loadMoments();
    // triggerRefresh();
     // console.log('动态发布成功');
    //  showToast('Moment posted successfully', 'success');
      selectedImages.value = [];
      newMomentContent.value = '';
 
      // router.go(-1);
    } catch (error : any) {
     // console.error('发布动态失败:', error);
    //  showToast('Failed to post moment: ' + (error.message || 'Unknown error'), 'danger');
    } finally {
      isPosting.value = false;
    }
  };

  
</script>

<style scoped>
.redboom{
  color: red;
  background-color: red;
  border-radius: 50%;
padding: 3px;
position: absolute;
top: 0;
right: 0;
}
.menulist1 {
  position: absolute;
  gap: 20px;
  display: flex;
  justify-content: start;
  align-items: start;
  top: 10%;
  left: 10px;
  flex-direction: column;
}
.menulist {
  position: absolute;
  gap: 20px;
  display: flex;
  justify-content: end;
  align-items: end;
  flex-direction: column;
  top: 10%;
  right: 10px;
}
.cosmic-content {
  --background: transparent;
  position: relative;
  overflow: visible;
}
.liquid-toolbar {
  --background: var(--background-color-no);
  /* backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); */
  overflow: visible;
  position: relative;
}
ion-toolbar {
  overflow: visible;

  --border-color: transparent;
}
.nav-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;
  overflow: visible;
  z-index: 10;
  /* filter: blur(1px); */
}
.cosmic-icon {
  font-size: 36px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}
.cosmic-icon {
  color: var(--ion-text-color);
}
.nav-button.active .cosmic-icon {
  color: rgb(42, 125, 112);
  transform: scale(1.01);
  /* filter: blur(1px); */
}
.nav-button.active .link-icon {
  color: rgb(0, 255, 217);
  transform: scale(1.2) rotate(90deg);
  /* filter: blur(0px); */
}
.nav-button:active .cosmic-icon {
  transform: scale(1.15);
  color: rgb(42, 125, 112);
}
.nav-button.active::after {
  content: '';
  position: absolute;
  width: 50px;
  height: 50px;
  background: radial-gradient(circle, rgba(42, 240, 224, 0.3) 0%, rgba(42, 240, 224, 0) 70%);
  border-radius: 50%;
  z-index: 1;
  animation: pulse 2s infinite ease-in-out;
}
.indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  margin-top: 6px;
  transition: all 0.4s ease;
  position: relative;
  z-index: 2;
}
.indicator.active {
  background: rgb(42, 125, 112);
  width: 20px;
  height: 4px;
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(42, 240, 224, 0.8);
}
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}
@keyframes glowPulse {
  0% {
    opacity: 0.6;
    transform: translateY(0);
  }
  50% {
    opacity: 0.3;
    transform: translateY(-10px);
  }
  100% {
    opacity: 0.6;
    transform: translateY(0);
  }
}
.components-container {
  position: relative;
  width: 100%;
  height: 100%;
}
@media (min-width: 768px) {
  .components-container {
    width: calc(100% - 80px);
  }
}
.page-component {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  pointer-events: none;
  overflow-y: hidden;
}
.page-component.active {
  opacity: 1;
  pointer-events: auto;
}
.sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 80px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.liquid-sidebar {
  background: transparent;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.components-container.with-sidebar {
  margin-left: 80px;
}
.sidebar .nav-button {
  margin: 20px 0;
}
.liquid-toolbar1 {
  --border-color: transparent;
  --background-color: transparent;
}
.blur-background {
  width: 100vw;
  height: 100vh;
  backdrop-filter: blur(20px);
  z-index: -1;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.gradient-mask {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 10vh;
  background: linear-gradient(to top, var(--ion-background-color) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}
.profile-gesture-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: transparent;
}
.profile-gesture-container1 {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: transparent;
}
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: none;
  margin-top: 239px;
  text-align: center;
  width: 100%;
}
.profile-header1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: none;
  margin-top: 239px;
  text-align: center;
  width: 100%;
}
.profile-header.no-transition {
  transition: none !important;
}
.avatar-wrapper {
  position: relative;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}
.avatar-glow1 {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  filter: blur(20px);
  opacity: 0.3;
  z-index: 3;
  pointer-events: none;
}
.avatar-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  filter: blur(20px);
  transform: scale(1);
  opacity: 0.6;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: screen;
}
.avatar {
  position: relative;
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 50%;
  z-index: 9999;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  opacity: 0.6;
}
.avatar-active {
  transform: scale(1.2);
  z-index: 3;
  animation: none;
}
.username {
  font-size: 50px;
  font-weight: bold;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  color: #2c3e50;
}
.cards-container {
  position: absolute;
  bottom: -70px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 0 10px;
  transition: none;
}
.cards-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
}
.cards-row-1 .modules-container,
.cards-row-2 .modules-container {
  display: flex;
  justify-content: center;
  gap: 15px;
  width: 100%;
  max-width: 600px;
}
.module.cosmic-item {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(0, 255, 213, 0.136);
  border-radius: 12px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: visible;
}
.module.cosmic-item:active {
  transform: scale(1.05);
}
.custom-modal {

  --backdrop-opacity: 0.5;
  --border-radius: 12px;
  --max-width: 96%;
  --max-height: 70%;

}






/* 
 */


 ion-content {
    --padding-start: 0;
    --padding-end: 0;
    --padding-top: 0;
    --padding-bottom: 0;
  }
  
  ion-toolbar {
    --border-width: 0;
    --padding-top: 8px;
    --padding-bottom: 8px;
  }
  
  ion-title {
    font-size: 1.2em;
    font-weight: 700;
  }
  
  .input-container {
    position: relative;
    margin-bottom: 16px;
    padding: 0 16px;
    overflow-y: auto;
    max-height:300px
  }
  
  .moment-textarea {
    --padding-start: 12px;
    --padding-end: 12px;
    --padding-top: 12px;
    --padding-bottom: 12px;
    font-size: 16px;
    /* overflow-y: auto; */
  }
  
  .char-count {
    text-align: right;
    font-size: 12px;
    color: #8795a1;
    margin: 4px 0 0;
  }
  
  .over-limit {
    color: #ff6b6b;
  }
  
  .image-carousel {
    width: 100%;
    height: 390px;
    overflow: hidden;
  }
  
  .carousel__slide {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .image-item {
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .moment-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  
  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    --padding-start: 4px;
    --padding-end: 4px;
    --background: rgba(0, 0, 0, 0.5);
    --border-radius: 50%;
  }
  
  :deep(.carousel__viewport) {
    width: 100%;
    height: 100%;
  }
  
  :deep(.carousel__track) {
    display: flex;
    flex-direction: row;
  }
  
  :deep(.carousel__pagination) {
    padding: 10px 0;
  }
  
  :deep(.carousel__pagination-button) {
    width: 8px;
    height: 8px;
    background: #fff;
    opacity: 0.8;
    border-radius: 50%;
    margin: 0 4px;
  }
  
  :deep(.carousel__pagination-button--active) {
    background: #00ffbb;
    opacity: 1;
  }
  
  :deep(.carousel__prev),
  :deep(.carousel__next) {
    color: #fff;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    top: 50%;
    transform: translateY(-50%);
  }
  
  :deep(.carousel__prev) {
    left: 10px;
  }
  
  :deep(.carousel__next) {
    right: 10px;
  }
  
  .image-select-btn {
    --border-radius: 12px;
    margin: 16px;
    font-size: 30px;
  }
  
  ion-button {
    --padding-start: 8px;
    --padding-end: 8px;
  }
</style>