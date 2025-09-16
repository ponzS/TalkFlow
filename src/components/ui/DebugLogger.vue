<template>
  <div v-if="isVisible" class="debug-logger">
    <div class="debug-header">
      <h3>🔍 图片调试日志</h3>
      <div class="debug-controls">
        <ion-button @click="clearLogs" fill="clear" size="small">
          <ion-icon :icon="trashOutline"></ion-icon>
        </ion-button>
        <ion-button @click="toggleVisibility" fill="clear" size="small">
          <ion-icon :icon="closeOutline"></ion-icon>
        </ion-button>
      </div>
    </div>
    
    <div class="debug-content">
      <div v-if="logs.length === 0" class="no-logs">
        等待调试信息...
      </div>
      
      <!-- 图片识别问题快速修复提示 -->
      <div v-if="hasImageIssues" class="quick-fix-panel">
        <h4>🔧 图片识别问题快速修复</h4>
        <div class="fix-suggestions">
          <div class="fix-item">
            <strong>1. 检查模型</strong>
            <p>确保使用llama3.2-vision:11b等视觉模型</p>
          </div>
          <div class="fix-item">
            <strong>2. 优化图片</strong>
            <p>使用PNG/JPEG，大小1MB以内，清晰对比度高</p>
          </div>
          <div class="fix-item">
            <strong>3. 改进提示词</strong>
            <p>试试："请详细描述这张图片的内容"</p>
          </div>
        </div>
      </div>
      
      <div v-for="(log, index) in logs" :key="index" class="debug-log-item" :class="log.level">
        <div class="log-header">
          <span class="log-icon">{{ log.icon }}</span>
          <span class="log-title">{{ log.title }}</span>
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        </div>
        
        <div class="log-content">
          <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 浮动调试按钮 -->
  <ion-fab v-if="!isVisible && logs.length > 0" vertical="bottom" horizontal="start" slot="fixed">
    <ion-fab-button @click="toggleVisibility" color="warning" size="small">
      <ion-icon :icon="bugOutline"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { IonButton, IonIcon, IonFab, IonFabButton } from '@ionic/vue';
import { trashOutline, closeOutline, bugOutline } from 'ionicons/icons';

interface DebugLog {
  id: string;
  level: 'info' | 'success' | 'warning' | 'error';
  icon: string;
  title: string;
  data: any;
  timestamp: Date;
}

const isVisible = ref(false);
const logs = ref<DebugLog[]>([]);

// 检测图片识别问题
const hasImageIssues = computed(() => {
  const recentLogs = logs.value.slice(0, 10); // 检查最近10条日志
  
  const hasImageSelected = recentLogs.some(log => log.title === '图片选择');
  const hasApiRequest = recentLogs.some(log => log.title === 'API请求');
  const hasNonVisionModel = recentLogs.some(log => 
    log.title === '模型验证' && 
    log.data?.suggestion?.includes('建议使用')
  );
  
  return hasImageSelected && hasApiRequest && hasNonVisionModel;
});

const addLog = (level: DebugLog['level'], icon: string, title: string, data: any) => {
  const log: DebugLog = {
    id: Date.now().toString(),
    level,
    icon,
    title,
    data,
    timestamp: new Date()
  };
  
  logs.value.unshift(log); // 新日志添加到顶部
  
  // 限制日志数量
  if (logs.value.length > 20) {
    logs.value = logs.value.slice(0, 20);
  }
  
  // 有新日志时自动显示面板
  if (!isVisible.value) {
    isVisible.value = true;
  }
};

const clearLogs = () => {
  logs.value = [];
};

const toggleVisibility = () => {
  isVisible.value = !isVisible.value;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString();
};

// 暴露给父组件的方法
const logImageSelected = (data: any) => {
  addLog('info', '🖼️', '图片选择', data);
};

const logImageSending = (data: any) => {
  addLog('info', '📤', '发送消息', data);
};

const logUserMessage = (data: any) => {
  addLog('success', '👤', '用户消息创建', data);
};

const logApiPrepare = (data: any) => {
  addLog('info', '🌐', 'API数据准备', data);
};

const logApiRequest = (data: any) => {
  addLog('info', '🚀', 'API请求', data);
};

const logApiResponse = (data: any) => {
  addLog('success', '✅', 'API响应', data);
};

const logApiError = (data: any) => {
  addLog('error', '❌', 'API错误', data);
};

const logInfo = (title: string, data: any) => {
  addLog('info', 'ℹ️', title, data);
};

