import { computed, ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';

export type FriendRequestDirection = 'in' | 'out';
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'ignored';

export type FriendRequestItem = {
  requestId: string;
  direction: FriendRequestDirection;
  peerPub: string;
  peerEpub: string;
  peerAlias: string;
  peerAvatar: string;
  message: string;
  status: FriendRequestStatus;
  timestamp: number;
};

function normalizePub(input: string) {
  const v = String(input ?? '').trim();
  if (!v) return '';
  return v.replace(/^pubkey:/i, '').trim();
}

function tryParseJson(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function extractEpubFromCredentialsRaw(raw: string) {
  const first = tryParseJson(raw);
  if (!first) return '';
  if (typeof first === 'string') {
    const second = tryParseJson(first);
    if (second && typeof second === 'object') return String((second as any).epub ?? '').trim();
    return '';
  }
  if (typeof first === 'object') return String((first as any).epub ?? '').trim();
  return '';
}

async function getMyEpubOrThrow() {
  const core = getTalkFlowCore();
  const fromCore = String((core as any)?.currentUserPair?.epub ?? '').trim();
  if (fromCore) return fromCore;

  try {
    const pair = await (core as any).getMyKeyPair?.();
    const epub = String(pair?.epub ?? '').trim();
    if (epub) return epub;
  } catch {}

  try {
    const raw = localStorage.getItem('talkflow_user_credentials') || localStorage.getItem('userCredentials') || '';
    const epub = extractEpubFromCredentialsRaw(raw);
    if (epub) return epub;
  } catch {}

  throw new Error('Missing epub (please re-login to restore your keypair)');
}

let dbReady = false;
let startedPub: string | null = null;
let started = false;

const incomingRequests = ref<FriendRequestItem[]>([]);
const outgoingRequests = ref<FriendRequestItem[]>([]);
const busy = ref(false);
const statusText = ref('');

let receivedOnChain: any;
let receivedMapChain: any;
let acceptedOnChain: any;
let acceptedMapChain: any;

async function ensureDb() {
  if (dbReady) return;
  const { storageServ } = getTalkFlowCore();
  await storageServ.run(`
    CREATE TABLE IF NOT EXISTS friend_requests_v2 (
      request_id TEXT PRIMARY KEY,
      direction TEXT NOT NULL,
      peer_pub TEXT NOT NULL,
      peer_epub TEXT DEFAULT '',
      peer_alias TEXT DEFAULT '',
      peer_avatar TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
  `);
  await storageServ.run(`CREATE INDEX IF NOT EXISTS idx_friend_requests_v2_dir_status ON friend_requests_v2(direction, status);`);
  await storageServ.run(`CREATE INDEX IF NOT EXISTS idx_friend_requests_v2_peer_pub ON friend_requests_v2(peer_pub);`);
  dbReady = true;
}

async function upsertRequest(req: FriendRequestItem) {
  const { storageServ } = getTalkFlowCore();
  await ensureDb();
  await storageServ.run(
    `
      INSERT OR REPLACE INTO friend_requests_v2
      (request_id, direction, peer_pub, peer_epub, peer_alias, peer_avatar, message, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      req.requestId,
      req.direction,
      req.peerPub,
      req.peerEpub || '',
      req.peerAlias || '',
      req.peerAvatar || '',
      req.message || '',
      req.status,
      req.timestamp,
    ],
  );
}

async function setRequestStatus(direction: FriendRequestDirection, requestId: string, status: FriendRequestStatus) {
  const { storageServ } = getTalkFlowCore();
  await ensureDb();
  await storageServ.run(`UPDATE friend_requests_v2 SET status = ? WHERE direction = ? AND request_id = ?`, [status, direction, requestId]);
}

async function loadRequests(direction: FriendRequestDirection) {
  const { storageServ } = getTalkFlowCore();
  await ensureDb();
  const result = await storageServ.query(
    `SELECT request_id, direction, peer_pub, peer_epub, peer_alias, peer_avatar, message, status, timestamp
     FROM friend_requests_v2
     WHERE direction = ?
     ORDER BY timestamp DESC`,
    [direction],
  );
  const rows = (result?.values ?? []) as any[];
  return rows.map((r) => {
    return {
      requestId: String(r.request_id),
      direction: (r.direction as FriendRequestDirection) || direction,
      peerPub: String(r.peer_pub ?? ''),
      peerEpub: String(r.peer_epub ?? ''),
      peerAlias: String(r.peer_alias ?? ''),
      peerAvatar: String(r.peer_avatar ?? ''),
      message: String(r.message ?? ''),
      status: (String(r.status ?? 'pending') as FriendRequestStatus) || 'pending',
      timestamp: Number(r.timestamp ?? Date.now()),
    } satisfies FriendRequestItem;
  });
}

async function reloadAll() {
  const [incoming, outgoing] = await Promise.all([loadRequests('in'), loadRequests('out')]);
  incomingRequests.value = incoming;
  outgoingRequests.value = outgoing;
}

async function ensureBuddy(peerPub: string, peerAlias: string, peerAvatar: string, peerEpub: string) {
  const core = getTalkFlowCore();
  const myPub = normalizePub(core.currentUserPub.value || '');
  if (!myPub) return;

  const exists = core.buddyList.value.some((b) => b.pub === peerPub);
  if (!exists) {
    const now = Date.now();
    const buddy = {
      pub: peerPub,
      addedByMe: true,
      timestamp: now,
      alias: peerAlias || '',
      avatar: peerAvatar || '',
      epub: peerEpub || '',
      epubSource: peerEpub ? ('network' as const) : undefined,
      connectionStatus: 'unknown' as const,
      syncRetryCount: 0,
    };
    core.buddyList.value = [...core.buddyList.value, buddy];
    await core.storageServ.saveBuddy(myPub, peerPub, now, buddy.alias, buddy.avatar, buddy.epub);
    core.gun.get('users').get(myPub).get('buddy').get(peerPub).put({ v: true });
  }

  try {
    core.listenChat(peerPub);
    core.listenUserAlias(peerPub);
    core.listenUserAvatar(peerPub);
    core.listenFriendSignature(peerPub);
  } catch {}
}

function stopSubscriptions() {
  try {
    receivedOnChain?.off?.();
  } catch {}
  try {
    receivedMapChain?.off?.();
  } catch {}
  try {
    acceptedOnChain?.off?.();
  } catch {}
  try {
    acceptedMapChain?.off?.();
  } catch {}
  receivedOnChain = null;
  receivedMapChain = null;
  acceptedOnChain = null;
  acceptedMapChain = null;
  startedPub = null;
}

function deleteReceivedFromNetwork(myPub: string, requestId: string) {
  const core = getTalkFlowCore();
  const receivedChain = core.gun.get('requests').get(myPub).get('received');
  try {
    receivedChain.get(requestId).put(null);
  } catch {}
  try {
    receivedChain.put(null);
  } catch {}
}

function deleteAcceptedFromNetwork(myPub: string, requestId: string) {
  const core = getTalkFlowCore();
  const acceptedChain = core.gun.get('requests').get(myPub).get('accepted');
  try {
    acceptedChain.get(requestId).put(null);
  } catch {}
  try {
    acceptedChain.put(null);
  } catch {}
}

async function handleIncomingPayload(data: any, key?: string) {
  const core = getTalkFlowCore();
  const myPub = normalizePub(core.currentUserPub.value || '');
  if (!myPub) return;

  const fromPub = normalizePub(String(data?.from ?? key ?? ''));
  if (!fromPub) return;
  if (core.isInMyBlacklist(fromPub)) return;

  const requestId = normalizePub(String(data?.requestId ?? key ?? fromPub));
  const message = String(data?.message ?? '');
  const alias = String(data?.alias ?? '');
  const avatar = String(data?.avatar ?? '');
  const epub = String(data?.epub ?? '');
  const timestamp = Number(data?.timestamp ?? Date.now());

  const isFriend = core.buddyList.value.some((b) => b.pub === fromPub);
  const existingIn = incomingRequests.value.find((r) => r.direction === 'in' && r.requestId === requestId);
  const status: FriendRequestStatus = existingIn?.status === 'accepted' ? 'accepted' : isFriend ? 'ignored' : 'pending';

  const item: FriendRequestItem = {
    requestId,
    direction: 'in',
    peerPub: fromPub,
    peerEpub: epub,
    peerAlias: alias,
    peerAvatar: avatar,
    message,
    status,
    timestamp,
  };
  await upsertRequest(item);
  await reloadAll();

  if (isFriend) {
    deleteReceivedFromNetwork(myPub, requestId);
  }
}

async function handleAcceptedPayload(data: any) {
  const core = getTalkFlowCore();
  const myPub = normalizePub(core.currentUserPub.value || '');
  if (!myPub) return;

  const peerPub = normalizePub(String(data?.to ?? data?.toPub ?? ''));
  const requestId = String(data?.requestId ?? '').trim();
  if (!peerPub || !requestId) return;

  const toEpub = String(data?.toEpub ?? '');
  const toNickname = String(data?.toNickname ?? '');
  const toAvatar = String(data?.toAvatar ?? '');

  const existingOut = outgoingRequests.value.find((r) => r.direction === 'out' && r.requestId === requestId);
  const alreadyAccepted = existingOut?.status === 'accepted';
  const hasBuddy = core.buddyList.value.some((b) => b.pub === peerPub);

  if (alreadyAccepted && !hasBuddy) {
    deleteAcceptedFromNetwork(myPub, requestId);
    return;
  }

  if (existingOut && existingOut.status !== 'accepted') {
    await setRequestStatus('out', requestId, 'accepted');
  }

  await ensureBuddy(peerPub, toNickname, toAvatar, toEpub);
  await reloadAll();
  deleteAcceptedFromNetwork(myPub, requestId);
}

function startSubscriptions(myPub: string) {
  const core = getTalkFlowCore();
  if (!myPub) return;
  if (startedPub === myPub) return;
  stopSubscriptions();
  startedPub = myPub;

  const receivedChain = core.gun.get('requests').get(myPub).get('received');
  const acceptedChain = core.gun.get('requests').get(myPub).get('accepted');

  receivedOnChain = receivedChain.on(async (data: any) => {
    if (!data || !data.from) return;
    await handleIncomingPayload(data);
  });

  receivedMapChain = receivedChain.map().on(async (data: any, key: string) => {
    if (!data || !key) return;
    if (typeof data === 'object' && data.from) {
      await handleIncomingPayload(data, key);
    }
  });

  acceptedOnChain = acceptedChain.on(async (data: any) => {
    if (!data) return;
    await handleAcceptedPayload(data);
  });

  acceptedMapChain = acceptedChain.map().on(async (data: any) => {
    if (!data) return;
    await handleAcceptedPayload(data);
  });
}

async function sendFriendRequest(toPubRaw: string, messageRaw: string) {
  const core = getTalkFlowCore();
  const toPub = normalizePub(toPubRaw);
  const myPub = normalizePub(core.currentUserPub.value || '');
  if (!myPub) throw new Error('Please log in first');
  if (!toPub) throw new Error('Public key is empty');
  if (toPub === myPub) throw new Error('Cannot add yourself');
  if (core.isInMyBlacklist(toPub)) throw new Error('User is in blacklist');
  if (core.buddyList.value.some((b) => b.pub === toPub)) return;

  const myEpub = await getMyEpubOrThrow();

  const requestId = uuidv4();
  const timestamp = Date.now();
  const payload = {
    requestId,
    from: myPub,
    to: toPub,
    message: String(messageRaw ?? '').trim(),
    alias: String(core.currentUserAlias.value ?? '').trim(),
    avatar: String(core.userAvatars.value?.[myPub] ?? ''),
    epub: myEpub,
    timestamp,
  };

  busy.value = true;
  statusText.value = '';
  try {
    await upsertRequest({
      requestId,
      direction: 'out',
      peerPub: toPub,
      peerEpub: '',
      peerAlias: '',
      peerAvatar: '',
      message: payload.message,
      status: 'pending',
      timestamp,
    });

    const receivedChain = core.gun.get('requests').get(toPub).get('received');
    try {
      receivedChain.get(requestId).put(payload);
    } catch {}
    try {
      receivedChain.put(payload);
    } catch {}

    await reloadAll();
  } finally {
    busy.value = false;
  }
}

async function resendFriendRequest(request: FriendRequestItem) {
  const core = getTalkFlowCore();
  const myPub = normalizePub(core.currentUserPub.value || '');
  if (!myPub) throw new Error('Please log in first');

  const requestId = String(request?.requestId ?? '').trim();
  if (!requestId) throw new Error('Missing requestId');

  const toPub = normalizePub(request.peerPub);
  if (!toPub) throw new Error('Public key is empty');
  if (toPub === myPub) throw new Error('Cannot add yourself');
  if (core.isInMyBlacklist(toPub)) throw new Error('User is in blacklist');
  if (core.buddyList.value.some((b) => b.pub === toPub)) return;

  const myEpub = await getMyEpubOrThrow();
  const timestamp = Date.now();
  const payload = {
    requestId,
    from: myPub,
    to: toPub,
    message: String(request.message ?? '').trim(),
    alias: String(core.currentUserAlias.value ?? '').trim(),
    avatar: String(core.userAvatars.value?.[myPub] ?? ''),
    epub: myEpub,
    timestamp,
  };

  busy.value = true;
  statusText.value = '';
  try {
    await upsertRequest({
      requestId,
      direction: 'out',
      peerPub: toPub,
      peerEpub: '',
      peerAlias: '',
      peerAvatar: '',
      message: payload.message,
      status: 'pending',
      timestamp,
    });

    const receivedChain = core.gun.get('requests').get(toPub).get('received');
    try {
      receivedChain.get(requestId).put(payload);
    } catch {}
    try {
      receivedChain.put(payload);
    } catch {}

    await reloadAll();
  } finally {
    busy.value = false;
  }
}

async function refreshFromNetwork() {
  const core = getTalkFlowCore();
  const myPub = normalizePub(core.currentUserPub.value || '');
  if (!myPub) return;

  busy.value = true;
  statusText.value = '';
  try {
    stopSubscriptions();
    startSubscriptions(myPub);

    const receivedChain = core.gun.get('requests').get(myPub).get('received');
    const acceptedChain = core.gun.get('requests').get(myPub).get('accepted');

    try {
      receivedChain.map().once(async (data: any, key: string) => {
        if (!data || !key) return;
        if (typeof data === 'object' && data.from) {
          await handleIncomingPayload(data, key);
        }
      });
    } catch {}

    try {
      acceptedChain.map().once(async (data: any) => {
        if (!data) return;
        await handleAcceptedPayload(data);
      });
    } catch {}

    await new Promise((r) => setTimeout(r, 600));
    await reloadAll();
  } finally {
    busy.value = false;
    statusText.value = '';
  }
}

async function acceptRequest(request: FriendRequestItem) {
  const core = getTalkFlowCore();
  const myPub = normalizePub(core.currentUserPub.value || '');
  if (!myPub) throw new Error('Please log in first');

  const fromPub = normalizePub(request.peerPub);
  if (!fromPub) return;
  if (core.isInMyBlacklist(fromPub)) {
    await setRequestStatus('in', request.requestId, 'ignored');
    await reloadAll();
    return;
  }

  busy.value = true;
  try {
    const myEpub = await getMyEpubOrThrow();
    const myNickname = String(core.currentUserAlias.value ?? '').trim();
    const myAvatar = String(core.userAvatars.value?.[myPub] ?? '');

    await ensureBuddy(fromPub, request.peerAlias, request.peerAvatar, request.peerEpub);
    await setRequestStatus('in', request.requestId, 'accepted');

    const receivedChain = core.gun.get('requests').get(myPub).get('received');
    try {
      receivedChain.get(request.requestId).put(null);
    } catch {}
    try {
      receivedChain.put(null);
    } catch {}

    const acceptedPayload = {
      requestId: request.requestId,
      from: fromPub,
      to: myPub,
      toEpub: myEpub,
      toNickname: myNickname,
      toAvatar: myAvatar,
      timestamp: Date.now(),
    };
    const acceptedChain = core.gun.get('requests').get(fromPub).get('accepted');
    try {
      acceptedChain.get(request.requestId).put(acceptedPayload);
    } catch {}
    try {
      acceptedChain.put(acceptedPayload);
    } catch {}

    await reloadAll();
  } finally {
    busy.value = false;
  }
}

async function resendAcceptedReceipt(request: FriendRequestItem) {
  const core = getTalkFlowCore();
  const myPub = normalizePub(core.currentUserPub.value || '');
  if (!myPub) throw new Error('Please log in first');

  const fromPub = normalizePub(request.peerPub);
  if (!fromPub) throw new Error('Public key is empty');
  if (core.isInMyBlacklist(fromPub)) throw new Error('User is in blacklist');

  busy.value = true;
  statusText.value = '';
  try {
    const myEpub = await getMyEpubOrThrow();
    const myNickname = String(core.currentUserAlias.value ?? '').trim();
    const myAvatar = String(core.userAvatars.value?.[myPub] ?? '');

    await ensureBuddy(fromPub, request.peerAlias, request.peerAvatar, request.peerEpub);
    await setRequestStatus('in', request.requestId, 'accepted');

    const acceptedPayload = {
      requestId: request.requestId,
      from: fromPub,
      to: myPub,
      toEpub: myEpub,
      toNickname: myNickname,
      toAvatar: myAvatar,
      timestamp: Date.now(),
    };
    const acceptedChain = core.gun.get('requests').get(fromPub).get('accepted');
    try {
      acceptedChain.get(request.requestId).put(acceptedPayload);
    } catch {}
    try {
      acceptedChain.put(acceptedPayload);
    } catch {}

    await reloadAll();
  } finally {
    busy.value = false;
  }
}

async function rejectRequest(request: FriendRequestItem) {
  const core = getTalkFlowCore();
  const myPub = normalizePub(core.currentUserPub.value || '');
  if (!myPub) throw new Error('Please log in first');

  busy.value = true;
  try {
    await setRequestStatus('in', request.requestId, 'rejected');
    const receivedChain = core.gun.get('requests').get(myPub).get('received');
    try {
      receivedChain.get(request.requestId).put(null);
    } catch {}
    try {
      receivedChain.put(null);
    } catch {}
    await reloadAll();
  } finally {
    busy.value = false;
  }
}

export function useFriendRequests() {
  const core = getTalkFlowCore();

  if (!started) {
    started = true;
    watch(
      () => core.currentUserPub.value,
      async (pub) => {
        const myPub = normalizePub(pub || '');
        if (!myPub) {
          stopSubscriptions();
          incomingRequests.value = [];
          outgoingRequests.value = [];
          return;
        }
        await ensureDb();
        await reloadAll();
        startSubscriptions(myPub);
      },
      { immediate: true },
    );
  }

  const pendingOutgoingCount = computed(() => outgoingRequests.value.filter((r) => r.status === 'pending').length);

  return {
    incomingRequests,
    outgoingRequests,
    pendingOutgoingCount,
    busy,
    statusText,
    reloadAll,
    refreshFromNetwork,
    sendFriendRequest,
    resendFriendRequest,
    acceptRequest,
    resendAcceptedReceipt,
    rejectRequest,
  };
}
