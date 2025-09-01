<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/index"></ion-back-button>
        </ion-buttons>
        <ion-title>GunDB Status</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <!-- Gun Instance Control -->
      <div class="instance-control-section">
        <div class="section-header">
          <h3 class="section-title">Gun Instance Control</h3>
        </div>
        <div class="control-content">
          <div class="status-item">
            <span class="info-label">Instance State:</span>
            <span class="status-value" :class="networkStatus">
              {{ networkStatus === 'online' ? 'Running' : 'Offline' }}
            </span>
          </div>
          <button class="restart-btn" @click="handleRestartGun" :disabled="isRestarting">
            <ion-icon :icon="isRestarting ? refreshOutline : syncCircleOutline" :class="{'spin-animation': isRestarting}"/>
            {{ isRestarting ? 'Restarting...' : 'Restart Instance' }}
          </button>
        </div>
      </div>

      <!-- Data Traversal -->
      <div class="data-section">
        <div class="section-header">
          <h3 class="section-title">Database Explorer</h3>
          <ion-button @click="traverseGunDB" :disabled="isTraversing">
            <ion-icon slot="start" :icon="isTraversing ? refreshOutline : searchOutline" :class="{'spin-animation': isTraversing}"></ion-icon>
            {{ isTraversing ? 'Loading...' : 'Scan Database' }}
          </ion-button>
        </div>
        <div v-if="isTraversing" class="loading-indicator">
          <ion-spinner></ion-spinner>
          <p>Traversing database... this may take a while.</p>
        </div>
        <div v-else-if="gunData.length > 0" class="tree-view">
          <ul>
            <li v-for="node in gunData" :key="node.key">
              <div class="node-item" @click="node.expanded = !node.expanded">
                <ion-icon :icon="node.expanded ? chevronDown : chevronForward"></ion-icon>
                <strong>{{ node.key }}</strong>
                <span class="node-type">({{ getNodeType(node.value) }})</span>
              </div>
              <!-- Child Nodes -->
              <ul v-if="node.expanded && isObject(node.value)">
                <li v-for="(childValue, childKey) in node.value" :key="String(childKey)">
                   <div class="node-item child">
                    <ion-icon 
                      v-if="isObject(childValue)" 
                      :icon="isChildExpanded(node.key, String(childKey)) ? chevronDown : chevronForward"
                      @click.stop="toggleChild(node.key, String(childKey))"
                      class="expand-child-icon"
                    ></ion-icon>
                    <div v-else class="icon-placeholder"></div>

                    <strong>{{ childKey }}:</strong> 
                    <span v-if="!isChildExpanded(node.key, String(childKey))" class="value-preview">{{ getValuePreview(childValue) }}</span>
                   </div>
                   
                   <!-- Grand-child Nodes (Expanded child content) -->
                   <ul v-if="isObject(childValue) && isChildExpanded(node.key, String(childKey))" class="grand-child-list">
                     <li v-for="(grandChildValue, grandChildKey) in (childValue as any)" :key="String(grandChildKey)">
                       <div class="node-item grand-child">
                         <strong>{{ grandChildKey }}:</strong>
                         <span class="value-preview">{{ getValuePreview(grandChildValue) }}</span>
                       </div>
                     </li>
                   </ul>
                </li>
              </ul>
               <div v-else-if="node.expanded" class="node-item child">
                 <span class="value-preview">{{ getValuePreview(node.value) }}</span>
               </div>
            </li>
          </ul>
        </div>
        <div v-else class="empty-state">
          <p>Click "Scan Database" to explore the data.</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons, IonBackButton, IonSpinner } from '@ionic/vue';
import { syncCircleOutline, refreshOutline, searchOutline, chevronForward, chevronDown } from 'ionicons/icons';
import getTalkFlowCore from '@/composables/TalkFlowCore';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import { getCurrentInstance } from 'vue';
import StorageService from '@/services/storageService';

const appInstance = getCurrentInstance();
const storageServ = appInstance?.appContext.config.globalProperties.$storageServ as StorageService;

const {  gun } = getTalkFlowCore();
const { networkStatus, enabledPeers } = useNetworkStatus(storageServ);

