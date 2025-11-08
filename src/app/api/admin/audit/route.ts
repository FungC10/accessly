import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/audit
 * Get audit logs with filtering (admin only)
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const actorId = searchParams.get('actorId')
    const targetType = searchParams.get('targetType')
    const targetId = searchParams.get('targetId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const cursor = searchParams.get('cursor')

    // Build where clause
    const where: any = {}

    if (action) {
      where.action = action
    }

    if (actorId) {
      where.actorId = actorId
    }

    if (targetType) {
      where.targetType = targetType
    }

    if (targetId) {
      where.targetId = targetId
    }

    // Cursor pagination
    if (cursor) {
      where.id = { lt: cursor }
    }

    // Fetch audit logs
    const logs = await prisma.auditLog.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    const hasMore = logs.length > limit
    const logsToReturn = hasMore ? logs.slice(0, limit) : logs
    const nextCursor = hasMore && logsToReturn.length > 0 ? logsToReturn[logsToReturn.length - 1].id : null

    return Response.json({
      ok: true,
      data: {
        logs: logsToReturn.map((log) => ({
          id: log.id,
          action: log.action,
          actor: log.actor,
          targetType: log.targetType,
          targetId: log.targetId,
          metadata: log.metadata,
          createdAt: log.createdAt.toISOString(),
        })),
        cursor: nextCursor,
        hasMore,
      },
    })
  } catch (error: any) {
    console.error('Error fetching audit logs:', error)
    return Response.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }, { status: 500 })
  }
}

