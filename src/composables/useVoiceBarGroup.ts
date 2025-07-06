import { ref, Ref, onMounted } from 'vue';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Device } from '@capacitor/device';
import { useGroupChat } from '@/composables/useGroupChat';
const chatFlow = getTalkFlowCore();
const {  triggerLightHaptic } = chatFlow;

export function useGroupVoiceBar() {
  // 获取群聊上下文
  const { sendMessage} = useGroupChat();

  // 状态变量
  const isRecording: Ref<boolean> = ref(false); // 是否正在录音
  const recordedAudio: Ref<string | null> = ref(null); // 录制的音频数据
  const recordingDuration: Ref<number> = ref(0); // 录音时长（秒）
  const playingAudio: Ref<string | null> = ref(null); // 正在播放的音频消息 ID
  const playbackProgress: Ref<number> = ref(0); // 播放进度（百分比）
  const transcriptions: Ref<Record<string, string>> = ref({}); // 语音转文字结果
  const recognitionLanguage: Ref<string> = ref('zh-CN'); // 语音识别语言
  const audioDurations: Ref<Record<string, number>> = ref({}); // 音频时长
  let audio: HTMLAudioElement | null = null; // 当前播放的音频对象

  // 初始化录音和语音识别权限
  const initialize = async () => {
    try {
      // 检查录音权限
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

      // 检查语音识别可用性
      const speech = await SpeechRecognition.available();
      if (!speech.available) {
        console.log('设备不支持语音识别');
      }

      // 获取设备语言并标准化
      const deviceInfo = await Device.getLanguageCode();
      const systemLanguage = deviceInfo.value || navigator.language || 'en-US';
      recognitionLanguage.value = normalizeLanguage(systemLanguage);
      console.log('系统语言:', systemLanguage, '标准化后:', recognitionLanguage.value);
    } catch (err) {
      console.error('初始化失败:', err);
    }
  };

  // 标准化语言代码
  function normalizeLanguage(lang: string): string {
    const mapping: Record<string, string> = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'en': 'en-US',
      'en-US': 'en-US',
      'en-GB': 'en-GB',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
    };
    return mapping[lang] || mapping[lang.split('-')[0]] || 'en-US';
  }

  // 开始录音
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
      triggerLightHaptic(); // 震动反馈
      console.log('开始录音');
    } catch (err) {
      console.error('录音启动失败:', err);
      isRecording.value = false;
    }
  }

  // 停止录音
  async function stopRecording(): Promise<{ audioData: string | null; msDuration?: number }> {
    if (!isRecording.value) return { audioData: null, msDuration: 0 };
    try {
      const result = await VoiceRecorder.stopRecording();
      isRecording.value = false;
      if (result.value && result.value.recordDataBase64) {
        const audioData = `data:audio/aac;base64,${result.value.recordDataBase64}`;
        recordedAudio.value = audioData;
       // recordingDuration.value = result.value.msDuration / 1000;
      //  console.log('录音停止，实际时长:', result.value.msDuration, '毫秒');
    //   , msDuration: result.value.msDuration , msDuration: 0  , msDuration: 0
        return { audioData };
      }
      return { audioData: null};
    } catch (err) {
      console.error('停止录音失败:', err);
      return { audioData: null };
    }
  }

  // 发送语音消息
  async function sendVoiceMessage(): Promise<void> {
    const { audioData } = await stopRecording();
    if (!audioData) {
      showToast('录音为空', 'warning');
      return;
    }
    // 使用群聊的 sendMessage 发送语音消息
    await sendMessage(`${audioData}`);
    recordedAudio.value = null;
    recordingDuration.value = 0;
    triggerLightHaptic(); // 震动反馈
    //console.log('发送语音消息，时长:', msDuration, '毫秒');
  }

  // 播放语音
  function playVoice(audioUrl: string | undefined, msgId: string): void {
    if (!audioUrl) {
      console.log('无效的 audioUrl:', audioUrl);
      return;
    }
    if (audio) stopVoice();

    audio = new Audio(audioUrl);
    playingAudio.value = msgId;
    console.log('尝试播放:', { audioUrl, msgId });
    audio.oncanplaythrough = () => {
      audio!.play().catch(err => {
        console.error('播放语音失败:', err.name, err.message);
        showToast('文件无效', 'error');
        playingAudio.value = null;
        audio = null;
      });
    };
    audio.load();
    audio.addEventListener('timeupdate', () => {
      playbackProgress.value = (audio!.currentTime / audio!.duration) * 100;
    });
    audio.addEventListener('ended', () => {
      console.log('音频播放结束，msgId:', msgId);
      playingAudio.value = null;
      playbackProgress.value = 0;
      audio = null;
    });
    audio.addEventListener('loadedmetadata', () => {
      audioDurations.value[msgId] = audio!.duration;
    });
    audio.addEventListener('error', (e) => {
      console.error('音频加载错误:', e);
      playingAudio.value = null;
      audio = null;
    });
  }

  // 停止播放
  function stopVoice(): void {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      playingAudio.value = null;
      playbackProgress.value = 0;
      audio = null;
      console.log('停止播放，释放音频资源');
    }
  }

  // 语音转文字
  async function transcribeAudio(audioUrl: string, msgId: string): Promise<void> {
    try {
      await SpeechRecognition.requestPermissions();
      const speechAvailable = await SpeechRecognition.available();
      if (!speechAvailable.available) {
        showToast('设备不支持语音识别', 'warning');
        return;
      }

      const audioBlob = await fetch(audioUrl).then(res => res.blob());
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      let transcription = '';
      SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        transcription = data.matches[0] || '识别中...';
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
      showToast('转录成功', 'success');
      audioContext.close();
    } catch (err) {
      console.error('语音转文字失败:', err);
      showToast('转录失败', 'error');
      transcriptions.value[msgId] = '转录错误';
    }
  }

  // 格式化时长
  function formatDuration(seconds: number): string {
    const sec = Math.floor(seconds);
    const ms = Math.round((seconds - sec) * 1000);
    return `${sec}.${Math.floor(ms / 100)}s`;
  }

  // 组件挂载时初始化
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
    audioDurations,
    startRecording,
    stopRecording,
    sendVoiceMessage,
    playVoice,
    stopVoice,
    transcribeAudio,
    formatDuration,
  };
}