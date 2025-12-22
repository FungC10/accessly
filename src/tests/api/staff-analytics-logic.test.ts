import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getStaffAnalytics } from '@/app/api/admin/staff-analytics/logic'
import { prisma } from '@/lib/prisma'
import { Role, RoomType, TicketStatus, RoomRole, TicketDepartment } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
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

describe('getStaffAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty data when no staff members exist', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    vi.mocked(prisma.room.groupBy).mockResolvedValue([])

    const result = await getStaffAnalytics()

    expect(result.staff).toHaveLength(0)
    expect(result.ticketsByDepartment).toEqual({
      IT_SUPPORT: 0,
      BILLING: 0,
      PRODUCT: 0,
      GENERAL: 0,
      total: 0,
    })
  })

  it('should calculate department summary correctly', async () => {
    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: 'Admin 1',
        email: 'admin1@test.com',
      },
    ]

    const mockTicketsByDept = [
      { ticketDepartment: TicketDepartment.IT_SUPPORT, _count: { id: 10 } },
      { ticketDepartment: TicketDepartment.BILLING, _count: { id: 5 } },
      { ticketDepartment: TicketDepartment.PRODUCT, _count: { id: 8 } },
      { ticketDepartment: TicketDepartment.GENERAL, _count: { id: 12 } },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue(mockTicketsByDept as any)
    vi.mocked(prisma.roomMember.count).mockResolvedValue(0)
    vi.mocked(prisma.message.count).mockResolvedValue(0)
    vi.mocked(prisma.roomMember.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])

    const result = await getStaffAnalytics()

    expect(result.ticketsByDepartment).toEqual({
      IT_SUPPORT: 10,
      BILLING: 5,
      PRODUCT: 8,
      GENERAL: 12,
      total: 35,
    })
  })

  it('should exclude tickets with null department from summary', async () => {
    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: 'Admin 1',
        email: 'admin1@test.com',
      },
    ]

    const mockTicketsByDept = [
      { ticketDepartment: TicketDepartment.IT_SUPPORT, _count: { id: 10 } },
      { ticketDepartment: null, _count: { id: 5 } }, // Should be excluded
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue(mockTicketsByDept as any)
    vi.mocked(prisma.roomMember.count).mockResolvedValue(0)
    vi.mocked(prisma.message.count).mockResolvedValue(0)
    vi.mocked(prisma.roomMember.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])

    const result = await getStaffAnalytics()

    expect(result.ticketsByDepartment?.IT_SUPPORT).toBe(10)
    expect(result.ticketsByDepartment?.total).toBe(10) // Only IT_SUPPORT counted
  })

  it('should calculate staff metrics correctly', async () => {
    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: 'Admin 1',
        email: 'admin1@test.com',
      },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue([])

    // Mock counts for staff metrics
    vi.mocked(prisma.roomMember.count)
      .mockResolvedValueOnce(20) // totalTicketsAssigned
      .mockResolvedValueOnce(5) // activeTickets
      .mockResolvedValueOnce(12) // resolvedTickets
      .mockResolvedValueOnce(15) // totalTicketsForResolution

    vi.mocked(prisma.message.count).mockResolvedValue(30) // ticketMessagesLast30d

    // Mock response time calculation
    // First: get tickets where staff is owner
    vi.mocked(prisma.roomMember.findMany)
      .mockResolvedValueOnce([
        { roomId: 'ticket-1' },
      ] as any)
      // Then: get memberships for each ticket (called after messages)
      .mockResolvedValueOnce([
        {
          userId: 'admin-1',
          role: RoomRole.OWNER,
        },
        {
          userId: 'customer-1',
          role: RoomRole.MEMBER,
        },
      ] as any)

    // Messages for ticket-1 (called first for each ticket)
    vi.mocked(prisma.message.findMany).mockResolvedValueOnce([
      {
        id: 'msg-1',
        userId: 'customer-1',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'msg-2',
        userId: 'admin-1',
        createdAt: new Date('2024-01-01T10:15:00Z'), // 15 minutes later
      },
    ] as any)

    const result = await getStaffAnalytics()

    expect(result.staff).toHaveLength(1)
    expect(result.staff[0]).toMatchObject({
      userId: 'admin-1',
      name: 'Admin 1',
      email: 'admin1@test.com',
      totalTicketsAssigned: 20,
      activeTickets: 5,
      ticketMessagesLast30d: 30,
    })

    // Resolution rate should be 12/15 = 0.8
    expect(result.staff[0].resolutionRate).toBe(0.8)

    // Response time should be approximately 15 minutes (900000 ms / 1000 / 60)
    expect(result.staff[0].avgResponseTimeMinutes).toBe(15)
  })

  it('should handle null resolution rate when no tickets for resolution', async () => {
    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: 'Admin 1',
        email: 'admin1@test.com',
      },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue([])

    vi.mocked(prisma.roomMember.count)
      .mockResolvedValueOnce(0) // totalTicketsAssigned
      .mockResolvedValueOnce(0) // activeTickets
      .mockResolvedValueOnce(0) // resolvedTickets
      .mockResolvedValueOnce(0) // totalTicketsForResolution (0 = null resolution rate)

    vi.mocked(prisma.message.count).mockResolvedValue(0)
    vi.mocked(prisma.roomMember.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])

    const result = await getStaffAnalytics()

    expect(result.staff[0].resolutionRate).toBeNull()
    expect(result.staff[0].avgResponseTimeMinutes).toBeNull()
  })

  it('should handle null response time when no responses exist', async () => {
    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: 'Admin 1',
        email: 'admin1@test.com',
      },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue([])

    vi.mocked(prisma.roomMember.count)
      .mockResolvedValueOnce(5) // totalTicketsAssigned
      .mockResolvedValueOnce(2) // activeTickets
      .mockResolvedValueOnce(3) // resolvedTickets
      .mockResolvedValueOnce(5) // totalTicketsForResolution

    vi.mocked(prisma.message.count).mockResolvedValue(0)
    vi.mocked(prisma.roomMember.findMany).mockResolvedValue([
      { roomId: 'ticket-1' },
    ] as any)

    // No messages = no response time
    vi.mocked(prisma.message.findMany).mockResolvedValue([])

    const result = await getStaffAnalytics()

    expect(result.staff[0].avgResponseTimeMinutes).toBeNull()
  })

  it('should sort staff by active tickets (descending)', async () => {
    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: 'Admin 1',
        email: 'admin1@test.com',
      },
      {
        id: 'admin-2',
        name: 'Admin 2',
        email: 'admin2@test.com',
      },
      {
        id: 'admin-3',
        name: 'Admin 3',
        email: 'admin3@test.com',
      },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue([])

    // Create a map to track call counts per staff member
    const callCounts = new Map<string, number>()
    mockStaffUsers.forEach((staff) => {
      callCounts.set(staff.id, 0)
    })

    // Mock roomMember.count to return values based on call order within each staff member's processing
    // @ts-expect-error - Mock implementation doesn't match PrismaPromise type exactly, but works in tests
    vi.mocked(prisma.roomMember.count).mockImplementation(async (args: any) => {
      const userId = args?.where?.userId
      if (!userId) return Promise.resolve(0) as any

      const count = callCounts.get(userId) || 0
      callCounts.set(userId, count + 1)

      // Return values based on staff member and call order
      let value = 0
      if (userId === 'admin-1') {
        if (count === 0) value = 10 // totalTicketsAssigned
        else if (count === 1) value = 5 // activeTickets
        else if (count === 2) value = 5 // resolvedTickets
        else if (count === 3) value = 10 // totalTicketsForResolution
      } else if (userId === 'admin-2') {
        if (count === 0) value = 15 // totalTicketsAssigned
        else if (count === 1) value = 12 // activeTickets
        else if (count === 2) value = 3 // resolvedTickets
        else if (count === 3) value = 15 // totalTicketsForResolution
      } else if (userId === 'admin-3') {
        if (count === 0) value = 8 // totalTicketsAssigned
        else if (count === 1) value = 2 // activeTickets
        else if (count === 2) value = 6 // resolvedTickets
        else if (count === 3) value = 8 // totalTicketsForResolution
      }
      return Promise.resolve(value) as any
    })

    vi.mocked(prisma.message.count).mockResolvedValue(0)
    vi.mocked(prisma.roomMember.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])

    const result = await getStaffAnalytics()

    expect(result.staff).toHaveLength(3)
    
    // Find each staff member and verify their active tickets
    const admin1 = result.staff.find((s) => s.userId === 'admin-1')
    const admin2 = result.staff.find((s) => s.userId === 'admin-2')
    const admin3 = result.staff.find((s) => s.userId === 'admin-3')
    
    expect(admin1?.activeTickets).toBe(5)
    expect(admin2?.activeTickets).toBe(12)
    expect(admin3?.activeTickets).toBe(2)
    
    // Verify sorting: activeTickets should be in descending order
    // The array should be sorted by activeTickets descending
    for (let i = 0; i < result.staff.length - 1; i++) {
      expect(result.staff[i].activeTickets).toBeGreaterThanOrEqual(
        result.staff[i + 1].activeTickets
      )
    }
    
    // Verify the highest active tickets (12) is first
    expect(result.staff[0].activeTickets).toBe(12)
    // Verify the lowest active tickets (2) is last
    expect(result.staff[2].activeTickets).toBe(2)
  })

  it('should calculate response time correctly with multiple tickets', async () => {
    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: 'Admin 1',
        email: 'admin1@test.com',
      },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue([])

    vi.mocked(prisma.roomMember.count)
      .mockResolvedValueOnce(2) // totalTicketsAssigned
      .mockResolvedValueOnce(1) // activeTickets
      .mockResolvedValueOnce(1) // resolvedTickets
      .mockResolvedValueOnce(2) // totalTicketsForResolution

    vi.mocked(prisma.message.count).mockResolvedValue(0)
    
    // First: get tickets where staff is owner
    vi.mocked(prisma.roomMember.findMany)
      .mockResolvedValueOnce([
        { roomId: 'ticket-1' },
        { roomId: 'ticket-2' },
      ] as any)
      // Then: get memberships for ticket-1
      .mockResolvedValueOnce([
        {
          userId: 'admin-1',
          role: RoomRole.OWNER,
        },
        {
          userId: 'customer-1',
          role: RoomRole.MEMBER,
        },
      ] as any)
      // Then: get memberships for ticket-2
      .mockResolvedValueOnce([
        {
          userId: 'admin-1',
          role: RoomRole.OWNER,
        },
        {
          userId: 'customer-2',
          role: RoomRole.MEMBER,
        },
      ] as any)

    // Messages for ticket-1 (called first for each ticket)
    vi.mocked(prisma.message.findMany)
      .mockResolvedValueOnce([
        {
          id: 'msg-1',
          userId: 'customer-1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          userId: 'admin-1',
          createdAt: new Date('2024-01-01T10:15:00Z'), // 15 min
        },
      ] as any)
      // Messages for ticket-2
      .mockResolvedValueOnce([
        {
          id: 'msg-3',
          userId: 'customer-2',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
        {
          id: 'msg-4',
          userId: 'admin-1',
          createdAt: new Date('2024-01-01T11:30:00Z'), // 30 min
        },
      ] as any)

    const result = await getStaffAnalytics()

    // Average of 15 and 30 minutes = 22.5, rounded to 23
    expect(result.staff[0].avgResponseTimeMinutes).toBe(23)
  })

  it('should handle staff with no name (fallback to Unknown)', async () => {
    const mockStaffUsers = [
      {
        id: 'admin-1',
        name: null,
        email: 'admin1@test.com',
      },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockStaffUsers as any)
    vi.mocked(prisma.room.groupBy).mockResolvedValue([])
    vi.mocked(prisma.roomMember.count).mockResolvedValue(0)
    vi.mocked(prisma.message.count).mockResolvedValue(0)
    vi.mocked(prisma.roomMember.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])

    const result = await getStaffAnalytics()

    expect(result.staff[0].name).toBe('Unknown')
    expect(result.staff[0].email).toBe('admin1@test.com')
  })
})

