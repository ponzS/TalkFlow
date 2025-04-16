import { BehaviorSubject } from 'rxjs';
import { CapacitorSQLite, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { getCurrentInstance } from 'vue';
import { ISQLiteService } from './sqliteService';
import { IDbVersionService } from './dbVersionService';
import { LocalChatMessage, MessageStatus, MessageType, ChatPreview } from '../composables/TalkFlowCore';

// 核心类型
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

export interface MomentV2 {
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  isHidden: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

export interface LikeV2 {
  momentId: string;
  userPub: string;
  timestamp: number;
}

export interface CommentV2 {
  commentId: string;
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  replyToCommentId?: string;
  isDeleted?: number;
}

export interface IStorageService {
  initializeDatabase(): Promise<void>;
  saveUser(pubKey: string, alias?: string, avatar?: string, encryptedKeyPair?: string): Promise<void>;
  getUser(pubKey: string): Promise<{ pubKey: string; alias?: string; avatar?: string; encryptedKeyPair?: string } | null>;
  saveBuddy(
    userPub: string,
    buddyPub: string,
    addedByMe: boolean,
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
  saveMoment(moment: MomentV2): Promise<void>;
  getMoments(userPubs: string[], limit: number, beforeTimestamp?: number): Promise<MomentV2[]>;
  updateMomentVisibility(momentId: string, isHidden: boolean): Promise<void>;
  deleteMoment(momentId: string): Promise<void>;
  saveLike(like: LikeV2): Promise<void>;
  removeLike(momentId: string, userPub: string): Promise<void>;
  getLikes(momentId: string): Promise<string[]>;
  saveComment(comment: CommentV2): Promise<void>;
  getComments(momentId: string): Promise<CommentV2[]>;
  saveEpub(pub: string, epub: string): Promise<void>;
  getEpub(pub: string): Promise<string | null>;
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
    );`
  
      ],
    },
    {
      toVersion: 2,
      statements: [
      
        `CREATE TABLE IF NOT EXISTS network_peers (
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
      ],
    },
  ];

  momentsUpgrade = [
    {
      toVersion: 2,
      statements: [
        `CREATE TABLE IF NOT EXISTS moments_v2 (
          momentId TEXT PRIMARY KEY,
          userPub TEXT,
          content TEXT,
          timestamp INTEGER,
          isHidden INTEGER DEFAULT 0,
          mediaUrl TEXT,
          mediaType TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS likes_v2 (
          momentId TEXT,
          userPub TEXT,
          timestamp INTEGER,
          PRIMARY KEY (momentId, userPub)
        );`,
        `CREATE TABLE IF NOT EXISTS comments_v2 (
          commentId TEXT PRIMARY KEY,
          momentId TEXT,
          userPub TEXT,
          content TEXT,
          timestamp INTEGER,
          replyToCommentId TEXT,
          isDeleted INTEGER DEFAULT 0
        );`,
        `CREATE INDEX IF NOT EXISTS idx_moments_userPub_timestamp ON moments_v2 (userPub, timestamp);`,
        `CREATE INDEX IF NOT EXISTS idx_comments_momentId_timestamp ON comments_v2 (momentId, timestamp);`,
      ],
    },
  ];

  loadToVersion = 1;
  momentsVersion = 2;
  db!: SQLiteDBConnection;
  database: string = 'talkflowdb';
  sqliteServ!: ISQLiteService;
  dbVerServ!: IDbVersionService;
  isInitCompleted = new BehaviorSubject(false);
  appInstance = getCurrentInstance();
  platform!: string;
  private isInitialized = false;

  constructor(sqliteService: ISQLiteService, dbVersionService: IDbVersionService) {
    this.sqliteServ = sqliteService;
    this.dbVerServ = dbVersionService;
    this.platform = this.appInstance?.appContext.config.globalProperties.$platform || 'web';
  }

  async initializeDatabase(): Promise<void> {
    if (this.isInitialized) {
      console.log('数据库已初始化，跳过重复调用');
      return;
    }

    try {
      console.log('开始初始化数据库:', this.database);
      await this.sqliteServ.addUpgradeStatement({
        database: this.database,
        upgrade: this.versionUpgrades,
      });
      console.log('核心升级语句已添加');

      this.db = await this.sqliteServ.openDatabase(this.database, this.loadToVersion, false);
      console.log('数据库已打开，目标版本:', this.loadToVersion);

      const currentVersionResult = await this.db.getVersion();
      const currentVersion: number = currentVersionResult.version ?? 0;
      console.log('当前数据库版本:', currentVersion);

      for (const upgrade of this.versionUpgrades) {
        console.log(`执行核心升级到版本 ${upgrade.toVersion}`);
        for (const stmt of upgrade.statements) {
          try {
            await this.db.execute(stmt);
            console.log('执行语句成功:', stmt);
          } catch (err) {
            console.error('执行语句失败:', stmt, err);
            throw err;
          }
        }
      }
      this.dbVerServ.setDbVersion(this.database, this.loadToVersion);
      console.log('核心数据库版本已设置为:', this.loadToVersion);

      await this.initializeMoments();

      if (this.platform === 'web') {
        try {
          await this.sqliteServ.saveToStore(this.database);
          console.log('数据库已保存到 Web 存储');
        } catch (err) {
          console.warn('Web 存储保存失败（非致命错误）:', err);
        }
      }

      const tablesAfter = await this.db.query("SELECT name FROM sqlite_master WHERE type='table'");
      console.log('初始化后的表:', tablesAfter.values);
      this.isInitCompleted.next(true);
      this.isInitialized = true;
      console.log('SQLite 数据库初始化成功');
    } catch (error: any) {
      console.error(`storageService.initializeDatabase: ${error.message || error}`, error);
      throw new Error(`storageService.initializeDatabase: ${error.message || error}`);
    }
  }

  private async initializeMoments(): Promise<void> {
    console.log('开始初始化朋友圈模块');
    await this.sqliteServ.addUpgradeStatement({
      database: this.database,
      upgrade: this.momentsUpgrade,
    });
    console.log('朋友圈升级语句已添加');

    const currentVersionResult = await this.db.getVersion();
    const currentVersion: number = currentVersionResult.version ?? 0;

    if (currentVersion < this.momentsVersion) {
      for (const upgrade of this.momentsUpgrade.filter(u => u.toVersion > currentVersion)) {
        console.log(`执行朋友圈升级到版本 ${upgrade.toVersion}`);
        for (const stmt of upgrade.statements) {
          try {
            await this.db.execute(stmt);
            console.log('执行朋友圈语句成功:', stmt);
          } catch (err) {
            console.error('执行朋友圈语句失败:', stmt, err);
            throw err;
          }
        }
      }
      this.dbVerServ.setDbVersion(this.database, this.momentsVersion);
      console.log('朋友圈数据库版本已设置为:', this.momentsVersion);
    } else {
      console.log('朋友圈版本已是最新，无需升级');
    }
  }

  async saveUser(pubKey: string, alias?: string, avatar?: string, encryptedKeyPair?: string): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO users (pubKey, alias, avatar, encryptedKeyPair)
      VALUES (?, ?, ?, ?)
    `;
    try {
      await this.db.run(sql, [pubKey, alias || null, avatar || null, encryptedKeyPair || null]);
      console.log(`用户信息保存成功: ${pubKey}`);
    } catch (err) {
      console.error(`保存用户 ${pubKey} 失败:`, err);
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
      console.error(`查询用户 ${pubKey} 失败:`, err);
      throw err;
    }
  }

  async saveBuddy(
    userPub: string,
    buddyPub: string,
    addedByMe: boolean,
    timestamp: number,
    alias?: string,
    avatar?: string,
    epub?: string
  ): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO buddies (userPub, buddyPub, addedByMe, timestamp, alias, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    try {
      await this.db.run(sql, [userPub, buddyPub, addedByMe ? 1 : 0, timestamp, alias || null, avatar || null]);
      if (epub) {
        await this.saveEpub(buddyPub, epub);
      }
      console.log(`好友保存成功: ${userPub} -> ${buddyPub}, alias: ${alias}, avatar: ${avatar}, epub: ${epub}`);
    } catch (err) {
      console.error(`Failed to save buddy ${buddyPub} for ${userPub}:`, err);
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
      console.log(`从 SQLite 加载好友: ${userPub}, 数量: ${buddies.length}`, buddies);
      return buddies;
    } catch (err) {
      console.error(`Failed to get buddies for ${userPub}:`, err);
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
    //   const insertedIdResult = await this.db.query('SELECT last_insert_rowid() as id');
    //   const id = insertedIdResult.values![0].id;
    //   console.log(`消息插入成功: ${chatID}, id: ${id}, msgId: ${msg.msgId}, timestamp: ${msg.timestamp}`);
    //   return id;
    // } catch (err) {
    //   console.error(`插入消息 ${chatID} 失败:`, err);
    //   throw err;
    // }
    // 检查是否插入成功（如果已存在，changes 为 0）
    if (result.changes!.changes === 0) {
      console.log(`消息已存在，跳过插入: ${chatID}, msgId: ${msg.msgId}`);
      // 查询现有消息的 id
      const existing = await this.db.query('SELECT id FROM messages WHERE msgId = ?', [msg.msgId]);
      return existing.values![0].id;
    }
    const insertedIdResult = await this.db.query('SELECT last_insert_rowid() as id');
    const id = insertedIdResult.values![0].id;
    console.log(`消息插入成功: ${chatID}, id: ${id}, msgId: ${msg.msgId}, timestamp: ${msg.timestamp}`);
    return id;
  } catch (err) {
    console.error(`插入消息 ${chatID} 失败:`, err);
    throw err; // 保留抛出，以便上层处理
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
      console.log(`消息更新成功: ${chatID}, msgId: ${msgId}`);
    } catch (err) {
      console.error(`更新消息 ${chatID}:${msgId} 失败:`, err);
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
      console.error(`查询消息 ${chatID} 失败:`, err);
      throw err;
    }
  }

  async deleteMessage(chatID: string, id: number): Promise<void> {
    const sql = 'UPDATE messages SET deleted = 1 WHERE chatID = ? AND id = ?';
    try {
      await this.db.run(sql, [chatID, id]);
      console.log(`消息标记为删除: ${chatID}, id: ${id}`);
    } catch (err) {
      console.error(`删除消息 ${chatID}:${id} 失败:`, err);
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
      console.log(`文件保存成功: ${file.fileId}, name: ${file.fileName}`);
    } catch (err) {
      console.error(`保存文件 ${file.fileId} 失败:`, err);
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
      console.error(`查询文件 ${fileId} 失败:`, err);
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
      console.log(`会话预览保存成功: ${preview.pub}`);
    } catch (err) {
      console.error(`保存会话预览 ${preview.pub} 失败:`, err);
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
      console.error(`查询会话预览 ${pub} 失败:`, err);
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
      console.error('查询所有会话预览失败:', err);
      throw err;
    }
  }

  async deleteChatPreview(pub: string): Promise<void> {
    const sql = 'DELETE FROM chat_previews WHERE pub = ?';
    try {
      await this.db.run(sql, [pub]);
      console.log(`会话预览删除成功: ${pub}`);
    } catch (err) {
      console.error(`删除会话预览 ${pub} 失败:`, err);
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
      console.log(`黑名单状态保存成功: ${pub}, isBlocked: ${isBlocked}`);
    } catch (err) {
      console.error(`保存黑名单 ${pub} 失败:`, err);
      throw err;
    }
  }

  async getBlacklist(): Promise<string[]> {
    const sql = `SELECT pub FROM blacklist WHERE isBlocked = 1`;
    try {
      const result = await this.db.query(sql);
      return result.values!.map(row => row.pub);
    } catch (err) {
      console.error('查询黑名单失败:', err);
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
      console.log(`备注信息保存成功: ${userPub} -> ${friendPub}, remark: ${remark}, remarkInfo: ${remarkInfo}`);
    } catch (err) {
      console.error(`保存备注 ${userPub} -> ${friendPub} 失败:`, err);
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
      console.log(`加载备注信息: ${userPub}, 数量: ${Object.keys(remarks).length}`, remarks);
      return remarks;
    } catch (err) {
      console.error(`加载备注 ${userPub} 失败:`, err);
      throw err;
    }
  }

  async saveMoment(moment: MomentV2): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO moments_v2 (momentId, userPub, content, timestamp, isHidden, mediaUrl, mediaType)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      await this.db.run(sql, [
        moment.momentId,
        moment.userPub,
        moment.content,
        moment.timestamp,
        moment.isHidden ? 1 : 0,
        moment.mediaUrl || null,
        moment.mediaType || null,
      ]);
      console.log(`新朋友圈动态保存成功: ${moment.momentId}`);
    } catch (err) {
      console.error(`保存动态 ${moment.momentId} 失败:`, err);
      throw err;
    }
  }

  async getMoments(userPubs: string[], limit: number, beforeTimestamp?: number): Promise<MomentV2[]> {
    let sql = `SELECT * FROM moments_v2 WHERE userPub IN (${userPubs.map(() => '?').join(',')})`;
    const params: any[] = [...userPubs];
    if (beforeTimestamp !== undefined) {
      sql += ' AND timestamp < ?';
      params.push(beforeTimestamp);
    }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    try {
      const result = await this.db.query(sql, params);
      const moments = result.values!.map(row => ({
        momentId: row.momentId,
        userPub: row.userPub,
        content: row.content,
        timestamp: row.timestamp,
        isHidden: row.isHidden,
        mediaUrl: row.mediaUrl,
        mediaType: row.mediaType as 'image' | 'video' | 'audio' | undefined,
      }));
      console.log('查询朋友圈动态:', moments);
      return moments;
    } catch (err) {
      console.error('查询朋友圈动态失败:', err);
      return [];
    }
  }

  async updateMomentVisibility(momentId: string, isHidden: boolean): Promise<void> {
    const sql = 'UPDATE moments_v2 SET isHidden = ? WHERE momentId = ?';
    try {
      await this.db.run(sql, [isHidden ? 1 : 0, momentId]);
      console.log(`新朋友圈动态可见性更新: ${momentId}, isHidden: ${isHidden}`);
    } catch (err) {
      console.error(`更新动态可见性 ${momentId} 失败:`, err);
      throw err;
    }
  }

  async deleteMoment(momentId: string): Promise<void> {
    try {
      await this.db.run('DELETE FROM moments_v2 WHERE momentId = ?', [momentId]);
      await this.db.run('DELETE FROM likes_v2 WHERE momentId = ?', [momentId]);
      await this.db.run('DELETE FROM comments_v2 WHERE momentId = ?', [momentId]);
      console.log(`新朋友圈动态删除成功: ${momentId}`);
    } catch (err) {
      console.error(`删除动态 ${momentId} 失败:`, err);
      throw err;
    }
  }

  async saveLike(like: LikeV2): Promise<void> {
    const sql = 'INSERT OR IGNORE INTO likes_v2 (momentId, userPub, timestamp) VALUES (?, ?, ?)';
    try {
      await this.db.run(sql, [like.momentId, like.userPub, like.timestamp]);
      console.log(`新朋友圈点赞保存成功: ${like.momentId} by ${like.userPub}`);
    } catch (err) {
      console.error(`保存点赞 ${like.momentId} 失败:`, err);
      throw err;
    }
  }

  async removeLike(momentId: string, userPub: string): Promise<void> {
    const sql = 'DELETE FROM likes_v2 WHERE momentId = ? AND userPub = ?';
    try {
      await this.db.run(sql, [momentId, userPub]);
      console.log(`新朋友圈取消点赞: ${momentId} by ${userPub}`);
    } catch (err) {
      console.error(`取消点赞 ${momentId} 失败:`, err);
      throw err;
    }
  }

  async getLikes(momentId: string): Promise<string[]> {
    const sql = 'SELECT userPub FROM likes_v2 WHERE momentId = ?';
    try {
      const result = await this.db.query(sql, [momentId]);
      const likes = result.values?.map((row: any) => row.userPub) || [];
      console.log(`查询点赞 ${momentId}:`, likes);
      return likes;
    } catch (err) {
      console.error(`查询点赞 ${momentId} 失败:`, err);
      return [];
    }
  }

  async saveComment(comment: CommentV2): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO comments_v2 (commentId, momentId, userPub, content, timestamp, replyToCommentId, isDeleted)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      await this.db.run(sql, [
        comment.commentId,
        comment.momentId,
        comment.userPub,
        comment.content,
        comment.timestamp,
        comment.replyToCommentId || null,
        comment.isDeleted ? 1 : 0,
      ]);
      console.log(`新朋友圈评论保存成功: ${comment.commentId}`);
    } catch (err) {
      console.error(`保存评论 ${comment.commentId} 失败:`, err);
      throw err;
    }
  }

  async getComments(momentId: string): Promise<CommentV2[]> {
    const sql = 'SELECT * FROM comments_v2 WHERE momentId = ? ORDER BY timestamp DESC';
    try {
      const result = await this.db.query(sql, [momentId]);
      const comments = result.values!.map(row => ({
        commentId: row.commentId,
        momentId: row.momentId,
        userPub: row.userPub,
        content: row.content,
        timestamp: row.timestamp,
        replyToCommentId: row.replyToCommentId,
        isDeleted: row.isDeleted,
      }));
      console.log(`查询评论 ${momentId}:`, comments);
      return comments;
    } catch (err) {
      console.error(`查询评论 ${momentId} 失败:`, err);
      return [];
    }
  }

  async saveEpub(pub: string, epub: string): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO epubs (pub, epub)
      VALUES (?, ?)
    `;
    try {
      await this.db.run(sql, [pub, epub]);
      console.log(`Epub 保存成功: ${pub}`);
    } catch (err) {
      console.error(`保存 epub ${pub} 失败:`, err);
      throw err;
    }
  }

  async getEpub(pub: string): Promise<string | null> {
    const sql = `SELECT epub FROM epubs WHERE pub = ?`;
    try {
      const result = await this.db.query(sql, [pub]);
      if (result.values!.length > 0) {
        console.log(`从本地获取 epub: ${pub}, 值: ${result.values![0].epub}`);
        return result.values![0].epub;
      }
      console.log(`本地未找到 epub: ${pub}`);
      return null;
    } catch (err) {
      console.error(`查询 epub ${pub} 失败:`, err);
      throw err;
    }
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    try {
      return await this.db.query(sql, params);
    } catch (err) {
      console.error(`执行查询 ${sql} 失败:`, err);
      throw err;
    }
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    try {
      return await this.db.run(sql, params);
    } catch (err) {
      console.error(`执行语句 ${sql} 失败:`, err);
      throw err;
    }
  }

  async execute(sql: string): Promise<any> {
    try {
      return await this.db.execute(sql);
    } catch (err) {
      console.error(`执行语句 ${sql} 失败:`, err);
      throw err;
    }
  }
}

export default StorageService;