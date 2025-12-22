import { prisma } from '@/lib/prisma'
import { Role, RoomRole, RoomType, TicketStatus } from '@prisma/client'

// Types
export interface StaffAnalyticsRow {
  userId: string
  name: string
  email: string | null
  totalTicketsAssigned: number
  activeTickets: number
  avgResponseTimeMinutes: number | null
  ticketMessagesLast30d: number
  resolutionRate: number | null
}

export interface TicketsByDepartmentSummary {
  IT_SUPPORT: number
  BILLING: number
  PRODUCT: number
  GENERAL: number
  total: number
}

export interface StaffAnalyticsResponse {
  staff: StaffAnalyticsRow[]
  ticketsByDepartment?: TicketsByDepartmentSummary
}

/**
 * Get staff analytics data
 * This logic is shared between the API route and server components
 */
export async function getStaffAnalytics(): Promise<StaffAnalyticsResponse> {
  // Get all admin users (staff)
  const staffUsers = await prisma.user.findMany({
    where: {
      role: Role.ADMIN,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  // Calculate 30 days ago for message filtering
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get tickets by department summary
  const ticketsByDept = await prisma.room.groupBy({
    by: ['ticketDepartment'],
    where: {
      type: RoomType.TICKET,
    },
    _count: {
      id: true,
    },
  })

  const deptSummary: TicketsByDepartmentSummary = {
    IT_SUPPORT: 0,
    BILLING: 0,
    PRODUCT: 0,
    GENERAL: 0,
    total: 0,
  }

  // Aggregate tickets by department
  // Note: Tickets without a department (null ticketDepartment) are excluded from the summary
  // This is expected behavior as tickets are always created with a department
  for (const dept of ticketsByDept) {
    if (dept.ticketDepartment) {
      deptSummary[dept.ticketDepartment] = dept._count.id
      deptSummary.total += dept._count.id
    }
  }

  // Calculate metrics for each staff member
  const staffAnalytics = await Promise.all(
    staffUsers.map(async (staff) => {
      // 1. Total tickets assigned (all time)
      const totalTicketsAssigned = await prisma.roomMember.count({
        where: {
          userId: staff.id,
          role: RoomRole.OWNER,
          room: {
            type: RoomType.TICKET,
          },
        },
      })

      // 2. Active tickets (OPEN or WAITING)
      const activeTickets = await prisma.roomMember.count({
        where: {
          userId: staff.id,
          role: RoomRole.OWNER,
          room: {
            type: RoomType.TICKET,
            status: {
              in: [TicketStatus.OPEN, TicketStatus.WAITING],
            },
          },
        },
      })

      // 3. Messages sent in TICKET rooms (last 30 days)
      const ticketMessagesLast30d = await prisma.message.count({
        where: {
          userId: staff.id,
          room: {
            type: RoomType.TICKET,
          },
          createdAt: {
            gte: thirtyDaysAgo,
          },
          deletedAt: null,
        },
      })

      // 4. Resolution rate
      const resolvedTickets = await prisma.roomMember.count({
        where: {
          userId: staff.id,
          role: RoomRole.OWNER,
          room: {
            type: RoomType.TICKET,
            status: TicketStatus.RESOLVED,
          },
        },
      })

      const totalTicketsForResolution = await prisma.roomMember.count({
        where: {
          userId: staff.id,
          role: RoomRole.OWNER,
          room: {
            type: RoomType.TICKET,
            status: {
              in: [TicketStatus.OPEN, TicketStatus.WAITING, TicketStatus.RESOLVED],
            },
          },
        },
      })

      const resolutionRate =
        totalTicketsForResolution > 0
          ? resolvedTickets / totalTicketsForResolution
          : null

      // 5. Average response time (approximate)
      // Get all tickets where staff is OWNER
      const staffTickets = await prisma.roomMember.findMany({
        where: {
          userId: staff.id,
          role: RoomRole.OWNER,
          room: {
            type: RoomType.TICKET,
          },
        },
        select: {
          roomId: true,
        },
      })

      const responseTimes: number[] = []

      // For each ticket, calculate response times
      for (const ticket of staffTickets) {
        // Get all messages in this ticket, ordered by creation time
        const messages = await prisma.message.findMany({
          where: {
            roomId: ticket.roomId,
            deletedAt: null,
          },
          select: {
            id: true,
            userId: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        })

        // Get memberships for this room to determine who is staff
        const memberships = await prisma.roomMember.findMany({
          where: {
            roomId: ticket.roomId,
          },
          select: {
            userId: true,
            role: true,
          },
        })

        // Create a map of userId -> isStaff
        const isStaffMap = new Map<string, boolean>()
        for (const membership of memberships) {
          isStaffMap.set(
            membership.userId,
            membership.role === RoomRole.OWNER || membership.role === RoomRole.MODERATOR
          )
        }

        // Calculate response times: time between customer message and staff response
        let lastCustomerMessageTime: Date | null = null

        for (const msg of messages) {
          const isStaffResponse = isStaffMap.get(msg.userId) || false

          if (!isStaffResponse) {
            // Customer message - mark as start of response window
            lastCustomerMessageTime = msg.createdAt
          } else if (lastCustomerMessageTime) {
            // Staff response - calculate time since last customer message
            const responseTime = msg.createdAt.getTime() - lastCustomerMessageTime.getTime()
            responseTimes.push(responseTime)
            lastCustomerMessageTime = null
          }
        }
      }

      // Calculate average response time in minutes
      const avgResponseTimeMinutes =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000 / 60
          : null

      return {
        userId: staff.id,
        name: staff.name || 'Unknown',
        email: staff.email,
        totalTicketsAssigned,
        activeTickets,
        avgResponseTimeMinutes: avgResponseTimeMinutes ? Math.round(avgResponseTimeMinutes) : null,
        ticketMessagesLast30d,
        resolutionRate: resolutionRate !== null ? Math.round(resolutionRate * 100) / 100 : null,
      } as StaffAnalyticsRow
    })
  )

  // Sort by active tickets (descending)
  staffAnalytics.sort((a, b) => b.activeTickets - a.activeTickets)

  return {
    staff: staffAnalytics,
    ticketsByDepartment: deptSummary,
  }
}

