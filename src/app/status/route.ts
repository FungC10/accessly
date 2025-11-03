import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /status
 * Health check endpoint - never throws, always returns JSON
 * Returns status of database, Redis (if configured), and Socket.io
 */
export async function GET() {
  const out: Record<string, unknown> = {
    ok: true,
    timestamp: new Date().toISOString(),
    db: 'unknown',
    redis: 'unknown',
    socketio: 'unknown',
  }

  // Check database - never throw
  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.$queryRaw`SELECT 1`
    out.db = 'up'
  } catch (e) {
    out.db = 'down'
    out.ok = false
  }

  // Check Redis (if configured) - never throw
  try {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      const { default: IORedis } = await import('ioredis')
      const r = new IORedis(redisUrl)
      await r.ping()
      out.redis = 'up'
      r.disconnect()
    } else {
      out.redis = 'not_configured'
    }
  } catch (e) {
    out.redis = 'down'
    // Don't fail overall status for optional Redis
  }

  // Check Socket.io (only available at runtime) - never throw
  try {
    const { getIO } = await import('@/lib/io')
    const io = getIO()
    out.socketio = io ? 'up' : 'down'
  } catch (e) {
    out.socketio = 'down'
    // Don't fail the status check if Socket.io isn't available
  }

  // Always return 200, even if some services are down
  // The `ok` field indicates overall health
  return NextResponse.json(out)
}
