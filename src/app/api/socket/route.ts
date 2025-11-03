/**
 * Socket.io route handler
 * This endpoint is used by Socket.io client to connect
 * The actual Socket.io server is initialized in socket-server.ts
 */

export const runtime = 'nodejs'

// Initialize Socket.io on module load
import { initializeSocketIO } from '@/lib/socket-server'

// Initialize the server when this module loads
initializeSocketIO()

export async function GET() {
  return new Response('Socket.io endpoint', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}

export async function POST() {
  return new Response('Socket.io endpoint', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}