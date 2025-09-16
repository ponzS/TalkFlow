export interface IDbVersionService {
    setDbVersion(dbName: string, version: number): void
    getDbVersion(dbName: string):number| undefined
};
class DbVersionService implements IDbVersionService {
    dbNameVersionDict: Map<string, number> = new Map();
  
    setDbVersion(dbName: string, version: number) {
      this.dbNameVersionDict.set(dbName, version);
    //  设置数据库版本
    }
  
    getDbVersion(dbName: string): number | undefined {
      const version = this.dbNameVersionDict.get(dbName);
    //  获取数据库版本
      return version;
    }
  }
export default DbVersionService;







