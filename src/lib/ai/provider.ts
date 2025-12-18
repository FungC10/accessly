import { AIInsights, AnonymizedMessage, RoomContext } from './types'

/**
 * Provider interface for AI ticket insights
 * Implementations: FakeTicketAIProvider, OpenAITicketAIProvider
 */
export interface TicketAIProvider {
  /**
   * Generate AI insights for a ticket room (full summarization)
   * Used for initial summary or full refresh
   * 
   * @param roomContext - Room metadata
   * @param messages - All messages to summarize (in chronological order)
   * @returns AI insights (summary, suggestions, escalation)
   */
  generate(
    roomContext: RoomContext,
    messages: AnonymizedMessage[]
  ): Promise<AIInsights>

  /**
   * Generate AI insights incrementally (merge new messages with previous summary)
   * Used for incremental updates to avoid re-processing all messages
   * 
   * @param roomContext - Room metadata
   * @param previousSummary - The previous summary text (for context)
   * @param previousInsights - The previous full insights (for suggestions/escalation context)
   * @param newMessages - Only the new messages since last summary (in chronological order)
   * @returns Updated AI insights (merged summary, updated suggestions, updated escalation)
   */
  generateIncremental(
    roomContext: RoomContext,
    previousSummary: string,
    previousInsights: AIInsights,
    newMessages: AnonymizedMessage[]
  ): Promise<AIInsights>

  /**
   * Provider identifier (for logging/debugging)
   */
  readonly name: string
}

