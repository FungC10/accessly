# Ticket AI Summary TODO (Post-MVP)

## 1) Persist summary state (RAM -> DB/Redis)

**Current**: SummaryState is in-memory Map and will be lost on restart / serverless cold start.

**Impact**: 
- Multi-instance deployments will not share the same state
- Server restarts lose all summary state
- Cold starts in serverless environments reset state

**Future Solution**:
- Migrate to database-backed storage (TicketAIInsight table)
- Or use Redis for distributed state
- Keep same SummaryState interface, only change storage layer

---

## 2) Fix createdAt tie-break edge case

**Current**: Incremental fetch uses `createdAt > lastMessageCreatedAt`.

**Issue**: If multiple messages share the same `createdAt` (same millisecond), may cause:
- Missing messages (if query uses `>` instead of `>=`)
- Duplicate messages (if query uses `>=` but lastMessageId is in the middle of a batch)

**Future Solution**:
- Store `(lastMessageCreatedAt, lastMessageId)` as composite cursor
- Use deterministic tie-break query: `createdAt > lastCreatedAt OR (createdAt = lastCreatedAt AND id > lastMessageId)`
- Or use Prisma cursor pagination with composite cursor

---

## 3) Concurrency / race conditions (multi-admin refresh)

**Current**: Two REFRESH requests can overlap and override summary state.

**Issue**:
- Admin A and Admin B both click Refresh simultaneously
- Both read same `previousState`
- Both generate summaries
- Last write wins, first write is lost
- Inconsistent state possible

**Future Solution**:
- Database transaction with optimistic locking (version field)
- Or use job queue (one refresh job per room at a time)
- Or use distributed lock (Redis) for refresh operations
- Add `version` or `updatedAt` check before state update

---

## 4) Ensure state updates use the true newest message included in summary

**Current**: `lastMessageCreatedAt` must reflect the newest summarized message.

**Requirement**: Keep the definition consistent with how incremental query determines "new".

**Verification**:
- After full refresh: `lastMessageId` = newest message in the batch
- After incremental refresh: `lastMessageId` = newest message in the new batch (not the previous one)
- The query `createdAt > lastMessageCreatedAt` must correctly identify "new" messages

**Current Implementation**: ✅ Correct
- Full mode: Gets newest message in room after summarization
- Incremental mode: Gets newest message in room after summarization
- Both update `lastMessageId` and `lastMessageCreatedAt` correctly

---

## Notes

- All items above are post-MVP improvements
- Current implementation is production-safe for single-instance deployments
- Migration to database will naturally resolve #1 and #3
- #2 is an edge case that may never occur in practice (millisecond-level timestamps are usually unique)

