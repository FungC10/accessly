import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/chat/messages/route'
import { handlePostMessageCore } from '@/app/api/chat/messages/core'
import { prisma } from '@/lib/prisma'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
    },
    roomMember: {
      findUnique: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/rateLimit', async () => {
  const actual = await vi.importActual('@/lib/rateLimit')
  return {
    ...actual,
    checkRate: vi.fn(),
    checkMessageRate: vi.fn(),
  }
})

vi.mock('@/lib/io', () => ({
  getIO: vi.fn(() => null),
}))

const { auth } = await import('@/lib/auth')
const { checkRate, checkMessageRate } = await import('@/lib/rateLimit')

describe('Threading - GET /api/chat/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return hierarchical structure with replies', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-1',
        content: 'Parent message',
        parentMessageId: null,
        createdAt: new Date('2025-11-07T10:00:00Z'),
        editedAt: null,
        deletedAt: null,
        reactions: null,
        user: { id: 'user-1', name: 'User 1', image: null },
      },
      {
        id: 'msg-2',
        roomId: 'room-1',
        userId: 'user-2',
        content: 'Reply to parent',
        parentMessageId: 'clx1234567890123456789011', // Valid CUID
        createdAt: new Date('2025-11-07T10:05:00Z'),
        editedAt: null,
        deletedAt: null,
        reactions: null,
        user: { id: 'user-2', name: 'User 2', image: null },
      },
    ]

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'user1@test.com' },
      expires: new Date().toISOString(),
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user1@test.com',
    } as any)

    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      id: 'room-1',
      type: 'PUBLIC',
      isPrivate: false,
    } as any)

    vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      roomId: 'room-1',
      role: 'MEMBER',
    } as any)

    vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages as any)

    const request = new Request('http://localhost/api/chat/messages?roomId=room-1&limit=50')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data.hierarchicalMessages).toBeDefined()
    expect(Array.isArray(data.data.hierarchicalMessages)).toBe(true)
    
    if (data.data.hierarchicalMessages && data.data.hierarchicalMessages.length > 0) {
      const parent = data.data.hierarchicalMessages[0]
      expect(parent.id).toBe('msg-1')
      expect(parent.replies).toBeDefined()
      expect(Array.isArray(parent.replies)).toBe(true)
      if (parent.replies && parent.replies.length > 0) {
        expect(parent.replies[0].id).toBe('msg-2')
        expect(parent.replies[0].parentMessageId).toBe('msg-1')
      }
    }
  })
})

describe('Threading - POST /api/chat/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create reply message with parentMessageId', async () => {
    const mockReply = {
      id: 'msg-2',
      roomId: 'room-1',
      userId: 'user-1',
      content: 'This is a reply',
      parentMessageId: 'clx1234567890123456789011', // Valid CUID matching request
      createdAt: new Date('2025-11-07T10:05:00Z'),
      editedAt: null,
      deletedAt: null,
      reactions: null,
      user: { id: 'user-1', name: 'User 1', image: null },
    }

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'user1@test.com' },
      expires: new Date().toISOString(),
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user1@test.com',
    } as any)

    vi.mocked(checkMessageRate).mockReturnValue(undefined)

    vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      roomId: 'clx1234567890123456789012',
      role: 'MEMBER',
    } as any)

    vi.mocked(prisma.message.create).mockResolvedValue(mockReply as any)

    const request = new Request('http://localhost/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'clx1234567890123456789012',
        content: 'This is a reply',
        parentMessageId: 'clx1234567890123456789011', // Valid CUID
      }),
    })

    const response = await handlePostMessageCore(request)
    expect(response.status).toBe(201)
    expect(response.body.ok).toBe(true)
    expect(response.body.data).toBeDefined()
    if (response.body.data) {
      expect(response.body.data.parentMessageId).toBe('clx1234567890123456789011')
    }
    expect(prisma.message.create).toHaveBeenCalled()
    const createCall = vi.mocked(prisma.message.create).mock.calls[0]
    expect(createCall[0].data.parentMessageId).toBe('clx1234567890123456789011')
  })
})

