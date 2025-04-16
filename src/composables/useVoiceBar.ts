import { ref, Ref, onMounted } from 'vue';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Device } from '@capacitor/device';

export function useVoiceBar() {
  const chatFlow = getTalkFlowCore();
  const { sendChat, showToast, triggerLightHaptic } = chatFlow;

  const isRecording: Ref<boolean> = ref(false);
  const recordedAudio: Ref<string | null> = ref(null);
  const recordingDuration: Ref<number> = ref(0);
  const playingAudio: Ref<string | null> = ref(null);
  const playbackProgress: Ref<number> = ref(0);
  const transcriptions: Ref<Record<string, string>> = ref({});
  const recognitionLanguage: Ref<string> = ref('zh-CN');
  const audioDurations: Ref<Record<string, number>> = ref({});
  let audio: HTMLAudioElement | null = null;

  const initialize = async () => {
    try {
      const perm = await VoiceRecorder.hasAudioRecordingPermission();
      if (!perm.value) {
        const request = await VoiceRecorder.requestAudioRecordingPermission();
        if (!request.value) {
          console.log('用户拒绝录音权限');
          return;
        }
        console.log('录音权限已授予');
      } else {
        console.log('已具备录音权限，无需重复请求');
      }

      const speech = await SpeechRecognition.available();
      if (!speech.available) {
        console.log('设备不支持语音识别');
      }

      const deviceInfo = await Device.getLanguageCode();
      const systemLanguage = deviceInfo.value || navigator.language || 'en-US';
      recognitionLanguage.value = normalizeLanguage(systemLanguage);
      console.log('系统语言:', systemLanguage, '标准化后:', recognitionLanguage.value);
    } catch (err) {
      console.error('初始化失败:', err);
    }
  };

  function normalizeLanguage(lang: string): string {
    const mapping: Record<string, string> = {
      'zh': 'zh-CN', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'en': 'en-US',
      'en-US': 'en-US', 'en-GB': 'en-GB', 'es': 'es-ES', 'fr': 'fr-FR',
      'de': 'de-DE', 'ja': 'ja-JP', 'ko': 'ko-KR',
    };
    return mapping[lang] || mapping[lang.split('-')[0]] || 'en-US';
  }

  async function startRecording(): Promise<void> {
    if (isRecording.value) return;
    try {
      const perm = await VoiceRecorder.hasAudioRecordingPermission();
      if (!perm.value) {
        const request = await VoiceRecorder.requestAudioRecordingPermission();
        if (!request.value) {
          console.log('录音权限被拒绝');
          return;
        }
      }
      await VoiceRecorder.startRecording();
      isRecording.value = true;
      recordingDuration.value = 0;
      triggerLightHaptic();
      console.log('开始录音');
    } catch (err) {
      console.error('录音启动失败:', err);
      isRecording.value = false;
    }
  }

  async function stopRecording(): Promise<{ audioData: string | null; msDuration: number }> {
    if (!isRecording.value) return { audioData: null, msDuration: 0 };
    try {
      const result = await VoiceRecorder.stopRecording();
      isRecording.value = false;
      if (result.value && result.value.recordDataBase64) {
        const audioData = `data:audio/aac;base64,${result.value.recordDataBase64}`;
        recordedAudio.value = audioData;
        recordingDuration.value = result.value.msDuration / 1000;
        console.log('录音停止，实际时长:', result.value.msDuration, '毫秒');
        return { audioData, msDuration: result.value.msDuration };
      }
      return { audioData: null, msDuration: 0 };
    } catch (err) {
      console.error('停止录音失败:', err);
      return { audioData: null, msDuration: 0 };
    }
  }

  async function sendVoiceMessage(): Promise<void> {
    const { audioData, msDuration } = await stopRecording();
    if (!audioData) {
      showToast('Null', 'warning');
      return;
    }
    await sendChat('voice', audioData, msDuration);
    recordedAudio.value = null;
    recordingDuration.value = 0;
    triggerLightHaptic();
    //console.log('发送语音消息，时长:', msDuration, '毫秒');
  }

  function playVoice(audioUrl: string | undefined, msgId: string): void {
    if (!audioUrl) {
      //console.log('无效的 audioUrl:', audioUrl);
      return;
    }
    if (audio) stopVoice();

    audio = new Audio(audioUrl);
    playingAudio.value = msgId;
    //console.log('尝试播放:', { audioUrl, msgId });
    audio.oncanplaythrough = () => {
      audio!.play().catch(err => {
       // console.error('播放语音失败:', err.name, err.message);
        showToast('The file is invalid', 'error');
        playingAudio.value = null;
        audio = null;
      });
    };
    audio.load();
    audio.addEventListener('timeupdate', () => {
      playbackProgress.value = (audio!.currentTime / audio!.duration) * 100;
    });
    audio.addEventListener('ended', () => {
     // console.log('Audio ended for msgId:', msgId);
      playingAudio.value = null;
      playbackProgress.value = 0;
      audio = null;
    });
    audio.addEventListener('loadedmetadata', () => {
      audioDurations.value[msgId] = audio!.duration;
    });
    audio.addEventListener('error', (e) => {
      // console.error('音频加载错误:', e);
      playingAudio.value = null;
      audio = null;
    });
  }

  function stopVoice(): void {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      playingAudio.value = null;
      playbackProgress.value = 0;
      audio = null;
      // console.log('停止播放，释放音频资源');
    }
  }

  async function transcribeAudio(audioUrl: string, msgId: string): Promise<void> {
    try {
      await SpeechRecognition.requestPermissions();
      const speechAvailable = await SpeechRecognition.available();
      if (!speechAvailable.available) {
        showToast('error', 'warning');
        return;
      }

      const audioBlob = await fetch(audioUrl).then(res => res.blob());
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      let transcription = '';
      SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        transcription = data.matches[0] || 'Identifying...';
      });

      await SpeechRecognition.start({
        language: recognitionLanguage.value,
        maxResults: 1,
        partialResults: true,
        popup: false,
      });

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);

      await new Promise(resolve => setTimeout(resolve, audioBuffer.duration * 1000 + 500));
      await SpeechRecognition.stop();

      transcriptions.value[msgId] = transcription || '无法识别';
      console.log('语音转文字:', transcription);
      showToast('success', 'success');
      audioContext.close();
    } catch (err) {
      console.error('语音转文字失败:', err);
      showToast('error', 'error');
      transcriptions.value[msgId] = 'error';
    }
  }

  function formatDuration(seconds: number): string {
    const sec = Math.floor(seconds);
    const ms = Math.round((seconds - sec) * 1000);
    return `${sec}.${Math.floor(ms / 100)}s`;
  }

  onMounted(() => {
    initialize();
  });

  return {
    isRecording,
    recordedAudio,
    recordingDuration,
    playingAudio,
    playbackProgress,
    transcriptions,
    recognitionLanguage,
    startRecording,
    stopRecording,
    sendVoiceMessage,
    playVoice,
    stopVoice,
    transcribeAudio,
    formatDuration,
  };
}