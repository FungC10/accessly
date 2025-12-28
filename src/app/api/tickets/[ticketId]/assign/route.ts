import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, RoomRole } from '@prisma/client'
import { logAction } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/tickets/[ticketId]/assign
 * Assign ticket to a user (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
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

    const { ticketId } = await params
    const body = await request.json()
    const { assignToUserId } = body

    // assignToUserId can be null to unassign (make issue unassigned)
    // If provided, must be a valid user ID

    // Verify ticket exists and is a TICKET type
    const ticket = await prisma.room.findUnique({
      where: { id: ticketId },
      select: { type: true, title: true },
    })

    if (!ticket || ticket.type !== 'TICKET') {
      return Response.json({
        ok: false,
        code: 'NOT_FOUND',
        message: 'Ticket not found',
      }, { status: 404 })
    }

    // If assigning (not unassigning), verify assignee exists
    let assignee: { id: string; name: string | null; email: string } | null = null
    if (assignToUserId) {
      assignee = await prisma.user.findUnique({
        where: { id: assignToUserId },
        select: { id: true, name: true, email: true },
      })

      if (!assignee) {
        return Response.json({
          ok: false,
          code: 'INVALID_ASSIGNEE',
          message: 'Assignee not found',
        }, { status: 400 })
      }
    }

    // Get current assignee (OWNER) and check if new assignee is already a member
    const [currentAssignee, existingMember] = await Promise.all([
      prisma.roomMember.findFirst({
        where: {
          roomId: ticketId,
          role: RoomRole.OWNER,
        },
      }),
      assignToUserId ? prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: assignToUserId,
            roomId: ticketId,
          },
        },
      }) : Promise.resolve(null),
    ])

    // Prevent assigning to the current assignee (no-op case)
    if (assignToUserId && currentAssignee && currentAssignee.userId === assignToUserId) {
      return Response.json({
        ok: true,
        data: {
          ticketId,
          assignedTo: assignee ? {
            id: assignee.id,
            name: assignee.name,
            email: assignee.email,
          } : null,
        },
      })
    }

    // Perform assignment/unassignment in a transaction
    await prisma.$transaction(async (tx) => {
      // Step 1: Remove current assignee (demote OWNER to MODERATOR, or remove if not needed)
      if (currentAssignee) {
        // If current assignee is not being reassigned to, demote to MODERATOR
        // This allows them to continue participating
        if (!assignToUserId || currentAssignee.userId !== assignToUserId) {
          await tx.roomMember.update({
            where: { id: currentAssignee.id },
            data: { role: RoomRole.MODERATOR },
          })
        }
      }

      // Step 2: Ensure no other OWNERs exist (safety check)
      if (assignToUserId) {
        await tx.roomMember.updateMany({
          where: {
            roomId: ticketId,
            role: RoomRole.OWNER,
            userId: { not: assignToUserId },
          },
          data: { role: RoomRole.MODERATOR },
        })
      } else {
        // Unassigning: remove all OWNERs
        await tx.roomMember.updateMany({
          where: {
            roomId: ticketId,
            role: RoomRole.OWNER,
          },
          data: { role: RoomRole.MODERATOR },
        })
      }

      // Step 3: Assign new assignee (if provided)
      if (assignToUserId && assignee) {
        if (existingMember) {
          // Update existing member to OWNER (assignee)
          await tx.roomMember.update({
            where: { id: existingMember.id },
            data: { role: RoomRole.OWNER },
          })
        } else {
          // Create new membership as OWNER (assignee)
          await tx.roomMember.create({
            data: {
              userId: assignToUserId,
              roomId: ticketId,
              role: RoomRole.OWNER,
            },
          })
        }
      }
    })

    // Log audit action
    await logAction('ticket.assign', dbUser.id, 'room', ticketId, {
      assignedToUserId: assignee?.id || null,
      assignedToName: assignee?.name || assignee?.email || null,
      ticketTitle: ticket.title,
      previousAssigneeId: currentAssignee?.userId || null,
      action: assignToUserId ? 'assigned' : 'unassigned',
    })

    return Response.json({
      ok: true,
      data: {
        ticketId,
        assignedTo: assignee ? {
          id: assignee.id,
          name: assignee.name,
          email: assignee.email,
        } : null,
      },
    })
  } catch (error: any) {
    console.error('Error assigning ticket:', error)
    return Response.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }, { status: 500 })
  }
}

