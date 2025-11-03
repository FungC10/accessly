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
    // For demo, use the first available room from seed data (#general)
    // In production, you'd fetch available rooms from API
    // Using a hardcoded room ID for now - should match seed data
    setRoomId('general-room-id') // This would come from API
    setRoomName('#general')
  }, [])

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