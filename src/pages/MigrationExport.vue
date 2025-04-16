<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
          <ion-title>{{$t('exportdata')}}</ion-title>
          <ion-buttons slot="start">
            <ion-back-button default-href="/migration/choice" color="dark"></ion-back-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-text v-if="!syncCode">
          <h2>{{$t('exportdatatalk2')}}...</h2>
          <ion-progress-bar :value="exportProgress / 100"></ion-progress-bar>
          <p>{{$t('importdatatalk4')}}: {{ exportProgress }}%</p>
          <p>{{$t('exportdatatalk3')}}</p>
        </ion-text>
        <ion-text v-else>
          <h2>{{$t('exportdatatalk4')}}</h2>
          <p>{{$t('exportdatatalk5')}}：</p>
          <ion-input :value="syncCode" readonly></ion-input>
          <ion-button color="dark" @click="copySyncCode">Copy Code</ion-button>
        </ion-text>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonProgressBar, IonInput, IonButton, IonButtons, IonBackButton } from '@ionic/vue';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  import { useToast } from '@/composables/useToast';
  import { Clipboard } from '@capacitor/clipboard';
  
  const { exportDataToGun, exportProgress } = getTalkFlowCore();
  const { showToast } = useToast();
  
  const syncCode = ref<string | null>(null);
  
  async function startExport() {
    try {
      const { syncCode: code } = await exportDataToGun();
      syncCode.value = code;
    } catch (err) {
      console.error('导出失败:', err);
    }
  }
  
  async function copySyncCode() {
    await Clipboard.write({ string: syncCode.value! });
    showToast('同步码已复制', 'success');
  }
  
  startExport();
  </script>