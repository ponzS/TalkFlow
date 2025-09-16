import SQLiteService from './sqliteService';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { IndexedDBAdapter } from './indexedDBAdapter';

// 数据接口定义
export interface ChatMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: string; // JSON字符串存储额外数据
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
  model?: string;
  messageCount: number;
  metadata?: string; // JSON字符串存储额外数据
}

export interface CurrentChatState {
  currentConversationId: string;
  selectedModel: string;
  timestamp: string;
  metadata?: string;
}

export class AiChatPersistenceService {
  private sqliteService: SQLiteService;
  private db: SQLiteDBConnection | null = null;
  private dbName = 'ai_chat_db';
  private dbVersion = 1;
  private isInitialized = false;
  private useSQLite = true;
  private indexedDBAdapter: IndexedDBAdapter | null = null;
  private useIndexedDB = false;
  
  // 🆕 iOS备用存储机制
  private useLocalStorageFallback = false;
  private isIOSPlatform = false;
  
  // 批量操作管理 - 解决性能问题
  private batchQueue: Array<{
    type: 'conversation' | 'message' | 'state';
    data: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_DELAY = 100; // 100ms内的操作批量处理
  private isBatchProcessing = false;
  
  constructor(sqliteService?: SQLiteService) {
    this.sqliteService = sqliteService || new SQLiteService();
    // 检测iOS平台
    this.isIOSPlatform = this.detectIOSPlatform();
  }

  // 🆕 检测iOS平台
  private detectIOSPlatform(): boolean {
    return typeof navigator !== 'undefined' && 
      (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document));
  }

  // 批量处理队列
  private scheduleBatchProcess(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  // 处理批量操作
  private async processBatch(): Promise<void> {
    if (this.isBatchProcessing || this.batchQueue.length === 0) {
      return;
    }

    this.isBatchProcessing = true;
    const batchToProcess = this.batchQueue.splice(0, this.BATCH_SIZE);
    
    try {
      if (this.useSQLite && this.db) {
        // 使用事务批量处理所有操作
        await this.db.beginTransaction();
        
        try {
          for (const item of batchToProcess) {
            try {
              await this.executeBatchItem(item);
              item.resolve(undefined);
            } catch (error) {
              item.reject(error);
            }
          }
          
          await this.db.commitTransaction();
          
          // 批量保存到存储（只保存一次）
          try {
            await this.sqliteService.saveToStore(this.dbName);
          } catch (saveError) {
            // Failed to persist batch to store, but operations succeeded
          }
          
        } catch (error) {
          await this.db.rollbackTransaction();
          throw error;
        }
      } else {
        // 没有SQLite支持时，直接处理每个项目
        for (const item of batchToProcess) {
          try {
            await this.executeBatchItem(item);
            item.resolve(undefined);
          } catch (error) {
            item.reject(error);
          }
        }
      }
      
      // Processed batch of operations
      
    } catch (error) {
      // Batch processing failed
      // 拒绝所有待处理的项目
      batchToProcess.forEach(item => item.reject(error));
    } finally {
      this.isBatchProcessing = false;
      
      // 如果队列中还有待处理的项目，继续处理
      if (this.batchQueue.length > 0) {
        this.scheduleBatchProcess();
      }
    }
  }

  // 执行单个批量项目
  private async executeBatchItem(item: { type: string; data: any }): Promise<void> {
    switch (item.type) {
      case 'conversation':
        await this.saveConversationDirect(item.data);
        break;
      case 'message':
        await this.saveMessageDirect(item.data);
        break;
      case 'state':
        await this.saveCurrentStateDirect(item.data);
        break;
      default:
        throw new Error(`Unknown batch item type: ${item.type}`);
    }
  }

  // 添加操作到批量队列
  private addToBatch(type: 'conversation' | 'message' | 'state', data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        type,
        data,
        resolve,
        reject
      });
      
