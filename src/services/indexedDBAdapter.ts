// IndexedDB适配器 - 用于替代localStorage存储AI聊天数据
export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
  model?: string;
  messageCount: number;
  metadata?: string;
}

export interface ChatMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: string;
}

export interface CurrentChatState {
  currentConversationId: string;
  selectedModel: string;
  timestamp: string;
  metadata?: string;
}

export class IndexedDBAdapter {
  private dbName = 'TalkFlowAIChatDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // 初始化IndexedDB
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔧 Initializing IndexedDB adapter...');
      
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        // Failed to open IndexedDB
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        // IndexedDB adapter initialized successfully
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔄 Upgrading IndexedDB schema...');

        // 创建对话表
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' });
          conversationStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          console.log('📋 Created conversations object store');
        }

        // 创建消息表
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
          messageStore.createIndex('conversationId', 'conversationId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('💬 Created messages object store');
        }

        // 创建当前状态表
        if (!db.objectStoreNames.contains('currentState')) {
          const stateStore = db.createObjectStore('currentState', { keyPath: 'id' });
          console.log('🎯 Created currentState object store');
        }

        // IndexedDB schema upgrade completed
      };
    });
  }

  // 保存对话
  async saveConversation(conversation: Conversation): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.put(conversation);

      request.onsuccess = () => {
        // Conversation saved to IndexedDB
        resolve();
      };

      request.onerror = () => {
        // Failed to save conversation to IndexedDB
        reject(request.error);
      };
    });
  }

  // 获取所有对话
  async getConversations(): Promise<Conversation[]> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev'); // 按更新时间倒序

      const conversations: Conversation[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          conversations.push(cursor.value);
          cursor.continue();
        } else {
          // Loaded conversations from IndexedDB
          resolve(conversations);
        }
      };

      request.onerror = () => {
        // Failed to get conversations from IndexedDB
        reject(request.error);
      };
    });
  }

  // 删除对话
  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations', 'messages'], 'readwrite');
      
      // 删除对话记录
      const conversationStore = transaction.objectStore('conversations');
      const deleteConvRequest = conversationStore.delete(conversationId);

      // 删除相关消息
      const messageStore = transaction.objectStore('messages');
      const messageIndex = messageStore.index('conversationId');
      const messageRequest = messageIndex.openCursor(IDBKeyRange.only(conversationId));

      messageRequest.onsuccess = () => {
        const cursor = messageRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log('🗑️ Conversation and messages deleted from IndexedDB:', conversationId);
        resolve();
      };

      transaction.onerror = () => {
        // Failed to delete conversation from IndexedDB
        reject(transaction.error);
      };
    });
  }

  // 保存消息
  async saveMessage(message: ChatMessage): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      
      // 创建要保存的消息对象
      const messageToSave = { ...message };
      // 如果消息有ID且不是自动生成的，使用现有ID；否则让IndexedDB自动生成
      if (!messageToSave.id) {
        delete messageToSave.id;
      }
      
      const request = store.put(messageToSave);

      request.onsuccess = () => {
        // Message saved to IndexedDB
        resolve();
      };

      request.onerror = () => {
        // Failed to save message to IndexedDB
        reject(request.error);
      };
    });
  }

  // 获取对话的所有消息
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);

      request.onsuccess = () => {
        const messages = request.result as ChatMessage[];
        // 按时间戳排序
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        // Loaded messages from IndexedDB
        resolve(messages);
      };

      request.onerror = () => {
        // Failed to get messages from IndexedDB
        reject(request.error);
      };
    });
  }

  // 更新助手消息
  async updateAssistantMessage(conversationId: string, timestamp: string, content: string, isStreaming: boolean): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const index = store.index('conversationId');
      const request = index.openCursor(IDBKeyRange.only(conversationId));

      let found = false;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const message = cursor.value;
          // 查找匹配的助手消息
          if (message.role === 'assistant' && message.timestamp === timestamp && message.conversationId === conversationId) {
            // 更新消息内容
            message.content = content;
            message.isStreaming = isStreaming;
            
            const updateRequest = cursor.update(message);
            updateRequest.onsuccess = () => {
              console.log('🔄 Assistant message updated in IndexedDB:', conversationId);
              found = true;
              resolve();
            };
            updateRequest.onerror = () => {
              reject(updateRequest.error);
            };
            return;
          }
          cursor.continue();
        } else if (!found) {
          reject(new Error('No assistant message found with matching timestamp'));
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 保存当前聊天状态
  async saveCurrentState(state: CurrentChatState): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['currentState'], 'readwrite');
      const store = transaction.objectStore('currentState');
      
      // 使用固定ID来保存当前状态
      const stateWithId = { ...state, id: 'current' };
      const request = store.put(stateWithId);

      request.onsuccess = () => {
        // Current state saved to IndexedDB
        resolve();
      };

      request.onerror = () => {
        // Failed to save current state to IndexedDB
        reject(request.error);
      };
    });
  }

  // 获取当前聊天状态
  async getCurrentState(): Promise<CurrentChatState | null> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['currentState'], 'readonly');
      const store = transaction.objectStore('currentState');
      const request = store.get('current');

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // 移除ID字段
          const { id, ...state } = result;
          // Current state loaded from IndexedDB
          resolve(state);
        } else {
          console.log('🎯 No current state found in IndexedDB');
          resolve(null);
        }
      };

      request.onerror = () => {
        // Failed to get current state from IndexedDB
        reject(request.error);
      };
    });
  }

  // 获取存储统计信息
  async getStorageStats(): Promise<{ conversationCount: number; totalMessages: number }> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    const conversations = await this.getConversations();
    let totalMessages = 0;

    // 计算总消息数
    for (const conversation of conversations) {
      const messages = await this.getMessages(conversation.id);
      totalMessages += messages.length;
    }

    return {
      conversationCount: conversations.length,
      totalMessages
    };
  }

  // 检查IndexedDB是否可用
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  // 清理资源
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('🔒 IndexedDB adapter closed');
    }
  }
}