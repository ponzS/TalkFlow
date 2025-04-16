import { ref, Ref } from 'vue';
import { Flint, NodeAdapter } from 'gun-flint';
import StorageService from '../services/storageService';
import { ISQLiteService } from '../services/sqliteService';
import { IDbVersionService } from '../services/dbVersionService';

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
            console.error(`[Gun-SQLite-Adapter] Failed to get key=${key}:`, err);
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
  initialize(): Promise<void>;
  getAdapter(): GunAdapter;
  isReady: Ref<boolean>;
}

// 单例实例
let instance: IGunSQLiteAdapter | null = null;

export function useGunSQLiteAdapter(
  sqliteService: ISQLiteService,
  dbVersionService: IDbVersionService,
  storageService: StorageService
): IGunSQLiteAdapter {
  if (instance) return instance;

  const isReady: Ref<boolean> = ref(false);
  const storageServ = storageService;
  let queue: RequestQueue | null = null;

  async function initialize() {
    if (isReady.value) return;
    try {
      console.log('[Gun-SQLite-Adapter] Initializing...');
      // 等待 StorageService 数据库初始化
      if (!storageServ.db) {
        console.warn('[Gun-SQLite-Adapter] StorageService database not initialized, waiting...');
        await storageServ.initializeDatabase();
      } else {
        const isOpen = await storageServ.db.isDBOpen();
        if (!isOpen) {
          console.warn('[Gun-SQLite-Adapter] Database not open, reopening...');
          await storageServ.db.open();
        }
      }

      // 检查 gun_nodes 表是否存在
      const tableCheck = await storageServ.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='gun_nodes'"
      );
      if (!tableCheck.values || tableCheck.values.length === 0) {
        throw new Error('gun_nodes table does not exist. Ensure StorageService has initialized it.');
      }

      queue = new RequestQueue(storageServ);
      isReady.value = true;
      console.log('[Gun-SQLite-Adapter] Initialized successfully');
    } catch (err) {
      console.error('[Gun-SQLite-Adapter] Failed to initialize:', err);
      throw err;
    }
  }

  const adapterCore = {
    storageServ,
    queue,
    opt: async function (context: any, options: any) {
      console.log('[Gun-SQLite-Adapter] Adapter opt called:', { context, options });
      await initialize();
      return options;
    },
    get: async function (key: string, done: (err: Error | null, node: any) => void) {
      try {
        if (!isReady.value) await initialize();
        if (!queue) throw new Error('Adapter not initialized');
        const data = await queue.get(key);
        if (typeof done === 'function') {
          done(null, data);
        } else {
          console.warn('[Gun-SQLite-Adapter] get: done is not a function, ignoring:', done);
        }
      } catch (err) {
        console.error(`[Gun-SQLite-Adapter] Get error for key=${key}:`, err);
        if (typeof done === 'function') {
          done(err instanceof Error ? err : new Error('Unknown error'), null);
        }
      }
    },
    put: async function (node: any, done: (err: Error | null) => void) {
      try {
        if (!isReady.value) await initialize();
        if (!queue) throw new Error('Adapter not initialized');
        // 放宽验证，仅检查 node 非 undefined
        if (node === undefined) throw new Error('Node is undefined');
        let souls: string[];
        if (typeof node === 'object' && node !== null) {
          souls = Object.keys(node).length > 1 ? Object.keys(node) : [node._?.['#'] || node._.id || 'default-soul'];
        } else {
          // 允许非对象数据，生成默认 soul
          souls = ['default-soul-' + Date.now()];
        }
        if (!souls[0]) {
          console.warn('[Gun-SQLite-Adapter] No soul found, using default');
          souls = ['default-soul-' + Date.now()];
        }
        if (souls.length > 1) {
          await queue.batchPut(node);
        } else {
          await queue.put(souls[0], node);
        }
        if (typeof done === 'function') {
          done(null);
        } else {
          console.warn('[Gun-SQLite-Adapter] put: done is not a function, ignoring:', done);
        }
      } catch (err) {
        console.error('[Gun-SQLite-Adapter] Put error:', err);
        if (typeof done === 'function') {
          done(err instanceof Error ? err : new Error('Unknown error'));
        }
      }
    },
  };

  const adapter = new NodeAdapter(adapterCore);
  Flint.register(adapter);

  const gunSQLiteAdapter: IGunSQLiteAdapter = {
    initialize,
    getAdapter: () => adapter,
    isReady,
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