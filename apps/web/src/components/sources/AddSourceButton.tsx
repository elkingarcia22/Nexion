'use client'

import { useState } from 'react'
import { AddSourceForm } from './AddSourceForm'

export function AddSourceButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary text-sm"
        aria-label="Añadir nueva fuente"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Añadir recurso
      </button>

      {open && <AddSourceForm onClose={() => setOpen(false)} />}
    </>
  )
}
