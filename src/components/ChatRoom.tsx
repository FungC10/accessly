'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket'
import { MessageItem } from './MessageItem'
import { PresenceBar } from './PresenceBar'
import { Toast } from './Toast'

interface Message {
  id: string
  roomId: string
  userId: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface ChatRoomProps {
  roomId: string
  roomName: string
}

export function ChatRoom({ roomId, roomName }: ChatRoomProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    // Initialize socket connection
    const socket = initSocket(session.user.id)

    // Join room
    socket.emit('room:join', { roomId, userId: session.user.id })

    // Listen for new messages
    socket.on('message:new', (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    // Load initial messages
    fetchMessages()

    return () => {
      socket.emit('room:leave', { roomId, userId: session.user.id })
      disconnectSocket()
    }
  }, [roomId, session?.user?.id])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages?roomId=${roomId}&limit=50`)
      if (!response.ok) {
        throw new Error('Failed to load messages')
      }
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !session?.user?.id) return

    const content = input.trim()
    setInput('')
    setIsLoading(true)
    setError(null)

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      roomId,
      userId: session.user.id,
      content,
      createdAt: new Date().toISOString(),
      user: {
        id: session.user.id,
        name: session.user.name,
        image: session.user.image,
      },
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      // Remove optimistic message and add real one
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== optimisticMessage.id)
        return [...filtered, data.message]
      })
    } catch (err: any) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))

      setError(err.message || 'Failed to send message')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!session?.user) {
    return <div className="text-slate-400">Please sign in to chat</div>
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <h2 className="text-xl font-semibold">{roomName}</h2>
        <PresenceBar roomId={roomId} />
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-6 space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} currentUserId={session.user!.id} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-800">
        {error && showToast && (
          <div className="mb-2 text-red-400 text-sm">{error}</div>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}