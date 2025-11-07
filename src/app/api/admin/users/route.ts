import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertRole } from '@/lib/rbac'
import { Role } from '@prisma/client'
import { logAction } from '@/lib/audit'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 })
    }

    assertRole(session, Role.ADMIN)

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        ban: {
          select: {
            reason: true,
            bannedAt: true,
            expiresAt: true,
            bannedBy: true,
          },
        },
        _count: {
          select: {
            messages: true,
            memberships: true,
          },
        },
      },
    })

    return Response.json({ ok: true, data: { users } })
  } catch (error: any) {
    if (error.code === 'INSUFFICIENT_ROLE') {
      return Response.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 })
    }
    console.error('Error fetching users:', error)
    return Response.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

const BanUserInput = z.object({
  userId: z.string(),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
})

/**
 * POST /api/admin/users/ban
 * Ban a user (admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 })
    }

    assertRole(session, Role.ADMIN)

    const body = await request.json()
    const validated = BanUserInput.parse(body)

    // Prevent banning yourself
    if (validated.userId === session.user.id) {
      return Response.json(
        { ok: false, code: 'INVALID_REQUEST', message: 'Cannot ban yourself' },
        { status: 400 }
      )
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, email: true, role: true },
    })

    if (!targetUser) {
      return Response.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 })
    }

    // Prevent banning other admins
    if (targetUser.role === Role.ADMIN) {
      return Response.json(
        { ok: false, code: 'FORBIDDEN', message: 'Cannot ban admin users' },
        { status: 403 }
      )
    }

    // Get admin user from DB
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { id: true },
    })

    if (!adminUser) {
      return Response.json({ ok: false, code: 'USER_NOT_FOUND' }, { status: 404 })
    }

    // Create or update ban
    const expiresAt = validated.expiresAt ? new Date(validated.expiresAt) : null
    await prisma.userBan.upsert({
      where: { userId: validated.userId },
      create: {
        userId: validated.userId,
        reason: validated.reason || null,
        bannedBy: adminUser.id,
        expiresAt,
      },
      update: {
        reason: validated.reason || null,
        bannedBy: adminUser.id,
        expiresAt,
      },
    })

    // Log action
    await logAction('user.ban', adminUser.id, 'user', validated.userId, {
      reason: validated.reason,
      expiresAt: expiresAt?.toISOString(),
    })

    return Response.json({ ok: true, data: { userId: validated.userId } })
  } catch (error: any) {
    if (error.code === 'INSUFFICIENT_ROLE') {
      return Response.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 })
    }
    if (error.name === 'ZodError') {
      return Response.json({ ok: false, code: 'VALIDATION_ERROR', details: error.errors }, { status: 400 })
    }
    console.error('Error banning user:', error)
    return Response.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

