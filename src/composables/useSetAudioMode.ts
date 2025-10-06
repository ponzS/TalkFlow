import { ref } from 'vue';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

interface AudioState {
  mode: 'speaker' | 'earpiece';
}

const AUDIO_STATE_FILE = 'audio_state.json';
const DEFAULT_AUDIO_STATE: AudioState = { mode: 'speaker' };

export function useAudioOutput() {
  const audioMode = ref<'speaker' | 'earpiece'>(DEFAULT_AUDIO_STATE.mode);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 读取/保存用户选择（使用 Capacitor FS，Web 也可用）
  async function loadAudioState() {
    try {
      const result = await Filesystem.readFile({
        path: AUDIO_STATE_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      const data = typeof result.data === 'string' ? result.data : String(result.data);
      const state: AudioState = JSON.parse(data);
      audioMode.value = state.mode || DEFAULT_AUDIO_STATE.mode;
    } catch (_) {
      await saveAudioState();
    }
  }

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

  function getRemoteMediaElements(): HTMLMediaElement[] {
    const vids = Array.from(document.querySelectorAll('video[id^="remote-"]')) as HTMLVideoElement[];
    const auds = Array.from(document.querySelectorAll('audio[id^="remote-"]')) as HTMLAudioElement[];
    return ([] as HTMLMediaElement[]).concat(vids).concat(auds);
  }

  async function enumerateAudioOutputs(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audiooutput');
    } catch (e) {
      console.warn('enumerateDevices failed:', e);
      return [];
    }
  }

  function supportsSetSinkId(el: HTMLMediaElement): el is HTMLMediaElement & { setSinkId: (id: string) => Promise<void> } {
    return typeof (el as any).setSinkId === 'function';
  }

  function pickDeviceForMode(mode: 'speaker' | 'earpiece', outputs: MediaDeviceInfo[]): string | null {
    if (!outputs.length) return 'default';
    const byLabel = (label: string) => (d: MediaDeviceInfo) => (d.label || '').toLowerCase().includes(label);
    if (mode === 'speaker') {
      const speakerLike = outputs.find((d) => ['speaker', 'output', 'default', 'built-in'].some((k) => (d.label || '').toLowerCase().includes(k)));
      return speakerLike?.deviceId || 'default';
    } else {
      const earpieceLike = outputs.find((d) => ['receiver', 'earpiece', 'handset', 'headset', 'headphone'].some((k) => (d.label || '').toLowerCase().includes(k)));
      return earpieceLike?.deviceId || 'default';
    }
  }

  async function applySinkToElements(deviceId: string) {
    const elements = getRemoteMediaElements();
    for (const el of elements) {
      if (supportsSetSinkId(el)) {
        try {
          await (el as any).setSinkId(deviceId);
        } catch (err) {
          console.warn('setSinkId failed:', err);
        }
      }
    }
  }

  // 使用 Web 原生 API 进行音频路由
  async function setAudioOutput(mode: 'speaker' | 'earpiece') {
    isLoading.value = true;
    error.value = null;
    try {
      audioMode.value = mode;
      const outputs = await enumerateAudioOutputs();
      const deviceId = pickDeviceForMode(mode, outputs) || 'default';
      await applySinkToElements(deviceId);
      await saveAudioState();
    } catch (err: any) {
      console.error('Error setting audio output:', err);
      error.value = err?.message || String(err);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    audioMode,
    isLoading,
    error,
    loadAudioState,
    setAudioOutput,
  };
}