import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GET as GETMetrics } from '@/app/api/dev/metrics/route'
import { GET as GETHealth } from '@/app/api/health/route'
import { incrementAndCheckLimit, RateLimitedError } from '@/lib/rateLimit'
import { metricsStore } from '@/lib/metrics'
import { Role } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  env: {
    REDIS_URL: undefined, // Default to no Redis
  },
}))

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      ping: vi.fn(),
      quit: vi.fn(),
      pipeline: vi.fn(),
    })),
  }
})

const { auth } = await import('@/lib/auth')
const { prisma } = await import('@/lib/prisma')
const { env } = await import('@/lib/env')

describe('OPS: GET /api/dev/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset metrics store
    metricsStore.increment5xxError('test-route')
    metricsStore.increment5xxError('test-route')
    metricsStore.incrementAIFailure()
    metricsStore.incrementSocketConnect()
    metricsStore.incrementSocketDisconnect()
  })

  it('should allow access in development mode without auth', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const response = await GETMetrics()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.error5xxTotal).toBeGreaterThanOrEqual(0)
    expect(data.data.aiFailures).toBeGreaterThanOrEqual(0)
    expect(data.data.socketConnects).toBeGreaterThanOrEqual(0)
    expect(data.data.socketDisconnects).toBeGreaterThanOrEqual(0)
    expect(data.data.timestamp).toBeDefined()

    vi.unstubAllEnvs()
  })

  it('should require admin auth in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    vi.mocked(auth).mockResolvedValue(null as any)

    const response = await GETMetrics()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.ok).toBe(false)
    expect(data.code).toBe('UNAUTHORIZED')

    vi.unstubAllEnvs()
  })

  it('should allow admin user in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const mockSession = {
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
      },
    }

    const mockUser = {
      id: 'admin-1',
      role: Role.ADMIN,
    }

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

    const response = await GETMetrics()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data).toBeDefined()

    vi.unstubAllEnvs()
  })

  it('should reject non-admin user in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const mockSession = {
      user: {
        id: 'user-1',
        email: 'user@test.com',
        role: Role.USER,
      },
    }

    const mockUser = {
      id: 'user-1',
      role: Role.USER,
    }

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

    const response = await GETMetrics()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.ok).toBe(false)
    expect(data.code).toBe('FORBIDDEN')

    vi.unstubAllEnvs()
  })

  it('should return correct metrics structure', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    // Increment some metrics
    metricsStore.increment5xxError('route1')
    metricsStore.increment5xxError('route2')
    metricsStore.incrementAIFailure()

    const response = await GETMetrics()
    const data = await response.json()

    expect(data.data).toMatchObject({
      error5xxTotal: expect.any(Number),
      error5xxByRoute: expect.any(Object),
      aiFailures: expect.any(Number),
      socketConnects: expect.any(Number),
      socketDisconnects: expect.any(Number),
      timestamp: expect.any(String),
      note: expect.any(String),
    })

    vi.unstubAllEnvs()
  })
})

describe('OPS: GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return health status with DB up', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }] as any)

    const response = await GETHealth()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.db).toBe('up')
    expect(data.timestamp).toBeDefined()
  })

  it('should return health status with DB down', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB connection failed'))

    const response = await GETHealth()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.ok).toBe(false)
    expect(data.db).toBe('down')
  })

  it('should return redis not_used when REDIS_URL not configured', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }] as any)
    vi.mocked(env).REDIS_URL = undefined

    const response = await GETHealth()
    const data = await response.json()

    expect(data.redis).toBe('not_used')
  })

  it('should check Redis when REDIS_URL is configured', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }] as any)
    vi.mocked(env).REDIS_URL = 'redis://localhost:6379'

    const Redis = (await import('ioredis')).default
    const mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
      quit: vi.fn().mockResolvedValue('OK'),
    }
    vi.mocked(Redis).mockImplementation(() => mockRedis as any)

    const response = await GETHealth()
    const data = await response.json()

    // Redis check should be attempted
    expect(mockRedis.ping).toHaveBeenCalled()
    expect(mockRedis.quit).toHaveBeenCalled()
  })
})

