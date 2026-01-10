<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
          <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>Profile Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" >

<ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
        Profile Settings
            </h1>
          </ion-toolbar>
        </ion-header>



      <ion-list class="list-container">
        <!-- Current Avatar -->
        <ion-item button @click="editField('avatar')" class="list-item" >
          <ion-label>Avatar</ion-label>
          <div slot="end" class="item-content">
            <img
              v-if="userAvatars[currentUserPub!]"
              :src="userAvatars[currentUserPub!]"
              alt="Current Avatar"
              class="avatar-preview"
            />
            <img
              v-else
              :src="getGunAvatar(currentUserPub!)"
              alt="Avatar"
              class="avatar-preview"
            />
            <!-- <ion-icon :icon="icons.pencilOutline" class="edit-icon"></ion-icon> -->
          </div>
        </ion-item>

        <!-- Current Name -->
        <ion-item button @click="editField('name')" class="list-item" >
          <ion-label>Name</ion-label>
          <div slot="end" class="item-content">
            <span class="item-value">{{ currentUserAlias || 'Not set' }}</span>
            <!-- <ion-icon :icon="icons.pencilOutline" class="edit-icon"></ion-icon> -->
          </div>
        </ion-item>

        <!-- Current Link -->
        <ion-item button @click="editField('link')" class="list-item" >
          <ion-label>Link</ion-label>
          <div slot="end" class="item-content">
            <span class="item-value">{{ currentUserAlias1 || 'Not set' }}</span>
            <!-- <ion-icon :icon="pencilOutline" class="edit-icon"></ion-icon> -->
          </div>
        </ion-item>

        <!-- 🆕 Gun数据可视化 -->
        <!-- <ion-item button @click="toggleEpubPoolVisualization" class="list-item">
          <ion-label>Epub Pool Data</ion-label>
          <div slot="end" class="item-content">
            <span class="item-value">{{ epubPoolVisible ? 'Hide' : 'Show' }}</span>
          </div>
        </ion-item> -->
      </ion-list>

      <!-- 🆕 Epub池数据可视化面板 -->
      <!-- <div v-if="epubPoolVisible" class="epub-pool-panel">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Epub Pool Data Visualization</ion-card-title>
            <ion-card-subtitle>Real-time Gun.js epub pool monitoring</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="data-section">
              <h4>My Epub Pool Node: epub_pool/{{ currentUserPub?.slice(0, 8) }}...</h4>
              <div class="data-container">
                <pre v-if="epubPoolData && Object.keys(epubPoolData).length > 0" class="data-display">{{ JSON.stringify(epubPoolData, null, 2) }}</pre>
                <p v-else class="no-data">No epub data received yet</p>
              </div>
            </div>
            <div class="controls-section">
              <ion-button @click="refreshEpubPoolData" fill="outline" size="small">
                <ion-icon :icon="icons.refreshOutline" slot="start"></ion-icon>
                Refresh
              </ion-button>
              <ion-button @click="clearEpubPoolData" fill="outline" size="small" color="danger">
                <ion-icon :icon="icons.trashOutline" slot="start"></ion-icon>
                Clear
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div> -->

      <!-- Edit Modal -->
      <ion-modal :is-open="!!editingField"  @didDismiss="cancelEdit">
        <ion-content >
          <ion-header>
            <ion-toolbar>
              <ion-title>Edit {{ editingField }}</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="cancelEdit">
                  <ion-icon color="dark" :icon="icons.closeOutline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <div class="modal-body">
            <!-- Edit Name -->
            <ion-item v-if="editingField === 'name'" class="liquid-input-item" lines="none">
              <ion-label position="floating">New Name</ion-label>
              <ion-input v-model="tempInput" placeholder="Enter new name"></ion-input>
            </ion-item>
            <ion-text
              v-if="editingField === 'name' && updateAliasMsg"
              :color="updateAliasMsg === '别名更新成功' ? 'success' : 'danger'"
              class="status-text"
            >
              {{ updateAliasMsg }}
            </ion-text>

            <!-- Edit Link -->
            <ion-item v-if="editingField === 'link'" class="liquid-input-item" lines="none">
              <ion-label position="floating">New Link</ion-label>
              <ion-input v-model="tempInput" placeholder="Enter new link"></ion-input>
            </ion-item>
            <ion-text
              v-if="editingField === 'link' && updateAliasMsg1"
              :color="updateAliasMsg1 === '签名更新成功' ? 'success' : 'danger'"
              class="status-text"
            >
              {{ updateAliasMsg1 }}
            </ion-text>

            <!-- Edit Avatar -->
            <div v-if="editingField === 'avatar'" class="avatar-edit">
              <input type="file" accept="image/*" @change="handleAvatarUpload" class="liquid-file-input" />
              <div v-if="avatarUrl" class="avatar-preview-container">
                <img :src="avatarUrl" alt="Avatar Preview" class="avatar-preview-large" />
              </div>
              <ion-text
                v-if="updateAvatarMsg"
                :color="updateAvatarMsg === '头像更新成功' ? 'success' : 'danger'"
                class="status-text"
              >
                {{ updateAvatarMsg }}
              </ion-text>
              <img
              v-if="userAvatars[currentUserPub!]"
              :src="userAvatars[currentUserPub!]"
              alt="Current Avatar"
              class="avatar-preview"
            />
            <img
              v-else
              :src="getGunAvatar(currentUserPub!)"
              alt="Avatar"
              class="avatar-preview"
            />
              <ion-button expand="block" fill="outline" color="medium" @click="deleteOldAvatar(currentUserPub!)">useGunAvatar</ion-button>
            </div>

            <!-- Actions -->
            <div class="modal-actions">
              <ion-button expand="block" color="dark" @click="updateField" :disabled="isUpdating">
                {{ isUpdating ? 'Updating...' : 'Update' }}
              </ion-button>
              <ion-button expand="block" fill="outline" color="medium" @click="cancelEdit">
                Cancel
              </ion-button>
            </div>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonInput, IonButton, IonModal, IonText, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
} from '@ionic/vue';
import { pencilOutline, closeOutline, refreshOutline, trashOutline } from 'ionicons/icons';
import { gunAvatar, extractFromFile, mountClass } from "gun-avatar";

