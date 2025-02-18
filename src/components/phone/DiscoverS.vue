<template>


    <!-- 顶部导航栏 -->
    <ion-header>
      <ion-toolbar>
        <ion-title>Link</ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- 主内容区 -->
    <ion-content :fullscreen="true">

      <!-- 第一组：朋友圈 -->
      <ion-list>
        <ion-item button @click="goToMoments" style="font-size: 30px;">
          <ion-icon slot="start" :icon="planetOutline" />
          <ion-label>Starry Node</ion-label>
        </ion-item>
        <ion-item button @click="goToMyNode" style="font-size: 30px;">
          <ion-icon slot="start" :icon="pricetagsOutline"/>
          <ion-label>My Node</ion-label>
        </ion-item>

    
      </ion-list>


      

      <!-- 第二组：扫一扫、摇一摇、看一看等 -->
      <!-- <ion-list>
        <ion-item button @click="goToScan">
          <ion-icon slot="start" :icon="qrCodeOutline" />
          <ion-label>扫一扫</ion-label>
        </ion-item>

      

        <ion-item button @click="goToShake">
          <ion-icon slot="start" :icon="pulseOutline" />
          <ion-label>Private AI</ion-label>
        </ion-item>
      </ion-list> -->

      <!-- 可继续分组第三组：购物、游戏之类... -->
      <!-- <ion-list>
        <ion-item button >
          <ion-icon slot="start" :icon="saveOutline" />
          <ion-label>本地节点</ion-label>
        </ion-item>

        <ion-item button >
          <ion-icon slot="start" :icon="infiniteOutline" />
          <ion-label>永存节点</ion-label>
        </ion-item>
      </ion-list> -->

      <!-- <ion-list>
        <ion-item button @click="goToRelays">
       
          <ion-label>Relay</ion-label>
        </ion-item>

      
      </ion-list> -->

      <!-- <StorageTest/> -->


    </ion-content>

</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon
} from '@ionic/vue'

import { useRouter } from 'vue-router'

// 从 Ionicons 中选择适合的图标，也可以直接使用 'name="images-outline"'
import {
  planetOutline,
  qrCodeOutline,
  pulseOutline,
  pricetagsOutline,
  infiniteOutline,
  saveOutline
} from 'ionicons/icons'

const router = useRouter()

function goToMoments() {

  router.push('/starrynode')
}

function goToScan() {
 
  router.push('/ScanPage')
}

function goToShake() {
  
  router.push('/')
}

function goToMyNode() {

  router.push('/mymoment')
}

function goToSomething() {

}

function goToRelays() {
  router.push('/relaytest')
}
</script>

<style scoped>
/* 适度自定义样式，让列表风格更接近微信 */
ion-list {
  margin-top: 30px;
  background-color: var(--ion-item-background, #fff);
  border-radius: 8px;
  overflow: hidden;
}

ion-item + ion-item {
  border-top: 0.55px solid var(--ion-border-color, #ccc);
}


</style>
