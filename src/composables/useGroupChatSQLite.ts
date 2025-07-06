import { ref, computed } from 'vue';
import { getTalkFlowCore } from './TalkFlowCore';
import { GroupStorageService, GroupMessage } from '../services/groupStorageService';
import { MessageType, MessageStatus } from './TalkFlowCore';

// 群聊SQLite适配层 - 修复状态引用问题
export const useGroupChatSQLite = () => {
  const chatFlow = getTalkFlowCore();
  // 🔧 修复：只从 TalkFlow-Core 获取存储服务，不引用错误的状态
  const { storageServ } = chatFlow;
  
  // 获取群聊存储服务
  const getGroupStorage = (): GroupStorageService => {
    return storageServ.getGroupStorageService();
  };

  // SQLite增强功能开关（可以逐步启用）
  const sqliteEnhanced = ref(true); // 默认启用
  const enableBulkLoading = ref(true); // 启用批量加载
  const enablePagination = ref(true); // 启用分页
  
  /**
   * 🆕 强制重建群聊表（紧急修复）
   */
  const forceRecreateGroupTable = async (): Promise<boolean> => {
    try {
      console.log('🔧 强制重建group_messages表...');
      
      // 1. 删除旧表（如果存在）
      await storageServ.execute('DROP TABLE IF EXISTS group_messages');
      
      // 2. 重新创建表
      await storageServ.execute(`
        CREATE TABLE group_messages (
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
        )
      `);
      
      // 3. 创建索引
      await storageServ.execute(`
        CREATE INDEX idx_group_messages_group_timestamp 
        ON group_messages(groupPub, timestamp DESC)
      `);
      
      console.log('✅ group_messages表重建成功');
      return true;
    } catch (error) {
      console.error('❌ 表重建失败:', error);
      return false;
    }
  };

  /**
   * 🆕 确保群聊表存在（带强制重建选项）
   */
  const ensureGroupMessagesTable = async (forceRecreate: boolean = false): Promise<boolean> => {
    try {
      if (!storageServ.isInitCompleted.value) {
        console.log('数据库尚未初始化，等待初始化完成...');
        return false;
      }
      
      // 🚨 紧急模式：强制重建表
      if (forceRecreate) {
        return await forceRecreateGroupTable();
      }
      
      // 检查表是否存在
      const tableCheck = await storageServ.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='group_messages'"
      );
      
      if (!tableCheck.values || tableCheck.values.length === 0) {
        console.log('🔧 group_messages表不存在，正在创建...');
        return await forceRecreateGroupTable();
      } else {
        // 检查表结构是否正确（是否有content列）
        const columnCheck = await storageServ.query("PRAGMA table_info(group_messages)");
        const hasContentColumn = columnCheck.values?.some(col => col.name === 'content');
        
        if (!hasContentColumn) {
          console.log('🔧 表结构不正确，强制重建...');
          return await forceRecreateGroupTable();
        }
      }
      
      return true;
    } catch (error) {
      console.error('确保群聊表存在失败，尝试强制重建:', error);
      return await forceRecreateGroupTable();
    }
  };
  
  /**
   * 双写模式：将消息保存到SQLite（不影响现有功能）
   */
  const saveMessageToSQLite = async (
    groupPub: string, 
    messageData: any, 
    messageId: string
  ): Promise<void> => {
    if (!sqliteEnhanced.value) return;
    
    try {
      // 🛡️ 安全检查：确保数据库已初始化
      if (!storageServ.isInitCompleted.value) {
        console.log('数据库尚未初始化，跳过SQLite保存');
        return;
      }
      
      // 🆕 确保表存在（首次尝试强制重建）
      let tableReady = await ensureGroupMessagesTable(false);
      if (!tableReady) {
        console.warn('表检查失败，尝试强制重建...');
        tableReady = await ensureGroupMessagesTable(true);
        if (!tableReady) {
          console.error('群聊表重建失败，跳过保存');
          return;
        }
      }
      
      const groupStorage = getGroupStorage();
      if (!groupStorage) return;
      
      // 转换为SQLite格式
      const sqliteMessage: GroupMessage = {
        msgId: messageId,
        groupPub: groupPub,
        fromPub: messageData.senderPub || 'unknown',
        fromAlias: messageData.sender || 'No Name',
        type: 'text' as MessageType,
        content: messageData.text || messageData.encrypted || '',
        timestamp: messageData.timestamp || Date.now(),
        sent: messageData.status === 'sent' || messageData.status === 'pending',
        status: messageData.status || 'pending' as MessageStatus
      };
      
      // 保存到SQLite（静默失败，不影响现有功能）
      await groupStorage.saveGroupMessage(sqliteMessage);
      console.log(`📝 群聊消息已保存到SQLite: ${groupPub.slice(0,8)}, msgId: ${messageId}, content: ${sqliteMessage.content.slice(0,20)}...`);
    } catch (error) {
      console.warn('SQLite保存失败（不影响现有功能）:', error);
    }
  };

  /**
   * 从SQLite加载历史消息（使用ID排序，像私聊一样）
   */
  const loadHistoryFromSQLite = async (
    groupPub: string, 
    limit: number = 50,
    beforeId?: number
  ): Promise<any[]> => {
    if (!sqliteEnhanced.value || !enableBulkLoading.value) return [];
    
    try {
      // 🛡️ 安全检查：确保数据库已初始化
      if (!storageServ.isInitCompleted.value) {
        console.log('数据库尚未初始化，跳过SQLite历史加载');
        return [];
      }
      
      // 🆕 确保表存在
      const tableReady = await ensureGroupMessagesTable();
      if (!tableReady) {
        console.warn('群聊表未就绪，跳过历史加载');
        return [];
      }
      
      const groupStorage = getGroupStorage();
      if (!groupStorage) return [];
      
      // 🔧 使用基于ID的分页，像私聊一样
      const sqliteMessages = await groupStorage.getGroupMessages(groupPub, limit, beforeId, undefined, 'DESC');
      
      // 转换为现有Message格式，保持SQLite的ID用于分页
      const legacyMessages = sqliteMessages.map(msg => ({
        id: msg.id || msg.msgId, // 🔧 使用SQLite自增ID，而不是msgId
        sqliteId: msg.id, // 保存SQLite ID用于分页
        msgId: msg.msgId, // 保留原始msgId
        sender: msg.fromAlias || 'No Name',
        senderPub: msg.fromPub,
        text: msg.content,
        timestamp: msg.timestamp,
        formattedTime: formatMessageTime(msg.timestamp),
        status: msg.status,
        isSending: false
      }));
      
      console.log(`📚 从SQLite加载${groupPub.slice(0,8)}历史消息: ${legacyMessages.length}条, beforeId: ${beforeId}`);
      return legacyMessages;
    } catch (error) {
      console.warn('SQLite历史加载失败:', error);
      return [];
    }
  };

  /**
   * 分页加载更多消息（基于ID分页，像私聊一样）
   */
  const loadMoreFromSQLite = async (
    groupPub: string, 
    beforeId: number,
    limit: number = 20
  ): Promise<any[]> => {
    if (!sqliteEnhanced.value || !enablePagination.value) return [];
    
    try {
      // 🛡️ 安全检查：确保数据库已初始化
      if (!storageServ.isInitCompleted.value) {
        console.log('数据库尚未初始化，跳过SQLite分页加载');
        return [];
      }
      
      // 🆕 确保表存在
      const tableReady = await ensureGroupMessagesTable();
      if (!tableReady) {
        console.warn('群聊表未就绪，跳过分页加载');
        return [];
      }
      
      const groupStorage = getGroupStorage();
      if (!groupStorage) return [];
      
      // 🔧 使用基于ID的分页，确保消息顺序准确
      const olderMessages = await groupStorage.getGroupMessages(groupPub, limit, beforeId, undefined, 'DESC');
      
      const legacyMessages = olderMessages.map(msg => ({
        id: msg.id || msg.msgId, // 🔧 使用SQLite自增ID
        sqliteId: msg.id, // 保存SQLite ID用于分页
        msgId: msg.msgId, // 保留原始msgId
        sender: msg.fromAlias || 'No Name', 
        senderPub: msg.fromPub,
        text: msg.content,
        timestamp: msg.timestamp,
        formattedTime: formatMessageTime(msg.timestamp)
      }));
      
      console.log(`📖 分页加载${groupPub.slice(0,8)}更多消息: ${legacyMessages.length}条, beforeId: ${beforeId}`);
      return legacyMessages;
    } catch (error) {
      console.warn('SQLite分页加载失败:', error);
      return [];
    }
  };

  /**
   * 获取群聊统计信息
   */
  const getGroupStats = async (groupPub: string) => {
    if (!sqliteEnhanced.value) return null;
    
    try {
      // 🛡️ 安全检查：确保数据库已初始化
      if (!storageServ.isInitCompleted.value) {
        console.log('数据库尚未初始化，跳过群聊统计');
        return null;
      }
      
      const groupStorage = getGroupStorage();
      
      // 🛡️ 验证数据库连接
      if (!groupStorage) {
        console.warn('GroupStorage服务不可用');
        return null;
      }
      
      const messageCount = await groupStorage.getGroupMessageCount(groupPub);
      const latestMessage = await groupStorage.getLatestGroupMessage(groupPub);
      
      return {
        totalMessages: messageCount,
        latestTimestamp: latestMessage?.timestamp || 0,
        hasMoreHistory: messageCount > 100
      };
    } catch (error) {
      console.warn('获取群聊统计失败:', error);
      return null;
    }
  };

  /**
   * 从SQLite获取消息（不再需要合并Gun.js数据）
   */
  const getMergedMessages = async (groupPub: string): Promise<any[]> => {
    try {
      // 如果SQLite增强功能关闭，返回空数组
      if (!sqliteEnhanced.value) return [];
      
      // 直接从SQLite获取消息
      const sqliteMessages = await loadHistoryFromSQLite(groupPub, 200);
      
      console.log(`📚 ${groupPub}从SQLite获取消息: ${sqliteMessages.length}条`);
      return sqliteMessages;
    } catch (error) {
      console.warn('从SQLite获取消息失败:', error);
      return [];
    }
  };

  /**
   * 增强的消息发送（双写到SQLite）
   */
  const enhancedSendMessage = async (
    groupPub: string,
    messageContent: string,
    originalSendFunction: Function
  ) => {
    try {
      // 先执行原有发送逻辑
      await originalSendFunction();
      
      // 然后保存到SQLite（增强持久化）
      const messageId = Date.now().toString();
      const messageData = {
        sender: chatFlow.currentUserAlias?.value || 'Me',
        senderPub: chatFlow.currentUserPub?.value || 'unknown',
        text: messageContent,
        timestamp: Date.now()
      };
      
      await saveMessageToSQLite(groupPub, messageData, messageId);
    } catch (error) {
      console.warn('增强发送失败（原有功能不受影响）:', error);
    }
  };

  // 工具函数
  const formatMessageTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  // 管理功能
  const toggleSQLiteEnhanced = () => {
    sqliteEnhanced.value = !sqliteEnhanced.value;
    console.log(`SQLite增强功能: ${sqliteEnhanced.value ? '开启' : '关闭'}`);
  };

  const getSQLiteStatus = computed(() => ({
    enhanced: sqliteEnhanced.value,
    bulkLoading: enableBulkLoading.value,
    pagination: enablePagination.value
  }));

  /**
   * 清理SQLite群聊数据
   */
  const clearSQLiteGroupData = async (groupPub: string): Promise<void> => {
    if (!sqliteEnhanced.value) return;
    
    try {
      const groupStorage = getGroupStorage();
      
      // 获取所有消息ID
      const messages = await groupStorage.getGroupMessages(groupPub, 1000);
      
      // 逐个删除
      for (const message of messages) {
        await groupStorage.deleteGroupMessage(message.msgId);
      }
      
      console.log(`🗑️ SQLite群聊数据已清理: ${groupPub}`);
    } catch (error) {
      console.warn('SQLite清理失败:', error);
    }
  };

  return {
    // 核心功能
    saveMessageToSQLite,
    loadHistoryFromSQLite, 
    loadMoreFromSQLite,
    getMergedMessages,
    enhancedSendMessage,
    
    // 数据库维护
    ensureGroupMessagesTable,
    forceRecreateGroupTable,
    
    // 统计和状态
    getGroupStats,
    getSQLiteStatus,
    
    // 管理功能
    toggleSQLiteEnhanced,
    clearSQLiteGroupData,
    
    // 配置
    sqliteEnhanced,
    enableBulkLoading,
    enablePagination
  };
}; 