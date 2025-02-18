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







  // AES 加解密（用于离线存储私钥）
  function encryptData(data: string, pass: string): string {
    return crypto.AES.encrypt(data, pass).toString()
  }
  function decryptData(encrypted: string, pass: string): string | null {
    try {
      const bytes = crypto.AES.decrypt(encrypted, pass)
      const decoded = bytes.toString(crypto.enc.Utf8)
      return decoded || null
    } catch (err) {
      console.error('[decryptData] err:', err)
      return null
    }
  }

  function copyPub(pub: string | null) {
    if (!pub) {
      alert('无效的密钥')
      return
    }
    navigator.clipboard
      .writeText(pub)
      .then(() => alert('已复制密钥'))
      .catch((err) => {
        console.error('复制失败:', err)
        // alert('复制失败，请手动复制')
      })
  }


  async function triggerLightHaptic() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
      console.log('轻微震动已触发')
    } catch (error) {
      console.error('触发震动失败：', error)
    }
  }

  async function notifyNewMessage(title: string, body: string) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(), // 使用时间戳作为通知 ID（保证唯一）
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) }, // 1秒后触发通知
            sound: 'default', // 如需要可指定铃声文件
          },
        ],
      })
      console.log('本地通知已发送')
    } catch (error) {
      console.error('发送本地通知失败:', error)
    }
  }