describe('OPS: Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(env).REDIS_URL = undefined // Use in-memory fallback
  })

  it('should allow requests within limit (in-memory)', async () => {
    const key = 'test-user-1'
    const limit = 5
    const windowMs = 60000 // 1 minute

    // Make 5 requests (within limit)
    for (let i = 0; i < 5; i++) {
      await expect(incrementAndCheckLimit(key, limit, windowMs)).resolves.not.toThrow()
    }
  })

  it('should throw RateLimitedError when limit exceeded (in-memory)', async () => {
    const key = 'test-user-2'
    const limit = 3
    const windowMs = 60000 // 1 minute

    // Make requests up to limit
    for (let i = 0; i < limit; i++) {
      await expect(incrementAndCheckLimit(key, limit, windowMs)).resolves.not.toThrow()
    }

    // Next request should be rate limited
    await expect(incrementAndCheckLimit(key, limit, windowMs)).rejects.toThrow(RateLimitedError)
  })

  it('should reset after window expires (in-memory)', async () => {
    const key = 'test-user-3'
    const limit = 2
    const windowMs = 100 // Very short window (100ms)

    // Exceed limit
    await incrementAndCheckLimit(key, limit, windowMs)
    await incrementAndCheckLimit(key, limit, windowMs)
    await expect(incrementAndCheckLimit(key, limit, windowMs)).rejects.toThrow(RateLimitedError)

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Should be able to make requests again
    await expect(incrementAndCheckLimit(key, limit, windowMs)).resolves.not.toThrow()
  })
})

describe('OPS: Metrics Store', () => {
  beforeEach(() => {
    // Reset metrics by getting current state and clearing
    const metrics = metricsStore.getOperationalMetrics()
    // Note: We can't directly reset, but we can test incrementing
  })

  it('should increment 5xx error counter', () => {
    const initial = metricsStore.getOperationalMetrics().error5xxTotal
    metricsStore.increment5xxError('test-route')
    const after = metricsStore.getOperationalMetrics().error5xxTotal
    expect(after).toBeGreaterThan(initial)
  })

  it('should track 5xx errors by route', () => {
    metricsStore.increment5xxError('route-a')
    metricsStore.increment5xxError('route-a')
    metricsStore.increment5xxError('route-b')

    const metrics = metricsStore.getOperationalMetrics()
    expect(metrics.error5xxByRoute['route-a']).toBeGreaterThanOrEqual(2)
    expect(metrics.error5xxByRoute['route-b']).toBeGreaterThanOrEqual(1)
  })

  it('should increment AI failure counter', () => {
    const initial = metricsStore.getOperationalMetrics().aiFailures
    metricsStore.incrementAIFailure()
    const after = metricsStore.getOperationalMetrics().aiFailures
    expect(after).toBeGreaterThan(initial)
  })

  it('should increment socket connect counter', () => {
    const initial = metricsStore.getOperationalMetrics().socketConnects
    metricsStore.incrementSocketConnect()
    const after = metricsStore.getOperationalMetrics().socketConnects
    expect(after).toBeGreaterThan(initial)
  })

  it('should increment socket disconnect counter', () => {
    const initial = metricsStore.getOperationalMetrics().socketDisconnects
    metricsStore.incrementSocketDisconnect()
    const after = metricsStore.getOperationalMetrics().socketDisconnects
    expect(after).toBeGreaterThan(initial)
  })

  it('should return operational metrics with all fields', () => {
    const metrics = metricsStore.getOperationalMetrics()
    expect(metrics).toMatchObject({
      error5xxTotal: expect.any(Number),
      error5xxByRoute: expect.any(Object),
      aiFailures: expect.any(Number),
      socketConnects: expect.any(Number),
      socketDisconnects: expect.any(Number),
    })
  })
})

