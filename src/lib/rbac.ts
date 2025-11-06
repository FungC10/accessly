import { Role, RoomRole } from '@prisma/client'
import type { Session } from 'next-auth'

export class InsufficientRoleError extends Error {
  code = 'INSUFFICIENT_ROLE'
  status = 403

  constructor(message = 'Insufficient role to access this resource') {
    super(message)
    this.name = 'InsufficientRoleError'
  }
}

export class InsufficientMembershipError extends Error {
  code = 'INSUFFICIENT_MEMBERSHIP'
  status = 403

  constructor(message = 'Not a member of this room') {
    super(message)
    this.name = 'InsufficientMembershipError'
  }
}

/**
 * Check if session has the required role
 * @param session - Session object from auth()
 * @param role - Required role
 * @returns true if session has the required role
 */
export function hasRole(session: Session, role: Role): boolean {
  if (!session?.user?.role) {
    return false
  }

  // ADMIN has access to everything
  if (session.user.role === Role.ADMIN) {
    return true
  }

  return session.user.role === role
}

/**
 * Assert that session has the required role, throw 403 if not
 * @param session - Session object from auth()
 * @param role - Required role
 * @throws InsufficientRoleError if session doesn't have the required role
 */
export function assertRole(session: Session, role: Role): void {
  if (!hasRole(session, role)) {
    throw new InsufficientRoleError()
  }
}

/**
 * Check if user is a member of a room
 * @param userId - User ID
 * @param roomId - Room ID
 * @param prisma - Prisma client instance
 * @returns Membership object or null
 */
export async function getMembership(
  userId: string,
  roomId: string,
  prisma: any
): Promise<{ role: RoomRole } | null> {
  const membership = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId,
      },
    },
    select: {
      role: true,
    },
  })

  return membership
}

/**
 * Check if user has required room role (OWNER, MODERATOR, or MEMBER)
 * @param userId - User ID
 * @param roomId - Room ID
 * @param requiredRoles - Array of required roles (default: [OWNER, MODERATOR])
 * @param prisma - Prisma client instance
 * @returns true if user has required role
 */
export async function hasRoomRole(
  userId: string,
  roomId: string,
  requiredRoles: RoomRole[] = [RoomRole.OWNER, RoomRole.MODERATOR],
  prisma: any
): Promise<boolean> {
  const membership = await getMembership(userId, roomId, prisma)
  if (!membership) return false
  return requiredRoles.includes(membership.role)
}

/**
 * Assert that user is a member of the room
 * @param userId - User ID
 * @param roomId - Room ID
 * @param prisma - Prisma client instance
 * @throws InsufficientMembershipError if user is not a member
 */
export async function assertMembership(
  userId: string,
  roomId: string,
  prisma: any
): Promise<void> {
  const membership = await getMembership(userId, roomId, prisma)
  if (!membership) {
    throw new InsufficientMembershipError()
  }
}

/**
 * Assert that user has required room role
 * @param userId - User ID
 * @param roomId - Room ID
 * @param requiredRoles - Array of required roles
 * @param prisma - Prisma client instance
 * @throws InsufficientMembershipError if user doesn't have required role
 */
export async function assertRoomRole(
  userId: string,
  roomId: string,
  requiredRoles: RoomRole[],
  prisma: any
): Promise<void> {
  const hasRole = await hasRoomRole(userId, roomId, requiredRoles, prisma)
  if (!hasRole) {
    throw new InsufficientMembershipError('Insufficient room role')
  }
}