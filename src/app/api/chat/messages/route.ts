import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MessageInput, Pagination } from '@/lib/validation'
import { checkRate } from '@/lib/rateLimit'
import { getIO } from '@/lib/io'

export const runtime = 'nodejs'

// ... existing GET and POST functions remain the same ...