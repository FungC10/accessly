import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hasRole, hasRoomRole, getMembership, assertRoomRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Role, RoomRole } from '@prisma/client'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    roomMember: {
      findUnique: vi.fn(),
    },
  },
}))

describe('RBAC Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasRole', () => {
    it('should return true if user has required role', () => {
      const session = {
        user: {
          id: 'user-1',
          role: Role.ADMIN,
        },
      } as any

      expect(hasRole(session, Role.ADMIN)).toBe(true)
    })

    it('should return false if user does not have required role', () => {
      const session = {
        user: {
          id: 'user-1',
          role: Role.USER,
        },
      } as any

      expect(hasRole(session, Role.ADMIN)).toBe(false)
    })

    it('should return true if user is ADMIN (has access to everything)', () => {
      const session = {
        user: {
          id: 'user-1',
          role: Role.ADMIN,
        },
      } as any

      expect(hasRole(session, Role.USER)).toBe(true) // ADMIN has access to USER role
    })

    it('should return false if session is missing user', () => {
      const session = {
        user: null,
      } as any

      expect(hasRole(session, Role.USER)).toBe(false)
    })
  })

  describe('hasRoomRole', () => {
    it('should return true if user has required room role', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.OWNER,
      } as any)

      const result = await hasRoomRole('user-1', 'room-1', RoomRole.OWNER, prisma)

      expect(result).toBe(true)
    })

    it('should return false if user does not have required room role', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.MEMBER,
      } as any)

      const result = await hasRoomRole('user-1', 'room-1', RoomRole.MODERATOR, prisma)

      expect(result).toBe(false)
    })

    it('should return false if user is not a member', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue(null)

      const result = await hasRoomRole('user-1', 'room-1', RoomRole.OWNER, prisma)

      expect(result).toBe(false)
    })
  })

  describe('getMembership', () => {
    it('should return membership if user is a member', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.MEMBER,
      } as any)

      const result = await getMembership('user-1', 'room-1', prisma)

      expect(result).not.toBeNull()
      expect(result?.role).toBe(RoomRole.MEMBER)
    })

    it('should return null if user is not a member', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue(null)

      const result = await getMembership('user-1', 'room-1', prisma)

      expect(result).toBeNull()
    })
  })

  describe('assertRoomRole', () => {
    it('should not throw if user has required role', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.OWNER,
      } as any)

      await expect(
        assertRoomRole('user-1', 'room-1', [RoomRole.OWNER, RoomRole.MODERATOR], prisma)
      ).resolves.not.toThrow()
    })

    it('should throw if user does not have required role', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.MEMBER,
      } as any)

      await expect(
        assertRoomRole('user-1', 'room-1', [RoomRole.OWNER, RoomRole.MODERATOR], prisma)
      ).rejects.toThrow()
    })

    it('should throw if user is not a member', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue(null)

      await expect(
        assertRoomRole('user-1', 'room-1', [RoomRole.OWNER], prisma)
      ).rejects.toThrow()
    })
  })

  describe('Role Hierarchy', () => {
    it('should allow OWNER to perform MODERATOR actions', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.OWNER,
      } as any)

      const result = await hasRoomRole('user-1', 'room-1', RoomRole.MODERATOR, prisma)

      // OWNER should have MODERATOR permissions
      expect(result).toBe(true)
    })

    it('should allow MODERATOR to perform MEMBER actions', async () => {
      vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        roomId: 'room-1',
        role: RoomRole.MODERATOR,
      } as any)

      const result = await hasRoomRole('user-1', 'room-1', RoomRole.MEMBER, prisma)

      // MODERATOR should have MEMBER permissions
      expect(result).toBe(true)
    })
  })
})

