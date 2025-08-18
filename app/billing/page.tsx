import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import Billing from '@/pages/Billing'

export default function BillingPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Billing />
      </AppShell>
    </RequireAuth>
  )
}
