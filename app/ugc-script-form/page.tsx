import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import UGCScriptForm from '@/pages/UGCScriptForm'

export default function UGCScriptFormPage() {
  return (
    <RequireAuth>
      <AppShell>
        <UGCScriptForm />
      </AppShell>
    </RequireAuth>
  )
}
