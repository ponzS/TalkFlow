import { ref } from 'vue';

// 单例共享的键盘状态与监听器，避免多个组件重复初始化造成冲突
const keyboardHeight = ref(0);
const inputFocused = ref(false);

let initialized = false;
let keyboardModule: any = null;
let showListener: any = null;
let hideListener: any = null;

async function initKeyboard() {
  if (initialized) return;
  initialized = true;
  try {
    const mod: any = await import('@capacitor/keyboard').catch(() => null);
    if (!mod || !mod.Keyboard) return;
    keyboardModule = mod;

    try {
      mod.Keyboard.setResizeMode({ mode: (mod.KeyboardResize && mod.KeyboardResize.None) || 'None' });
    } catch {}

    showListener = mod.Keyboard.addListener('keyboardWillShow', (info: any) => {
      keyboardHeight.value = (info && info.keyboardHeight) ? info.keyboardHeight : 0;
      inputFocused.value = true;
    });

    hideListener = mod.Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0;
      inputFocused.value = false;
    });
  } catch {}
}

async function cleanupKeyboard() {
  try {
    if (showListener && showListener.remove) await showListener.remove();
    if (hideListener && hideListener.remove) await hideListener.remove();
  } catch {}
  showListener = null;
  hideListener = null;
  initialized = false;
}

export function useKeyboardState() {
  return { keyboardHeight, inputFocused, initKeyboard, cleanupKeyboard };
}