const isRestarting = ref(false);
const isTraversing = ref(false);
const gunData = ref<any[]>([]);
const expandedChildren = ref<Record<string, boolean>>({});

async function handleRestartGun() {
  if (isRestarting.value) return;
  isRestarting.value = true;
  try {
    // await reinitializeGunInstance(enabledPeers.value);
  } catch (error) {
    // 重启Gun实例失败
  } finally {
    isRestarting.value = false;
  }
}

async function traverseGunDB() {
  if (isTraversing.value) return;
  isTraversing.value = true;
  gunData.value = [];
  expandedChildren.value = {}; // Reset expanded children state

  try {
    const root = gun as any;
    // Expanded list of known top-level keys in the application
    const knownRootKeys = [
      'users', 
      'chats', 
      'requests', 
      'moments', 
      'momentForwards', 
      'momentLikes', 
      'momentComments', 
      'epub_sharing', 
      'migration',
      'group-chats', // Assuming this is for group chats
      'notifications'
    ];

    for (const key of knownRootKeys) {
        // Use .then() for cleaner promise-like syntax with gun, with a timeout
        const nodeData = await new Promise(resolve => {
            root.get(key).once((data) => resolve(data), {wait: 2000}); // 2s timeout
        });

        if (nodeData) {
            // Process data to remove Gun's internal metadata `_`
            const cleanData: Record<string, any> = {};
            for(const prop in (nodeData as any)) {
                if (prop !== '_' && Object.prototype.hasOwnProperty.call(nodeData, prop)) {
                    cleanData[prop] = (nodeData as any)[prop];
                }
            }
            gunData.value.push({
                key: key,
                value: cleanData,
                expanded: false,
            });
        }
    }
  } catch (error) {
    // 遍历数据库失败
  } finally {
    isTraversing.value = false;
  }
}


function isChildExpanded(parentKey: string, childKey: string): boolean {
  return !!expandedChildren.value[`${parentKey}/${childKey}`];
}

function toggleChild(parentKey: string, childKey:string) {
  const fullKey = `${parentKey}/${childKey}`;
  expandedChildren.value[fullKey] = !expandedChildren.value[fullKey];
}

function getNodeType(value: any) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function isObject(value: any) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getValuePreview(value: any) {
  if (value === null) return 'null';
  if (isObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''} }`;
  }
  if (typeof value === 'string' && value.length > 50) {
    return `"${value.substring(0, 50)}..."`;
  }
  return JSON.stringify(value);
}

</script>

<style scoped>
/* styles from previous implementation for instance control */
.instance-control-section, .data-section {
  padding: 12px;
  background: rgba(130, 130, 130, 0.1);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
.control-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.status-item .info-label {
  font-weight: 600;
}
.status-value {
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.status-value.online {
  color: #065f46;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 0.9));
}
.status-value.offline {
  color: #fff;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0.9));
}
.restart-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(139, 92, 246, 0.9));
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.restart-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(139, 92, 246, 1));
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(139, 92, 246, 0.3);
}
.restart-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: rgba(150, 150, 150, 0.4);
}
.restart-btn ion-icon {
  font-size: 16px;
}
.spin-animation {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Data explorer styles */
.loading-indicator, .empty-state {
  text-align: center;
  padding: 20px;
  color: var(--ion-color-medium);
}
.tree-view ul {
  list-style-type: none;
  padding-left: 20px;
}
.tree-view li {
  margin-top: 5px;
}
.node-item {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}
.node-item.child {
  padding-left: 10px;
}
.node-item.grand-child {
  padding-left: 20px;
  cursor: default;
}

.node-type {
  font-size: 0.8em;
  color: var(--ion-color-medium);
}
.value-preview {
  font-style: italic;
  color: var(--ion-color-dark);
  max-width: 400px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.expand-child-icon {
  font-size: 16px;
  padding: 4px;
  border-radius: 50%;
  transition: background-color 0.2s;
}
.expand-child-icon:hover {
  background-color: rgba(0,0,0,0.1);
}
.icon-placeholder {
  width: 24px; /* Same size as the icon to keep alignment */
  height: 24px;
}
.grand-child-list {
  border-left: 1px solid var(--ion-color-step-200, #cccccc);
  margin-left: 10px;
  padding-left: 10px;
}
</style>