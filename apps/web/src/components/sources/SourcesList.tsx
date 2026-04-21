'use client'

import { SourceStatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatRelativeTime } from '@/lib/utils'
import type { Source } from '@nexion/types'

// ⚠️ Mock data — replace with Supabase query in Phase 3
const MOCK_SOURCES: Source[] = [
  {
    id: 's1',
    workspace_id: 'ws1',
    added_by: 'user1',
    title: 'Reunión de feedback Q1 — Equipo de producto',
    source_type: 'meeting_link',
    url: 'https://meet.google.com/example-abc',
    raw_content: null,
    current_status: 'processed',
    source_date: new Date(Date.now() - 2 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 's2',
    workspace_id: 'ws1',
    added_by: 'user1',
    title: 'Documento de roadmap Q2 (borrador)',
    source_type: 'document_link',
    url: 'https://docs.google.com/document/d/example',
    raw_content: null,
    current_status: 'processed',
    source_date: new Date(Date.now() - 5 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 's3',
    workspace_id: 'ws1',
    added_by: 'user1',
    title: null,
    source_type: 'meeting_link',
    url: 'https://meet.google.com/processing-xyz',
    raw_content: null,
    current_status: 'processing',
    source_date: new Date(Date.now() - 30 * 60000).toISOString(),
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    deleted_at: null,
  },
]

const SOURCE_TYPE_LABELS: Record<string, string> = {
  meeting_link: 'Reunión',
  document_link: 'Documento',
  sheet_link: 'Hoja de cálculo',
  manual_note: 'Nota manual',
  slack_message: 'Slack',
  other: 'Otro',
}

export function SourcesList() {
  const sources = MOCK_SOURCES

  if (sources.length === 0) {
    return (
      <div className="page-card">
        <EmptyState
          title="Sin fuentes aún"
          description="Añade tu primera fuente usando el botón \"Añadir recurso\"."
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-card overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[11px] font-semibold text-navy/40 uppercase tracking-wide border-b border-border-gray mb-1">
        <div className="col-span-5">Fuente</div>
        <div className="col-span-2">Tipo</div>
        <div className="col-span-2">Estado</div>
        <div className="col-span-2">Añadida</div>
        <div className="col-span-1" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border-gray/60">
        {sources.map((source) => (
          <SourceRow key={source.id} source={source} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border-gray flex items-center justify-between">
        <p className="text-[11px] text-navy/35">
          {sources.length} fuente{sources.length !== 1 ? 's' : ''} — datos de ejemplo
        </p>
        <button className="text-[11px] text-navy/40 hover:text-navy transition-colors">
          Actualizar
        </button>
      </div>
    </div>
  )
}

function SourceRow({ source }: { source: Source }) {
  const displayTitle = source.title ?? (source.url ? new URL(source.url).hostname : '—')
  const isProcessing = source.current_status === 'processing' || source.current_status === 'reprocessing'

  return (
    <div className="grid grid-cols-12 gap-3 px-3 py-3 hover:bg-bg transition-colors items-center group">
      {/* Title + URL */}
      <div className="col-span-5 min-w-0">
        <p className="text-[13px] font-medium text-navy truncate">{displayTitle}</p>
        {source.url && (
          <p className="text-[11px] text-navy/35 truncate mt-0.5">{source.url}</p>
        )}
      </div>

      {/* Type */}
      <div className="col-span-2">
        <span className="text-[11px] text-navy/55">
          {SOURCE_TYPE_LABELS[source.source_type] ?? source.source_type}
        </span>
      </div>

      {/* Status */}
      <div className="col-span-2">
        <SourceStatusBadge status={source.current_status} withDot />
      </div>

      {/* Date */}
      <div className="col-span-2">
        <span className="text-[11px] text-navy/40 font-mono">
          {source.created_at ? formatRelativeTime(source.created_at) : '—'}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex justify-end">
        {!isProcessing && source.current_status !== 'pending' && (
          <button
            className="opacity-0 group-hover:opacity-100 text-[10px] text-navy/40 hover:text-primary transition-all"
            title="Reprocesar fuente"
          >
            Reprocesar
          </button>
        )}
        {isProcessing && (
          <span className="w-2 h-2 rounded-full bg-bright animate-pulse-soft" />
        )}
      </div>
    </div>
  )
}
