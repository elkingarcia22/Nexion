import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ingresar — Nexión',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-brand flex items-center justify-center p-4">
      {children}
    </div>
  )
}
