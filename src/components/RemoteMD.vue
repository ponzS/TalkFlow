<template>
  <div class="settings-container">
    <!-- Bark 远程通知设置 -->
    <div >
      <!-- 当前聊天好友的远程通知配置 -->
      <div v-if="currentChatPub" class="section-card">

            <!-- 当前对话好友信息 -->
      <div v-if="currentChatPub" class="info-item">
        <div class="info-content">
          <h3 class="info-title">{{ $t('currentChatFriend') }}</h3>
          <div class="info-details">
            <p>{{ $t('nickname') }}: {{ getDisplayName(currentChatPub) }}</p>
            <p>{{ $t('publicKey') }}: {{ currentChatPub.slice(0, 16) }}...</p>
            <p>{{ $t('remoteNotificationCertificate') }}: {{ currentChatBarkConfig ? $t('configured') : $t('notConfigured') }}</p>
          </div>
        </div>
      </div>



        <div class="input-group">
          <label class="input-label">{{ $t('remoteNotificationContent') }}</label>
          <input 
            v-model="testContent" 
            class="custom-input"
            :placeholder="$t('enterCustomContent')"
          />
        </div>
        
        <div class="button-group">
          <button 
            v-if="currentChatBarkConfig && currentChatBarkConfig.enabled"
            class="custom-button primary"
            @click="testFriendBarkNotification"
          >
        
            {{ $t('sendRemoteNotification') }}
          </button>
        </div>
      </div>
            
          
      
      <!-- 我的远程通知配置 -->
      <div class="section-card">
        <h3 class="section-subtitle">{{ $t('myRemoteNotificationConfig') }}</h3>
        
        <!-- 发送远程通知证书消息 -->
        <div v-if="currentChatPub && currentUserBarkConfig && currentUserBarkConfig.enabled" class="button-group">
          <button 
            class="custom-button primary"
            @click="sendNotificationCertificate"
          >
       
            {{ $t('sendMyNotificationCertificateToFriend') }}
          </button>
          
          <button 
            class="custom-button danger"
            @click="sendDeleteCertificateRequest"
          >

            {{ $t('revokeOtherNotificationCertificate') }}
          </button>
        </div>
        
        <div class="info-item">
          <div class="info-content">
            <h4 class="info-title">{{ $t('myConfigStatus') }}</h4>
          </div>
         <div v-if="currentUserBarkConfig" >
          <div >
            <p>{{ $t('notificationServerDomain') }}: {{ currentUserBarkConfig.serverUrl }}</p>
            <p>{{ $t('deviceKey') }}: {{ currentUserBarkConfig.deviceKey }}</p>
          </div>
        </div>
        </div>
        
        <div class="input-group">
          <label class="input-label">API URL</label>
          <input 
            v-model="myBarkUrlInput" 
            class="custom-input"
            placeholder="Enter Api Url..."
        
          />
        </div>
        
 
        
        <div class="button-group">
          <button 
            class="custom-button secondary"
            @click="saveMyBarkConfig"
            :disabled="!myBarkUrlInput.trim()"
          >
            <ion-icon :icon="saveOutline" ></ion-icon>
            {{ $t('saveMyConfig') }}
          </button>
          
          <button 
            v-if="currentUserBarkConfig && currentUserBarkConfig.enabled"
            class="custom-button primary"
            @click="testMyBarkNotification"
          >
            <ion-icon :icon="notificationsCircleOutline" ></ion-icon>
            {{ $t('testMyNotification') }}
          </button>
        </div>
      </div>
            
          
      
      <div class="note-section">
        <div class="custom-note">
          <p>• {{ $t('notificationSwitchInBarkApp') }}</p>
          <p>• {{ $t('deviceKeyFromBarkApp') }}</p>
          <p>• {{ $t('supportCustomNotificationServer') }}</p>
          <p>• <a href="https://apps.apple.com/us/app/bark-custom-notifications/id1403753865?l=en-GB" target="_blank" rel="noopener noreferrer">Bark APP</a></p>
          <p>• <a href="https://github.com/Finb/Bark" target="_blank" rel="noopener noreferrer">Bark GitHub</a></p>
       
        </div>
      </div>
    </div>
  </div>

  <div style="height: 200px;"></div>
</template>
  
  <script setup lang="ts">
import { useBarkNotification } from '@/composables/useBarkNotification';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';

import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { toastController } from '@ionic/vue';

const { t } = useI18n();

const chatFlowStore = getTalkFlowCore();
const { currentChatPub, currentUserPub, friendRemarks, getAliasRealtime, sendChat,currentUserAlias } = chatFlowStore;

