<template>
    <ion-list class="UserList">
      <ion-item v-for="user in users" :key="user.id">
        <ion-checkbox
          ref="ionActiveEl"
          slot="start"
          :checked="user.active==1 ? true: false"
          :activeModel="user.active"
          @ionChange="handleCheckboxChange(user)"
        ></ion-checkbox>
          {{ user.id }} - {{ user.name }}
        <ion-button
          slot="end"
          fill="clear"
          color="danger"
          @click="handleDeleteUser(user.id)"
        >
          <ion-icon :icon="trash" />
        </ion-button>
      </ion-item>
    </ion-list>
</template>
  
<script lang="ts">
    import { defineComponent, ref } from 'vue';
    import { IonList, IonItem, IonCheckbox, IonButton, IonIcon, IonLabel } from '@ionic/vue';
    import { User } from '@/models/User';
    import { trash } from 'ionicons/icons';
  
  
    export default defineComponent({
        name: 'UserList',
        props: {
            users: Array as () => User[],
            onUpdateUser: Function,
            onDeleteUser: Function
        },
        components: { IonList, IonItem, IonCheckbox, IonButton, IonIcon, IonLabel },
        setup(props) {
            const ionActiveEl = ref();
            const handleCheckboxChange = (user: User) => {
                // Create a new user object with the updated active value
                const updatedUser = { ...user, active: user.active === 1 ? 0 : 1 };
                if (typeof props.onUpdateUser === 'function') {
                    props.onUpdateUser(updatedUser);
                }
            };
            const handleDeleteUser = (userId: number) => {
                if (typeof props.onDeleteUser === 'function') {
                    props.onDeleteUser(userId);
                }
            }
            return {
                handleCheckboxChange, handleDeleteUser, trash
            };
        },
    });
</script>
  