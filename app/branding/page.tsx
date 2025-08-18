import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import Branding from '@/pages/Branding'

export default function BrandingPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Branding />
      </AppShell>
    </RequireAuth>
  )
}
