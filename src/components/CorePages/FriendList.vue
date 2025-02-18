<template>
 

    <!-- 顶部：使用 IonHeader + IonToolbar 实现标题和搜索框 -->
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Contacts</ion-title>
        <!-- 右侧“添加”按钮 -->
        <ion-buttons slot="end">
          <ion-button  @click="toggleAddFriendModal">
            <ion-icon  class="i-material-symbols-group-add-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="searchQuery" placeholder="" />
      </ion-toolbar>
    </ion-header>

    <!-- 主内容区 -->
    <ion-content fullscreen class="friend-list-content">

      <!-- 好友申请模块 -->
      <div v-if="filteredReceivedRequests.length" class="friend-requests">
        <ion-list-header>Add Friend</ion-list-header>
        <ion-list>
          <ion-item v-for="(req, idx) in filteredReceivedRequests" :key="req.from + idx">
            <!-- 头像（如果有） -->
            <ion-avatar slot="start" v-if="userAvatars[req.from]">
              <img :src="userAvatars[req.from]" alt="Avatar" />
            </ion-avatar>

            <ion-label>
              <h2>{{ getAliasRealtime(req.from) }}</h2>
              <p @click="copyPub(req.from)" style="cursor: pointer;">
                {{$t('talkflowid')}}: {{ req.from }}
              </p>
            </ion-label>

            <!-- 同意/拒绝按钮 -->
            <ion-button color="success" slot="start"  @click="acceptBuddyRequest(req.from)">
              Agree
            </ion-button>
            <ion-button color="danger" slot="start" @click="rejectBuddyRequest(req.from)">
              Refuse
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <!-- 好友列表 -->
      <ion-list>
        <template v-for="(group, letter) in sortedGroupedBuddyList" :key="letter">
          <!-- 分组标题 -->
          <ion-list-header :id="'group-' + letter">
            {{ letter }}
          </ion-list-header>

          <!-- 分组内好友项 -->
          <ion-item-sliding
            v-for="friend in group"
            :key="friend.pub"
          >
            <!-- 可滑动的主内容 -->
            <ion-item @click="openChat(friend.pub)">
              <ion-avatar slot="start" v-if="userAvatars[friend.pub]">
                <img :src="userAvatars[friend.pub]" alt="avatar" />
              </ion-avatar>
              <ion-label>
                <h2>{{ getDisplayName(friend.pub) }}</h2>
              </ion-label>
            </ion-item>
            
            <!-- 滑动菜单按钮，删除好友 -->
            <ion-item-options side="end">
              <ion-item-option color="danger" @click.stop="removeBuddy(friend.pub)">
                {{$t('delete')}}
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </template>
      </ion-list>

      <!-- 好友数量或提示 -->
      <ion-text v-if="filteredBuddyList.length > 0" class="friend-count">
        {{ filteredBuddyList.length }} {{$t('afriend')}}
      </ion-text>
      <ion-text v-else class="friend-count">
        太惨了，一个朋友都没有
      </ion-text>
    </ion-content>

    <!-- 添加好友弹窗。 -->
    <ion-modal :is-open="showAddFriendModal" @didDismiss="toggleAddFriendModal(false)">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{$t('addfriend1')}}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="toggleAddFriendModal(false)">{{$t('close')}}</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <ion-textarea
          label="PublicKey"
          fill="outline"
          v-model="friendPub"
          placeholder=""
         
        ></ion-textarea>

        <ion-button color="success" expand="block" @click="requestAddBuddy">
          {{$t('addfriend')}}
        </ion-button>
        <ion-text v-if="buddyError" color="danger">{{ buddyError }}</ion-text>
      </ion-content>
    </ion-modal>

</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { } from 'ionicons/icons';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonIcon,
  IonAvatar,
  IonModal,
  IonSearchbar,
  IonTextarea,
  IonText
} from '@ionic/vue'

import chatFlowStore from '@/composables/TalkFlowCore'
import { pinyin } from 'pinyin-pro'

