<!-- views/DeviceList.vue -->
<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button @click="router.go(-1)" color="dark"></ion-back-button>
        </ion-buttons>
          <ion-title>{{$t('keysecuritydetection')}}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-list-header>{{$t('onlineequipment')}} ({{ activeDevices.length }})</ion-list-header>
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
  
          <ion-list-header>{{$t('historicalequipment')}} ({{ historicalDevices.length }})</ion-list-header>
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
        <ion-button color="dark" expand="block" @click="refreshStatus" :disabled="isRefreshing">
          <ion-spinner v-if="isRefreshing" name="dots"></ion-spinner>
          <span v-else>{{$t('refreshstatus')}}</span>
        </ion-button>
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
      console.error('Failed to update device status:', error);
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
  ion-badge {
    margin-left: 8px;
  }
  </style>