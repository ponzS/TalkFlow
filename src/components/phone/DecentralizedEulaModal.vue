<template>
    <ion-modal :is-open="isEulaOpen" @didDismiss="handleDismiss">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('eula.title') }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-text>
          <h2>TalkFlow {{ $t('eula.title') }}</h2>
          <p><strong>{{ $t('eula.lastUpdated') }}</strong></p>
          <p v-for="(section, key) in sections" :key="key">
            <strong>{{ section.title }}</strong><br>
            <span v-html="section.content"></span>
          </p>
        </ion-text>
      </ion-content>
      <ion-footer>
        <ion-toolbar>
          <ion-button slot="start" fill="clear" @click="handleDismiss">
            {{ $t('eula.buttons.decline') }}
          </ion-button>
          <ion-button slot="end" color="primary" @click="agreeToEula">
            {{ $t('eula.buttons.agree') }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonFooter, IonButton } from '@ionic/vue';
  import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
  import { App } from '@capacitor/app';
  // 定义 EULA 章节的类型
  interface EulaSection {
    title: string;
    content: string;
  }
  
  // 定义整个 sections 对象的类型
  interface EulaSections {
    [key: string]: EulaSection;
  }
  
  defineProps<{
    isOpen: boolean;
  }>();
  const emit = defineEmits(['update:isOpen']);
  
  const isEulaOpen = ref(false);
  const { t } = useI18n();
  
  // 获取 sections 数据并添加类型断言
  const sections = t('eula.sections') as unknown as EulaSections;
  
  // 文件路径和名称
  const EULA_FILE = 'decentralized_eula_status.json';
  const EULA_DIR = Directory.Data;
  
  // 检查用户是否已同意 EULA
  const checkEulaStatus = async () => {
    try {
      const result = await Filesystem.readFile({
        path: EULA_FILE,
        directory: EULA_DIR,
        encoding: Encoding.UTF8,
      });
      const data = JSON.parse(result.data as string);
      if (data.agreed) {
        isEulaOpen.value = false;
      } else {
        isEulaOpen.value = true;
      }
    } catch (error) {
      // 文件不存在，显示 EULA
      isEulaOpen.value = true;
    }
  };
  
  // 保存用户同意状态到 JSON 文件
  const saveEulaStatus = async (agreed: boolean) => {
    const data = { agreed };
    await Filesystem.writeFile({
      path: EULA_FILE,
      data: JSON.stringify(data),
      directory: EULA_DIR,
      encoding: Encoding.UTF8,
    });
  };
  
  // 用户同意 EULA
  const agreeToEula = async () => {
    await saveEulaStatus(true);
    isEulaOpen.value = false;
    emit('update:isOpen', false);
  };
  
  // 用户拒绝或关闭模态框
  const handleDismiss = () => {
    // isEulaOpen.value = false;
    // emit('update:isOpen', false);
    
     App.exitApp();
  };
  
  // 在组件挂载时检查 EULA 状态
  onMounted(() => {
    checkEulaStatus();
  });
  </script>
  
  <style scoped>
  ion-modal {
    --height: 80%;
    --max-width: 90%;
  }
  
  ion-content {
    --padding-bottom: 20px;
  }
  
  ion-text p {
    margin-bottom: 15px;
  }
  </style>