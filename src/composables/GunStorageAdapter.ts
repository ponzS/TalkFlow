import { ref, Ref } from 'vue';
import { Flint, NodeAdapter } from 'gun-flint';
import StorageService from '../services/storageService';
import { ISQLiteService } from '../services/sqliteService';
import { IDbVersionService } from '../services/dbVersionService';

// 日志工具
// const log = {
//   debug: (msg: string, ...args: any[]) => console.debug(`[Gun-SQLite-Adapter] ${msg}`, ...args),
//   info: (msg: string, ...args: any[]) => console.info(`[Gun-SQLite-Adapter] ${msg}`, ...args),
//   warn: (msg: string, ...args: any[]) => console.warn(`[Gun-SQLite-Adapter] ${msg}`, ...args),
//   error: (msg: string, ...args: any[]) => console.error(`[Gun-SQLite-Adapter] ${msg}`, ...args),
// };

// 请求队列管理，防止重复查询
class RequestQueue {
  private queue: Map<string, { resolve: (data: any) => void; reject: (err: any) => void }[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private storageServ: StorageService;

  constructor(storageServ: StorageService) {
    this.storageServ = storageServ;
  }

  async get(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const handlers = this.queue.get(key) || [];
      handlers.push({ resolve, reject });
      this.queue.set(key, handlers);

      if (!this.debounceTimers.has(key)) {
        const timer = setTimeout(async () => {
          const handlers = this.queue.get(key) || [];
          this.queue.delete(key);
          this.debounceTimers.delete(key);

          try {
            if (!this.storageServ.db) throw new Error('Database connection not available');
            const result = await this.storageServ.query('SELECT value FROM gun_nodes WHERE key = ?', [key]);
            const data = result.values && result.values.length > 0 ? JSON.parse(result.values[0].value) : null;
            handlers.forEach(h => h.resolve(data));
          } catch (err) {
            //log.error(`Failed to get key=${key}:`, err);
            handlers.forEach(h => h.reject(err));
          }
        }, 50);
        this.debounceTimers.set(key, timer);
      }
    });
  }

  async put(soul: string, node: any): Promise<void> {
    await this.storageServ.run(
      'INSERT OR REPLACE INTO gun_nodes (key, value, timestamp) VALUES (?, ?, ?)',
      [soul, JSON.stringify(node), Date.now()]
    );
  }

  async batchPut(nodes: Record<string, any>): Promise<void> {
    const updates: [string, string, number][] = [];
    for (const soul in nodes) {
      updates.push([soul, JSON.stringify(nodes[soul]), Date.now()]);
    }
    await this.storageServ.run(
      'INSERT OR REPLACE INTO gun_nodes (key, value, timestamp) VALUES ' + updates.map(() => '(?, ?, ?)').join(','),
      updates.flat()
    );
  }
}

// 定义适配器接口
interface GunAdapter {
  opt?: (context: any, options: any) => void;
  get: (key: string, done: (err: Error | null, node: any) => void) => void;
  put: (node: any, done: (err: Error | null) => void) => void;
}

export interface IGunSQLiteAdapter {
 
  getAdapter(): GunAdapter;

}

// 单例实例
let instance: IGunSQLiteAdapter | null = null;

export function useGunSQLiteAdapter(
  sqliteService: ISQLiteService,
  dbVersionService: IDbVersionService,
  storageService: StorageService
): IGunSQLiteAdapter {
  if (instance) return instance;


  const storageServ = storageService;
  let queue: RequestQueue | null = null;



  const adapterCore = {
    storageServ,
    queue,
    opt: async function (context: any, options: any) {
     // log.info('Adapter opt called:', { context, options });
    
      return options;
    },
    get: async function (key: string, done: (err: Error | null, node: any) => void) {
      try {
    
      //  if (!queue) throw new Error('Adapter not initialized');
        const data = await queue.get(key);
        done(null, data);
      } catch (err) {
        //log.error(`Get error for key=${key}:`, err);
        done(err instanceof Error ? err : new Error('Unknown error'), null);
      }
    },
    put: async function (node: any, done: (err: Error | null) => void) {
      try {
      
       // if (!queue) throw new Error('Adapter not initialized');
        if (typeof node !== 'object' || node === null) throw new Error('Invalid node');
        const souls = Object.keys(node).length > 1 ? Object.keys(node) : [node._?.['#'] || node._.id];
        if (!souls[0]) throw new Error('Missing soul in node');
        if (souls.length > 1) {
          await queue.batchPut(node);
        } else {
          await queue.put(souls[0], node[souls[0]] || node);
        }
        done(null);
      } catch (err) {
        //log.error('Put error:', err);
        done(err instanceof Error ? err : new Error('Unknown error'));
      }
    },
  };

  const adapter = new NodeAdapter(adapterCore);
  Flint.register(adapter);

  const gunSQLiteAdapter: IGunSQLiteAdapter = {

    getAdapter: () => adapter,

  };

  instance = gunSQLiteAdapter;
  return gunSQLiteAdapter;
}

export function getGunSQLiteAdapter(
  sqliteService: ISQLiteService,
  dbVersionService: IDbVersionService,
  storageService: StorageService
): IGunSQLiteAdapter {
  if (!instance) {
    instance = useGunSQLiteAdapter(sqliteService, dbVersionService, storageService);
  }
  return instance;
}

export default getGunSQLiteAdapter;