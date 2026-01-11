import { BehaviorSubject } from 'rxjs';
import { CapacitorSQLite, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { getCurrentInstance } from 'vue';
import { ISQLiteService } from './sqliteService';
import { IDbVersionService } from './dbVersionService';
import { LocalChatMessage, MessageStatus, MessageType, ChatPreview } from '../composables/TalkFlowCore';

export interface Buddy {
  pub: string;
  addedByMe: boolean;
  timestamp: number;
  alias?: string;
  avatar?: string;
  epub?: string;
}

export interface FileData {
  fileId: string;
  chatID: string;
  sender: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  timestamp: number;
}


export interface IStorageService {
  initializeDatabase(): Promise<void>;
  saveUser(pubKey: string, alias?: string, avatar?: string, encryptedKeyPair?: string): Promise<void>;
  getUser(pubKey: string): Promise<{ pubKey: string; alias?: string; avatar?: string; encryptedKeyPair?: string } | null>;
  saveBuddy(
    userPub: string,
    buddyPub: string,
    timestamp: number,
    alias?: string,
    avatar?: string,
    epub?: string
  ): Promise<void>;
  getBuddies(userPub: string): Promise<Buddy[]>;
  insertMessage(chatID: string, msg: LocalChatMessage): Promise<number>; // 使用 LocalChatMessage
  updateMessage(chatID: string, msgId: string, msg: LocalChatMessage): Promise<void>; // 使用 LocalChatMessage
  getMessages(chatID: string, limit?: number, beforeId?: number, order?: 'ASC' | 'DESC'): Promise<LocalChatMessage[]>;
  deleteMessage(chatID: string, id: number): Promise<void>;
  saveFile(file: FileData): Promise<void>;
  getFile(fileId: string): Promise<FileData | null>;
  saveChatPreview(preview: ChatPreview): Promise<void>;
  getChatPreview(pub: string): Promise<ChatPreview | null>;
  getAllChatPreviews(): Promise<ChatPreview[]>;
  deleteChatPreview(pub: string): Promise<void>;
  query(sql: string, params?: any[]): Promise<any>;
  run(sql: string, params?: any[]): Promise<any>;
  execute(sql: string): Promise<any>;
  saveBlacklist(pub: string, isBlocked: boolean): Promise<void>;
  getBlacklist(): Promise<string[]>;
  saveFriendRemark(userPub: string, friendPub: string, remark: string, remarkInfo: string): Promise<void>;
  getFriendRemarks(userPub: string): Promise<Record<string, { remark: string; remarkInfo: string }>>;

  getDatabaseName(): string;
  saveEpub(pub: string, epub: string): Promise<void>;
  getEpub(pub: string): Promise<string | null>;
  cleanupInvalidEpubs(): Promise<number>;

  // 模态窗口状态持久化
  saveModalState(userPub: string, component: string, history: string[]): Promise<void>;
  getModalState(userPub: string): Promise<{ component: string; history: string[] } | null>;

  // Group Methods
  saveGroup(group: { group_pub: string; name: string; key_pair_json: string; joined_at?: number }): Promise<void>;
  getGroup(group_pub: string): Promise<any | null>;
  getAllGroups(): Promise<any[]>;
  deleteGroup(group_pub: string): Promise<void>;

  // Group Member Methods
  saveGroupMember(member: { group_pub: string; member_pub: string; alias: string; joined_at: number }): Promise<void>;
  getGroupMembers(group_pub: string): Promise<any[]>;
  deleteGroupMember(group_pub: string, member_pub: string): Promise<void>;

  // Group Message Methods
  insertGroupMessage(message: any): Promise<any>; // Returns the inserted message with its new 'id'
  updateGroupMessageStatus(msg_id: string, status: 'sent' | 'failed'): Promise<void>;
  getGroupMessages(group_pub: string, limit: number, beforeId?: number): Promise<any[]>;
  clearGroupMessages(group_pub: string): Promise<void>;
  cleanupInvalidGroupMessages(group_pub: string): Promise<void>; // 新增：清理无效消息

  // Group Preview Methods
  updateGroupPreview(group_pub: string, content: string, timestamp: number): Promise<void>;
  getGroupPreview(group_pub: string): Promise<{ last_msg: string; last_time: number } | null>;
  getAllGroupPreviews(): Promise<Array<{ group_pub: string; last_msg: string; last_time: number }>>;
  deleteGroupPreview(group_pub: string): Promise<void>;
  
  versionUpgrades,
  loadToVersion
  
}

class StorageService implements IStorageService {
  versionUpgrades = [
    {
      toVersion: 1,
      statements: [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pubKey TEXT UNIQUE,
          alias TEXT,
          avatar TEXT,
          priv TEXT,
          epub TEXT, 
          epriv TEXT, 
          encryptedKeyPair TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS buddies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userPub TEXT,
          buddyPub TEXT,
          addedByMe INTEGER DEFAULT 1,
          timestamp INTEGER,
          alias TEXT,
          avatar TEXT,
          remark TEXT,
          remarkInfo TEXT,
          UNIQUE(userPub, buddyPub)
        );`,
        `CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatID TEXT NOT NULL,
          msgId TEXT UNIQUE,
          sender TEXT NOT NULL,
          type TEXT NOT NULL,
          content TEXT,
          timestamp INTEGER NOT NULL,
          deleted INTEGER DEFAULT 0,
          duration INTEGER,
          status TEXT DEFAULT 'pending',
          isSending INTEGER DEFAULT 0,
          fileId TEXT,
          textForBuddy TEXT,
          textForMe TEXT,
          audioForBuddy TEXT,
          audioForMe TEXT,
          signature TEXT,
          hash TEXT,
          sent INTEGER DEFAULT 0
        );`,
        `CREATE INDEX IF NOT EXISTS idx_messages_chatID_id ON messages (chatID, id);`,
        `CREATE INDEX IF NOT EXISTS idx_messages_chatID_timestamp ON messages (chatID, timestamp);`,
        `CREATE TABLE IF NOT EXISTS files (
          fileId TEXT PRIMARY KEY,
          chatID TEXT,
          sender TEXT,
          fileName TEXT,
          fileSize INTEGER,
          fileType TEXT,
          fileUrl TEXT,
          timestamp INTEGER
        );`,
        `CREATE TABLE IF NOT EXISTS credentials (
          key TEXT PRIMARY KEY,
          value TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS sent_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fromPub TEXT,
          toPub TEXT,
          timestamp INTEGER
        );`,
        `CREATE TABLE IF NOT EXISTS chat_previews (
          pub TEXT PRIMARY KEY,
          lastMsg TEXT,
          lastTime TEXT,
          hidden INTEGER DEFAULT 0,
          hasNew INTEGER DEFAULT 0
        );`,
        `CREATE TABLE IF NOT EXISTS blacklist (
          pub TEXT PRIMARY KEY,
          isBlocked INTEGER DEFAULT 0
        );`,
        `CREATE TABLE IF NOT EXISTS friend_remarks (
          userPub TEXT,
          friendPub TEXT,
          remark TEXT,
          remarkInfo TEXT,
          PRIMARY KEY (userPub, friendPub)
        );`,
        `CREATE TABLE IF NOT EXISTS epubs (
          pub TEXT PRIMARY KEY,
          epub TEXT NOT NULL
        );`,
        `CREATE TABLE IF NOT EXISTS deactivated_accounts (
      pub_key TEXT PRIMARY KEY
    );`,
    `CREATE TABLE IF NOT EXISTS requests_viewed (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      viewed INTEGER DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS ai_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS network_peers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT UNIQUE,
          is_enabled INTEGER DEFAULT 0,
          note TEXT DEFAULT ''
        );`,
      
        `CREATE TABLE IF NOT EXISTS gun_nodes (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          timestamp INTEGER DEFAULT (strftime('%s', 'now'))
        );`,
        `CREATE TABLE IF NOT EXISTS modal_states (
          userPub TEXT PRIMARY KEY,
          currentComponent TEXT NOT NULL,
          componentHistory TEXT NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
        );`,
        `CREATE TABLE IF NOT EXISTS group_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          msgId TEXT UNIQUE NOT NULL,
          groupPub TEXT NOT NULL,
          fromPub TEXT NOT NULL,
          fromAlias TEXT,
          type TEXT NOT NULL DEFAULT 'text',
          content TEXT,
          timestamp INTEGER NOT NULL,
          sent BOOLEAN DEFAULT 0,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
     
        `CREATE INDEX IF NOT EXISTS idx_group_messages_group_timestamp 
          ON group_messages(groupPub, timestamp DESC);`,

          `CREATE TABLE IF NOT EXISTS groups (
            group_pub TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key_pair_json TEXT NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );`,
  
  
          `CREATE TABLE IF NOT EXISTS group_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_pub TEXT NOT NULL,
            member_pub TEXT NOT NULL,
            alias TEXT,
            role TEXT DEFAULT 'member',
            joined_at INTEGER,
            FOREIGN KEY (group_pub) REFERENCES groups (group_pub) ON DELETE CASCADE,
            UNIQUE(group_pub, member_pub)
        );`,
  
          `DROP TABLE IF EXISTS group_messages;`,
          `CREATE TABLE IF NOT EXISTS group_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            msg_id TEXT UNIQUE,
            group_pub TEXT NOT NULL,
            sender_pub TEXT NOT NULL,
            sender_alias TEXT,
            content TEXT,
            content_type TEXT DEFAULT 'text',
            timestamp INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (group_pub) REFERENCES groups (group_pub) ON DELETE CASCADE
        );`,
  
      
          `CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_pub);`,
          `CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages (group_pub, id DESC);`,

          `CREATE TABLE IF NOT EXISTS group_previews (
            group_pub TEXT PRIMARY KEY,
            last_msg TEXT,
            last_time INTEGER,
            FOREIGN KEY (group_pub) REFERENCES groups (group_pub) ON DELETE CASCADE
          );`,
          `CREATE INDEX IF NOT EXISTS idx_group_previews_time ON group_previews(last_time DESC);`,
          `
          CREATE TABLE IF NOT EXISTS message_queue (
            id TEXT PRIMARY KEY,
            chatId TEXT NOT NULL,
            networkMsg TEXT NOT NULL,
            retryCount INTEGER DEFAULT 0,
            nextRetryTime INTEGER NOT NULL,
            createdAt INTEGER NOT NULL,
            lastAttempt INTEGER DEFAULT 0,
            error TEXT
          );
          
          CREATE INDEX IF NOT EXISTS idx_message_queue_retry_time 
          ON message_queue(nextRetryTime);
          
          CREATE INDEX IF NOT EXISTS idx_message_queue_chat_id 
          ON message_queue(chatId);
        `
      ],
    },
    {
      toVersion: 2,
      statements: [
        `ALTER TABLE group_messages ADD COLUMN duration INTEGER;`
      ],
    },
    {
      toVersion: 3,
      statements: [
        `ALTER TABLE groups ADD COLUMN joined_at INTEGER DEFAULT 0;`,
        `UPDATE groups SET joined_at = strftime('%s', 'now') * 1000 WHERE joined_at = 0;`
      ],
    },
 
   
  ];

  loadToVersion = 3;

  db!: SQLiteDBConnection;
  database: string = 'talkflowdb';
  sqliteServ!: ISQLiteService;
  dbVerServ!: IDbVersionService;
  isInitCompleted = new BehaviorSubject(false);
  appInstance = getCurrentInstance();
  platform!: string;
  private isInitialized = false;
  private dbOpChain: Promise<void> = Promise.resolve();

  private enqueueDbOp<T>(op: () => Promise<T>): Promise<T> {
    const run = this.dbOpChain.then(op, op);
    this.dbOpChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private wrapDb(db: SQLiteDBConnection): SQLiteDBConnection {
    const enqueue = this.enqueueDbOp.bind(this);
    return new Proxy(db as any, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if ((prop === 'run' || prop === 'query' || prop === 'execute') && typeof value === 'function') {
          return (...args: any[]) => enqueue(() => value.apply(target, args));
        }
        return value;
      },
    }) as any;
  }
 

  constructor(sqliteService: ISQLiteService, dbVersionService: IDbVersionService) {
    this.sqliteServ = sqliteService;
    this.dbVerServ = dbVersionService;
    this.platform = Capacitor.getPlatform();
    // console.log(`[StorageService] 平台检测: ${this.platform}`);
    this.setupPageLifecycleHandlers();
  }

  // 自动保存到存储（仅在web平台需要）
  private async autoSaveToStore(): Promise<void> {
    if (this.platform === 'web') {
      try {
        await this.sqliteServ.saveToStore(this.database);
       // console.log('✅ [StorageService] Data automatically saved to IndexedDB');
      } catch (error) {
        // console.warn('⚠️ [StorageService] Failed to auto-save to IndexedDB:', error);
        // 不抛出错误，避免影响主要操作
      }
    }
  }

  // 设置页面生命周期处理器
  private setupPageLifecycleHandlers(): void {
    if (this.platform === 'web') {
      // 页面卸载前保存数据
      window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
      // 页面隐藏时保存数据
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      // 页面失去焦点时保存数据
      window.addEventListener('blur', this.handlePageBlur.bind(this));
    }
  }

  // 处理页面卸载
  private async handlePageUnload(): Promise<void> {
    try {
      await this.autoSaveToStore();
     // console.log('✅ [StorageService] Data saved on page unload');
    } catch (error) {
     // console.warn('⚠️ [StorageService] Failed to save data on page unload:', error);
    }
  }

  // 处理页面可见性变化
  private async handleVisibilityChange(): Promise<void> {
    if (document.hidden) {
      try {
        await this.autoSaveToStore();
     // console.log('✅ [StorageService] Data saved on page hidden');
      } catch (error) {
       // console.warn('⚠️ [StorageService] Failed to save data on page hidden:', error);
      }
    }
  }

  // 处理页面失去焦点
  private async handlePageBlur(): Promise<void> {
    try {
      await this.autoSaveToStore();
    // console.log('✅ [StorageService] Data saved on page blur');
    } catch (error) {
     // console.warn('⚠️ [StorageService] Failed to save data on page blur:', error);
    }
  }
  getDatabaseName(): string {
    return this.database;
  }
  async initializeDatabase(): Promise<void> {
  // console.log('🔧 [StorageService] Starting database initialization...');
    
    if (this.isInitialized) {
    // console.log('✅ [StorageService] Database already initialized, skipping...');
      return;
    }

    try {
     // console.log(`📊 [StorageService] Database name: ${this.database}`);
      // console.log(`📊 [StorageService] Target version: ${this.loadToVersion}`);
      
      // 检查数据库连接是否已经存在
       const isConnected = await this.sqliteServ.isConnection(this.database, false);
       // console.log(`🔍 [StorageService] Database connection exists: ${isConnected}`);
       
       if (!isConnected) {
         // console.log('🔧 [StorageService] No existing connection, adding upgrade statements...');
         await this.sqliteServ.addUpgradeStatement({
           database: this.database,
           upgrade: this.versionUpgrades,
         });
         // console.log('✅ [StorageService] Upgrade statements added');
       }

       // console.log('🔧 [StorageService] Opening/retrieving database connection...');
       const rawDb = await this.sqliteServ.openDatabase(this.database, this.loadToVersion, false);
       this.db = this.wrapDb(rawDb);
       // console.log('✅ [StorageService] Database connection established');

      // console.log('🔧 [StorageService] Setting database version...');
      this.dbVerServ.setDbVersion(this.database, this.loadToVersion);
      // console.log('✅ [StorageService] Database version set');

      this.isInitCompleted.next(true);
      this.isInitialized = true;
      // console.log('🎉 [StorageService] Database initialization completed successfully!');
    } catch (error: any) {
      // console.error('❌ [StorageService] Database initialization failed:', error);
      // console.error('📋 [StorageService] Error details:', {
      //   message: error.message,
      //   stack: error.stack,
      //   name: error.name,
      //   database: this.database,
      //   loadToVersion: this.loadToVersion
      // });
      throw new Error(`storageService.initializeDatabase: ${error.message || error}`);
    }
  }

  async saveUser(pubKey: string, alias?: string, avatar?: string, encryptedKeyPair?: string): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO users (pubKey, alias, avatar, encryptedKeyPair)
      VALUES (?, ?, ?, ?)
    `;
    try {
      await this.db.run(sql, [pubKey, alias || null, avatar || null, encryptedKeyPair || null]);
      await this.autoSaveToStore();
      // console.log(`用户信息保存成功: ${pubKey}`);
    } catch (err) {
      // console.error(`保存用户 ${pubKey} 失败:`, err);
      throw err;
    }
  }

  async getUser(pubKey: string): Promise<{ pubKey: string; alias?: string; avatar?: string; encryptedKeyPair?: string } | null> {
    const sql = `SELECT * FROM users WHERE pubKey = ?`;
    try {
      const result = await this.db.query(sql, [pubKey]);
      if (result.values!.length > 0) {
        const user = result.values![0];
        return {
          pubKey: user.pubKey,
          alias: user.alias,
          avatar: user.avatar,
          encryptedKeyPair: user.encryptedKeyPair,
        };
      }
      return null;
    } catch (err) {
      // console.error(`查询用户 ${pubKey} 失败:`, err);
      throw err;
    }
  }

  async saveBuddy(
    userPub: string,
    buddyPub: string,
    timestamp: number = Date.now(),
    alias?: string,
    avatar?: string,
    epub?: string
  ): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO buddies (userPub, buddyPub, timestamp, alias, avatar)
      VALUES (?, ?, ?, ?, ?)
    `;
    try {
      // 强制转换所有参数为String类型，避免undefined错误
      const safeUserPub = String(userPub || '');
      const safeBuddyPub = String(buddyPub || '');
      const safeTimestamp = String(timestamp || Date.now());
      const safeAlias = alias ? String(alias) : null;
      const safeAvatar = avatar ? String(avatar) : null;
      
      // console.log(`[StorageService] saveBuddy 参数分析:`, {
      //   userPub: safeUserPub ? `${safeUserPub.slice(0,8)}...` : 'empty',
      //   buddyPub: safeBuddyPub ? `${safeBuddyPub.slice(0,8)}...` : 'empty', 
      //   timestamp: safeTimestamp,
      //   alias: safeAlias || 'null',
      //   avatar: safeAvatar ? '有头像' : 'null',
      //   epub: epub ? '有epub' : 'null'
      // });
      
      // 使用强制转换后的安全参数
      const params = [safeUserPub, safeBuddyPub, safeTimestamp, safeAlias, safeAvatar];
      // console.log(`[StorageService] SQL参数详情:`, params.map((p, i) => `${i}: ${p === null ? 'null' : (p === undefined ? 'UNDEFINED' : typeof p)}`));
      
      await this.db.run(sql, params);
      
      if (epub) {
        await this.saveEpub(buddyPub, epub);
      }
      await this.autoSaveToStore();
      // console.log(`[StorageService] 好友保存成功: ${userPub} -> ${buddyPub}`);
    } catch (err) {
      // console.error(`[StorageService] Failed to save buddy ${buddyPub} for ${userPub}:`, err);
      throw err;
    }
  }

  async getBuddies(userPub: string): Promise<Buddy[]> {
    const sql = `
      SELECT b.*, e.epub
      FROM buddies b
      LEFT JOIN epubs e ON b.buddyPub = e.pub
      WHERE b.userPub = ?
    `;
    try {
      const result = await this.db.query(sql, [userPub]);
      const buddies: Buddy[] = result.values!.map((row) => ({
        pub: row.buddyPub,
        addedByMe: !!row.addedByMe,
        timestamp: row.timestamp,
        alias: row.alias,
        avatar: row.avatar,
        epub: row.epub,
      }));
      // console.log(`从 SQLite 加载好友: ${userPub}, 数量: ${buddies.length}`, buddies);
      return buddies;
    } catch (err) {
      // console.error(`Failed to get buddies for ${userPub}:`, err);
      return [];
    }
  }

  async insertMessage(chatID: string, msg: LocalChatMessage): Promise<number> {
    const sql = `
      INSERT INTO messages (
        chatID, msgId, sender, type, content, timestamp, duration, status, isSending, fileId,
        textForBuddy, textForMe, audioForBuddy, audioForMe, signature, hash, sent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const content = msg.text || msg.audioUrl || msg.fileId || msg.content || '';
    try {
      const result = await this.db.run(sql, [
        chatID,
        msg.msgId,
        msg.from,
        msg.type,
        content,
        msg.timestamp,
        msg.duration || null,
        msg.status || 'pending',
        msg.isSending ? 1 : 0,
        msg.fileId || null,
        msg.textForBuddy || null,
        msg.textForMe || null,
        msg.audioForBuddy || null,
        msg.audioForMe || null,
        msg.signature || null,
        msg.hash || null,
        msg.sent ? 1 : 0,
      ]);
  
    if (result.changes!.changes === 0) {
     // 消息已存在，跳过插入
      // 查询现有消息的 id
      const existing = await this.db.query('SELECT id FROM messages WHERE msgId = ?', [msg.msgId]);
      return existing.values![0].id;
    }
    const insertedIdResult = await this.db.query('SELECT last_insert_rowid() as id');
    const id = insertedIdResult.values![0].id;
    await this.autoSaveToStore();
  // 消息插入成功
    return id;
  } catch (err) {
  // 插入消息失败
    throw err; 
  }
  }

  async updateMessage(chatID: string, msgId: string, msg: LocalChatMessage): Promise<void> {
    const sql = `
      UPDATE messages SET
        sender = ?, 
        type = ?, 
        content = ?, 
        timestamp = ?, 
        duration = ?, 
        status = ?, 
        isSending = ?, 
        fileId = ?, 
        textForBuddy = ?, 
        textForMe = ?, 
        audioForBuddy = ?, 
        audioForMe = ?, 
        signature = ?, 
        hash = ?, 
        sent = ?
      WHERE chatID = ? AND msgId = ?
    `;
    const content = msg.text || msg.audioUrl || msg.fileId || msg.content || '';
    try {
      await this.db.run(sql, [
        msg.from,
        msg.type,
        content,
        msg.timestamp,
        msg.duration || null,
        msg.status || 'pending',
        msg.isSending ? 1 : 0,
        msg.fileId || null,
        msg.textForBuddy || null,
        msg.textForMe || null,
        msg.audioForBuddy || null,
        msg.audioForMe || null,
        msg.signature || null,
        msg.hash || null,
        msg.sent ? 1 : 0,
        chatID,
        msgId,
      ]);
      await this.autoSaveToStore();
    // 消息更新成功
    } catch (err) {
      // 更新消息失败
      throw err;
    }
  }

  async getMessages(chatID: string, limit: number = 10, beforeId?: number, order: 'ASC' | 'DESC' = 'ASC'): Promise<LocalChatMessage[]> {
    let sql = 'SELECT * FROM messages WHERE chatID = ? AND deleted = 0';
    const params: any[] = [chatID];
    if (beforeId !== undefined) {
      sql += order === 'ASC' ? ' AND id > ?' : ' AND id < ?';
      params.push(beforeId);
    }
    sql += ` ORDER BY id ${order} LIMIT ?`;
    params.push(limit);

    try {
      const result = await this.db.query(sql, params);
      return result.values!.map((row) => {
        const message: LocalChatMessage = {
          id: row.id,
          chatID: row.chatID,
          msgId: row.msgId,
          from: row.sender,
          type: row.type as MessageType,
          content: row.content,
          timestamp: row.timestamp,
          sent: row.sent === 1,
          status: row.status as MessageStatus,
          isSending: row.isSending === 1,
          duration: row.duration,
          fileId: row.fileId,
          textForBuddy: row.textForBuddy,
          textForMe: row.textForMe,
          audioForBuddy: row.audioForBuddy,
          audioForMe: row.audioForMe,
          signature: row.signature,
          hash: row.hash,
        };
        switch (row.type) {
          case 'text':
            message.text = row.content;
            break;
          case 'voice':
            message.audioUrl = row.content;
            break;
          case 'file':
            break;
        }
        return message;
      });
    } catch (err) {
     // 查询消息失败
      throw err;
    }
  }

  async deleteMessage(chatID: string, id: number): Promise<void> {
    const sql = 'UPDATE messages SET deleted = 1 WHERE chatID = ? AND id = ?';
    try {
      await this.db.run(sql, [chatID, id]);
      await this.autoSaveToStore();
     // 消息标记为删除
    } catch (err) {
     // 删除消息失败
      throw err;
    }
  }

  async saveFile(file: FileData): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO files (fileId, chatID, sender, fileName, fileSize, fileType, fileUrl, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      await this.db.run(sql, [
        file.fileId,
        file.chatID,
        file.sender,
        file.fileName,
        file.fileSize,
        file.fileType,
        file.fileUrl,
        file.timestamp,
      ]);
      await this.autoSaveToStore();
    // 文件保存成功
    } catch (err) {
     // 保存文件失败
      throw err;
    }
  }

  async getFile(fileId: string): Promise<FileData | null> {
    const sql = `SELECT * FROM files WHERE fileId = ?`;
    try {
      const result = await this.db.query(sql, [fileId]);
      if (result.values!.length > 0) {
        const row = result.values![0];
        return {
          fileId: row.fileId,
          chatID: row.chatID,
          sender: row.sender,
          fileName: row.fileName,
          fileSize: row.fileSize,
          fileType: row.fileType,
          fileUrl: row.fileUrl,
          timestamp: row.timestamp,
        };
      }
      return null;
    } catch (err) {
    // 查询文件失败
      throw err;
    }
  }

  async saveChatPreview(preview: ChatPreview): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO chat_previews (pub, lastMsg, lastTime, hidden, hasNew)
      VALUES (?, ?, ?, ?, ?)
    `;
    try {
      await this.db.run(sql, [
        preview.pub,
        preview.lastMsg,
        preview.lastTime,
        preview.hidden ? 1 : 0,
        preview.hasNew ? 1 : 0,
      ]);
      await this.autoSaveToStore();
    // 会话预览保存成功
    } catch (err) {
     // 保存会话预览失败
      throw err;
    }
  }

  async getChatPreview(pub: string): Promise<ChatPreview | null> {
    const sql = `SELECT * FROM chat_previews WHERE pub = ?`;
    try {
      const result = await this.db.query(sql, [pub]);
      if (result.values!.length > 0) {
        const row = result.values![0];
        return {
          pub: row.pub,
          lastMsg: row.lastMsg,
          lastTime: row.lastTime,
          hidden: row.hidden === 1,
          hasNew: row.hasNew === 1,
        };
      }
      return null;
    } catch (err) {
    // 查询会话预览失败
      throw err;
    }
  }

  async getAllChatPreviews(): Promise<ChatPreview[]> {
    const sql = `SELECT * FROM chat_previews`;
    try {
      const result = await this.db.query(sql);
      return result.values!.map((row) => ({
        pub: row.pub,
        lastMsg: row.lastMsg,
        lastTime: row.lastTime,
        hidden: row.hidden === 1,
        hasNew: row.hasNew === 1,
      }));
    } catch (err) {
     // 查询所有会话预览失败
      throw err;
    }
  }

  async deleteChatPreview(pub: string): Promise<void> {
    const sql = 'DELETE FROM chat_previews WHERE pub = ?';
    try {
      await this.db.run(sql, [pub]);
      await this.autoSaveToStore();
    // 会话预览删除成功
    } catch (err) {
     // 删除会话预览失败
      throw err;
    }
  }

  async saveBlacklist(pub: string, isBlocked: boolean): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO blacklist (pub, isBlocked)
      VALUES (?, ?)
    `;
    try {
      await this.db.run(sql, [pub, isBlocked ? 1 : 0]);
      await this.autoSaveToStore();
      // console.log(`黑名单状态保存成功: ${pub}, isBlocked: ${isBlocked}`);
    } catch (err) {
    // 保存黑名单失败
      throw err;
    }
  }

  async getBlacklist(): Promise<string[]> {
    const sql = `SELECT pub FROM blacklist WHERE isBlocked = 1`;
    try {
      const result = await this.db.query(sql);
      return result.values!.map(row => row.pub);
    } catch (err) {
    // 查询黑名单失败
      throw err;
    }
  }

  async saveFriendRemark(userPub: string, friendPub: string, remark: string, remarkInfo: string): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO friend_remarks (userPub, friendPub, remark, remarkInfo)
      VALUES (?, ?, ?, ?)
    `;
    try {
      await this.db.run(sql, [userPub, friendPub, remark || null, remarkInfo || null]);
      await this.autoSaveToStore();
     // 备注信息保存成功
    } catch (err) {
      // 保存备注失败
      throw err;
    }
  }

  async getFriendRemarks(userPub: string): Promise<Record<string, { remark: string; remarkInfo: string }>> {
    const sql = `SELECT friendPub, remark, remarkInfo FROM friend_remarks WHERE userPub = ?`;
    try {
      const result = await this.db.query(sql, [userPub]);
      const remarks: Record<string, { remark: string; remarkInfo: string }> = {};
      result.values!.forEach(row => {
        remarks[row.friendPub] = {
          remark: row.remark || '',
          remarkInfo: row.remarkInfo || ''
        };
      });
    // 加载备注信息
      return remarks;
    } catch (err) {
    // 加载备注失败
      throw err;
    }
  }


  async saveEpub(pub: string, epub: string): Promise<void> {
    // 验证和清理 epub 数据
    let cleanEpub = epub;
    
    // 如果 epub 是对象，尝试提取正确的 epub 值
    if (typeof epub === 'object') {
      console.warn('saveEpub received object instead of string:', epub);
      
      // 遍历对象的所有属性，寻找有效的 epub 值
      const epubObj = epub as any;
      let foundValidEpub = false;
      
      // 优先查找 epub 字段
      if (epubObj.epub && typeof epubObj.epub === 'string' && this.isValidEpubFormat(epubObj.epub)) {
        cleanEpub = epubObj.epub;
        foundValidEpub = true;
      } else {
        // 如果没有找到有效的 epub 字段，遍历所有字符串属性
        for (const [key, value] of Object.entries(epubObj)) {
          if (typeof value === 'string' && this.isValidEpubFormat(value)) {
            cleanEpub = value;
            foundValidEpub = true;
            console.log(`Found valid epub in field '${key}':`, value.substring(0, 50) + '...');
            break;
          }
        }
      }
      
      if (!foundValidEpub) {
        console.error('No valid epub found in object:', Object.keys(epubObj));
        throw new Error('No valid epub found in object');
      }
    }
    
    // 验证 epub 格式
    if (typeof cleanEpub !== 'string' || cleanEpub.length < 20) {
      console.error('Invalid epub format:', cleanEpub);
      throw new Error('Invalid epub format');
    }
    
    // 最终验证 epub 是否为有效格式
    if (!this.isValidEpubFormat(cleanEpub)) {
      console.error('Epub appears to be invalid data:', cleanEpub.substring(0, 100));
      throw new Error('Epub appears to be invalid data');
    }
    
    // 添加调试日志
    console.log('saveEpub - Saving epub:', {
      pub,
      epubPreview: cleanEpub.substring(0, 50) + '...',
      epubLength: cleanEpub.length
    });
    
    const sql = `
      INSERT OR REPLACE INTO epubs (pub, epub)
      VALUES (?, ?)
    `;
    try {
      await this.db.run(sql, [pub, cleanEpub]);
      await this.autoSaveToStore();
   // Epub 保存成功
    } catch (err) {
    // 保存 epub 失败
      throw err;
    }
  }
  
  private isValidEpubFormat(epub: string): boolean {
    // 检查是否为有效的 epub 格式
    return typeof epub === 'string' && 
           epub.length >= 40 && 
           !epub.includes('data:image') && 
           !epub.includes('alias') && 
           !epub.includes('avatar') && 
           !epub.includes('message') && 
           !epub.includes('timestamp') && 
           // 检查是否包含 Gun.js 的加密公钥格式（通常包含点号分隔符）
           epub.includes('.') &&
           // 确保不是 Gun.js 的引用路径格式
           !epub.startsWith('#');
  }

  async getEpub(pub: string): Promise<string | null> {
    const sql = `SELECT epub FROM epubs WHERE pub = ?`;
    try {
      const result = await this.db.query(sql, [pub]);
      if (result.values!.length > 0) {
        const epub = result.values![0].epub;
        
        // 验证获取到的 epub 是否有效
        if (this.isValidEpubFormat(epub)) {
          // 从本地获取 epub
          return epub;
        } else {
          // 如果数据无效，删除这条记录
          console.warn('Found invalid epub data, removing:', { pub, epubPreview: epub?.substring(0, 50) });
          await this.db.run('DELETE FROM epubs WHERE pub = ?', [pub]);
          return null;
        }
      }
    // 本地未找到 epub
      return null;
    } catch (err) {
    // 查询 epub 失败
      throw err;
    }
  }
  
  async cleanupInvalidEpubs(): Promise<number> {
    const sql = `SELECT pub, epub FROM epubs`;
    try {
      const result = await this.db.query(sql, []);
      let cleanedCount = 0;
      
      if (result.values && result.values.length > 0) {
        for (const row of result.values) {
          const { pub, epub } = row;
          
          // 检查 epub 是否无效
          if (!epub || !this.isValidEpubFormat(epub)) {
            
            console.log('Cleaning invalid epub:', { pub, epubPreview: epub?.substring(0, 50) });
            await this.db.run('DELETE FROM epubs WHERE pub = ?', [pub]);
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        await this.autoSaveToStore();
        console.log(`Cleaned up ${cleanedCount} invalid epub records`);
      }
      
      return cleanedCount;
    } catch (err) {
      console.error('Failed to cleanup invalid epubs:', err);
      throw err;
    }
  }


  

  async query(sql: string, params: any[] = []): Promise<any> {
    try {
      return await this.db.query(sql, params);
    } catch (err) {
      // 执行查询失败
      throw err;
    }
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    try {
      const result = await this.db.run(sql, params);
      // 检查是否是写入操作（INSERT, UPDATE, DELETE, REPLACE）
      const isWriteOperation = /^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(sql.trim());
      if (isWriteOperation) {
        await this.autoSaveToStore();
      }
      return result;
    } catch (err) {
      // 执行语句失败
      throw err;
    }
  }

  async execute(sql: string): Promise<any> {
    try {
      const result = await this.db.execute(sql);
      // 检查是否是写入操作（INSERT, UPDATE, DELETE, REPLACE）
      const isWriteOperation = /^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(sql.trim());
      if (isWriteOperation) {
        await this.autoSaveToStore();
      }
      return result;
    } catch (err) {
   // 执行语句失败
      throw err;
    }
  }

  // 模态窗口状态持久化实现
  async saveModalState(userPub: string, component: string, history: string[]): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO modal_states (userPub, currentComponent, componentHistory, updatedAt)
      VALUES (?, ?, ?, ?)
    `;
    try {
      const historyJson = JSON.stringify(history);
      const timestamp = Math.floor(Date.now() / 1000);
      await this.db.run(sql, [userPub, component, historyJson, timestamp]);
      await this.autoSaveToStore();
      // console.log(`模态窗口状态保存成功: ${userPub} -> ${component}`);
    } catch (err) {
      // 保存模态窗口状态失败
      throw err;
    }
  }

  async getModalState(userPub: string): Promise<{ component: string; history: string[] } | null> {
    const sql = `SELECT currentComponent, componentHistory FROM modal_states WHERE userPub = ?`;
    try {
      const result = await this.db.query(sql, [userPub]);
      if (result.values!.length > 0) {
        const row = result.values![0];
        const history = JSON.parse(row.componentHistory || '["DiscoverS"]');
        return {
          component: row.currentComponent,
          history: history,
        };
      }
      return null;
    } catch (err) {
      // 获取模态窗口状态失败
      return null;
    }
  }

  // Stubs for new group methods - to be implemented
  async saveGroup(group: { group_pub: string; name: string; key_pair_json: string; joined_at?: number }): Promise<void> {
    const sql = `INSERT OR REPLACE INTO groups (group_pub, name, key_pair_json, joined_at) VALUES (?, ?, ?, ?)`;
    const joinedAt = group.joined_at || Date.now();
    await this.db.run(sql, [group.group_pub, group.name, group.key_pair_json, joinedAt]);
    await this.autoSaveToStore();
  }
  async getGroup(group_pub: string): Promise<any | null> {
    const sql = `SELECT * FROM groups WHERE group_pub = ?`;
    const result = await this.db.query(sql, [group_pub]);
    return result.values!.length > 0 ? result.values![0] : null;
  }
  async getAllGroups(): Promise<any[]> {
    const sql = `SELECT * FROM groups`;
    const result = await this.db.query(sql);
    return result.values || [];
  }
  async deleteGroup(group_pub: string): Promise<void> {
    const sql = `DELETE FROM groups WHERE group_pub = ?`;
    await this.db.run(sql, [group_pub]);
    await this.autoSaveToStore();
  }
  async saveGroupMember(member: { group_pub: string; member_pub: string; alias: string; joined_at: number }): Promise<void> {
    const sql = `INSERT OR REPLACE INTO group_members (group_pub, member_pub, alias, joined_at) VALUES (?, ?, ?, ?)`;
    await this.db.run(sql, [member.group_pub, member.member_pub, member.alias, member.joined_at]);
    await this.autoSaveToStore();
  }
  async getGroupMembers(group_pub: string): Promise<any[]> {
    const sql = `SELECT * FROM group_members WHERE group_pub = ?`;
    const result = await this.db.query(sql, [group_pub]);
    return result.values || [];
  }
  async deleteGroupMember(group_pub: string, member_pub: string): Promise<void> {
    const sql = `DELETE FROM group_members WHERE group_pub = ? AND member_pub = ?`;
    await this.db.run(sql, [group_pub, member_pub]);
    await this.autoSaveToStore();
  }
  async insertGroupMessage(message: any): Promise<any> {
    const sql = `
      INSERT INTO group_messages (msg_id, group_pub, sender_pub, sender_alias, content, content_type, timestamp, status, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.run(sql, [
      message.msg_id,
      message.group_pub,
      message.sender_pub,
      message.sender_alias,
      message.content,
      message.content_type,
      message.timestamp,
      message.status,
      message.duration || null,
    ]);
   // await this.autoSaveToStore(); 
    const lastId = result.changes!.lastId;
    return { ...message, id: lastId };
  }
  async updateGroupMessageStatus(msg_id: string, status: 'sent' | 'failed'): Promise<void> {
    const sql = `UPDATE group_messages SET status = ? WHERE msg_id = ?`;
    await this.db.run(sql, [status, msg_id]);
    await this.autoSaveToStore();
  }
  async getGroupMessages(group_pub: string, limit: number, beforeId?: number): Promise<any[]> {
    let sql = `SELECT * FROM group_messages WHERE group_pub = ?`;
    const params: any[] = [group_pub];
    if (beforeId) {
      sql += ` AND id < ?`;
      params.push(beforeId);
    }
    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    const result = await this.db.query(sql, params);
    return result.values || [];
  }
  async clearGroupMessages(group_pub: string): Promise<void> {
    const sql = `DELETE FROM group_messages WHERE group_pub = ?`;
    await this.db.run(sql, [group_pub]);
    await this.autoSaveToStore();
  }

  async cleanupInvalidGroupMessages(group_pub: string): Promise<void> {
    const sql = `
      DELETE FROM group_messages 
      WHERE group_pub = ? 
      AND (
        content IS NULL 
        OR content = '' 
        OR TRIM(content) = '' 
        OR sender_pub IS NULL 
        OR sender_pub = '' 
        OR sender_alias IS NULL 
        OR sender_alias = ''
      )
    `;
    await this.db.run(sql, [group_pub]);
    await this.autoSaveToStore();
  }

  // Group Preview Methods Implementation
  async updateGroupPreview(group_pub: string, content: string, timestamp: number): Promise<void> {
    // Truncate to 20 chars with ellipsis
    const preview = content.length > 20 ? content.slice(0, 20) + '…' : content;
    const sql = `INSERT OR REPLACE INTO group_previews (group_pub, last_msg, last_time) VALUES (?, ?, ?)`;
    await this.db.run(sql, [group_pub, preview, timestamp]);
    await this.autoSaveToStore();
  }

  async getGroupPreview(group_pub: string): Promise<{ last_msg: string; last_time: number } | null> {
    const sql = `SELECT last_msg, last_time FROM group_previews WHERE group_pub = ?`;
    const result = await this.db.query(sql, [group_pub]);
    if (result.values && result.values.length > 0) {
      return {
        last_msg: result.values[0].last_msg,
        last_time: result.values[0].last_time
      };
    }
    return null;
  }

  async getAllGroupPreviews(): Promise<Array<{ group_pub: string; last_msg: string; last_time: number }>> {
    const sql = `SELECT group_pub, last_msg, last_time FROM group_previews ORDER BY last_time DESC`;
    const result = await this.db.query(sql);
    return result.values || [];
  }

  async deleteGroupPreview(group_pub: string): Promise<void> {
    const sql = `DELETE FROM group_previews WHERE group_pub = ?`;
    await this.db.run(sql, [group_pub]);
    await this.autoSaveToStore();
  }
}

export default StorageService;
