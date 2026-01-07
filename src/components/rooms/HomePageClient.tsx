'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RoomCard } from './RoomCard'
import { RoomFilters } from './RoomFilters'
import { CreateRoomButton } from './CreateRoomButton'

interface Room {
  id: string
  name: string
  title: string
  description?: string | null
  tags?: string[]
  type: 'PUBLIC' | 'PRIVATE' | 'DM' | 'TICKET'
  isPrivate: boolean
  createdAt: string | Date
  _count: {
    members: number
    messages: number
  }
  lastMessage?: {
    id: string
    content: string
    createdAt: string
    user: {
      id: string
      name: string | null
      image: string | null
    }
  } | null
  creator?: {
    id: string
    name: string | null
    image: string | null
  } | null
  role?: string | null
}

interface HomePageClientProps {
  initialRooms: Room[]
  availableTags: string[]
  initialFilters: {
    q: string
    tag: string
    sort: string
  }
  userRole?: 'USER' | 'ADMIN'
}

type Filters = { q: string; tags: string[]; sort: string }

export function HomePageClient({
  initialRooms,
  availableTags,
  initialFilters,
  userRole = 'USER',
}: HomePageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [allRooms] = useState<Room[]>(initialRooms)
  const [filters, setFilters] = useState<Filters>({
    q: initialFilters.q,
    tags: initialFilters.tag ? [initialFilters.tag] : [],
    sort: initialFilters.sort || 'active',
  })

  // Keep local state in sync with URL (supports multi-select tags via ?tags=a,b)
  useEffect(() => {
    const q = searchParams.get('q') || ''
    const sort = searchParams.get('sort') || 'active'

    const tagsParam = searchParams.get('tags')
    const legacyTag = searchParams.get('tag')
    const tags = tagsParam
      ? Array.from(new Set(tagsParam.split(',').map((t) => t.trim()).filter(Boolean)))
      : legacyTag
        ? [legacyTag]
        : []

    setFilters((prev) => {
      const same =
        prev.q === q &&
        prev.sort === sort &&
        prev.tags.length === tags.length &&
        prev.tags.every((t, i) => t === tags[i])
      return same ? prev : { q, tags, sort }
    })
  }, [searchParams])

  // Client-side filtering
  const filteredRooms = allRooms.filter((room) => {
    // Search filter
    if (filters.q) {
      const query = filters.q.toLowerCase()
      const matchesSearch =
        room.title.toLowerCase().includes(query) ||
        room.name.toLowerCase().includes(query) ||
        (room.description && room.description.toLowerCase().includes(query))
      if (!matchesSearch) return false
    }

    // Tag filter (multi-select AND)
    if (filters.tags.length > 0) {
      const roomTags = room.tags || []
      if (!filters.tags.every((t) => roomTags.includes(t))) return false
    }

    return true
  })

  // Faceted tags: when tags are selected, only show tags that exist on currently matching rooms
  const availableTagsForFilter =
    filters.tags.length > 0
      ? [
          ...filters.tags,
          ...Array.from(
            new Set(
              filteredRooms
                .flatMap((r) => r.tags || [])
                .filter((t) => t.length > 0 && !filters.tags.includes(t))
            )
          ).sort(),
        ]
      : availableTags

  // Sort rooms
  const sortedRooms = [...filteredRooms].sort((a, b) => {
    switch (filters.sort) {
      case 'new':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'members':
        return (b._count.members || 0) - (a._count.members || 0)
      case 'active':
      default:
        return (b._count.messages || 0) - (a._count.messages || 0)
    }
  })

  const handleFilterChange = (newFilters: Filters) => {
    startTransition(() => {
      setFilters(newFilters)

      const sp = new URLSearchParams()
      if (newFilters.q) sp.set('q', newFilters.q)
      if (newFilters.tags.length > 0) sp.set('tags', newFilters.tags.join(','))
      if (newFilters.sort) sp.set('sort', newFilters.sort)

      // Do not set legacy `tag` when multi-select is active.
      router.push(`/?${sp.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Workspace</h1>
            <p className="text-slate-400 mt-1">Enterprise collaboration platform</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Tickets link - visible only for admins */}
            {userRole === 'ADMIN' && (
              <Link
                href="/tickets"
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all issues →
              </Link>
            )}
            <CreateRoomButton />
          </div>
        </div>

        {/* Rooms Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Rooms</h2>
          </div>

          {/* Filters */}
          <RoomFilters availableTags={availableTagsForFilter} onFilterChange={handleFilterChange} />

          {/* Loading State */}
          {isPending && <div className="text-center py-8 text-slate-400">Loading...</div>}

          {/* Rooms Grid */}
          {!isPending && (
            <>
              {sortedRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedRooms.map((room) => (
                    <RoomCard key={room.id} room={room} role={room.role ?? undefined} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-lg mb-2">No rooms found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
