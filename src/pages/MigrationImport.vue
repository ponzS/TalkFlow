<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
          <ion-title>{{$t('importdata')}}</ion-title>
          <ion-buttons slot="start">
            <ion-back-button default-href="/migration/choice" color="dark"></ion-back-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-text v-if="!isImporting">
          <h2>{{$t('importdatatalk')}}</h2>
          <ion-input v-model="inputSyncCode" placeholder="code"></ion-input>
          <ion-button color="dark" @click="startImport">{{$t('importdatatalk1')}}</ion-button>
          <p>{{$t('importdatatalk2')}}</p>
        </ion-text>
        <ion-text v-else>
          <h2>{{$t('importdatatalk3')}}...</h2>
          <ion-progress-bar :value="importProgress / 100"></ion-progress-bar>
          <p>{{$t('importdatatalk4')}}: {{ importProgress }}%</p>
        </ion-text>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonInput, IonButton, IonProgressBar, IonButtons, IonBackButton } from '@ionic/vue';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  import { useToast } from '@/composables/useToast';
  const { importDataFromGun, importProgress } = getTalkFlowCore();
  
const { showToast } = useToast();
  const inputSyncCode = ref('');
  const isImporting = ref(false);
  
  async function startImport() {
    if (!inputSyncCode.value) {
      showToast('Null code', 'warning');
      return;
    }
    isImporting.value = true;
    try {
      await importDataFromGun(inputSyncCode.value);
    } catch (err) {
     // console.error('导入失败:', err);
      isImporting.value = false;
    }
  }
  </script>