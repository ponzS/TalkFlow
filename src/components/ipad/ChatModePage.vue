<style scoped>
.peerpigeon {
  width: 300px;
  height: 300px;
}
.talkflow-title-text {
  font-size: min(100px, 5vw);
  font-weight: bold;
  color: transparent;
  text-shadow: 0 0 10px 0 rgba(0, 255, 217, 0.5);
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0);
  background: linear-gradient(-45deg, #52eed1, #000000, #23d5b4, #23d5ab);
  -webkit-background-clip: text;
  background-clip: text;
  z-index: 9999;
  background-size: 200% 200%;
  animation: gradientBreath 10s ease infinite;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
  margin: 0;
  text-align: center;
margin-bottom: -10px;
 
}
</style>

<template>

<div v-if="hasPadChat === '1'">
    <div style="width: 100%; height: 100vh; display: flex; justify-content: center; align-items: center;">
        <img src="@/assets/peerpigeon.png" class="peerpigeon">
        <!-- <br/>
        <h1 class="talkflow-title-text "><span style="color: var(--ion-text-color);">Peer</span>Pigeon</h1> -->
    </div>
</div>


<div v-if="hasPadChat === '2'">

    <PadChatPage />

</div>

<div v-if="hasPadChat === '3'">

    <GroupPad />

</div>


</template>


<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonSearchbar, IonContent, IonList, IonItem,IonButtons,
  IonItemSliding, IonItemOptions, IonItemOption, IonAvatar, IonLabel, IonBadge, IonListHeader, IonContent as IonContentType,
  IonSegment, IonSegmentButton, IonTitle, IonButton, IonIcon, IonInput, IonModal, IonPopover, alertController, toastController,
  
} from '@ionic/vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useGroupChat } from '@/composables/useGroupChat';
import { 
  eyeOffOutline, heartDislikeOutline,
  heartOutline, trashOutline,
  addCircleOutline, personAddOutline, scanSharp, reorderThreeOutline,
  chatbubbleEllipsesOutline, qrCodeOutline, copyOutline, arrowBackOutline, addOutline,peopleOutline,closeOutline, scanOutline,
  arrowForwardOutline,
  refreshCircleOutline,refreshOutline
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { Browser } from '@capacitor/browser';
import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
import { useDateFormatter } from '@/composables/useDateFormatter';
import { useSegmentState } from '@/composables/useSegmentState';
import { shallowRef } from 'vue';
import { debounce } from 'lodash';
import { useI18n } from 'vue-i18n';
import PadChatPage from './PadChatPage.vue';
import GroupPad from './GroupPad.vue';

mountClass();
const router = useRouter();
const chatFlowStore = getTalkFlowCore();
const groupChat = useGroupChat();
const { isDark } = useTheme();
const { formatLastTime } = useDateFormatter();
const { t } = useI18n();

const {
  visibleChatPreviewList, openChat: openPrivateChat, userAvatars, hideCurrentChat,
  onDeleteChatClick, currentChatPub, friendRemarks, getAliasRealtime,sendChat,buddyList,currentUserPub,
  restartAllListeners,triggerLightHaptic,hasPadChat
} = chatFlowStore;

const {
  groupSessions, deleteGroup, selectGroup, loadGroups,
  newGroupName, joinGroupKey, groups, tempKeyPair, copyKeyPair,
  createGroup, joinGroup, deleteGroup: deleteRoomGroup, setCurrentGroup,
  groupPreviews, markGroupAsRead,
} = groupChat;





</script>