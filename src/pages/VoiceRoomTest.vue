<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>语音房间测试</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="resetAll" fill="clear">
            <ion-icon :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- 状态指示器 -->
      <ion-card class="status-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon 
              :icon="isInRoom ? radioButtonOnOutline : radioButtonOffOutline"
              :class="{ 'online': isInRoom, 'offline': !isInRoom }"
            ></ion-icon>
            {{ isInRoom ? '在房间中' : '未连接' }}
          </ion-card-title>
          <ion-card-subtitle v-if="currentRoomId">
            房间ID: {{ currentRoomId.substring(0, 12) }}...
          </ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content v-if="isInRoom">
          <div class="status-info">
            <ion-chip :color="isHost ? 'primary' : 'secondary'">
              <ion-icon :icon="starOutline" v-if="isHost"></ion-icon>
              {{ isHost ? '房主' : '成员' }}
            </ion-chip>
            <ion-chip color="tertiary">
              <ion-icon :icon="peopleOutline"></ion-icon>
              {{ memberCount }} 人
            </ion-chip>
            <ion-chip :color="audioEnabled ? 'success' : 'danger'">
              <ion-icon :icon="audioEnabled ? micOutline : micOffOutline"></ion-icon>
              {{ audioEnabled ? '麦克风开启' : '麦克风关闭' }}
            </ion-chip>
          </div>
          
          <div class="user-info">
            <p><strong>我的昵称:</strong> {{ currentUserAlias }}</p>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- 未在房间时的操作面板 -->
      <div v-if="!isInRoom && !isConnecting">
        <!-- 创建房间 -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>创建新房间</ion-card-title>
            <ion-card-subtitle>生成新的密钥对并创建语音房间</ion-card-subtitle>
          </ion-card-header>
          
          <ion-card-content>
            <ion-button 
              expand="block" 
              @click="handleCreateRoom"
              class="create-button"
            >
              <ion-icon :icon="addOutline" slot="start"></ion-icon>
              创建房间
            </ion-button>
            
            <div v-if="generatedKeyPair" class="key-pair-display">
              <ion-item>
                <ion-label>
                  <h3>房间密钥对</h3>
                  <p>请复制并分享给需要加入的人</p>
                </ion-label>
              </ion-item>
              
              <ion-item>
                <ion-label position="stacked">公钥 (房间ID)</ion-label>
                <ion-input 
                  :value="generatedKeyPair.pub" 
                  readonly 
                  class="key-display"
                ></ion-input>
                <ion-button 
                  slot="end" 
                  fill="clear" 
                  @click="copyToClipboard(generatedKeyPair.pub)"
                >
                  <ion-icon :icon="copyOutline"></ion-icon>
                </ion-button>
              </ion-item>
              
              <ion-item>
                <ion-label position="stacked">完整密钥对 (JSON)</ion-label>
                <ion-textarea 
                  :value="JSON.stringify(generatedKeyPair, null, 2)" 
                  readonly 
                  :rows="6"
                  class="key-display"
                ></ion-textarea>
                <ion-button 
                  slot="end" 
                  fill="clear" 
                  @click="copyToClipboard(JSON.stringify(generatedKeyPair, null, 2))"
                >
                  <ion-icon :icon="copyOutline"></ion-icon>
                </ion-button>
              </ion-item>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- 加入房间 -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>加入房间</ion-card-title>
            <ion-card-subtitle>输入完整的密钥对来加入房间</ion-card-subtitle>
          </ion-card-header>
          
          <ion-card-content>
            <ion-item>
              <ion-label position="stacked">房间密钥对 (JSON格式)</ion-label>
              <ion-textarea 
                v-model="joinKeyPairInput"
                placeholder="粘贴完整的密钥对JSON..."
                :rows="6"
                :auto-grow="true"
              ></ion-textarea>
            </ion-item>
            
            <div class="button-group">
              <ion-button 
                fill="outline" 
                @click="validateKeyPairInput"
                :disabled="!joinKeyPairInput.trim()"
              >
                <ion-icon :icon="checkmarkOutline" slot="start"></ion-icon>
                验证密钥
              </ion-button>
              
              <ion-button 
                expand="block" 
                @click="handleJoinRoom"
                :disabled="!joinKeyPairInput.trim()"
                color="secondary"
              >
                <ion-icon :icon="enterOutline" slot="start"></ion-icon>
                加入房间
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- 连接中状态 -->
      <ion-card v-if="isConnecting">
        <ion-card-content class="connecting-content">
          <ion-spinner name="crescent"></ion-spinner>
          <p>正在连接...</p>
        </ion-card-content>
      </ion-card>

      <!-- 房间中的控制面板 -->
      <div v-if="isInRoom">
        <!-- 音频控制 -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>音频控制</ion-card-title>
          </ion-card-header>
          
          <ion-card-content>
            <div class="audio-controls">
              <ion-button 
                :color="audioEnabled ? 'danger' : 'success'"
                @click="toggleAudio"
                size="large"
                class="audio-toggle-button"
              >
                <ion-icon 
                  :icon="audioEnabled ? micOffOutline : micOutline" 
                  slot="start"
                ></ion-icon>
                {{ audioEnabled ? '关闭麦克风' : '开启麦克风' }}
              </ion-button>
              
              <div class="speaking-indicator" v-if="audioEnabled">
                <ion-chip :color="isSpeaking ? 'warning' : 'medium'">
                  <ion-icon :icon="pulseOutline"></ion-icon>
                  {{ isSpeaking ? '正在说话' : '静音中' }}
                </ion-chip>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- 成员列表 -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              房间成员 ({{ memberCount }})
            </ion-card-title>
          </ion-card-header>
          
          <ion-card-content>
            <ion-list>
              <ion-item v-for="member in connectedMembers" :key="member.userPub">
                <ion-avatar slot="start">
                  <div class="avatar-placeholder">
                    {{ member.userAlias.charAt(0).toUpperCase() }}
                  </div>
                </ion-avatar>
                
                <ion-label>
                  <h2>{{ member.userAlias }}</h2>
                  <p>{{ formatTimestamp(member.joinedAt) }}</p>
                </ion-label>
                
                <div slot="end" class="member-status">
                  <ion-chip v-if="member.isHost" color="primary" size="small">
                    <ion-icon :icon="starOutline"></ion-icon>
                    房主
                  </ion-chip>
                  
                  <ion-chip 
                    :color="member.audioEnabled ? 'success' : 'medium'" 
                    size="small"
                  >
                    <ion-icon 
                      :icon="member.audioEnabled ? micOutline : micOffOutline"
                    ></ion-icon>
                  </ion-chip>
                  
                  <ion-chip 
                    v-if="member.speaking" 
                    color="warning" 
                    size="small"
                  >
                    <ion-icon :icon="pulseOutline"></ion-icon>
                    说话中
                  </ion-chip>
                </div>
              </ion-item>
            </ion-list>
            
            <div v-if="memberCount === 0" class="empty-members">
              <p>暂无其他成员</p>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- 房间信息和控制 -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>房间信息</ion-card-title>
          </ion-card-header>
          
          <ion-card-content>
            <ion-item>
              <ion-label>
                <h3>房间ID</h3>
                <p>{{ currentRoomId }}</p>
              </ion-label>
              <ion-button 
                slot="end" 
                fill="clear" 
                @click="copyToClipboard(currentRoomId || '')"
              >
                <ion-icon :icon="copyOutline"></ion-icon>
              </ion-button>
            </ion-item>
            
            <ion-button 
              expand="block" 
              color="danger" 
              @click="handleLeaveRoom"
              class="leave-button"
            >
              <ion-icon :icon="exitOutline" slot="start"></ion-icon>
              离开房间
            </ion-button>
            
            <ion-button 
              v-if="isHost"
              expand="block" 
              fill="outline" 
              @click="exportRoomKeyPair"
              class="export-button"
            >
              <ion-icon :icon="downloadOutline" slot="start"></ion-icon>
              复制房间密钥
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- 远程音频播放器 -->
      <div v-if="isInRoom" class="remote-audio-players">
        <audio 
          v-for="[userId, stream] in Array.from(remoteStreams.entries())" 
          :key="userId"
          :srcObject="stream"
          autoplay
          playsinline
          style="display: none;"
        ></audio>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonChip,
  IonSpinner,
  IonList,
  IonAvatar
} from '@ionic/vue'
import {
  radioButtonOnOutline,
  radioButtonOffOutline,
  refreshOutline,
  addOutline,
  enterOutline,
  copyOutline,
  checkmarkOutline,
  micOutline,
  micOffOutline,
  pulseOutline,
  starOutline,
  peopleOutline,
  exitOutline,
  downloadOutline
} from 'ionicons/icons'
import { useVoiceRoom, type RoomKeyPair } from '@/composables/useVoiceRoom'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

