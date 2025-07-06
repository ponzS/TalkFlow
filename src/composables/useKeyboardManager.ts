// 全局键盘监听器管理器 - 防止事件监听器冲突
import { ref, onBeforeUnmount } from 'vue'

interface KeyboardListener {
  id: string
  component: string
  event: 'keydown' | 'keyup' | 'keyboard-adjusted'
  handler: (event: any) => void
  priority: number // 优先级，数字越大优先级越高
  isActive: boolean
}

class KeyboardListenerManager {
  private listeners: Map<string, KeyboardListener> = new Map()
  private activeListeners: Map<string, (event: any) => void> = new Map()
  private debugMode = true
  
  // 注册键盘监听器
  register(
    id: string,
    component: string,
    event: 'keydown' | 'keyup' | 'keyboard-adjusted',
    handler: (event: any) => void,
    priority: number = 1
  ): () => void {
    this.log(`🔧 Registering keyboard listener: ${component}#${id} (${event})`);
    
    // 检查是否已存在同名监听器
    if (this.listeners.has(id)) {
      this.log(`⚠️ Replacing existing listener: ${id}`);
      this.unregister(id);
    }
    
    const listener: KeyboardListener = {
      id,
      component,
      event,
      handler,
      priority,
      isActive: false
    };
    
    this.listeners.set(id, listener);
    this.updateActiveListeners();
    
    // 返回清理函数
    return () => this.unregister(id);
  }
  
  // 注销键盘监听器
  unregister(id: string): void {
    const listener = this.listeners.get(id);
    if (listener) {
      this.log(`🧹 Unregistering keyboard listener: ${listener.component}#${id}`);
      this.listeners.delete(id);
      this.updateActiveListeners();
    } else {
      this.log(`⚠️ Attempted to unregister non-existent listener: ${id}`);
    }
  }
  
  // 更新活跃监听器
  private updateActiveListeners(): void {
    // 清理现有监听器
    this.activeListeners.forEach((handler, event) => {
      document.removeEventListener(event as any, handler);
      window.removeEventListener(event as any, handler);
    });
    this.activeListeners.clear();
    
    // 按事件类型分组
    const listenersByEvent = new Map<string, KeyboardListener[]>();
    
    this.listeners.forEach(listener => {
      if (!listenersByEvent.has(listener.event)) {
        listenersByEvent.set(listener.event, []);
      }
      listenersByEvent.get(listener.event)!.push(listener);
    });
    
    // 为每个事件类型创建统一处理器
    listenersByEvent.forEach((listeners, event) => {
      // 按优先级排序（高优先级在前）
      listeners.sort((a, b) => b.priority - a.priority);
      
      const unifiedHandler = (e: any) => {
        this.log(`⌨️ Keyboard event ${event} triggered, ${listeners.length} listeners`);
        
        // 按优先级依次调用处理器
        for (const listener of listeners) {
          try {
            listener.handler(e);
            
            // 如果事件被阻止，停止传播
            if (e.defaultPrevented || e.stopPropagation) {
              this.log(`🛑 Event stopped by ${listener.component}#${listener.id}`);
              break;
            }
          } catch (error) {
            console.error(`❌ Error in keyboard listener ${listener.component}#${listener.id}:`, error);
          }
        }
      };
      
      // 根据事件类型选择适当的目标
      if (event === 'keyboard-adjusted') {
        document.addEventListener(event, unifiedHandler);
      } else {
        window.addEventListener(event, unifiedHandler);
      }
      
      this.activeListeners.set(event, unifiedHandler);
      this.log(`✅ Unified ${event} handler registered for ${listeners.length} listeners`);
    });
    
    this.log(`📊 Active keyboard events: ${this.activeListeners.size}`);
  }
  
  // 获取所有注册的监听器信息
  getListenerInfo(): Array<{ id: string; component: string; event: string; priority: number }> {
    return Array.from(this.listeners.values()).map(listener => ({
      id: listener.id,
      component: listener.component,
      event: listener.event,
      priority: listener.priority
    }));
  }
  
  // 清理所有监听器
  cleanup(): void {
    this.log('🧹 Cleaning up all keyboard listeners...');
    
    this.activeListeners.forEach((handler, event) => {
      document.removeEventListener(event as any, handler);
      window.removeEventListener(event as any, handler);
    });
    
    this.listeners.clear();
    this.activeListeners.clear();
    
    this.log('✅ All keyboard listeners cleaned up');
  }
  
  // 调试日志
  private log(message: string): void {
    if (this.debugMode) {
      console.log(`🎹 KeyboardManager: ${message}`);
    }
  }
  
  // 设置调试模式
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

// 全局管理器实例
const keyboardManager = new KeyboardListenerManager();

// Vue组合式函数
export function useKeyboardManager() {
  // 注册键盘监听器
  const registerKeyboardListener = (
    id: string,
    component: string,
    event: 'keydown' | 'keyup' | 'keyboard-adjusted',
    handler: (event: any) => void,
    priority: number = 1
  ): (() => void) => {
    return keyboardManager.register(id, component, event, handler, priority);
  };
  
  // 注销键盘监听器
  const unregisterKeyboardListener = (id: string): void => {
    keyboardManager.unregister(id);
  };
  
  // 获取监听器信息
  const getKeyboardListenerInfo = () => {
    return keyboardManager.getListenerInfo();
  };
  
  // 组件卸载时自动清理
  const registeredIds = ref<string[]>([]);
  
  const autoRegister = (
    id: string,
    component: string,
    event: 'keydown' | 'keyup' | 'keyboard-adjusted',
    handler: (event: any) => void,
    priority: number = 1
  ): void => {
    const cleanup = registerKeyboardListener(id, component, event, handler, priority);
    registeredIds.value.push(id);
    
    // 组件卸载时自动清理
    onBeforeUnmount(() => {
      cleanup();
      registeredIds.value = registeredIds.value.filter(regId => regId !== id);
    });
  };
  
  // 手动清理所有注册的监听器
  const cleanupAll = (): void => {
    registeredIds.value.forEach(id => {
      unregisterKeyboardListener(id);
    });
    registeredIds.value = [];
  };
  
  return {
    registerKeyboardListener,
    unregisterKeyboardListener,
    autoRegister,
    getKeyboardListenerInfo,
    cleanupAll
  };
}

// 全局清理函数
export const cleanupGlobalKeyboardListeners = (): void => {
  keyboardManager.cleanup();
};

// 全局调试函数
export const setKeyboardManagerDebug = (enabled: boolean): void => {
  keyboardManager.setDebugMode(enabled);
}; 