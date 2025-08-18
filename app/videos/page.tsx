import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import Videos from '@/pages/Videos'

export default function VideosPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Videos />
      </AppShell>
    </RequireAuth>
  )
}
