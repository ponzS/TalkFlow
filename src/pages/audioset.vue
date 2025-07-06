<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Audio Output Test</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Audio Output Control</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>Current Mode: <strong>{{ audioMode }}</strong></p>
            <ion-spinner v-if="isLoading" name="crescent"></ion-spinner>
            <p v-if="error" class="error">{{ error }}</p>
            <ion-button
              expand="block"
              :disabled="isLoading || audioMode === 'speaker'"
              @click="setAudioOutput('speaker')"
            >
              Set to Speaker
            </ion-button>
            <ion-button
              expand="block"
              :disabled="isLoading || audioMode === 'earpiece'"
              @click="setAudioOutput('earpiece')"
            >
              Set to Earpiece
            </ion-button>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonSpinner,
  } from '@ionic/vue';
  import { useAudioOutput } from '@/composables/useSetAudioMode';
  
  const { audioMode, isLoading, error, setAudioOutput } = useAudioOutput();
  </script>
  
  <style scoped>
  .error {
    color: red;
  }
  </style>