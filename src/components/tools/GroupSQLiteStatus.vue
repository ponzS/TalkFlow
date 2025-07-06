<template>
  <ion-card class="sqlite-status-card">
    <ion-card-header>
      <ion-card-title>
        <ion-icon :icon="storageOutline" style="margin-right: 8px;"></ion-icon>
        群聊SQLite增强状态
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <!-- SQLite功能状态 -->
      <div class="status-section">
        <h3>功能状态</h3>
        <div class="status-item">
          <span>SQLite增强:</span>
          <ion-badge :color="sqliteStatus.enhanced ? 'success' : 'medium'">
            {{ sqliteStatus.enhanced ? '开启' : '关闭' }}
          </ion-badge>
        </div>
        <div class="status-item">
          <span>批量加载:</span>
          <ion-badge :color="sqliteStatus.bulkLoading ? 'success' : 'medium'">
            {{ sqliteStatus.bulkLoading ? '开启' : '关闭' }}
          </ion-badge>
        </div>
        <div class="status-item">
          <span>分页加载:</span>
          <ion-badge :color="sqliteStatus.pagination ? 'success' : 'medium'">
            {{ sqliteStatus.pagination ? '开启' : '关闭' }}
          </ion-badge>
        </div>
      </div>

      <!-- 群聊统计信息 -->
      <div class="stats-section" v-if="currentGroup">
        <h3>当前群聊统计</h3>
        <div class="current-group-info">
          <p><strong>群聊名称:</strong> {{ currentGroupName || '未知' }}</p>
          <p><strong>群聊ID:</strong> {{ currentGroup.slice(0, 8) }}...</p>
        </div>
        
        <div class="stats-grid" v-if="groupStats">
          <div class="stat-item">
            <div class="stat-value">{{ groupStats.totalMessages }}</div>
            <div class="stat-label">SQLite消息总数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ gunMessages }}</div>
            <div class="stat-label">Gun.js内存消息</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ mergedTotal }}</div>
            <div class="stat-label">合并后总消息</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ groupStats.hasMoreHistory ? '是' : '否' }}</div>
            <div class="stat-label">有更多历史</div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions-section">
        <ion-button 
          fill="outline" 
          size="small"
          @click="toggleSQLiteFeature"
        >
          <ion-icon :icon="sqliteStatus.enhanced ? powerOutline : powerSharp" slot="start"></ion-icon>
          {{ sqliteStatus.enhanced ? '禁用' : '启用' }} SQLite增强
        </ion-button>

        <ion-button 
          v-if="currentGroup"
          fill="outline" 
          size="small"
          @click="refreshStats"
        >
          <ion-icon :icon="refreshOutline" slot="start"></ion-icon>
          刷新统计
        </ion-button>

        <ion-button 
          v-if="currentGroup && groupStats"
          fill="outline" 
          size="small"
          color="warning"
          @click="testMergedLoad"
        >
          <ion-icon :icon="layersOutline" slot="start"></ion-icon>
          测试合并加载
        </ion-button>
      </div>

      <!-- 测试结果 -->
      <div v-if="testResult" class="test-result">
        <h4>测试结果</h4>
        <pre>{{ testResult }}</pre>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent,
  IonButton,
  IonBadge,
  IonIcon
} from '@ionic/vue';
import { 
  storageOutline, 
  powerOutline, 
  powerSharp,
  refreshOutline,
  layersOutline
} from 'ionicons/icons';

// 导入群聊功能
const useGroupChat = () => import('@/composables/useGroupChat');

// 响应式数据
const sqliteStatus = ref({
  enhanced: true,
  bulkLoading: true, 
  pagination: true
});

const currentGroup = ref<string | null>(null);
const currentGroupName = ref<string>('');
const groupStats = ref<any>(null);
const gunMessages = ref(0);
const mergedTotal = ref(0);
const testResult = ref<string>('');

// 群聊composable
let groupChat: any = null;

// 初始化
onMounted(async () => {
  try {
    const module = await useGroupChat();
    groupChat = module.useGroupChat();
    
    // 监听当前群聊变化
    watch(() => groupChat?.currentGroup?.value, async (newGroup) => {
      currentGroup.value = newGroup;
      if (newGroup) {
        await refreshStats();
      }
    }, { immediate: true });

    // 监听群聊名称变化
    watch(() => groupChat?.currentGroupName?.value, (newName) => {
      currentGroupName.value = newName;
    }, { immediate: true });

    // 监听SQLite状态变化
    watch(() => groupChat?.getSQLiteStatus?.value, (newStatus) => {
      if (newStatus) {
        sqliteStatus.value = { ...newStatus };
      }
    }, { immediate: true, deep: true });

  } catch (error) {
    console.error('初始化群聊SQLite状态失败:', error);
  }
});

