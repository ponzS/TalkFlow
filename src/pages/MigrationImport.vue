<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
          <ion-title>{{$t('importdata')}}</ion-title>
          <ion-buttons slot="start">
              <ion-back-button :text="$t('back')" ></ion-back-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
               <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
{{$t('importdata')}}
            </h1>
          </ion-toolbar>
        </ion-header>

        <ion-text v-if="!isImporting">
          <h2>{{$t('importdatatalk')}}</h2>
          <ion-input v-model="inputSyncCode" placeholder="Enter 6-digit verification code" :maxlength="6" type="number"></ion-input>
          <ion-button color="dark" @click="startImport">{{$t('importdatatalk1')}}</ion-button>
          <p>{{$t('importdatatalk2')}}</p>
          
          <!-- Display data pool status before import -->
          <div class="sync-status" style="margin-top: 20px;" v-if="inputSyncCode && inputSyncCode.length === 6">
            <h3>Data Pool Status</h3>
            <ion-text color="success" v-if="otherDeviceExportStatus">
              <p>✅ Data available in pool</p>
            </ion-text>
            <ion-text color="medium" v-else>
              <p>⏳ Checking data pool status...</p>
            </ion-text>
          </div>
        </ion-text>
        <ion-text v-else>
          <h2>{{$t('importdatatalk3')}}...</h2>
          <ion-progress-bar :value="importProgress / 100"></ion-progress-bar>
          <p>{{$t('importdatatalk4')}}: {{ importProgress }}%</p>
          
          <!-- Sync status display -->
          <div class="sync-status" style="margin-top: 20px;">
            <ion-text color="success" v-if="otherDeviceExportStatus">
              <p>✅ Other device data export completed</p>
            </ion-text>
            <ion-text color="primary" v-if="syncStatus >= 2">
              <p>✅ Data synchronization completed</p>
            </ion-text>
            <ion-text color="medium" v-if="!otherDeviceExportStatus">
              <p>⏳ Waiting for other device to export data...</p>
            </ion-text>
          </div>
        </ion-text>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonInput, IonButton, IonProgressBar, IonButtons, IonBackButton } from '@ionic/vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useToast } from '@/composables/useToast';
const { importDataFromGun, importProgress, syncStatus, otherDeviceExportStatus, startSyncStatusListener } = getTalkFlowCore();

const { showToast } = useToast();
const inputSyncCode = ref('');
const isImporting = ref(false);
let syncStatusCleanup: (() => void) | null = null;

// Listen for input code changes, automatically check data pool status when 6 digits are entered
watch(inputSyncCode, (newCode) => {
  if (newCode && newCode.length === 6) {
    // Clean up previous listener
    if (syncStatusCleanup) {
      syncStatusCleanup();
    }
    // Start listening to sync status to check data pool
    syncStatusCleanup = startSyncStatusListener(newCode);
  }
});

async function startImport() {
  if (!inputSyncCode.value || inputSyncCode.value.length !== 6) {
    showToast('Please enter 6-digit verification code', 'warning');
    return;
  }
  isImporting.value = true;
  
  // Reset progress
  importProgress.value = 0;
  
  try {
    await importDataFromGun(inputSyncCode.value);
    isImporting.value = false;
    showToast('Data import successful', 'success');
  } catch (err) {
    console.error('Import failed:', err);
    isImporting.value = false;
    showToast('Import failed, please check if the verification code is correct', 'error');
  }
}

// Clean up listener when component is unmounted
onUnmounted(() => {
  if (syncStatusCleanup) {
    syncStatusCleanup();
  }
});
</script>