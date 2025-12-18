# Incremental AI Summarization Architecture

## Overview

This document explains the **real incremental summarization algorithm** implemented for the AI Assistant. The system remembers what has been summarized and only processes new messages, merging them with the previous summary. This architecture works with both the Fake provider (current) and will work seamlessly with OpenAI when implemented.

---

## Algorithm Step-by-Step

### 1. **Summary State Tracking**

**In-Memory Store** (`src/lib/ai/summary-state.ts`):
```typescript
interface SummaryState {
  lastMessageId: string | null          // Last message included in summary
  lastMessageCreatedAt: string | null  // Timestamp fallback
  previousSummary: string | null        // Previous summary text
  lastInsights: AIInsights | null       // Full previous insights
  updatedAt: Date                       // When summary was last updated
}
```

**Storage**: `Map<roomId, SummaryState>` (in-memory, singleton)

**Future DB Migration**: This will map 1:1 to a `TicketAIInsight` table:
```sql
CREATE TABLE TicketAIInsight (
  roomId VARCHAR PRIMARY KEY,
  lastMessageId VARCHAR,
  lastMessageCreatedAt TIMESTAMP,
  summary TEXT,
  suggestions JSON,
  escalation JSON,
  updatedAt TIMESTAMP
)
```

### 2. **Request Flow**

When user clicks "Refresh" in the UI:

```
POST /api/ai/ticket-assistant
  ↓
1. Load SummaryState for roomId (if exists)
  ↓
2. Determine mode:
   - No previous state → FULL MODE
   - Previous state exists → INCREMENTAL MODE
   ↓
3. Fetch messages:
   - FULL: Last 20 messages
   - INCREMENTAL: Only messages after lastMessageId
  ↓
4. Call Provider:
   - FULL: provider.generate(roomContext, allMessages)
   - INCREMENTAL: provider.generateIncremental(
       roomContext,
       previousSummary,
       previousInsights,
       newMessages
     )
  ↓
5. Update SummaryState with new results
  ↓
6. Return insights + metadata
```

### 3. **Incremental Summarization Logic**

**Fake Provider** (`src/lib/ai/providers/fake.ts`):

The `generateIncremental()` method simulates how a real LLM would merge summaries:

1. **Analyze New Messages**:
   - Extract keywords (urgent, billing, security, etc.)
   - Count message types (customer vs agent)
   - Detect sentiment changes

2. **Merge Summary**:
   ```
   Previous Summary + [Update: N new messages] + New Information
   ```
   - Preserves previous context
   - Adds update indicator
   - Appends new information based on keywords
   - Updates message counts

3. **Update Suggestions**:
   - If new keywords detected → Generate new contextual suggestions
   - Otherwise → Keep previous suggestions, add contextual update

4. **Update Escalation**:
   - If new messages warrant escalation → Update escalation
   - If previous escalation still relevant → Keep it
   - Otherwise → No escalation

**Key Point**: The algorithm is **deterministic** and **logic-based**, not random. Same inputs → same outputs.

### 4. **Message Tracking**

**How we track what's been summarized**:

1. **First Run**:
   - Fetch last 20 messages
   - Summarize all of them
   - Store `lastMessageId` = ID of the newest message

2. **Subsequent Runs**:
   - Fetch all messages in room (ordered by createdAt ASC)
   - Find index of `lastMessageId`
   - Get messages after that index
   - Only summarize those new messages
   - Update `lastMessageId` to newest message in room

**Edge Cases Handled**:
- `lastMessageId` not found → Fallback to full summarization
- No `lastMessageId` but `lastMessageCreatedAt` exists → Use timestamp
- No new messages → Return previous insights unchanged

### 5. **API Response Format**

```typescript
{
  ok: true,
  data: {
    summary: string,
    suggestions: string[],
    escalation: { ... }
  },
  provider: "fake" | "openai",
  meta: {
    hasNewMessages: boolean,        // Are there new messages since last summary?
    newMessageCount: number,        // How many new messages?
    summarizedMessageCount: number  // How many messages were summarized this run?
  }
}
```

**Metadata Usage**:
- `hasNewMessages`: UI can show "New messages available" indicator
- `newMessageCount`: Display count of unsummarized messages
- `summarizedMessageCount`: For debugging/logging

---

## File Changes

### New Files Created

1. **`src/lib/ai/summary-state.ts`**
   - `SummaryState` interface
   - `SummaryStateStore` class (in-memory Map)
   - Singleton instance

### Modified Files

1. **`src/lib/ai/types.ts`**
   - Added `AnonymizedMessageWithId` (for future use)

2. **`src/lib/ai/provider.ts`**
   - Added `generateIncremental()` method to interface

3. **`src/lib/ai/providers/fake.ts`**
   - Implemented `generateIncremental()` with merge logic

