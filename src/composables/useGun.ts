import { Gun } from "gun-es";
import { ref, watch } from 'vue';

// 默认节点列表（本地存在的 relay 列表）
const DEFAULT_PEERS: string[] = [
  'https://a.talkflow.team/gun',
  'wss://a.talkflow.team/gun',
  'https://gun.defucc.me/gun',
  'wss://gun.defucc.me/gun',
  'https://relay.peer.ooo/gun',
  'wss://relay.peer.ooo/gun'
  
];
// 'http://localhost:8765/gun',
const LS_KEYS = {
  list: 'gun_peers_list',
  enabled: 'gun_enabled_peers',
} as const;

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
  return safeParseArray(localStorage.getItem(LS_KEYS.list), DEFAULT_PEERS);
}

function loadEnabledPeersFromStorage(): string[] {
  if (typeof localStorage === 'undefined') return DEFAULT_PEERS;
  return safeParseArray(localStorage.getItem(LS_KEYS.enabled), DEFAULT_PEERS);
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
watch(peersList, (val) => savePeersListToStorage([...new Set(val.filter(Boolean))])),
watch(enabledPeers, (val) => saveEnabledPeersToStorage([...new Set(val.filter(Boolean))]))

// Gun 实例：实际使用的 relay 为 enabledPeers
export let gun: any = Gun({ peers: enabledPeers.value, localStorage: false });
if (typeof window !== 'undefined') {
  (window as any).gun = gun;
}


watch(enabledPeers, (peers) => {
  const uniqPeers = [...new Set((peers || []).filter(Boolean))];
  gun = Gun({ peers: uniqPeers, localStorage: false });
  if (typeof window !== 'undefined') {
    (window as any).gun = gun;
  }

});

// —— 公开的操作：新增 / 删除 / 启用切换 ——
export function addRelay(url: string) {
  const u = (url || '').trim();
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
  gun = Gun({ peers, localStorage: false })
 
  if (typeof window !== 'undefined') {
    (window as any).gun = gun
  }
}

export function recreateGunWithPeers(newPeers: string[]) {
  const peers = [...new Set((newPeers || []).filter(Boolean))]
  gun = Gun({ peers, localStorage: false })

  if (typeof window !== 'undefined') {
    (window as any).gun = gun
  }
}

export function createIsolatedGun(peers: string[]) {
  const uniq = [...new Set((peers || []).filter(Boolean))]
  return Gun({ peers: uniq, localStorage: false })
}

// 重新连接到当前启用的 peers，并触发一次心跳写入以强制建立连接
export function reconnectGunPeers() {
  const peers = [...new Set((enabledPeers.value || []).filter(Boolean))]
  // 使用官方建议的方式重新添加 peers
  try {
    gun.opt({ peers })
  } catch (e) {
    // 如果现有实例不可用，回退到重新创建实例
    gun = Gun({ peers, localStorage: false })
  }
  // 可选：写入一个很小的心跳，强制建立连接并接收可能缺失的 on() 事件
  try {
    gun.get('key').get('heartbeat').put('heartbeat')
  } catch {}
  if (typeof window !== 'undefined') {
    (window as any).gun = gun
  }
}


