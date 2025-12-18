import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { getTicketAIProvider } from './providers'
import { AIInsights, AnonymizedMessage, RoomContext } from './types'
import { summaryStateStore, SummaryState } from './summary-state'

/**
 * Service for fetching ticket data and generating AI insights
 * Handles data fetching, anonymization, and provider delegation
 */
export class TicketAIService {
  /**
   * Fetch room context for AI processing
   */
  async getRoomContext(roomId: string): Promise<RoomContext | null> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        ticketDepartment: true,
        createdAt: true,
      },
    })

    if (!room) return null

    return {
      id: room.id,
      title: room.title,
      description: room.description,
      status: room.status,
      ticketDepartment: room.ticketDepartment,
      createdAt: room.createdAt,
    }
  }

  /**
   * Fetch and anonymize messages for a room
   * Returns messages in chronological order (oldest first)
   */
  async getAnonymizedMessages(roomId: string, limit: number = 20): Promise<AnonymizedMessage[]> {
    // Fetch messages (newest first)
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    })

    // Reverse to chronological order (oldest first)
    const chronologicalMessages = [...messages].reverse()

    // Anonymize messages: replace names/emails with role labels
    return chronologicalMessages.map((msg) => {
      let roleLabel: 'Customer' | 'Support Agent' = 'Customer'
      if (msg.user?.role === Role.ADMIN) {
        roleLabel = 'Support Agent'
      }

      return {
        role: roleLabel,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
      }
    })
  }

  /**
   * Get new messages since the last summarized message
   * Returns messages in chronological order (oldest first)
   * 
   * Uses cursor-based query with createdAt for efficiency and correctness.
   * This avoids the "index-in-window" bug and is production-safe for large rooms.
   * 
   * @param roomId - Room ID
   * @param lastMessageId - ID of the newest message that was already summarized
   *                        (messages AFTER this ID will be returned)
   * @param lastMessageCreatedAt - Timestamp of the last summarized message (required for cursor)
   */
  async getNewMessagesSince(
    roomId: string,
    lastMessageId: string | null,
    lastMessageCreatedAt: string | null
  ): Promise<AnonymizedMessage[]> {
    if (!lastMessageId && !lastMessageCreatedAt) {
      // No previous summary, return empty (will use full summarization)
      return []
    }

    // Use createdAt-based cursor query for efficiency and correctness
    // This is production-safe and avoids fetching all messages
    let lastCreatedAt: Date | null = null

    if (lastMessageCreatedAt) {
      // Use provided timestamp (preferred, most efficient)
      lastCreatedAt = new Date(lastMessageCreatedAt)
    } else if (lastMessageId) {
      // Fallback: fetch the message to get its createdAt
      const lastMessage = await prisma.message.findUnique({
        where: { id: lastMessageId },
        select: { createdAt: true },
      })
      if (lastMessage) {
        lastCreatedAt = lastMessage.createdAt
      } else {
        // Message not found, fallback to full summarization
        return this.getAnonymizedMessages(roomId, 20)
      }
    }

    if (!lastCreatedAt) {
      // No valid cursor, fallback to full summarization
      return this.getAnonymizedMessages(roomId, 20)
    }

    // Query messages created AFTER lastCreatedAt (cursor-based, efficient)
    // This is production-safe and works correctly even if lastMessageId is very old
    const messages = await prisma.message.findMany({
      where: {
        roomId,
        createdAt: {
          gt: lastCreatedAt, // Messages created after the last summarized one
        },
      },
      orderBy: { createdAt: 'asc' }, // Chronological order (oldest new message first)
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    })

    // Anonymize messages
    return messages.map((msg) => {
      let roleLabel: 'Customer' | 'Support Agent' = 'Customer'
      if (msg.user?.role === Role.ADMIN) {
        roleLabel = 'Support Agent'
      }
      return {
        role: roleLabel,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
      }
    })
  }

  /**
   * PEEK: Get existing insights without updating (read-only)
   * Does NOT call provider, does NOT update state
   * 
   * @returns Existing insights + metadata about new messages, or null if no summary exists
   */
  async peekInsights(roomId: string): Promise<{
    insights: AIInsights
    provider: string
    hasNewMessages: boolean
    newMessageCount: number
    summarizedMessageCount: number
  } | null> {
    // Load existing summary state
    const state = summaryStateStore.get(roomId)
    
    if (!state || !state.lastInsights) {
      // No existing summary
      return null
    }

    // Check if there are new messages since last summary
    const newMessages = await this.getNewMessagesSince(
      roomId,
      state.lastMessageId,
      state.lastMessageCreatedAt
    )

    const newMessageCount = newMessages.length

    return {
      insights: state.lastInsights,
      provider: state.provider,
      hasNewMessages: newMessageCount > 0,
      newMessageCount,
      summarizedMessageCount: 0, // No new summarization in peek mode
    }
  }

  /**
   * REFRESH: Generate AI insights with incremental summarization (write operation)
   * Uses the configured provider (fake or openai)
   * 
   * Algorithm:
   * 1. Load previous summary state (if any)
   * 2. Determine if there are new messages since last summary
   * 3. If no previous summary OR force full refresh:
   *    - Fetch last N messages (e.g., 20)
   *    - Call provider.generate() for full summarization
   * 4. If previous summary exists AND new messages:
   *    - Fetch only new messages since lastMessageId
   *    - Call provider.generateIncremental() to merge with previous summary
   * 5. Update summary state with new results
   * 6. Return insights + metadata
   * 
   * @param roomId - Room ID
   * @param forceFullRefresh - If true, force full summarization even if previous summary exists
   */
  async generateInsights(roomId: string, forceFullRefresh: boolean = false): Promise<{
    insights: AIInsights
    provider: string
    hasNewMessages: boolean
    newMessageCount: number
    summarizedMessageCount: number
  }> {
    const provider = getTicketAIProvider()
    
    // Fetch room context
    const roomContext = await this.getRoomContext(roomId)
    if (!roomContext) {
      throw new Error('Room not found')
    }

    // Load previous summary state
    const previousState = summaryStateStore.get(roomId)
    
    // Determine if we should do incremental or full summarization
    const shouldDoIncremental = 
      !forceFullRefresh &&
      previousState !== null &&
      previousState.lastMessageId !== null

    let insights: AIInsights
    let newMessageCount = 0
    let summarizedMessageCount = 0

    if (shouldDoIncremental) {
      // INCREMENTAL MODE: Only summarize new messages
      const newMessages = await this.getNewMessagesSince(
        roomId,
        previousState!.lastMessageId,
        previousState!.lastMessageCreatedAt
      )

      newMessageCount = newMessages.length

      if (newMessages.length === 0) {
        // No new messages, return previous insights
        return {
          insights: previousState!.lastInsights!,
          provider: provider.name,
          hasNewMessages: false,
          newMessageCount: 0,
          summarizedMessageCount: 0,
        }
      }

      // Generate incremental summary
      insights = await provider.generateIncremental(
        roomContext,
        previousState!.previousSummary!,
        previousState!.lastInsights!,
        newMessages
      )

      summarizedMessageCount = newMessages.length
    } else {
      // FULL MODE: Summarize last N messages
      const messages = await this.getAnonymizedMessages(roomId, 20)
      summarizedMessageCount = messages.length

      // Determine new message count (if we had a previous state)
      if (previousState && previousState.lastMessageId) {
        const newMessages = await this.getNewMessagesSince(
          roomId,
          previousState.lastMessageId,
          previousState.lastMessageCreatedAt
        )
        newMessageCount = newMessages.length
      } else {
        // First time summarizing, all messages are "new"
        newMessageCount = messages.length
      }

      // Generate full summary
      insights = await provider.generate(roomContext, messages)
    }

    // Get the last message ID for state tracking
    const lastMessage = await prisma.message.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true },
    })

    // Update summary state
    const newState: SummaryState = {
      lastMessageId: lastMessage?.id || null,
      lastMessageCreatedAt: lastMessage?.createdAt.toISOString() || null,
      previousSummary: insights.summary,
      lastInsights: insights,
      provider: provider.name,
      updatedAt: new Date(),
    }
    summaryStateStore.set(roomId, newState)

    return {
      insights,
      provider: provider.name,
      hasNewMessages: newMessageCount > 0,
      newMessageCount,
      summarizedMessageCount,
    }
  }
}