// 使用语音房间功能
const {
  isInRoom,
  isHost,
  isConnecting,
  audioEnabled,
  isSpeaking,
  currentRoomId,
  currentUserAlias,
  memberCount,
  connectedMembers,
  remoteStreams,
  generateRoomKeyPair,
  validateKeyPair,
  createRoom,
  joinRoom,
  leaveRoom,
  toggleAudio,
  exportRoomData
} = useVoiceRoom()

// 界面状态
const joinKeyPairInput = ref<string>('')
const generatedKeyPair = ref<RoomKeyPair | null>(null)

/**
 * 创建房间
 */
async function handleCreateRoom() {
  try {
    // 先生成密钥对
    const keyPair = await generateRoomKeyPair()
    generatedKeyPair.value = keyPair
    
    // 使用生成的密钥对创建房间
    const roomId = await createRoom(keyPair)
    showToast(`房间创建成功！`, 'success')
  } catch (error) {
    console.error('创建房间失败:', error)
    showToast('创建房间失败', 'error')
  }
}

/**
 * 加入房间
 */
async function handleJoinRoom() {
  try {
    if (!joinKeyPairInput.value.trim()) {
      showToast('请输入房间密钥对', 'warning')
      return
    }
    
    let keyPair: RoomKeyPair
    try {
      keyPair = JSON.parse(joinKeyPairInput.value.trim())
    } catch (e) {
      showToast('密钥对格式错误，请检查JSON格式', 'error')
      return
    }
    
    const isValid = await validateKeyPair(keyPair)
    if (!isValid) {
      showToast('密钥对验证失败', 'error')
      return
    }
    
    await joinRoom(keyPair)
  } catch (error) {
    console.error('加入房间失败:', error)
    showToast('加入房间失败', 'error')
  }
}

