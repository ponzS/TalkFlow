import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { MessageType, MessageStatus } from '../types/chat';

export interface GroupMessage {
  id?: number;
  msgId: string;
  groupPub: string;
  fromPub: string;
  fromAlias?: string;
  type: MessageType;
  content: string;
  timestamp: number;
  sent: boolean;
  status: MessageStatus;
  created_at?: string;
}

export interface GroupPreview {
  groupPub: string;
  groupName?: string;
  lastMsg: string;
  lastTime: number;
  hasNew: boolean;
  memberCount?: number;
}

export class GroupStorageService {
  private db: SQLiteDBConnection;

  constructor(database: SQLiteDBConnection) {
    this.db = database;
  }

  // ==================== 群聊消息管理 ====================

  /**
   * 保存群聊消息到SQLite（带事务冲突保护）
   */
  async saveGroupMessage(message: GroupMessage): Promise<number> {
    const sql = `
      INSERT OR REPLACE INTO group_messages (
        msgId, groupPub, fromPub, fromAlias, type, content, 
        timestamp, sent, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    // 🔧 添加重试机制和事务冲突保护
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 🛡️ 检查数据库连接状态
        const isOpen = await this.db.isDBOpen();
        if (!isOpen) {
          console.warn('数据库连接已关闭，跳过保存');
          return 0;
        }
        
        const result = await this.db.run(sql, [
          message.msgId,
          message.groupPub,
          message.fromPub,
          message.fromAlias || null,
          message.type,
          message.content,
          message.timestamp,
          message.sent ? 1 : 0,
          message.status || 'pending'
        ]);

        const insertedId = result.changes?.lastId || 0;
        console.log(`✅ 群聊消息保存成功: ${message.groupPub.slice(0,8)}, msgId: ${message.msgId.slice(0,8)}, id: ${insertedId}`);
        return insertedId;
        
      } catch (error: any) {
        retryCount++;
        
        // 🔧 处理事务冲突错误
        if (error.message?.includes('transaction') || error.message?.includes('BeginTransaction')) {
          console.warn(`⚠️ 事务冲突，重试 ${retryCount}/${maxRetries}:`, error.message);
          
          if (retryCount < maxRetries) {
            // 等待随机时间后重试，避免并发冲突
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            continue;
          }
        }
        
        console.error(`❌ 保存群聊消息失败 (重试${retryCount}次):`, error);
        
        // 🔧 非致命错误，返回0而不是抛出异常
        if (retryCount >= maxRetries) {
          console.warn('🛡️ 达到最大重试次数，跳过此消息保存');
          return 0;
        }
      }
    }
    
    return 0;
  }

  /**
   * 获取群聊消息列表（分页）- 支持基于ID和timestamp的分页
   */
  async getGroupMessages(
    groupPub: string, 
    limit: number = 50, 
    beforeId?: number,
    beforeTimestamp?: number,
    order: 'ASC' | 'DESC' = 'DESC'
  ): Promise<GroupMessage[]> {
    let sql = `
      SELECT * FROM group_messages 
      WHERE groupPub = ?
    `;
    const params: any[] = [groupPub];

    // 🔧 优先使用ID分页（像私聊一样），提高准确性
    if (beforeId !== undefined) {
      sql += ` AND id < ?`;
      params.push(beforeId);
    } else if (beforeTimestamp !== undefined) {
      sql += ` AND timestamp < ?`;
      params.push(beforeTimestamp);
    }

    // 🔧 使用ID排序，确保消息顺序的准确性
    sql += ` ORDER BY id ${order} LIMIT ?`;
    params.push(limit);

    try {
      const result = await this.db.query(sql, params);
      const messages = result.values?.map(row => ({
        id: row.id,
        msgId: row.msgId,
        groupPub: row.groupPub,
        fromPub: row.fromPub,
        fromAlias: row.fromAlias,
        type: row.type as MessageType,
        content: row.content,
        timestamp: row.timestamp,
        sent: Boolean(row.sent),
        status: row.status as MessageStatus,
        created_at: row.created_at
      })) || [];

      console.log(`📚 获取群聊消息: ${groupPub}, 数量: ${messages.length}, beforeId: ${beforeId}, order: ${order}`);
      
      // 如果是DESC，需要反转为升序（老到新）
      return order === 'DESC' ? messages.reverse() : messages;
    } catch (error) {
      console.error('获取群聊消息失败:', error);
      return [];
    }
  }

  /**
   * 更新消息状态
   */
  async updateMessageStatus(msgId: string, status: MessageStatus, sent: boolean = true): Promise<void> {
    const sql = `
      UPDATE group_messages 
      SET status = ?, sent = ?
      WHERE msgId = ?
    `;

    try {
      await this.db.run(sql, [status, sent ? 1 : 0, msgId]);
      console.log(`消息状态更新成功: ${msgId} -> ${status}`);
    } catch (error) {
      console.error('更新消息状态失败:', error);
      throw error;
    }
  }

  /**
   * 删除群聊消息
   */
  async deleteGroupMessage(msgId: string): Promise<void> {
    const sql = `DELETE FROM group_messages WHERE msgId = ?`;
    
    try {
      await this.db.run(sql, [msgId]);
      console.log(`群聊消息删除成功: ${msgId}`);
    } catch (error) {
      console.error('删除群聊消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取群聊最新消息（用于预览）
   */
  async getLatestGroupMessage(groupPub: string): Promise<GroupMessage | null> {
    const sql = `
      SELECT * FROM group_messages 
      WHERE groupPub = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `;

    try {
      const result = await this.db.query(sql, [groupPub]);
      if (result.values && result.values.length > 0) {
        const row = result.values[0];
        return {
          id: row.id,
          msgId: row.msgId,
          groupPub: row.groupPub,
          fromPub: row.fromPub,
          fromAlias: row.fromAlias,
          type: row.type as MessageType,
          content: row.content,
          timestamp: row.timestamp,
          sent: Boolean(row.sent),
          status: row.status as MessageStatus,
          created_at: row.created_at
        };
      }
      return null;
    } catch (error) {
      console.error('获取最新群聊消息失败:', error);
      return null;
    }
  }

  /**
   * 获取群聊消息数量
   */
  async getGroupMessageCount(groupPub: string): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM group_messages WHERE groupPub = ?`;
    
    try {
      const result = await this.db.query(sql, [groupPub]);
      return result.values?.[0]?.count || 0;
    } catch (error) {
      console.error('获取群聊消息数量失败:', error);
      return 0;
    }
  }

