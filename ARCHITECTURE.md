# ZEN AI Architecture Specification

## 1. System Topology
```
[User Browser / PWA Shell]
   ├── IndexedDB Storage (Local-First: Memories, Conversations, Knowledge, Documents)
   ├── Web Crypto Engine (AES-256-GCM + PBKDF2 Key Derivation)
   ├── Modular Memory Retrieval Pipeline (Context Analysis -> Scoring -> Assembly)
   └── Firebase Auth Client SDK (Google Sign-In with popup + Drive scope)
            │
            ▼
[Express Full-Stack Server] (/api/*)
   ├── GoogleGenAI TypeScript SDK (@google/genai)
   │     └── Models: gemini-3.8-flash, gemini-3.1-flash-lite, gemini-4-argon
   └── Vite Middlewares (Dev) / Static Dist Fallback (Prod)
            │
            ▼
[Google Cloud / Google Drive]
   └── Dedicated App Vault Folder: "ZEN_AI_Vault" (Encrypted .zenbak archives)
```

## 2. Personal Memory Pipeline
`User Message` -> `Tokenization (Stop-word filter)` -> `Index Search` -> `Relevance Scoring (TF-IDF + Importance multiplier)` -> `Permission Check (User toggle)` -> `Context Assembly` -> `Server-side Gemini generation`.
