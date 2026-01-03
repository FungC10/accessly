import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Email from 'next-auth/providers/email'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { Role } from '@prisma/client'
import { env } from './env'
import bcrypt from 'bcryptjs'

const providers: Array<
  ReturnType<typeof GitHub> | ReturnType<typeof Email> | ReturnType<typeof Credentials>
> = []

// Add Credentials provider (for email/password login)
providers.push(
  Credentials({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      try {
        console.log('🔍 Auth attempt started')
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials', { email: !!credentials?.email, password: !!credentials?.password })
          return null
        }

        // Normalize email to lowercase (emails are case-insensitive)
        const normalizedEmail = (credentials.email as string).toLowerCase().trim()
        console.log('📧 Normalized email:', normalizedEmail)

        // Test database connection first
        try {
          await prisma.$connect()
          console.log('✅ Database connected')
        } catch (dbError) {
          console.error('❌ Database connection failed:', dbError)
          throw dbError
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        })

        if (!user) {
          console.log('❌ User not found:', normalizedEmail)
          return null
        }

        console.log('✅ User found:', user.email, 'Role:', user.role)

        if (!user.password) {
          console.log('❌ User has no password set')
          return null
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isValid) {
          console.log('❌ Invalid password for user:', normalizedEmail)
          return null
        }

        console.log('✅ Login successful for:', user.email)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      } catch (error) {
        console.error('❌ Auth error:', error)
        console.error('❌ Auth error stack:', error instanceof Error ? error.stack : 'No stack trace')
        return null
      }
    },
  })
)

// Add GitHub provider if env vars are present
if (env.GITHUB_ID && env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
    })
  )
}

// Add Email provider if env vars are present
if (env.EMAIL_SERVER && env.EMAIL_FROM) {
  providers.push(
    Email({
      server: env.EMAIL_SERVER,
      from: env.EMAIL_FROM,
    })
  )
}

// Ensure at least one provider is configured
if (providers.length === 0) {
  console.warn(
    '⚠️  No authentication providers configured. Please set GITHUB_ID/GITHUB_SECRET or EMAIL_SERVER/EMAIL_FROM'
  )
}

// Check if we have OAuth providers (need adapter)
const hasOAuthProviders = providers.some(p => p.id !== 'credentials')

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Only use adapter for OAuth providers (GitHub, Email)
  // Credentials provider uses JWT strategy and doesn't need adapter
  adapter: hasOAuthProviders ? (PrismaAdapter(prisma) as any) : undefined,
  session: {
    strategy: 'jwt', // Use JWT for credentials provider (required)
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers,
  cookies: {
    sessionToken: {
      name: `${env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        // Use token.sub (NextAuth default) or token.id (fallback)
        session.user.id = (token.sub as string) || (token.id as string) || ''
        session.user.role = (token.role as Role) || Role.USER
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        // token.sub is set automatically by NextAuth to user.id
        // But we also set token.id for explicit access
        token.id = user.id
        token.sub = user.id // Ensure sub is set (NextAuth default)
        token.role = (user as any).role || Role.USER
      }
      return token
    },
  },
  pages: {
    signIn: '/sign-in',
    error: '/auth/error',
  },
})