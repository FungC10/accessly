import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/rooms
 * List rooms that the user is a member of
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

    // Fetch rooms where user is a member
    const memberships = await prisma.roomMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            isPrivate: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        room: {
          createdAt: 'asc',
        },
      },
    })

    const rooms = memberships.map((m) => m.room)

    return Response.json({
      ok: true,
      data: {
        rooms,
      },
    })
  } catch (error: any) {
    console.error('Error fetching rooms:', error)
    return Response.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }, { status: 500 })
  }
}

