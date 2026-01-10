<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
          <ion-title>{{$t('exportdata')}}</ion-title>
          <ion-buttons slot="start">
              <ion-back-button :text="$t('back')" ></ion-back-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
             <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
{{$t('exportdata')}}
            </h1>
          </ion-toolbar>
        </ion-header>

        <ion-text v-if="!syncCode">
          <h2>{{$t('exportdatatalk2')}}...</h2>
          <ion-progress-bar :value="exportProgress / 100"></ion-progress-bar>
          <p>{{$t('importdatatalk4')}}: {{ exportProgress }}%</p>
          <p>{{$t('exportdatatalk3')}}</p>
        </ion-text>
        <ion-text v-else>
          <h2>{{$t('exportdatatalk4')}}</h2>
          <p>{{$t('exportdatatalk5')}}：</p>
          <div style="text-align: center; margin: 20px 0;">
            <div style="font-size: 2em; font-weight: bold; letter-spacing: 0.2em; color: var(--ion-color-primary); background: var(--ion-color-light); padding: 15px; border-radius: 10px; margin: 10px 0;">{{ syncCode }}</div>
          </div>
          <ion-button color="dark" @click="copySyncCode">Copy Code</ion-button>
          
          <!-- 同步状态显示 -->
          <div class="sync-status" style="margin-top: 20px;">
            <ion-text color="success" v-if="syncStatus >= 1">
              <p>✅ Data export completed</p>
            </ion-text>
            <ion-text color="primary" v-if="syncStatus >= 2">
              <p>✅ Other device has received data</p>
            </ion-text>
            <ion-text color="medium" v-if="syncStatus < 2">
              <p>⏳ Waiting for other device to receive data...</p>
            </ion-text>
          </div>
        </ion-text>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref, onUnmounted } from 'vue';
  import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonProgressBar, IonInput, IonButton, IonButtons, IonBackButton } from '@ionic/vue';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  import { useToast } from '@/composables/useToast';
  import { Clipboard } from '@capacitor/clipboard';
  
  const { exportDataToGun, exportProgress, syncStatus, startSyncStatusListener } = getTalkFlowCore();
  const { showToast } = useToast();
  
  const syncCode = ref<string | null>(null);
  let syncStatusCleanup: (() => void) | null = null;
  
  async function startExport() {
    try {
      const { syncCode: code } = await exportDataToGun();
      syncCode.value = code;
      
      // Start listening to sync status
      syncStatusCleanup = startSyncStatusListener(code);
    } catch (err) {
      // console.error('Export failed:', err);
    }
  }
  
  // Clean up listener when component is unmounted
  onUnmounted(() => {
    if (syncStatusCleanup) {
      syncStatusCleanup();
    }
  });
  
  async function copySyncCode() {
    await Clipboard.write({ string: syncCode.value! });
    showToast('Sync code copied', 'success');
  }
  
  startExport();
  </script>