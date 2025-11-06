import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/session
 * Debug endpoint to check session, user membership, and database connection
 */
export async function GET() {
  try {
    const session = await auth()
    
    // Extract database host/port from DATABASE_URL (without credentials)
    const dbUrl = env.DATABASE_URL
    const dbInfo = dbUrl ? (() => {
      try {
        const url = new URL(dbUrl)
        return {
          host: url.hostname,
          port: url.port || '5432',
          database: url.pathname.slice(1),
          // Don't expose credentials
        }
      } catch {
        return { raw: 'Invalid URL' }
      }
    })() : null

    if (!session?.user) {
      return Response.json({
        ok: false,
        message: 'No session',
        database: {
          connected: true, // We got here, so Prisma is working
          url: dbInfo,
        },
      })
    }

    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    // Check memberships
    const memberships = dbUser
      ? await prisma.roomMember.findMany({
          where: { userId: dbUser.id },
          include: {
            room: {
              select: {
                id: true,
                name: true,
                title: true,
                type: true,
              },
            },
          },
        })
      : []

    // Check if session user ID matches DB user ID
    const sessionIdMatches = session.user.id === dbUser?.id

    // Get total counts for comparison
    const totalRooms = await prisma.room.count()
    const totalUsers = await prisma.user.count()
    const totalMemberships = await prisma.roomMember.count()
    const userMemberships = dbUser
      ? await prisma.roomMember.count({ where: { userId: dbUser.id } })
      : 0

    return Response.json({
      ok: true,
      session: {
        user: session.user,
        userId: session.user.id,
        userEmail: session.user.email,
      },
      dbUser: dbUser || null,
      sessionIdMatches: sessionIdMatches,
      memberships: {
        count: memberships.length,
        userMemberships,
        totalMemberships,
      },
      rooms: memberships.map((m) => ({
        id: m.room.id,
        name: m.room.name,
        title: m.room.title,
        type: m.room.type,
      })),
      database: {
        connected: true,
        url: dbInfo,
        totals: {
          rooms: totalRooms,
          users: totalUsers,
          memberships: totalMemberships,
        },
      },
      diagnosis: {
        hasSession: !!session?.user,
        hasDbUser: !!dbUser,
        idMatches: sessionIdMatches,
        hasMemberships: memberships.length > 0,
        expectedMemberships: dbUser ? '3-5 (for demo seed)' : 'N/A',
      },
    })
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: error.message,
      stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
}

