import {ISQLiteService } from '../services/sqliteService'; 
import {IStorageService } from '../services/storageService'; 

export interface IInitializeAppService {
    initializeApp(): Promise<boolean>
};

class InitializeAppService implements IInitializeAppService  {
    appInit = false;
    sqliteServ!: ISQLiteService;
    storageServ!: IStorageService;
    platform!: string;

    constructor(sqliteService: ISQLiteService, storageService: IStorageService) {
        this.sqliteServ = sqliteService;
        this.storageServ = storageService;
        this.platform = this.sqliteServ.getPlatform();
    }
    async initializeApp() : Promise<boolean> {
        if(!this.appInit) {
            try {
                if (this.platform === 'web') {
                    await this.sqliteServ.initWebStore();
                }
                // Initialize the myuserdb database
                await this.storageServ.initializeDatabase();
                if( this.platform === 'web') {
                    await this.sqliteServ.saveToStore(this.storageServ.getDatabaseName());
                }
                this.appInit = true;
            } catch(error: any) {
                const msg = error.message ? error.message : error;
                throw new Error(`initializeAppError.initializeApp: ${msg}`);
            }
        }
        return this.appInit;
    }
}
export default InitializeAppService;
