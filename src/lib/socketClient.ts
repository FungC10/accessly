/**
 * Global socket client singleton
 * Ensures exactly ONE socket instance per user for the entire app
 */

import { initSocket } from './socket'

let socket: ReturnType<typeof initSocket> | null = null

/**
 * Get the global socket instance
 * Creates it if it doesn't exist
 * @param userId - Current user ID
 */
export function getSocket(userId: string) {
  if (!socket) {
    socket = initSocket(userId)
  }
  return socket
}
