<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
      <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t('blacklist') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="liquid-content">
      <div class="input-section">
        <ion-item class="liquid-input-item" lines="none">
          <ion-label position="floating">PubKey</ion-label>
          <ion-input v-model="blockPub" :placeholder="$t('enterPublicKey')"></ion-input>
        </ion-item>
        <div class="button-group">
          <ion-button expand="block" color="dark" @click="addToBlacklist">
            {{ $t('addblacklist') }}
          </ion-button>
          <ion-button expand="block" color="dark" @click="removeFromBlacklist">
            {{ $t('deleteblacklist') }}
          </ion-button>
        </div>
      </div>

      <div class="list-section">
        <h4 class="section-subtitle">{{ $t('myblacklist') }}</h4>
        <ion-list v-if="blacklist.length > 0" class="blacklist-list">
          <ion-item
            v-for="p in blacklist"
            :key="p"
            class="list-item"
            button
            @click="copyPub(p)"
            lines="full"
          >
            <ion-label class="public-key">{{ p }}</ion-label>
            <ion-button slot="end" color="danger" @click.stop="removeFromBlacklist(p)" >
              {{ $t('deleteblacklist') }}
            </ion-button>
          </ion-item>
        </ion-list>
        <ion-text v-else class="empty-message">{{ $t('noBlacklistMembers') }}</ion-text>
      </div>

      <!-- Toast for Copy Feedback -->
      <ion-toast
        :is-open="toastOpen"
        :message="$t('pubKeyCopied')"
        :duration="1500"
        position="bottom"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonItem, IonLabel,
  IonInput, IonButton, IonList, IonToast, IonText,
} from '@ionic/vue';
const chatFlowStore = getTalkFlowCore();
const router = useRouter();
const toastOpen = ref(false);

const {
  copyPub: originalCopyPub,
  blockPub,
  blacklist,
  isInMyBlacklist,
  addToBlacklist: storeAddToBlacklist,
  removeFromBlacklist: storeRemoveFromBlacklist,
} = chatFlowStore;

const addToBlacklist = () => {
  if (blockPub.value.trim()) {
    storeAddToBlacklist();
  }
};

const removeFromBlacklist = (pubKey?: string) => {
  if (pubKey) {
    storeRemoveFromBlacklist(pubKey);
  } else if (blockPub.value.trim()) {
    storeRemoveFromBlacklist();
  }
};

const copyPub = async (pub: string) => {
  await originalCopyPub(pub);
  toastOpen.value = true; // Show toast on copy
};

const goBackToPrevious = () => {
  router.go(-1);
};
</script>

<style scoped>
/* Liquid Toolbar */
.liquid-toolbar {
  --border-color: transparent;

}

/* Liquid Content */
.liquid-content {

  --padding-top: 30px;
  --padding-bottom: 20px;
  --padding-start: 20px;
  --padding-end: 20px;
}

/* Input Section */
.input-section {
  max-width: 600px;
  margin: 0 auto 32px auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Input Item */
.liquid-input-item {
  --background: rgba(130, 130, 130, 0.25);
  --border-radius: 15px;
  --padding-start: 15px;
  --padding-end: 15px;
  margin-bottom: 10px;
  border-radius: 20px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.liquid-input-item:hover {
  transform: scale(1.02);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.liquid-input-item ion-label {

  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}



/* Button Group */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}



/* List Section */
.list-section {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-subtitle {
  font-size: 1.25rem;
  
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.blacklist-list {
  --background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 8px;
}

.list-item {
  --background: transparent;
  --padding-start: 15px;
  --padding-end: 15px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.list-item:hover {
  transform: scale(1.02);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.public-key {

  font-size: 1rem;
  word-break: break-all;
}

.remove-button {
  --border-radius: 12px;
  font-size: 0.9rem;
  height: 36px;
}

.empty-message {
  text-align: center;

  font-size: 1rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

</style>