const {
  buddyList,
  receivedRequests,
  friendPub,
  buddyError,
  requestAddBuddy,
  acceptBuddyRequest,
  rejectBuddyRequest,
  openChat,
  removeBuddy,
  getAliasRealtime,
  userAvatars,
  friendRemarks,
  copyPub,
} = chatFlowStore

// 是否显示 "添加好友" 弹窗
const showAddFriendModal = ref(false)
function toggleAddFriendModal(val?: boolean) {
  showAddFriendModal.value = typeof val === 'boolean' ? val : !showAddFriendModal.value
}

// 搜索框
const searchQuery = ref('')

// 筛选好友请求（排除已经在好友列表中的）
const filteredReceivedRequests = computed(() => {
  return receivedRequests.value.filter((req) => {
    return !buddyList.value.some((b) => b.pub === req.from)
  })
})

// 根据备注或昵称获取显示名
function getDisplayName(pub: string): string {
  const remark = friendRemarks.value[pub]?.remark
  if (remark && remark.trim() !== '') {
    return remark
  }
  return getAliasRealtime(pub)
}

// 过滤好友列表
const filteredBuddyList = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return buddyList.value
  return buddyList.value.filter((b) => {
    const displayName = getDisplayName(b.pub).toLowerCase()
    return displayName.includes(q)
  })
})

// 获取首字母
function getInitialLetter(pub: string): string {
  const displayName = getDisplayName(pub)
  const letter = pinyin(displayName, { pattern: 'first', type: 'array' })[0] || '#'
  const upper = letter.toUpperCase()
  return /^[A-Z]$/.test(upper) ? upper : '#'
}

// 分组 + 排序
const sortedGroupedBuddyList = computed(() => {
  const groups: Record<string, typeof buddyList.value> = {}
  filteredBuddyList.value.forEach((b) => {
    const letter = getInitialLetter(b.pub)
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(b)
  })

  // 每个分组内也可再排序
  for (const letter in groups) {
    groups[letter].sort((a, b) => {
      return getDisplayName(a.pub).localeCompare(getDisplayName(b.pub))
    })
  }

  // 按字母顺序排序 + 把 # 放到最后
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })

  const sortedObj: Record<string, typeof buddyList.value> = {}
  sortedKeys.forEach((k) => {
    sortedObj[k] = groups[k]
  })
  return sortedObj
})
</script>

<style scoped>
.i-material-symbols-group-add-outline {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M12.5 11.95q.725-.8 1.113-1.825T14 8t-.387-2.125T12.5 4.05q1.5.2 2.5 1.325T16 8t-1 2.625t-2.5 1.325M18 20v-3q0-.9-.4-1.713t-1.05-1.437q1.275.45 2.363 1.163T20 17v3zm2-7v-2h-2V9h2V7h2v2h2v2h-2v2zM8 12q-1.65 0-2.825-1.175T4 8t1.175-2.825T8 4t2.825 1.175T12 8t-1.175 2.825T8 12m-8 8v-2.8q0-.85.438-1.562T1.6 14.55q1.55-.775 3.15-1.162T8 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T16 17.2V20zm8-10q.825 0 1.413-.587T10 8t-.587-1.412T8 6t-1.412.588T6 8t.588 1.413T8 10m-6 8h12v-.8q0-.275-.137-.5t-.363-.35q-1.35-.675-2.725-1.012T8 15t-2.775.338T2.5 16.35q-.225.125-.363.35T2 17.2zm6 0'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.2em;
  height: 1.2em;
}
.friend-list-content {
  --padding-bottom: 70px; /* 如需底部留白 */
}

/* 好友申请区 */
.friend-requests {
  margin-top: 8px;
}

.friend-count {
  display: block;
  text-align: center;
  margin: 16px 0 70px; /* 预留给下方空间 */
  font-size: 14px;
  color: var(--ion-color-medium);
}
.add-button {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text-color);
  cursor: pointer;
}
ion-avatar {
    --border-radius: 10px;
    width: 55px;
    height:55px
    
  }
</style>