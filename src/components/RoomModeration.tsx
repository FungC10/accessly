'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { RoomRole, RoomType } from '@prisma/client'

interface Member {
  id: string
  userId: string
  role: RoomRole
  user: {
    id: string
    email: string | null
    name: string | null
  }
}

interface Room {
  id: string
  name: string
  title: string
  type: RoomType
  tags: string[]
}

interface RoomModerationProps {
  roomId: string
  currentUserRole: RoomRole
}

export function RoomModeration({ roomId, currentUserRole }: RoomModerationProps) {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [newTags, setNewTags] = useState<string[]>([])
  const [newType, setNewType] = useState<RoomType>(RoomType.PUBLIC)
  const [transferToUserId, setTransferToUserId] = useState<string>('')

  const isOwner = currentUserRole === RoomRole.OWNER
  const isModerator = currentUserRole === RoomRole.MODERATOR || isOwner
  const canModerate = isModerator

  useEffect(() => {
    if (canModerate) {
      fetchRoomData()
    }
  }, [roomId, canModerate])

  const fetchRoomData = async () => {
    try {
      const [membersRes, roomRes] = await Promise.all([
        fetch(`/api/chat/rooms/${roomId}/members`, { credentials: 'include' }),
        fetch(`/api/chat/rooms/${roomId}`, { credentials: 'include' }),
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData.data?.members || [])
      }

      if (roomRes.ok) {
        const roomData = await roomRes.json()
        setRoom(roomData.data?.room || null)
        if (roomData.data?.room) {
          setNewTags(roomData.data.room.tags || [])
          setNewType(roomData.data.room.type || RoomType.PUBLIC)
        }
      }
    } catch (err) {
      console.error('Error fetching room data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the room?')) return

    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()
      if (data.ok) {
        await fetchRoomData()
      } else {
        alert(data.message || 'Failed to remove member')
      }
    } catch (err) {
      console.error('Error removing member:', err)
      alert('Failed to remove member')
    }
  }

  const handleTransferOwnership = async () => {
    if (!transferToUserId) {
      alert('Please select a member')
      return
    }

    if (!confirm('Transfer room ownership? You will become a moderator.')) return

    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newOwnerId: transferToUserId }),
      })

      const data = await response.json()
      if (data.ok) {
        await fetchRoomData()
        setShowTransferModal(false)
        setTransferToUserId('')
        alert('Ownership transferred successfully')
      } else {
        alert(data.message || 'Failed to transfer ownership')
      }
    } catch (err) {
      console.error('Error transferring ownership:', err)
      alert('Failed to transfer ownership')
    }
  }

  const handleUpdateSettings = async () => {
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tags: newTags,
          type: newType,
        }),
      })

      const data = await response.json()
      if (data.ok) {
        await fetchRoomData()
        setShowEditModal(false)
        alert('Room settings updated')
      } else {
        alert(data.message || 'Failed to update settings')
      }
    } catch (err) {
      console.error('Error updating settings:', err)
      alert('Failed to update settings')
    }
  }

  if (!canModerate) {
    return null
  }

  if (loading) {
    return <div className="text-slate-400">Loading...</div>
  }

  const otherMembers = members.filter((m) => m.userId !== session?.user?.id)
  const canRemove = (member: Member) => {
    if (member.role === RoomRole.OWNER) return isOwner
    return isModerator
  }

  return (
    <div className="space-y-6">
      {/* Room Settings */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Room Settings</h3>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 rounded"
          >
            Edit
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-slate-400">Type:</span>{' '}
            <span className="text-slate-200">{room?.type || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400">Tags:</span>{' '}
            <span className="text-slate-200">
              {room?.tags?.length ? room.tags.join(', ') : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h3 className="font-semibold mb-4">Members ({members.length})</h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 bg-slate-700/30 rounded"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm">{member.user.name || member.user.email || 'Unknown'}</span>
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    member.role === RoomRole.OWNER
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : member.role === RoomRole.MODERATOR
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-slate-600/50 text-slate-300'
                  }`}
                >
                  {member.role}
                </span>
              </div>
              <div className="flex gap-2">
                {isOwner && member.role !== RoomRole.OWNER && (
                  <button
                    onClick={() => {
                      setTransferToUserId(member.userId)
                      setShowTransferModal(true)
                    }}
                    className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
                    title="Transfer ownership"
                  >
                    Make Owner
                  </button>
                )}
                {canRemove(member) && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                    disabled={member.userId === session?.user?.id}
                    title="Remove member"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Room Modal */}
      {showEditModal && room && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Edit Room Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Room Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as RoomType)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value={RoomType.PUBLIC}>Public</option>
                  <option value={RoomType.PRIVATE}>Private</option>
                  <option value={RoomType.DM}>DM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newTags.join(', ')}
                  onChange={(e) => setNewTags(e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    if (room) {
                      setNewTags(room.tags || [])
                      setNewType(room.type || RoomType.PUBLIC)
                    }
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSettings}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Transfer Ownership</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select New Owner</label>
                <select
                  value={transferToUserId}
                  onChange={(e) => setTransferToUserId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value="">Select a member...</option>
                  {otherMembers
                    .filter((m) => m.role !== RoomRole.OWNER)
                    .map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user.name || member.user.email} ({member.role})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowTransferModal(false)
                    setTransferToUserId('')
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferOwnership}
                  disabled={!transferToUserId}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50"
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

