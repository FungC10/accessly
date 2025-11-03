/**
 * Socket.io server singleton
 * For Next.js App Router, this initializes a singleton that persists across requests
 * 
 * NOTE: This approach works for single-instance deployments.
 * For multi-instance/production, use Redis adapter for Socket.io
 */

import { Server as SocketIOServer } from 'socket.io'

// Global singleton for the Socket.io server
let io: SocketIOServer | null = null

/**
 * Initialize Socket.io server
 * Creates a singleton instance that can be reused
 */
export function initializeSocketIO(): SocketIOServer {
  if (io) {
    return io
  }

  // For Next.js App Router, we create a standalone server
  // In production with multiple instances, you'd use Redis adapter
  io = new SocketIOServer({
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)

    // Handle room join
    socket.on('room:join', async (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data
      socket.data.userId = userId
      socket.join(roomId)

      // Broadcast user online to others in the room
      socket.to(roomId).emit('user:online', { userId, socketId: socket.id })

      // Send list of current room members to the joining user
      const socketsInRoom = await io!.in(roomId).fetchSockets()
      const userIds = socketsInRoom
        .map((s) => s.data.userId)
        .filter((id): id is string => !!id && id !== userId)

      socket.emit('room:members', userIds)

      console.log(`User ${userId} joined room ${roomId}`)
    })

    // Handle room leave
    socket.on('room:leave', async (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data
      socket.leave(roomId)

      // Broadcast user offline
      socket.to(roomId).emit('user:offline', { userId })

      console.log(`User ${userId} left room ${roomId}`)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id)
    })
  })

  return io
}

/**
 * Get the Socket.io server instance
 * Initializes if not already created
 */
export function getSocketIO(): SocketIOServer | null {
  if (!io) {
    initializeSocketIO()
  }
  return io
}