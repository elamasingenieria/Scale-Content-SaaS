import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import SocialLinksForm from '@/pages/SocialLinksForm'

export default function SocialLinksPage() {
  return (
    <RequireAuth>
      <AppShell>
        <SocialLinksForm />
      </AppShell>
    </RequireAuth>
  )
}
