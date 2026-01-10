<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-back-button :text="$t('back')" ></ion-back-button>
          </ion-buttons>
          <ion-title class="ion-padding">Network Database</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content :fullscreen="true" class="ion-padding">
            <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
Network Database
            </h1>
          </ion-toolbar>
        </ion-header>

        <ion-card class="card-elevation">
          <ion-card-header>
            <ion-card-title class="section-title">Storage Overview</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col size="12" size-md="6">
                  <ion-item lines="none">
                    <ion-label>Used Space</ion-label>
                    <ion-text class="stat-value">{{ storageUsage }} MB</ion-text>
                  </ion-item>
                </ion-col>
                <ion-col size="12" size-md="6">
                  <ion-item lines="none">
                    <ion-label>Total Quota</ion-label>
                    <ion-text class="stat-value">{{ storageQuota }} MB</ion-text>
                  </ion-item>
                </ion-col>
              </ion-row>
              <ion-row>
                <ion-col size="12">
                  <ion-progress-bar 
                    :value="storageUsage / storageQuota"
                    color="primary"
                    class="storage-progress"
                  ></ion-progress-bar>
                  <ion-text class="progress-label">
                    {{ ((storageUsage / storageQuota) * 100).toFixed(1) }}% Used
                  </ion-text>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>
  
        <ion-card class="card-elevation">
          <ion-card-header>
            <ion-card-title class="section-title">Database List</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list v-if="databases.length > 0" class="database-tree-list">
              <div v-for="db in databases" :key="db.name" class="database-group-container">
                <!-- Database Name Entry - acting like a folder -->
                <ion-item lines="none" class="database-name-item">
                  <ion-icon :icon="folderOutline" slot="start" class="folder-icon"></ion-icon>
                  <ion-label>
                    <h3 class="database-name">{{ db.name }}</h3>
                  </ion-label>
                  <!-- Removed the prominent delete button as requested -->
                  <!-- Individual database deletion could be added via context menu if needed -->
                </ion-item>
  
                <!-- Object Stores (Children) -->
                <ion-item 
                  v-for="(store, index) in db.stores" 
                  :key="store"
                  class="store-item"
                >
                  <ion-label>
                    <h3 class="store-name">{{ store }}</h3>
                    <p>Records: {{ db.recordCounts[index] }}</p>
                  </ion-label>
                  <ion-button 
                    fill="clear" 
                    color="danger" 
                    size="small" 
                    @click="deleteObjectStore(db.name, store)"
                    class="store-delete"
                  >
                    <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
                  </ion-button>
                </ion-item>
              </div>
            </ion-list>
            <ion-text v-else class="no-data">
              No Network Databases
            </ion-text>
            <ion-note class="database-note">
              <p><strong>Note:</strong> 'radata' usually refers to network data stored by Gun DB. It's recommended to clean it periodically to free up space.</p>
            </ion-note>
          </ion-card-content>
        </ion-card>
  
        <ion-button 
          expand="block" 
          color="danger" 
          shape="round"
          @click="clearAllDatabases" 
          :disabled="databases.length === 0"
          class="action-button"
        >
          Clear All IndexedDB Data
        </ion-button>
  
        <ion-toast
          :is-open="toast.isOpen"
          :message="toast.message"
          :duration="2000"
          position="top"
          @didDismiss="toast.isOpen = false"
        />
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { 
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonText, IonList, IonButton, IonToast,
    IonButtons, IonBackButton, IonNote, IonGrid, IonRow, IonCol,
    IonProgressBar, IonItemGroup, IonItemDivider, IonIcon
  } from '@ionic/vue';
  import { trashOutline, folderOutline } from 'ionicons/icons'; // Added folderOutline import
  
  // 存储使用情况
  const storageUsage = ref<number>(0);
  const storageQuota = ref<number>(0);
  const databases = ref<{ name: string; version: number; stores: string[]; recordCounts: number[] }[]>([]);
  const toast = ref<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  
  // 获取存储概况
  async function fetchStorageEstimate() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        storageUsage.value = Number((estimate.usage! / 1024 / 1024).toFixed(2));
        storageQuota.value = Number((estimate.quota! / 1024 / 1024).toFixed(2));
      } else {
        toast.value = { isOpen: true, message: 'Browser does not support Storage Estimate API' };
      }
    } catch (err) {
      toast.value = { isOpen: true, message: `Failed to get storage estimate: ${err}` };
    }
  }
  
  // 获取所有 IndexedDB 数据库及其结构
  async function fetchDatabases() {
    try {
      const dbList = await indexedDB.databases();
      const dbDetails = [];
      
      for (const dbInfo of dbList) {
        if (dbInfo.name) {
          const db = await openDatabase(dbInfo.name);
          const stores = Array.from(db.objectStoreNames);
          const recordCounts = await getRecordCounts(db, stores);
          dbDetails.push({
            name: dbInfo.name,
            version: dbInfo.version || 1,
            stores,
            recordCounts
          });
          db.close();
        }
      }
      
      databases.value = dbDetails;
    } catch (err) {
      toast.value = { isOpen: true, message: `Failed to get database list: ${err}` };
    }
  }
  
  // 打开数据库
  function openDatabase(name: string, version?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = version ? indexedDB.open(name, version) : indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  // 获取对象存储的记录数
  async function getRecordCounts(db: IDBDatabase, stores: string[]): Promise<number[]> {
    const counts: number[] = [];
    const tx = db.transaction(stores, 'readonly');
    
    for (const store of stores) {
      const countRequest = tx.objectStore(store).count();
      counts.push(await new Promise((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      }));
    }
    
    return counts;
  }
  
  // 删除单个数据库
  async function deleteDatabase(name: string) {
    try {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      toast.value = { isOpen: true, message: `Database ${name} deleted` };
      await fetchDatabases();
      await fetchStorageEstimate();
    } catch (err) {
      toast.value = { isOpen: true, message: `Failed to delete database ${name}: ${err}` };
    }
  }
  
  // 删除单个对象存储
  async function deleteObjectStore(dbName: string, storeName: string) {
    try {
      toast.value = { isOpen: true, message: `Deleting data from ${storeName}...` };

      const db = await openDatabase(dbName);
      const transaction = db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = objectStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      db.close();
      await fetchDatabases();
      await fetchStorageEstimate();

      toast.value = { isOpen: true, message: `Deletion complete for ${storeName}!` };

    } catch (err) {
      toast.value = { isOpen: true, message: `Failed to clear data in object store ${storeName}: ${err}` };
    }
  }
  
  // 清空所有 IndexedDB 数据
  async function clearAllDatabases() {
    try {
      const dbList = await indexedDB.databases();
      for (const db of dbList) {
        if (db.name) {
          await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(db.name!);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }
      toast.value = { isOpen: true, message: 'All IndexedDB data cleared' };
      await fetchDatabases();
      await fetchStorageEstimate();
    } catch (err) {
      toast.value = { isOpen: true, message: `Failed to clear all data: ${err}` };
    }
  }
  
  // 初始化
  onMounted(async () => {
    await fetchStorageEstimate();
    await fetchDatabases();
  });
  </script>
  
  <style scoped>
  ion-content {
    --background: var(--ion-background-color, #f4f5f8);
  }
  
  .card-elevation {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    margin: 16px;
    transition: transform 0.2s ease-in-out;
  }
  
  .card-elevation:hover {
    transform: translateY(-2px);
  }
  
  .section-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--ion-color-primary);
    padding-bottom: 8px;
    text-align: center;
    margin-top: 10px;
  }
  
  .storage-progress {
    margin: 16px 0;
    height: 8px;
    --border-radius: 4px;
  }
  
  .progress-label {
    display: block;
    text-align: center;
    font-size: 0.9rem;
    color: var(--ion-color-medium);
    margin-bottom: 16px;
  }
  
  /* New styles for tree-like structure */
  .database-tree-list {
    border-radius: 0; 
    overflow: visible; 
    box-shadow: none; 
    margin: 0; 
    padding: 8px; /* General padding for the list content */
  }
  
  .database-group-container {
    background: transparent;
    margin-bottom: 12px; /* Spacing between different database groups */
    position: relative; /* Needed for ::before pseudo-element for main vertical line */
  }

  /* Main vertical line for the database group (folder) */
  .database-group-container::before {
    content: '';
    position: absolute;
    left: 16px; /* Position of the main vertical line */
    top: 0;
    height: 100%;
    width: 1px;
    background-color: var(--ion-color-medium); /* Color of the lines */
  }
  
  .database-name {
    font-size: 1.1rem;
    font-weight: 600; /* Made database name slightly bolder */
    color: var(--ion-color-dark);
    margin: 0;
    padding: 0;
  }
  
  .database-name-item {
    position: relative; /* Needed for ::after pseudo-element */
    padding-left: 24px; /* 16px for vertical line + 8px spacing to icon */
    padding-right: 16px;
    --background: transparent;
    border-bottom: none;
    display: flex;
    align-items: center;
  }

  /* Horizontal line for database name (connecting to main vertical line) */
  .database-name-item::after {
    content: '';
    position: absolute;
    left: 16px; /* Aligns with the main vertical line */
    top: 50%; /* Center vertically */
    width: 8px; /* Extends from vertical line to icon */
    height: 1px;
    background-color: var(--ion-color-medium);
  }
  
  .folder-icon {
    color: var(--ion-color-primary);
    margin-inline-end: 8px; /* Space between icon and text */
    font-size: 1.2rem;
  }
  
  .store-item {
    position: relative; /* For pseudo-elements */
    padding-left: 40px; /* 32px (vertical line) + 8px (spacing to content) */
    padding-right: 16px;
    --inner-padding-end: 0;
    margin-bottom: 0px;
    background: transparent;
  }

  /* Vertical line for each object store item */
  .store-item::before {
    content: '';
    position: absolute;
    left: 32px; /* Aligns with the second level of indentation */
    top: 0;
    height: 100%;
    width: 1px;
    background-color: var(--ion-color-medium);
  }

  /* Horizontal line for each object store item */
  .store-item::after {
    content: '';
    position: absolute;
    left: 32px; /* Aligns with vertical line */
    top: 50%; /* Center vertically */
    width: 8px; /* Extends from vertical line to content */
    height: 1px;
    background-color: var(--ion-color-medium);
  }
  
  .store-name {
    font-size: 0.95rem; 
    font-weight: 400;
    margin-bottom: 4px; 
    color: var(--ion-color-dark-tint);
  }
  
  .no-data {
    display: block;
    text-align: center;
    padding: 24px;
    color: var(--ion-color-medium);
    font-size: 1rem;
  }
  
  .database-note {
    display: block;
    padding: 16px;
    font-size: 0.9rem;
    color: var(--ion-color-medium);
  }
  
  .stat-value {
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--ion-color-dark);
  }
  
  .action-button {
    margin: 24px 16px;
    --border-radius: 12px;
    --padding-start: 24px;
    --padding-end: 24px;
    font-weight: 500;
  }
  
  /* Specific button/icon styles, adjusted for new layout */
  .database-delete, .store-delete {
    --padding-start: 8px;
    --padding-end: 8px;
  }
  
  /* Remove styles for ion-item-divider that are no longer needed */
  ion-item-divider { display: none; } /* Hide the old divider style if it somehow persists */
  
  ion-item {
    --border-color: transparent; /* Removed borders between items */
    --background: transparent;
    border-radius: 0; /* Removed rounded corners to blend with tree structure */
    margin-bottom: 0; /* Removed margin to make items visually connected */
  }
  
  ion-grid {
    padding: 0;
  }
  
  ion-col {
    padding: 8px;
  }
  </style>