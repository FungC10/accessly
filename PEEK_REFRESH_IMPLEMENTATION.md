# PEEK and REFRESH Implementation

## Overview

The AI Assistant now supports two distinct actions:
- **PEEK**: Read-only, returns existing insights without updating
- **REFRESH**: Write operation, performs summarization and updates state

This ensures the summary only updates when the user explicitly clicks "Refresh", not automatically on mount.

---

## API Contract

### Endpoint
`POST /api/ai/ticket-assistant`

### Request Body
```typescript
{
  roomId: string
  action: "peek" | "refresh"  // Required
  forceFullRefresh?: boolean  // Optional, only for "refresh"
}
```

### Response Format
```typescript
{
  ok: true,
  data: AIInsights | null,  // null if no existing summary (peek only)
  provider: string | null,
  meta: {
    hasNewMessages: boolean,
    newMessageCount: number,
    summarizedMessageCount: number  // 0 for peek, >0 for refresh
  }
}
```

---

## Behavior

### PEEK Action

**What it does:**
- ✅ Returns existing insights from summary state (if any)
- ✅ Checks for new messages since last summary
- ✅ Returns metadata about new messages
- ❌ Does NOT call provider.generate() or provider.generateIncremental()
- ❌ Does NOT update lastMessageId or summary state
- ❌ Does NOT perform any summarization

**When to use:**
- On component mount (to show existing summary)
- When user opens the AI Assistant panel
- Any read-only operation

**Response if no summary exists:**
```json
{
  "ok": true,
  "data": null,
  "provider": null,
  "meta": {
    "hasNewMessages": false,
    "newMessageCount": 0,
    "summarizedMessageCount": 0
  }
}
```

### REFRESH Action

**What it does:**
- ✅ Loads previous summary state (if any)
- ✅ Determines if incremental or full summarization needed
- ✅ Calls provider.generate() or provider.generateIncremental()
- ✅ Updates summary state with new lastMessageId
- ✅ Returns updated insights + metadata

**When to use:**
- User clicks "Refresh" button
- User clicks "Retry" after error
- Any write operation

**Response:**
```json
{
  "ok": true,
  "data": { ...insights... },
  "provider": "fake",
  "meta": {
    "hasNewMessages": true,
    "newMessageCount": 3,
    "summarizedMessageCount": 3
  }
}
```

---

## lastMessageId Definition

**`lastMessageId`** = ID of the **newest message** that was included in the last summary.

**Example:**
- Room has messages: #1, #2, #3, #4, #5 (chronological order)
- First refresh: Summarizes #1-#5, stores `lastMessageId = #5`
- New messages arrive: #6, #7
- Second refresh: Only summarizes #6, #7 (incremental), updates `lastMessageId = #7`

**Important:**
- Messages with IDs **after** `lastMessageId` (by `createdAt` order) are considered "new"
- `getNewMessagesSince()` fetches all messages, finds the index of `lastMessageId`, and returns messages after that index
- This ensures correct chronological order

---

## File Changes

### Modified Files

1. **`src/lib/ai/summary-state.ts`**
   - Added `provider: string` field to `SummaryState`
   - Updated comment for `lastMessageId` to clarify it's the newest summarized message

2. **`src/lib/ai/service.ts`**
   - Added `peekInsights()` method (read-only, no provider calls)
   - Updated `generateInsights()` to store provider name in state
   - Updated `getNewMessagesSince()` comment to clarify lastMessageId meaning

3. **`src/app/api/ai/ticket-assistant/route.ts`**
   - Added `action` parameter validation
   - Implemented PEEK branch (calls `service.peekInsights()`)
   - Implemented REFRESH branch (calls `service.generateInsights()`)
   - Returns `data: null` when no summary exists (peek only)

4. **`src/components/ai/TicketAIAssistant.tsx`**
   - Renamed `fetchInsights()` → split into `peekInsights()` and `refreshInsights()`
   - On mount: calls `peekInsights()` (read-only)
   - Refresh button: calls `refreshInsights()` (write operation)
   - Handles `data === null` case (no existing summary)

---

## Algorithm Correctness

### getNewMessagesSince() Logic

