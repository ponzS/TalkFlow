<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
          <ion-title>{{$t('datamigration')}}</ion-title>
          <ion-buttons slot="start">
            <ion-back-button default-href="/settings" color="dark"></ion-back-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <p>{{$t('datamigrationtalk')}}</p>
        <ion-button color="dark" expand="block" @click="goToExport">{{$t('exportdata')}}</ion-button>
        <ion-button color="dark" expand="block" @click="goToImport">{{$t('importdata')}}</ion-button>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton } from '@ionic/vue';
  import { useRouter } from 'vue-router';
  
  const router = useRouter();
  
  const goToExport = () => router.push('/MigrationExport');
  const goToImport = () => router.push('/MigrationImport');
  </script>