// 刷新统计信息
const refreshStats = async () => {
  if (!currentGroup.value || !groupChat) return;
  
  try {
    // 🛡️ 安全检查：确保数据库已初始化
    if (!groupChat.storageServ?.isInitCompleted?.value) {
      console.log('数据库尚未初始化，跳过群聊统计刷新');
      groupStats.value = null;
      return;
    }
    
    // 获取SQLite统计
    const stats = await groupChat.getGroupStats(currentGroup.value);
    groupStats.value = stats;
    
    // 获取Gun.js内存消息数量
    const gunMsgs = groupChat.messagesByGroup?.value?.[currentGroup.value] || [];
    gunMessages.value = gunMsgs.length;
    
    // 获取合并后的消息数量
    const merged = await groupChat.getMergedMessages(currentGroup.value);
    mergedTotal.value = merged.length;
    
    console.log('📊 统计信息已刷新:', {
      sqlite: stats,
      gun: gunMessages.value,
      merged: mergedTotal.value
    });
    
  } catch (error) {
    console.error('刷新统计失败:', error);
    groupStats.value = null;
  }
};

// 切换SQLite功能
const toggleSQLiteFeature = () => {
  if (groupChat?.toggleSQLiteEnhanced) {
    groupChat.toggleSQLiteEnhanced();
    // 更新本地状态
    sqliteStatus.value.enhanced = !sqliteStatus.value.enhanced;
  }
};

// 测试合并加载功能
const testMergedLoad = async () => {
  if (!currentGroup.value || !groupChat) return;
  
  try {
    // 🛡️ 安全检查：确保数据库已初始化
    if (!groupChat.storageServ?.isInitCompleted?.value) {
      testResult.value = '数据库尚未初始化，无法测试';
      setTimeout(() => {
        testResult.value = '';
      }, 3000);
      return;
    }
    
    testResult.value = '正在测试合并加载...';
    
    const startTime = Date.now();
    const mergedMessages = await groupChat.getMergedMessages(currentGroup.value);
    const loadTime = Date.now() - startTime;
    
    const result = {
      loadTime: `${loadTime}ms`,
      totalMessages: mergedMessages.length,
      oldestMessage: mergedMessages.length > 0 ? new Date(mergedMessages[0].timestamp).toLocaleString() : 'N/A',
      newestMessage: mergedMessages.length > 0 ? new Date(mergedMessages[mergedMessages.length - 1].timestamp).toLocaleString() : 'N/A'
    };
    
    testResult.value = JSON.stringify(result, null, 2);
    
    setTimeout(() => {
      testResult.value = '';
    }, 10000);
    
  } catch (error) {
    testResult.value = `测试失败: ${error}`;
    setTimeout(() => {
      testResult.value = '';
    }, 5000);
  }
};
</script>

<style scoped>
.sqlite-status-card {
  margin: 16px;
  max-width: 600px;
}

.status-section,
.stats-section,
.actions-section {
  margin-bottom: 20px;
}

.status-section h3,
.stats-section h3 {
  margin: 0 0 12px 0;
  font-size: 1.1em;
  font-weight: 600;
  color: var(--ion-color-primary);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.current-group-info {
  background: var(--ion-color-light);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.current-group-info p {
  margin: 4px 0;
  font-size: 0.9em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stat-item {
  text-align: center;
  background: var(--ion-color-light);
  padding: 12px;
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5em;
  font-weight: bold;
  color: var(--ion-color-primary);
}

.stat-label {
  font-size: 0.8em;
  color: var(--ion-color-medium);
  margin-top: 4px;
}

.actions-section {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.test-result {
  background: var(--ion-color-dark);
  color: var(--ion-color-light);
  padding: 12px;
  border-radius: 8px;
  margin-top: 16px;
}

.test-result h4 {
  margin: 0 0 8px 0;
  color: var(--ion-color-primary);
}

.test-result pre {
  font-size: 0.8em;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}
</style> 