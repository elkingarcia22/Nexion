import { supabase } from "@/lib/supabase";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  hangoutLink?: string;
  status: string;
}

export interface CalendarResult {
  success: boolean;
  events?: CalendarEvent[];
  error?: string;
}

export async function fetchGoogleCalendarEvents(date: string): Promise<CalendarResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      return { success: false, error: "No hay sesión activa" };
    }

    const googleToken =
      (session as any).provider_token ||
      (typeof window !== "undefined"
        ? (localStorage.getItem("google_provider_token") || sessionStorage.getItem("google_provider_token"))
        : null);

    if (!googleToken) {
      if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
        console.log("Using mock Calendar events for Demo Mode");
        return {
          success: true,
          events: [
            {
              id: "mock-event-1",
              summary: "Reunión de Sincronización: Nexión V2",
              description: "Revisión de avances del tablero operativo y sincronización con Drive.",
              location: "Google Meet",
              start: new Date(`${date}T09:00:00`).toISOString(),
              end: new Date(`${date}T10:00:00`).toISOString(),
              hangoutLink: "https://meet.google.com/abc-defg-hij",
              status: "confirmed"
            },
            {
              id: "mock-event-2",
              summary: "Check-in: Alianza SteelCore",
              description: "Validación de términos legales para el cierre de Q4.",
              location: "Oficina Central / Teams",
              start: new Date(`${date}T14:30:00`).toISOString(),
              end: new Date(`${date}T15:30:00`).toISOString(),
              hangoutLink: "https://meet.google.com/xyz-uvw-rst",
              status: "confirmed"
            },
            {
              id: "mock-event-3",
              summary: "Workshop: Arquitectura Cloud",
              start: new Date(`${date}T11:00:00`).toISOString(),
              end: new Date(`${date}T12:30:00`).toISOString(),
              status: "confirmed"
            }
          ]
        };
      }
      return {
        success: false,
        error: "No se encontró el token de Google. Por favor, reconecta tu cuenta.",
      };
    }

    // Set time range for the day
    const timeMin = new Date(`${date}T00:00:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59`).toISOString();

    const params = new URLSearchParams({ timeMin, timeMax });

    const res = await fetch(`/api/google/calendar?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "x-google-token": googleToken,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem("google_provider_token");
          sessionStorage.removeItem("google_provider_token");
        }
      }

      return {
        success: false,
        error: errData.error || `Error ${res.status} al acceder a Google Calendar`,
      };
    }

    const data = await res.json();
    return { success: true, events: data.events };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
