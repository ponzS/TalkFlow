<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
            <ion-buttons slot="start">
          <ion-back-button color="dark" @click="router.go(-1)"></ion-back-button>
        </ion-buttons>
          <ion-title>创建群聊</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item>
            <ion-label position="floating">群聊名称</ion-label>
            <ion-input v-model="groupName" />
          </ion-item>
          <ion-item>
            <ion-label>公开群聊</ion-label>
            <ion-toggle v-model="isOpen" />
          </ion-item>
        </ion-list>
        <ion-button expand="block" @click="createGroup">创建</ion-button>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonInput, IonToggle, IonButton,IonBackButton, } from '@ionic/vue';
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useRoomChat } from '@/composables/useRoomChat';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  
  const { gun, storageServ } = getTalkFlowCore();
  const { createRoom } = useRoomChat(gun, storageServ);
  const router = useRouter();
  
  const groupName = ref('');
  const isOpen = ref(false);
  
  async function createGroup() {
    if (!groupName.value) {
      alert('请输入群聊名称');
      return;
    }
    const roomPubKey = await createRoom(groupName.value, isOpen.value);
    router.push(`/group-chat/${roomPubKey}`);
  }
  </script>