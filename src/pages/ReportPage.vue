<template>
    <ion-page>
      <ion-header :translucent="true"  collapse="fade">
        <ion-toolbar>
          <ion-buttons slot="start">
           <ion-back-button :text="$t('back')" ></ion-back-button>
          </ion-buttons>
          <ion-title>Report Violation</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content :fullscreen="true">
        <ion-list>
          <ion-item>
            <ion-label position="stacked">Reported User Public Key</ion-label>
            <ion-input v-model="reportedPub" placeholder="Enter user's public key"></ion-input>
          </ion-item>
        </ion-list>
        <ion-button expand="block" @click="submitReport">
          Submit Report
        </ion-button>
        <p style="text-align: center; margin-top: 10px; font-size: 14px;">
          Please provide the reported user's public key. After submission, your default email app will open. Attach the evidence (screenshot or video) in the email and send it to complete the report. Upon successful review, the user will be added to our official blacklist and their data will be blocked by default in the app.
        </p>
      </ion-content>
  
      <!-- 提示弹窗 -->
      <ion-alert
        :is-open="isSuccessAlertOpen"
        header="Success"
        message="Your default email app has been opened. Please attach the evidence file and send the email to complete the report. The reported user will be added to our blacklist and blocked if the review confirms the violation."
        :buttons="[{ text: 'OK', handler: () => { isSuccessAlertOpen = false; router.push('/index'); } }]"
        @didDismiss="isSuccessAlertOpen = false"
      ></ion-alert>
  
      <!-- 错误提示弹窗 -->
      <ion-alert
        :is-open="isErrorAlertOpen"
        header="Error"
        message="Failed to open email app. Please send an email to your-team-email@example.com with the reported user's public key and evidence manually."
        :buttons="[{ text: 'OK', handler: () => { isErrorAlertOpen = false; } }]"
        @didDismiss="isErrorAlertOpen = false"
      ></ion-alert>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonAlert,
  } from '@ionic/vue';

  const router = useRouter();
  const { showToast, currentUserPub, storageServ } = getTalkFlowCore();
  
  const reportedPub = ref('');
  const isSuccessAlertOpen = ref(false);
  const isErrorAlertOpen = ref(false);
  
  const submitReport = async () => {
    if (!reportedPub.value || !currentUserPub.value) {
      showToast('Please enter the reported user\'s public key.', 'warning');
      return;
    }
  
    try {
      // 可选：记录到本地数据库
    //   await storageServ.insertReport({
    //     msgId: '', // 可留空或生成唯一 ID
    //     fromPub: currentUserPub.value,
    //     reportedPub: reportedPub.value,
    //     evidence: '', // 不再存储证据
    //     timestamp: Date.now(),
    //   });
  
      // 构造 mailto URL
      const emailBody = `
  I am reporting a user for violating the app's policies.
  Reported User Public Key: ${reportedPub.value}
  Reporter Public Key: ${currentUserPub.value}
  Please review the attached evidence (screenshot or video) that I will include in this email.
      `.trim();
  
      const mailtoUrl = `mailto:zhangguoai888@gamil.com?subject=${encodeURIComponent('User Violation Report')}&body=${encodeURIComponent(emailBody)}`;
  
      // 跳转到邮箱应用
      window.location.href = mailtoUrl;
  
      // 显示成功提示
      isSuccessAlertOpen.value = true;
      reportedPub.value = ''; // 清空输入框
    } catch (err) {
      // 如果跳转失败，显示错误提示
      isErrorAlertOpen.value = true;
      showToast('Failed to open email app.', 'error');
      // console.error(err);
    }
  };
  </script>
  
  <style scoped>
  ion-content {
    --padding: 20px;
  }
  </style>