  /**
   * 清理旧消息（保留最新N条）
   */
  async cleanOldMessages(groupPub: string, keepCount: number = 1000): Promise<void> {
    const sql = `
      DELETE FROM group_messages 
      WHERE groupPub = ? 
      AND id NOT IN (
        SELECT id FROM group_messages 
        WHERE groupPub = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      )
    `;

    try {
      await this.db.run(sql, [groupPub, groupPub, keepCount]);
      console.log(`群聊旧消息清理完成: ${groupPub}, 保留: ${keepCount}条`);
    } catch (error) {
      console.error('清理旧消息失败:', error);
      throw error;
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量保存消息（用于迁移）
   */
  async batchSaveMessages(messages: GroupMessage[]): Promise<void> {
    if (messages.length === 0) return;

    const sql = `
      INSERT OR REPLACE INTO group_messages (
        msgId, groupPub, fromPub, fromAlias, type, content, 
        timestamp, sent, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    try {
      // 避免嵌套事务，直接批量插入
      for (const message of messages) {
        try {
          await this.db.run(sql, [
            message.msgId,
            message.groupPub,
            message.fromPub,
            message.fromAlias || null,
            message.type,
            message.content,
            message.timestamp,
            message.sent ? 1 : 0,
            message.status || 'pending'
          ]);
        } catch (insertError) {
          console.warn(`跳过重复消息: ${message.msgId}`, insertError);
          // 继续处理其他消息，不抛出错误
        }
      }
      
      console.log(`批量保存群聊消息完成: ${messages.length}条`);
    } catch (error) {
      console.error('批量保存消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有群聊的消息统计
   */
  async getAllGroupsMessageStats(): Promise<{ groupPub: string; messageCount: number; latestTimestamp: number }[]> {
    const sql = `
      SELECT 
        groupPub,
        COUNT(*) as messageCount,
        MAX(timestamp) as latestTimestamp
      FROM group_messages 
      GROUP BY groupPub 
      ORDER BY latestTimestamp DESC
    `;

    try {
      const result = await this.db.query(sql);
      return result.values?.map(row => ({
        groupPub: row.groupPub,
        messageCount: row.messageCount,
        latestTimestamp: row.latestTimestamp
      })) || [];
    } catch (error) {
      console.error('获取群聊统计失败:', error);
      return [];
    }
  }
} 