<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>扫码结果</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <div class="result-container">
        <h2>扫码内容：</h2>
        <p>{{ data }}</p>
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue'

// 获取路由query中的 data 字段
const route = useRoute()
const data = (route.query.data as string) || '暂无数据'
</script>

<style scoped>
.result-container {
  margin: 2rem;
  text-align: center;
}
</style>
