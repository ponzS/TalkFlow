<template>
  <ion-page>
    <ion-header :translucent="true"  collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
          <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>Setting</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="liquid-content">
      <div class="settings-container">
        <!-- Remark Section -->
        <div class="section-card">
          <!-- <h2 class="section-title">个人信息</h2> -->
          <ion-item lines="none">
            <ion-label position="stacked" >{{$t('notethename')}}</ion-label>
            <ion-input v-model="newRemark"  clear-input style="border-radius: 10px;"></ion-input>
          </ion-item>
          <ion-item lines="none">
            <ion-label position="stacked">{{$t('Remarks')}}</ion-label>
            <ion-textarea
              v-model="newRemarkInfo"
             style="border-radius: 10px;"
              auto-grow
              :rows="3"
            ></ion-textarea>
          </ion-item>
        </div>

        <!-- Blocking Section -->
        <div class="section-card">
         
          <ion-item lines="none">
            <ion-label>{{$t('addblacklist')}}</ion-label>
            <ion-toggle slot="end" v-model="isBlocked" @ionChange="toggleBlacklist"></ion-toggle>
          </ion-item>
          <!-- <ion-item lines="none">
            <ion-label>{{$t('colosenotify')}}</ion-label>
            <ion-toggle slot="end" v-model="isNotificationDisabled" @ionChange="toggleNotification"></ion-toggle>
          </ion-item> -->
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <ion-button expand="block" fill="outline" color="dark"  @click="saveSettings">{{$t('savesettings')}}</ion-button>
          <ion-button expand="block" fill="outline" color="danger" @click="deleteFriend">
           {{$t('deletefriend')}}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useChatFlow } from '@/composables/TalkFlowCore';
import { useRouter, useRoute } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonToggle,
  IonButton,
  IonButtons,
  IonBackButton,
} from '@ionic/vue';

const chatFlow = getTalkFlowCore();
const { friendRemarks, updateFriendRemark, addToBlacklist, removeFromBlacklist, isInMyBlacklist, removeBuddy, storageServ } = chatFlow;
const router = useRouter();
const route = useRoute();

const friendPub = ref(route.query.pub as string);
const newRemark = ref('');
const newRemarkInfo = ref('');
const isBlocked = ref(false);

onMounted(async () => {
  if (!friendPub.value) {
    router.back();
    return;
  }
  const remarkData = friendRemarks.value[friendPub.value] || { remark: '', remarkInfo: '' };
  newRemark.value = remarkData.remark;
  newRemarkInfo.value = remarkData.remarkInfo;
  isBlocked.value = isInMyBlacklist(friendPub.value);
});

async function saveSettings() {
  updateFriendRemark(friendPub.value, newRemark.value, newRemarkInfo.value);
  router.back();
}

async function toggleBlacklist() {
  if (isBlocked.value) {
    addToBlacklist(friendPub.value);
    await storageServ.saveBlacklist(friendPub.value, true);
  } else {
    removeFromBlacklist(friendPub.value);
    await storageServ.saveBlacklist(friendPub.value, false);
  }
}

function deleteFriend() {
  if (confirm('确定删除此好友吗？')) {
    removeBuddy(friendPub.value);
    router.push('/index');
  }
}

</script>

<style scoped>
/* .liquid-content {
  --background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%);
} */

.liquid-toolbar {
  
  --border-color: transparent;
 
}

.settings-container {
  padding: 1rem 0.5rem;
  
  margin: 0 auto;
}

.section-card {
  background: rgba(146, 145, 145, 0.106);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1rem;
}

ion-item {
  --background: transparent;
  --border-width: 0;
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-bottom: 1rem;
}

ion-label {
  color: #7f8c8d !important;
  font-weight: 500;
}

ion-input,
ion-textarea {
  --background: rgba(0, 0, 0, 0.05);
  --border-radius: 8px;
  --padding-start: 12px !important;
  --padding-end: 12px !important;
  --color: #2c3e50;
}

ion-textarea {
  --padding-top: 12px !important;
  --padding-bottom: 12px !important;
}

ion-toggle {
  --background: #ddd;
  --background-checked: #3498db;
  --handle-background: #fff;
  --handle-background-checked: #fff;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.save-button {
  --background: #3498db;
  --background-activated: #2980b9;
  --border-radius: 12px;
  --box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
  height: 48px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.save-button:hover {
  --background: #3aa4e8;
  transform: translateY(-2px);
}

ion-button[color="danger"] {
  --border-radius: 12px;
  --border-width: 2px;
  --border-color: #e74c3c;
  --color: #e74c3c;
  height: 48px;
  font-weight: 600;
  transition: all 0.3s ease;
}

ion-button[color="danger"]:hover {
  --background: rgba(231, 76, 60, 0.1);
  transform: translateY(-2px);
}
</style>