// 获取好友显示名称
function getDisplayName(pub: string): string {
  const remark = friendRemarks.value[pub]?.remark;
  return remark && remark.trim() !== '' ? remark : getAliasRealtime(pub);
}
import { 

  saveOutline,
  notificationsCircleOutline
} from 'ionicons/icons';
const barkNotification = useBarkNotification();
const { 
  initBarkSettings,
  currentUserBarkConfig,
  currentChatBarkConfig,
  allBarkConfigs,
  setBarkConfigForPubKey,
} = barkNotification;

// Ionic Toast 辅助函数
const showToast = async (message: string, color: 'success' | 'warning' | 'danger' = 'success') => {
  const toast = await toastController.create({
    message,
    duration: 2000,
    color,
    position: 'top'
  });
  await toast.present();
};

// 当前选择的配置类型：'self' 或 'friend'
const configType = ref<'self' | 'friend'>('self');

// 当前选择的好友公钥（用于设置好友的Bark配置）
const selectedFriendPub = ref<string>('');

// Bark URL 输入框
const currentBarkUrlInput = ref('');
const myBarkUrlInput = ref('');

// 测试通知自定义内容
const testTitle = ref('');
const testContent = ref('');
const testUrl = ref('talkflow://');
const testIcon = ref('https://github.com/user-attachments/assets/0027f593-e971-412a-bfbf-18c7f92781ff');

// 计算属性：当前配置的公钥
const currentConfigPubKey = computed(() => {
  if (configType.value === 'self') {
    return currentUserPub.value;
  } else {
    return selectedFriendPub.value || currentChatPub.value;
  }
});

// 计算属性：当前配置
const currentConfig = computed(() => {
  if (configType.value === 'self') {
    return currentUserBarkConfig.value;
  } else {
    const pubKey = selectedFriendPub.value || currentChatPub.value;
    return pubKey ? allBarkConfigs.value.find(c => c.pubKey === pubKey) : null;
  }
});


// 监听配置类型变化，自动设置默认选择
watch(configType, (newType) => {
  if (newType === 'friend' && currentChatPub.value && !selectedFriendPub.value) {
    selectedFriendPub.value = currentChatPub.value;
  }
  updateCurrentBarkUrl();
});

// 监听选择的好友变化
watch(selectedFriendPub, () => {
  updateCurrentBarkUrl();
});

// 监听当前配置变化，更新URL输入框
watch(currentConfig, () => {
  updateCurrentBarkUrl();
});

// 更新当前Bark URL输入框
function updateCurrentBarkUrl() {
  const config = currentConfig.value;
  if (config) {
    currentBarkUrlInput.value = `${config.serverUrl}/${config.deviceKey}`;
  } else {
    currentBarkUrlInput.value = '';
  }
}

onMounted(async () => {
  // 初始化 Bark 设置
  await initBarkSettings();
  
  // 如果当前有聊天对象，默认选择好友配置
  if (currentChatPub.value) {
    configType.value = 'friend';
    selectedFriendPub.value = currentChatPub.value;
  }
  
  updateCurrentBarkUrl();
});






// 发送远程通知证书消息给当前聊天好友
async function sendNotificationCertificate() {
  if (!currentChatPub.value || !currentUserBarkConfig.value) {
    await showToast(t('unableToSendMissingChatOrConfig'), 'warning');
    return;
  }
  
  const config = currentUserBarkConfig.value;
  const apiUrl = `${config.serverUrl}/${config.deviceKey}`;
  const message = `<apiurl>${apiUrl}</apiurl>`;
  
  try {
    await sendChat('text', message);
    await showToast(t('remoteNotificationCertificateSent'), 'success');
  } catch (error) {
   // console.error('发送远程通知证书失败:', error);
    await showToast(t('sendFailedPleaseTryAgain'), 'danger');
  }
}

// 发送删除证书请求
async function sendDeleteCertificateRequest() {
  if (!currentChatPub.value || !currentUserPub.value || !currentUserBarkConfig.value) {
    await showToast(t('unableToSendDeleteRequestMissingInfo'), 'danger');
    return;
  }
  
  try {
    const myApiUrl = `${currentUserBarkConfig.value.serverUrl}/${currentUserBarkConfig.value.deviceKey}`;
    const deleteMessage = `<delete><pub>${currentUserPub.value}</pub><apiurl>${myApiUrl}</apiurl></delete>`;
    
    await sendChat('text', deleteMessage);
    await showToast(t('deleteCertificateRequestSent'), 'success');
  } catch (error) {
   // console.error('发送删除证书请求失败:', error);
    await showToast(t('sendDeleteRequestFailedPleaseTryAgain'), 'danger');
  }
}




