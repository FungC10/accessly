import { Role } from '@prisma/client'
import type { Session } from 'next-auth'

export class InsufficientRoleError extends Error {
  code = 'INSUFFICIENT_ROLE'
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
 * @param session - Session object from auth()
 * @param role - Required role
 * @throws InsufficientRoleError if session doesn't have the required role
 */
export function assertRole(session: Session, role: Role): void {
  if (!hasRole(session, role)) {
    throw new InsufficientRoleError()
  }
}