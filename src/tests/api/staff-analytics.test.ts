import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/admin/staff-analytics/route'
import { prisma } from '@/lib/prisma'
import { Role, RoomType, TicketStatus, RoomRole } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    room: {
      groupBy: vi.fn(),
    },
    roomMember: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    message: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

const { auth } = await import('@/lib/auth')

describe('GET /api/admin/staff-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthorized request', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/admin/staff-analytics')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.ok).toBe(false)
    expect(data.code).toBe('UNAUTHORIZED')
  })

  it('should return 403 for non-admin user', async () => {
    const mockSession = {
      user: {
        id: 'user-1',
        email: 'user@test.com',
        role: Role.USER,
      },
    }

    const mockUser = {
      id: 'user-1',
      role: Role.USER,
    }

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

    const request = new Request('http://localhost/api/admin/staff-analytics')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.ok).toBe(false)
    expect(data.code).toBe('FORBIDDEN')
  })

  it('should return staff analytics for admin user', async () => {
    const mockSession = {
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
      },
    }

    const mockAdminUser = {
      id: 'admin-1',
      role: Role.ADMIN,
    }

    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@test.com',
      },
    ]

    const mockTicketsByDept = [
      { ticketDepartment: 'IT_SUPPORT', _count: { id: 10 } },
      { ticketDepartment: 'BILLING', _count: { id: 5 } },
    ]

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAdminUser as any)
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue(mockTicketsByDept as any)

    // Mock all the count queries for staff metrics
    vi.mocked(prisma.roomMember.count)
      .mockResolvedValueOnce(5) // totalTicketsAssigned
      .mockResolvedValueOnce(2) // activeTickets
      .mockResolvedValueOnce(3) // resolvedTickets
      .mockResolvedValueOnce(5) // totalTicketsForResolution

    vi.mocked(prisma.message.count).mockResolvedValue(10) // ticketMessagesLast30d

    // Mock ticket memberships for response time calculation
    vi.mocked(prisma.roomMember.findMany).mockResolvedValue([
      { roomId: 'ticket-1' },
    ] as any)

    // Mock messages for response time calculation
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      {
        id: 'msg-1',
        userId: 'customer-1',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'msg-2',
        userId: 'admin-1',
        createdAt: new Date('2024-01-01T10:15:00Z'),
      },
    ] as any)

    const request = new Request('http://localhost/api/admin/staff-analytics')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.staff).toBeInstanceOf(Array)
    expect(data.data.ticketsByDepartment).toBeDefined()
  })

  it('should return correct data structure', async () => {
    const mockSession = {
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
      },
    }

    const mockAdminUser = {
      id: 'admin-1',
      role: Role.ADMIN,
    }

    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@test.com',
      },
    ]

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAdminUser as any)
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue([])

    // Mock all queries to return empty/zero values
    vi.mocked(prisma.roomMember.count).mockResolvedValue(0)
    vi.mocked(prisma.message.count).mockResolvedValue(0)
    vi.mocked(prisma.roomMember.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/admin/staff-analytics')
    const response = await GET()
    const data = await response.json()

    expect(data.data.staff).toHaveLength(1)
    expect(data.data.staff[0]).toMatchObject({
      userId: 'admin-1',
      name: 'Admin User',
      email: 'admin@test.com',
      totalTicketsAssigned: 0,
      activeTickets: 0,
      ticketMessagesLast30d: 0,
    })
    expect(data.data.ticketsByDepartment).toMatchObject({
      IT_SUPPORT: 0,
      BILLING: 0,
      PRODUCT: 0,
      GENERAL: 0,
      total: 0,
    })
  })
})

