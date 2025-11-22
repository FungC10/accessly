import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Relax React's act dev checks in this environment
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false

// Mock next/navigation so it doesn't require the real app router
vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/test',
  }
})

// Mock next-auth/react so useSession works without a provider
vi.mock('next-auth/react', () => {
  return {
    useSession: () => ({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      },
      status: 'authenticated',
    }),
    SessionProvider: ({ children }: any) => children,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }
})
