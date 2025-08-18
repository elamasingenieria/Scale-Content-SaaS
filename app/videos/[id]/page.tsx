import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import VideoDetail from '@/pages/VideoDetail'

export default function VideoDetailPage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth>
      <AppShell>
        <VideoDetail />
      </AppShell>
    </RequireAuth>
  )
}
