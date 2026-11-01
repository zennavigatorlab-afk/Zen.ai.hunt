# ZEN AI API Contracts

All endpoints are hosted via Express backend (`server.ts`) on port 3000.

## 1. Chat Completion Endpoint
- **Route:** `POST /api/assistant/chat`
- **Request Body:**
  ```json
  {
    "messages": [
      { "role": "user", "content": "..." }
    ],
    "userInput": "How do you handle memory?",
    "model": "gemini-3.8-flash",
    "context": [
      {
        "type": "memory",
        "category": "preference",
        "content": "Prefers concise TypeScript code"
      }
    ],
    "systemPrompt": "Optional additional guidelines"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "text": "Generated response string...",
    "model": "gemini-3.8-flash",
    "timestamp": 1730000000000
  }
  ```

## 2. Memory Extraction Endpoint
- **Route:** `POST /api/intelligence/extract-memory`
- **Request Body:**
  ```json
  {
    "conversationText": "User: I always use Tailwind CSS v4 in my apps.\nAssistant: Understood."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "memories": [
      {
        "content": "Uses Tailwind CSS v4 for UI styling",
        "category": "preference",
        "importance": 4,
        "tags": ["css", "styling"]
      }
    ]
  }
  ```

## 3. System Health Endpoint
- **Route:** `GET /api/health`
- **Success Response (200 OK):**
  ```json
  {
    "status": "ok",
    "product": "ZEN AI – Personal Intelligence System",
    "brand": "DeveloperHut",
    "partner": "DeveloperHunt.in",
    "hasApiKey": true
  }
  ```