const logWarning = (title: string, data: any) => {
  addLog('warning', '⚠️', title, data);
};

const logError = (title: string, data: any) => {
  addLog('error', '💥', title, data);
};

// 监听全局日志事件
const handleGlobalLog = (event: CustomEvent) => {
  const { type, title, data } = event.detail;
  
  switch (type) {
    case 'imageSelected':
      logImageSelected(data);
      break;
    case 'imageSending':
      logImageSending(data);
      break;
    case 'userMessage':
      logUserMessage(data);
      break;
    case 'apiPrepare':
      logApiPrepare(data);
      break;
    case 'apiRequest':
      logApiRequest(data);
      break;
    case 'apiResponse':
      logApiResponse(data);
      break;
    case 'apiError':
      logApiError(data);
      break;
    default:
      logInfo(title, data);
  }
};

onMounted(() => {
  window.addEventListener('debugLog', handleGlobalLog as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('debugLog', handleGlobalLog as EventListener);
});

// 暴露方法给父组件
defineExpose({
  logImageSelected,
  logImageSending,
  logUserMessage,
  logApiPrepare,
  logApiRequest,
  logApiResponse,
  logApiError,
  logInfo,
  logWarning,
  logError,
  show: () => { isVisible.value = true; },
  hide: () => { isVisible.value = false; },
  toggle: toggleVisibility,
  clear: clearLogs
});
</script>

<style scoped>
.debug-logger {
  position: fixed;
  top: 60px;
  right: 16px;
  width: 400px;
  max-height: 60vh;
  background: var(--ion-background-color);
  border: 2px solid var(--ion-color-warning);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  overflow: hidden;
}

.debug-header {
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debug-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.debug-controls {
  display: flex;
  gap: 4px;
}

.debug-controls ion-button {
  --color: var(--ion-color-warning-contrast);
  --padding-start: 4px;
  --padding-end: 4px;
  height: 24px;
  width: 24px;
}

.debug-content {
  max-height: calc(60vh - 50px);
  overflow-y: auto;
  padding: 8px;
}

.no-logs {
  text-align: center;
  padding: 20px;
  color: var(--ion-color-medium);
  font-style: italic;
}

.debug-log-item {
  margin-bottom: 12px;
  border-radius: 8px;
  border-left: 4px solid;
  background: var(--ion-color-step-50);
  overflow: hidden;
}

.debug-log-item.info {
  border-left-color: var(--ion-color-primary);
}

.debug-log-item.success {
  border-left-color: var(--ion-color-success);
}

.debug-log-item.warning {
  border-left-color: var(--ion-color-warning);
}

.debug-log-item.error {
  border-left-color: var(--ion-color-danger);
}

.log-header {
  padding: 8px 12px;
  background: var(--ion-color-step-100);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 12px;
}

.log-icon {
  font-size: 14px;
}

.log-title {
  flex: 1;
}

.log-time {
  opacity: 0.7;
  font-size: 10px;
}

.log-content {
  padding: 8px 12px;
}

.log-content pre {
  margin: 0;
  font-size: 10px;
  line-height: 1.3;
  color: var(--ion-text-color);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .debug-logger {
    width: calc(100vw - 32px);
    right: 16px;
    left: 16px;
  }
}

/* 快速修复面板样式 */
.quick-fix-panel {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  border: 2px solid #f39c12;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.quick-fix-panel h4 {
  margin: 0 0 8px 0;
  color: #d68910;
  font-size: 12px;
  font-weight: 600;
}

.fix-suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fix-item {
  font-size: 10px;
  line-height: 1.2;
}

.fix-item strong {
  color: #b7950b;
  display: block;
  margin-bottom: 2px;
}

.fix-item p {
  margin: 0;
  color: #7d6608;
  opacity: 0.9;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .debug-logger {
    box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1);
  }
  
  .debug-log-item {
    background: var(--ion-color-step-100);
  }
  
  .log-header {
    background: var(--ion-color-step-150);
  }
  
  .quick-fix-panel {
    background: linear-gradient(135deg, rgba(255, 243, 205, 0.2) 0%, rgba(255, 234, 167, 0.2) 100%);
    border-color: rgba(243, 156, 18, 0.5);
  }
  
  .quick-fix-panel h4 {
    color: #f39c12;
  }
  
  .fix-item strong {
    color: #f1c40f;
  }
  
  .fix-item p {
    color: #f4d03f;
  }
}
</style> 