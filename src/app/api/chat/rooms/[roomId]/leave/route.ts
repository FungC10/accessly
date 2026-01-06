import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RoomRole } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/chat/rooms/[roomId]/leave
 * Leave a room (cannot leave if you're the only OWNER with members)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      }, { status: 401 })
    }

    const { roomId } = await params

    // Verify the user exists in DB and get their role
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { id: true, role: true },
    })

    if (!dbUser) {
      return Response.json({
        ok: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found in database',
      }, { status: 404 })
    }

    // Check if user is DEMO_OBSERVER (read-only)
    if (dbUser.role === 'DEMO_OBSERVER') {
      return Response.json({
        ok: false,
        code: 'DEMO_MODE',
        message: 'Demo mode: This action is disabled',
      }, { status: 403 })
    }

    const userId = dbUser.id

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            roomId: true,
            role: true,
          },
        },
      },
    })

    if (!room) {
      return Response.json({
        ok: false,
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      }, { status: 404 })
    }

    const membership = room.members.find((m) => m.userId === userId)

    // Not a member → 403
    if (!membership) {
      return Response.json({
        ok: false,
        code: 'NOT_MEMBER',
        message: 'Not a member of this room',
      }, { status: 403 })
    }

    // Owner cannot leave if they are the only owner and others exist
    if (membership.role === RoomRole.OWNER) {
      const ownerCount = room.members.filter(
        (m) => m.role === RoomRole.OWNER,
      ).length

      const otherMembersExist = room.members.some(
        (m) => m.userId !== userId,
      )

      if (ownerCount === 1 && otherMembersExist) {
        return Response.json({
          ok: false,
          code: 'CANNOT_LEAVE',
          message: 'Cannot leave room: you are the only owner with other members. Transfer ownership or remove members first.',
        }, { status: 400 })
      }
    }

    // Leave successfully
    await prisma.roomMember.delete({
      where: {
        id: membership.id,
      },
    })

    return Response.json({
      ok: true,
      code: 'LEFT',
      message: 'Successfully left room',
      data: {
        room: {
          id: room.id,
          name: room.name,
          title: room.title,
        },
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error leaving room:', error)
    return Response.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }, { status: 500 })
  }
}
