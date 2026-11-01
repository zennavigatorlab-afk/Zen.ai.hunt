# ZEN AI – Personal Intelligence System

> **A DeveloperHut Product**  
> *In partnership with DeveloperHunt.in*  
> *"Your Personal Intelligence System."*

ZEN AI is a genuine, local-first, privacy-focused personal intelligence platform built as a Progressive Web App (PWA). It provides persistent memory, multi-model AI reasoning, local document intelligence, zero-knowledge client encryption, and seamless Google Drive cloud backups.

---

## Key Features

- **Persistent Personal Memory Engine**: Modular retrieval pipeline that scores memory relevance based on query keywords, importance weighting, and category rules before injecting context into AI prompts.
- **AI Assistant with Transparent Context**: Model switching (Gemini 3.8 Flash, Flash-Lite, Argon) with real-time inspection badges showing which memories and documents were consulted.
- **Local-First Architecture**: Powered by browser IndexedDB. Zero mandatory cloud lock-in. Full offline resilience.
- **Knowledge Center & Document Vault**: Import `.md`, `.txt`, `.json`, `.csv`, or code files. Automated chunking, indexing, and 1-click memory promotion.
- **Google Drive Vault**: Dedicated `ZEN_AI_Vault` folder integration via Firebase Auth and Google Drive v3 REST API.
- **Zero-Knowledge Encryption**: AES-256-GCM cipher with PBKDF2 (100,000 iterations) key derivation and SHA-256 integrity checksums.
- **Installable Progressive Web App (PWA)**: Standalone desktop and mobile experience with service worker precaching and offline support.
- **Interactive Onboarding Flow**: Guided multi-step walkthrough introducing core features, skippable and re-triggerable anytime from Settings.

---

## Quickstart

```bash
# Install dependencies
npm install

# Run dev server (Express backend + Vite client)
npm run dev

# Run unit tests
npm test

# Build for production
npm run build
```
