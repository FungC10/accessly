import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Home() {
  const { auth } = await import('@/lib/auth')
  const session = await auth()

  // If logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard')
  }

  // If not logged in, show landing page
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Accessly</h1>
        <p className="text-slate-400">Secure, role-based login → realtime chat → SSR dashboard data</p>
        <nav className="flex gap-6 justify-center mt-8">
          <Link
            href="/sign-in"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/chat"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
          >
            Chat
          </Link>
        </nav>
      </div>
    </main>
  )
}
