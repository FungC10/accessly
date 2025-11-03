import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MessageInput } from '@/lib/validation'
import { checkRate as rateLimitCheck } from '@/lib/rateLimit'
import { redirect } from 'next/navigation'
import { getSocketIO } from '@/lib/socket-server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('roomId')
  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  if (!roomId) {
    return Response.json({ error: 'roomId is required' }, { status: 400 })
  }

  // Check if user is member of the room
  const membership = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId: session.user.id,
        roomId,
      },
    },
  })

  if (!membership) {
    return Response.json({ error: 'Not a member of this room' }, { status: 403 })
  }

  const messages = await prisma.message.findMany({
    where: {
      roomId,
      ...(cursor && {
        id: {
          lt: cursor,
        },
      }),
    },
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  })

  return Response.json({ messages: messages.reverse() })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = MessageInput.parse(body)

    // Rate limiting
    try {
      rateLimitCheck(session.user.id)
    } catch (error: any) {
      if (error.code === 'RATE_LIMITED') {
        return Response.json({ error: error.message, code: error.code }, { status: 429 })
      }
      throw error
    }

    // Check if user is member of the room
    const membership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId: validated.roomId,
        },
      },
    })

    if (!membership) {
      return Response.json({ error: 'Not a member of this room' }, { status: 403 })
    }

    // Persist message to database
    const message = await prisma.message.create({
      data: {
        roomId: validated.roomId,
        userId: session.user.id,
        content: validated.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Emit Socket.io event to room
    const io = getSocketIO()
    if (io) {
      io.to(validated.roomId).emit('message:new', {
        id: message.id,
        roomId: message.roomId,
        userId: message.userId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        user: message.user,
      })
    }

    return Response.json({ message }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return Response.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating message:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}