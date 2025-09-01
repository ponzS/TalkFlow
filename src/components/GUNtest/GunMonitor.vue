<template>
    <ion-card>
      <ion-card-header @click="toggleExpanded">
        <div class="header-flex">
          <div :class="['status-dot', getHealthColor(systemHealth)]"></div>
          <ion-card-title>Gun.js Monitor</ion-card-title>
          <ion-button fill="clear" size="small">
            {{ expanded ? 'Collapse' : 'Expand' }}
          </ion-button>
        </div>
      </ion-card-header>
  
      <ion-card-content v-if="expanded">
        <!-- Status Overview -->
        <ion-grid>
          <ion-row>
            <ion-col size="12" size-md="6">
              <ion-item lines="full">
                <ion-label>System Status</ion-label>
                <ion-badge :color="getHealthColor(systemHealth)">{{ formatHealth(systemHealth) }}</ion-badge>
              </ion-item>
              <ion-item lines="full">
                <ion-label>Request Queue</ion-label>
                <ion-badge :color="getHealthColor(queueHealth)">{{ queueSize }} items</ion-badge>
              </ion-item>
              <ion-item lines="full">
                <ion-label>Network Status</ion-label>
                <ion-badge :color="navigator.onLine ? 'success' : 'danger'">
                  {{ navigator.onLine ? 'Online' : 'Offline' }}
                </ion-badge>
              </ion-item>
            </ion-col>
            
            <ion-col size="12" size-md="6">
              <ion-item lines="full">
                <ion-label>Normal Requests</ion-label>
                <ion-note slot="end">{{ ageDistribution.recent + ageDistribution.medium }}</ion-note>
              </ion-item>
              <ion-item lines="full">
                <ion-label>Older Requests</ion-label>
                <ion-note slot="end">{{ ageDistribution.old }}</ion-note>
              </ion-item>
              <ion-item lines="full">
                <ion-label>Very Old Requests</ion-label>
                <ion-note slot="end" color="danger">{{ ageDistribution.veryOld }}</ion-note>
              </ion-item>
            </ion-col>
          </ion-row>
        </ion-grid>
  
        <!-- Request Queue Visualization -->
        <div class="queue-bars" v-if="queueSize > 0">
          <h5>Request Queue</h5>
          <div class="bar-container">
            <div class="bar recent" :style="{width: getBarWidth(ageDistribution.recent)}" v-if="ageDistribution.recent > 0">
              <span>{{ ageDistribution.recent }}</span>
            </div>
            <div class="bar medium" :style="{width: getBarWidth(ageDistribution.medium)}" v-if="ageDistribution.medium > 0">
              <span>{{ ageDistribution.medium }}</span>
            </div>
            <div class="bar old" :style="{width: getBarWidth(ageDistribution.old)}" v-if="ageDistribution.old > 0">
              <span>{{ ageDistribution.old }}</span>
            </div>
            <div class="bar very-old" :style="{width: getBarWidth(ageDistribution.veryOld)}" v-if="ageDistribution.veryOld > 0">
              <span>{{ ageDistribution.veryOld }}</span>
            </div>
          </div>
        </div>
  
        <!-- Action Buttons -->
        <div class="action-buttons">
          <ion-button expand="block" @click="refreshStats" :disabled="isLoading">
            <ion-icon :icon="refreshOutline" slot="start"></ion-icon>
            {{ isLoading ? 'Refreshing...' : 'Refresh Status' }}
          </ion-button>
          
          <ion-button expand="block" color="warning" @click="clearQueue" :disabled="isClearing">
            <ion-icon :icon="trashOutline" slot="start"></ion-icon>
            {{ isClearing ? 'Clearing...' : 'Clear Request Queue' }}
          </ion-button>
  
          <ion-button expand="block" color="danger" @click="resetGun" :disabled="isResetting">
            <ion-icon :icon="refreshCircleOutline" slot="start"></ion-icon>
            {{ isResetting ? 'Resetting...' : 'Reset Gun Instance' }}
          </ion-button>
        </div>
  
        <!-- Test Results -->
        <ion-item v-if="testResult" lines="none" :color="testResult.success ? 'success' : 'danger'">
          <ion-icon :icon="testResult.success ? checkmarkCircle : closeCircle" slot="start"></ion-icon>
          <ion-label>
            {{ testResult.success ? 'Test Successful' : 'Test Failed' }}
            <p>{{ testResult.message }}</p>
          </ion-label>
        </ion-item>
  
        <!-- Last Updated -->
        <div class="last-updated">
          Last updated: {{ lastUpdated || 'Not updated' }}
        </div>
      </ion-card-content>
    </ion-card>
  </template>
  
  <script>
  import { defineComponent, ref, onMounted, inject } from 'vue';
  import { 
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
    IonGrid, IonRow, IonCol, IonItem, IonLabel, IonBadge, 
    IonButton, IonIcon, IonNote 
  } from '@ionic/vue';
  import { 
    refreshOutline, trashOutline, refreshCircleOutline, 
    checkmarkCircle, closeCircle 
  } from 'ionicons/icons';
  
  export default defineComponent({
    name: 'GunMonitor',
    components: {
      IonCard, IonCardHeader, IonCardTitle, IonCardContent,
      IonGrid, IonRow, IonCol, IonItem, IonLabel, IonBadge,
      IonButton, IonIcon, IonNote
    },
    props: {
      gunInstance: {
        type: Object,
        required: true
      },
      restartGunFunction: {
        type: Function,
        default: null
      }
    },
    setup(props) {
      const expanded = ref(false);
      const isLoading = ref(false);
      const isClearing = ref(false);
      const isResetting = ref(false);
      const lastUpdated = ref('');
      const testResult = ref(null);
      
      const systemHealth = ref('unknown');
      const queueHealth = ref('unknown');
      const queueSize = ref(0);
      const ageDistribution = ref({
        recent: 0,   // <5 seconds
        medium: 0,   // 5-30 seconds
        old: 0,      // 30 seconds-2 minutes
        veryOld: 0   // >2 minutes
      });
  
      // Toggle expand/collapse
      const toggleExpanded = () => {
        expanded.value = !expanded.value;
        if (expanded.value) {
          refreshStats();
        }
      };
  
      // Refresh statistics
      const refreshStats = async () => {
        if (isLoading.value) return;
        
        isLoading.value = true;
        try {
          const gun = props.gunInstance;
          if (!gun) {
            systemHealth.value = 'error';
            queueHealth.value = 'error';
            console.error('Gun instance not available');
            return;
          }
  
          // Get request queue statistics
          const root = gun._.root;
          if (!root || !root.opt) {
            systemHealth.value = 'error';
            queueHealth.value = 'error';
            console.error('Gun root node not available');
            return;
          }
  
          const outgoing = root.opt.outgoing || {};
          queueSize.value = Object.keys(outgoing).length;
  
          // Calculate request age distribution
          const distribution = {
            recent: 0,
            medium: 0,
            old: 0,
            veryOld: 0
          };
  
          Object.values(outgoing).forEach(req => {
            if (!req.startTime) return;
            
            const age = Date.now() - req.startTime;
            
            if (age < 5000) distribution.recent++;
            else if (age < 30000) distribution.medium++;
            else if (age < 120000) distribution.old++;
            else distribution.veryOld++;
          });
  
          ageDistribution.value = distribution;
  
          // Calculate health status
          if (queueSize.value > 50 || distribution.veryOld > 0) {
            queueHealth.value = 'unhealthy';
          } else if (queueSize.value > 20 || distribution.old > 5) {
            queueHealth.value = 'warning';
          } else {
            queueHealth.value = 'healthy';
          }
  
          // Overall system health status
          if (queueHealth.value === 'unhealthy' || !navigator.onLine) {
            systemHealth.value = 'unhealthy';
          } else if (queueHealth.value === 'warning') {
            systemHealth.value = 'warning';
          } else {
            systemHealth.value = 'healthy';
          }
  
          lastUpdated.value = new Date().toLocaleTimeString();
        } catch (err) {
          console.error('Failed to get Gun status:', err);
          systemHealth.value = 'error';
        } finally {
          isLoading.value = false;
        }
      };
  
      // Clear request queue
      const clearQueue = async () => {
        if (isClearing.value) return;
        
        isClearing.value = true;
        try {
          const gun = props.gunInstance;
          if (!gun || !gun._ || !gun._.root || !gun._.root.opt) {
            testResult.value = {
              success: false,
              message: 'Gun instance not available'
            };
            return;
          }
  
          const root = gun._.root;
          const queueSizeBefore = Object.keys(root.opt.outgoing || {}).length;
  
          // Clear queues
          root.opt.outgoing = {};
          if (root.queue) root.queue = {};
          if (root.ask) root.ask = {};
          if (root.dup) root.dup.s = {};
  
          testResult.value = {
            success: true,
            message: `Cleared ${queueSizeBefore} pending requests`
          };
  
          await refreshStats();
        } catch (err) {
          console.error('Failed to clear request queue:', err);
          testResult.value = {
            success: false,
            message: `Clear failed: ${err.message}`
          };
        } finally {
          isClearing.value = false;
        }
      };
  
      // Reset Gun instance
      const resetGun = async () => {
        if (isResetting.value) return;
        
        isResetting.value = true;
        try {
          const gun = props.gunInstance;
          if (!gun) {
            testResult.value = {
              success: false,
              message: 'Gun instance not available'
            };
            return;
          }
  
          // Clear queue
          if (gun._.root && gun._.root.opt) {
            gun._.root.opt.outgoing = {};
          }
  
          // Use restart function
          if (props.restartGunFunction) {
            await props.restartGunFunction();
            testResult.value = {
              success: true,
              message: 'Gun instance has been reset'
            };
          } else {
            testResult.value = {
              success: false,
              message: 'restartGun function not available'
            };
          }
  
          await refreshStats();
        } catch (err) {
          console.error('Failed to reset Gun instance:', err);
          testResult.value = {
            success: false,
            message: `Reset failed: ${err.message}`
          };
        } finally {
          isResetting.value = false;
        }
      };
  
      // Get health status color
      const getHealthColor = (status) => {
        switch (status) {
          case 'healthy': return 'success';
          case 'warning': return 'warning';
          case 'unhealthy': case 'error': return 'danger';
          default: return 'medium';
        }
      };
  
      // Format health status text
      const formatHealth = (status) => {
        switch (status) {
          case 'healthy': return 'Healthy';
          case 'warning': return 'Warning';
          case 'unhealthy': return 'Unhealthy';
          case 'error': return 'Error';
          default: return 'Unknown';
        }
      };
  
      // Calculate bar chart width
      const getBarWidth = (value) => {
        if (queueSize.value === 0) return '0%';
        const percentage = Math.min(100, Math.max(5, Math.round((value / queueSize.value) * 100)));
        return `${percentage}%`;
      };
  
      // Component mounted
      onMounted(() => {
        refreshStats();
      });
  
      return {
        expanded,
        isLoading,
        isClearing,
        isResetting,
        lastUpdated,
        testResult,
        systemHealth,
        queueHealth,
        queueSize,
        ageDistribution,
        toggleExpanded,
        refreshStats,
        clearQueue,
        resetGun,
        getHealthColor,
        formatHealth,
        getBarWidth,
        refreshOutline,
        trashOutline,
        refreshCircleOutline,
        checkmarkCircle,
        closeCircle,
        navigator // Direct use of window.navigator
      };
    }
  });
  </script>
  
  <style scoped>
  .header-flex {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 10px;
  }
  .status-dot.success {
    background-color: var(--ion-color-success);
  }
  .status-dot.warning {
    background-color: var(--ion-color-warning);
  }
  .status-dot.danger {
    background-color: var(--ion-color-danger);
  }
  .status-dot.medium {
    background-color: var(--ion-color-medium);
  }
  .queue-bars {
    margin: 20px 0;
  }
  .bar-container {
    height: 24px;
    background-color: rgba(var(--ion-color-medium-rgb), 0.2);
    border-radius: 4px;
    margin-top: 8px;
    display: flex;
    overflow: hidden;
  }
  .bar {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    transition: width 0.3s ease;
  }
  .bar.recent {
    background-color: var(--ion-color-success);
  }
  .bar.medium {
    background-color: var(--ion-color-primary);
  }
  .bar.old {
    background-color: var(--ion-color-warning);
  }
  .bar.very-old {
    background-color: var(--ion-color-danger);
  }
  .action-buttons {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin: 15px 0;
  }
  .last-updated {
    text-align: center;
    color: var(--ion-color-medium);
    font-size: 12px;
    margin-top: 15px;
  }
  @media (min-width: 768px) {
    .action-buttons {
      grid-template-columns: 1fr 1fr;
    }
  }
  </style>