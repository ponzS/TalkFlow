import {ISQLiteService } from '../services/sqliteService'; 
import {IStorageService,} from '../services/storageService'; 
import { AiChatPersistenceService } from './aiChatPersistenceService';


export interface IInitializeAppService {
    initializeApp(): Promise<boolean>
}

export class InitializeAppService implements IInitializeAppService  {
    appInit = false;
    sqliteServ!: ISQLiteService;
    storageServ!: IStorageService;
    aiChatPersistenceServ!: AiChatPersistenceService;
   
    platform!: string;
  static platform: string;

    constructor(sqliteService: ISQLiteService, storageService: IStorageService, aiChatPersistenceService: AiChatPersistenceService) {
        this.sqliteServ = sqliteService;
        this.storageServ = storageService;
        this.aiChatPersistenceServ = aiChatPersistenceService;
        this.platform = this.sqliteServ.getPlatform();
    }
    async initializeApp(): Promise<boolean> {
        // console.log('🚀 [InitializeApp] Starting application initialization...');
        if (!this.appInit) {
          try {
            if (this.platform === 'web') {
              // console.log('🌐 [InitializeApp] Web platform detected, ensuring jeep-sqlite readiness...');
              await this.ensureJeepSqliteReady();
              
              // console.log('🔧 [InitializeApp] Initializing Web store...');
              await this.sqliteServ.initWebStore();
              // console.log('✅ [InitializeApp] Web store initialized successfully');
              
              const databaseName = await this.storageServ.getDatabaseName();
              // console.log(`📊 [InitializeApp] Database name: ${databaseName}`);
              
              // console.log('🔧 [InitializeApp] Adding upgrade statements...');
              await this.sqliteServ.addUpgradeStatement({
                database: databaseName,
                upgrade: this.storageServ.versionUpgrades,
              });
              // console.log('✅ [InitializeApp] Upgrade statements added');

              // console.log('🔧 [InitializeApp] Opening database...');
              await this.sqliteServ.openDatabase(databaseName, this.storageServ.loadToVersion, false);
              // console.log('✅ [InitializeApp] Database opened successfully');
            }

            // console.log('🔧 [InitializeApp] Initializing storage service...');
            await this.storageServ.initializeDatabase();
            // console.log('✅ [InitializeApp] Storage service initialized');
            
            // 清理无效的 epub 数据
            try {
              const cleanedCount = await this.storageServ.cleanupInvalidEpubs();
              if (cleanedCount > 0) {
             //   console.log(`🧹 [InitializeApp] Cleaned up ${cleanedCount} invalid epub records`);
              }
            } catch (error) {
              console.warn('⚠️ [InitializeApp] Failed to cleanup invalid epubs:', error);
            }
            
            // console.log('🔧 [InitializeApp] Initializing AI chat persistence service...');
            await this.aiChatPersistenceServ.initialize();
            // console.log('✅ [InitializeApp] AI chat persistence service initialized');
            
      
            if (this.platform === 'web') {
              // console.log('🔧 [InitializeApp] Saving to Web store...');
              await this.sqliteServ.saveToStore(this.storageServ.getDatabaseName());
              // console.log('✅ [InitializeApp] Database saved to Web store');
            }
            this.appInit = true;
            // console.log('🎉 [InitializeApp] Application initialization completed successfully!');
          } catch (error: any) {
            // console.error('❌ [InitializeApp] Application initialization failed:', error);
            // console.error('📋 [InitializeApp] Error details:', {
            //   message: error.message,
            //   stack: error.stack,
            //   name: error.name
            // });
            throw new Error(`应用初始化失败: ${error.message || error}`);
          }
        }
        return this.appInit;
      }

    private async ensureJeepSqliteReady(): Promise<void> {
        // console.log('🔍 [InitializeApp] Checking jeep-sqlite readiness...');
        const maxRetries = 10;
        let retries = 0;
        
        while (retries < maxRetries) {
          try {
            const jeepEl = document.querySelector('jeep-sqlite');
            const isCustomElementDefined = customElements.get('jeep-sqlite');
            
            // console.log(`🔍 [InitializeApp] Retry ${retries + 1}/${maxRetries} - Element exists: ${!!jeepEl}, Custom element defined: ${!!isCustomElementDefined}`);
            
            if (jeepEl && isCustomElementDefined) {
              // console.log('✅ [InitializeApp] jeep-sqlite is ready!');
              return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
            retries++;
          } catch (error) {
            // console.warn(`⚠️ [InitializeApp] Error checking jeep-sqlite readiness (retry ${retries + 1}):`, error);
            retries++;
            if (retries >= maxRetries) {
              throw new Error('jeep-sqlite element not ready after maximum retries');
            }
          }
        }
        
        throw new Error(`jeep-sqlite not ready after ${maxRetries} retries`);
      }
    }
   
export default InitializeAppService;
