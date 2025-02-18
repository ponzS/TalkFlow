// src/composables/MomentsModule.ts
import { ref } from 'vue'
import chatFlowStore from '@/composables/TalkFlowCore'
import './gun-ionic-adapter'

/** 每个块最大存多少条动态，可自行调整 */
const CHUNK_SIZE = 10

/** 点赞信息接口 */
export interface LikedInfo {
  liked: boolean
  alias: string
}

/** 动态接口 */
export interface Moment {
  id: string
  pub: string
  content: string
  timestamp: number
  likes: number
  hidden: boolean
  // 兼容旧数据：likedBy 可能是 { [pub]: boolean | LikedInfo }
  likedBy?: Record<string, LikedInfo | boolean>
  // 建议多加一个 chunkIndex，用来记录自己处于哪个块
  chunkIndex?: number
}

/** 公共的动态列表（若需要） */
const publicMoments = ref<Moment[]>([])
/** 我自己的动态列表 */
const myMoments = ref<Moment[]>([])

/** 1) 发布动态：按数量分块存储 */
export async function publishMoment(content: string) {
  const currentPub = chatFlowStore.currentUserPub.value
  if (!currentPub) {
    alert('请先登录')
    return
  }
  const timestamp = Date.now()
  const momentId = `${currentPub}_${timestamp}`
  const momentData: Moment = {
    id: momentId,
    pub: currentPub,
    content,
    timestamp,
    likes: 0,
    hidden: false,
    likedBy: {},
    chunkIndex: 0, // 先占位，后面会修正
  }

  const userMomentsRef = chatFlowStore.gun
    .get('users')
    .get(currentPub)
    .get('moments')

  // 1. 读取最新块号
  let latestChunk = await getLatestChunkIndex(currentPub)

  // 2. 判断该块已有多少条
  const countInChunk = await getChunkCount(userMomentsRef, latestChunk)
  if (countInChunk >= CHUNK_SIZE) {
    // 如果超出上限，块号 + 1
    latestChunk++
    // 写回
    await new Promise<void>((resolve) => {
      userMomentsRef.get('latestChunk').put(latestChunk, () => resolve())
    })
  }
  momentData.chunkIndex = latestChunk

  // 3. 写到 chunks/latestChunk 下
  userMomentsRef
    .get('chunks')
    .get(String(latestChunk))
    .get(momentId)
    .put(momentData, (ack: any) => {
      if (ack.err) {
        alert('发布动态失败: ' + ack.err)
      } else {
        console.log('动态发布成功!')
      }
    })
}

/** 获取用户 moments 下的 latestChunk (默认返回0) */
export function getLatestChunkIndex(pub: string): Promise<number> {
  return new Promise<number>((resolve) => {
    chatFlowStore.gun
      .get('users')
      .get(pub)
      .get('moments')
      .get('latestChunk')
      .once((val: number) => {
        resolve(val || 0)
      })
  })
}

/** 统计某块下已有多少条动态 */
export function getChunkCount(userMomentsRef: any, chunkIndex: number): Promise<number> {
  return new Promise((resolve) => {
    let count = 0
    userMomentsRef
      .get('chunks')
      .get(String(chunkIndex))
      .map()
      .once((d: any) => {
        if (d) count++
      })
    setTimeout(() => resolve(count), 400)
  })
}

/** 2) 监听某个用户的某个 chunk 下所有动态 */
export function listenOneChunk(
  userPub: string,
  chunkIndex: number,
  targetArray: { value: Moment[] },
  isPublic?: boolean
) {
  const chunkRef = chatFlowStore.gun
    .get('users')
    .get(userPub)
    .get('moments')
    .get('chunks')
    .get(String(chunkIndex))

  chunkRef.map().on((data: any, id: string) => {
    if (!data) {
      // 动态被删除
      const idx = targetArray.value.findIndex((m) => m.id === id)
      if (idx >= 0) {
        targetArray.value.splice(idx, 1)
        targetArray.value = [...targetArray.value]
      }
      return
    }

    // 如果是公共动态模式，只收集 hidden=false
    if (isPublic && data.hidden) {
      // 如果已存在，删除
      const existing = targetArray.value.findIndex((m) => m.id === id)
      if (existing >= 0) {
        targetArray.value.splice(existing, 1)
        targetArray.value = [...targetArray.value]
      }
      return
    }

    // 写上 chunkIndex
    data.chunkIndex = chunkIndex

    // 插入或更新
    const existIdx = targetArray.value.findIndex((m) => m.id === id)
    if (existIdx >= 0) {
      targetArray.value.splice(existIdx, 1, data)
    } else {
      targetArray.value.unshift(data)
    }
    targetArray.value.sort((a, b) => b.timestamp - a.timestamp)
    targetArray.value = [...targetArray.value]

    // 建立点赞监听
    attachLikesListener(data, userPub, chunkIndex)
  })
}

