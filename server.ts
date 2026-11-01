import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '20mb' }));

// Shared server-side Gemini client with required User-Agent
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'ZEN AI – Personal Intelligence System',
    brand: 'DeveloperHut',
    partner: 'DeveloperHunt.in',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Assistant Chat Endpoint
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const {
      messages = [],
      userInput,
      model = 'gemini-3.8-flash',
      context = [],
      systemPrompt,
    } = req.body;

    if (!userInput && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'UserInput or messages are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in environment. Please configure your key in Settings > Secrets.',
        code: 'API_KEY_MISSING',
      });
    }

    const ai = getAiClient();

    // Assemble personal context
    let formattedContext = '';
    if (Array.isArray(context) && context.length > 0) {
      formattedContext = `\n\n--- ACTIVE USER MEMORY & KNOWLEDGE CONTEXT ---\n` +
        context.map((c: any, i: number) => `[Item ${i + 1} (${c.type || 'memory'} - ${c.category || 'general'})]: ${c.content || c.snippet || c.text}`).join('\n') +
        `\n--- END CONTEXT ---\nUse the above personal memories and facts naturally where relevant. Do not recite them mechanically unless asked.`;
    }

    const defaultSystemInstruction = `You are ZEN AI, a high-caliber Personal Intelligence System built by DeveloperHut in partnership with DeveloperHunt.in.
Your mission is to serve as an intelligent, secure, private cognitive partner.
You speak clearly, thoughtfully, concisely, and with structured formatting (bullet points, markdown tables, bold headers, or code blocks when useful).
Always prioritize user privacy and accuracy.
${formattedContext}
${systemPrompt ? `\nAdditional user guidelines:\n${systemPrompt}` : ''}`;

    // Format contents
    const contents: any[] = [];
    if (Array.isArray(messages) && messages.length > 0) {
      for (const m of messages) {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      }
    }
    if (userInput) {
      contents.push({
        role: 'user',
        parts: [{ text: userInput }],
      });
    }

    const response = await ai.models.generateContent({
      model: model || 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: defaultSystemInstruction,
      },
    });

    const responseText = response.text || '';
    return res.json({
      text: responseText,
      model: model || 'gemini-3.8-flash',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Gemini chat error:', err);
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || 'Failed to generate response from AI provider';
    return res.status(status).json({
      error: message,
      details: err?.toString?.() || 'Unknown error',
    });
  }
});

// Memory extraction assistant endpoint
app.post('/api/intelligence/extract-memory', async (req, res) => {
  try {
    const { conversationText } = req.body;
    if (!conversationText) {
      return res.status(400).json({ error: 'conversationText is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'API key not configured' });
    }

    const ai = getAiClient();
    const prompt = `Analyze the following conversation and extract 1 to 3 key facts, preferences, or personal details that the user might want to remember long-term in ZEN AI.
Return ONLY valid JSON format matching:
[
  {
    "content": "concise factual memory statement",
    "category": "preference" | "work" | "personal" | "goal" | "knowledge",
    "importance": 1-5,
    "tags": ["tag1", "tag2"]
  }
]
If there are no personal facts to remember, return an empty array [].

Conversation:
"""
${conversationText}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    let parsed = [];
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = [];
    }
    return res.json({ memories: parsed });
  } catch (err: any) {
    console.error('Extract memory error:', err);
    return res.status(500).json({ error: err.message || 'Failed to extract memories' });
  }
});

// Document summarize and chunk endpoint
app.post('/api/intelligence/process-document', async (req, res) => {
  try {
    const { fileName, textContent } = req.body;
    if (!textContent) {
      return res.status(400).json({ error: 'textContent is required' });
    }

    // Basic heuristic chunking (around 400 words per chunk)
    const words = textContent.split(/\s+/);
    const chunkSize = 400;
    const overlap = 50;
    const chunks = [];
    for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
      const slice = words.slice(i, i + chunkSize).join(' ');
      if (slice.trim().length > 0) {
        chunks.push({
          index: chunks.length,
          text: slice.trim(),
        });
      }
    }

    return res.json({
      fileName,
      totalWords: words.length,
      chunksCount: chunks.length,
      chunks,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[ZEN AI] Server listening on port ${PORT} (dev: ${!isProduction})`);
  });
}

startServer().catch((err) => {
  console.error('[ZEN AI] Server startup failure:', err);
});
