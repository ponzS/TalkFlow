<template>
    <ion-menu class="AppMenu" side="end" content-id="main-content">
      <ion-header>
        <ion-toolbar>
          <ion-title>Menu Content</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item @click="closeMenu">
            <ion-button size="default" router-link="/users" expand="full">Managing Users</ion-button>
          </ion-item>
          <!-- ... other menu items -->
        </ion-list>
      </ion-content>
    </ion-menu>
</template>
  
<script lang="ts">
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
        IonItem, IonButton } from '@ionic/vue';
import { defineComponent } from 'vue';
import { useIonRouter } from '@ionic/vue';

export default defineComponent({
    name: 'AppMenu',
    components: { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent,
                IonList, IonItem, IonButton },
    setup() {
        const router = useIonRouter();
  
        const closeMenu = () => {
            const menu = document.querySelector('ion-menu');
            menu!.close();
        };
        return {closeMenu, router}
    },
});
</script>
<style scoped>
    .AppMenu  ion-button {
        --background: transparent;
        --color: initial;
        font-size: 18px;
    }
</style>
  