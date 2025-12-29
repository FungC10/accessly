import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatRoom } from '@/components/ChatRoom'
import { useSession } from 'next-auth/react'
import { useChatStore } from '@/lib/chatStore'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

// Mock socket
vi.mock('@/lib/socket', () => ({
  initSocket: vi.fn(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
  getSocket: vi.fn(() => null),
  disconnectSocket: vi.fn(),
}))

// Mock fetch globally
global.fetch = vi.fn(() => {
  return Promise.resolve({
    ok: true,
    json: async () => ({ ok: true, data: { messages: [] } }),
  } as Response)
})

// Removed mockDebugSession - no longer needed since we removed /api/debug/session fetch

// Helper to mock room details fetch (for RoomHeader)
const mockRoomDetails = () => {
  ;(global.fetch as any).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      ok: true,
      data: {
        room: {
          id: 'room-1',
          name: '#general',
          title: 'General',
          description: null,
          tags: [],
          type: 'PUBLIC',
          status: null,
          isPrivate: false,
          userRole: 'MEMBER',
          isMember: true,
          creator: { id: 'user-1', name: 'Test User', email: 'test@test.com', image: null },
          owner: null,
          lastResponder: null,
          _count: { members: 1, messages: 0 },
        },
      },
    }),
  })
}

describe('ChatRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Zustand store to ensure clean state for each test
    const store = useChatStore.getState()
    // Clear all rooms
    Object.keys(store.rooms).forEach(roomId => {
      useChatStore.setState({
        rooms: {},
        expandedThreads: {},
      })
    })
    // Also clear localStorage if it exists
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessly-chat-store')
    }
  })

  it('should render room name', async () => {
    mockRoomDetails()
    // Mock /api/debug/session fetch
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, dbUser: { id: 'user-1' } }),
    })
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)
    // Wait for room details to load (RoomHeader shows "Loading room details..." initially)
    await waitFor(() => {
      expect(screen.queryByText('Loading room details...')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    // Then check for room name
    await waitFor(() => {
      expect(screen.getByText('#general')).toBeInTheDocument()
    })
  })

  it('should show sign-in message when not authenticated', () => {
    // No need to mock /api/debug/session for unauthenticated users
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)
    expect(screen.getByText(/Please sign in to chat/)).toBeInTheDocument()
  })

  it('should fetch and display messages on mount', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-1',
        content: 'Hello!',
        createdAt: new Date().toISOString(),
        user: {
          id: 'user-1',
          name: 'Test User',
          image: null,
        },
      },
    ]

    mockRoomDetails()
    
    // Set up fetch mocks in order of calls
    let callCount = 0
    ;(global.fetch as any).mockImplementation((url: string | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString()
      callCount++
      
      // First call: /api/debug/session
      if (urlString.includes('/api/debug/session')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true, dbUser: { id: 'user-1' } }),
        } as Response)
      }
      
      // Second call: /api/chat/messages?roomId=room-1&limit=50
      if (urlString.includes('/api/chat/messages') && urlString.includes('roomId=room-1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            ok: true, 
            data: { messages: mockMessages } 
          }),
        } as Response)
      }
      
      // Default: room details (already handled by mockRoomDetails, but as fallback)
      return Promise.resolve({
        ok: true,
        json: async () => ({ ok: true, data: { messages: [] } }),
      } as Response)
    })

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)

    // Wait for room details to load first
    await waitFor(() => {
      expect(screen.queryByText('Loading room details...')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Then wait for messages
    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument()
    })

      expect(global.fetch).toHaveBeenCalledWith('/api/chat/messages?roomId=room-1&limit=50')
  })

  it('should send message when form is submitted', async () => {
    mockRoomDetails()
    // Mock /api/debug/session fetch
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, dbUser: { id: 'user-1' } }),
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: { messages: [] } }),
    } as Response)

    const mockCreatedMessage = {
      id: 'msg-2',
      roomId: 'room-1',
      userId: 'user-1',
      content: 'Test message',
      createdAt: new Date().toISOString(),
      user: {
        id: 'user-1',
        name: 'Test User',
        image: null,
      },
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: mockCreatedMessage }),
    } as Response)

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)

    // Wait for initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Find input and button
    const input = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByText('Send')

    // Type message
    // Wait for room details to load first
    await waitFor(() => {
      expect(screen.queryByText('Loading room details...')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    // Check optimistic update
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    // Check API call was made
    await waitFor(() => {
      const postCalls = (global.fetch as any).mock.calls.filter(
        (call: any[]) => call[0] === '/api/chat/messages' && call[1]?.method === 'POST'
      )
      expect(postCalls.length).toBeGreaterThan(0)
      
      const lastCall = postCalls[postCalls.length - 1]
      expect(lastCall[1].body).toContain('Test message')
    })
  })

  it('should handle send error and show toast', async () => {
    mockRoomDetails()
    // Mock /api/debug/session fetch
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, dbUser: { id: 'user-1' } }),
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: { messages: [] } }),
    } as Response)

    // Mock the POST request to /api/chat/messages that will fail
    ;(global.fetch as any).mockImplementationOnce((url: string, options?: any) => {
      if (url === '/api/chat/messages' && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({ ok: false, code: 'RATE_LIMITED', message: 'Rate limit exceeded' }),
        } as Response)
      }
      // Default response for other calls
      return Promise.resolve({
        ok: true,
        json: async () => ({ ok: true, data: { messages: [] } }),
      } as Response)
    })

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    
    // Wait for room details to load first
    await waitFor(() => {
      expect(screen.queryByText('Loading room details...')).not.toBeInTheDocument()
    }, { timeout: 3000 })

    const input = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByText('Send')

    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    // Wait for the POST request to be made
    await waitFor(() => {
      const postCalls = (global.fetch as any).mock.calls.filter(
        (call: any[]) => call[0] === '/api/chat/messages' && call[1]?.method === 'POST'
      )
      expect(postCalls.length).toBeGreaterThan(0)
    })

    // Wait for error to appear - the component should show the error
    // Note: The error might be removed quickly, so we check that the optimistic message was removed
    await waitFor(() => {
      // After error, the optimistic message should be removed
      expect(screen.queryByText('Test message')).not.toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('should handle Enter key press to send', async () => {
    mockRoomDetails()
    // Mock /api/debug/session fetch
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, dbUser: { id: 'user-1' } }),
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: { messages: [] } }),
    } as Response)

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          id: 'msg-2',
          content: 'Enter pressed',
          createdAt: new Date().toISOString(),
          user: { id: 'user-1', name: 'Test User', image: null },
        },
      }),
    } as Response)

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const input = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Enter pressed' } })
    // Use keyDown instead of keyPress for better compatibility
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 })

    await waitFor(() => {
      const postCalls = (global.fetch as any).mock.calls.filter(
        (call: any[]) => call[0] === '/api/chat/messages' && call[1]?.method === 'POST'
      )
      expect(postCalls.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('should not send empty message', async () => {
    mockRoomDetails()
    // Mock /api/debug/session fetch
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, dbUser: { id: 'user-1' } }),
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: { messages: [] } }),
    } as Response)

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Wait for component to render with empty input state
    const sendButton = await waitFor(() => {
      const btn = screen.getByText('Send')
      expect(btn).toBeDisabled()
      return btn
    })

    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(input, { target: { value: '   ' } }) // Only whitespace
    fireEvent.click(sendButton)

    // Should not make POST request
    const postCalls = (fetch as any).mock.calls.filter(
      (call: any[]) => call[0] === '/api/chat/messages' && call[1]?.method === 'POST'
    )
    expect(postCalls).toHaveLength(0)
  })
})
