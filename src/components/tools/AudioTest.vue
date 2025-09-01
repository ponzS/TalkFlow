<template>
  <div class="audio-test">
    <h2>音频测试</h2>

    <!-- 状态显示 -->
    <ion-item>
      <ion-label>录音权限: {{ recordingPermission ? '已授权' : '未授权' }}</ion-label>
    </ion-item>
    <ion-item>
      <ion-label>语音识别: {{ speechAvailable ? '可用' : '不可用' }}</ion-label>
    </ion-item>

    <!-- 录音控制 -->
    <ion-button expand="block" @click="startRecording" :disabled="isRecording || !recordingPermission">
      开始录音
    </ion-button>
    <ion-button expand="block" @click="stopRecording" :disabled="!isRecording">
      停止录音
    </ion-button>

    <!-- 语音识别 -->
    <ion-button expand="block" @click="startSpeechRecognition" :disabled="!speechAvailable">
      开始语音识别
    </ion-button>

    <!-- 历史录音 -->
    <ion-list v-if="recordings.length">
      <h3>历史录音</h3>
      <ion-item v-for="(record, index) in recordings" :key="index">
        <ion-label>{{ formatDuration(record.duration) }}</ion-label>
        <ion-button slot="end" @click="playRecording(record.path)">播放</ion-button>
      </ion-item>
    </ion-list>

    <!-- 语音识别结果 -->
    <div v-if="transcription" class="transcription">
      <h3>识别结果</h3>
      <p>{{ transcription }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { IonButton, IonItem, IonLabel, IonList } from '@ionic/vue';

export default defineComponent({
  name: 'AudioTest',
  components: {
    IonButton,
    IonItem,
    IonLabel,
    IonList,
  },
  setup() {
    const isRecording = ref(false);
    const recordingPermission = ref(false);
    const speechAvailable = ref(false);
    const recordings = ref<{ path: string; duration: number }[]>([]);
    const transcription = ref<string>('');

    // 初始化检查
    const initialize = async () => {
      const perm = await VoiceRecorder.requestAudioRecordingPermission();
      recordingPermission.value = perm.value;

      const speech = await SpeechRecognition.available();
      speechAvailable.value = speech.available;
    };

    // 开始录音
    const startRecording = async () => {
      try {
        if (!recordingPermission.value) {
          const perm = await VoiceRecorder.requestAudioRecordingPermission();
          recordingPermission.value = perm.value;
        }
        if (recordingPermission.value) {
          await VoiceRecorder.startRecording();
          isRecording.value = true;
          console.log('录音开始');
        } else {
          alert('请授予录音权限');
        }
      } catch (error) {
        console.error('录音失败:', error);
        alert('录音启动失败');
      }
    };

    // 停止录音并保存
    const stopRecording = async () => {
      try {
        const result = await VoiceRecorder.stopRecording();
        isRecording.value = false;

        if (result.value && result.value.recordDataBase64) {
          const fileName = `recording_${Date.now()}.aac`;
          const duration = result.value.msDuration || 0;

          // 保存文件
          await Filesystem.writeFile({
            path: fileName,
            data: result.value.recordDataBase64,
            directory: Directory.Documents,
          });

          const filePath = fileName; // 只保存文件名，读取时指定目录
          recordings.value.push({ path: filePath, duration });
          console.log('录音保存成功:', filePath);
        } else {
          throw new Error('录音数据为空');
        }
      } catch (error) {
        console.error('停止录音失败:', error);
        alert('录音保存失败');
      }
    };

    // 播放录音
    const playRecording = async (path: string) => {
      try {
        console.log('尝试播放文件:', path);
        const file = await Filesystem.readFile({
          path,
          directory: Directory.Documents, // 指定目录
        });
        console.log('文件读取成功:', file);

        const base64Data = file.data;
        const mimeType = 'audio/aac'; // iOS 上固定为 audio/aac
        const audioSrc = `data:${mimeType};base64,${base64Data}`;
        console.log('音频源:', audioSrc.substring(0, 50) + '...'); // 调试用，截取前50字符

        const audio = new Audio(audioSrc);
        audio.oncanplaythrough = () => {
          console.log('音频准备播放');
          audio.play();
        };
        audio.onerror = (e) => {
          console.error('音频播放错误:', e);
          throw new Error('音频播放失败');
        };
        audio.load();
      } catch (error:any) {
        console.error('播放失败:', error);
        alert('无法播放录音: ' + (error.message || '未知错误'));
      }
    };

    // 开始语音识别
    const startSpeechRecognition = async () => {
      try {
        await SpeechRecognition.requestPermissions();

        SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          transcription.value = data.matches[0] || '识别中...';
        });

        await SpeechRecognition.start({
          language: 'zh-CN',
          maxResults: 1,
          partialResults: true,
          popup: false,
        });

        setTimeout(async () => {
          await SpeechRecognition.stop();
        }, 5000);
      } catch (error) {
        console.error('语音识别失败:', error);
        alert('语音识别出错，请检查权限或设备支持');
      }
    };

    // 格式化时长
    const formatDuration = (ms: number) => {
      const seconds = Math.floor(ms / 1000);
      return `${seconds}秒`;
    };

    onMounted(async () => {
      await initialize();
    });

    return {
      isRecording,
      recordingPermission,
      speechAvailable,
      recordings,
      transcription,
      startRecording,
      stopRecording,
      playRecording,
      startSpeechRecognition,
      formatDuration,
    };
  },
});
</script>

<style scoped>
.audio-test {
  padding: 16px;
}
.transcription {
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
}
ion-button {
  margin: 10px 0;
}
</style>