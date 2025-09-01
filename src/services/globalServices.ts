import SQLiteService from './sqliteService';
import DbVersionService from './dbVersionService';
import StorageService from './storageService';
import { AiChatPersistenceService } from './aiChatPersistenceService';
import { globalMessageQueue } from './persistentMessageQueue';

const sqliteServ = new SQLiteService();
const dbVerServ = new DbVersionService();
const storageServ = new StorageService(sqliteServ, dbVerServ);
const aiChatPersistenceServ = new AiChatPersistenceService(sqliteServ);

export { sqliteServ, dbVerServ, storageServ, aiChatPersistenceServ, globalMessageQueue };