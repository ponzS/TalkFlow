import Gun from 'gun';
import 'gun/sea';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/webrtc';
import 'gun/lib/axe';
import 'gun/lib/file';
import 'gun/lib/store';
import 'gun/lib/rindexed';
import 'gun/lib/mobile';
import { ref, onMounted } from 'vue';

// 默认节点列表
const defaultPeersList = [
  'https://peer.wallie.io/gun',
  // 'https://a.talkflow.team/gun',
  // 'https://gun.defucc.me/gun',
  // 'https://relay.peer.ooo/gun',
];

// 从localStorage加载节点列表，如果不存在则使用默认值
function loadPeersListFromStorage(): string[] {
  try {
    const stored = localStorage.getItem('gun_peers_list');
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : defaultPeersList;
    }
  } catch (error) {
  //  console.error('[loadPeersListFromStorage] 解析失败:', error);
    return defaultPeersList;
  }
  return defaultPeersList;
}

// 从localStorage加载启用的节点，如果不存在则返回空数组（不再回退为全部节点）
function loadEnabledPeersFromStorage(): string[] {
  try {
    const stored = localStorage.getItem('gun_enabled_peers');
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
      return defaultPeersList;
  
  }
    return defaultPeersList;
}

export const peersList = ref<string[]>(loadPeersListFromStorage());
export const enabledPeers = ref<string[]>(loadEnabledPeersFromStorage());

// 保存节点列表到localStorage
export function savePeersListToStorage(peers: string[]) {
  try {
    localStorage.setItem('gun_peers_list', JSON.stringify(peers));
  } catch (error) {
  //  console.error('[savePeersListToStorage] 保存失败:', error);
  }
}

// 保存启用节点到localStorage
export function saveEnabledPeersToStorage(peers: string[]) {
  try {
    localStorage.setItem('gun_enabled_peers', JSON.stringify(peers));
  } catch (error) {
   // console.error('[saveEnabledPeersToStorage] 保存失败:', error);
  }
}

export function loadRelays() {
  try {
    // 从localStorage加载启用的节点
    const enabledPeersList = loadEnabledPeersFromStorage();
    return enabledPeersList;
  } catch (error) {
  //  console.error('[loadRelays] 加载节点失败:', error);
    return defaultPeersList;
  }
}

// onMounted(() => {
//   loadRelays();
  
// });


const peersgun = loadRelays();

// 记录当前实例所使用的 peers，用于避免重复重建
let currentPeers: string[] = Array.from(new Set((peersgun || []).filter(Boolean)));

export let gun = new Gun({
   peers: peersgun, 
    localStorage: false,
});
//console.log('peersgun', peersgun);

if (typeof window !== 'undefined') {
  (window as any).gun = gun;
}

export let gun1 = new Gun({
  peers: peersgun, 
  localStorage: false,
});
if (typeof window !== 'undefined') {
  (window as any).gun1 = gun1;
}

// 封装清理旧实例的连接（尽力而为，避免泄漏并发起重复连接）
function cleanupGunInstance(instance: any) {
  try {
    const peers = instance?._?.opt?.peers || {};
    for (const p of Object.values(peers) as any[]) {
      try { p?.wire?.close?.(); } catch {}
      try { p?.ws?.close?.(); } catch {}
      try { p?.wire?.terminate?.(); } catch {}
    }
    // 移除所有监听器
    try { instance?.off?.(); } catch {}
  } catch {}
}

// 比较两组 peers 是否相同（忽略顺序与重复）
function peersEqual(a: string[] = [], b: string[] = []) {
  const sa = new Set((a || []).filter(Boolean));
  const sb = new Set((b || []).filter(Boolean));
  if (sa.size !== sb.size) return false;
  for (const v of sa) if (!sb.has(v)) return false;
  return true;
}

export function CreateNewGun() {
  // 清理并重建
   cleanupGunInstance(gun1);
  gun1 = new Gun({
    peers: peersgun, 
    localStorage: false,
  });
  currentPeers = Array.from(new Set((peersgun || []).filter(Boolean)));
  if (typeof window !== 'undefined') {
    (window as any).gun1 = gun1;
  }
}

// 新增：根据传入的节点地址列表重建一个新的 Gun 实例（用于自定义群组切换）
export function recreateGunWithPeers(newPeers: string[]) {
  try {
    if (!Array.isArray(newPeers)) {
      throw new Error('newPeers must be an array of strings');
    }
    const uniqPeers = Array.from(new Set(newPeers.filter(Boolean)));
    // 如果 peers 未变化，直接跳过避免重复创建
    if (peersEqual(currentPeers, uniqPeers)) {
      return;
    }
    // 关闭旧实例的连接，避免同一地址出现双连接
    cleanupGunInstance(gun1);
    gun1 = new Gun({
      peers: uniqPeers,
      localStorage: false,
    });
    currentPeers = [...uniqPeers];
    if (typeof window !== 'undefined') {
      (window as any).gun1 = gun1;
    }
  } catch (e) {
    // silently fail to avoid breaking UI
  }
}

// —— 新增导出：为每个模块创建独立实例（不影响全局 gun） ——
export function createIsolatedGun(peers: string[]) {
  const uniq = Array.from(new Set((peers || []).filter(Boolean)));
  return new Gun({ peers: uniq, localStorage: false });
}

export function destroyGunInstance(instance: any) {
  if (!instance) return;
  cleanupGunInstance(instance);
}


// if (typeof window !== 'undefined') {
//   (window as any).gun = gun;
// }

