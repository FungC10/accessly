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
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) {
          console.log('❌ User not found:', credentials.email)
          return null
        }

        if (!user.password) {
          console.log('❌ User has no password set')
          return null
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isValid) {
          console.log('❌ Invalid password for user:', credentials.email)
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
    async session({ session, token, user }) {
      if (session.user) {
        // For JWT strategy (credentials), use token
        if (token) {
          session.user.id = token.id as string
          session.user.role = (token.role as Role) || Role.USER
        }
        // For database strategy (OAuth), use user
        if (user) {
          session.user.id = user.id
          session.user.role = (user as any).role as Role
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
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