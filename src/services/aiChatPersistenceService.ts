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
            console.warn('⚠️ Failed to persist batch to store, but operations succeeded:', saveError);
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
      
      console.log(`✅ Processed batch of ${batchToProcess.length} operations`);
      
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
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
      console.log('🔧 Initializing AI Chat Persistence Service...');
      
      // 检测并初始化IndexedDB
      await this.detectAndInitializeIndexedDB();
      
      // 检测是否支持SQLite
      await this.detectSQLiteSupport();
      
      if (this.useSQLite) {
        await this.initializeSQLite();
        
        // 🔄 关键修复：初始化后从多重备份同步数据到SQLite
        console.log('🔄 Syncing existing data to SQLite...');
        await this.syncFromBackupsToSQLite();
      }
      
      this.isInitialized = true;
      console.log(`✅ AI Chat Persistence Service initialized (SQLite: ${this.useSQLite}, IndexedDB: ${this.useIndexedDB})`);
    } catch (error) {
      console.error('❌ Failed to initialize AI Chat Persistence Service:', error);
      // 发生错误时回退到备份模式
      this.useSQLite = false;
      this.isInitialized = true;
      console.log('🔄 Fallback to backup storage mode');
    }
  }

  // 检测并初始化IndexedDB
  private async detectAndInitializeIndexedDB(): Promise<void> {
    try {
      // 检测是否在iOS WebView环境中，如果是则跳过IndexedDB
      const isIOSWebView = typeof navigator !== 'undefined' && 
        (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.userAgent.includes('Mac') && 'ontouchend' in document));
      
      if (isIOSWebView) {
        console.log('📱 iOS WebView detected, skipping IndexedDB initialization');
        this.useIndexedDB = false;
        return;
      }

      if (IndexedDBAdapter.isSupported()) {
        console.log('🔍 IndexedDB is supported, initializing...');
        this.indexedDBAdapter = new IndexedDBAdapter();
        await this.indexedDBAdapter.initialize();
        this.useIndexedDB = true;
        console.log('✅ IndexedDB adapter initialized successfully');
      } else {
        console.warn('⚠️ IndexedDB not supported in this environment');
        this.useIndexedDB = false;
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize IndexedDB, falling back to JSON-only backup:', error);
      this.useIndexedDB = false;
      this.indexedDBAdapter = null;
    }
  }

  // 检测SQLite支持
  private async detectSQLiteSupport(): Promise<void> {
    try {
      const platform = this.sqliteService.getPlatform();
      console.log('📱 Platform detected:', platform);
      
      if (platform === 'web') {
        // 检查是否支持Web SQLite
        await this.sqliteService.initWebStore();
        this.useSQLite = true;
      } else if (platform === 'ios' || platform === 'android') {
        this.useSQLite = true;
      } else {
        this.useSQLite = false;
      }
    } catch (error) {
      console.warn('⚠️ SQLite not supported, using backup storage:', error);
      this.useSQLite = false;
    }
  }

  // 初始化SQLite数据库
  private async initializeSQLite(): Promise<void> {
    try {
      this.db = await this.sqliteService.openDatabase(this.dbName, this.dbVersion, false);
      await this.createTables();
      console.log('🗄️ SQLite database initialized');
    } catch (error) {
      console.error('❌ Failed to initialize SQLite:', error);
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
      
      console.log('🏗️ Database tables created successfully');
    } catch (error) {
      console.error('❌ Failed to create tables:', error);
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
    if (this.useSQLite && this.db) {
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
    } else {
      // 回退到JSON存储
      await this.saveConversationToJSON(conversation);
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
          console.warn('⚠️ Failed to save conversation to IndexedDB backup:', error);
        }
      }

      // JSON备份存储（应急备份，非关键）
      try {
        await this.saveConversationToJSON(conversation);
      } catch (error) {
        console.warn('⚠️ Failed to save conversation to JSON backup:', error);
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
          console.log('🔄 Assistant message updated in SQLite:', conversationId);
          // 尝试保存到存储，但不影响核心操作成功
          try {
            await this.sqliteService.saveToStore(this.dbName);
          } catch (saveError) {
            console.warn('⚠️ Failed to persist SQLite to store, but core operation succeeded:', saveError);
          }
          sqliteSuccess = true;
        } else {
          throw new Error('No assistant message found with matching timestamp in SQLite');
        }
      }
    } catch (error) {
      sqliteError = error;
      console.error('❌ Failed to update assistant message in SQLite:', error);
    }

    // IndexedDB备份更新（非关键）
    if (this.useIndexedDB && this.indexedDBAdapter) {
      try {
        await this.indexedDBAdapter.updateAssistantMessage(conversationId, timestamp, content, isStreaming);
        console.log('✅ Assistant message updated in IndexedDB backup:', conversationId);
      } catch (error) {
        console.warn('⚠️ Failed to update assistant message in IndexedDB backup:', error);
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
          console.log('✅ Assistant message updated in JSON backup:', conversationId);
        } else {
          console.warn('⚠️ Failed to update assistant message in JSON backup: storage quota exceeded');
        }
      } else {
        console.warn('⚠️ No assistant message found with matching timestamp in JSON backup');
      }
    } catch (error) {
      console.warn('⚠️ Failed to update assistant message in JSON backup:', error);
    }

    // 只有主存储（SQLite）失败时才抛出错误
    if (!sqliteSuccess) {
      throw sqliteError || new Error('Failed to update assistant message in primary storage');
    }

    console.log('✅ Assistant message updated successfully:', conversationId);
  }

  // 批量保存消息（推荐使用）
  async saveMessage(message: ChatMessage): Promise<number | undefined> {
    this.ensureInitialized();
    
    try {
      // 同步等待备份完成（确保数据安全）
      await this.backupMessageSync(message);
    
    // 添加到批量队列进行主存储
    await this.addToBatch('message', message);
    
      console.log('✅ Message saved and backed up successfully');
    // 注意：在批量模式下，我们无法立即返回messageId
    // 如果需要立即获取ID，应该使用saveMessageImmediate方法
    return undefined;
    } catch (error) {
      console.error('❌ Failed to save message:', error);
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
      console.log('✅ Message saved immediately with ID:', messageId);
      return messageId;
    } catch (error) {
      console.error('❌ Failed to save message immediately:', error);
      throw error;
    }
  }

  // 直接保存消息（用于批量处理和立即保存）
  private async saveMessageDirect(message: ChatMessage): Promise<number | undefined> {
    let messageId: number | undefined;
    
    if (this.useSQLite && this.db) {
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
    } else {
      // 回退到JSON存储
      await this.saveMessageToJSON(message);
    }
    
    return messageId;
  }

  // 同步备份消息到辅助存储 - 确保数据完整性
  private async backupMessageSync(message: ChatMessage): Promise<void> {
    console.log('💾 开始同步备份消息...');
    
    const backupResults: Array<{ type: string; success: boolean; error?: any }> = [];
    
    // IndexedDB备份存储（重要备份）
      if (this.useIndexedDB && this.indexedDBAdapter) {
        try {
          await this.indexedDBAdapter.saveMessage(message);
        backupResults.push({ type: 'IndexedDB', success: true });
        console.log('✅ IndexedDB backup successful');
        } catch (error) {
        backupResults.push({ type: 'IndexedDB', success: false, error });
        console.error('❌ IndexedDB backup failed:', error);
        }
      }

    // JSON备份存储（应急备份，关键）
      try {
        await this.saveMessageToJSON(message);
      backupResults.push({ type: 'JSON', success: true });
      console.log('✅ JSON backup successful');
      } catch (error) {
      backupResults.push({ type: 'JSON', success: false, error });
      console.error('❌ JSON backup failed:', error);
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
      console.log('✅ Emergency backup successful');
    } catch (error) {
      backupResults.push({ type: 'Emergency', success: false, error });
      console.warn('⚠️ Emergency backup failed:', error);
      }
    
    const successCount = backupResults.filter(r => r.success).length;
    console.log(`📊 Backup summary: ${successCount}/${backupResults.length} successful`);
    
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
    if (this.useSQLite && this.db) {
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
    } else {
      // 回退到JSON存储
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
          console.warn('⚠️ Failed to save current state to IndexedDB backup:', error);
        }
      }

      // JSON备份存储（应急备份，非关键）
      try {
        const success = this.safeSaveToLocalStorage('aiChatCurrentState', JSON.stringify(state));
        if (!success) {
          console.warn('⚠️ Failed to save current state to JSON backup: storage quota exceeded');
        }
      } catch (error) {
        console.warn('⚠️ Failed to save current state to JSON backup:', error);
      }
    }, 0);
  }

  // 获取所有对话
  async getConversations(): Promise<Conversation[]> {
    this.ensureInitialized();

    try {
      let conversations: Conversation[] = [];
      let sqliteAttempted = false;

      // 优先从SQLite读取
      if (this.useSQLite && this.db) {
        sqliteAttempted = true;
        console.log('🔍 Attempting to load conversations from SQLite...');
        
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
          console.log(`📊 SQLite returned ${conversations.length} conversations`);
        } else {
          console.log('📊 SQLite query returned no values');
        }
      } else {
        console.log(`⚠️ SQLite not available (useSQLite: ${this.useSQLite}, db: ${!!this.db})`);
      }

      // 如果SQLite为空或不可用，按优先级从备份读取
      if (conversations.length === 0) {
        // 优先尝试IndexedDB
        if (this.useIndexedDB && this.indexedDBAdapter) {
          try {
            console.log('🔄 Falling back to IndexedDB backup...');
            const indexedDBConversations = await this.indexedDBAdapter.getConversations();
            conversations = indexedDBConversations;
            console.log(`📊 IndexedDB backup returned ${conversations.length} conversations`);
            
            // 如果SQLite可用但为空，而IndexedDB有数据，重新同步
            if (sqliteAttempted && indexedDBConversations.length > 0) {
              console.warn(`⚠️ Data sync issue detected: SQLite empty but IndexedDB has ${indexedDBConversations.length} conversations`);
              console.log('🔄 Re-syncing backup data to SQLite...');
              await this.syncFromBackupsToSQLite();
            }
          } catch (error) {
            console.warn('⚠️ Failed to get conversations from IndexedDB:', error);
          }
        }
        
        // 如果IndexedDB也为空或失败，最后尝试JSON
        if (conversations.length === 0) {
          console.log('🔄 Falling back to JSON emergency backup...');
          const jsonConversations = await this.getConversationsFromJSON();
          conversations = jsonConversations;
          console.log(`📊 JSON emergency backup returned ${conversations.length} conversations`);
          
          // 如果有数据，同步到更好的存储
          if (jsonConversations.length > 0) {
            console.log('🔄 Re-syncing JSON data to better storage...');
            await this.syncFromBackupsToSQLite();
          }
        }
      }

      console.log(`📚 Final result: Loaded ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      console.error('❌ Failed to get conversations:', error);
      // 发生错误时尝试从JSON备份读取
      console.log('🆘 Emergency fallback to JSON backup...');
      const emergencyConversations = await this.getConversationsFromJSON();
      console.log(`🆘 Emergency backup returned ${emergencyConversations.length} conversations`);
      return emergencyConversations;
    }
  }

  // 获取对话的所有消息
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    this.ensureInitialized();

    try {
      let messages: ChatMessage[] = [];
      let sqliteAttempted = false;

      // 优先从SQLite读取
      if (this.useSQLite && this.db) {
        sqliteAttempted = true;
        console.log(`🔍 Attempting to load messages from SQLite for conversation: ${conversationId}`);
        
        const sql = 'SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC';
        const result = await this.db.query(sql, [conversationId]);
        
        if (result.values) {
          messages = result.values.map((row: any) => ({
            id: row.id,
            conversationId: row.conversationId,
            role: row.role,
            content: row.content,
            timestamp: row.timestamp,
            isStreaming: row.isStreaming === 1,
            metadata: row.metadata
          }));
          console.log(`📊 SQLite returned ${messages.length} messages for conversation ${conversationId}`);
        } else {
          console.log(`📊 SQLite query returned no messages for conversation ${conversationId}`);
        }
      } else {
        console.log(`⚠️ SQLite not available for messages (useSQLite: ${this.useSQLite}, db: ${!!this.db})`);
      }

      // 如果SQLite为空或不可用，按优先级从备份读取
      if (messages.length === 0) {
        // 优先尝试IndexedDB
        if (this.useIndexedDB && this.indexedDBAdapter) {
          try {
            console.log(`🔄 Falling back to IndexedDB backup for conversation: ${conversationId}`);
            const indexedDBMessages = await this.indexedDBAdapter.getMessages(conversationId);
            messages = indexedDBMessages;
            console.log(`📊 IndexedDB backup returned ${messages.length} messages for conversation ${conversationId}`);
            
            // 如果SQLite可用但为空，而IndexedDB有数据，这表明数据同步有问题
            if (sqliteAttempted && indexedDBMessages.length > 0) {
              console.warn(`⚠️ Message sync issue detected for conversation ${conversationId}: SQLite empty but IndexedDB has ${indexedDBMessages.length} messages`);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to get messages from IndexedDB for ${conversationId}:`, error);
          }
        }
        
        // 如果IndexedDB也为空或失败，最后尝试JSON
        if (messages.length === 0) {
          console.log(`🔄 Falling back to JSON emergency backup for conversation: ${conversationId}`);
          const jsonMessages = await this.getMessagesFromJSON(conversationId);
          messages = jsonMessages;
          console.log(`📊 JSON emergency backup returned ${messages.length} messages for conversation ${conversationId}`);
        }
      }

      console.log(`💬 Final result: Loaded ${messages.length} messages for conversation: ${conversationId}`);
      return messages;
    } catch (error) {
      console.error(`❌ Failed to get messages for conversation ${conversationId}:`, error);
      // 发生错误时尝试从JSON备份读取
      console.log(`🆘 Emergency fallback to JSON backup for conversation: ${conversationId}`);
      const emergencyMessages = await this.getMessagesFromJSON(conversationId);
      console.log(`🆘 Emergency backup returned ${emergencyMessages.length} messages for conversation ${conversationId}`);
      return emergencyMessages;
    }
  }

  // 获取当前聊天状态
  async getCurrentState(): Promise<CurrentChatState | null> {
    this.ensureInitialized();

    try {
      let state: CurrentChatState | null = null;

      // 优先从SQLite读取
      if (this.useSQLite && this.db) {
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
      }

      // 如果SQLite为空或不可用，按优先级从备份读取
      if (!state) {
        // 优先尝试IndexedDB
        if (this.useIndexedDB && this.indexedDBAdapter) {
          try {
            state = await this.indexedDBAdapter.getCurrentState();
            if (state) {
              console.log('🎯 Current state loaded from IndexedDB backup');
            }
          } catch (error) {
            console.warn('⚠️ Failed to get current state from IndexedDB:', error);
          }
        }
        
        // 如果IndexedDB也为空或失败，最后尝试JSON
        if (!state) {
          const stateJson = localStorage.getItem('aiChatCurrentState');
          if (stateJson) {
            state = JSON.parse(stateJson);
            console.log('🎯 Current state loaded from JSON emergency backup');
          }
        }
      }

      console.log('🎯 Loaded current state:', state?.currentConversationId);
      return state;
    } catch (error) {
      console.error('❌ Failed to get current state:', error);
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
          console.warn('⚠️ Failed to persist SQLite to store, but core operation succeeded:', saveError);
        }
        sqliteSuccess = true;
        console.log('✅ Conversation deleted from SQLite:', conversationId);
      }
    } catch (error) {
      sqliteError = error;
      console.error('❌ Failed to delete conversation from SQLite:', error);
    }

    // IndexedDB备份删除（非关键）
    if (this.useIndexedDB && this.indexedDBAdapter) {
      try {
        await this.indexedDBAdapter.deleteConversation(conversationId);
        console.log('✅ Conversation deleted from IndexedDB backup:', conversationId);
      } catch (error) {
        console.warn('⚠️ Failed to delete conversation from IndexedDB backup:', error);
      }
    }

    // JSON备份删除（应急备份，非关键）
    try {
      await this.deleteConversationFromJSON(conversationId);
      console.log('✅ Conversation deleted from JSON backup:', conversationId);
    } catch (error) {
      console.warn('⚠️ Failed to delete conversation from JSON backup:', error);
    }

    // 只有主存储（SQLite）失败时才抛出错误
    if (!sqliteSuccess) {
      throw sqliteError || new Error('Failed to delete conversation from primary storage');
    }

    console.log('🗑️ Conversation deleted successfully:', conversationId);
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
      console.error('❌ Failed to save conversation to JSON:', error);
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
      console.warn('Unable to check storage space:', error);
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
        console.error('🚨 Storage quota exceeded! Cannot save data.');
        
        // 显示用户友好的错误信息，不自动删除任何数据
        const spaceInfo = this.checkStorageSpace();
        console.error('📊 Storage usage:', {
          used: Math.round(spaceInfo.used / 1024) + 'KB',
          total: Math.round(spaceInfo.total / 1024) + 'KB',
          usagePercent: Math.round((spaceInfo.used / spaceInfo.total) * 100) + '%'
        });
        
        console.error('💡 Solution: Please manually delete some old conversations to free up space.');
        
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
        console.error('❌ Failed to save to localStorage:', error);
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
        console.log('🔄 JSON message updated:', message.conversationId);
      } else {
        // 添加新消息
        messages.push(message);
        console.log('➕ JSON message added:', message.conversationId);
      }
      
      const success = this.safeSaveToLocalStorage(messagesKey, JSON.stringify(messages));
      if (!success) {
        throw new Error('Failed to save message due to storage constraints');
      }
    } catch (error) {
      console.error('❌ Failed to save message to JSON:', error);
      throw error; // 重新抛出错误，让调用者知道保存失败
    }
  }

  private async getConversationsFromJSON(): Promise<Conversation[]> {
    try {
      const conversationsJson = localStorage.getItem('aiChatConversationHistory');
      return conversationsJson ? JSON.parse(conversationsJson) : [];
    } catch (error) {
      console.error('❌ Failed to get conversations from JSON:', error);
      return [];
    }
  }

  private async getMessagesFromJSON(conversationId: string): Promise<ChatMessage[]> {
    try {
      const messagesKey = `aiChatMessages_${conversationId}`;
      const messagesJson = localStorage.getItem(messagesKey);
      return messagesJson ? JSON.parse(messagesJson) : [];
    } catch (error) {
      console.error('❌ Failed to get messages from JSON:', error);
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
      console.error('❌ Failed to delete conversation from JSON:', error);
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
      console.log('⚠️ Skipping sync: SQLite not available');
      return;
    }

    try {
      console.log('🔄 Starting data sync from backup storage to SQLite...');
      
      let conversations: Conversation[] = [];
      let syncedConversations = 0;
      let syncedMessages = 0;
      
      // 优先从IndexedDB获取数据
      if (this.useIndexedDB && this.indexedDBAdapter) {
        try {
          conversations = await this.indexedDBAdapter.getConversations();
          console.log(`📋 Found ${conversations.length} conversations in IndexedDB backup`);
        } catch (error) {
          console.warn('⚠️ Failed to get conversations from IndexedDB:', error);
        }
      }
      
      // 如果IndexedDB为空或失败，从JSON获取
      if (conversations.length === 0) {
        conversations = await this.getConversationsFromJSON();
        console.log(`📋 Found ${conversations.length} conversations in JSON backup`);
      }
      
      // 同步对话和消息
      for (const conversation of conversations) {
        try {
          await this.saveConversation(conversation);
          syncedConversations++;
          console.log(`✅ Synced conversation: ${conversation.title}`);
          
          // 获取消息，优先从IndexedDB
          let messages: ChatMessage[] = [];
          
          if (this.useIndexedDB && this.indexedDBAdapter) {
            try {
              messages = await this.indexedDBAdapter.getMessages(conversation.id);
              console.log(`📨 Found ${messages.length} messages in IndexedDB for: ${conversation.title}`);
            } catch (error) {
              console.warn(`⚠️ Failed to get messages from IndexedDB for ${conversation.id}:`, error);
            }
          }
          
          // 如果IndexedDB为空或失败，从JSON获取
          if (messages.length === 0) {
            messages = await this.getMessagesFromJSON(conversation.id);
            console.log(`📨 Found ${messages.length} messages in JSON for: ${conversation.title}`);
          }
          
          // 同步消息
          for (const message of messages) {
            try {
              await this.saveMessage(message);
              syncedMessages++;
            } catch (messageError) {
              console.error(`❌ Failed to sync message in conversation ${conversation.id}:`, messageError);
            }
          }
        } catch (conversationError) {
          console.error(`❌ Failed to sync conversation ${conversation.id}:`, conversationError);
        }
      }
      
      console.log(`✅ Backup sync completed: ${syncedConversations}/${conversations.length} conversations, ${syncedMessages} messages`);
    } catch (error) {
      console.error('❌ Failed to sync backup data:', error);
      throw error;
    }
  }

  // 数据同步方法（从JSON同步到SQLite）- 保留用于向后兼容
  async syncFromJSONToSQLite(): Promise<void> {
    if (!this.useSQLite || !this.db) {
      console.log('⚠️ Skipping sync: SQLite not available');
      return;
    }

    try {
      console.log('🔄 Starting data sync from JSON to SQLite...');
      
      // 同步对话
      const conversations = await this.getConversationsFromJSON();
      console.log(`📋 Found ${conversations.length} conversations in JSON backup`);
      
      let syncedConversations = 0;
      let syncedMessages = 0;
      
      for (const conversation of conversations) {
        try {
          await this.saveConversation(conversation);
          syncedConversations++;
          console.log(`✅ Synced conversation: ${conversation.title}`);
          
          // 同步消息
          const messages = await this.getMessagesFromJSON(conversation.id);
          console.log(`📨 Found ${messages.length} messages for conversation: ${conversation.title}`);
          
          for (const message of messages) {
            try {
              await this.saveMessage(message);
              syncedMessages++;
            } catch (messageError) {
              console.error(`❌ Failed to sync message in conversation ${conversation.id}:`, messageError);
            }
          }
        } catch (conversationError) {
          console.error(`❌ Failed to sync conversation ${conversation.id}:`, conversationError);
        }
      }
      
      console.log(`✅ Data sync completed: ${syncedConversations}/${conversations.length} conversations, ${syncedMessages} messages`);
    } catch (error) {
      console.error('❌ Failed to sync data:', error);
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
      console.error('❌ Failed to get storage stats:', error);
      return {
        sqliteEnabled: this.useSQLite,
        indexedDBEnabled: this.useIndexedDB,
        conversationCount: 0,
        totalMessages: 0
      };
    }
  }
}

// 导出单例实例将在globalServices.ts中创建 