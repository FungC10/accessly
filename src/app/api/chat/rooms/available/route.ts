import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RoomType } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/rooms/available
 * List all public rooms that user isn't a member of yet
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

    // Verify the user exists in DB and get their actual ID
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { id: true, email: true },
    })

    if (!dbUser) {
      console.error('GET /api/chat/rooms/available - User not found in database:', session.user.email)
      return Response.json({
        ok: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found in database',
      }, { status: 404 })
    }

    // Use DB user ID (source of truth)
    const userId = dbUser.id
    const sessionIdMatches = session.user.id === dbUser.id

    if (!sessionIdMatches) {
      console.warn('⚠️ Session user ID does not match DB user ID! Using DB ID.', {
        sessionId: session.user.id,
        dbId: dbUser.id,
      })
    }

    // Get rooms user is already a member of (use DB user ID)
    const userMemberships = await prisma.roomMember.findMany({
      where: { userId: userId }, // Use DB user ID
      select: { roomId: true },
    })
    const userRoomIds = userMemberships.map((m) => m.roomId)
    
    console.log('GET /api/chat/rooms/available - User memberships:', {
      userId,
      roomIds: userRoomIds,
      count: userRoomIds.length,
    })

    // Fetch all public rooms (using new type field)
    const allRooms = await prisma.room.findMany({
      where: {
        type: RoomType.PUBLIC, // Use new type field instead of isPrivate
      },
      select: {
        id: true,
        name: true,
        title: true,
        description: true,
        tags: true,
        type: true,
        isPrivate: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Filter out rooms user is already a member of
    const availableRooms = allRooms.filter((room) => !userRoomIds.includes(room.id))

    return Response.json({
      ok: true,
      code: 'SUCCESS',
      message: 'Available rooms retrieved successfully',
      data: {
        rooms: availableRooms,
      },
    })
  } catch (error: any) {
    console.error('Error fetching available rooms:', error)
    return Response.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }, { status: 500 })
  }
}