async function saveMyBarkConfig() {
  if (!myBarkUrlInput.value.trim()) {
    await showToast(t('pleaseEnterBarkUrl'), 'warning');
    return;
  }
  
  const success = await setBarkConfigForPubKey(currentUserPub.value, myBarkUrlInput.value.trim(), true);
  if (success) {
    myBarkUrlInput.value = '';
    await showToast(t('myConfigSavedSuccessfully'), 'success');
  }
}



async function testMyBarkNotification() {
  if (!currentUserBarkConfig.value?.enabled) {
    await showToast(t('configNotEnabled'), 'warning');
    return;
  }
  
  const title = testTitle.value.trim() || t('testNotification');
  const content = testContent.value.trim() || t('thisIsTestNotification');
  
  const success = await barkNotification.sendBarkNotification(
    title,
    content,
    currentUserBarkConfig.value.deviceKey,
    currentUserBarkConfig.value.serverUrl,
    testUrl.value.trim() || undefined,
    testIcon.value.trim() || undefined
  );
  
  if (success) {
    testContent.value='';
    await showToast(t('testNotificationSentSuccessfully'), 'success');
  } else {
    await showToast(t('testNotificationSendFailed'), 'danger');
  }
}



async function testFriendBarkNotification() {
  if (!currentChatBarkConfig.value?.enabled || !currentChatPub.value) {
    await showToast(t('friendConfigNotEnabled'), 'warning');
    return;
  }
  
  const title = currentUserAlias.value;
  const content = testContent.value.trim() ;
  
  const success = await barkNotification.sendBarkNotification(
    title,
    content,
    currentChatBarkConfig.value.deviceKey,
    currentChatBarkConfig.value.serverUrl,
    testUrl.value.trim() || undefined,
    testIcon.value.trim() || undefined
  );
  
  if (success) {
    testContent.value = '';
    await showToast(t('testNotificationSentSuccessfully'), 'success');
  } else {
    await showToast(t('testNotificationSendFailed'), 'danger');
  }
}

  </script>
  
<style scoped>
/* 简约黑白主题 */
.settings-container {
  margin: 0 auto;
  /* padding: 1rem; */
}

.section-card {
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-light);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-subtitle {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--ion-color-light);
}

.info-item {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid var(--ion-color-light);
  border-radius: 6px;
  background: var(--ion-color-light);
}

.info-content {
  color: var(--ion-text-color);
}

.info-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin-bottom: 0.5rem;
}

.info-details p {
  margin: 0.3rem 0;
  color: var(--ion-color-medium-shade);
  font-size: 0.9rem;
}

.input-group {
  margin-bottom: 1rem;
}

.input-label {
  display: block;
  font-weight: 500;
  color: var(--ion-text-color);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.custom-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--ion-color-medium);
  border-radius: 4px;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.custom-input:focus {
  border-color: var(--ion-color-primary);
  background: var(--ion-background-color);
}

.custom-input::placeholder {
  color: var(--ion-color-medium);
}

.button-group {
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.custom-button {
  padding: 0.75rem 1rem;
  border: 1px solid var(--ion-color-medium);
  border-radius: 4px;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.custom-button:hover:not(:disabled) {
  background: var(--ion-color-light);
  border-color: var(--ion-text-color);
}

.custom-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-button.primary {
  background: var(--ion-text-color);
  color: var(--ion-background-color);
  border-color: var(--ion-text-color);
}

.custom-button.primary:hover:not(:disabled) {
  background: var(--ion-color-dark);
  border-color: var(--ion-color-dark);
}

.custom-button.secondary {
  border-color: var(--ion-color-medium);
  color: var(--ion-color-medium-shade);
}

.custom-button.secondary:hover:not(:disabled) {
  background: var(--ion-color-medium);
  color: var(--ion-background-color);
}

.custom-button.danger {
  border-color: var(--ion-color-danger);
  color: var(--ion-color-danger);
}

.custom-button.danger:hover:not(:disabled) {
  background: var(--ion-color-danger);
  color: var(--ion-background-color);
}

.note-section {
  margin-top: 1.5rem;
}

.custom-note {
  padding: 1rem;
  border: 1px solid var(--ion-color-light);
  border-radius: 6px;
  background: var(--ion-color-light);
}

.custom-note p {
  margin: 0.3rem 0;
  font-size: 0.85rem;
  color: var(--ion-color-medium-shade);
}

.custom-note a {
  color: var(--ion-color-primary);
  text-decoration: none;
}

.custom-note a:hover {
  text-decoration: underline;
}

/* 图标样式 */
ion-icon {
  font-size: 1.1rem;
  color: inherit;
}

/* 响应式设计 */
@media (min-width: 768px) {
  .settings-container {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .button-group {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .custom-button {
    flex: 1;
    min-width: 180px;
  }
}
</style>