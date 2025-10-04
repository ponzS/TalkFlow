<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="chats" href="/tabs/chats">
          <ion-icon :icon="calendar" />
          <ion-label>Chats</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="contacts" href="/tabs/contacts">
          <ion-icon :icon="people" />
          <ion-label>Contacts</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="call" href="/tabs/call">
          <ion-icon :icon="location" />
          <ion-label>Map</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="about" href="/tabs/maxflow">
          <ion-icon :icon="informationCircle" />
          <ion-label>About</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonLabel,
  IonIcon
} from '@ionic/vue';
import {
  calendar,
  people,
  location,
  informationCircle
} from 'ionicons/icons';


</script>