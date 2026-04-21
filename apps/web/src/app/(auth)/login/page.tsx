import type { Metadata } from 'next'
import { UbitsLogo } from '@/components/brand/UbitsLogo'

export const metadata: Metadata = {
  title: 'Ingresar — Nexión',
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-card-hover p-8">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3">
            <UbitsLogo color="navy" width={88} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-navy tracking-tight">Nexión</span>
            <span className="text-[10px] font-mono text-white/40 bg-navy/5 px-1.5 py-0.5 rounded">
              v0.1
            </span>
          </div>
          <p className="text-xs text-navy/40 mt-1">Claridad operativa diaria</p>
        </div>

        {/* Auth section */}
        <div className="space-y-3">
          <p className="text-[13px] text-center text-navy/50">
            Accede con tu cuenta de Ubits
          </p>

          {/* Google OAuth — activado en Fase 2 */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3
                       border border-border-gray rounded-xl text-sm font-medium
                       text-navy bg-white hover:bg-bg
                       transition-colors duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed"
            disabled
            title="Configuración de Google OAuth pendiente — Fase 2"
            aria-label="Continuar con Google (no disponible aún)"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          {/* Setup notice */}
          <div className="flex items-start gap-2 bg-status-info-bg rounded-lg px-3 py-2.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="flex-shrink-0 mt-0.5 text-status-info"
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 7v4M8 5.5v.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-[11px] text-status-info leading-relaxed">
              Google OAuth configuración pendiente. Se activará en Fase 2.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-navy/30">
          Solo para equipos de Ubits
        </p>
      </div>

      {/* Version badge */}
      <p className="mt-4 text-center text-[11px] text-white/25 font-mono">
        Nexión Phase 1 Shell · 2026
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}
