'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChatRoom } from '@/components/ChatRoom'

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomName, setRoomName] = useState<string>('General')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in?callbackUrl=/chat')
    }
  }, [status, router])

  useEffect(() => {
    // Fetch available rooms from API
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/chat/rooms')
        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.data?.rooms && data.data.rooms.length > 0) {
            // Use the first room (typically #general)
            const firstRoom = data.data.rooms[0]
            setRoomId(firstRoom.id)
            setRoomName(firstRoom.name)
          } else {
            console.warn('No rooms available for user')
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Failed to fetch rooms:', errorData.message || 'Unknown error')
        }
      } catch (err) {
        console.error('Error fetching rooms:', err)
      }
    }
    
    if (session?.user) {
      fetchRooms()
    }
  }, [session])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!session?.user || !roomId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="h-screen flex flex-col">
        <ChatRoom roomId={roomId} roomName={roomName} />
      </div>
    </div>
  )
}