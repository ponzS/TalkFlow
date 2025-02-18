<template>
  <div v-if="currentChatPub" class="container">
    <div class="card">
      <h3 style="height: 70px"></h3>

      <div v-if="userAvatars[currentChatPub]" class="avatar-container">
        <img class="avatar" :src="userAvatars[currentChatPub]" alt="用户头像" />
      </div>

      <div class="info">
        <h1 v-if="friendAlias" class="alias" style="font-size: 39px;font-weight: 700">{{ friendAlias }}</h1>
        <p v-if="friendAlias1" class="signature" style="font-size: 19px;font-weight: 400">{{ friendAlias1 }}</p>
        <div class="public-key">
          <span>{{ $t('talkflowid') }}：</span>
          <strong @click="copyPub(currentChatPub)">{{ currentChatPub }}</strong>
          <!-- <ion-button color="medium" @click="copyPub(currentChatPub)">复制</ion-button> -->
        </div>
      </div>

      <div class="remark-section">

        <ion-input label="private name" label-placement="floating" fill="outline" id="remark" v-model="remark" placeholder="" class="input" />
      </div>

      <div class="remark-section">

        <ion-textarea :auto-grow="true" label="private" label-placement="floating" fill="solid" id="remarkInfo" v-model="remarkInfo" placeholder="" class="textarea"></ion-textarea>
      </div>

      <ion-button color="success" @click="saveRemark" >{{$t('save')}}</ion-button>
      <ion-button color="medium" @click="UserCardMode" >{{$t('close')}}</ion-button>
    </div>
  </div>
  <div v-else class="no-chat">
    <p></p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import chatFlowStore from '@/composables/TalkFlowCore';

const {
  showUserCard,
  UserCardMode,
  currentChatPub,
  getAliasRealtime,
  getFriendRemark,
  updateFriendRemark,
  copyPub,
  userAvatars,
  getFriendSignature
} = chatFlowStore;

const remark = ref('');
const remarkInfo = ref('');

watch(currentChatPub, (newPub) => {
  if (newPub) {
    const { remark: r, remarkInfo: ri } = getFriendRemark(newPub);
    remark.value = r;
    remarkInfo.value = ri;
  } else {
    remark.value = '';
    remarkInfo.value = '';
  }
}, { immediate: true });

const friendAlias = computed(() => {
  return currentChatPub.value ? getAliasRealtime(currentChatPub.value) : '';
});

const friendAlias1 = computed(() => {
  return currentChatPub.value ? getFriendSignature(currentChatPub.value) : '';
});

function saveRemark() {
  if (currentChatPub.value) {
    updateFriendRemark(currentChatPub.value, remark.value, remarkInfo.value);
    alert('备注信息已保存！');
  }
}
</script>

<style scoped>
/* 背景 */
.container {
  background: rgba(241, 241, 241, 0.14);
  backdrop-filter: blur(20px);
  padding: 1.5em;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 100%;
  height: 100%;

  margin: 0 auto;
}

.card {
  background: transparent;
  border-radius: 20px;
  /* padding: 20px; */



}

.header {
  font-size: 1.5em;
  color: #fff;
  margin-bottom: 1em;
  text-align: center;
  font-weight: bold;
}

.avatar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5em;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 10px;
  object-fit: cover;

  transition: transform 0.3s ease-in-out;
}

.avatar:hover {
  transform: scale(1.1);
}

.info {
  color: var(--text-color);
  margin-bottom: 1.5em;
}

.alias, .signature {
  font-style: italic;
  color: var(--text-color);
}

.public-key {
  font-weight: bold;
  color: var(--text-color);
}

.copy-btn {
  background: linear-gradient(45deg, #f39c12, #8e44ad);
  border: none;
  padding: 0.5em 1em;
  color: white;
  border-radius: 8px;
  transition: transform 0.3s ease;
}

.copy-btn:hover {
  transform: scale(1.1);
}

.remark-section {
  margin-bottom: 1.5em;
}

label {
  color: var(--text-color);
  display: inline-block;
  margin-right: 0.5em;
}

.input{

width: 100%;
border-radius: 8px;


color: var(--text-color);

transition: all 0.3s ease;
}


.textarea {

  width: 100%;
  border-radius: 8px;

  overflow-y: auto;
  color: var(--text-color);

  transition: all 0.3s ease;
}

.input:focus, .textarea:focus {
  outline: none;
  border-color: #f39c12;
  background: rgba(255, 255, 255, 0.5);
}

.save-btn {
  background: linear-gradient(45deg, #3498db, #2ecc71);
  padding: 0.7em 1.5em;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.2em;
  cursor: pointer;
  transition: transform 0.3s ease-in-out;
}

.save-btn:hover {
  transform: scale(1.1);
}

.no-chat {
  color: #fff;
  font-size: 1.2em;
  text-align: center;
  margin-top: 2em;
}
</style>