      this.scheduleBatchProcess();
    });
  }

  // 初始化服务
  async initialize(): Promise<void> {
    try {
      // Initializing AI Chat Persistence Service
      // Platform detected
      
      // 检测并初始化IndexedDB
      await this.detectAndInitializeIndexedDB();
      
      // 检测是否支持SQLite
      await this.detectSQLiteSupport();
      
      if (this.useSQLite) {
        await this.initializeSQLiteWithRetry();
        
        // 🔄 关键修复：初始化后从多重备份同步数据到SQLite
        if (this.db) {
          // Syncing existing data to SQLite
          await this.syncFromBackupsToSQLite();
        }
      } else if (!this.useIndexedDB && !this.useLocalStorageFallback) {
        // 如果SQLite和IndexedDB都不可用，启用localStorage备用存储
        // Enabling localStorage fallback as last resort
        this.useLocalStorageFallback = true;
      }
      
      this.isInitialized = true;
      // AI Chat Persistence Service initialized
    } catch (error) {
      // Failed to initialize AI Chat Persistence Service
      // 发生错误时回退到备份模式
      this.useSQLite = false;
      this.useIndexedDB = false;
      this.useLocalStorageFallback = true;
      this.isInitialized = true;
      // Fallback to localStorage-only mode
    }
  }

  // 🆕 带重试机制的SQLite初始化
  private async initializeSQLiteWithRetry(): Promise<void> {
    const maxRetries = this.isIOSPlatform ? 5 : 3; // iOS需要更多重试
    const retryDelay = this.isIOSPlatform ? 3000 : 2000; // iOS需要更长延迟
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // SQLite initialization attempt
        this.db = await this.sqliteService.openDatabase(this.dbName, this.dbVersion, false);
        await this.createTables();
        // SQLite database initialized successfully
        return;
      } catch (error) {
        // SQLite initialization attempt failed
        
        if (attempt === maxRetries) {
          // SQLite failed after all retries, enabling fallback storage
          this.useSQLite = false;
          
          // iOS优先使用localStorage作为备用
          if (this.isIOSPlatform) {
            this.useLocalStorageFallback = true;
            // iOS: Using localStorage as primary storage
          }
          return;
        }
        
        // Waiting before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // 检测并初始化IndexedDB
  private async detectAndInitializeIndexedDB(): Promise<void> {
    try {
      if (this.isIOSPlatform) {
        // iOS WebView detected, skipping IndexedDB initialization
        this.useIndexedDB = false;
        // 🆕 iOS启用localStorage备用存储
        this.useLocalStorageFallback = true;
        return;
      }

      if (IndexedDBAdapter.isSupported()) {
        // IndexedDB is supported, initializing
        this.indexedDBAdapter = new IndexedDBAdapter();
        await this.indexedDBAdapter.initialize();
        this.useIndexedDB = true;
        // IndexedDB adapter initialized successfully
      } else {
        // IndexedDB not supported in this environment
        this.useIndexedDB = false;
        this.useLocalStorageFallback = true;
      }
    } catch (error) {
      // Failed to initialize IndexedDB, falling back to localStorage
      this.useIndexedDB = false;
      this.indexedDBAdapter = null;
      this.useLocalStorageFallback = true;
    }
  }

  // 检测SQLite支持
  private async detectSQLiteSupport(): Promise<void> {
    try {
      const platform = this.sqliteService.getPlatform();
      // Platform detected
      
      if (platform === 'web') {
        // 检查是否支持Web SQLite
        await this.sqliteService.initWebStore();
        this.useSQLite = true;
      } else if (platform === 'ios' || platform === 'android') {
        this.useSQLite = true;
      } else {
        this.useSQLite = false;
        this.useLocalStorageFallback = true;
      }
    } catch (error) {
      // SQLite not supported, using backup storage
      this.useSQLite = false;
      this.useLocalStorageFallback = true;
    }
  }

  // 初始化SQLite数据库
  private async initializeSQLite(): Promise<void> {
    try {
      this.db = await this.sqliteService.openDatabase(this.dbName, this.dbVersion, false);
      await this.createTables();
      // SQLite database initialized
    } catch (error) {
      // Failed to initialize SQLite
      throw error;
    }
  }

  // 创建数据库表
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const conversationsTable = `
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        lastMessage TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        model TEXT,
        messageCount INTEGER DEFAULT 0,
        metadata TEXT
      );
    `;

    const messagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversationId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        isStreaming INTEGER DEFAULT 0,
        metadata TEXT,
        FOREIGN KEY (conversationId) REFERENCES conversations (id) ON DELETE CASCADE
      );
    `;

    const currentStateTable = `
      CREATE TABLE IF NOT EXISTS current_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        currentConversationId TEXT,
        selectedModel TEXT,
        timestamp TEXT NOT NULL,
        metadata TEXT
      );
    `;

    try {
      await this.db.execute(conversationsTable);
      await this.db.execute(messagesTable);
      await this.db.execute(currentStateTable);
      
      // 创建索引提高查询性能
      await this.db.execute('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversationId);');
      await this.db.execute('CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updatedAt DESC);');
      
      // Database tables created successfully
    } catch (error) {
      // Failed to create tables
      throw error;
    }
  }

  // 批量保存对话（推荐使用）
  async saveConversation(conversation: Conversation): Promise<void> {
    this.ensureInitialized();
    
    // 立即备份到非关键存储（异步执行，不阻塞主流程）
    this.backupConversationAsync(conversation);
    
    // 添加到批量队列进行主存储
    return this.addToBatch('conversation', conversation);
  }

  // 直接保存对话（用于批量处理）
  private async saveConversationDirect(conversation: Conversation): Promise<void> {
    let saved = false;
    
    if (this.useSQLite && this.db) {
      try {
        const sql = `
          INSERT OR REPLACE INTO conversations 
          (id, title, lastMessage, createdAt, updatedAt, model, messageCount, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await this.db.run(sql, [
          conversation.id,
          conversation.title,
          conversation.lastMessage,
          conversation.createdAt,
          conversation.updatedAt,
          conversation.model,
          conversation.messageCount,
          conversation.metadata
        ]);
        saved = true;
      } catch (error) {
        // Failed to save conversation to SQLite
      }
    }
    
    // 🆕 如果SQLite失败或不可用，使用localStorage备用存储
    if (!saved && this.useLocalStorageFallback) {
      try {
        await this.saveConversationToLocalStorage(conversation);
        // Conversation saved to localStorage fallback
        saved = true;
      } catch (error) {
        // Failed to save conversation to localStorage
      }
    }
    
    // 如果都失败了，使用JSON备份
    if (!saved) {
      await this.saveConversationToJSON(conversation);
    }
  }

  // 🆕 localStorage存储对话
  private async saveConversationToLocalStorage(conversation: Conversation): Promise<void> {
    try {
      // 获取现有对话列表
      const conversations = await this.getConversationsFromLocalStorage();
      const index = conversations.findIndex(c => c.id === conversation.id);
      
      if (index >= 0) {
        conversations[index] = conversation;
      } else {
        conversations.unshift(conversation);
      }
      
      // 限制对话数量（localStorage有大小限制）
      const maxConversations = this.isIOSPlatform ? 50 : 100;
      if (conversations.length > maxConversations) {
        conversations.splice(maxConversations);
      }
      
      conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const success = this.safeSaveToLocalStorage('aiChatConversations_v2', JSON.stringify(conversations));
      
      if (!success) {
        throw new Error('Failed to save conversation to localStorage due to storage constraints');
      }
    } catch (error) {
      // Failed to save conversation to localStorage
      throw error;
    }
  }

  // 🆕 从localStorage获取对话列表
  private async getConversationsFromLocalStorage(): Promise<Conversation[]> {
    try {
      const conversationsJson = localStorage.getItem('aiChatConversations_v2');
      return conversationsJson ? JSON.parse(conversationsJson) : [];
    } catch (error) {
      // Failed to get conversations from localStorage
      return [];
    }
  }

  // 异步备份对话到辅助存储
  private async backupConversationAsync(conversation: Conversation): Promise<void> {
    // 使用setTimeout让备份操作异步执行，不阻塞主流程
    setTimeout(async () => {
      // IndexedDB备份存储（非关键）
      if (this.useIndexedDB && this.indexedDBAdapter) {
        try {
          await this.indexedDBAdapter.saveConversation(conversation);
        } catch (error) {
          // Failed to save conversation to IndexedDB backup
        }
      }

      // JSON备份存储（应急备份，非关键）
      try {
        await this.saveConversationToJSON(conversation);
      } catch (error) {
        // Failed to save conversation to JSON backup
      }
    }, 0);
  }

  // 更新助手消息（基于时间戳和角色查找）
  async updateAssistantMessage(conversationId: string, timestamp: string, content: string, isStreaming: boolean): Promise<void> {
    this.ensureInitialized();

    let sqliteSuccess = false;
    let sqliteError: any = null;

    try {
      // SQLite更新（主存储）
      if (this.useSQLite && this.db) {
        const updateSql = `
          UPDATE messages 
          SET content = ?, isStreaming = ?
          WHERE conversationId = ? AND timestamp = ? AND role = 'assistant'
        `;
        const result = await this.db.run(updateSql, [
          content,
          isStreaming ? 1 : 0,
          conversationId,
          timestamp
        ]);
        
        if (result.changes && result.changes.changes > 0) {
          // Assistant message updated in SQLite
          // 尝试保存到存储，但不影响核心操作成功
          try {
            await this.sqliteService.saveToStore(this.dbName);
          } catch (saveError) {
            // Failed to persist SQLite to store, but core operation succeeded
          }
          sqliteSuccess = true;
        } else {
          throw new Error('No assistant message found with matching timestamp in SQLite');
        }
      }
    } catch (error) {
      sqliteError = error;
      // Failed to update assistant message in SQLite
    }

    // IndexedDB备份更新（非关键）
    if (this.useIndexedDB && this.indexedDBAdapter) {
      try {
        await this.indexedDBAdapter.updateAssistantMessage(conversationId, timestamp, content, isStreaming);
        // Assistant message updated in IndexedDB backup
      } catch (error) {
        // Failed to update assistant message in IndexedDB backup
      }
    }

    // JSON备份更新（应急备份，非关键）
    try {
      const messagesKey = `aiChatMessages_${conversationId}`;
      const messagesJson = localStorage.getItem(messagesKey);
      const messages: ChatMessage[] = messagesJson ? JSON.parse(messagesJson) : [];
      
      const messageIndex = messages.findIndex(m => 
        m.timestamp === timestamp && 
        m.role === 'assistant' &&
        m.conversationId === conversationId
      );
      
      if (messageIndex >= 0) {
        messages[messageIndex].content = content;
        messages[messageIndex].isStreaming = isStreaming;
        const success = this.safeSaveToLocalStorage(messagesKey, JSON.stringify(messages));
        if (success) {
          // Assistant message updated in JSON backup
        } else {
          // Failed to update assistant message in JSON backup: storage quota exceeded
        }
      } else {
        // No assistant message found with matching timestamp in JSON backup
      }
    } catch (error) {
      // Failed to update assistant message in JSON backup
    }

    // 只有主存储（SQLite）失败时才抛出错误
    if (!sqliteSuccess) {
      throw sqliteError || new Error('Failed to update assistant message in primary storage');
    }

    // Assistant message updated successfully
  }

  // 批量保存消息（推荐使用）
  async saveMessage(message: ChatMessage): Promise<number | undefined> {
    this.ensureInitialized();
    
    try {
      // 同步等待备份完成（确保数据安全）
      await this.backupMessageSync(message);
    
    // 添加到批量队列进行主存储
    await this.addToBatch('message', message);
    
      // Message saved and backed up successfully
    // 注意：在批量模式下，我们无法立即返回messageId
    // 如果需要立即获取ID，应该使用saveMessageImmediate方法
    return undefined;
    } catch (error) {
      // Failed to save message
      throw error;
    }
  }

  // 立即保存消息（用于需要立即获取ID的场景）
  async saveMessageImmediate(message: ChatMessage): Promise<number | undefined> {
    this.ensureInitialized();
    
    try {
      // 同步等待备份完成（确保数据安全）
      await this.backupMessageSync(message);
    
    // 直接保存到主存储
      const messageId = await this.saveMessageDirect(message);
      // Message saved immediately with ID
      return messageId;
    } catch (error) {
      // Failed to save message immediately
      throw error;
    }
  }

  // 直接保存消息（用于批量处理和立即保存）
  private async saveMessageDirect(message: ChatMessage): Promise<number | undefined> {
    let messageId: number | undefined;
    let saved = false;
    
    if (this.useSQLite && this.db) {
      try {
        // 首先检查消息是否已存在（基于对话ID、时间戳和内容）
        const checkSql = `
          SELECT id FROM messages 
          WHERE conversationId = ? AND timestamp = ? AND content = ? AND role = ?
        `;
        const existingResult = await this.db.query(checkSql, [
          message.conversationId,
          message.timestamp,
          message.content,
          message.role
        ]);
        
        if (existingResult.values && existingResult.values.length > 0) {
          // 消息已存在，更新而不是插入
          messageId = existingResult.values[0].id;
          const updateSql = `
            UPDATE messages 
            SET content = ?, isStreaming = ?, metadata = ?
            WHERE id = ?
          `;
          await this.db.run(updateSql, [
            message.content,
            message.isStreaming ? 1 : 0,
            message.metadata,
            messageId
          ]);
        } else {
          // 插入新消息
          const insertSql = `
            INSERT INTO messages 
            (conversationId, role, content, timestamp, isStreaming, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          const result = await this.db.run(insertSql, [
            message.conversationId,
            message.role,
            message.content,
            message.timestamp,
            message.isStreaming ? 1 : 0,
            message.metadata
          ]);
          
          messageId = result.changes?.lastId;
        }
        saved = true;
      } catch (error) {
        // Failed to save message to SQLite
      }
    }
    
    // 🆕 如果SQLite失败或不可用，使用localStorage备用存储
    if (!saved && this.useLocalStorageFallback) {
      try {
        await this.saveMessageToLocalStorage(message);
        // Message saved to localStorage fallback
        saved = true;
      } catch (error) {
        // Failed to save message to localStorage
      }
    }
    
    // 如果都失败了，使用JSON备份
    if (!saved) {
      await this.saveMessageToJSON(message);
    }
    
    return messageId;
  }

  // 🆕 localStorage存储消息
  private async saveMessageToLocalStorage(message: ChatMessage): Promise<void> {
    try {
      const messagesKey = `aiChatMessages_v2_${message.conversationId}`;
      const messages = await this.getMessagesFromLocalStorage(message.conversationId);
      
      // 检查是否已存在相同的消息
      const existingIndex = messages.findIndex(m => 
        m.timestamp === message.timestamp && 
        m.role === message.role &&
        m.conversationId === message.conversationId
      );
      
      if (existingIndex >= 0) {
        messages[existingIndex] = message;
      } else {
        messages.push(message);
      }
      
      // 限制消息数量（iOS设备localStorage容量较小）
      const maxMessages = this.isIOSPlatform ? 200 : 500;
      if (messages.length > maxMessages) {
        messages.splice(0, messages.length - maxMessages);
      }
      
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const success = this.safeSaveToLocalStorage(messagesKey, JSON.stringify(messages));
      
      if (!success) {
        throw new Error('Failed to save message to localStorage due to storage constraints');
      }
    } catch (error) {
      // Failed to save message to localStorage
      throw error;
    }
  }

  // 🆕 从localStorage获取消息列表
  private async getMessagesFromLocalStorage(conversationId: string): Promise<ChatMessage[]> {
    try {
      const messagesKey = `aiChatMessages_v2_${conversationId}`;
      const messagesJson = localStorage.getItem(messagesKey);
      return messagesJson ? JSON.parse(messagesJson) : [];
    } catch (error) {
      // Failed to get messages from localStorage
      return [];
    }
  }

  // 同步备份消息到辅助存储 - 确保数据完整性
  private async backupMessageSync(message: ChatMessage): Promise<void> {
    // 开始同步备份消息
    
    const backupResults: Array<{ type: string; success: boolean; error?: any }> = [];
    
    // IndexedDB备份存储（重要备份）
      if (this.useIndexedDB && this.indexedDBAdapter) {
        try {
          await this.indexedDBAdapter.saveMessage(message);
        backupResults.push({ type: 'IndexedDB', success: true });
        // IndexedDB backup successful
        } catch (error) {
        backupResults.push({ type: 'IndexedDB', success: false, error });
        // IndexedDB backup failed
        }
      }

    // JSON备份存储（应急备份，关键）
      try {
        await this.saveMessageToJSON(message);
      backupResults.push({ type: 'JSON', success: true });
      // JSON backup successful
      } catch (error) {
      backupResults.push({ type: 'JSON', success: false, error });
      // JSON backup failed
    }
    
    // 创建应急备份到localStorage
    try {
      const emergencyBackup = {
        messageId: message.id,
        conversationId: message.conversationId,
        content: message.content.substring(0, 100), // 只保存前100字符
        timestamp: Date.now(),
        role: message.role
      };
      localStorage.setItem('aiChatEmergencyBackup', JSON.stringify(emergencyBackup));
      backupResults.push({ type: 'Emergency', success: true });
      // Emergency backup successful
    } catch (error) {
      backupResults.push({ type: 'Emergency', success: false, error });
      // Emergency backup failed
      }
    
    const successCount = backupResults.filter(r => r.success).length;
    // Backup summary
    
    // 如果所有备份都失败，抛出错误
    if (successCount === 0) {
      throw new Error('All backup methods failed');
    }
  }

  // 批量保存当前聊天状态（推荐使用）
  async saveCurrentState(state: CurrentChatState): Promise<void> {
    this.ensureInitialized();
    
    // 立即备份到非关键存储（异步执行，不阻塞主流程）
    this.backupCurrentStateAsync(state);
    
    // 添加到批量队列进行主存储
    return this.addToBatch('state', state);
  }

  // 直接保存当前状态（用于批量处理）
  private async saveCurrentStateDirect(state: CurrentChatState): Promise<void> {
    let saved = false;
    
    if (this.useSQLite && this.db) {
      try {
        const sql = `
          INSERT OR REPLACE INTO current_state 
          (id, currentConversationId, selectedModel, timestamp, metadata)
          VALUES (1, ?, ?, ?, ?)
        `;
        await this.db.run(sql, [
          state.currentConversationId,
          state.selectedModel,
          state.timestamp,
          state.metadata
        ]);
        saved = true;
      } catch (error) {
        // console.error('❌ Failed to save current state to SQLite:', error);
      }
    }
    
    // 🆕 如果SQLite失败或不可用，使用localStorage备用存储
    if (!saved && this.useLocalStorageFallback) {
      try {
        const success = this.safeSaveToLocalStorage('aiChatCurrentState_v2', JSON.stringify(state));
        if (success) {
          // console.log('💾 Current state saved to localStorage fallback');
          saved = true;
        }
      } catch (error) {
        // console.error('❌ Failed to save current state to localStorage:', error);
      }
    }
    
    // 如果都失败了，使用旧版本JSON存储
    if (!saved) {
      this.safeSaveToLocalStorage('aiChatCurrentState', JSON.stringify(state));
    }
  }

  // 异步备份当前状态到辅助存储
  private async backupCurrentStateAsync(state: CurrentChatState): Promise<void> {
    // 使用setTimeout让备份操作异步执行，不阻塞主流程
    setTimeout(async () => {
      // IndexedDB备份存储（非关键）
      if (this.useIndexedDB && this.indexedDBAdapter) {
        try {
          await this.indexedDBAdapter.saveCurrentState(state);
        } catch (error) {
          // console.warn('⚠️ Failed to save current state to IndexedDB backup:', error);
        }
      }

      // JSON备份存储（应急备份，非关键）
      try {
        const success = this.safeSaveToLocalStorage('aiChatCurrentState', JSON.stringify(state));
        if (!success) {
          // console.warn('⚠️ Failed to save current state to JSON backup: storage quota exceeded');
        }
      } catch (error) {
        // console.warn('⚠️ Failed to save current state to JSON backup:', error);
      }
    }, 0);
  }

  // 获取对话列表
  async getConversations(): Promise<Conversation[]> {
    this.ensureInitialized();

    try {
      let conversations: Conversation[] = [];
      let sqliteAttempted = false;

      // 优先从SQLite读取
      if (this.useSQLite && this.db) {
        try {
          const sql = 'SELECT * FROM conversations ORDER BY updatedAt DESC';
          const result = await this.db.query(sql);
          
          if (result.values) {
            conversations = result.values.map((row: any) => ({
              id: row.id,
              title: row.title,
              lastMessage: row.lastMessage,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
              model: row.model,
              messageCount: row.messageCount,
              metadata: row.metadata
            }));
          }
          sqliteAttempted = true;
          // console.log(`📚 SQLite returned ${conversations.length} conversations`);
        } catch (error) {
          // console.error('❌ Failed to get conversations from SQLite:', error);
          sqliteAttempted = true;
        }
      }

      // 🆕 如果SQLite为空或不可用，尝试localStorage备用存储
      if (conversations.length === 0 && this.useLocalStorageFallback) {
        try {
          // console.log('🔄 Falling back to localStorage...');
          const localStorageConversations = await this.getConversationsFromLocalStorage();
          conversations = localStorageConversations;
          // console.log(`📊 localStorage returned ${conversations.length} conversations`);
          
          // 如果SQLite可用但为空，而localStorage有数据，重新同步
          if (sqliteAttempted && this.useSQLite && this.db && localStorageConversations.length > 0) {
            // console.warn(`⚠️ Data sync issue detected: SQLite empty but localStorage has ${localStorageConversations.length} conversations`);
            // console.log('🔄 Re-syncing localStorage data to SQLite...');
            await this.syncLocalStorageToSQLite();
          }
        } catch (error) {
          // console.warn('⚠️ Failed to get conversations from localStorage:', error);
        }
      }

      // 如果localStorage也为空或失败，尝试IndexedDB
      if (conversations.length === 0 && this.useIndexedDB && this.indexedDBAdapter) {
        try {
          // console.log('🔄 Falling back to IndexedDB backup...');
          const indexedDBConversations = await this.indexedDBAdapter.getConversations();
          conversations = indexedDBConversations;
          // console.log(`📊 IndexedDB backup returned ${conversations.length} conversations`);
          
          // 如果有数据，同步到更好的存储
          if (indexedDBConversations.length > 0) {
            // console.log('🔄 Re-syncing IndexedDB data to primary storage...');
            await this.syncFromBackupsToSQLite();
          }
        } catch (error) {
          // console.warn('⚠️ Failed to get conversations from IndexedDB:', error);
        }
      }
      
      // 最后尝试JSON应急备份
      if (conversations.length === 0) {
        // console.log('🔄 Falling back to JSON emergency backup...');
        const jsonConversations = await this.getConversationsFromJSON();
        conversations = jsonConversations;
        // console.log(`📊 JSON emergency backup returned ${conversations.length} conversations`);
        
        // 如果有数据，同步到更好的存储
        if (jsonConversations.length > 0) {
          // console.log('🔄 Re-syncing JSON data to better storage...');
          await this.syncFromBackupsToSQLite();
        }
      }

      // console.log(`📚 Final result: Loaded ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      // console.error('❌ Failed to get conversations:', error);
      return [];
    }
  }

  // 获取对话消息
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    this.ensureInitialized();

    try {
      let messages: ChatMessage[] = [];
      let sqliteAttempted = false;

      // 优先从SQLite读取
      if (this.useSQLite && this.db) {
        try {
          const sql = 'SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC';
          const result = await this.db.query(sql, [conversationId]);
          
          if (result.values) {
            messages = result.values.map((row: any) => ({
              id: row.id,
              conversationId: row.conversationId,
              role: row.role,
              content: row.content,
              timestamp: row.timestamp,
              isStreaming: Boolean(row.isStreaming),
              metadata: row.metadata
            }));
          }
          sqliteAttempted = true;
          // console.log(`💬 SQLite returned ${messages.length} messages for conversation: ${conversationId}`);
        } catch (error) {
          // console.error(`❌ Failed to get messages from SQLite for ${conversationId}:`, error);
          sqliteAttempted = true;
        }
      }

      // 🆕 如果SQLite为空或不可用，尝试localStorage备用存储
      if (messages.length === 0 && this.useLocalStorageFallback) {
        try {
          // console.log(`🔄 Falling back to localStorage for conversation: ${conversationId}`);
          const localStorageMessages = await this.getMessagesFromLocalStorage(conversationId);
          messages = localStorageMessages;
          // console.log(`📊 localStorage returned ${messages.length} messages for conversation ${conversationId}`);
          
          // 如果SQLite可用但为空，而localStorage有数据，这表明数据同步有问题
          if (sqliteAttempted && this.useSQLite && this.db && localStorageMessages.length > 0) {
            // console.warn(`⚠️ Message sync issue detected for conversation ${conversationId}: SQLite empty but localStorage has ${localStorageMessages.length} messages`);
          }
        } catch (error) {
          // console.warn(`⚠️ Failed to get messages from localStorage for ${conversationId}:`, error);
        }
      }

      // 如果localStorage也为空或失败，尝试IndexedDB
      if (messages.length === 0 && this.useIndexedDB && this.indexedDBAdapter) {
        try {
          // console.log(`🔄 Falling back to IndexedDB backup for conversation: ${conversationId}`);
          const indexedDBMessages = await this.indexedDBAdapter.getMessages(conversationId);
          messages = indexedDBMessages;
          // console.log(`📊 IndexedDB backup returned ${messages.length} messages for conversation ${conversationId}`);
        } catch (error) {
          // console.warn(`⚠️ Failed to get messages from IndexedDB for ${conversationId}:`, error);
        }
      }
      
      // 最后尝试JSON应急备份
      if (messages.length === 0) {
        // console.log(`🔄 Falling back to JSON emergency backup for conversation: ${conversationId}`);
        const jsonMessages = await this.getMessagesFromJSON(conversationId);
        messages = jsonMessages;
        // console.log(`📊 JSON emergency backup returned ${messages.length} messages for conversation ${conversationId}`);
      }

      // console.log(`💬 Final result: Loaded ${messages.length} messages for conversation: ${conversationId}`);
      return messages;
    } catch (error) {
      // console.error(`❌ Failed to get messages for ${conversationId}:`, error);
      return [];
    }
  }

  // 获取当前聊天状态
  async getCurrentState(): Promise<CurrentChatState | null> {
    this.ensureInitialized();

    try {
      let state: CurrentChatState | null = null;

      // 优先从SQLite读取
      if (this.useSQLite && this.db) {
        try {
          const sql = 'SELECT * FROM current_state WHERE id = 1';
          const result = await this.db.query(sql);
          
          if (result.values && result.values.length > 0) {
            const row = result.values[0];
            state = {
              currentConversationId: row.currentConversationId,
              selectedModel: row.selectedModel,
              timestamp: row.timestamp,
              metadata: row.metadata
            };
          }
        } catch (error) {
          // console.error('❌ Failed to get current state from SQLite:', error);
        }
      }

      // 🆕 如果SQLite为空或不可用，尝试localStorage备用存储
      if (!state && this.useLocalStorageFallback) {
        try {
          const stateJson = localStorage.getItem('aiChatCurrentState_v2');
          if (stateJson) {
            state = JSON.parse(stateJson);
            // console.log('🎯 Current state loaded from localStorage');
          }
        } catch (error) {
          // console.warn('⚠️ Failed to get current state from localStorage:', error);
        }
      }

      // 如果localStorage也为空或失败，尝试IndexedDB
      if (!state && this.useIndexedDB && this.indexedDBAdapter) {
        try {
          state = await this.indexedDBAdapter.getCurrentState();
          if (state) {
            // console.log('🎯 Current state loaded from IndexedDB backup');
          }
        } catch (error) {
          // console.warn('⚠️ Failed to get current state from IndexedDB:', error);
        }
      }
      
      // 最后尝试JSON应急备份
      if (!state) {
        const stateJson = localStorage.getItem('aiChatCurrentState');
        if (stateJson) {
          state = JSON.parse(stateJson);
          // console.log('🎯 Current state loaded from JSON emergency backup');
        }
      }

      // console.log('🎯 Loaded current state:', state?.currentConversationId);
      return state;
    } catch (error) {
      // console.error('❌ Failed to get current state:', error);
      return null;
    }
  }

  // 删除对话
  async deleteConversation(conversationId: string): Promise<void> {
    this.ensureInitialized();

    let sqliteSuccess = false;
    let sqliteError: any = null;

    try {
      // SQLite删除（主存储）
      if (this.useSQLite && this.db) {
        await this.db.run('DELETE FROM messages WHERE conversationId = ?', [conversationId]);
        await this.db.run('DELETE FROM conversations WHERE id = ?', [conversationId]);
        // 尝试保存到存储，但不影响核心操作成功
        try {
          await this.sqliteService.saveToStore(this.dbName);
        } catch (saveError) {
          // console.warn('⚠️ Failed to persist SQLite to store, but core operation succeeded:', saveError);
        }
        sqliteSuccess = true;
        // console.log('✅ Conversation deleted from SQLite:', conversationId);
      }
    } catch (error) {
      sqliteError = error;
      // console.error('❌ Failed to delete conversation from SQLite:', error);
    }

    // IndexedDB备份删除（非关键）
    if (this.useIndexedDB && this.indexedDBAdapter) {
      try {
        await this.indexedDBAdapter.deleteConversation(conversationId);
        // console.log('✅ Conversation deleted from IndexedDB backup:', conversationId);
      } catch (error) {
        // console.warn('⚠️ Failed to delete conversation from IndexedDB backup:', error);
      }
    }

    // JSON备份删除（应急备份，非关键）
    try {
      await this.deleteConversationFromJSON(conversationId);
      // console.log('✅ Conversation deleted from JSON backup:', conversationId);
    } catch (error) {
      // console.warn('⚠️ Failed to delete conversation from JSON backup:', error);
    }

    // 只有主存储（SQLite）失败时才抛出错误
    if (!sqliteSuccess) {
      throw sqliteError || new Error('Failed to delete conversation from primary storage');
    }

    // console.log('🗑️ Conversation deleted successfully:', conversationId);
  }

  // JSON备份方法
  private async saveConversationToJSON(conversation: Conversation): Promise<void> {
    try {
      const conversations = await this.getConversationsFromJSON();
      const index = conversations.findIndex(c => c.id === conversation.id);
      
      if (index >= 0) {
        conversations[index] = conversation;
      } else {
        conversations.unshift(conversation);
      }
      
      conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const success = this.safeSaveToLocalStorage('aiChatConversationHistory', JSON.stringify(conversations));
      if (!success) {
        throw new Error('Failed to save conversation to localStorage due to storage constraints');
      }
    } catch (error) {
      // console.error('❌ Failed to save conversation to JSON:', error);
    }
  }

  // 检查LocalStorage可用空间（安全版本）
  private checkStorageSpace(): { available: number; used: number; total: number } {
    let used = 0;
    let total = 5 * 1024 * 1024; // 假设5MB总容量（保守估计）
    
    try {
      // 计算已使用空间
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
      
      // 保守估算可用空间，不进行危险的填充测试
      const estimatedAvailable = Math.max(0, total - used);
      
      // 如果使用率超过80%，认为空间紧张
      const usageRate = used / total;
      const available = usageRate > 0.8 ? Math.max(0, total * 0.2 - used) : estimatedAvailable;
      
      return { available, used, total };
    } catch (error) {
      // console.warn('Unable to check storage space:', error);
      return { available: 1024 * 1024, used, total }; // 假设有1MB可用
    }
  }
  

  
  // 安全保存到LocalStorage（完全禁用自动清理）
  private safeSaveToLocalStorage(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        // console.error('🚨 Storage quota exceeded! Cannot save data.');
        
        // 显示用户友好的错误信息，不自动删除任何数据
        const spaceInfo = this.checkStorageSpace();
        // console.error('📊 Storage usage:', {
        //   used: Math.round(spaceInfo.used / 1024) + 'KB',
        //   total: Math.round(spaceInfo.total / 1024) + 'KB',
        //   usagePercent: Math.round((spaceInfo.used / spaceInfo.total) * 100) + '%'
        // });
        
        // console.error('💡 Solution: Please manually delete some old conversations to free up space.');
        
        // 触发用户提示（如果在浏览器环境中）
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('aiChatStorageFull', {
            detail: {
              used: spaceInfo.used,
              total: spaceInfo.total,
              usagePercent: Math.round((spaceInfo.used / spaceInfo.total) * 100)
            }
          }));
        }
        
        return false;
      } else {
        // console.error('❌ Failed to save to localStorage:', error);
        return false;
      }
    }
  }

  private async saveMessageToJSON(message: ChatMessage): Promise<void> {
    try {
      const messagesKey = `aiChatMessages_${message.conversationId}`;
      const messagesJson = localStorage.getItem(messagesKey);
      const messages: ChatMessage[] = messagesJson ? JSON.parse(messagesJson) : [];
      
      // 检查消息是否已存在（基于时间戳、角色和内容）
      const existingIndex = messages.findIndex(m => 
        m.timestamp === message.timestamp && 
        m.role === message.role && 
        m.content === message.content
      );
      
      if (existingIndex >= 0) {
        // 更新现有消息
        messages[existingIndex] = message;
        // console.log('🔄 JSON message updated:', message.conversationId);
      } else {
        // 添加新消息
        messages.push(message);
        // console.log('➕ JSON message added:', message.conversationId);
      }
      
      const success = this.safeSaveToLocalStorage(messagesKey, JSON.stringify(messages));
      if (!success) {
        throw new Error('Failed to save message due to storage constraints');
      }
    } catch (error) {
      // console.error('❌ Failed to save message to JSON:', error);
      throw error; // 重新抛出错误，让调用者知道保存失败
    }
  }

  private async getConversationsFromJSON(): Promise<Conversation[]> {
    try {
      const conversationsJson = localStorage.getItem('aiChatConversationHistory');
      return conversationsJson ? JSON.parse(conversationsJson) : [];
    } catch (error) {
      // console.error('❌ Failed to get conversations from JSON:', error);
      return [];
    }
  }

  private async getMessagesFromJSON(conversationId: string): Promise<ChatMessage[]> {
    try {
      const messagesKey = `aiChatMessages_${conversationId}`;
      const messagesJson = localStorage.getItem(messagesKey);
      return messagesJson ? JSON.parse(messagesJson) : [];
    } catch (error) {
      // console.error('❌ Failed to get messages from JSON:', error);
      return [];
    }
  }

  private async deleteConversationFromJSON(conversationId: string): Promise<void> {
    try {
      // 删除对话记录
      const conversations = await this.getConversationsFromJSON();
      const filteredConversations = conversations.filter(c => c.id !== conversationId);
      localStorage.setItem('aiChatConversationHistory', JSON.stringify(filteredConversations));
      
      // 删除消息记录
      const messagesKey = `aiChatMessages_${conversationId}`;
      localStorage.removeItem(messagesKey);
    } catch (error) {
      // console.error('❌ Failed to delete conversation from JSON:', error);
    }
  }

  // 工具方法
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AiChatPersistenceService not initialized. Call initialize() first.');
    }
  }

  // 数据同步方法（从多重备份同步到SQLite）
  async syncFromBackupsToSQLite(): Promise<void> {
    if (!this.useSQLite || !this.db) {
      // console.log('⚠️ Skipping sync: SQLite not available');
      return;
    }

    try {
      // console.log('🔄 Starting data sync from backup storage to SQLite...');
      
      let conversations: Conversation[] = [];
      let syncedConversations = 0;
      let syncedMessages = 0;
      
      // 优先从IndexedDB获取数据
      if (this.useIndexedDB && this.indexedDBAdapter) {
        try {
          conversations = await this.indexedDBAdapter.getConversations();
          // console.log(`📋 Found ${conversations.length} conversations in IndexedDB backup`);
        } catch (error) {
          // console.warn('⚠️ Failed to get conversations from IndexedDB:', error);
        }
      }
      
      // 如果IndexedDB为空或失败，从JSON获取
      if (conversations.length === 0) {
        conversations = await this.getConversationsFromJSON();
        // console.log(`📋 Found ${conversations.length} conversations in JSON backup`);
      }
      
      // 同步对话和消息
      for (const conversation of conversations) {
        try {
          await this.saveConversation(conversation);
          syncedConversations++;
          // console.log(`✅ Synced conversation: ${conversation.title}`);
          
          // 获取消息，优先从IndexedDB
          let messages: ChatMessage[] = [];
          
          if (this.useIndexedDB && this.indexedDBAdapter) {
            try {
              messages = await this.indexedDBAdapter.getMessages(conversation.id);
              // console.log(`📨 Found ${messages.length} messages in IndexedDB for: ${conversation.title}`);
            } catch (error) {
              // console.warn(`⚠️ Failed to get messages from IndexedDB for ${conversation.id}:`, error);
            }
          }
          
          // 如果IndexedDB为空或失败，从JSON获取
          if (messages.length === 0) {
            messages = await this.getMessagesFromJSON(conversation.id);
            // // console.log(`📨 Found ${messages.length} messages in JSON for: ${conversation.title}`);
          }
          
          // 同步消息
          for (const message of messages) {
            try {
              await this.saveMessage(message);
              syncedMessages++;
            } catch (messageError) {
              // console.error(`❌ Failed to sync message in conversation ${conversation.id}:`, messageError);
            }
          }
        } catch (conversationError) {
          // console.error(`❌ Failed to sync conversation ${conversation.id}:`, conversationError);
        }
      }
      
      // console.log(`✅ Backup sync completed: ${syncedConversations}/${conversations.length} conversations, ${syncedMessages} messages`);
    } catch (error) {
      // console.error('❌ Failed to sync backup data:', error);
      throw error;
    }
  }

  // 数据同步方法（从JSON同步到SQLite）- 保留用于向后兼容
  async syncFromJSONToSQLite(): Promise<void> {
    if (!this.useSQLite || !this.db) {
      // console.log('⚠️ Skipping sync: SQLite not available');
      return;
    }

    try {
      // console.log('🔄 Starting data sync from JSON to SQLite...');
      
      // 同步对话
      const conversations = await this.getConversationsFromJSON();
      // console.log(`📋 Found ${conversations.length} conversations in JSON backup`);
      
      let syncedConversations = 0;
      let syncedMessages = 0;
      
      for (const conversation of conversations) {
        try {
          await this.saveConversation(conversation);
          syncedConversations++;
          // console.log(`✅ Synced conversation: ${conversation.title}`);
          
          // 同步消息
          const messages = await this.getMessagesFromJSON(conversation.id);
          // console.log(`📨 Found ${messages.length} messages for conversation: ${conversation.title}`);
          
          for (const message of messages) {
            try {
              await this.saveMessage(message);
              syncedMessages++;
            } catch (messageError) {
              // console.error(`❌ Failed to sync message in conversation ${conversation.id}:`, messageError);
            }
          }
        } catch (conversationError) {
          // console.error(`❌ Failed to sync conversation ${conversation.id}:`, conversationError);
        }
      }
      
      // console.log(`✅ JSON sync completed: ${syncedConversations}/${conversations.length} conversations, ${syncedMessages} messages`);
    } catch (error) {
      // console.error('❌ Failed to sync JSON data:', error);
      throw error; // 重新抛出错误，让调用者知道同步失败
    }
  }

  // 获取存储统计信息
  async getStorageStats(): Promise<{ sqliteEnabled: boolean; indexedDBEnabled: boolean; conversationCount: number; totalMessages: number }> {
    try {
      const conversations = await this.getConversations();
      let totalMessages = 0;
      
      for (const conversation of conversations) {
        const messages = await this.getMessages(conversation.id);
        totalMessages += messages.length;
      }
      
      return {
        sqliteEnabled: this.useSQLite,
        indexedDBEnabled: this.useIndexedDB,
        conversationCount: conversations.length,
        totalMessages
      };
    } catch (error) {
      // console.error('❌ Failed to get storage stats:', error);
      return {
        sqliteEnabled: this.useSQLite,
        indexedDBEnabled: this.useIndexedDB,
        conversationCount: 0,
        totalMessages: 0
      };
    }
  }

  // 🆕 从localStorage同步数据到SQLite
  private async syncLocalStorageToSQLite(): Promise<void> {
    if (!this.useSQLite || !this.db || !this.useLocalStorageFallback) {
      // console.log('⚠️ Skipping localStorage to SQLite sync: requirements not met');
      return;
    }

    try {
      // console.log('🔄 Starting localStorage to SQLite sync...');
      
      // 同步对话
      const conversations = await this.getConversationsFromLocalStorage();
      for (const conversation of conversations) {
        try {
          await this.saveConversationDirect(conversation);
        } catch (error) {
          // console.warn(`⚠️ Failed to sync conversation ${conversation.id}:`, error);
        }
      }
      
      // 同步消息
      for (const conversation of conversations) {
        try {
          const messages = await this.getMessagesFromLocalStorage(conversation.id);
          for (const message of messages) {
            await this.saveMessageDirect(message);
          }
        } catch (error) {
          // console.warn(`⚠️ Failed to sync messages for conversation ${conversation.id}:`, error);
        }
      }
      
      // 同步当前状态
      try {
        const stateJson = localStorage.getItem('aiChatCurrentState_v2');
        if (stateJson) {
          const state = JSON.parse(stateJson);
          await this.saveCurrentStateDirect(state);
        }
      } catch (error) {
        // console.warn('⚠️ Failed to sync current state:', error);
      }
      
      // console.log('✅ localStorage to SQLite sync completed');
    } catch (error) {
      // console.error('❌ localStorage to SQLite sync failed:', error);
    }
  }
}

