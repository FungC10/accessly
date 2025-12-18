import { AIInsights } from './types'

/**
 * In-memory summary state for incremental summarization
 * Tracks what has been summarized for each room
 * 
 * In production, this will be replaced with a database-backed solution
 */
export interface SummaryState {
  /** ID of the newest message that was included in the summary
   *  Messages with IDs after this (by createdAt) are considered "new"
   */
  lastMessageId: string | null
  /** Timestamp of the last message that was summarized (fallback if lastMessageId unavailable) */
  lastMessageCreatedAt: string | null
  /** The previous summary text (for incremental updates) */
  previousSummary: string | null
  /** The full AI insights from the last summary */
  lastInsights: AIInsights | null
  /** Provider name used to generate this summary */
  provider: string
  /** When the summary was last updated */
  updatedAt: Date
}

/**
 * In-memory store for summary states
 * Key: roomId, Value: SummaryState
 * 
 * TODO: Replace with database-backed storage (e.g., TicketAIInsight table)
 */
class SummaryStateStore {
  private store = new Map<string, SummaryState>()

  /**
   * Get summary state for a room
   */
  get(roomId: string): SummaryState | null {
    return this.store.get(roomId) || null
  }

  /**
   * Set summary state for a room
   */
  set(roomId: string, state: SummaryState): void {
    this.store.set(roomId, state)
  }

  /**
   * Delete summary state for a room (e.g., when room is deleted)
   */
  delete(roomId: string): void {
    this.store.delete(roomId)
  }

  /**
   * Clear all states (useful for testing)
   */
  clear(): void {
    this.store.clear()
  }
}

// Singleton instance
export const summaryStateStore = new SummaryStateStore()

