import { supabase } from "@/lib/supabase";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  owners?: { displayName: string; emailAddress: string }[];
}

export interface DriveFilesResult {
  success: boolean;
  files?: DriveFile[];
  total?: number;
  error?: string;
}

export type DriveFilter = "all" | "gemini" | "meet" | "docs";

export async function fetchGoogleDriveFiles(
  filter: DriveFilter = "gemini",
  date?: string  // local date "YYYY-MM-DD" — if provided, only files from that local day
): Promise<DriveFilesResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      return { success: false, error: "No hay sesión activa" };
    }

    // provider_token is available in session right after login.
    // As a fallback, we also store it in sessionStorage at callback time.
    const googleToken =
      (session as any).provider_token ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("google_provider_token")
        : null);

    if (!googleToken) {
      return {
        success: false,
        error:
          "No se encontró el token de Google. Por favor, cierra sesión y vuelve a ingresar con Google para otorgar los permisos necesarios.",
      };
    }

    const params = new URLSearchParams({ filter });

    // Convert local date → UTC range to account for timezone offset
    if (date) {
      // Parse the local day boundaries using the local timezone offset
      const offsetMs = new Date().getTimezoneOffset() * 60 * 1000; // ms offset (e.g. 300*60*1000 for UTC-5)
      const localStart = new Date(`${date}T00:00:00`);  // midnight local
      const localEnd   = new Date(`${date}T23:59:59`);  // end of day local
      // Shift to UTC
      const startUtc = new Date(localStart.getTime() + offsetMs).toISOString();
      const endUtc   = new Date(localEnd.getTime()   + offsetMs).toISOString();
      params.set("startUtc", startUtc);
      params.set("endUtc",   endUtc);
    }

    const res = await fetch(`/api/google/drive?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "x-google-token": googleToken,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || `Error ${res.status} al acceder a Google Drive`,
      };
    }

    const data = await res.json();
    return { success: true, files: data.files, total: data.total };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export function getMimeTypeLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/pdf": "PDF",
  };
  return labels[mimeType] || "Archivo";
}

export function getMimeTypeIcon(mimeType: string): string {
  if (mimeType === "application/vnd.google-apps.spreadsheet") return "📊";
  if (mimeType === "application/pdf") return "📄";
  return "📝";
}
