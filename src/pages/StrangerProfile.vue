<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ strangerAlias || getAliasRealtime(strangerPub) }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="profile-container">
        <img
          v-if="strangerAvatar || userAvatars[strangerPub]"
          :src="strangerAvatar || userAvatars[strangerPub]"
          alt="Avatar"
          class="avatar"
          @click="goToProfile(strangerPub)"
        />
        <img
          v-else
          :src="getGunAvatar(strangerPub)"
          alt="Generated Avatar"
          class="avatar"
          @click="goToProfile(strangerPub)"
        />
        <h1 class="username">{{ strangerAlias || getAliasRealtime(strangerPub) }}</h1>
        <p v-if="!isUrl(strangerSignature || getFriendSignature(strangerPub))" class="signature">
          {{ strangerSignature || getFriendSignature(strangerPub) || '' }}
        </p>
        <p v-else class="signature">
          <a @click.prevent="openUrl(strangerSignature || getFriendSignature(strangerPub))" class="signature-link">
            {{ strangerSignature || getFriendSignature(strangerPub) }}
          </a>
        </p>
        <div class="info-section">
          <p><strong>PubKey:</strong> {{ strangerPub }}</p>
          <ion-button color="dark" expand="block" @click="copyPub(strangerPub)">Copy</ion-button>
        </div>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button color="dark" expand="block" @click="showRequestModal = true">{{ $t('addfriend1') }}</ion-button>
      </ion-toolbar>
    </ion-footer>

    <!-- 好友申请留言弹窗 -->
    <ion-modal :is-open="showRequestModal" @didDismiss="showRequestModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('addfriend') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button color="dark" @click="showRequestModal = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-textarea
          v-model="requestMessage"
          placeholder="Message"
        ></ion-textarea>
        <ion-button color="dark" expand="block" @click="sendFriendRequest">{{ $t('addfriend2') }}</ion-button>
        <ion-text v-if="buddyError" color="danger">{{ buddyError }}</ion-text>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonButton, IonButtons, IonBackButton, IonModal, IonTextarea, IonText, IonIcon } from '@ionic/vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { gunAvatar } from "gun-avatar";
import { Browser } from '@capacitor/browser';

const chatFlow = getTalkFlowCore();
const { gun, getAliasRealtime, getFriendSignature, copyPub, userAvatars, friendPub, requestAddBuddyWithMessage, buddyError } = chatFlow;
const router = useRouter();
const route = useRoute();

const strangerPub = ref(route.query.pub as string);
const showRequestModal = ref(false);
const requestMessage = ref('');

// 独立状态用于存储从 Gun.js 获取的数据
const strangerAlias = ref<string | null>(null);
const strangerAvatar = ref<string | null>(null);
const strangerSignature = ref<string | null>(null);


const { currentUserPub, setSelectedFriendPub } = getTalkFlowCore();

const goToProfile = (userPub: string) => {
  if (userPub === currentUserPub.value) {
    router.push('/MyMoments');
  } else {
    setSelectedFriendPub(userPub);
    router.push('/FriendMoments');
  }
};


// 从核心代码的 gun 获取陌生人数据
function fetchStrangerData(pub: string) {
  gun.get('users').get(pub).once((data: any) => {
    if (data) {
      strangerAlias.value = data.alias || null;
      strangerAvatar.value = data.avatar || null;
      strangerSignature.value = data.signature || null;
      console.log(`获取 ${pub} 数据:`, {
        alias: strangerAlias.value,
        avatar: strangerAvatar.value,
        signature: strangerSignature.value,
      });
    } else {
      console.log(`未找到 ${pub} 的数据`);
    }
  });
}
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

// Generate avatar based on user's public key
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value
  });
};

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

// 组件挂载时获取数据
onMounted(() => {
  fetchStrangerData(strangerPub.value);
});

function sendFriendRequest() {
  friendPub.value = strangerPub.value;
  requestAddBuddyWithMessage(requestMessage.value)
    .then(async () => {
      showRequestModal.value = false;
      requestMessage.value = '';
      await router.go(-2);
    })
    .catch((err: { message: string }) => {
      buddyError.value = err.message || '发送申请失败';
    });
}
</script>

<style scoped>
.profile-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 15px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.username {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 5px;
}

.signature {
  font-size: 1rem;
  color: #666;
  margin-bottom: 20px;
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

.info-section {
  width: 100%;
  max-width: 400px;
  text-align: left;
}

.info-section p {
  margin: 10px 0;
  font-size: 1rem;
  word-break: break-all;
}

.info-section strong {
  color: #333;
}
</style>