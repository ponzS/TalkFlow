import {ISQLiteService } from '../services/sqliteService'; 
import {IStorageService } from '../services/storageService'; 
import { AiChatPersistenceService } from './aiChatPersistenceService';
import { globalMessageQueue } from './persistentMessageQueue';
import { GroupMigrationService } from './groupMigrationService';

export interface IInitializeAppService {
    initializeApp(): Promise<boolean>
};

class InitializeAppService implements IInitializeAppService  {
    appInit = false;
    sqliteServ!: ISQLiteService;
    storageServ!: IStorageService;
    aiChatPersistenceServ!: AiChatPersistenceService;
    groupMigrationServ?: GroupMigrationService;
    platform!: string;
  static platform: string;

    constructor(sqliteService: ISQLiteService, storageService: IStorageService, aiChatPersistenceService: AiChatPersistenceService) {
        this.sqliteServ = sqliteService;
        this.storageServ = storageService;
        this.aiChatPersistenceServ = aiChatPersistenceService;
        this.platform = this.sqliteServ.getPlatform();
    }
    async initializeApp(): Promise<boolean> {
        if (!this.appInit) {
          try {
          //  console.log('开始应用初始化');
            if (this.platform === 'web') {
              await this.sqliteServ.initWebStore();
            //  console.log('Web 存储初始化完成');
            }
            await this.storageServ.initializeDatabase();
           // console.log('数据库初始化完成');
            
            // 🚀 启用群聊数据迁移（现在与SQLite适配层兼容）
            await this.initializeGroupMigration();
           // console.log('群聊数据迁移完成');
            
            // 初始化AI聊天持久化服务
            await this.aiChatPersistenceServ.initialize();
           // console.log('AI聊天持久化服务初始化完成');
            
            // 初始化全局消息队列服务
            await globalMessageQueue.initialize();
           // console.log('全局消息队列服务初始化完成');
            
            if (this.platform === 'web') {
              await this.sqliteServ.saveToStore(this.storageServ.getDatabaseName());
             // console.log('数据库保存到 Web 存储完成');
            }
            this.appInit = true;
           // console.log('应用初始化成功');
          } catch (error: any) {
            const msg = error.message ? error.message : error;
           // console.error(`initializeAppError.initializeApp: ${msg}`, error);
            throw new Error(`initializeAppError.initializeApp: ${msg}`);
          }
        }
        return this.appInit;
      }

      /**
       * 初始化群聊数据迁移
       */
      private async initializeGroupMigration(): Promise<void> {
        try {
          // 获取群聊存储服务
          const groupStorage = this.storageServ.getGroupStorageService();
          
          // 创建迁移服务
          this.groupMigrationServ = new GroupMigrationService(groupStorage);
          
          // 检查是否需要迁移
          const needsMigration = await this.groupMigrationServ.needsMigration();
          
          if (needsMigration) {
            console.log('🔄 检测到群聊数据需要迁移，开始迁移...');
            
            // 执行迁移
            const migrationResult = await this.groupMigrationServ.migrateAllGroupData();
            
            if (migrationResult.success) {
              console.log(`✅ 群聊数据迁移成功！`);
              console.log(`- 迁移群聊数量: ${migrationResult.migratedGroups}`);
              console.log(`- 迁移消息数量: ${migrationResult.migratedMessages}`);
              
              // 可选：清理旧数据（暂时不自动清理，等用户确认）
              // await this.groupMigrationServ.cleanupLegacyData(false);
            } else {
              console.warn('⚠️ 群聊数据迁移部分失败:', migrationResult.errors);
            }
          } else {
            console.log('ℹ️ 无需群聊数据迁移');
          }
        } catch (error) {
          console.error('❌ 群聊数据迁移失败:', error);
          // 迁移失败不应该阻止应用启动，只记录错误
        }
      }
}
export default InitializeAppService;
