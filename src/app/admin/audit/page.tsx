import { redirect } from 'next/navigation'
import { AuditLogDashboard } from '@/components/admin/AuditLogDashboard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actorId?: string; targetType?: string; targetId?: string }>
}) {
  const { auth } = await import('@/lib/auth')
  const { prisma } = await import('@/lib/prisma')
  const { Role } = await import('@prisma/client')
  
  const session = await auth()

  // Require authentication
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/admin/audit')
  }

  // Verify user is admin
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email || '' },
    select: { id: true, role: true },
  })

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    redirect('/')
  }

  const params = await searchParams

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Audit Log</h1>
        <AuditLogDashboard initialFilters={params} />
      </div>
    </div>
  )
}

