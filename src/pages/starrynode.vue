<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button text="" default-href="/index" />
        </ion-buttons>
        <ion-title>分块加载朋友圈</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div style="margin: 10px;">
        <textarea v-model="newMomentContent" placeholder="写点什么..." />
        <ion-button @click="handlePublish">发布动态</ion-button>
      </div>

      <!-- 动态列表 -->
      <div
        v-for="item in publicMomentsSorted"
        :key="item.id"
        style="border:1px solid #aaa; margin:10px; padding:10px;"
      >
        <p>{{ getAlias(item.pub) }} / 时间: {{ formatTimestamp(item.timestamp) }}</p>
        <p>{{ item.content }}</p>
        <div>
          <button @click="handleLike(item)">👍 {{ item.likes }}</button>
        </div>
      </div>

      <!-- 底部自动加载更多 -->
      <ion-infinite-scroll threshold="100px" @ionInfinite="loadMorePublicMoments($event)">
        <ion-infinite-scroll-content loadingSpinner="bubbles" loadingText="正在加载更多...">
        </ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonContent } from '@ionic/vue'
import { useRouter } from 'vue-router'
import {
  publicMoments,
  publishMoment,
  likeMoment,
  getLatestChunkIndex,
  listenOneChunk,
  type Moment,
} from '@/composables/MomentsModule'
import chatFlowStore from '@/composables/TalkFlowCore'

const router = useRouter()

// =============== 组件内部的状态 ===============
const newMomentContent = ref('')
function handlePublish() {
  if (!newMomentContent.value.trim()) {
    alert('动态内容不能为空')
    return
  }
  publishMoment(newMomentContent.value.trim())
  newMomentContent.value = ''
}

// 自定义：存储哪个好友当前加载到哪个块
const buddyChunkMap = ref<Record<string, number>>({})
// 存储已加载过的块，防止重复加载
const buddyLoadedChunks = ref<Record<string, Set<number>>>({})

// 获取别名
function getAlias(pub: string) {
  return chatFlowStore.getAliasRealtime(pub) || pub.slice(0, 6)
}

// 时间戳格式化
function formatTimestamp(ts: number) {
  return chatFlowStore.formatTimestamp(ts)
}

// 点赞
function handleLike(m: Moment) {
  likeMoment(m)
}

// 对 publicMoments 做一下排序
const publicMomentsSorted = computed(() => {
  return [...publicMoments.value].sort((a, b) => b.timestamp - a.timestamp)
})

// onMounted: 加载所有好友和自己最新块
onMounted(async () => {
  // 1) 先清空
  publicMoments.value = []

  // 2) 获取所有好友 pub + 当前用户 pub
  const buddies = chatFlowStore.buddyList.value.map((b: { pub: string }) => b.pub)
  const currentPub = chatFlowStore.currentUserPub.value
  const pubs = currentPub ? [...buddies, currentPub] : buddies

  // 3) 分别读取最新块并监听
  for (const pub of pubs) {
    const latest = await getLatestChunkIndex(pub)
    buddyChunkMap.value[pub] = latest
    buddyLoadedChunks.value[pub] = new Set([latest])
    listenOneChunk(pub, latest, publicMoments, true)
  }

  // 4) 给 Gun 数据一点时间异步加载，然后检查数量
  setTimeout(() => {
    checkMinimumMoments()
  }, 500)
})

/** 
 * checkMinimumMoments: 如果当前 publicMoments 数量 < 10，则自动调用一次 loadMore 
 * 如果依然不足且还有可加载的块，就再多次加载，避免无限循环 
*/
function checkMinimumMoments() {
  if (publicMoments.value.length < 10) {
    // 手动调用 loadMorePublicMoments（无事件对象），写一个变体函数
    const canLoad = loadMorePublicMomentsManual()
    if (canLoad) {
      // 再给一点时间让数据到达
      setTimeout(() => {
        if (publicMoments.value.length < 10) {
          checkMinimumMoments() // 递归再检查一次
        }
      }, 500)
    }
  }
}

