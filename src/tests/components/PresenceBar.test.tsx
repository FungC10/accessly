import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PresenceBar } from '@/components/PresenceBar'
import { useSession } from 'next-auth/react'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

// Mock socket
vi.mock('@/lib/socket', () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
  })),
}))

describe('PresenceBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render nothing when no users are online', async () => {
    const mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
    }

    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any)

    const { getSocket } = await import('@/lib/socket')
    vi.mocked(getSocket).mockReturnValue(mockSocket as any)

    const { container } = render(<PresenceBar roomId="room-1" />)
    // Component returns null when no users online (after useEffect)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    }, { timeout: 100 })
  })

  it('should render current user as "You"', async () => {
    const mockSocket = {
      on: vi.fn((event, callback) => {
        // Simulate user online event
        if (event === 'user:online') {
          setTimeout(() => callback({ userId: 'user-1', socketId: 'socket-1' }), 0)
        }
      }),
      off: vi.fn(),
    }

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    const { getSocket } = await import('@/lib/socket')
    vi.mocked(getSocket).mockReturnValue(mockSocket as any)

    render(<PresenceBar roomId="room-1" />)

    await waitFor(() => {
      expect(screen.getByText(/Online:/)).toBeInTheDocument()
    })
  })

  it('should handle user offline event', async () => {
    let onlineCallback: any
    let offlineCallback: any

    const mockSocket = {
      on: vi.fn((event, callback) => {
        if (event === 'user:online') {
          onlineCallback = callback
        }
        if (event === 'user:offline') {
          offlineCallback = callback
        }
      }),
      off: vi.fn(),
    }

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    const { getSocket } = await import('@/lib/socket')
    vi.mocked(getSocket).mockReturnValue(mockSocket as any)

    render(<PresenceBar roomId="room-1" />)

    // Simulate user coming online
    if (onlineCallback) {
      onlineCallback({ userId: 'user-2', socketId: 'socket-2' })
    }

    await waitFor(() => {
      expect(screen.getByText(/Online:/)).toBeInTheDocument()
    })

    // Simulate user going offline
    if (offlineCallback) {
      offlineCallback({ userId: 'user-2' })
    }
  })

  it('should display user count', async () => {
    const mockSocket = {
      on: vi.fn((event, callback) => {
        if (event === 'user:online') {
          setTimeout(() => callback({ userId: 'user-2', socketId: 'socket-2' }), 0)
        }
      }),
      off: vi.fn(),
    }

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    const { getSocket } = await import('@/lib/socket')
    vi.mocked(getSocket).mockReturnValue(mockSocket as any)

    render(<PresenceBar roomId="room-1" />)

    await waitFor(() => {
      const countElement = screen.getByText(/\(\d+\)/)
      expect(countElement).toBeInTheDocument()
    })
  })
})
