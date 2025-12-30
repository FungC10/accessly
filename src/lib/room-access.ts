import { prisma } from './prisma'
import { Role, RoomType } from '@prisma/client'

/**
 * Get accessible room IDs for a user based on homepage visibility rules
 * This matches the exact logic used in src/app/page.tsx
 * 
 * Rules:
 * - PRIVATE rooms: only if user is a member
 * - PUBLIC rooms:
 *   * Admins see all PUBLIC rooms
 *   * Non-admins see only PUBLIC rooms matching their department or PUBLIC_GLOBAL
 * 
 * @param userId - User ID
 * @param userRole - User role (ADMIN or USER)
 * @param userDepartment - User department (or null)
 * @returns Array of accessible room IDs
 */
export async function getAccessibleRoomIds(
  userId: string,
  userRole: Role,
  userDepartment: string | null
): Promise<string[]> {
  const isAdmin = userRole === Role.ADMIN

  // Get rooms user is a member of (PUBLIC and PRIVATE)
  const myMemberships = await prisma.roomMember.findMany({
    where: {
      userId,
      room: {
        type: { in: [RoomType.PUBLIC, RoomType.PRIVATE] },
      },
    },
    include: {
      room: {
        select: {
          id: true,
          type: true,
          department: true,
        },
      },
    },
  })

  // Filter memberships by department rules (for PUBLIC rooms)
  const accessibleFromMemberships = myMemberships
    .filter((m) => {
      if (m.room.type === RoomType.PRIVATE) {
        // PRIVATE rooms: only if user is a member (already in memberships)
        return true
      }
      if (m.room.type === RoomType.PUBLIC) {
        if (isAdmin) {
          // Admins see all PUBLIC rooms
          return true
        }
        // Non-admins: only see PUBLIC rooms matching their department or PUBLIC_GLOBAL
        return m.room.department === userDepartment || m.room.department === null
      }
      return false
    })
    .map((m) => m.room.id)

  const memberRoomIds = new Set(accessibleFromMemberships)

  // For non-admins: also include PUBLIC rooms matching their department that they're not members of
  // For admins: also include all PUBLIC rooms they're not members of
  // PRIVATE rooms are NOT included here (invite-only)
  const additionalRooms = await prisma.room.findMany({
    where: {
      type: RoomType.PUBLIC,
      isPrivate: false,
      // Exclude rooms user is already a member of
      id: {
        notIn: Array.from(memberRoomIds),
      },
      // For admins: show all PUBLIC rooms
      // For non-admins: only show rooms matching their department or PUBLIC_GLOBAL
      ...(isAdmin
        ? {}
        : {
            OR: [
              { department: userDepartment as any }, // User's department
              { department: null }, // PUBLIC_GLOBAL
            ] as any,
          }),
    } as any,
    select: { id: true },
  })

  const additionalRoomIds = additionalRooms.map((r) => r.id)

  // Combine both sets
  return [...accessibleFromMemberships, ...additionalRoomIds]
}

