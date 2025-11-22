import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/chat/rooms/route'
import { POST as POST_JOIN } from '@/app/api/chat/rooms/[roomId]/join/route'
import { POST as POST_LEAVE } from '@/app/api/chat/rooms/[roomId]/leave/route'
import { POST as POST_INVITE } from '@/app/api/chat/rooms/[roomId]/invite/route'
import { GET as GET_DISCOVER } from '@/app/api/chat/rooms/discover/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { RoomType, RoomRole } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    roomMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    message: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/io', () => ({
  getIO: vi.fn(() => null),
}))

vi.mock('@/lib/rbac', async () => {
  const actual = await vi.importActual('@/lib/rbac')
  return {
    ...actual,
    assertRoomRole: vi.fn(),
    assertMembership: vi.fn(),
    getMembership: vi.fn(),
  }
})

const { auth: mockAuth } = await import('@/lib/auth')

describe('Room Operations Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/chat/rooms - Room Creation', () => {
    it('should create public room and assign creator as MEMBER', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue(null) // Room doesn't exist
      vi.mocked(prisma.room.create).mockResolvedValue({
        id: 'room-1',
        name: '#test',
        title: 'Test Room',
        description: 'Test description',
        tags: ['test'],
        type: RoomType.PUBLIC,
        isPrivate: false,
        creatorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: mockUser,
      } as any)
      vi.mocked(prisma.roomMember.create).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.MEMBER,
      } as any)

      const request = new Request('http://localhost/api/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: '#test',
          title: 'Test Room',
          description: 'Test description',
          tags: ['test'],
          type: 'PUBLIC',
          isPrivate: false,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ok).toBe(true)
      expect(data.data.room.type).toBe('PUBLIC')
      expect(prisma.roomMember.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          roomId: 'room-1',
          role: RoomRole.MEMBER,
        },
      })
    })

    it('should create private room and assign creator as OWNER', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.room.create).mockResolvedValue({
        id: 'room-2',
        name: '#private',
        title: 'Private Room',
        type: RoomType.PRIVATE,
        isPrivate: true,
        creatorId: 'user-1',
        creator: mockUser,
      } as any)
      vi.mocked(prisma.roomMember.create).mockResolvedValue({
        id: 'member-2',
        userId: 'user-1',
        roomId: 'room-2',
        role: RoomRole.OWNER,
      } as any)

      const request = new Request('http://localhost/api/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: '#private',
          title: 'Private Room',
          type: 'PRIVATE',
          isPrivate: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ok).toBe(true)
      expect(data.data.room.type).toBe('PRIVATE')
      expect(prisma.roomMember.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          roomId: 'room-2',
          role: RoomRole.OWNER,
        },
      })
    })

    it('should reject room creation if name already exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'existing-room',
        name: '#test',
      } as any)

      const request = new Request('http://localhost/api/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: '#test',
          title: 'Test Room',
          type: 'PUBLIC',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('ROOM_EXISTS')
    })

    it('should require authentication for room creation', async () => {
      vi.mocked(mockAuth).mockResolvedValue(null)

      const request = new Request('http://localhost/api/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: '#test',
          title: 'Test Room',
          type: 'PUBLIC',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('UNAUTHORIZED')
    })
  })

  describe('POST /api/chat/rooms/[roomId]/join - Join Room', () => {
    it('should allow joining public room', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#public',
        title: 'Public Room',
        type: RoomType.PUBLIC,
        isPrivate: false,
      } as any)
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.roomMember.create).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.MEMBER,
      } as any)

      const request = new Request('http://localhost/api/chat/rooms/room-1/join', {
        method: 'POST',
      })

      const response = await POST_JOIN(request, { params: Promise.resolve({ roomId: 'room-1' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ok).toBe(true)
      expect(data.code).toBe('JOINED')
    })

    it('should reject joining private room', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-2',
        name: '#private',
        title: 'Private Room',
        type: RoomType.PRIVATE,
        isPrivate: true,
      } as any)

      const request = new Request('http://localhost/api/chat/rooms/room-2/join', {
        method: 'POST',
      })

      const response = await POST_JOIN(request, { params: Promise.resolve({ roomId: 'room-2' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('FORBIDDEN')
    })

    it('should return already member if user is already in room', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#public',
        title: 'Public Room',
        type: RoomType.PUBLIC,
        isPrivate: false,
      } as any)
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.MEMBER,
      } as any)

      const request = new Request('http://localhost/api/chat/rooms/room-1/join', {
        method: 'POST',
      })

      const response = await POST_JOIN(request, { params: Promise.resolve({ roomId: 'room-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.code).toBe('ALREADY_MEMBER')
    })
  })

  describe('POST /api/chat/rooms/[roomId]/leave - Leave Room', () => {
    it('should allow member to leave room', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#test',
        title: 'Test Room',
        members: [
          {
            id: 'member-1',
            userId: 'user-1',
            roomId: 'room-1',
            role: RoomRole.MEMBER,
          },
        ],
      } as any)
      vi.mocked(prisma.roomMember.delete).mockResolvedValue({} as any)

      const request = new Request('http://localhost/api/chat/rooms/room-1/leave', {
        method: 'POST',
      })

      const response = await POST_LEAVE(request, { params: Promise.resolve({ roomId: 'room-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.code).toBe('LEFT')
    })

    it('should prevent owner from leaving if they are the only owner with other members', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#test',
        title: 'Test Room',
        members: [
          {
            id: 'member-1',
            userId: 'user-1',
            roomId: 'room-1',
            role: RoomRole.OWNER,
          },
          {
            id: 'member-2',
            userId: 'user-2',
            roomId: 'room-1',
            role: RoomRole.MEMBER,
          },
          {
            id: 'member-3',
            userId: 'user-3',
            roomId: 'room-1',
            role: RoomRole.MEMBER,
          },
        ],
      } as any)

      const request = new Request('http://localhost/api/chat/rooms/room-1/leave', {
        method: 'POST',
      })

      const response = await POST_LEAVE(request, { params: Promise.resolve({ roomId: 'room-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('CANNOT_LEAVE')
    })

    it('should reject leaving if user is not a member', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#test',
        title: 'Test Room',
        members: [], // No members = user is not a member
      } as any)

      const request = new Request('http://localhost/api/chat/rooms/room-1/leave', {
        method: 'POST',
      })

      const response = await POST_LEAVE(request, { params: Promise.resolve({ roomId: 'room-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('NOT_MEMBER')
    })
  })

  describe('POST /api/chat/rooms/[roomId]/invite - Invite User', () => {
    it('should allow OWNER to invite user to private room', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'owner@example.com',
        role: 'USER' as const,
      }

      const targetUser = {
        id: 'user-2',
        name: 'Target User',
        email: 'target@example.com',
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      const { getMembership } = await import('@/lib/rbac')
      
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#private',
        title: 'Private Room',
        type: RoomType.PRIVATE,
        isPrivate: true,
      } as any)
      // Mock prisma.roomMember.findFirst for invite route
      // First call: check if inviter is a member (OWNER)
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValueOnce({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.OWNER,
      } as any)
      // Second call: check if target user is already a member (null = not a member)
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'clxxxxxxxxxxxxxxxxxxxxx2',
        name: 'Target User',
        email: 'target@example.com',
      } as any) // Target user
      vi.mocked(prisma.roomMember.create).mockResolvedValue({
        id: 'member-2',
        userId: 'clxxxxxxxxxxxxxxxxxxxxx2',
        roomId: 'room-1',
        role: RoomRole.MEMBER,
        user: {
          id: 'clxxxxxxxxxxxxxxxxxxxxx2',
          name: 'Target User',
          email: 'target@example.com',
          image: null,
        },
      } as any)

      const request = new Request('http://localhost/api/chat/rooms/room-1/invite', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'clxxxxxxxxxxxxxxxxxxxxx2', // Valid CUID format
          role: 'MEMBER',
        }),
      })

      const response = await POST_INVITE(request, { params: Promise.resolve({ roomId: 'room-1' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ok).toBe(true)
      expect(data.code).toBe('INVITED')
    })

    it('should allow MODERATOR to invite user to private room', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'mod@example.com',
        role: 'USER' as const,
      }

      const targetUser = {
        id: 'user-2',
        name: 'Target User',
        email: 'target@example.com',
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      const { getMembership } = await import('@/lib/rbac')
      
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#private',
        title: 'Private Room',
        type: RoomType.PRIVATE,
        isPrivate: true,
      } as any)
      // Mock prisma.roomMember.findFirst for invite route
      // First call: check if inviter is a member (MODERATOR)
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValueOnce({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.MODERATOR,
      } as any)
      // Second call: check if target user is already a member (null = not a member)
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(targetUser as any)
      vi.mocked(prisma.roomMember.create).mockResolvedValue({
        id: 'member-2',
        userId: 'clxxxxxxxxxxxxxxxxxxxxx2',
        roomId: 'room-1',
        role: RoomRole.MEMBER,
        user: targetUser,
      } as any)

      const request = new Request('http://localhost/api/chat/rooms/room-1/invite', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'clxxxxxxxxxxxxxxxxxxxxx2', // Valid CUID format
          role: 'MEMBER',
        }),
      })

      const response = await POST_INVITE(request, { params: Promise.resolve({ roomId: 'room-1' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ok).toBe(true)
    })

    it('should reject invite from MEMBER (insufficient permissions)', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'member@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#private',
        title: 'Private Room',
        type: RoomType.PRIVATE,
        isPrivate: true,
      } as any)
      // MEMBER cannot invite (requires MODERATOR or OWNER)
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.MEMBER,
      } as any)

      const request = new Request('http://localhost/api/chat/rooms/room-1/invite', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'clxxxxxxxxxxxxxxxxxxxxx2', // Valid CUID format
          role: 'MEMBER',
        }),
      })

      const response = await POST_INVITE(request, { params: Promise.resolve({ roomId: 'room-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('FORBIDDEN')
    })

    it('should reject invite to public room', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'owner@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        id: 'room-1',
        name: '#public',
        title: 'Public Room',
        type: RoomType.PUBLIC,
        isPrivate: false,
      } as any)

      const request = new Request('http://localhost/api/chat/rooms/room-1/invite', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'clxxxxxxxxxxxxxxxxxxxxx2', // Valid CUID format
          role: 'MEMBER',
        }),
      })

      const response = await POST_INVITE(request, { params: Promise.resolve({ roomId: 'room-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.ok).toBe(false)
      expect(data.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/chat/rooms/discover - Discover Visibility', () => {
    it('should only show public rooms in discover', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.message.findFirst).mockResolvedValue({
        id: 'msg-1',
        content: 'Last message',
        createdAt: new Date(),
        user: { id: 'user-1', name: 'User', image: null },
      } as any)
      vi.mocked(prisma.room.findMany).mockResolvedValue([
        {
          id: 'room-1',
          name: '#public',
          title: 'Public Room',
          type: RoomType.PUBLIC,
          isPrivate: false,
          description: 'A public room',
          tags: ['general'],
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { id: 'user-1', name: 'Creator', image: null },
          _count: {
            members: 5,
            messages: 10,
          },
          messages: [{
            id: 'msg-1',
            content: 'Last message',
            createdAt: new Date(),
            user: { id: 'user-1', name: 'User', image: null },
          }],
        },
      ] as any)
      vi.mocked(prisma.room.count).mockResolvedValue(1)

      const request = new Request('http://localhost/api/chat/rooms/discover')
      const response = await GET_DISCOVER(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: RoomType.PUBLIC,
          }),
        })
      )
    })

    it('should not show private rooms in discover', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      }

      vi.mocked(mockAuth).mockResolvedValue({ user: mockUser })
      vi.mocked(prisma.message.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.room.findMany).mockResolvedValue([]) // No public rooms
      vi.mocked(prisma.room.count).mockResolvedValue(0)

      const request = new Request('http://localhost/api/chat/rooms/discover')
      const response = await GET_DISCOVER(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.data.rooms).toHaveLength(0)
      // Verify private rooms are filtered out
      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: RoomType.PUBLIC,
          }),
        })
      )
    })
  })
})