/** 对单条动态的 likedBy 做 map().on 监听 */
export function attachLikesListener(
  moment: Moment,
  userPub: string,
  chunkIndex: number
) {
  if (!moment) return
  // 防止重复监听
  if ((moment as any).__likedByMapOnAttached) return
  ;(moment as any).__likedByMapOnAttached = true

  const ref = chatFlowStore.gun
    .get('users')
    .get(userPub)
    .get('moments')
    .get('chunks')
    .get(String(chunkIndex))
    .get(moment.id)

  ref
    .get('likedBy')
    .map()
    .on((val: any, key: string) => {
      if (!moment.likedBy) {
        moment.likedBy = {}
      }
      if (val) {
        moment.likedBy[key] = val
      } else {
        delete moment.likedBy[key]
      }

      // 重新统计
      let count = 0
      Object.keys(moment.likedBy).forEach((k) => {
        if (k === '_') return
        const record = moment.likedBy![k]
        if (typeof record === 'object' && record !== null) {
          if ((record as LikedInfo).liked) count++
        } else if (record === true) {
          count++
        }
      })
      moment.likes = count
      forceUpdateMoment(moment)
    })
}

/** 强制刷新 moment 在 myMoments/publicMoments 中的引用 */
export function forceUpdateMoment(updatedMoment: Moment) {
  // 更新 publicMoments
  {
    const idx = publicMoments.value.findIndex((m) => m.id === updatedMoment.id)
    if (idx >= 0) {
      publicMoments.value[idx] = { ...updatedMoment }
      publicMoments.value = [...publicMoments.value]
    }
  }
  // 更新 myMoments
  {
    const idx = myMoments.value.findIndex((m) => m.id === updatedMoment.id)
    if (idx >= 0) {
      myMoments.value[idx] = { ...updatedMoment }
      myMoments.value = [...myMoments.value]
    }
  }
}

/** 切换隐藏/公开 */
export function toggleMomentVisibility(moment: Moment) {
  const currentPub = chatFlowStore.currentUserPub.value
  if (!currentPub) return
  const chunkIndex = moment.chunkIndex || 0
  chatFlowStore.gun
    .get('users')
    .get(currentPub)
    .get('moments')
    .get('chunks')
    .get(String(chunkIndex))
    .get(moment.id)
    .put({ hidden: !moment.hidden })
}

/** 删除动态 */
export function deleteMoment(moment: Moment) {
  const currentPub = chatFlowStore.currentUserPub.value
  if (!currentPub) return
  const chunkIndex = moment.chunkIndex || 0
  chatFlowStore.gun
    .get('users')
    .get(currentPub)
    .get('moments')
    .get('chunks')
    .get(String(chunkIndex))
    .get(moment.id)
    .put(null, (ack: any) => {
      if (ack.err) {
        alert('删除失败: ' + ack.err)
      } else {
        console.log('动态删除成功')
      }
    })
}

/** 点赞 */
export function likeMoment(moment: Moment) {
  const currentUser = chatFlowStore.currentUserPub.value
  if (!currentUser) return
  const chunkIndex = moment.chunkIndex || 0

  const ref = chatFlowStore.gun
    .get('users')
    .get(moment.pub)
    .get('moments')
    .get('chunks')
    .get(String(chunkIndex))
    .get(moment.id)

  ref.get('likedBy').get(currentUser).once((data: any) => {
    if (data && (data.liked === true || data === true)) {
      alert('你已经点过赞了')
      return
    }
    const alias = chatFlowStore.getAliasRealtime(currentUser) || ''
    ref
      .get('likedBy')
      .get(currentUser)
      .put({ liked: true, alias }, (ack: any) => {
        if (ack.err) {
          alert('点赞失败: ' + ack.err)
        } else {
          console.log('点赞成功')
        }
      })
  })
}

/** 获取用户头像（示例） */
const userAvatars = ref<Record<string, string>>({})
export function getUserAvatar(pub: string) {
  return userAvatars.value[pub] || ''
}
export function listenUserAvatar(pub: string) {
  chatFlowStore.gun
    .get('users')
    .get(pub)
    .get('avatar')
    .on((val: string) => {
      userAvatars.value[pub] = val || ''
    })
}



/** ----------------------------------------------------------------------------
 * 7) 最后导出
 * ----------------------------------------------------------------------------*/
export {
  publicMoments,
  myMoments,

  listenMyMoments,
  listenPublicMoments,

  userAvatars,

}