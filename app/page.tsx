import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import Index from '@/pages/Index'

export default function HomePage() {
  return (
    <RequireAuth>
      <AppShell>
        <Index />
      </AppShell>
    </RequireAuth>
  )
}
