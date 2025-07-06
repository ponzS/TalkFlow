import { GroupStorageService, GroupMessage } from './groupStorageService';
import { MessageType, MessageStatus } from '../types/chat';

export interface LegacyGroupMessage {
  id?: string;
  from?: string;
  text?: string;
  timestamp?: number;
  type?: string;
  sent?: boolean;
  audio?: any;
  [key: string]: any;
}

export interface MigrationResult {
  success: boolean;
  migratedGroups: number;
  migratedMessages: number;
  errors: string[];
  details: {
    [groupPub: string]: {
      messageCount: number;
      success: boolean;
      error?: string;
    };
  };
}

export class GroupMigrationService {
  private groupStorage: GroupStorageService;

  constructor(groupStorageService: GroupStorageService) {
    this.groupStorage = groupStorageService;
  }

  /**
   * 执行完整的群聊数据迁移
   */
  async migrateAllGroupData(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedGroups: 0,
      migratedMessages: 0,
      errors: [],
      details: {}
    };

    console.log('🚀 开始群聊数据迁移...');

    try {
      // 1. 获取所有群聊数据
      const legacyGroupData = this.getAllLegacyGroupData();
      const groupPubs = Object.keys(legacyGroupData);

      console.log(`发现 ${groupPubs.length} 个群聊需要迁移`);

      // 2. 逐个迁移群聊
      for (const groupPub of groupPubs) {
        try {
          const groupMessages = legacyGroupData[groupPub];
          const migrationCount = await this.migrateGroupMessages(groupPub, groupMessages);
          
          result.migratedGroups++;
          result.migratedMessages += migrationCount;
          result.details[groupPub] = {
            messageCount: migrationCount,
            success: true
          };

          console.log(`✅ 群聊 ${groupPub} 迁移成功: ${migrationCount} 条消息`);
        } catch (error) {
          const errorMsg = `群聊 ${groupPub} 迁移失败: ${error}`;
          result.errors.push(errorMsg);
          result.details[groupPub] = {
            messageCount: 0,
            success: false,
            error: errorMsg
          };
          console.error('❌', errorMsg);
        }
      }

      // 3. 验证迁移结果
      await this.validateMigration(result);

      console.log(`🎉 群聊数据迁移完成!`);
      console.log(`- 迁移群聊: ${result.migratedGroups} 个`);
      console.log(`- 迁移消息: ${result.migratedMessages} 条`);
      console.log(`- 错误数量: ${result.errors.length} 个`);

    } catch (error) {
      result.success = false;
      result.errors.push(`迁移过程发生致命错误: ${error}`);
      console.error('💥 群聊数据迁移失败:', error);
    }

