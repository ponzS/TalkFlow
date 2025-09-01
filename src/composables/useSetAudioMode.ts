import { ref } from 'vue';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

declare var cordova: any; // For cordova-plugin-audiotoggle

interface AudioState {
  mode: 'speaker' | 'earpiece';
}

const AUDIO_STATE_FILE = 'audio_state.json';
const DEFAULT_AUDIO_STATE: AudioState = { mode: 'speaker' };

export function useAudioOutput() {
  const audioMode = ref<'speaker' | 'earpiece'>('speaker');
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 辅助函数：将 Blob 转换为字符串
  async function blobToString(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read Blob'));
      reader.readAsText(blob);
    });
  }

  // 加载持久化的音频状态
  async function loadAudioState() {
    try {
      const result = await Filesystem.readFile({
        path: AUDIO_STATE_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      let data: string;
      if (typeof result.data === 'string') {
        data = result.data;
      } else {
        data = await blobToString(result.data);
      }

      const state: AudioState = JSON.parse(data);
      audioMode.value = state.mode;
    } catch (err) {
      console.warn('No saved audio state found, creating default:', err);
      await saveAudioState();
    }
  }

  // 保存音频状态到 JSON 文件
  async function saveAudioState() {
    try {
      await Filesystem.writeFile({
        path: AUDIO_STATE_FILE,
        data: JSON.stringify({ mode: audioMode.value }),
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
    } catch (err) {
      console.error('Failed to save audio state:', err);
      error.value = 'Failed to save audio state';
    }
  }

  // 设置音频输出模式
  async function setAudioOutput(mode: 'speaker' | 'earpiece') {
    isLoading.value = true;
    error.value = null;

    try {
      // 检查插件是否可用
      if (!cordova || !cordova.plugins || !cordova.plugins.audiotoggle) {
        throw new Error('AudioToggle plugin is not available. Please ensure the plugin is installed and synced.');
      }

      console.log('Attempting to set audio mode to:', mode);
      await new Promise<void>((resolve, reject) => {
        cordova.plugins.audiotoggle.setAudioMode(
          mode,
          () => {
            console.log('Audio mode set successfully to:', mode);
            resolve();
          },
          (err: any) => {
            console.error('Plugin error:', err);
            reject(new Error(`Failed to set audio mode to ${mode}: ${err}`));
          }
        );
      });

      audioMode.value = mode;
      await saveAudioState();
      console.log(`Audio set to ${mode}`);
    } catch (err: any) {
      console.error('Error setting audio output:', err);
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  // 初始化时加载状态
  // loadAudioState();

  return {
    audioMode,
    isLoading,
    error,
    setAudioOutput,
  };
}