<!-- views/DeviceList.vue -->
<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
        <ion-buttons slot="start">
           <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
          <ion-title>{{$t('keysecuritydetection')}}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
               <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
{{$t('keysecuritydetection')}}
            </h1>
          </ion-toolbar>
        </ion-header>

        <ion-list class="device-list">
          <ion-list-header class="list-header">{{$t('onlineequipment')}} ({{ activeDevices.length }})</ion-list-header>
          <ion-item v-for="device in activeDevices" :key="device.deviceId">
            <ion-label>
              <h2>{{ device.model }} <ion-badge color="success" v-if="device.isCurrent">Current</ion-badge></h2>
              <p>ID: {{ device.deviceId }}</p>
              <p>System: {{ device.os }} {{ device.osVersion }}</p>
              <p>Last: {{ formatTimestamp(device.timestamp) }}</p>
              <p>Status: {{ device.isOnline ? 'Online' : 'Offline' }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="activeDevices.length === 0">
            <ion-label color="medium">No online devices found</ion-label>
          </ion-item>
  
          <ion-list-header class="list-header">{{$t('historicalequipment')}} ({{ historicalDevices.length }})</ion-list-header>
          <ion-item v-for="device in historicalDevices" :key="device.deviceId">
            <ion-label>
              <h2>{{ device.model }} <ion-badge color="success" v-if="device.isCurrent">Current</ion-badge></h2>
              <p>ID: {{ device.deviceId }}</p>
              <p>System: {{ device.os }} {{ device.osVersion }}</p>
              <p>Last: {{ formatTimestamp(device.timestamp) }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="historicalDevices.length === 0">
            <ion-label color="medium">No historical devices found</ion-label>
          </ion-item>
        </ion-list>
        <div class="refresh-button-container">
          <ion-button color="dark" expand="block" @click="refreshStatus" :disabled="isRefreshing" class="refresh-button">
            <ion-spinner v-if="isRefreshing" name="dots"></ion-spinner>
            <span v-else>{{$t('refreshstatus')}}</span>
          </ion-button>
        </div>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import Gun from 'gun';
  import { useDeviceTracking } from '@/composables/useDeviceTracking';
  import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonItem, IonLabel, IonButton, IonBadge, IonSpinner, IonButtons, IonBackButton } from '@ionic/vue';
  
  const chatFlowStore = getTalkFlowCore();
  const router = useRouter();
  const isRefreshing = ref(false);

  const {
    gun,
    showToast
  } = chatFlowStore;
  
  const { currentDeviceId, activeDevices, historicalDevices, updateDeviceStatus } = useDeviceTracking(gun);
  
  async function refreshStatus() {
    try {
      isRefreshing.value = true;
      await updateDeviceStatus();
      showToast('Device status updated successfully', 'success');
    } catch (error) {
      // console.error('Failed to update device status:', error);
      showToast('Failed to update device status', 'error');
    } finally {
      isRefreshing.value = false;
    }
  }

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString();
  }
  </script>
  
  <style scoped>
  .device-list {
    margin-bottom: 20px;
  }

  .list-header {
    font-weight: 600;
    color: var(--ion-color-primary);
    padding: 16px 20px 8px 20px;
    font-size: 16px;
  }

  ion-item {
    --padding-start: 20px;
    --padding-end: 20px;
    --inner-padding-end: 0px;
    margin-bottom: 8px;
    border-radius: 12px;
    --background: var(--ion-color-light, #f8f9fa);
  }

  ion-item:last-of-type {
    margin-bottom: 16px;
  }

  ion-label h2 {
    margin: 8px 0 4px 0;
    font-weight: 600;
    font-size: 18px;
    color: var(--ion-color-dark);
  }

  ion-label p {
    margin: 4px 0;
    font-size: 14px;
    color: var(--ion-color-medium);
    line-height: 1.4;
  }

  ion-badge {
    margin-left: 8px;
    font-size: 12px;
    padding: 4px 8px;
  }

  .refresh-button-container {
    padding: 20px 0;
    margin-top: 16px;
  }

  .refresh-button {
    margin: 0;
    height: 48px;
    font-weight: 600;
    --border-radius: 12px;
  }

  /* 空状态样式优化 */
  ion-item ion-label[color="medium"] {
    text-align: center;
    font-style: italic;
    padding: 20px 0;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .list-header {
      padding: 12px 16px 6px 16px;
      font-size: 15px;
    }
    
    ion-item {
      --padding-start: 16px;
      --padding-end: 16px;
    }
    
    ion-label h2 {
      font-size: 16px;
    }
    
    ion-label p {
      font-size: 13px;
    }
  }
  </style>