<template>
   <IonMenuButton slot="end" />
</template>
  
<script lang="ts">
import { defineComponent } from 'vue';
import { IonMenuButton} from '@ionic/vue';
export default defineComponent({
  name: 'AppMenuButton',
  components: {IonMenuButton}
});
</script>