/** 
 * loadMorePublicMomentsManual: 和 loadMorePublicMoments 逻辑相似，但不依赖 IonInfiniteScroll 的 event 
 * 返回 boolean 表示是否还能继续加载 
*/
function loadMorePublicMomentsManual(): boolean {
  let loadedSomething = false

  const pubs = Object.keys(buddyChunkMap.value)
  for (const pub of pubs) {
    let currentIndex = buddyChunkMap.value[pub]
    if (currentIndex <= 0) {
      continue // 到达最早块
    }
    const nextIndex = currentIndex - 1
    if (!buddyLoadedChunks.value[pub]) {
      buddyLoadedChunks.value[pub] = new Set()
    }
    if (buddyLoadedChunks.value[pub].has(nextIndex)) {
      continue // 已加载过
    }
    // 可以加载
    buddyLoadedChunks.value[pub].add(nextIndex)
    buddyChunkMap.value[pub] = nextIndex
    listenOneChunk(pub, nextIndex, publicMoments, true)
    loadedSomething = true
  }

  return loadedSomething
}

/** 原有：当 IonInfiniteScroll 触发时，加载更早块 */
async function loadMorePublicMoments(ev: Event) {
  const infiniteScroll = ev.target as HTMLIonInfiniteScrollElement

  // 1) 遍历所有 pub
  const pubs = Object.keys(buddyChunkMap.value)
  for (const pub of pubs) {
    let currentIndex = buddyChunkMap.value[pub]
    if (currentIndex <= 0) {
      // 已到最早
      continue
    }
    const nextIndex = currentIndex - 1
    if (!buddyLoadedChunks.value[pub]) {
      buddyLoadedChunks.value[pub] = new Set()
    }
    if (buddyLoadedChunks.value[pub].has(nextIndex)) {
      continue
    }
    buddyLoadedChunks.value[pub].add(nextIndex)
    buddyChunkMap.value[pub] = nextIndex
    listenOneChunk(pub, nextIndex, publicMoments, true)
  }

  // 2) 完成动画
  infiniteScroll.complete()
}
</script>
  <style scoped>
  ion-avatar {
      --border-radius: 10px;
      width: 55px;
      height:55px
      
    }
  .i-material-symbols-add-circle {
    --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm1 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22'/%3E%3C/svg%3E");
    -webkit-mask: var(--un-icon) no-repeat;
    mask: var(--un-icon) no-repeat;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    background-color: currentColor;
    color: inherit;
    width: 1.2em;
    height: 1.2em;
  }
  .i-material-symbols-cancel {
    --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6zm3.6 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22'/%3E%3C/svg%3E");
    -webkit-mask: var(--un-icon) no-repeat;
    mask: var(--un-icon) no-repeat;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    background-color: currentColor;
    color: inherit;
    width: 1.2em;
    height: 1.2em;
  }
  
  .sent-mode {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: all 0.3s ease-in-out;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(20px);
    overflow-y: auto;
    z-index: 9000;
  }
  .sent-mode1 {
    position: fixed;
    top: 0;
    left: -300%;
    width: 100%;
    height: 100%;
    transition: all 0.3s ease-in-out;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(20px);
    overflow-y: auto;
    z-index: 9999;
  }
  
  .i-mingcute-send-line {
    --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath d='m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z'/%3E%3Cpath fill='currentColor' d='M17.991 6.01L5.399 10.563l4.195 2.428l3.699-3.7a1 1 0 0 1 1.414 1.415l-3.7 3.7l2.43 4.194L17.99 6.01Zm.323-2.244c1.195-.433 2.353.725 1.92 1.92l-5.282 14.605c-.434 1.198-2.07 1.344-2.709.241l-3.217-5.558l-5.558-3.217c-1.103-.639-.957-2.275.241-2.709z'/%3E%3C/g%3E%3C/svg%3E");
    -webkit-mask: var(--un-icon) no-repeat;
    mask: var(--un-icon) no-repeat;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    background-color: currentColor;
    color: inherit;
    width: 2em;
    height: 2em;
  }
  
  .i-material-symbols-arrow-back-ios-new-rounded {
    --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m9.55 12l7.35 7.35q.375.375.363.875t-.388.875t-.875.375t-.875-.375l-7.7-7.675q-.3-.3-.45-.675t-.15-.75t.15-.75t.45-.675l7.7-7.7q.375-.375.888-.363t.887.388t.375.875t-.375.875z'/%3E%3C/svg%3E");
    -webkit-mask: var(--un-icon) no-repeat;
    mask: var(--un-icon) no-repeat;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    background-color: currentColor;
    color: inherit;
    width: 1.6em;
    height: 1.6em;
  }
  .moment-pub-key {
    font-size: 12px;
    color: #888;
    margin-top: 10px;
  }
  .moments-container {
    margin: auto 0;
  
    padding: 20px;
    width: 100%;
    /* margin: 0 auto; */
    background: transparent;
    border-radius: 15px;
  }
  
  .publish-area {
    display: flex;
    width: 90%;
    height: 300px;
    /* justify-content: space-between; */
    margin-bottom: 20px;
  }
  
  .publish-area input {
    width: 80%;
  
    overflow-y: auto;
    padding: 10px;
    border: 1px solid #cccccc68;
    border-radius: 25px;
  }
  
  /* .publish-area button {
    padding: 10px 20px;
    border: none;
    background-color: #04a48e;
    color: white;
    font-size: 19px;
    border-radius: 25px;
    cursor: pointer;
  } */
  
  .publish-area textarea {
    color: var(--text-color, #333);
    background: transparent;
    width: 100%;
    min-width: 230px;
    min-height: 40px;
    max-height: 200px;
    padding: 8px 12px;
    border: 2px solid var(--background-color, #f0f0f0);
    box-shadow: 0 0 5px 0px rgba(139, 139, 139, 0.386);
    border-radius: 10px;
    font-size: 16px;
    outline: none;
    resize: none;
    overflow-y: hidden;
    display: grid;
    place-items: center;
    text-align: left;
    transition: all 0.3s ease-in-out;
  }
  .publish-area textarea:focus {
    border: 3px solid #00ffbf;
    transition: all 0.3s ease-in-out;
  }
  
  .moment-card {
    background: var(--background-color);
    /* background: transparent; */
    margin-bottom: 20px;
    border-radius: 10px;
    /* box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); */
    padding: 15px;
  }
  
  .moment-header {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .moment-header ion-avatar {
    margin-right: 10px;
  }
  
  .moment-header .moment-info {
    display: flex;
    flex-direction: column;
  }
  
  .moment-info strong {
    font-size: 23px;
    color: rgba(0, 135, 106, 0.741);
  }
  
  .moment-info span {
    font-size: 12px;
    color: rgb(125, 125, 125);
  }
  
  .moment-content p {
    font-size: 16px;
    color: var(--text-color);
    line-height: 1.5;
    margin-bottom: 10px;
  }
  
  .moment-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .moment-footer button {
    padding: 5px 10px;
    border-radius: 20px;
    border: 1px solid rgba(90, 90, 90, 0.385);
    background-color: var(--background-color);
    cursor: pointer;
    font-size: 14px;
  }
  
  .moment-footer button:hover {
    background-color: var(--background-color);
  }
  
  .moment-footer span {
    font-size: 13px;
    color: var(--text-color);
  }
  
  .searchbar {
    display: flex;
    justify-content: end;
    align-items: center;
    margin-top: 10px;
    z-index: 9999;
  }
  
  .navbar {
    /* 原有样式 */
    display: flex;
    justify-content: space-between;
    align-items: center;
  
    color: var(--text-color);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 100px;
    padding: 50px 20px 0 20px;
    z-index: 1000;
    overflow: hidden;
    transition: all 0.3s ease-in-out;
  }
  
  /* 当滚动超过 300px 时添加的类 */
  .scrolled {
    backdrop-filter: blur(20px) !important;
    transition: all 0.3s ease-in-out;
  }
  
  .navbar-brand {
    display: flex;
    align-items: center;
  }
  
  .title {
    font-size: 1.5rem;
    font-weight: bold;
  }
  
  .nav-links {
    list-style: none;
    display: flex;
    gap: 15px;
  }
  
  .nav-links a {
    text-decoration: none;
    color: #333333;
    font-size: 1rem;
  }
  </style>
  