<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <div color="dark" @click="goBack">
            <ion-icon style="font-size:25px;margin-left:10px;" color="dark" :ios="chevronBackOutline" :md="chevronBackOutline"></ion-icon>
          </div>
        </ion-buttons>
        <ion-title>{{ currentGroupName }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-list>
              <ion-list-header>Online List</ion-list-header>
              <ion-item v-for="member in displayedMembers" :key="member.pubKey" lines="full">
                <img class="member-avatar" :src="getGunAvatar(member.pubKey)" alt="" slot="start" />
                <ion-label>
                  <div class="member-info">
                    <span class="member-alias">{{ member.alias }}</span>
                    <span :class="['status-dot', member.isOnline ? 'online' : 'offline']"></span>
                  </div>
                  <p class="member-pubkey">Public Key: {{ formatPubKey(member.pubKey) }}</p>
                </ion-label>
              </ion-item>
              <ion-item lines="none" v-if="members.length > 2">
                <ion-button fill="clear" @click="toggleShowMore">
                  {{ showAllMembers ? 'Show Less' : 'Show More' }}
                </ion-button>
              </ion-item>
            </ion-list>
            <ion-list>
              <ion-list-header>Clear Chat History Vote ({{ agreeCount }}/{{ members.length }} members agreed)</ion-list-header>
              <ion-item lines="none">
                <ion-checkbox
                  slot="start"
                  :checked="localVoteStatus"
                  @ionChange="toggleVote($event)"
                  label-placement="end"
                  justify="start"
                >Agree to Clear Chat History</ion-checkbox>
                <ion-button
                  slot="end"
                  v-if="canClearChat"
                  color="danger"
                  @click="initiateClearChat"
                >Clear Chat History</ion-button>
              </ion-item>
            </ion-list>
            <!-- <ion-list v-if="agreeCount > 0">
              <ion-list-header>Members Who Agreed</ion-list-header>
              <ion-item lines="none">
                <div class="voted-avatars">
                  <img
                    v-for="member in simulatedVotedMembers"
                    :key="member.pubKey"
                    class="voted-avatar"
                    :src="getGunAvatar(member.pubKey)"
                    :alt="member.alias"
                  />
                </div>
              </ion-item>
            </ion-list> -->
          </ion-col>
        </ion-row>
      </ion-grid>
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
} from '@ionic/vue';
import { useGroupChat } from '@/composables/useGroupChat';
import { useRoute, useRouter } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import { chevronBackOutline } from 'ionicons/icons';
import { gunAvatar } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';

const route = useRoute();
const router = useRouter();
const { isDark } = useTheme();
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
} = useGroupChat();

const members = computed(() => {
  return currentGroup.value ? membersByGroup.value[currentGroup.value] || [] : [];
});

// Whether to show all members
const showAllMembers = ref(false);

// Displayed members list (up to 8 or all)
const displayedMembers = computed(() => {
  return showAllMembers.value ? members.value : members.value.slice(0, 8);
});

// Current user's vote status
const localVoteStatus = ref(false);

// Simulated voted members (based on agreeCount)
const simulatedVotedMembers = computed(() => {
  // If the current user voted, include them first
  const votedMembers = [];
  if (localVoteStatus.value) {
    const currentMember = members.value.find(member => member.pubKey === safeUserPub.value);
    if (currentMember) votedMembers.push(currentMember);
  }
  // Fill remaining voted members (randomly selected, simulating actual voters)
  const remainingCount = agreeCount.value - (localVoteStatus.value ? 1 : 0);
  const otherMembers = members.value.filter(member => member.pubKey !== safeUserPub.value);
  return votedMembers.concat(otherMembers.slice(0, remainingCount));
});

// Toggle show more/less
const toggleShowMore = () => {
  showAllMembers.value = !showAllMembers.value;
};

// Toggle vote status
const toggleVote = async (event: CustomEvent) => {
  const isChecked = event.detail.checked;
  try {
    if (isChecked) {
      await voteToClear();
      localVoteStatus.value = true;
    } else {
      await cancelVote();
      localVoteStatus.value = false;
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

// Generate avatar
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true,
  });
};

onMounted(() => {
  const pub = getCurrentGroup();
  if (!pub) {
    const routePub = route.params.pub as string;
    if (routePub) {
      setCurrentGroup(routePub);
    } else {
      router.push('/groups');
    }
  }
});
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

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.online {
  background-color: #01b872;
}

.status-dot.offline {
  background-color: #bbb;
}

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
}

.voted-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
</style>