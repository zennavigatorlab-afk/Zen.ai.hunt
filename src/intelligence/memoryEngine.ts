import { PersonalMemory, AppSettings, SearchResultItem } from '../types';
import { getAllMemories, saveMemory, deleteMemory } from '../storage/db';

export interface ScoredMemory {
  memory: PersonalMemory;
  score: number;
  matchedKeywords: string[];
}

// Tokenize text into normalized unique keywords (stripping punctuation, common stop words)
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'this',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'can', 'do', 'does',
]);

export function tokenizeText(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Calculate relevance score between user message and a personal memory
 * Uses TF-IDF-inspired keyword overlap + importance multiplier + tag match bonuses
 */
export function calculateMemoryRelevance(
  userQueryTokens: string[],
  memory: PersonalMemory
): { score: number; matchedKeywords: string[] } {
  if (!memory.enabled) {
    return { score: 0, matchedKeywords: [] };
  }

  const memoryTokens = tokenizeText(memory.content);
  const tagTokens = (memory.tags || []).flatMap((t) => tokenizeText(t));
  const combinedTokens = new Set([...memoryTokens, ...tagTokens]);

  const matchedKeywords: string[] = [];

  for (const token of userQueryTokens) {
    if (combinedTokens.has(token)) {
      matchedKeywords.push(token);
    } else {
      // Partial prefix check (e.g. "prefer" matches "preferences")
      for (const mToken of combinedTokens) {
        if ((mToken.startsWith(token) || token.startsWith(mToken)) && Math.abs(mToken.length - token.length) <= 3) {
          matchedKeywords.push(token);
          break;
        }
      }
    }
  }

  if (matchedKeywords.length === 0) {
    return { score: 0, matchedKeywords: [] };
  }

  // Base score from proportion of matched query keywords
  const queryCoverage = matchedKeywords.length / Math.max(1, userQueryTokens.length);

  // Importance multiplier: 1 gives 0.8x, 5 gives 1.4x
  const importanceMultiplier = 0.7 + (memory.importance * 0.15);

  // Category weight
  const categoryBonus = memory.category === 'preference' ? 1.2 : 1.0;

  const score = queryCoverage * importanceMultiplier * categoryBonus;

  return {
    score: Math.min(1.0, score),
    matchedKeywords,
  };
}

/**
 * Full Modular Retrieval Pipeline:
 * User message → Context analysis → Memory search → Relevance ranking → Permission check → Context assembly
 */
export async function retrieveRelevantMemories(
  userMessage: string,
  settings: AppSettings,
  maxResults: number = 4
): Promise<ScoredMemory[]> {
  if (!settings.memoryRetrievalEnabled) {
    return [];
  }

  const allMemories = await getAllMemories();
  if (allMemories.length === 0) return [];

  // Step 1: Context analysis & query tokenization
  const queryTokens = tokenizeText(userMessage);
  if (queryTokens.length === 0) return [];

  // Step 2 & 3: Memory search & Relevance ranking
  const scored: ScoredMemory[] = [];
  const threshold = settings.memoryRelevanceThreshold || 0.15;

  for (const memory of allMemories) {
    // Step 4: Permission check (individual memory toggle)
    if (!memory.enabled) continue;

    // Check expiration if set
    if (memory.expiresAt && memory.expiresAt < Date.now()) continue;

    const { score, matchedKeywords } = calculateMemoryRelevance(queryTokens, memory);
    if (score >= threshold) {
      scored.push({
        memory,
        score,
        matchedKeywords,
      });
    }
  }

  // Sort descending by relevance score, then by importance
  scored.sort((a, b) => b.score - a.score || b.memory.importance - a.memory.importance);

  // Return top N
  return scored.slice(0, maxResults);
}

/**
 * Format memories into structured context string for LLM injection
 */
export function formatMemoriesForContext(scoredMemories: ScoredMemory[]): Array<{
  id: string;
  snippet: string;
  category: string;
  score: number;
}> {
  return scoredMemories.map(({ memory, score }) => ({
    id: memory.id,
    snippet: memory.content,
    category: memory.category,
    score: Math.round(score * 100) / 100,
  }));
}

/**
 * Search memories for UI filtering and search bar
 */
export async function searchMemories(query: string, categoryFilter?: string): Promise<PersonalMemory[]> {
  const all = await getAllMemories();
  const q = query.trim().toLowerCase();

  return all.filter((m) => {
    if (categoryFilter && categoryFilter !== 'all' && m.category !== categoryFilter) {
      return false;
    }
    if (!q) return true;
    return (
      m.content.toLowerCase().includes(q) ||
      (m.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      m.category.toLowerCase().includes(q)
    );
  });
}
