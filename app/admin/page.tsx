import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import Admin from '@/pages/Admin'

export default function AdminPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Admin />
      </AppShell>
    </RequireAuth>
  )
}
