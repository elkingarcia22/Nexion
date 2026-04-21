import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { SourcesList } from '@/components/sources/SourcesList'
import { AddSourceButton } from '@/components/sources/AddSourceButton'

export const metadata: Metadata = {
  title: 'Fuentes',
}

export default function DaySourcesPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Día · Fuentes"
        subtitle="Fuentes de información del workspace"
        badge="Release 1"
        badgeColor="primary"
        actions={<AddSourceButton />}
      />
      <div className="mt-6">
        <SourcesList />
      </div>
    </div>
  )
}