    return result;
  }

  /**
   * 迁移单个群聊的消息
   */
  private async migrateGroupMessages(groupPub: string, legacyMessages: any[]): Promise<number> {
    if (!Array.isArray(legacyMessages) || legacyMessages.length === 0) {
      return 0;
    }

    const convertedMessages: GroupMessage[] = [];

    // 转换消息格式
    for (const legacyMsg of legacyMessages) {
      try {
        const convertedMsg = this.convertLegacyMessage(groupPub, legacyMsg);
        if (convertedMsg) {
          convertedMessages.push(convertedMsg);
        }
      } catch (error) {
        console.warn(`消息转换失败:`, legacyMsg, error);
      }
    }

    // 批量保存到SQLite
    if (convertedMessages.length > 0) {
      await this.groupStorage.batchSaveMessages(convertedMessages);
    }

    return convertedMessages.length;
  }

  /**
   * 转换遗留消息格式为新格式
   */
  private convertLegacyMessage(groupPub: string, legacyMsg: LegacyGroupMessage): GroupMessage | null {
    if (!legacyMsg || !legacyMsg.from) {
      return null;
    }

    // 生成消息ID（如果没有）
    const msgId = legacyMsg.id || `migrated_${groupPub}_${legacyMsg.timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    // 确定消息类型和内容
    let type: MessageType = 'text';
    let content = '';

    if (legacyMsg.text) {
      type = 'text';
      content = legacyMsg.text;
    } else if (legacyMsg.audio) {
      type = 'voice';
      content = legacyMsg.audio.url || legacyMsg.audio.src || '';
    } else if (legacyMsg.type === 'file') {
      type = 'file';
      content = legacyMsg.fileUrl || legacyMsg.fileName || '';
    }

    return {
      msgId,
      groupPub,
      fromPub: legacyMsg.from,
      fromAlias: legacyMsg.fromAlias || legacyMsg.alias,
      type,
      content,
      timestamp: legacyMsg.timestamp || Date.now(),
      sent: legacyMsg.sent !== false, // 默认为true
      status: this.determineMsgStatus(legacyMsg)
    };
  }

  /**
   * 确定消息状态
   */
  private determineMsgStatus(legacyMsg: LegacyGroupMessage): MessageStatus {
    if (legacyMsg.sent === false) return 'pending';
    if (legacyMsg.status) return legacyMsg.status as MessageStatus;
    return 'sent'; // 默认状态
  }

  /**
   * 获取所有遗留群聊数据
   */
  private getAllLegacyGroupData(): { [groupPub: string]: any[] } {
    const groupData: { [groupPub: string]: any[] } = {};

    try {
      // 方法1: 查找 localStorage 中的群聊消息
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && this.isGroupMessageKey(key)) {
          const groupPub = this.extractGroupPubFromKey(key);
          if (groupPub) {
            try {
              const data = localStorage.getItem(key);
              if (data) {
                const messages = JSON.parse(data);
                if (Array.isArray(messages)) {
                  if (!groupData[groupPub]) groupData[groupPub] = [];
                  groupData[groupPub].push(...messages);
                }
              }
            } catch (error) {
              console.warn(`解析群聊数据失败: ${key}`, error);
            }
          }
        }
      }

      // 方法2: 查找特定的群聊数据结构
      const groupChatsKey = 'groupChats';
      const groupChatsData = localStorage.getItem(groupChatsKey);
      if (groupChatsData) {
        try {
          const parsedData = JSON.parse(groupChatsData);
          if (typeof parsedData === 'object') {
            Object.keys(parsedData).forEach(groupPub => {
              const messages = parsedData[groupPub];
              if (Array.isArray(messages)) {
                if (!groupData[groupPub]) groupData[groupPub] = [];
                groupData[groupPub].push(...messages);
              }
            });
          }
        } catch (error) {
          console.warn('解析群聊数据失败:', error);
        }
      }

    } catch (error) {
      console.error('获取遗留群聊数据失败:', error);
    }

    return groupData;
  }

  /**
   * 判断是否为群聊消息的key
   */
  private isGroupMessageKey(key: string): boolean {
    // 常见的群聊消息key模式
    const patterns = [
      /^group_messages_/,
      /^groupChat_/,
      /^group_.*_messages$/,
      /messages_group_/
    ];

    return patterns.some(pattern => pattern.test(key));
  }

  /**
   * 从key中提取群聊公钥
   */
  private extractGroupPubFromKey(key: string): string | null {
    // 尝试不同的模式提取群聊公钥
    const patterns = [
      /^group_messages_(.+)$/,
      /^groupChat_(.+)$/,
      /^group_(.+)_messages$/,
      /^messages_group_(.+)$/
    ];

    for (const pattern of patterns) {
      const match = key.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 验证迁移结果
   */
  private async validateMigration(result: MigrationResult): Promise<void> {
    try {
      const stats = await this.groupStorage.getAllGroupsMessageStats();
      const sqliteGroups = stats.length;
      const sqliteMessages = stats.reduce((sum, stat) => sum + stat.messageCount, 0);

      console.log('📊 迁移验证:');
      console.log(`- localStorage -> SQLite 群聊: ${result.migratedGroups} -> ${sqliteGroups}`);
      console.log(`- localStorage -> SQLite 消息: ${result.migratedMessages} -> ${sqliteMessages}`);

      // 更新结果状态
      result.success = result.success && (sqliteMessages > 0 || result.migratedMessages === 0);
    } catch (error) {
      console.warn('迁移验证失败:', error);
    }
  }

  /**
   * 检查是否需要迁移
   */
  async needsMigration(): Promise<boolean> {
    try {
      // 检查SQLite中是否已有数据
      const stats = await this.groupStorage.getAllGroupsMessageStats();
      if (stats.length > 0) {
        console.log('SQLite中已有群聊数据，跳过迁移');
        return false;
      }

      // 检查localStorage中是否有数据
      const legacyData = this.getAllLegacyGroupData();
      const hasLegacyData = Object.keys(legacyData).length > 0;

      console.log(`检查迁移需求: localStorage有数据=${hasLegacyData}, SQLite有数据=false`);
      return hasLegacyData;
    } catch (error) {
      console.error('检查迁移需求失败:', error);
      return false;
    }
  }

  /**
   * 清理迁移后的localStorage数据（可选）
   */
  async cleanupLegacyData(confirmCleanup: boolean = false): Promise<void> {
    if (!confirmCleanup) {
      console.log('⚠️ 需要确认才能清理遗留数据');
      return;
    }

    try {
      const keysToRemove: string[] = [];

      // 收集需要删除的keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && this.isGroupMessageKey(key)) {
          keysToRemove.push(key);
        }
      }

      // 删除特定的群聊数据
      keysToRemove.push('groupChats');

      // 执行清理
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`🗑️ 已清理: ${key}`);
        } catch (error) {
          console.warn(`清理失败: ${key}`, error);
        }
      });

      console.log(`✅ 遗留数据清理完成，共清理 ${keysToRemove.length} 项`);
    } catch (error) {
      console.error('清理遗留数据失败:', error);
      throw error;
    }
  }
} 