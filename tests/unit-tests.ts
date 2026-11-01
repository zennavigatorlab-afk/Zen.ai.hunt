import assert from 'node:assert';
import { test } from 'node:test';
import {
  tokenizeText,
  calculateMemoryRelevance,
} from '../src/intelligence/memoryEngine';
import { chunkDocumentText } from '../src/intelligence/documentProcessor';
import { PersonalMemory } from '../src/types';

test('Memory Engine: Tokenize text correctly strips stop words and punctuation', () => {
  const text = 'Hello! What is your preferred coding language for full-stack apps?';
  const tokens = tokenizeText(text);
  assert.ok(tokens.includes('preferred'));
  assert.ok(tokens.includes('coding'));
  assert.ok(tokens.includes('language'));
  assert.ok(tokens.includes('stack'));
  assert.ok(!tokens.includes('what'));
  assert.ok(!tokens.includes('is'));
});

test('Memory Engine: Relevance scoring prioritizes matching preferences with high importance', () => {
  const query = ['typescript', 'coding', 'architecture'];
  const memoryA: PersonalMemory = {
    id: '1',
    content: 'Prefers TypeScript coding style with clean architecture.',
    category: 'preference',
    tags: ['coding', 'style'],
    importance: 5,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const memoryB: PersonalMemory = {
    id: '2',
    content: 'Enjoys outdoor hiking during weekends in nature.',
    category: 'personal',
    tags: ['hiking'],
    importance: 2,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const resultA = calculateMemoryRelevance(query, memoryA);
  const resultB = calculateMemoryRelevance(query, memoryB);

  assert.ok(resultA.score > 0.5, `Score should be high, was ${resultA.score}`);
  assert.strictEqual(resultB.score, 0, 'Irrelevant memory should score 0');
});

test('Memory Engine: Disabled memories yield zero relevance score', () => {
  const query = ['typescript'];
  const disabledMemory: PersonalMemory = {
    id: '3',
    content: 'Prefers TypeScript always.',
    category: 'preference',
    tags: ['typescript'],
    importance: 5,
    enabled: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const result = calculateMemoryRelevance(query, disabledMemory);
  assert.strictEqual(result.score, 0, 'Disabled memory must not score');
});

test('Document Processor: Chunking handles long texts into overlapping windows', () => {
  const words = Array.from({ length: 900 }, (_, i) => `word${i}`).join(' ');
  const chunks = chunkDocumentText(words, 300, 50);

  assert.ok(chunks.length >= 3, `Expected at least 3 chunks, got ${chunks.length}`);
  assert.strictEqual(chunks[0].index, 0);
  assert.strictEqual(chunks[1].index, 1);
});
