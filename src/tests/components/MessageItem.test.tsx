import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageItem } from '@/components/MessageItem'

describe('MessageItem', () => {
  const mockMessage = {
    id: 'msg-1',
    content: 'Hello, world!',
    createdAt: new Date().toISOString(),
    user: {
      id: 'user-1',
      name: 'Test User',
      image: null,
    },
  }

  it('should render message content', () => {
    render(<MessageItem message={mockMessage} currentUserId="user-2" />)
    expect(screen.getByText('Hello, world!')).toBeInTheDocument()
  })

  it('should render user name for other users', () => {
    render(<MessageItem message={mockMessage} currentUserId="user-2" />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should not render user name for own messages', () => {
    render(<MessageItem message={mockMessage} currentUserId="user-1" />)
    expect(screen.queryByText('Test User')).not.toBeInTheDocument()
  })

  it('should render time ago', () => {
    render(<MessageItem message={mockMessage} currentUserId="user-2" />)
    // Time ago should be rendered (format may vary)
    const timeElement = screen.getByText(/just now|m ago|h ago|d ago/)
    expect(timeElement).toBeInTheDocument()
  })

  it('should apply different styling for own messages', () => {
    const { container } = render(
      <MessageItem message={mockMessage} currentUserId="user-1" />
    )
    // Should have flex-row-reverse for own messages
    const messageDiv = container.querySelector('.flex-row-reverse')
    expect(messageDiv).toBeInTheDocument()
  })

  it('should handle message with null user name', () => {
    const messageWithNullName = {
      ...mockMessage,
      user: {
        ...mockMessage.user,
        name: null,
      },
    }
    render(<MessageItem message={messageWithNullName} currentUserId="user-2" />)
    // Should show "Anonymous" when name is null
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
  })

  it('should handle long message content', () => {
    const longContentMessage = {
      ...mockMessage,
      content: 'a'.repeat(1000),
    }
    render(<MessageItem message={longContentMessage} currentUserId="user-2" />)
    expect(screen.getByText(/^a{1000}$/)).toBeInTheDocument()
  })
})
