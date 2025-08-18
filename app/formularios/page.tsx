import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import Formularios from '@/pages/Formularios'

export default function FormulariosPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Formularios />
      </AppShell>
    </RequireAuth>
  )
}
