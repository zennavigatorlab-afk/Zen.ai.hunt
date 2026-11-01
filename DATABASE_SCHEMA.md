# ZEN AI Database Architecture (IndexedDB)

**Database Name:** `zen_ai_intelligence_db`  
**Schema Version:** `1`

## Object Stores

### 1. `memories`
- `id` (string, keyPath): Unique identifier (e.g. `mem_1730000000`)
- `content` (string): Memory statement or preference
- `category` (string, indexed `by_category`): `preference` | `work` | `personal` | `goal` | `knowledge` | `custom`
- `tags` (string[]): Normalized topic tags
- `importance` (number, indexed `by_importance`): 1 (low) to 5 (critical)
- `enabled` (boolean): Retrieval active toggle
- `createdAt` (number)
- `updatedAt` (number, indexed `by_updatedAt`)
- `expiresAt` (optional number)

### 2. `conversations`
- `id` (string, keyPath): Unique conversation ID
- `title` (string): Title of thread
- `createdAt` (number)
- `updatedAt` (number, indexed `by_updatedAt`)
- `pinned` (boolean, indexed `by_pinned`)
- `model` (string): Configured AI model

### 3. `messages`
- `id` (string, keyPath)
- `conversationId` (string, indexed `by_conversation`)
- `role` (string): `user` | `assistant` | `system`
- `content` (string): Message text
- `timestamp` (number, indexed `by_timestamp`)
- `usedMemories` (array): Injected memories for this turn
- `model` (string)
- `status` (string): `sent` | `sending` | `error`

### 4. `knowledge`
- `id` (string, keyPath)
- `title` (string)
- `content` (string, markdown)
- `category` (string, indexed `by_category`)
- `tags` (string[])
- `sourceUrl` (optional string)
- `documentId` (optional string)
- `createdAt` (number)
- `updatedAt` (number, indexed `by_updatedAt`)

### 5. `documents`
- `id` (string, keyPath)
- `fileName` (string)
- `fileType` (string)
- `fileSize` (number)
- `extractedText` (string)
- `chunks` (array of `{ id, index, text }`)
- `createdAt` (number, indexed `by_createdAt`)
- `status` (string): `ready` | `processing` | `error`

### 6. `backupHistory`
- `id` (string, keyPath)
- `timestamp` (number, indexed `by_timestamp`)
- `type` (string): `local` | `drive` | `auto`
- `itemCount` (object)
- `checksum` (string, SHA-256)
- `status` (string)
- `driveFileId` (optional string)

### 7. `settings`
- `key` (string, keyPath): e.g. `app_settings`
- `value` (object): AppSettings schema
