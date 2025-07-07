<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Storage Monitor</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="ion-padding">
      <!-- 缓存状态 -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Cache Status</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label>Cache Size</ion-label>
            <ion-note slot="end">{{ cacheStatus.size }} items</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Cache Memory</ion-label>
            <ion-note slot="end">{{ formatBytes(cacheStatus.memoryBytes) }}</ion-note>
          </ion-item>
          <!-- <ion-button
            expand="block"
            color="warning"
            :disabled="clearingCache"
            @click="clearCache"
          >
            {{ clearingCache ? 'Clearing...' : 'Clear Cache' }}
          </ion-button> -->
        </ion-card-content>
      </ion-card>

      <!-- 数据库内容 -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Database Contents</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label>Total Records</ion-label>
            <ion-note slot="end">{{ dbRecords.length }}</ion-note>
          </ion-item>
          <ion-segment v-model="viewMode" @ionChange="fetchDbRecords">
            <ion-segment-button value="all">
              <ion-label>All Records</ion-label>
            </ion-segment-button>
            <ion-segment-button value="users">
              <ion-label>User Data</ion-label>
            </ion-segment-button>
            <ion-segment-button value="chats">
              <ion-label>Chats Data</ion-label>
            </ion-segment-button>
          </ion-segment>
          <ion-button
            expand="block"
            :disabled="fetchingRecords"
            @click="fetchDbRecords"
          >
            {{ fetchingRecords ? 'Fetching...' : 'Refresh Records' }}
          </ion-button>
          <!-- <ion-button
            expand="block"
            color="danger"
            :disabled="clearingDatabase"
            @click="clearDatabase"
          >
            {{ clearingDatabase ? 'Clearing...' : 'Clear Database' }}
          </ion-button> -->
          <ion-list v-if="dbRecords.length > 0">
            <ion-item v-for="record in dbRecords" :key="record.key">
              <ion-label>
                <h2>{{ record.key }}</h2>
                <p>{{ truncateValue(record.value) }}</p>
                <p>{{ new Date(record.timestamp * 1000).toLocaleString() }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <ion-item v-else>
            <ion-label>No records found in database.</ion-label>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- 日志 -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Logs</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item v-for="(log, index) in logs" :key="index">
              <ion-label>{{ log }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
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
  IonItem,
  IonLabel,
  IonButton,
  IonNote,
  IonList,
  IonSegment,
  IonSegmentButton,
} from '@ionic/vue';
import { ref, onMounted } from 'vue';
import { getGunSQLiteAdapter } from '@/composables/GunStorageAdapter';
import { sqliteServ, dbVerServ, storageServ } from '../services/globalServices';

const gunAdapter = getGunSQLiteAdapter(sqliteServ, dbVerServ, storageServ);

export default defineComponent({
  name: 'StorageMonitor',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonButton,
    IonNote,
    IonList,
    IonSegment,
    IonSegmentButton,
  },
  setup() {
    const cacheStatus = ref({ size: 0, memoryBytes: 0 });
    const clearingCache = ref(false);
    const dbRecords = ref<any[]>([]);
    const fetchingRecords = ref(false);
    const clearingDatabase = ref(false);
    const logs = ref<string[]>([]);
    const viewMode = ref<'all' | 'users' | 'chats'>('all');

    // 日志记录函数
    const addLog = (message: string) => {
      logs.value.push(`${new Date().toLocaleTimeString()} - ${message}`);
      if (logs.value.length > 50) logs.value.shift();
    };

    // 获取缓存状态
    // const updateCacheStatus = () => {
    //   cacheStatus.value = gunAdapter.getCacheStatus();
    // };

    // // 清空缓存
    // const clearCache = async () => {
    //   clearingCache.value = true;
    //   try {
    //     await gunAdapter.clearCache();
    //     updateCacheStatus();
    //     addLog('Cache cleared successfully');
    //   } catch (err) {
    //     addLog(`Failed to clear cache: ${err}`);
    //   } finally {
    //     clearingCache.value = false;
    //   }
    // };

    // 获取数据库记录
    const fetchDbRecords = async () => {
      fetchingRecords.value = true;
      try {
        if (!storageServ.db) {
          addLog('Database not initialized, waiting for app initialization...');
          // 假设应用已在其他地方初始化，无需手动调用 initialize
          throw new Error('Database not available, please ensure app has initialized it');
        }
        let query = 'SELECT key, value, timestamp FROM gun_nodes';
        if (viewMode.value === 'users') {
          query += " WHERE key LIKE 'users/%' OR key LIKE '~%'";
        } else if (viewMode.value === 'chats') {
          query += " WHERE key LIKE 'chats/%'";
        }
        const result = await storageServ.query(query);
        dbRecords.value = result.values || [];
        addLog(`Fetched ${dbRecords.value.length} records from database (Mode: ${viewMode.value})`);
      } catch (err) {
        addLog(`Failed to fetch database records: ${err}`);
      } finally {
        fetchingRecords.value = false;
      }
    };

    // 清空数据库
    // const clearDatabase = async () => {
    //   clearingDatabase.value = true;
    //   try {
    //     if (!storageServ.db) {
    //       addLog('Database not initialized, waiting for app initialization...');
    //       throw new Error('Database not available, please ensure app has initialized it');
    //     }
    //     await storageServ.execute('DELETE FROM gun_nodes');
    //     dbRecords.value = [];
    //     await gunAdapter.clearCache();
    //     updateCacheStatus();
    //     addLog('Database cleared successfully');
    //   } catch (err) {
    //     addLog(`Failed to clear database: ${err}`);
    //   } finally {
    //     clearingDatabase.value = false;
    //   }
    // };

    // 格式化字节数
    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    // 截断长值以便显示
    const truncateValue = (value: string) => {
      return value.length > 50 ? `${value.substring(0, 47)}...` : value;
    };

    // 初始化时检查状态并加载数据
    onMounted(async () => {
      // updateCacheStatus();
      await fetchDbRecords();
    });

    return {
      cacheStatus,
      clearingCache,
      dbRecords,
      fetchingRecords,
      clearingDatabase,
      logs,
      viewMode,
      // clearCache,
      fetchDbRecords,
      // clearDatabase,
      formatBytes,
      truncateValue,
    };
  },
});
</script>

<style scoped>
.ion-padding {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 16px;
  --padding-bottom: 16px;
}

ion-card {
  margin-bottom: 16px;
}

ion-button {
  margin-top: 10px;
}

ion-list {
  max-height: 300px;
  overflow-y: auto;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>