4. **`src/lib/ai/providers/openai.ts`**
   - Added `generateIncremental()` stub (throws error, ready for implementation)

5. **`src/lib/ai/service.ts`**
   - Added `getNewMessagesSince()` method
   - Updated `generateInsights()` to support incremental mode
   - Returns metadata (hasNewMessages, newMessageCount, etc.)

6. **`src/app/api/ai/ticket-assistant/route.ts`**
   - Removed old caching logic (replaced by summary state)
   - Updated to use new service method
   - Returns metadata in response
   - Supports `forceFullRefresh` query param

---

## How It Maps to Database (Future)

### Current (In-Memory)
```typescript
summaryStateStore.set(roomId, {
  lastMessageId: "...",
  lastMessageCreatedAt: "...",
  previousSummary: "...",
  lastInsights: { ... },
  updatedAt: new Date()
})
```

### Future (Database)
```typescript
await prisma.ticketAIInsight.upsert({
  where: { roomId },
  create: {
    roomId,
    lastMessageId: "...",
    lastMessageCreatedAt: new Date("..."),
    summary: "...",
    suggestions: [...],
    escalation: {...},
  },
  update: {
    lastMessageId: "...",
    lastMessageCreatedAt: new Date("..."),
    summary: "...",
    suggestions: [...],
    escalation: {...},
    updatedAt: new Date(),
  }
})
```

**Migration Path**:
1. Keep `SummaryStateStore` interface
2. Replace implementation to use Prisma instead of Map
3. No changes needed to service or API route
4. Provider interface remains the same

---

## Example Scenarios

### Scenario 1: First Summary

**Initial State**: No summary exists

**Messages**: 10 messages in room

**Action**: User clicks "Refresh"

**Result**:
- Fetch last 20 messages (gets all 10)
- Call `provider.generate()` (full mode)
- Store summary with `lastMessageId` = message #10
- Return: `{ newMessageCount: 10, summarizedMessageCount: 10 }`

### Scenario 2: Incremental Update

**Previous State**: Summary exists, `lastMessageId` = message #10

**New Messages**: 3 new messages (#11, #12, #13)

**Action**: User clicks "Refresh"

**Result**:
- Fetch messages after #10 (gets #11, #12, #13)
- Call `provider.generateIncremental()` with:
  - Previous summary
  - Previous insights
  - New messages (#11, #12, #13)
- Merge summary: "Previous summary [Update: 3 new messages] + new info"
- Update `lastMessageId` = message #13
- Return: `{ newMessageCount: 3, summarizedMessageCount: 3 }`

### Scenario 3: No New Messages

**Previous State**: Summary exists, `lastMessageId` = message #13

**New Messages**: None

**Action**: User clicks "Refresh"

**Result**:
- Fetch messages after #13 (gets empty array)
- Return previous insights unchanged
- Return: `{ hasNewMessages: false, newMessageCount: 0, summarizedMessageCount: 0 }`

---

## Constraints Met

✅ **Incremental summarization**: Only new messages are processed  
✅ **Remembers what's summarized**: Tracked via `lastMessageId`  
✅ **Uses previous summary as context**: Passed to `generateIncremental()`  
✅ **Works with Fake provider**: Deterministic merge logic  
✅ **No database changes**: In-memory store only  
✅ **Manual refresh only**: No auto-updates  
✅ **Metadata returned**: `hasNewMessages`, `newMessageCount`, etc.  
✅ **Production-ready logic**: Not demo code  
✅ **Ready for OpenAI**: Same interface, just implement the method  

---

## Testing

To test the incremental behavior:

1. **Create a ticket room**
2. **Send 5 messages**
3. **Click "Refresh"** → Should see full summary of 5 messages
4. **Send 3 more messages**
5. **Click "Refresh"** → Should see merged summary with "[Update: 3 new messages]"
6. **Check metadata** → `newMessageCount: 3`, `summarizedMessageCount: 3`

The summary should clearly show the incremental merge, and the previous context should be preserved.

---

## Next Steps for OpenAI

When implementing OpenAI provider:

1. **Implement `generateIncremental()`**:
   ```typescript
   async generateIncremental(
     room: RoomContext,
     previousSummary: string,
     previousInsights: AIInsights,
     newMessages: AnonymizedMessage[]
   ): Promise<AIInsights> {
     const prompt = `
       Previous summary: ${previousSummary}
       
       New messages since last summary:
       ${newMessages.map(m => `${m.role}: ${m.content}`).join('\n')}
       
       Please update the summary to include the new information.
       Keep the previous context but add the new details.
     `
     
     // Call OpenAI API
     const response = await openai.chat.completions.create({...})
     
     // Parse and return
   }
   ```

2. **No other changes needed** - the service and API route will work automatically!