```typescript
// 1. Fetch ALL messages in chronological order (asc)
const allMessages = await prisma.message.findMany({
  where: { roomId },
  orderBy: { createdAt: 'asc' },  // Oldest first
  ...
})

// 2. Find index of lastMessageId
const lastIndex = allMessages.findIndex(m => m.id === lastMessageId)

// 3. Return messages after that index
const newMessages = allMessages.slice(lastIndex + 1)
```

**Correctness:**
- ✅ Fetches in chronological order (asc)
- ✅ Finds the exact message that was last summarized
- ✅ Returns all messages after it (newer messages)
- ✅ Returns in chronological order (oldest new message first)

**Edge Cases Handled:**
- `lastMessageId` not found → Fallback to full summarization
- No `lastMessageId` but `lastMessageCreatedAt` exists → Use timestamp filter
- No previous state → Return empty array (triggers full mode)

### Metadata Calculation

**PEEK:**
- `hasNewMessages`: `newMessages.length > 0`
- `newMessageCount`: `newMessages.length`
- `summarizedMessageCount`: `0` (no summarization performed)

**REFRESH (Incremental):**
- `hasNewMessages`: `newMessages.length > 0`
- `newMessageCount`: `newMessages.length`
- `summarizedMessageCount`: `newMessages.length` (only new messages summarized)

**REFRESH (Full):**
- `hasNewMessages`: `previousState ? newMessages.length > 0 : true`
- `newMessageCount`: `previousState ? newMessages.length : allMessages.length`
- `summarizedMessageCount`: `allMessages.length` (all messages summarized)

---

## Frontend Flow

### On Mount
```
Component mounts
  ↓
Check room type & admin status
  ↓
Call peekInsights() (action="peek")
  ↓
Display existing summary (if any)
  ↓
Show metadata (hasNewMessages, newMessageCount)
```

### On Refresh Button Click
```
User clicks "Refresh"
  ↓
Call refreshInsights() (action="refresh")
  ↓
Show loading state
  ↓
API performs summarization
  ↓
Update state with new insights
  ↓
Display updated summary
```

---

## Testing Scenarios

### Scenario 1: First Time (No Summary)
1. Open ticket room → Component mounts
2. Calls `peekInsights()` → Returns `data: null`
3. UI shows: "No summary available" or empty state
4. User clicks "Refresh"
5. Calls `refreshInsights()` → Performs full summarization
6. UI shows: Summary with `summarizedMessageCount: 10` (if 10 messages)

### Scenario 2: Existing Summary, No New Messages
1. Open ticket room → Component mounts
2. Calls `peekInsights()` → Returns existing summary
3. UI shows: Previous summary, `hasNewMessages: false`
4. User clicks "Refresh"
5. Calls `refreshInsights()` → No new messages, returns previous insights
6. UI shows: Same summary, `summarizedMessageCount: 0`

### Scenario 3: Existing Summary, New Messages
1. Open ticket room → Component mounts
2. Calls `peekInsights()` → Returns existing summary
3. UI shows: Previous summary, `hasNewMessages: true, newMessageCount: 3`
4. User clicks "Refresh"
5. Calls `refreshInsights()` → Performs incremental summarization
6. UI shows: Merged summary with "[Update: 3 new messages]", `summarizedMessageCount: 3`

---

## Constraints Met

✅ **PEEK is read-only**: No provider calls, no state updates  
✅ **REFRESH performs update**: Calls provider, updates state  
✅ **Manual refresh only**: No auto-updates on mount  
✅ **Single endpoint**: One route handles both actions  
✅ **Correct lastMessageId**: Clearly defined as newest summarized message  
✅ **Correct getNewMessagesSince**: Fetches messages after lastMessageId in chronological order  
✅ **Metadata returned**: hasNewMessages, newMessageCount, summarizedMessageCount  

---

## Future Database Migration

When moving to database-backed storage:

1. **PEEK** will query:
   ```sql
   SELECT * FROM TicketAIInsight WHERE roomId = ?
   ```

2. **REFRESH** will:
   - Query existing insight
   - Perform summarization
   - Upsert new insight

3. **No code changes needed** in service or API route - only storage layer changes.

