import {
  PersonalMemory,
  Conversation,
  ChatMessage,
  KnowledgeEntry,
  UserDocument,
  BackupHistoryItem,
  AppSettings,
} from '../types';

const DB_NAME = 'zen_ai_intelligence_db';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Memories store
      if (!db.objectStoreNames.contains('memories')) {
        const store = db.createObjectStore('memories', { keyPath: 'id' });
        store.createIndex('by_category', 'category', { unique: false });
        store.createIndex('by_importance', 'importance', { unique: false });
        store.createIndex('by_updatedAt', 'updatedAt', { unique: false });
      }

      // Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', { keyPath: 'id' });
        store.createIndex('by_updatedAt', 'updatedAt', { unique: false });
        store.createIndex('by_pinned', 'pinned', { unique: false });
      }

      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('by_conversation', 'conversationId', { unique: false });
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
      }

      // Knowledge store
      if (!db.objectStoreNames.contains('knowledge')) {
        const store = db.createObjectStore('knowledge', { keyPath: 'id' });
        store.createIndex('by_category', 'category', { unique: false });
        store.createIndex('by_updatedAt', 'updatedAt', { unique: false });
      }

      // Documents store
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('by_createdAt', 'createdAt', { unique: false });
      }

      // Backup history store
      if (!db.objectStoreNames.contains('backupHistory')) {
        const store = db.createObjectStore('backupHistory', { keyPath: 'id' });
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
      }

      // App Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Offline Sync Queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
        store.createIndex('by_createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// Generic transaction helper
export async function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let resultReq: IDBRequest<T> | void;

    try {
      resultReq = callback(store);
    } catch (e) {
      reject(e);
      return;
    }

    transaction.oncomplete = () => {
      resolve(resultReq ? resultReq.result : (undefined as unknown as T));
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

// --- MEMORIES CRUD ---
export async function getAllMemories(): Promise<PersonalMemory[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('memories', 'readonly');
    const store = tx.objectStore('memories');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMemory(memory: PersonalMemory): Promise<void> {
  await tx('memories', 'readwrite', (store) => store.put(memory));
}

export async function deleteMemory(id: string): Promise<void> {
  await tx('memories', 'readwrite', (store) => store.delete(id));
}

// --- CONVERSATIONS CRUD ---
export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('conversations', 'readonly');
    const store = tx.objectStore('conversations');
    const req = store.getAll();
    req.onsuccess = () => {
      const convs = req.result || [];
      convs.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
      resolve(convs);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await tx('conversations', 'readwrite', (store) => store.put(conv));
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['conversations', 'messages'], 'readwrite');
  tx.objectStore('conversations').delete(id);

  const msgStore = tx.objectStore('messages');
  const index = msgStore.index('by_conversation');
  const req = index.getAllKeys(id);
  req.onsuccess = () => {
    const keys = req.result || [];
    for (const key of keys) {
      msgStore.delete(key);
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- MESSAGES CRUD ---
export async function getMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    const index = store.index('by_conversation');
    const req = index.getAll(conversationId);
    req.onsuccess = () => {
      const msgs = req.result || [];
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      resolve(msgs);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveMessage(message: ChatMessage): Promise<void> {
  await tx('messages', 'readwrite', (store) => store.put(message));
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    const req = store.get(id);
    req.onsuccess = () => {
      const msg = req.result as ChatMessage;
      if (msg) {
        msg.content = content;
        store.put(msg);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- KNOWLEDGE CRUD ---
export async function getAllKnowledge(): Promise<KnowledgeEntry[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge', 'readonly');
    const store = tx.objectStore('knowledge');
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveKnowledge(item: KnowledgeEntry): Promise<void> {
  await tx('knowledge', 'readwrite', (store) => store.put(item));
}

export async function deleteKnowledge(id: string): Promise<void> {
  await tx('knowledge', 'readwrite', (store) => store.delete(id));
}

// --- DOCUMENTS CRUD ---
export async function getAllDocuments(): Promise<UserDocument[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const store = tx.objectStore('documents');
    const req = store.getAll();
    req.onsuccess = () => {
      const docs = req.result || [];
      docs.sort((a, b) => b.createdAt - a.createdAt);
      resolve(docs);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveDocument(doc: UserDocument): Promise<void> {
  await tx('documents', 'readwrite', (store) => store.put(doc));
}

export async function deleteDocument(id: string): Promise<void> {
  await tx('documents', 'readwrite', (store) => store.delete(id));
}

// --- BACKUP HISTORY ---
export async function getBackupHistory(): Promise<BackupHistoryItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('backupHistory', 'readonly');
    const store = tx.objectStore('backupHistory');
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      items.sort((a, b) => b.timestamp - a.timestamp);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addBackupHistoryItem(item: BackupHistoryItem): Promise<void> {
  await tx('backupHistory', 'readwrite', (store) => store.put(item));
}

// --- SETTINGS ---
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  defaultModel: 'gemini-3.8-flash',
  memoryRetrievalEnabled: true,
  memoryRelevanceThreshold: 0.15,
  autoMemoryExtraction: true,
  onboardingCompleted: false,
  userName: 'Explorer',
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('app_settings');
    req.onsuccess = () => {
      if (req.result?.value) {
        resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    req.onerror = () => resolve(DEFAULT_SETTINGS);
  });
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await tx('settings', 'readwrite', (store) => store.put({ key: 'app_settings', value: merged }));
  return merged;
}

// --- FULL DATA DUMP & RESTORE (For Local / Drive Vault) ---
export interface FullDatabaseDump {
  version: number;
  exportedAt: number;
  app: string;
  data: {
    memories: PersonalMemory[];
    conversations: Conversation[];
    messages: ChatMessage[];
    knowledge: KnowledgeEntry[];
    documents: UserDocument[];
    settings: AppSettings;
  };
}

export async function exportAllData(): Promise<FullDatabaseDump> {
  const [memories, conversations, knowledge, documents, settings] = await Promise.all([
    getAllMemories(),
    getAllConversations(),
    getAllKnowledge(),
    getAllDocuments(),
    getSettings(),
  ]);

  const db = await getDB();
  const messages: ChatMessage[] = await new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const req = tx.objectStore('messages').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  return {
    version: 1,
    exportedAt: Date.now(),
    app: 'ZEN AI – DeveloperHut',
    data: {
      memories,
      conversations,
      messages,
      knowledge,
      documents,
      settings,
    },
  };
}

export async function restoreAllData(dump: FullDatabaseDump): Promise<void> {
  if (!dump?.data) {
    throw new Error('Invalid backup archive structure');
  }

  const db = await getDB();
  const stores = ['memories', 'conversations', 'messages', 'knowledge', 'documents', 'settings'];
  const tx = db.transaction(stores, 'readwrite');

  for (const s of stores) {
    tx.objectStore(s).clear();
  }

  if (Array.isArray(dump.data.memories)) {
    const store = tx.objectStore('memories');
    for (const m of dump.data.memories) store.put(m);
  }
  if (Array.isArray(dump.data.conversations)) {
    const store = tx.objectStore('conversations');
    for (const c of dump.data.conversations) store.put(c);
  }
  if (Array.isArray(dump.data.messages)) {
    const store = tx.objectStore('messages');
    for (const msg of dump.data.messages) store.put(msg);
  }
  if (Array.isArray(dump.data.knowledge)) {
    const store = tx.objectStore('knowledge');
    for (const k of dump.data.knowledge) store.put(k);
  }
  if (Array.isArray(dump.data.documents)) {
    const store = tx.objectStore('documents');
    for (const d of dump.data.documents) store.put(d);
  }
  if (dump.data.settings) {
    tx.objectStore('settings').put({ key: 'app_settings', value: dump.data.settings });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Clear entire database
export async function clearAllLocalData(): Promise<void> {
  const db = await getDB();
  const stores = ['memories', 'conversations', 'messages', 'knowledge', 'documents', 'settings', 'backupHistory', 'syncQueue'];
  const tx = db.transaction(stores, 'readwrite');
  for (const s of stores) {
    tx.objectStore(s).clear();
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Seed Initial Data if database is completely fresh
export async function initializeSeedDataIfFresh(): Promise<boolean> {
  const memories = await getAllMemories();
  if (memories.length > 0) return false;

  const now = Date.now();
  const convId = 'conv_welcome_zen';

  const initialMemories: PersonalMemory[] = [
    {
      id: 'mem_1',
      content: 'Prefers concise, actionable code responses with clear architecture explanations.',
      category: 'preference',
      tags: ['coding', 'style'],
      importance: 5,
      enabled: true,
      createdAt: now - 3600000,
      updatedAt: now - 3600000,
    },
    {
      id: 'mem_2',
      content: 'Building full-stack PWA apps with local-first IndexedDB and Google Workspace integration.',
      category: 'work',
      tags: ['pwa', 'full-stack', 'developerhunt'],
      importance: 4,
      enabled: true,
      createdAt: now - 3000000,
      updatedAt: now - 3000000,
    },
    {
      id: 'mem_3',
      content: 'Personal Intelligence core philosophy: Your information stays strictly under your control.',
      category: 'knowledge',
      tags: ['philosophy', 'privacy'],
      importance: 5,
      enabled: true,
      createdAt: now - 2400000,
      updatedAt: now - 2400000,
    },
  ];

  for (const m of initialMemories) {
    await saveMemory(m);
  }

  const welcomeConv: Conversation = {
    id: convId,
    title: 'Welcome to ZEN AI Intelligence',
    createdAt: now - 3600000,
    updatedAt: now,
    pinned: true,
    model: 'gemini-3.8-flash',
  };
  await saveConversation(welcomeConv);

  const initialMessages: ChatMessage[] = [
    {
      id: 'msg_1',
      conversationId: convId,
      role: 'assistant',
      content: `Welcome to **ZEN AI – Personal Intelligence System** by DeveloperHut (in partnership with DeveloperHunt.in).

I am your local-first, privacy-focused cognitive partner. Here is what makes ZEN AI distinct:

1. **Persistent Personal Memory**: I retain key preferences, goals, and facts across conversations with transparent relevance control.
2. **Knowledge Library & Document Processing**: Upload documents, extract chunks, and connect them directly into your knowledge graph.
3. **Encrypted Vault & Google Drive**: Secure your workspace using client-side **AES-256-GCM** encryption before backing up to your private Google Drive folder.
4. **Offline-First PWA**: Read your memories, search knowledge, and review past dialogues even without an internet connection.

How can I assist your workflow today?`,
      timestamp: now - 3500000,
      model: 'gemini-3.8-flash',
      status: 'sent',
    },
  ];

  for (const msg of initialMessages) {
    await saveMessage(msg);
  }

  const sampleKnowledge: KnowledgeEntry = {
    id: 'know_1',
    title: 'ZEN AI Architecture & Privacy Principles',
    category: 'Architecture',
    tags: ['privacy', 'local-first', 'developerhut'],
    content: `# ZEN AI Architecture
- **Local-First Storage**: Primary state resides in browser IndexedDB.
- **Client-Side Encryption**: AES-256-GCM with PBKDF2 ensures that unencrypted data is never sent to remote sync targets.
- **Selective Memory Injection**: Only memories scoring above the user-defined relevance threshold are included in the prompt context.
- **Full Data Sovereignty**: Export, wipe, or restore your entire cognitive vault at any time.`,
    createdAt: now - 2000000,
    updatedAt: now - 2000000,
  };
  await saveKnowledge(sampleKnowledge);

  return true;
}
