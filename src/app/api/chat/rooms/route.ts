import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RoomInput } from '@/lib/validation'
import { Role } from '@prisma/client'
import { assertRole } from '@/lib/rbac'

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

/**
 * POST /api/chat/rooms
 * Create a new room (admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      }, { status: 401 })
    }

    // Only admins can create rooms
    try {
      assertRole(session, Role.ADMIN)
    } catch (error) {
      return Response.json({
        ok: false,
        code: 'FORBIDDEN',
        message: 'Only admins can create rooms',
      }, { status: 403 })
    }

    const body = await request.json()

    // Validate input
    const validated = RoomInput.safeParse(body)
    if (!validated.success) {
      return Response.json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid room input',
        details: validated.error.errors,
      }, { status: 400 })
    }

    // Check if room name already exists
    const existingRoom = await prisma.room.findUnique({
      where: { name: validated.data.name },
    })

    if (existingRoom) {
      return Response.json({
        ok: false,
        code: 'ROOM_EXISTS',
        message: 'Room with this name already exists',
      }, { status: 409 })
    }

    // Create room
    const room = await prisma.room.create({
      data: {
        name: validated.data.name,
        isPrivate: validated.data.isPrivate,
      },
    })

    // Add creator as owner
    await prisma.roomMember.create({
      data: {
        userId: session.user.id,
        roomId: room.id,
        role: 'OWNER',
      },
    })

    return Response.json({
      ok: true,
      data: {
        room,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating room:', error)
    return Response.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }, { status: 500 })
  }
}

