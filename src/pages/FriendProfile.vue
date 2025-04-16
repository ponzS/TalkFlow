<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
          <ion-back-button @click="router.go(-1)" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ getDisplayName(friendPub) }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="goToSettings">
            <ion-icon color="dark" :icon="createOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="liquid-container">
        <div class="avatar-wrapper">
          <img
            v-if="userAvatars[friendPub]"
            :src="userAvatars[friendPub]"
            alt="Avatar"
            class="avatar"
            @click="goToProfile(friendPub)"
          />
          <img
            v-else
            :src="getGunAvatar(friendPub)"
            alt="Avatar"
            class="avatar"
            @click="goToProfile(friendPub)"
          />
        </div>
        <h1 class="username">{{ getAliasRealtime1(friendPub) }}</h1>
        <p v-if="!isUrl(getFriendSignature(friendPub))" class="signature">
          {{ getFriendSignature(friendPub) || '' }}
        </p>
        <p v-else class="signature">
          <a @click.prevent="openUrl(getFriendSignature(friendPub))" class="signature-link">
            {{ getFriendSignature(friendPub) }}
          </a>
        </p>
        <div class="info-card">
          <div v-if="friendRemarks[friendPub]?.remarkInfo" class="info-item">
            <span class="value">{{ friendRemarks[friendPub].remarkInfo }}</span>
          </div>
          <div class="info-item">
            <span class="label">Key</span>
            <div class="pubkey-container">
              <span class="value">{{ friendPub }}</span>
              <ion-icon :icon="copyOutline" class="copy-icon" @click="copyPub(friendPub)"></ion-icon>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <ion-footer :translucent="true">
      <ion-toolbar class="liquid-footer">
        <button class="liquid-button" @click="chatWithFriend">{{ $t('sendmessage') }}</button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonButton, IonButtons, IonBackButton, IonIcon } from '@ionic/vue';
import { copyOutline, createOutline } from 'ionicons/icons';
import { gunAvatar, mountClass } from "gun-avatar";
import { Browser } from '@capacitor/browser';

mountClass();
const chatFlow = getTalkFlowCore();
const { userAvatars, getAliasRealtime, getFriendSignature, copyPub, friendRemarks, openChat, getAliasRealtime1 } = chatFlow;
const router = useRouter();
const route = useRoute();

const friendPub = ref(route.query.pub as string);

onMounted(async () => {
  if (!friendPub.value) {
    router.back();
    return;
  }
});
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();
const { currentUserPub, setSelectedFriendPub } = getTalkFlowCore();

const goToProfile = (userPub: string) => {
  if (userPub === currentUserPub.value) {
    router.push('/MyMoments');
  } else {
    setSelectedFriendPub(userPub);
    router.push('/FriendMoments');
  }
};
// Generate avatar based on user's public key
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value
  });
};

function getDisplayName(pub: string): string {
  const remark = friendRemarks.value[pub]?.remark;
  return remark && remark.trim() !== '' ? remark : getAliasRealtime(pub);
}

function goToSettings() {
  router.push({ path: '/friend-settings', query: { pub: friendPub.value } });
}

function chatWithFriend() {
  openChat(friendPub.value);
  router.push('/chatpage');
}

// URL 检测和打开函数
const urlRegex = /^(https?:\/\/[^\s]+|\b\w+\.(com|cn|org|net|edu|gov|io|co)(?:\.\w+)?(?:\/[^\s]*)?)$/i;

function isUrl(text: string | null): boolean {
  return !!text && urlRegex.test(text);
}

async function openUrl(url: string) {
  const formattedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
  try {
    await Browser.open({ url: formattedUrl });
  } catch (error) {
    console.error('Failed to open URL:', error);
  }
}
</script>

<style scoped>
.liquid-container {
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
}

.liquid-toolbar {
  --background-color: transparent;
  --border-color: transparent;
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 120px;
  height: 120px;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  animation: morph 6s ease-in-out infinite;
}

@keyframes morph {
  0% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
  25% { border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%; }
  50% { border-radius: 50% 50% 40% 60% / 60% 40% 50% 50%; }
  75% { border-radius: 40% 60% 60% 40% / 50% 50% 40% 60%; }
  100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
}

.avatar:hover {
  transform: scale(1.05);
  transition: transform 0.3s ease;
}

.username {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
}

.signature {
  font-size: 1rem;
  color: #7f8c8d;
  margin-bottom: 2rem;
  max-width: 80%;
  text-align: center;
  font-style: italic;
}

.signature-link {
  color: #2980b9;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.3s ease;
}

.signature-link:hover {
  color: #3498db;
}

.info-card {
  width: 100%;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.057);
  border-radius: 24px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

.info-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.2rem;
  padding-bottom: 1.2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.info-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.label {
  font-size: 0.9rem;
  color: #7f8c8d;
  font-weight: 500;
  margin-bottom: 0.3rem;
}

.value {
  font-size: 1rem;
  color: #2c3e50;
  word-break: break-all;
}

.pubkey-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.copy-icon {
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-icon:hover {
  color: #2980b9;
  transform: scale(1.1);
}

.liquid-footer {
  border: none;
  box-shadow: none;
  border-style: none;
  padding: 1rem;
}

.liquid-button {
  height: 48px;
  width: 100%;
  font-weight: 600;
  font-size: 1.25rem;
  text-transform: none;
  border-radius: 10px;
  background: rgb(43, 43, 43);
  color: #f5f7fa;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.liquid-button:hover {
  background: rgb(60, 60, 60);
  transform: translateY(-2px);
}
</style>