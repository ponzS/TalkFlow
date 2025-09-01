<script setup lang="ts">
import { ref } from 'vue';

import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonIcon,
  IonModal, IonToggle 
} from '@ionic/vue';
import { addCircleSharp, closeCircleSharp, helpCircleOutline, closeOutline } from 'ionicons/icons';

</script>

<template>
  <ion-page>


    <ion-content :fullscreen="true"  :scroll-y="false">

        <IntroAnimation />
    </ion-content>
  </ion-page>
</template>

<style scoped>

</style>