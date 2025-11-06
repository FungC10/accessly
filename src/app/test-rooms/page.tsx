'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function TestRoomsPage() {
  const { data: session, status } = useSession()
  const [apiResult, setApiResult] = useState<any>(null)
  const [debugResult, setDebugResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      testEndpoints()
    }
  }, [status])

  const testEndpoints = async () => {
    setLoading(true)
    
    // Test /api/chat/rooms
    try {
      const res = await fetch('/api/chat/rooms')
      const data = await res.json()
      setApiResult({ ok: res.ok, status: res.status, data })
      console.log('✅ /api/chat/rooms:', data)
    } catch (e: any) {
      setApiResult({ error: e.message })
      console.error('❌ /api/chat/rooms error:', e)
    }

    // Test /api/debug/rooms
    try {
      const res = await fetch('/api/debug/rooms')
      const data = await res.json()
      setDebugResult({ ok: res.ok, status: res.status, data })
      console.log('✅ /api/debug/rooms:', data)
    } catch (e: any) {
      setDebugResult({ error: e.message })
      console.error('❌ /api/debug/rooms error:', e)
    }

    setLoading(false)
  }

  if (status === 'loading') {
    return <div className="p-8">Loading session...</div>
  }

  if (status === 'unauthenticated') {
    return <div className="p-8">Please sign in to test</div>
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Room API Test Page</h1>
        
        <div className="mb-6 p-4 bg-slate-800 rounded">
          <h2 className="font-semibold mb-2">Session Info</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                status,
                user: session?.user,
                userId: session?.user?.id,
                userEmail: session?.user?.email,
              },
              null,
              2
            )}
          </pre>
        </div>

        <button
          onClick={testEndpoints}
          disabled={loading}
          className="mb-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Endpoints'}
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800 rounded">
            <h2 className="font-semibold mb-2">/api/chat/rooms</h2>
            {apiResult ? (
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(apiResult, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-400 text-sm">Click "Test Endpoints" to see result</p>
            )}
          </div>

          <div className="p-4 bg-slate-800 rounded">
            <h2 className="font-semibold mb-2">/api/debug/rooms</h2>
            {debugResult ? (
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-400 text-sm">Click "Test Endpoints" to see result</p>
            )}
          </div>
        </div>

        {apiResult?.data?.data?.rooms && (
          <div className="mt-6 p-4 bg-green-900/30 rounded">
            <h2 className="font-semibold mb-2">✅ Rooms Found: {apiResult.data.data.rooms.length}</h2>
            <ul className="list-disc list-inside space-y-1">
              {apiResult.data.data.rooms.map((room: any) => (
                <li key={room.id} className="text-sm">
                  {room.name} ({room._count?.messages || 0} messages)
                </li>
              ))}
            </ul>
          </div>
        )}

        {debugResult?.data?.rooms && (
          <div className="mt-6 p-4 bg-blue-900/30 rounded">
            <h2 className="font-semibold mb-2">🐛 Debug Rooms: {debugResult.data.rooms.length}</h2>
            <ul className="list-disc list-inside space-y-1">
              {debugResult.data.rooms.map((room: any) => (
                <li key={room.id} className="text-sm">
                  {room.name} ({room.messages} messages, {room.members} members)
                </li>
              ))}
            </ul>
            <div className="mt-4 text-xs">
              <div>ID Match: {debugResult.data.debug?.idMatch ? '✅' : '❌'}</div>
              <div>Session User ID: {debugResult.data.debug?.session?.userId}</div>
              <div>DB User ID: {debugResult.data.debug?.dbUser?.id}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

