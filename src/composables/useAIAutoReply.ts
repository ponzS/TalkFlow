import { ref, computed, reactive } from 'vue';
import { useToast } from '@/composables/useToast';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const { showToast } = useToast();

// JSON配置文件名
const AI_AUTO_REPLY_CONFIG_FILE = 'ai_auto_reply_config.json';

// Singleton instance
let instance: ReturnType<typeof createAIAutoReply> | null = null;

export interface AIAutoReplySettings {
  model: string;
  mode: 'chat' | 'generate';
  stream: boolean;
  replyDelay: number; // Delay in milliseconds before sending reply
}

export interface AIAutoReplyState {
  isEnabled: boolean;
  enabledBuddies: string[]; // List of buddy pub keys for which auto-reply is enabled
  settings: AIAutoReplySettings;
}

function createAIAutoReply() {
  // State
  const state = reactive<AIAutoReplyState>({
    isEnabled: false,
    enabledBuddies: [],
    settings: {
      model: '',
      mode: 'chat',
      stream: false,
      replyDelay: 1000,
    },
  });

  // 辅助函数：将 Blob 转换为字符串
  async function blobToString(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read Blob'));
      reader.readAsText(blob);
    });
  }

  // Load state from JSON file
  const loadState = async () => {
    try {
      const result = await Filesystem.readFile({
        path: AI_AUTO_REPLY_CONFIG_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      let data: string;
      if (typeof result.data === 'string') {
        data = result.data;
      } else {
        data = await blobToString(result.data);
      }

      const savedState = JSON.parse(data);
      state.isEnabled = savedState.isEnabled ?? false;
      state.enabledBuddies = savedState.enabledBuddies ?? [];
      Object.assign(state.settings, savedState.settings ?? {});
      
      console.log('AI auto-reply config loaded successfully');
    } catch (err) {
      console.warn('No saved AI auto-reply config found, using defaults:', err);
      // File doesn't exist or error reading, use default state
      await saveState(); // Create default config file
    }
  };

  // Save state to JSON file
  const saveState = async () => {
    try {
      await Filesystem.writeFile({
        path: AI_AUTO_REPLY_CONFIG_FILE,
        data: JSON.stringify(state, null, 2),
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
    //  console.log('AI auto-reply config saved successfully');
    } catch (err) {
     // console.error('Failed to save AI auto-reply config:', err);
     // showToast('Failed to save AI auto-reply settings', 'error');
    }
  };

  // Toggle global auto-reply
  const toggleAutoReply = async (enable: boolean) => {
    state.isEnabled = enable;
    await saveState();
  //  showToast(`AI auto-reply ${enable ? 'enabled' : 'disabled'}`, 'success');
  };

  // Toggle auto-reply for a specific buddy
  const toggleBuddyAutoReply = async (buddyPub: string, enable: boolean) => {
    if (enable && !state.enabledBuddies.includes(buddyPub)) {
      state.enabledBuddies.push(buddyPub);
    } else if (!enable) {
      state.enabledBuddies = state.enabledBuddies.filter(pub => pub !== buddyPub);
    }
    await saveState();
   // showToast(`AI auto-reply for buddy ${buddyPub.slice(0, 8)}... ${enable ? 'enabled' : 'disabled'}`, 'success');
  };

  // Update settings
  const updateSettings = async (settings: Partial<AIAutoReplySettings>) => {
    Object.assign(state.settings, settings);
    await saveState();
   // showToast('AI auto-reply settings updated', 'success');
  };

  // Check if auto-reply is enabled for a buddy
  const isAutoReplyEnabledForBuddy = (buddyPub: string) => {
    return state.isEnabled && state.enabledBuddies.includes(buddyPub);
  };

  // Get config file path (for debugging purposes)
  const getConfigFilePath = () => {
    return `${Directory.Data}/${AI_AUTO_REPLY_CONFIG_FILE}`;
  };

  // Clear all settings (reset to defaults)
  const clearSettings = async () => {
    state.isEnabled = false;
    state.enabledBuddies = [];
    state.settings = {
      model: '',
      mode: 'chat',
      stream: false,
      replyDelay: 1000,
    };
    await saveState();
  //  showToast('AI auto-reply settings reset to defaults', 'success');
  };

  // Initialize
  loadState();

  return {
    state,
    toggleAutoReply,
    toggleBuddyAutoReply,
    updateSettings,
    isAutoReplyEnabledForBuddy,
    getConfigFilePath,
    clearSettings,
  };
}

export function useAIAutoReply() {
  if (!instance) {
    instance = createAIAutoReply();
  }
  return instance;
}