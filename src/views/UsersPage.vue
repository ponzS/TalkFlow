<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Managing Users</ion-title>
          <ion-buttons slot="start">
            <ion-back-button text="home" default-href="/home"></ion-back-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div v-if="isInitComplete && dbInitialized">
          <ion-card>
            <h1>Add New User</h1>
            <user-form :onAddUser="handleAddUser" />
          </ion-card>
          <ion-card>
            <h2>Current Users</h2>
            <user-list :users="users" :onUpdateUser="handleUpdateUser" :onDeleteUser="handleDeleteUser" />
          </ion-card>
        </div>
      </ion-content>
    </ion-page>
</template>
<script lang="ts">
import { defineComponent, ref, computed, getCurrentInstance, onMounted,
         onBeforeUnmount, watch, Ref } from 'vue';
import { useIonRouter } from '@ionic/vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle,
         IonContent, IonCard} from '@ionic/vue';
import { Toast } from '@capacitor/toast';
import { User } from '@/models/User';
import UserForm from '@/components/UserForm.vue';
import UserList from '@/components/UserList.vue';
import { useQuerySQLite } from '@/hooks/UseQuerySQLite';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';

export default defineComponent({
    name: 'TestPage',
    components: { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle,
         IonContent, IonCard, UserForm, UserList },
    setup() {
      const dbNameRef = ref('');
      const isInitComplete = ref(false);
      const isDatabase = ref(false);
      const users = ref<User[]>([]);
      const db = ref(null);
      const appInstance = getCurrentInstance();

      const router = useIonRouter();
  
      const sqliteServ = appInstance?.appContext.config.globalProperties.$sqliteServ;
      const storageServ = appInstance?.appContext.config.globalProperties.$storageServ;

      const dbInitialized = computed(() => !!db.value);
      const platform = sqliteServ.getPlatform();

      const getAllUsers = async (db: Ref<SQLiteDBConnection|null>) => {
        const stmt = 'SELECT * FROM users';
        const values: any[] = [];
        const fetchData = await useQuerySQLite(db, stmt, values);
        users.value = fetchData;         
       
      }

      const openDatabase = async () => {
        try {
          const dbUsersName = storageServ.getDatabaseName();
          dbNameRef.value = dbUsersName;
          const version = storageServ.getDatabaseVersion();
  
          const database = await sqliteServ.openDatabase(dbUsersName, version, false);
          db.value = database;
          isDatabase.value = true;
        } catch (error) {
          const msg = `Error open database: ${error}`;
          console.error(msg);
          Toast.show({
            text: msg,
            duration: 'long'
          });
        }
      };
      const handleAddUser = async (newUser: User) => {
        if (db.value) {
          const isConn = await sqliteServ.isConnection(dbNameRef.value, false);
          const lastId = await storageServ.addUser(newUser);
          newUser.id = lastId;
          users.value.push(newUser as never);
        }
      };
      const handleUpdateUser = async (updUser: User) => {
        if (db.value) {
          const isConn = await sqliteServ.isConnection(dbNameRef.value, false);
          await storageServ.updateUserById(updUser.id.toString(), updUser.active);
          users.value = users.value.map((user: User) => {
            if (user.id === updUser.id) {
              // Clone the user and update the active property
              return { ...user, active: updUser.active };
            } else {
              return user;
            }
          });
        }
      };
  
      const handleDeleteUser = async (userId: number) => {
        if (db.value) {
          const isConn = await sqliteServ.isConnection(dbNameRef.value, false);
          await storageServ.deleteUserById(userId.toString());
          users.value = users.value.filter(user => (user as User).id !== userId);
        }
      };
      onMounted(() => {
        const initSubscription = storageServ.isInitCompleted.subscribe(async (value: boolean) => {
          isInitComplete.value = value;
          if (isInitComplete.value === true) {
            const dbUsersName = storageServ.getDatabaseName();
            if (platform === "web") {
              customElements.whenDefined('jeep-sqlite').then(async () => {
                await openDatabase();
              }).catch((error) => {
                const msg = `Error open database: ${error}`;
                console.log(msg);
                Toast.show({
                  text: msg,
                  duration: 'long'
                });
              });
            } else {
              await openDatabase();
            }
          }
        });
      });
      onBeforeUnmount(() => {
          sqliteServ.closeDatabase(dbNameRef.value, false)
          .then(() => {
            isDatabase.value = false;
          }).catch((error: any) => {
            const msg = `Error close database:
                          ${error.message ? error.message : error}`;
            console.error(msg);
            Toast.show({
              text: msg,
              duration: 'long'
            });
          });
      });

      watch(isDatabase, (newIsDatabase) => {
        if (newIsDatabase) {
          getAllUsers(db).then(() => {

          })
          .catch((error: any) => {
            const msg = `close database:
                          ${error.message ? error.message : error}`;
            console.error(msg);
            Toast.show({
              text: msg,
              duration: 'long'
            });
          });         
        } else {
          const msg = `newDb is null`;
          console.error(msg);
          Toast.show({
              text: msg,
              duration: 'long'
            });
        }
      });

      return {isInitComplete, dbInitialized, users, handleAddUser,
              handleUpdateUser, handleDeleteUser}
    },
});
</script>

