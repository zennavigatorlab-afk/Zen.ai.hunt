import { UserDocument, DocumentChunk, KnowledgeEntry } from '../types';
import { saveDocument, getAllDocuments, getAllKnowledge } from '../storage/db';

export interface ChunkMatchResult {
  docId: string;
  fileName: string;
  chunkIndex: number;
  snippet: string;
  relevanceScore: number;
}

/**
 * Split text into semantic chunks of roughly ~350 words with 50-word overlap
 */
export function chunkDocumentText(text: string, chunkSizeWords: number = 350, overlapWords: number = 50): DocumentChunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: DocumentChunk[] = [];
  let index = 0;

  for (let i = 0; i < words.length; i += Math.max(1, chunkSizeWords - overlapWords)) {
    const chunkWords = words.slice(i, i + chunkSizeWords);
    const chunkText = chunkWords.join(' ').trim();
    if (chunkText.length > 0) {
      chunks.push({
        id: `chunk_${index}_${Math.random().toString(36).substring(2, 7)}`,
        index,
        text: chunkText,
      });
      index++;
    }
  }

  return chunks;
}

/**
 * Extract text from uploaded File object
 */
export async function parseUploadedFile(file: File): Promise<{
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
}> {
  const fileName = file.name;
  const fileType = file.type || fileName.split('.').pop() || 'unknown';
  const fileSize = file.size;

  // Read text files
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = () => reject(new Error('Failed to read file content'));
    reader.readAsText(file);
  });

  return {
    fileName,
    fileType,
    fileSize,
    extractedText: text,
  };
}

/**
 * Search across all document chunks and return best matching excerpts
 */
export async function searchDocumentChunks(query: string, maxMatches: number = 3): Promise<ChunkMatchResult[]> {
  const docs = await getAllDocuments();
  const qTokens = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (qTokens.length === 0 || docs.length === 0) return [];

  const matches: ChunkMatchResult[] = [];

  for (const doc of docs) {
    if (doc.status !== 'ready' || !doc.chunks) continue;
    for (const chunk of doc.chunks) {
      const lower = chunk.text.toLowerCase();
      let matchedCount = 0;
      for (const token of qTokens) {
        if (lower.includes(token)) {
          matchedCount++;
        }
      }

      if (matchedCount > 0) {
        const score = matchedCount / qTokens.length;
        matches.push({
          docId: doc.id,
          fileName: doc.fileName,
          chunkIndex: chunk.index,
          snippet: chunk.text.length > 300 ? chunk.text.substring(0, 300) + '...' : chunk.text,
          relevanceScore: score,
        });
      }
    }
  }

  matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return matches.slice(0, maxMatches);
}

/**
 * Search across knowledge library
 */
export async function searchKnowledgeEntries(query: string): Promise<KnowledgeEntry[]> {
  const all = await getAllKnowledge();
  const q = query.trim().toLowerCase();
  if (!q) return all;

  return all.filter((k) =>
    k.title.toLowerCase().includes(q) ||
    k.content.toLowerCase().includes(q) ||
    k.category.toLowerCase().includes(q) ||
    (k.tags || []).some((t) => t.toLowerCase().includes(q))
  );
}
