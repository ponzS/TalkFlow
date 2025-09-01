// 持久化消息发送队列服务 - 全局单例
import type { NetworkChatMessage } from '@/composables/TalkFlowCore'

export interface QueuedMessage {
  id: string
  networkMsg: NetworkChatMessage
  chatId: string
  retryCount: number
  nextRetryTime: number
  createdAt: number
  lastAttempt: number
  error?: string
}

// 全局消息队列服务 - 单例模式
export class GlobalPersistentMessageQueue {
  private static instance: GlobalPersistentMessageQueue | null = null
  private db: any = null
  private isInitialized = false
  private isProcessing = false
  private processInterval: NodeJS.Timeout | null = null
  private networkCheckInterval: NodeJS.Timeout | null = null
  
  // 配置
  private readonly RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000, 60000] // 重试延迟（毫秒）
  private readonly PROCESS_INTERVAL = 3000 // 3秒检查一次（更频繁）
  private readonly NETWORK_CHECK_INTERVAL = 8000 // 8秒检查一次网络
  private readonly BATCH_SIZE = 50 // 每次处理的消息批次大小
  
  // 活跃发送追踪（仅用于统计，不限制并发）
  private activeSends = new Set<string>()
  
  // 状态回调
  private statusCallbacks: Map<string, (status: 'sending' | 'sent' | 'failed') => void> = new Map()
  
  private constructor() {
    // console.log('GlobalPersistentMessageQueue instance created');
  }
  
  // 获取单例实例
  public static getInstance(): GlobalPersistentMessageQueue {
    if (!GlobalPersistentMessageQueue.instance) {
      GlobalPersistentMessageQueue.instance = new GlobalPersistentMessageQueue()
    }
    return GlobalPersistentMessageQueue.instance
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      // console.log('Queue already initialized');
      return
    }
    
    try {
      // 动态导入避免循环依赖
      const { storageServ } = await import('../services/globalServices')
      this.db = storageServ
      await this.createTables()
      this.isInitialized = true
      
      // 启动后台处理
      this.startBackgroundProcessing()
      
      // 恢复未发送的消息
      await this.recoverPendingMessages()
      
      // console.log('GlobalPersistentMessageQueue initialized successfully');
    } catch (error) {
      // console.error('Failed to initialize GlobalPersistentMessageQueue:', error);
      throw error
    }
  }
  
  // 恢复未发送的消息
  async recoverPendingMessages(): Promise<void> {
    try {
      const pendingMessages = await this.getAllPendingMessages()
      // console.log('Recovering', pendingMessages.length, 'pending messages');
      
      if (pendingMessages.length > 0) {
        // 立即触发处理
        setTimeout(() => this.processQueue(), 1000)
      }
    } catch (error) {
      // console.error('Failed to recover pending messages:', error);
    }
  }
  
  // 获取所有待发送消息
  private async getAllPendingMessages(): Promise<QueuedMessage[]> {
    if (!this.isInitialized) return []
    
    const sql = 'SELECT * FROM message_queue ORDER BY createdAt ASC'
    const result = await this.db.query(sql)
    
    if (!result.values) return []
    
    return result.values.map((row: any) => ({
      id: row.id,
      chatId: row.chatId,
      networkMsg: JSON.parse(row.networkMsg),
      retryCount: row.retryCount,
      nextRetryTime: row.nextRetryTime,
      createdAt: row.createdAt,
      lastAttempt: row.lastAttempt,
      error: row.error
    }))
  }
  
  private async createTables(): Promise<void> {
    const sql = `
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
    
    try {
      await this.db.run(sql)
    } catch (error) {
      console.warn('Table creation may have failed:', error)
      // 继续执行，可能表已存在
    }
  }
  
  // 注册状态回调
  registerStatusCallback(messageId: string, callback: (status: 'sending' | 'sent' | 'failed') => void): void {
    this.statusCallbacks.set(messageId, callback)
  }
  
  // 移除状态回调
  unregisterStatusCallback(messageId: string): void {
    this.statusCallbacks.delete(messageId)
  }
  
  // 触发状态回调
  private triggerStatusCallback(messageId: string, status: 'sending' | 'sent' | 'failed'): void {
    const callback = this.statusCallbacks.get(messageId)
    if (callback) {
      try {
        callback(status)
      } catch (error) {
        // console.error('Status callback error:', error);
      }
    }
  }
  
  // 添加消息到发送队列
  async enqueue(message: QueuedMessage): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    const sql = `
      INSERT OR REPLACE INTO message_queue 
      (id, chatId, networkMsg, retryCount, nextRetryTime, createdAt, lastAttempt, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    const networkMsgJson = JSON.stringify(message.networkMsg)
    
    await this.db.run(sql, [
      message.id,
      message.chatId,
      networkMsgJson,
      message.retryCount,
      message.nextRetryTime,
      message.createdAt,
      message.lastAttempt,
      message.error || null
    ])
    
    // console.log('Message queued globally:', message.id);
    
    // 触发状态回调
    this.triggerStatusCallback(message.id, 'sending')
    
    // 立即触发并行处理
    setTimeout(() => this.processQueue(), 50) // 更快的响应时间
  }
  
  // 从队列中移除消息（发送成功后）
  async dequeue(messageId: string): Promise<void> {
    if (!this.isInitialized) return
    
    const sql = 'DELETE FROM message_queue WHERE id = ?'
    await this.db.run(sql, [messageId])
    
    // console.log('Message removed from global queue:', messageId);
    
    // 触发状态回调
    this.triggerStatusCallback(messageId, 'sent')
    
    // 清理回调
    this.unregisterStatusCallback(messageId)
  }
  
  // 更新消息重试信息
  async updateRetry(messageId: string, retryCount: number, error?: string): Promise<void> {
    if (!this.isInitialized) return
    
    // 计算下次重试时间
    const delayIndex = Math.min(retryCount - 1, this.RETRY_DELAYS.length - 1)
    const delay = this.RETRY_DELAYS[delayIndex]
    const nextRetryTime = Date.now() + delay
    
    const sql = `
      UPDATE message_queue 
      SET retryCount = ?, nextRetryTime = ?, lastAttempt = ?, error = ?
      WHERE id = ?
    `
    
    await this.db.run(sql, [
      retryCount,
      nextRetryTime,
      Date.now(),
      error || null,
      messageId
    ])
    
    // console.log('Message retry updated globally:', messageId, 'retry count:', retryCount);
    
    // 触发状态回调
    this.triggerStatusCallback(messageId, 'sending')
  }
  
  // 获取准备发送的消息（并行处理，无并发限制）
  async getReadyMessages(): Promise<QueuedMessage[]> {
    if (!this.isInitialized) return []
    
    const now = Date.now()
    const sql = `
      SELECT * FROM message_queue 
      WHERE nextRetryTime <= ? 
      ORDER BY createdAt ASC 
      LIMIT ?
    `
    
    const result = await this.db.query(sql, [now, this.BATCH_SIZE])
    
    if (!result.values) return []
    
    return result.values.map((row: any) => ({
      id: row.id,
      chatId: row.chatId,
      networkMsg: JSON.parse(row.networkMsg),
      retryCount: row.retryCount,
      nextRetryTime: row.nextRetryTime,
      createdAt: row.createdAt,
      lastAttempt: row.lastAttempt,
      error: row.error
    }))
  }
  
  // 获取队列统计信息（包括并发状态）
  async getQueueStats(): Promise<{ total: number; pending: number; retrying: number; activeSending: number }> {
    if (!this.isInitialized) return { total: 0, pending: 0, retrying: 0, activeSending: 0 }
    
    const totalResult = await this.db.query('SELECT COUNT(*) as count FROM message_queue')
    const pendingResult = await this.db.query('SELECT COUNT(*) as count FROM message_queue WHERE retryCount = 0')
    const retryingResult = await this.db.query('SELECT COUNT(*) as count FROM message_queue WHERE retryCount > 0')
    
    return {
      total: totalResult.values?.[0]?.count || 0,
      pending: pendingResult.values?.[0]?.count || 0,
      retrying: retryingResult.values?.[0]?.count || 0,
      activeSending: this.activeSends.size
    }
  }
  
  // 获取当前并发发送状态
  getCurrentConcurrency(): { active: number; messageIds: string[] } {
    return {
      active: this.activeSends.size,
      messageIds: Array.from(this.activeSends)
    }
  }
  
  // 检查消息是否在队列中
  async isMessageInQueue(messageId: string): Promise<boolean> {
    if (!this.isInitialized) return false
    
    const sql = 'SELECT id FROM message_queue WHERE id = ?'
    const result = await this.db.query(sql, [messageId])
    
    return result.values && result.values.length > 0
  }
  
  // 处理发送队列（真正的并行处理）
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    try {
      const readyMessages = await this.getReadyMessages()
      
      if (readyMessages.length === 0) {
        return
      }
      
      // console.log('Parallel processing', readyMessages.length, 'messages');
      
      // 完全并行：所有消息同时发送，Gun.js会自动处理向所有peer的同步
      const sendPromises = readyMessages.map(message => this.sendMessage(message))
      
      // 不等待完成，让消息真正并行发送
      Promise.allSettled(sendPromises).then(() => {
        // console.log('Batch of', readyMessages.length, 'messages initiated');
      })
      
    } catch (error) {
      // console.error('Error processing global queue:', error);
    } finally {
      this.isProcessing = false
      
      // 立即检查是否还有更多消息需要处理
      const stats = await this.getQueueStats()
      if (stats.total > 0) {
        // 如果还有消息，短暂延迟后继续处理（避免无限循环）
        setTimeout(() => this.processQueue(), 500)
      }
    }
  }
  
  // 获取全局Gun实例
  private getGunInstance(): any {
    // 尝试多种方式获取Gun实例
    if (typeof window !== 'undefined') {
      if ((window as any).gun) {
        return (window as any).gun
      }
      
      // 尝试从全局导入获取
      try {
        const gunModule = require('gun')
        if (gunModule && typeof gunModule.get === 'function') {
          return gunModule
        }
      } catch (e) {
        // ignore
      }
    }
    
    return null
  }
  
  // 发送单个消息（无并发限制，真正并行）
  private async sendMessage(queuedMessage: QueuedMessage): Promise<void> {
    const messageId = queuedMessage.id
    
    // 添加到活跃发送集合（仅用于统计）
    this.activeSends.add(messageId)
    
    try {
      // console.log('Sending message in parallel:', messageId);
      
      const gun = this.getGunInstance()
      if (!gun) {
        throw new Error('Gun.js instance not available')
      }
      
      // 使用 Gun.js 并行发送消息到所有peer节点
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Send timeout after 20 seconds'))
        }, 20000) // 缩短超时时间，更快的失败检测
        
        gun.get('chats')
          .get(queuedMessage.chatId)
          .get('messages')
          .get(queuedMessage.networkMsg.msgId)
          .put(queuedMessage.networkMsg, (ack: any) => {
            clearTimeout(timeout)
            if (ack.err) {
              reject(new Error(ack.err))
            } else {
              resolve()
            }
          })
      })
      
      // 发送成功，从队列中移除
      await this.dequeue(messageId)
      // console.log('Message sent successfully in parallel:', messageId);
      
    } catch (error) {
      // console.error('Failed to send message:', messageId, error);
      
      // 更新重试计数
      await this.updateRetry(
        messageId, 
        queuedMessage.retryCount + 1, 
        error instanceof Error ? error.message : String(error)
      )
      
    } finally {
      // 从活跃发送集合中移除
      this.activeSends.delete(messageId)
    }
  }
  
  // 启动后台处理
  private startBackgroundProcessing(): void {
    // console.log('Starting global background processing');
    
    // 队列处理间隔
    this.processInterval = setInterval(() => {
      this.processQueue()
    }, this.PROCESS_INTERVAL)
    
    // 网络状态检查间隔（更激进的并行处理）
    this.networkCheckInterval = setInterval(async () => {
      if (navigator.onLine) {
        const stats = await this.getQueueStats()
        if (stats.total > 0) {
          // console.log('Network available, processing', stats.total, 'queued messages');
          this.processQueue()
        }
      }
    }, this.NETWORK_CHECK_INTERVAL)
    
    // 监听网络状态变化（立即并行处理）
    window.addEventListener('online', async () => {
    //  const stats = await this.getQueueStats()
      // console.log('Network restored, starting parallel processing for', stats.total, 'messages');
      
      // 立即处理，不等待
      this.processQueue()
      
      // 快速连续处理以快速清空队列
      setTimeout(() => this.processQueue(), 200)
      setTimeout(() => this.processQueue(), 500)
    })
    
    window.addEventListener('offline', () => {
      // console.log('Network lost, messages will continue queuing');
    })
    
    // 监听页面可见性变化（立即检查和处理）
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        const stats = await this.getQueueStats()
        // console.log('Page visible, processing', stats.total, 'messages');
        this.processQueue()
      }
    })
  }
  
  // 停止后台处理
  stop(): void {
    // console.log('Stopping global background processing');
    
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }
    
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval)
      this.networkCheckInterval = null
    }
    
    this.isProcessing = false
    this.statusCallbacks.clear()
    this.activeSends.clear()
  }
  
  // 清空队列（用于调试）
  async clearQueue(): Promise<void> {
    if (!this.isInitialized) return
    
    await this.db.run('DELETE FROM message_queue')
    // console.log('Global message queue cleared');
  }
  
  // 获取单个消息状态
  async getMessageStatus(messageId: string): Promise<QueuedMessage | null> {
    if (!this.isInitialized) return null
    
    const sql = 'SELECT * FROM message_queue WHERE id = ?'
    const result = await this.db.query(sql, [messageId])
    
    if (!result.values || result.values.length === 0) return null
    
    const row = result.values[0]
    return {
      id: row.id,
      chatId: row.chatId,
      networkMsg: JSON.parse(row.networkMsg),
      retryCount: row.retryCount,
      nextRetryTime: row.nextRetryTime,
      createdAt: row.createdAt,
      lastAttempt: row.lastAttempt,
      error: row.error
    }
  }
}

// 导出单例实例
export const globalMessageQueue = GlobalPersistentMessageQueue.getInstance()

// 兼容旧的导出
export { GlobalPersistentMessageQueue as PersistentMessageQueue }