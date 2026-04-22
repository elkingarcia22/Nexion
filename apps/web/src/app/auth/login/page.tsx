"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        router.push("/");
      }
    });
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets email profile",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Error:", error);
        alert("Error al iniciar sesión: " + error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Error inesperado");
      setLoading(false);
    }
  };


  return (
    <div className="h-screen flex flex-col md:grid md:grid-cols-2 bg-white overflow-hidden">
      {/* Left Column - Context & Value Prop */}
      <section className="hidden md:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-bg to-light/20 relative overflow-hidden">
        {/* Decorative blurred circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -top-24 -left-24"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-bright/10 rounded-full blur-3xl -bottom-24 -right-24"></div>

        <div className="max-w-xl relative z-10">
          <div className="mb-12">
            <p className="text-primary font-bold text-xs uppercase tracking-widest mb-4">Nexión Intelligence</p>
            <h1 className="text-5xl font-bold text-navy leading-tight mb-6">
              Entra a Nexión. Conecta tus fuentes de trabajo y convierte información en seguimiento operativo.
            </h1>
            <p className="text-base text-navy/70 leading-relaxed">
              Inicia sesión con tu cuenta de Google de trabajo para acceder a tus fuentes, análisis y visibilidad diaria.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary flex-shrink-0 shadow-soft">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
              </div>
              <p className="font-semibold text-navy">Centralización de datos operativos</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary flex-shrink-0 shadow-soft">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="font-semibold text-navy">Automatización de flujos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column - Login Form */}
      <section className="flex flex-col justify-center items-center p-8 md:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="md:hidden mb-8">
            <h1 className="text-2xl font-bold text-navy">Nexión</h1>
          </div>

          {/* Login Header */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-navy mb-2">Comienza ahora</h2>
            <p className="text-sm text-navy/60">Accede a tu entorno seguro de Nexión</p>
          </div>

          {/* Google Login Button */}
          <div className="space-y-4 mb-10">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-border/40 hover:border-border/70 hover:bg-bg text-navy font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 shadow-soft hover:shadow-hard"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continuar con Google</span>
                </>
              )}
            </button>


          </div>

          {/* Permissions Card */}
          <div className="bg-bg rounded-lg p-6 border border-border/30">
            <div className="flex items-center gap-2 mb-6">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              <h3 className="font-bold text-xs uppercase tracking-wider text-navy">Permisos y acceso</h3>
            </div>

            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3 text-xs text-navy/70">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary/60 mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <span>Verificar tu identidad de trabajo</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-navy/70">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary/60 mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <span>Acceder a fuentes necesarias en Google Drive, Docs y Sheets</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-navy/70">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary/60 mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <span>Procesar recursos para convertirlos en información útil</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-border/30 text-center">
              <p className="text-xs text-navy/50 italic">Los permisos se solicitarán durante el acceso con Google.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="md:col-span-2 border-t border-border/10 py-6 text-center">
        <p className="text-xs text-navy/40 uppercase tracking-wide">© 2024 Nexión Technologies</p>
      </footer>
    </div>
  );
}
