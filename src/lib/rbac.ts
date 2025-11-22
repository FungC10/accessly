import { Role, RoomRole } from '@prisma/client'
import type { Session } from 'next-auth'

// Role hierarchy – higher number = more power
const ROLE_RANK: Record<RoomRole, number> = {
  MEMBER: 1,
  MODERATOR: 2,
  OWNER: 3,
} as const

/**
 * Check if a role has at least the required role level
 * @param role - User's role
 * @param required - Minimum required role
 * @returns true if role meets or exceeds required level
 */
export function hasRoleOrHigher(
  role: RoomRole | null | undefined,
  required: RoomRole,
): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[required]
}

// Errors used by tests & routes

export class NotMemberError extends Error {
  code = 'NOT_MEMBER' as const

  constructor() {
    super('NOT_MEMBER') // message tests will see
    this.name = 'NotMemberError'
  }
}

export class InsufficientRoleError extends Error {
  code = 'INSUFFICIENT_ROLE' as const
  status = 403 as const

  constructor(message = 'Insufficient role to access this resource') {
    super(message)
    this.name = 'InsufficientRoleError'
  }
}

// Legacy error class for backward compatibility
export class InsufficientMembershipError extends Error {
  code = 'INSUFFICIENT_MEMBERSHIP' as const
  status = 403

  constructor(message = 'Not a member of this room') {
    super(message)
    this.name = 'InsufficientMembershipError'
  }
}

// Legacy error class for backward compatibility
export class InsufficientRoleErrorLegacy extends Error {
  code = 'INSUFFICIENT_ROLE' as const
  status = 403

  constructor(message = 'Insufficient role to access this resource') {
    super(message)
    this.name = 'InsufficientRoleError'
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
 * @param session - Session object from auth() or null
 * @param role - Required role
 * @throws InsufficientRoleError if session doesn't have the required role
 */
export function assertRole(session: Session | null, role: Role): void {
  const userRole = session?.user?.role
  if (!userRole) throw new InsufficientRoleError()

  const order: Role[] = [Role.USER, Role.MODERATOR, Role.ADMIN]
  if (order.indexOf(userRole) < order.indexOf(role)) {
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
 * Check if user has required room role (hierarchical check)
 * @param userId - User ID
 * @param roomId - Room ID
 * @param requiredRole - Minimum required role (hierarchical)
 * @param prisma - Prisma client instance
 * @returns true if user has required role or higher
 */
export async function hasRoomRole(
  userId: string,
  roomId: string,
  requiredRole: RoomRole,
  prisma: any
): Promise<boolean> {
  const membership = await getMembership(userId, roomId, prisma)
  if (!membership) return false
  return hasRoleOrHigher(membership.role, requiredRole)
}

/**
 * Assert that a membership exists and that it meets the minimum role.
 * - If no membership: throws NotMemberError ("NOT_MEMBER")
 * - If role too low: throws InsufficientRoleError ("INSUFFICIENT_ROLE")
 * - Otherwise returns membership (so you can keep using it)
 */
export async function assertMembership(
  userId: string,
  roomId: string,
  prisma: any,
  minRole: RoomRole = RoomRole.MEMBER
): Promise<{ role: RoomRole }> {
  const membership = await getMembership(userId, roomId, prisma)
  
  if (!membership) {
    throw new NotMemberError()
  }

  if (!hasRoleOrHigher(membership.role, minRole)) {
    throw new InsufficientRoleError()
  }

  return membership
}

/**
 * Assert that user has required room role (for backward compatibility with array-based checks)
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
  const membership = await getMembership(userId, roomId, prisma)
  
  if (!membership) {
    const error = new InsufficientMembershipError('Not a member of this room')
    throw error
  }

  // Check if user has any of the required roles (hierarchical)
  // Find the minimum required role from the array
  const minRequiredRole = requiredRoles.reduce((min, role) => {
    return ROLE_RANK[role] < ROLE_RANK[min] ? role : min
  }, requiredRoles[0])

  // Check if user's role meets or exceeds the minimum
  if (!hasRoleOrHigher(membership.role, minRequiredRole)) {
    const error = new InsufficientMembershipError('Insufficient room role')
    throw error
  }
}
