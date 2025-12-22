import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { getStaffAnalytics, type StaffAnalyticsResponse } from './logic'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Re-export types for external use
export type { StaffAnalyticsRow, TicketsByDepartmentSummary, StaffAnalyticsResponse } from './logic'

/**
 * GET /api/admin/staff-analytics
 * Get staff analytics (admin only)
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      }, { status: 401 })
    }

    // Verify user is admin
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { id: true, role: true },
    })

    if (!dbUser || dbUser.role !== Role.ADMIN) {
      return Response.json({
        ok: false,
        code: 'FORBIDDEN',
        message: 'Admin access required',
      }, { status: 403 })
    }

    const analytics = await getStaffAnalytics()

    return Response.json({
      ok: true,
      data: analytics,
    })
  } catch (error: any) {
    console.error('Error fetching staff analytics:', error)
    return Response.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }, { status: 500 })
  }
}

