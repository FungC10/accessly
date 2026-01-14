import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-slate-950">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-red-400 mb-4">
          404 - Page Not Found
        </h2>
        <p className="text-gray-400 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
