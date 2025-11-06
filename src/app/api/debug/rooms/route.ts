import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/rooms
 * Raw diagnostic endpoint - shows exactly what the API returns
 */
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return Response.json({
        ok: false,
        message: 'No session',
        debug: {
          hasSession: false,
        },
      })
    }

    // Get user from DB
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!dbUser) {
      return Response.json({
        ok: false,
        message: 'User not found in database',
        debug: {
          sessionEmail: session.user.email,
          sessionUserId: session.user.id,
          dbUser: null,
        },
      })
    }

    // Get memberships
    const memberships = await prisma.roomMember.findMany({
      where: { userId: dbUser.id },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            title: true,
            type: true,
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
          },
        },
      },
    })

    return Response.json({
      ok: true,
      message: 'Raw room data',
      debug: {
        session: {
          email: session.user.email,
          userId: session.user.id,
        },
        dbUser: {
          id: dbUser.id,
          email: dbUser.email,
        },
        idMatch: session.user.id === dbUser.id,
        membershipCount: memberships.length,
      },
      rooms: memberships.map((m) => ({
        id: m.room.id,
        name: m.room.name,
        title: m.room.title,
        type: m.room.type,
        messages: m.room._count.messages,
        members: m.room._count.members,
        role: m.role,
      })),
      raw: {
        memberships,
      },
    })
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}

