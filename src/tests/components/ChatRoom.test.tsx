import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatRoom } from '@/components/ChatRoom'
import { useSession } from 'next-auth/react'

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
global.fetch = vi.fn()

describe('ChatRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render room name', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)
    expect(screen.getByText('#general')).toBeInTheDocument()
  })

  it('should show sign-in message when not authenticated', () => {
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

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ messages: mockMessages }),
    } as Response)

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledWith('/api/chat/messages?roomId=room-1&limit=50')
  })

  it('should send message when form is submitted', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
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

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: mockCreatedMessage }),
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
      expect(fetch).toHaveBeenCalled()
    })

    // Find input and button
    const input = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByText('Send')

    // Type message
    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    // Check optimistic update
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    // Check API call was made
    await waitFor(() => {
      const postCalls = (fetch as any).mock.calls.filter(
        (call: any[]) => call[0] === '/api/chat/messages' && call[1]?.method === 'POST'
      )
      expect(postCalls.length).toBeGreaterThan(0)
      
      const lastCall = postCalls[postCalls.length - 1]
      expect(lastCall[1].body).toContain('Test message')
    })
  })

  it('should handle send error and show toast', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    } as Response)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Rate limit exceeded' }),
    } as Response)

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })

    const input = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByText('Send')

    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/Rate limit exceeded|Failed to send/)).toBeInTheDocument()
    })
  })

  it('should handle Enter key press to send', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    } as Response)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: {
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
      expect(fetch).toHaveBeenCalled()
    })

    const input = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Enter pressed' } })
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })

    await waitFor(() => {
      const postCalls = (fetch as any).mock.calls.filter(
        (call: any[]) => call[0] === '/api/chat/messages' && call[1]?.method === 'POST'
      )
      expect(postCalls.length).toBeGreaterThan(0)
    })
  })

  it('should not send empty message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    } as Response)

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      },
      status: 'authenticated',
    } as any)

    render(<ChatRoom roomId="room-1" roomName="#general" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })

    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()

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
