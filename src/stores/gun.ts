import { ref, computed, nextTick } from 'vue'
import Gun from 'gun'
import 'gun/sea'
import 'gun/axe'
import * as crypto from 'crypto-js'
import { Storage } from '@ionic/storage'
import { Drivers } from '@ionic/storage'
import router from '@/router/index'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import 'gun/lib/radix'
import 'gun/lib/radisk'
import 'gun/lib/store'
import 'gun/lib/rindexed'
import "gun/lib/then";
import "gun/lib/webrtc";
import CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';




const peers = ref<string[]>([
    'https://peer.wallie.io/gun',
    'https://gun-manhattan.herokuapp.com/gun',
    'http://172.20.10.2:4200/gun',
    'http://192.168.50.36:4200/gun',
  ])
  
  /** 当前节点（用户可能想显式选择一个“主”节点来连接） */
  const currentPeer = ref<string | null>(peers.value[0] ?? null)
  
  /** 将 Gun 配置为可动态更新 peers */
  const gunConfig = computed(() => ({
   // file: 'db/data.json',
    peers: peers.value,
    localStorage: false,
    radisk: true,
    // file: false,
    // db:{
    //   file: "gun.db",
    //   exclusive : false
    // }
  }))
  
  const gun = Gun(gunConfig.value)
  
  // 当 peers 数组改变时，动态通知 Gun
  watch(peers, (newVal) => {
    gun.opt({ peers: newVal })
  }, { immediate: true })
  
  // 加载持久化存储（如 localStorage）
  function loadPeersFromStorage() {
    const savedPeers = localStorage.getItem('gun_peers');
    if (savedPeers) {
      peers.value = JSON.parse(savedPeers);
    }
  
    // 加载 currentPeer
    const savedCurrentPeer = localStorage.getItem('gun_current_peer');
    if (savedCurrentPeer && peers.value.includes(savedCurrentPeer)) {
      currentPeer.value = savedCurrentPeer;
    } else {
      // 如果保存的节点不在 peers 中，回退到第一个或 null
      currentPeer.value = peers.value.length ? peers.value[0] : null;
    }
  }
  
  // 保存peers到 localStorage
  function savePeersToStorage() {
    localStorage.setItem('gun_peers', JSON.stringify(peers.value))
  }
  
  /** 添加节点 */
  function addPeer(peerUrl: string) {
    if (peerUrl && !peers.value.includes(peerUrl)) {
      peers.value.push(peerUrl)
      savePeersToStorage()
    }
  }
  
  /** 删除节点 */
  function removePeer(peerUrl: string) {
    const idx = peers.value.indexOf(peerUrl)
    if (idx > -1) {
      peers.value.splice(idx, 1)
      savePeersToStorage()
      if (currentPeer.value === peerUrl) {
        // 若当前使用的节点被删除，则改用 peers[0] 或 null
        currentPeer.value = peers.value[0] ?? null
      }
    }
  }
  
  /** 切换当前使用的节点 */
  function switchPeer(peerUrl: string) {
    if (peers.value.includes(peerUrl)) {
      currentPeer.value = peerUrl;
       // 保存 currentPeer
       localStorage.setItem('gun_current_peer', peerUrl);
    }
  }
  