mountClass();
const router = useRouter();
const chatFlow = getTalkFlowCore();
const {
  newAliasInput1, updateAlias1, currentUserAlias1, updateAliasMsg1,
  newAliasInput, updateAlias, updateAliasMsg,
  avatarFile, avatarUrl, handleAvatarUpload, updateAvatar, updateAvatarMsg,
  userAvatars, currentUserPub, currentUserAlias, deleteOldAvatar, gun
} = chatFlow;

// Edit state
const editingField = ref<string | null>(null);
const tempInput = ref<string>('');
const isUpdating = ref(false);

// 🆕 Epub池可视化状态
const epubPoolVisible = ref(false);
const epubPoolData = ref<Record<string, any>>({});

// 🆕 Epub池可视化函数
const toggleEpubPoolVisualization = () => {
  epubPoolVisible.value = !epubPoolVisible.value;
  if (epubPoolVisible.value) {
    refreshEpubPoolData();
  }
};

const refreshEpubPoolData = () => {
  if (!currentUserPub.value) return;
  
 // console.log('🔍 刷新epub池数据...');
  
  // 监听自己的epub池节点
  gun.get('epub_pool').get(currentUserPub.value).on((data: any, key: string) => {
    if (data && key) {
      epubPoolData.value = { ...epubPoolData.value, [key]: data };
    //  console.log('📊 epub池数据更新:', { key: key.slice(0, 8), data });
    }
  });
};

const clearEpubPoolData = () => {
  epubPoolData.value = {};
 // console.log('🗑️ 已清空epub池数据显示');
};

const editField = (field: string) => {
  editingField.value = field;
  if (field === 'name') tempInput.value = newAliasInput.value || currentUserAlias.value || '';
  if (field === 'link') tempInput.value = newAliasInput1.value || '';
  if (field === 'avatar') tempInput.value = '';
};

const updateField = async () => {
  isUpdating.value = true;
  try {
    if (editingField.value === 'name') {
      newAliasInput.value = tempInput.value;
      await updateAlias();
    } else if (editingField.value === 'link') {
      newAliasInput1.value = tempInput.value;
      await updateAlias1();
    } else if (editingField.value === 'avatar' && avatarFile.value) {
      await updateAvatar();
    }
    if (
      updateAvatarMsg.value === '头像更新成功' ||
      updateAliasMsg.value === '别名更新成功' ||
      updateAliasMsg1.value === '签名更新成功'
    ) {
      cancelEdit();
    }
  } catch (err) {
    // Update failed
  } finally {
    isUpdating.value = false;
  }
};

const cancelEdit = () => {
  editingField.value = null;
  tempInput.value = '';
  if (avatarFile.value) {
    avatarFile.value = null;
    avatarUrl.value = '';
  }
};
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

// 导出图标
const icons = {
  pencilOutline,
  closeOutline,
  refreshOutline,
  trashOutline
};

// Generate avatar based on user's public key
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
    // draw: 'squares'
  } as any);
};
</script>

<style scoped>



.item-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.item-value {

  font-size: 1rem;
  max-width: 200px;
  word-break: break-all;
}

.edit-icon {
 
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}



/* Avatar Preview */
.avatar-preview {
  width: 39px;
  height: 39px;
  border-radius: 50%;

  object-fit: cover;
}






.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Input Item */
.liquid-input-item {

  --border-radius: 15px;
  --padding-start: 15px;
  --padding-end: 15px;
}



/* Status Text */
.status-text {
  font-size: 0.9rem;
  text-align: center;
  padding: 5px 0;
  color: #00ffcc;
}

/* Avatar Edit */
.avatar-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.liquid-file-input {
  padding: 12px;
  border: none;
  border-radius: 15px;
  background: rgba(140, 140, 140, 0.3);
  
  font-size: 14px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}



.avatar-preview-container {
  display: flex;
  justify-content: center;
}

.avatar-preview-large {
  width: 120px;
  height: 120px;
  border-radius: 15px;
  object-fit: cover;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}


/* Modal Actions */
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.liquid-button {
  --background: linear-gradient(45deg, #66ccff, #99eeff);
  --border-radius: 15px;
 
  height: 44px;
}

.liquid-button:hover {
  --background: linear-gradient(45deg, #77ddff, #aaf5ff);
}


</style>