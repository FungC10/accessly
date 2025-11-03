interface MessageItemProps {
  message: {
    id: string
    content: string
    createdAt: string
    user: {
      id: string
      name: string | null
      image: string | null
    }
  }
  currentUserId: string
}

export function MessageItem({ message, currentUserId }: MessageItemProps) {
  const isOwn = message.user.id === currentUserId
  const createdAt = new Date(message.createdAt)
  const timeAgo = formatTimeAgo(createdAt)

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          {!isOwn && (
            <span className="text-sm font-medium text-slate-300">
              {message.user.name || 'Anonymous'}
            </span>
          )}
          <span className="text-xs text-slate-500">{timeAgo}</span>
        </div>
        <div
          className={`px-4 py-2 rounded-lg ${
            isOwn
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-slate-100'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  return date.toLocaleDateString()
}