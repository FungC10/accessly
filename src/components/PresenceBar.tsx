'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getSocket } from '@/lib/socket'

interface OnlineUser {
  userId: string
  socketId: string
  roomId?: string
}

interface PresenceBarProps {
  roomId: string
}

export function PresenceBar({ roomId }: PresenceBarProps) {
  const { data: session } = useSession()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Listen for user online
    const handleUserOnline = (data: OnlineUser) => {
      // Only process events for the current room
      if (data.roomId === roomId) {
        setOnlineUsers((prev) => new Set(prev).add(data.userId))
      }
    }

    // Listen for user offline
    const handleUserOffline = (data: { userId: string; roomId?: string }) => {
      // Only process events for the current room
      if (!data.roomId || data.roomId === roomId) {
        setOnlineUsers((prev) => {
          const next = new Set(prev)
          next.delete(data.userId)
          return next
        })
      }
    }

    socket.on('user:online', handleUserOnline)
    socket.on('user:offline', handleUserOffline)

    // Add current user to online list
    if (session?.user?.id) {
      setOnlineUsers((prev) => new Set(prev).add(session.user.id))
    }

    return () => {
      socket.off('user:online', handleUserOnline)
      socket.off('user:offline', handleUserOffline)
    }
  }, [roomId, session?.user?.id])

  // Return null when no users online (tests expect this)
  if (!onlineUsers || onlineUsers.size === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 mt-2 min-h-[20px]">
      <span className="text-xs text-slate-400">Online:</span>
      <div className="flex items-center gap-2">
        {Array.from(onlineUsers).map((userId) => (
          <div key={userId} className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-slate-300">
              {userId === session?.user?.id ? 'You' : `User ${userId.slice(0, 4)}`}
            </span>
          </div>
        ))}
      </div>
      <span className="text-xs text-slate-500">({onlineUsers.size})</span>
    </div>
  )
}