import { ref } from 'vue';
import type { Ref } from 'vue';
import type { ChatMessage } from './useWebLLMChat';

export interface ConversationRecord {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
}

const DB_NAME = 'chat_history';
const STORE_NAME = 'conversations';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    Promise.resolve(fn(store))
      .then((res: T) => {
        tx.oncomplete = () => resolve(res as T);
        tx.onerror = () => reject(tx.error);
      })
      .catch(reject);
  });
}

export async function addConversation(conv: ConversationRecord): Promise<void> {
  await withStore<void>('readwrite', (store) => {
    store.add(conv);
  });
}

export async function updateConversation(conv: ConversationRecord): Promise<void> {
  await withStore<void>('readwrite', (store) => {
    store.put(conv);
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await withStore<void>('readwrite', (store) => {
    store.delete(id);
  });
}

export async function getConversation(id: string): Promise<ConversationRecord | null> {
  return withStore<ConversationRecord | null>('readonly', (store) => {
    return new Promise<ConversationRecord | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as ConversationRecord) || null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function listConversations(): Promise<ConversationRecord[]> {
  return withStore<ConversationRecord[]>('readonly', (store) => {
    return new Promise<ConversationRecord[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const arr = (req.result as ConversationRecord[]) || [];
        arr.sort((a, b) => b.timestamp - a.timestamp);
        resolve(arr);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export function useChatHistory() {
  const conversations = ref<ConversationRecord[]>([]);
  const sidebarOpen = ref<boolean>(false);

  async function refreshList() {
    conversations.value = await listConversations();
  }

  function toggleSidebar(open?: boolean) {
    if (typeof open === 'boolean') sidebarOpen.value = open;
    else sidebarOpen.value = !sidebarOpen.value;
  }

  function exportConversation(conv: ConversationRecord) {
    const dataStr = JSON.stringify(conv, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title || conv.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    conversations,
    sidebarOpen,
    refreshList,
    toggleSidebar,
    exportConversation,
  };
}

export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export function deriveTitleFromMessages(msgs: ChatMessage[]): string {
  const firstUser = msgs.find((m) => m.role === 'user');
  const t = firstUser?.content || 'New Conversation';
  return t.length > 30 ? t.slice(0, 30) + '…' : t;
}