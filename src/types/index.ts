export type MemoryCategory = 'personal' | 'preference' | 'work' | 'knowledge' | 'goal' | 'custom';

export interface PersonalMemory {
  id: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  importance: number; // 1 (low) to 5 (critical)
  enabled: boolean; // User retrieval permission toggle
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  model: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  usedMemories?: Array<{ id: string; snippet: string; category: string }>;
  usedKnowledge?: Array<{ id: string; title: string }>;
  model?: string;
  status?: 'sent' | 'sending' | 'error';
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  sourceUrl?: string;
  documentId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentChunk {
  id: string;
  index: number;
  text: string;
}

export interface UserDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  chunks: DocumentChunk[];
  createdAt: number;
  status: 'ready' | 'processing' | 'error';
}

export interface BackupHistoryItem {
  id: string;
  timestamp: number;
  type: 'local' | 'drive' | 'auto';
  itemCount: {
    memories: number;
    conversations: number;
    messages: number;
    knowledge: number;
    documents: number;
  };
  checksum: string;
  status: 'success' | 'failed';
  driveFileId?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  defaultModel: string;
  memoryRetrievalEnabled: boolean;
  memoryRelevanceThreshold: number; // 0.0 - 1.0
  autoMemoryExtraction: boolean;
  onboardingCompleted: boolean;
  lastSyncTimestamp?: number;
  encryptionSalt?: string;
  userName?: string;
}

export interface EncryptedVaultPayload {
  version: number;
  cipher: 'AES-256-GCM';
  salt: string; // Base64
  iv: string; // Base64
  ciphertext: string; // Base64
  checksum: string; // SHA-256 of decrypted payload
  createdAt: number;
  app: string;
}

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

export interface SearchResultItem {
  id: string;
  type: 'memory' | 'knowledge' | 'conversation' | 'document';
  title: string;
  snippet: string;
  score: number;
  category?: string;
  date: number;
}
