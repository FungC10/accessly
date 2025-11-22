/**
 * Parse complex search query syntax
 * Supports: from:@alice tag:billing before:2024-01-01
 */
export type SearchFilters = {
  from?: string
  tag?: string
  before?: string
  after?: string
}

export type ParsedSearchQuery = {
  text: string
  filters: SearchFilters
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const filters: SearchFilters = {}
  const tokens = query.trim().split(/\s+/).filter(Boolean)
  const textTokens: string[] = []

  for (const token of tokens) {
    if (token.startsWith('from:@')) {
      filters.from = token.slice('from:@'.length)
    } else if (token.startsWith('tag:')) {
      filters.tag = token.slice('tag:'.length)
    } else if (token.startsWith('before:')) {
      filters.before = token.slice('before:'.length)
    } else if (token.startsWith('after:')) {
      filters.after = token.slice('after:'.length)
    } else {
      textTokens.push(token)
    }
  }

  return {
    text: textTokens.join(' '),
    filters,
  }
}

/**
 * Generate PostgreSQL tsquery from parsed query
 */
export function buildTsQuery(text: string): string {
  if (!text) return ''
  
  // Split into words and join with & (AND) operator
  const words = text
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w.replace(/[^\w]/g, '')) // Remove special chars
    .filter(w => w.length > 0)
  
  if (words.length === 0) return ''
  
  // Use phrase search with & operator for better results
  return words.join(' & ')
}

/**
 * Extract snippet from text with highlighting markers
 */
export function extractSnippet(
  text: string,
  query: string,
  maxLength = 100,
): string {
  const trimmedText = text ?? ''
  const q = (query ?? '').toLowerCase().trim()

  if (!trimmedText) return ''

  const lower = trimmedText.toLowerCase()

  // No query or not found → always prefix of text + "..."
  if (!q || !lower.includes(q)) {
    return trimmedText.slice(0, maxLength) + '...'
  }

  const index = lower.indexOf(q)

  // Center snippet around match
  const half = Math.floor((maxLength - q.length) / 2)
  let start = Math.max(0, index - half)
  let end = Math.min(trimmedText.length, start + maxLength)

  let snippet = trimmedText.slice(start, end)

  // If we cut off the end, add ellipsis ONCE
  if (end < trimmedText.length) {
    snippet += '...'
  }

  // Ensure we respect maxLength + 3
  if (snippet.length > maxLength + 3) {
    snippet = snippet.slice(0, maxLength) + '...'
  }

  return snippet
}

/**
 * Highlight query terms in text
 */
export function highlightText(text: string, query: string): string {
  if (!text || !query) return text
  
  const queryWords = query.split(/\s+/).filter(w => w.length > 0)
  let highlighted = text
  
  for (const word of queryWords) {
    const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    highlighted = highlighted.replace(regex, '<mark>$1</mark>')
  }
  
  return highlighted
}

