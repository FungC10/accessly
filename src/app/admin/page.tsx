import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Role } from '@prisma/client'
import { CreateRoomForm } from '@/components/CreateRoomForm'
// Role is an enum from Prisma - should be available after prisma generate

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminPage() {
  const { auth } = await import('@/lib/auth')
  const { assertRole } = await import('@/lib/rbac')
  
  const session = await auth()

  // Require authentication
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/admin')
  }

  // Require ADMIN role
  try {
    assertRole(session, Role.ADMIN)
  } catch (error) {
    redirect('/dashboard')
  }

  // Fetch admin data
  const { prisma } = await import('@/lib/prisma')
  const users = await prisma.user.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          messages: true,
          memberships: true,
        },
      },
    },
  })

  const rooms = await prisma.room.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      isPrivate: true,
      createdAt: true,
      _count: {
        select: {
          members: true,
          messages: true,
        },
      },
    },
  })

  const totalUsers = await prisma.user.count()
  const totalMessages = await prisma.message.count()
  const totalRooms = await prisma.room.count()

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-slate-400 mt-1">
              System administration and user management
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-purple-500/10 backdrop-blur border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-purple-300">Total Users</h3>
            <p className="text-3xl font-bold text-purple-400">{totalUsers}</p>
          </div>
          <div className="bg-purple-500/10 backdrop-blur border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-purple-300">Total Messages</h3>
            <p className="text-3xl font-bold text-purple-400">{totalMessages}</p>
          </div>
          <div className="bg-purple-500/10 backdrop-blur border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-purple-300">Total Rooms</h3>
            <p className="text-3xl font-bold text-purple-400">{totalRooms}</p>
          </div>
        </div>

        {/* Create Room Section */}
        <div className="bg-purple-500/10 backdrop-blur border border-purple-500/30 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-purple-300">Create New Room</h2>
          <CreateRoomForm />
        </div>

        {/* Rooms List */}
        <div className="bg-white/10 backdrop-blur border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">All Rooms</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-4 text-slate-400">Name</th>
                  <th className="text-left py-2 px-4 text-slate-400">Type</th>
                  <th className="text-left py-2 px-4 text-slate-400">Members</th>
                  <th className="text-left py-2 px-4 text-slate-400">Messages</th>
                  <th className="text-left py-2 px-4 text-slate-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-slate-800/50">
                    <td className="py-2 px-4">{room.name}</td>
                    <td className="py-2 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          room.isPrivate
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}
                      >
                        {room.isPrivate ? 'Private' : 'Public'}
                      </span>
                    </td>
                    <td className="py-2 px-4">{room._count.members}</td>
                    <td className="py-2 px-4">{room._count.messages}</td>
                    <td className="py-2 px-4 text-sm text-slate-400">
                      {new Date(room.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white/10 backdrop-blur border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-4 text-slate-400">Email</th>
                  <th className="text-left py-2 px-4 text-slate-400">Name</th>
                  <th className="text-left py-2 px-4 text-slate-400">Role</th>
                  <th className="text-left py-2 px-4 text-slate-400">Messages</th>
                  <th className="text-left py-2 px-4 text-slate-400">Rooms</th>
                  <th className="text-left py-2 px-4 text-slate-400">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800/50">
                    <td className="py-2 px-4">{user.email || 'N/A'}</td>
                    <td className="py-2 px-4">{user.name || 'N/A'}</td>
                    <td className="py-2 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-700/50 text-slate-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-2 px-4">{user._count.messages}</td>
                    <td className="py-2 px-4">{user._count.memberships}</td>
                    <td className="py-2 px-4 text-sm text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}