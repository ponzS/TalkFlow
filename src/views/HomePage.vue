<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <app-menu-button></app-menu-button>
        <ion-title>Home</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Home</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
        <app-logo></app-logo>
        <app-intro-text></app-intro-text>
        <RouterLink to="/index">
        <ion-button > 主页</ion-button>
      </RouterLink>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import AppLogo from '@/components/AppLogo.vue'
import AppIntroText from '@/components/AppIntroText.vue'
import AppMenuButton from '@/components/AppMenuButton.vue'

export default defineComponent({
    name: 'HomePage',
    components: { IonPage, IonHeader, IonToolbar, IonTitle,
         IonContent, AppLogo, AppIntroText, AppMenuButton },
    setup () {

    } 
});
</script>

<style scoped>
#container {
  text-align: center;  
  position: relative;
  top: 10%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
}

</style>
