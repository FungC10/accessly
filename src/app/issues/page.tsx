import { redirect } from 'next/navigation'
import { IssuesPageClient } from '@/components/issues/IssuesPageClient'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function IssuesPage() {
  const session = await auth()

  // Require authentication
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/issues')
  }

  // Verify user exists in DB
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email || '' },
    select: { id: true, role: true },
  })

  if (!dbUser) {
    redirect('/sign-in?callbackUrl=/issues')
  }

  const isAdmin = dbUser.role === Role.ADMIN

  return <IssuesPageClient isAdmin={isAdmin} userId={dbUser.id} />
}

