import { ChatMessage } from '../types';
import { ScoredMemory } from '../intelligence/memoryEngine';

export interface AIProviderModel {
  id: string;
  name: string;
  description: string;
  provider: 'google-gemini' | 'offline-local';
  isPaid?: boolean;
}

export const AVAILABLE_MODELS: AIProviderModel[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'High-speed reasoning, adaptive thinking, and balanced context processing.',
    provider: 'google-gemini',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    description: 'Ultra-low latency lightweight intelligence for instant answers and drafting.',
    provider: 'google-gemini',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    description: 'Deep analytical reasoning for intricate multi-step engineering & synthesis.',
    provider: 'google-gemini',
    isPaid: true,
  },
];

export interface ChatRequestOptions {
  messages: ChatMessage[];
  userInput: string;
  model: string;
  contextMemories?: ScoredMemory[];
  knowledgeSnippets?: Array<{ id: string; title: string; content: string }>;
  systemPrompt?: string;
}

export interface ChatResponseResult {
  text: string;
  model: string;
  timestamp: number;
  isOfflineFallback?: boolean;
}

/**
 * Send chat request to backend API with full context assembly
 */
export async function sendChatMessage(options: ChatRequestOptions): Promise<ChatResponseResult> {
  const { messages, userInput, model, contextMemories = [], knowledgeSnippets = [], systemPrompt } = options;

  // Check online status
  if (!navigator.onLine) {
    return generateOfflineLocalFallback(userInput, contextMemories);
  }

  // Format context items
  const contextItems = [
    ...contextMemories.map((m) => ({
      type: 'memory',
      category: m.memory.category,
      content: m.memory.content,
      importance: m.memory.importance,
    })),
    ...knowledgeSnippets.map((k) => ({
      type: 'knowledge',
      category: k.title,
      content: k.content,
    })),
  ];

  try {
    const response = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.slice(-8), // Send recent relevant context window
        userInput,
        model,
        context: contextItems,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.text,
      model: data.model || model,
      timestamp: data.timestamp || Date.now(),
      isOfflineFallback: false,
    };
  } catch (err: any) {
    console.warn('[ZEN AI] Remote AI request failed:', err);
    // If network failure occurred, return clear offline message
    if (!navigator.onLine || err?.message?.includes('Failed to fetch')) {
      return generateOfflineLocalFallback(userInput, contextMemories);
    }
    throw err;
  }
}

/**
 * Honest rule-based fallback when offline without claiming to be generative AI
 */
function generateOfflineLocalFallback(userInput: string, contextMemories: ScoredMemory[]): ChatResponseResult {
  let responseText = `⚠️ **Offline Mode Active**\n\nZEN AI is currently operating in local-first offline mode because the network connection is unavailable. Hosted AI models (Gemini) cannot be reached at this moment.\n\n`;

  if (contextMemories.length > 0) {
    responseText += `**Relevant Local Memories Retrieved for your query:**\n`;
    contextMemories.forEach((m, idx) => {
      responseText += `${idx + 1}. *[${m.memory.category.toUpperCase()}]* ${m.memory.content}\n`;
    });
    responseText += `\nYour memories and knowledge entries remain fully accessible offline. Once connection is restored, full model reasoning will resume automatically.`;
  } else {
    responseText += `Your query: "${userInput}" has been recorded. All your local data, memories, and documents are intact in your browser's encrypted IndexedDB storage.`;
  }

  return {
    text: responseText,
    model: 'offline-local-engine',
    timestamp: Date.now(),
    isOfflineFallback: true,
  };
}

/**
 * Ask server to extract suggested memories from conversation
 */
export async function extractMemoriesFromText(conversationText: string): Promise<any[]> {
  if (!navigator.onLine) return [];
  try {
    const res = await fetch('/api/intelligence/extract-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationText }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.memories || [];
  } catch {
    return [];
  }
}
