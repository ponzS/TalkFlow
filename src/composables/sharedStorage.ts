// sharedStorage.ts
import { Storage, Drivers } from '@ionic/storage';
import CordovaSQLiteDriver from 'localforage-cordovasqlitedriver'
export const sharedStorage = new Storage({
    name: 'talkflowuser.db',
    driverOrder: [CordovaSQLiteDriver._driver, Drivers.IndexedDB],
  }) as any;
  
  // 注册自定义 SQLite 驱动
  sharedStorage.defineDriver(CordovaSQLiteDriver);
  
  // 创建或打开数据库，并导出该实例
   sharedStorage.create().then(() => {
    console.log('共享 Storage 已成功创建！');
    return sharedStorage;
  });

  export default sharedStorage;