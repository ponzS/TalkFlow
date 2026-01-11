import { Gun } from "gun-es";
import { ref, watch } from 'vue';
import "gun/lib/store";
import { Capacitor } from '@capacitor/core';
import { sqliteServ, storageServ } from '../services/globalServices';

type StorePutCallback = (err?: any, ok?: any) => void;
type StoreGetCallback = (err?: any, data?: any) => void;
type StoreListCallback = (file?: string) => any;

function safeDecodeFileName(file: string) {
  try {
    return decodeURIComponent(file);
  } catch {
    return file;
  }
}

function createGunSqliteStore() {
  let readyPromise: Promise<void> | null = null;

  function ensureReady() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      const platform = Capacitor.getPlatform();
      if (platform === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
          await new Promise<void>((resolve) => window.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
        }

        const hasCustomElements = typeof (globalThis as any).customElements !== 'undefined';
        if (hasCustomElements) {
          await (globalThis as any).customElements.whenDefined?.('jeep-sqlite');
        }

        const existing = document.querySelector('jeep-sqlite');
        if (!existing && document.body) {
          const jeepEl = document.createElement('jeep-sqlite');
          document.body.appendChild(jeepEl);
        }

        await sqliteServ.initWebStore();
      }

      await storageServ.initializeDatabase();
    })();
    return readyPromise;
  }

  return {
    put(file: string, data: string, cb: StorePutCallback) {
      void ensureReady()
        .then(() => storageServ.run(`INSERT OR REPLACE INTO gun_nodes ("key", "value", "timestamp") VALUES (?, ?, ?)`, [String(file), String(data ?? ''), Date.now()]))
        .then(() => cb(undefined, 1))
        .catch((err) => cb(err));
    },

    get(file: string, cb: StoreGetCallback) {
      void ensureReady()
        .then(() => storageServ.query(`SELECT "value" as value FROM gun_nodes WHERE "key" = ? LIMIT 1`, [String(file)]))
        .then((res) => {
          const value = res?.values?.[0]?.value;
          cb(undefined, value);
        })
        .catch((err) => cb(err));
    },

    list(cb: StoreListCallback) {
      void ensureReady()
        .then(() => storageServ.query(`SELECT "key" as key FROM gun_nodes ORDER BY "key" ASC`))
        .then((res) => {
          const keys: string[] = (res?.values || []).map((row: any) => String(row?.key ?? '')).filter(Boolean);
          for (const encoded of keys) {
            const decoded = safeDecodeFileName(encoded);
            const shouldStop = cb(decoded);
            if (shouldStop) break;
          }
          cb();
        })
        .catch(() => cb());
    },
  };
}

const store = createGunSqliteStore();

// 默认节点列表（本地存在的 relay 列表）
const DEFAULT_PEERS: string[] = [
  'wss://gun.ponzs.com/gun'
];
// 'http://localhost:8765/gun',
const LS_KEYS = {
  list: 'gun_peers_list',
  enabled: 'gun_enabled_peers',
} as const;

// 统一将 http/https 写法转换为 ws/wss，避免因协议不匹配导致回落到轮询
function normalizePeerUrl(url: string): string {
  const u = (url || '').trim();
  if (!u) return u;
  if (u.startsWith('https://')) return 'wss://' + u.slice('https://'.length);
  if (u.startsWith('http://')) return 'ws://' + u.slice('http://'.length);
  return u;
}