/**
 * 离开房间
 */
async function handleLeaveRoom() {
  try {
    await leaveRoom()
  } catch (error) {
    console.error('离开房间失败:', error)
    showToast('离开房间失败', 'error')
  }
}

/**
 * 验证密钥对输入
 */
async function validateKeyPairInput() {
  try {
    if (!joinKeyPairInput.value.trim()) {
      showToast('请输入密钥对', 'warning')
      return
    }
    
    let keyPair: RoomKeyPair
    try {
      keyPair = JSON.parse(joinKeyPairInput.value.trim())
    } catch (e) {
      showToast('JSON格式错误', 'error')
      return
    }
    
    const isValid = await validateKeyPair(keyPair)
    if (isValid) {
      showToast('密钥对验证通过', 'success')
    } else {
      showToast('密钥对验证失败', 'error')
    }
  } catch (error) {
    console.error('验证密钥对失败:', error)
    showToast('验证失败', 'error')
  }
}

/**
 * 导出房间密钥对
 */
function exportRoomKeyPair() {
  const data = exportRoomData()
  if (data) {
    copyToClipboard(data)
    showToast('房间密钥已复制到剪贴板', 'success')
  } else {
    showToast('无法导出房间密钥', 'error')
  }
}

/**
 * 复制到剪贴板
 */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制到剪贴板', 'success')
  } catch (error) {
    console.error('复制失败:', error)
    showToast('复制失败', 'error')
  }
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

/**
 * 重置所有状态
 */
function resetAll() {
  if (isInRoom.value) {
    handleLeaveRoom()
  }
  
  joinKeyPairInput.value = ''
  generatedKeyPair.value = null
  
  showToast('已重置所有状态', 'success')
}
</script>

<style scoped>
.status-card {
  margin-bottom: 16px;
}

.status-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.user-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--ion-color-light);
}

.online {
  color: var(--ion-color-success);
}

.offline {
  color: var(--ion-color-medium);
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.button-group ion-button:first-child {
  flex: 0 0 auto;
}

.button-group ion-button:last-child {
  flex: 1;
}

.create-button,
.leave-button,
.export-button {
  margin-top: 16px;
}

.key-pair-display {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-light);
}

.key-display {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.connecting-content {
  text-align: center;
  padding: 32px;
}

.connecting-content ion-spinner {
  margin-bottom: 16px;
}

.audio-controls {
  text-align: center;
}

.audio-toggle-button {
  margin-bottom: 16px;
}

.speaking-indicator {
  display: flex;
  justify-content: center;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, var(--ion-color-primary), var(--ion-color-secondary));
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.member-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.empty-members {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 20px;
}

.remote-audio-players {
  position: fixed;
  top: -1000px;
  left: -1000px;
  pointer-events: none;
}

/* 响应式设计 */
@media (min-width: 768px) {
  .button-group {
    flex-direction: row;
  }
  
  .member-status {
    flex-direction: row;
    align-items: center;
  }
}

@media (max-width: 767px) {
  .button-group {
    flex-direction: column;
  }
  
  .button-group ion-button:first-child {
    flex: 1;
  }
}

/* 动画效果 */
.speaking-indicator ion-chip {
  transition: all 0.3s ease;
}

.audio-toggle-button {
  transition: all 0.2s ease;
}

.status-card {
  transition: all 0.3s ease;
}
</style> 