// composables/useAIAutoReply.ts
import { ref, computed, reactive } from 'vue';
import { useToast } from '@/composables/useToast';
import StorageService from '../services/storageService';

const { showToast } = useToast();

// Singleton instance
let instance: ReturnType<typeof createAIAutoReply> | null = null;

interface AIAutoReplySettings {
  model: string;
  mode: 'chat' | 'generate';
  stream: boolean;
  replyDelay: number; // Delay in milliseconds before sending reply
}

interface AIAutoReplyState {
  isEnabled: boolean;
  enabledBuddies: string[]; // List of buddy pub keys for which auto-reply is enabled
  settings: AIAutoReplySettings;
}

function createAIAutoReply(storageServ: StorageService) {
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

  // Load state from storage
  const loadState = async () => {
    try {
      const result = await storageServ.query('SELECT value FROM ai_settings WHERE key = ?', ['ai_auto_reply']);
      if (result.values?.length) {
        const savedState = JSON.parse(result.values[0].value as string);
        state.isEnabled = savedState.isEnabled ?? false;
        state.enabledBuddies = savedState.enabledBuddies ?? [];
        Object.assign(state.settings, savedState.settings ?? {});
      }
    } catch (err) {
      console.error('Failed to load AI auto-reply state:', err);
    }
  };

  // Save state to storage
  const saveState = async () => {
    try {
      await storageServ.run(
        'INSERT OR REPLACE INTO ai_settings (key, value) VALUES (?, ?)',
        ['ai_auto_reply', JSON.stringify(state)]
      );
    } catch (err) {
      console.error('Failed to save AI auto-reply state:', err);
    }
  };

  // Toggle global auto-reply
  const toggleAutoReply = async (enable: boolean) => {
    state.isEnabled = enable;
    await saveState();
    showToast(`AI auto-reply ${enable ? 'enabled' : 'disabled'}`, 'success');
  };

  // Toggle auto-reply for a specific buddy
  const toggleBuddyAutoReply = async (buddyPub: string, enable: boolean) => {
    if (enable && !state.enabledBuddies.includes(buddyPub)) {
      state.enabledBuddies.push(buddyPub);
    } else if (!enable) {
      state.enabledBuddies = state.enabledBuddies.filter(pub => pub !== buddyPub);
    }
    await saveState();
    showToast(`AI auto-reply for buddy ${buddyPub.slice(0, 8)}... ${enable ? 'enabled' : 'disabled'}`, 'success');
  };

  // Update settings
  const updateSettings = async (settings: Partial<AIAutoReplySettings>) => {
    Object.assign(state.settings, settings);
    await saveState();
    showToast('AI auto-reply settings updated', 'success');
  };

  // Check if auto-reply is enabled for a buddy
  const isAutoReplyEnabledForBuddy = (buddyPub: string) => {
    return state.isEnabled && state.enabledBuddies.includes(buddyPub);
  };

  // Initialize
  loadState();

  return {
    state,
    toggleAutoReply,
    toggleBuddyAutoReply,
    updateSettings,
    isAutoReplyEnabledForBuddy,
  };
}

export function useAIAutoReply(storageServ?: StorageService) {
  if (!instance && storageServ) {
    instance = createAIAutoReply(storageServ);
  }
  if (!instance) {
    throw new Error('useAIAutoReply must be initialized with a storage service');
  }
  return instance;
}