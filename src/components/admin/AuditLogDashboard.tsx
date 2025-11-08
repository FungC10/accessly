'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface AuditLogEntry {
  id: string
  action: string
  actor: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  targetType: string | null
  targetId: string | null
  metadata: any
  createdAt: string
}

interface AuditLogFilters {
  action?: string
  actorId?: string
  targetType?: string
  targetId?: string
}

interface AuditLogDashboardProps {
  initialFilters?: AuditLogFilters
}

export function AuditLogDashboard({ initialFilters = {} }: AuditLogDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchLogs = useCallback(async (reset = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters.action) params.set('action', filters.action)
      if (filters.actorId) params.set('actorId', filters.actorId)
      if (filters.targetType) params.set('targetType', filters.targetType)
      if (filters.targetId) params.set('targetId', filters.targetId)
      if (!reset && cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/admin/audit?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Failed to fetch audit logs')
      }

      if (reset) {
        setLogs(result.data.logs)
      } else {
        setLogs((prev) => [...prev, ...result.data.logs])
      }

      setCursor(result.data.cursor)
      setHasMore(result.data.hasMore)
    } catch (err: any) {
      console.error('Error fetching audit logs:', err)
      setError(err.message || 'Failed to fetch audit logs')
    } finally {
      setIsLoading(false)
    }
  }, [filters, cursor])

  useEffect(() => {
    fetchLogs(true)
  }, [filters])

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    const newFilters = { ...filters }
    if (value) {
      newFilters[key] = value
    } else {
      delete newFilters[key]
    }
    setFilters(newFilters)
    setCursor(null)

    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/admin/audit?${params.toString()}`)
  }

  const formatMetadata = (metadata: any): string => {
    if (!metadata || typeof metadata !== 'object') return ''
    try {
      return JSON.stringify(metadata, null, 2)
    } catch {
      return String(metadata)
    }
  }

  const getActionColor = (action: string): string => {
    if (action.includes('delete')) return 'text-red-400'
    if (action.includes('remove')) return 'text-orange-400'
    if (action.includes('edit') || action.includes('change')) return 'text-yellow-400'
    if (action.includes('transfer')) return 'text-blue-400'
    return 'text-slate-300'
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Action</label>
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
            >
              <option value="">All Actions</option>
              <option value="message.delete">Message Delete</option>
              <option value="member.remove">Member Remove</option>
              <option value="ticket.status.change">Ticket Status Change</option>
              <option value="room.edit">Room Edit</option>
              <option value="room.delete">Room Delete</option>
              <option value="ownership.transfer">Ownership Transfer</option>
              <option value="user.ban">User Ban</option>
              <option value="user.unban">User Unban</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Target Type</label>
            <select
              value={filters.targetType || ''}
              onChange={(e) => handleFilterChange('targetType', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
            >
              <option value="">All Types</option>
              <option value="message">Message</option>
              <option value="member">Member</option>
              <option value="room">Room</option>
              <option value="user">User</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Actor ID</label>
            <input
              type="text"
              value={filters.actorId || ''}
              onChange={(e) => handleFilterChange('actorId', e.target.value)}
              placeholder="Filter by user ID"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Target ID</label>
            <input
              type="text"
              value={filters.targetId || ''}
              onChange={(e) => handleFilterChange('targetId', e.target.value)}
              placeholder="Filter by target ID"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Action</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Target</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Diff (JSON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {log.actor.image && (
                          <img
                            src={log.actor.image}
                            alt={log.actor.name || 'User'}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <div>
                          <div className="text-slate-200">{log.actor.name || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">{log.actor.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {log.targetType && log.targetId ? (
                        <div>
                          <div className="text-slate-400 text-xs">{log.targetType}</div>
                          {log.targetType === 'room' ? (
                            <Link
                              href={`/chat?room=${log.targetId}`}
                              className="text-cyan-400 hover:text-cyan-300 text-xs"
                            >
                              {log.targetId}
                            </Link>
                          ) : (
                            <div className="text-xs font-mono">{log.targetId}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <details className="cursor-pointer">
                          <summary className="text-cyan-400 hover:text-cyan-300 text-xs">
                            View JSON
                          </summary>
                          <pre className="mt-2 p-2 bg-slate-900 rounded text-xs text-slate-300 overflow-x-auto max-w-md">
                            {formatMetadata(log.metadata)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="px-4 py-3 border-t border-slate-700">
            <button
              onClick={() => fetchLogs(false)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

