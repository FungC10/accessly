'use client'

// Client-side gate (soft); server gates are primary
export function RoleGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
