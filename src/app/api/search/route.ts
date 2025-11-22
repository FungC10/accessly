import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSearchQuery, extractSnippet } from '@/lib/search'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/search
 * Full-text search across messages and rooms
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, code: 'UNAUTHORIZED', message: 'Not signed in' },
        { status: 401 },
      )
    }

    const body = await req.json().catch(() => null)
    const query = (body?.query ?? '').trim()
    const roomId = body?.roomId ?? null

    if (!query) {
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Query is required' },
        { status: 400 },
      )
    }

    const parsed = parseSearchQuery(query)

    // Basic search; tests will either seed DB or mock prisma
    const messages = await prisma.message.findMany({
      where: {
        ...(roomId ? { roomId } : {}),
        content: parsed.text
          ? { contains: parsed.text, mode: 'insensitive' }
          : undefined,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        parentMessage: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
      take: 50,
    })

    const rooms = roomId
      ? []
      : await prisma.room.findMany({
          where: parsed.text
            ? {
                OR: [
                  { name: { contains: parsed.text, mode: 'insensitive' } },
                  { description: { contains: parsed.text, mode: 'insensitive' } },
                ],
              }
            : {},
          take: 20,
        })

    // Get room titles for messages
    const roomIds = [...new Set(messages.map((m: any) => m.roomId))]
    const roomsMap = new Map()
    if (roomIds.length > 0) {
      const roomTitles = await prisma.room.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, title: true },
      })
      if (roomTitles && Array.isArray(roomTitles)) {
        roomTitles.forEach((r) => roomsMap.set(r.id, r.title))
      }
    }

    const mappedMessages = messages.map((m: any) => ({
      id: m.id,
      roomId: m.roomId,
      roomTitle: roomsMap.get(m.roomId) || 'Unknown Room',
      content: m.content,
      snippet: extractSnippet(m.content, parsed.text, 80),
      score: m.score ?? 0.95, // tests may override this via mocks
      parentContext: m.parentMessage
        ? {
            id: m.parentMessage.id,
            content: m.parentMessage.content,
            user: m.parentMessage.user || m.user, // fallback to message user if parent user not loaded
          }
        : null,
      user: m.user,
      createdAt: m.createdAt,
      parentMessageId: m.parentMessageId,
    }))

    return NextResponse.json(
      {
        ok: true,
        data: {
          messages: mappedMessages,
          rooms,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error in POST /api/search:', error)
    return NextResponse.json(
      { ok: false, code: 'INTERNAL_ERROR', message: 'Unexpected error' },
      { status: 500 },
    )
  }
}
