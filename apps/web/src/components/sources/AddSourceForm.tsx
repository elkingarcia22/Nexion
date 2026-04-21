'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { SourceType } from '@nexion/types'

interface AddSourceFormProps {
  onClose: () => void
}

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string; description: string }[] = [
  { value: 'meeting_link', label: 'Reunión', description: 'Link de Meet, Zoom u otra plataforma' },
  { value: 'document_link', label: 'Documento', description: 'Google Docs u otro documento' },
  { value: 'sheet_link', label: 'Hoja de cálculo', description: 'Google Sheets' },
  { value: 'manual_note', label: 'Nota manual', description: 'Texto o notas sin URL' },
]

export function AddSourceForm({ onClose }: AddSourceFormProps) {
  const [sourceType, setSourceType] = useState<SourceType>('meeting_link')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const isUrlType = sourceType !== 'manual_note'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    // ⚠️ Phase 3: replace with real Supabase + n8n call
    await new Promise((r) => setTimeout(r, 1200))
    setSubmitting(false)
    setSubmitted(true)
  }

  function handleClose() {
    setUrl('')
    setNote('')
    setSubmitted(false)
    setSubmitting(false)
    onClose()
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(4, 16, 31, 0.5)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-source-title"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-gray">
          <h2 id="add-source-title" className="text-base font-bold text-navy">
            Añadir recurso
          </h2>
          <button
            onClick={handleClose}
            className="btn-ghost p-1 rounded-lg"
            aria-label="Cerrar formulario"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          // Success state
          <div className="px-6 py-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-status-ok-bg flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-status-ok">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-navy">Recurso recibido</h3>
            <p className="mt-1.5 text-sm text-navy/50">
              La fuente fue registrada. En Fase 3 iniciará el procesamiento automático.
            </p>
            <div className="mt-2 px-3 py-1.5 bg-status-info-bg rounded-lg">
              <p className="text-[11px] text-status-info">
                ⚠️ Mock — no se guardó en Supabase aún
              </p>
            </div>
            <button onClick={handleClose} className="btn-primary mt-6">
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {/* Type selector */}
            <div>
              <label className="block text-[12px] font-semibold text-navy/70 mb-2">
                Tipo de recurso
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SOURCE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSourceType(opt.value)}
                    className={cn(
                      'flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                      sourceType === opt.value
                        ? 'border-primary bg-primary/5 text-navy'
                        : 'border-border-gray bg-white hover:bg-bg text-navy/70'
                    )}
                  >
                    <span className="text-[12px] font-semibold">{opt.label}</span>
                    <span className="text-[10px] text-navy/40 mt-0.5 leading-tight">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* URL or note input */}
            {isUrlType ? (
              <div>
                <label htmlFor="source-url" className="block text-[12px] font-semibold text-navy/70 mb-1.5">
                  Enlace del recurso
                </label>
                <input
                  id="source-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-border-gray rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                             placeholder:text-navy/25 transition-all"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="source-note" className="block text-[12px] font-semibold text-navy/70 mb-1.5">
                  Contenido de la nota
                </label>
                <textarea
                  id="source-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Escribe el contenido de la nota..."
                  required
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-sm border border-border-gray rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                             placeholder:text-navy/25 transition-all resize-none"
                />
              </div>
            )}

            {/* Info notice */}
            <div className="flex items-start gap-2 bg-bg rounded-xl px-3 py-2.5 border border-border-gray">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5 text-navy/40">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-[11px] text-navy/50 leading-relaxed">
                El procesamiento automático con n8n + Gemini se activa en Fase 5–6.
                Por ahora la fuente se registra en estado <span className="font-mono">pending</span>.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={submitting || (isUrlType ? !url : !note)}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Registrando...
                  </span>
                ) : (
                  'Añadir fuente'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
