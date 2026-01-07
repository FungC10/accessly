'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface RoomFiltersProps {
  availableTags: string[]
  onFilterChange?: (filters: { q: string; tags: string[]; sort: string }) => void
}

export function RoomFilters({ availableTags, onFilterChange }: RoomFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const initialTags = (() => {
    const tagsParam = searchParams.get('tags')
    if (tagsParam) {
      return Array.from(
        new Set(tagsParam.split(',').map((t) => t.trim()).filter(Boolean))
      )
    }
    const legacyTag = searchParams.get('tag')
    return legacyTag ? [legacyTag] : []
  })()
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags)
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'active')

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('q', value)
      } else {
        params.delete('q')
      }
      params.delete('cursor') // Reset pagination on filter change
      router.push(`?${params.toString()}`, { scroll: false })
      onFilterChange?.({ q: value, tags: selectedTags, sort: sortBy })
    },
    [searchParams, router, selectedTags, sortBy, onFilterChange]
  )

  const handleTagClick = useCallback(
    (tag: string) => {
      const newTags = selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag]

      setSelectedTags(newTags)

      const params = new URLSearchParams(searchParams.toString())
      if (newTags.length > 0) {
        params.set('tags', newTags.join(','))
        params.delete('tag') // legacy
      } else {
        params.delete('tags')
        params.delete('tag')
      }
      params.delete('cursor') // Reset pagination on filter change
      router.push(`?${params.toString()}`, { scroll: false })
      onFilterChange?.({ q: searchQuery, tags: newTags, sort: sortBy })
    },
    [searchParams, router, searchQuery, sortBy, selectedTags, onFilterChange]
  )

  const handleClearAllTags = useCallback(() => {
    setSelectedTags([])
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tags')
    params.delete('tag')
    params.delete('cursor')
    router.push(`?${params.toString()}`, { scroll: false })
    onFilterChange?.({ q: searchQuery, tags: [], sort: sortBy })
  }, [searchParams, router, searchQuery, sortBy, onFilterChange])

  const handleSortChange = useCallback(
    (value: string) => {
      setSortBy(value)
      const params = new URLSearchParams(searchParams.toString())
      params.set('sort', value)
      params.delete('cursor') // Reset pagination on filter change
      router.push(`?${params.toString()}`, { scroll: false })
      onFilterChange?.({ q: searchQuery, tags: selectedTags, sort: value })
    },
    [searchParams, router, searchQuery, selectedTags, onFilterChange]
  )

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <svg
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4">
        {/* Tag Chips */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {selectedTags.length > 0 && (
            <button
              onClick={handleClearAllTags}
              className="px-3 py-1.5 text-sm rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors flex-shrink-0"
            >
              Clear all
            </button>
          )}

          {availableTags.slice(0, 10).map((tag) => {
            const isSelected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors flex-shrink-0 ${
                  isSelected
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                #{tag}
              </button>
            )
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="md:justify-self-end">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="active">Most Active</option>
            <option value="new">Newest</option>
            <option value="members">Most Members</option>
          </select>
        </div>
      </div>
    </div>
  )
}