function safeParseArray(value: string | null, fallback: string[]): string[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadPeersListFromStorage(): string[] {
  if (typeof localStorage === 'undefined') return DEFAULT_PEERS;
  const arr = safeParseArray(localStorage.getItem(LS_KEYS.list), DEFAULT_PEERS);
  return [...new Set(arr.map(normalizePeerUrl).filter(Boolean))];
}

function loadEnabledPeersFromStorage(): string[] {
  if (typeof localStorage === 'undefined') return DEFAULT_PEERS;
  const arr = safeParseArray(localStorage.getItem(LS_KEYS.enabled), DEFAULT_PEERS);
  return [...new Set(arr.map(normalizePeerUrl).filter(Boolean))];
}

export const peersList = ref<string[]>(loadPeersListFromStorage());
export const enabledPeers = ref<string[]>(loadEnabledPeersFromStorage());

export function savePeersListToStorage(peers: string[]) {
  try {
    localStorage.setItem(LS_KEYS.list, JSON.stringify(peers));
  } catch {}
}

export function saveEnabledPeersToStorage(peers: string[]) {
  try {
    localStorage.setItem(LS_KEYS.enabled, JSON.stringify(peers));
  } catch {}
}

// 持久化监听
watch(peersList, (val) => savePeersListToStorage([...new Set(val.filter(Boolean).map(normalizePeerUrl))])),
watch(enabledPeers, (val) => saveEnabledPeersToStorage([...new Set(val.filter(Boolean).map(normalizePeerUrl))]))

// Gun 实例：实际使用的 relay 为 enabledPeers
export let gun: any = Gun({ peers: enabledPeers.value, localStorage: false, store });
if (typeof window !== 'undefined') {
  (window as any).gun = gun;
}


watch(enabledPeers, (peers) => {
  const uniqPeers = [...new Set((peers || []).map(normalizePeerUrl).filter(Boolean))];
  // 优先使用 gun.opt 动态更新，以减少重连开销
  try {
    gun.opt({ peers: uniqPeers });
  } catch {
    gun = Gun({ peers: uniqPeers, localStorage: false, store });
  }
  // 轻量心跳，强制建立连接并触发订阅恢复
  try {
    gun.get('key').get('heartbeat').put('heartbeat');
  } catch {}
  if (typeof window !== 'undefined') {
    (window as any).gun = gun;
  }
 
});

// —— 公开的操作：新增 / 删除 / 启用切换 ——
export function addRelay(url: string) {
  const u = normalizePeerUrl(url || '');
  if (!u) return;
  if (!peersList.value.includes(u)) peersList.value = [...peersList.value, u];
}

export function removeRelay(url: string) {
  const u = (url || '').trim();
  if (!u) return;
  peersList.value = peersList.value.filter((p) => p !== u);
  enabledPeers.value = enabledPeers.value.filter((p) => p !== u);
}

export function setRelayEnabled(url: string, enabled: boolean) {
  const u = (url || '').trim();
  if (!u) return;
  const set = new Set(enabledPeers.value);
  if (enabled) set.add(u);
  else set.delete(u);
  enabledPeers.value = Array.from(set);
}

// 兼容旧方法：返回当前启用的 relay 列表
export function loadRelays(): string[] {
  return [...enabledPeers.value]
}

// —— 兼容旧导出：保持 API 可用 ——
export function CreateNewGun() {
  const peers = [...new Set(enabledPeers.value.filter(Boolean))]
  gun = Gun({ peers, localStorage: false, store })
 
  if (typeof window !== 'undefined') {
    (window as any).gun = gun
  }
}

export function recreateGunWithPeers(newPeers: string[]) {
  const peers = [...new Set((newPeers || []).filter(Boolean))]
  gun = Gun({ peers, localStorage: false, store })

  if (typeof window !== 'undefined') {
    (window as any).gun = gun
  }
}

export function createIsolatedGun(peers: string[]) {
  const uniq = [...new Set((peers || []).filter(Boolean))]
  return Gun({ peers: uniq, localStorage: false, store })
}

// 重新连接到当前启用的 peers，并触发一次心跳写入以强制建立连接
export function reconnectGunPeers() {
  const peers = [...new Set((enabledPeers.value || []).filter(Boolean))]
  // 使用官方建议的方式重新添加 peers
  try {
    gun.opt({ peers })
  } catch (e) {
    // 如果现有实例不可用，回退到重新创建实例
    gun = Gun({ peers, localStorage: false, store })
  }
  // 可选：写入一个很小的心跳，强制建立连接并接收可能缺失的 on() 事件
  try {
    gun.get('key').get('heartbeat').put('heartbeat')
  } catch {}
  if (typeof window !== 'undefined') {
    (window as any).gun = gun
  }

}
