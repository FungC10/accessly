import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/chat/messages/route'
import { PATCH, DELETE } from '@/app/api/chat/messages/[messageId]/route'
import { POST as POST_REACTION } from '@/app/api/chat/messages/[messageId]/reactions/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

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
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    messageReaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkMessageRate: vi.fn(),
}))

vi.mock('@/lib/io', () => ({
  getIO: vi.fn(() => null),
}))

vi.mock('@/lib/audit', () => ({
  logAction: vi.fn(),
}))

const { auth: mockAuth } = await import('@/lib/auth')

describe('Message Operations Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/chat/messages - Create Message', () => {
    it('should create message in room user is member of', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#test',
        title: 'Test Room',
      } as any)
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: 'MEMBER',
      } as any)
      vi.mocked(prisma.message.create).mockResolvedValue({
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-1',
        content: 'Hello world',
        createdAt: new Date(),
        editedAt: null,
        deletedAt: null,
        parentMessageId: null,
        user: mockUser,
      } as any)

      const request = new Request('http://localhost/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'clxxxxxxxxxxxxxxxxxxxxx1', // Valid CUID format
          content: 'Hello world',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ok).toBe(true)
      expect(data.data.content).toBe('Hello world')
    })

    it('should create threaded reply with parentMessageId', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#test',
        title: 'Test Room',
      } as any)
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: 'MEMBER',
      } as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: 'parent-msg',
        roomId: 'room-1',
        userId: 'user-2',
        content: 'Parent message',
      } as any)
      vi.mocked(prisma.message.create).mockResolvedValue({
        id: 'clxxxxxxxxxxxxxxxxxxxxx3',
        roomId: 'clxxxxxxxxxxxxxxxxxxxxx1',
        userId: 'user-1',
        content: 'This is a reply',
        parentMessageId: 'clxxxxxxxxxxxxxxxxxxxxx2',
        createdAt: new Date(),
        user: mockUser,
      } as any)

      const request = new Request('http://localhost/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'clxxxxxxxxxxxxxxxxxxxxx1', // Valid CUID format
          content: 'This is a reply',
          parentMessageId: 'clxxxxxxxxxxxxxxxxxxxxx2', // Valid CUID format
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ok).toBe(true)
      expect(data.data.parentMessageId).toBe('clxxxxxxxxxxxxxxxxxxxxx2')
    })

    it('should reject message creation if user is not a member', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#test',
        title: 'Test Room',
      } as any)
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'clxxxxxxxxxxxxxxxxxxxxx1', // Valid CUID format
          content: 'Hello world',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/chat/messages - Pagination', () => {
    it('should return messages with pagination', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Message 1',
          createdAt: new Date('2024-01-01'),
          userId: 'user-1',
          user: mockUser,
          parentMessageId: null,
        },
        {
          id: 'msg-2',
          content: 'Message 2',
          createdAt: new Date('2024-01-02'),
          userId: 'user-2',
          user: { id: 'user-2', name: 'User 2' },
          parentMessageId: null,
        },
      ]

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#test',
        title: 'Test Room',
      } as any)
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: 'MEMBER',
      } as any)
      vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages as any)
      vi.mocked(prisma.message.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/chat/messages?roomId=room-1&limit=20')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.data.messages).toHaveLength(2)
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            roomId: 'room-1',
            deletedAt: null,
          },
          take: 20,
          orderBy: {
            createdAt: 'desc',
          },
        })
      )
    })

    it('should support cursor-based pagination with after parameter', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#test',
        title: 'Test Room',
      } as any)
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: 'MEMBER',
      } as any)
      vi.mocked(prisma.message.findMany).mockResolvedValue([])
      vi.mocked(prisma.message.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/chat/messages?roomId=room-1&after=msg-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        })
      )
    })
  })

  describe('PATCH /api/chat/messages/[messageId] - Edit Message', () => {
    it('should allow author to edit message within 10 minutes', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const recentMessage = {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-1',
        content: 'Original message',
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        editedAt: null,
        deletedAt: null,
        user: mockUser,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue(recentMessage as any)
      vi.mocked(prisma.message.update).mockResolvedValue({
        ...recentMessage,
        content: 'Edited message',
        editedAt: new Date(),
      } as any)

      const request = new Request('http://localhost/api/chat/messages/msg-1', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Edited message',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ messageId: 'msg-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.data.content).toBe('Edited message')
      expect(data.data.editedAt).toBeDefined()
    })

    it('should reject edit after 10 minutes', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const oldMessage = {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-1',
        content: 'Old message',
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        editedAt: null,
        deletedAt: null,
        user: mockUser,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue(oldMessage as any)

      const request = new Request('http://localhost/api/chat/messages/msg-1', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Edited message',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ messageId: 'msg-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('FORBIDDEN')
    })

    it('should reject edit from non-author', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const otherUserMessage = {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-2', // Different user
        content: 'Original message',
        createdAt: new Date(),
        editedAt: null,
        deletedAt: null,
        user: { id: 'user-2', name: 'Other User' },
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue(otherUserMessage as any)

      const request = new Request('http://localhost/api/chat/messages/msg-1', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Edited message',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ messageId: 'msg-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/chat/messages/[messageId] - Delete Message', () => {
    it('should allow author to delete message (soft delete)', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const message = {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-1',
        content: 'Message to delete',
        createdAt: new Date(),
        deletedAt: null,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue(message as any)
      vi.mocked(prisma.message.update).mockResolvedValue({
        ...message,
        content: '[Message deleted]',
        deletedAt: new Date(),
      } as any)

      const request = new Request('http://localhost/api/chat/messages/msg-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ messageId: 'msg-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.data.deletedAt).toBeDefined()
      expect(data.data.content).toBe('[Message deleted]')
    })

    it('should reject delete from non-author', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const otherUserMessage = {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-2', // Different user
        content: 'Message',
        createdAt: new Date(),
        deletedAt: null,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue(otherUserMessage as any)

      const request = new Request('http://localhost/api/chat/messages/msg-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ messageId: 'msg-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('FORBIDDEN')
    })

    it('should reject delete of already deleted message', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const deletedMessage = {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-1',
        content: '[Message deleted]',
        createdAt: new Date(),
        deletedAt: new Date(),
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue(deletedMessage as any)

      const request = new Request('http://localhost/api/chat/messages/msg-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ messageId: 'msg-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('ALREADY_DELETED')
    })
  })

  describe('POST /api/chat/messages/[messageId]/reactions - Reactions', () => {
    it('should toggle reaction on message', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const message = {
        id: 'msg-1',
        roomId: 'room-1',
        deletedAt: null,
        reactions: null,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue(message as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = prisma
        return callback(tx)
      })
      vi.mocked(prisma.message.update).mockResolvedValue({
        id: 'msg-1',
        roomId: 'room-1',
        reactions: { '👍': ['user-1'] },
      } as any)

      const request = new Request('http://localhost/api/chat/messages/msg-1/reactions', {
        method: 'POST',
        body: JSON.stringify({
          emoji: '👍',
        }),
      })

      const response = await POST_REACTION(request, { params: { messageId: 'msg-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.data.reactions).toHaveProperty('👍')
    })

    it('should remove reaction when toggling off', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const message = {
        id: 'msg-1',
        roomId: 'room-1',
        deletedAt: null,
        reactions: { '👍': ['user-1'] },
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue(message as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = prisma
        return callback(tx)
      })
      vi.mocked(prisma.message.update).mockResolvedValue({
        id: 'msg-1',
        roomId: 'room-1',
        reactions: null, // Removed
      } as any)

      const request = new Request('http://localhost/api/chat/messages/msg-1/reactions', {
        method: 'POST',
        body: JSON.stringify({
          emoji: '👍',
        }),
      })

      const response = await POST_REACTION(request, { params: { messageId: 'msg-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      // Reaction should be removed (null or empty)
      expect(data.data.reactions).not.toHaveProperty('👍')
    })

    it('should reject reaction on deleted message', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      const deletedMessage = {
        id: 'msg-1',
        roomId: 'room-1',
        deletedAt: new Date(),
        reactions: null,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.message.findUnique).mockResolvedValue(deletedMessage as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = prisma
        try {
          return await callback(tx)
        } catch (error: any) {
          if (error.message === 'FORBIDDEN') {
            throw error
          }
          throw error
        }
      })

      const request = new Request('http://localhost/api/chat/messages/msg-1/reactions', {
        method: 'POST',
        body: JSON.stringify({
          emoji: '👍',
        }),
      })

      // Mock transaction to throw FORBIDDEN error
      vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('FORBIDDEN'))

      const response = await POST_REACTION(request, { params: { messageId: 'msg-1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('FORBIDDEN')
    })
  })
})

