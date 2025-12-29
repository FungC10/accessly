import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/users/route'
import { GET as GET_LIST } from '@/app/api/users/list/route'
import { prisma } from '@/lib/prisma'
import { assertRole, InsufficientRoleError } from '@/lib/rbac'
import { Role } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  assertRole: vi.fn(),
  InsufficientRoleError: class InsufficientRoleError extends Error {
    code = 'INSUFFICIENT_ROLE'
    status = 403
    constructor(message = 'Insufficient role') {
      super(message)
      this.name = 'InsufficientRoleError'
    }
  },
}))

const { auth } = await import('@/lib/auth')

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthorized request', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/users')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(false)
    expect(data.code).toBe('UNAUTHORIZED')
    expect(assertRole).not.toHaveBeenCalled()
  })

  it('should return 403 for non-admin user', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', role: Role.USER },
      expires: new Date().toISOString(),
    } as any)

    vi.mocked(assertRole).mockImplementation(() => {
      throw new InsufficientRoleError('Admin access required')
    })

    const request = new Request('http://localhost/api/users')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(false)
    expect(data.code).toBe('INSUFFICIENT_ROLE')
    expect(data.message).toBe('Admin access required')
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('should return users list for admin user', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        name: 'User 1',
        email: 'user1@example.com',
        image: null,
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-2',
        name: 'User 2',
        email: 'user2@example.com',
        image: null,
        role: Role.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin-1', role: Role.ADMIN },
      expires: new Date().toISOString(),
    } as any)

    vi.mocked(assertRole).mockReturnValue(undefined)
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

    const request = new Request('http://localhost/api/users')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.users).toHaveLength(2)
    expect(data.data.count).toBe(2)
    expect(data.data.users[0]).toMatchObject({
      id: 'user-1',
      name: 'User 1',
      email: 'user1@example.com',
      role: Role.USER,
    })
    expect(assertRole).toHaveBeenCalledWith(expect.any(Object), Role.ADMIN)
    expect(prisma.user.findMany).toHaveBeenCalled()
  })

  it('should handle database error', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin-1', role: Role.ADMIN },
      expires: new Date().toISOString(),
    } as any)

    vi.mocked(assertRole).mockReturnValue(undefined)
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost/api/users')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(false)
    expect(data.code).toBe('INTERNAL_ERROR')
    expect(data.message).toBe('Internal server error')
  })
})

describe('GET /api/users/list - User Search (for room owners)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow any authenticated user to search users', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        image: null,
      },
      {
        id: 'user-2',
        name: 'Bob',
        email: 'bob@example.com',
        image: null,
      },
    ]

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'user@test.com' },
    } as any)

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

    const request = new Request('http://localhost/api/users/list?search=alice')
    const response = await GET_LIST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data.users).toHaveLength(2)
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'alice', mode: 'insensitive' } },
            { email: { contains: 'alice', mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
        take: 100,
      })
    )
  })

  it('should return limited user info (no role, department, ban info)', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        image: null,
      },
    ]

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'user@test.com' },
    } as any)

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

    const request = new Request('http://localhost/api/users/list')
    const response = await GET_LIST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data.users[0]).not.toHaveProperty('role')
    expect(data.data.users[0]).not.toHaveProperty('department')
    expect(data.data.users[0]).toHaveProperty('id')
    expect(data.data.users[0]).toHaveProperty('name')
    expect(data.data.users[0]).toHaveProperty('email')
    expect(data.data.users[0]).toHaveProperty('image')
  })

  it('should return 401 for unauthorized request', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/users/list')
    const response = await GET_LIST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.ok).toBe(false)
    expect(data.code).toBe('UNAUTHORIZED')
  })

  it('should search by name or email', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'user@test.com' },
    } as any)

    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/users/list?search=test@example.com')
    const response = await GET_LIST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'test@example.com', mode: 'insensitive' } },
            { email: { contains: 'test@example.com', mode: 'insensitive' } },
          ],
        },
      })
    )
  })

  it('should return all users when no search query', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'user@test.com' },
    } as any)

    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/users/list')
    const response = await GET_LIST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    )
  })
})
