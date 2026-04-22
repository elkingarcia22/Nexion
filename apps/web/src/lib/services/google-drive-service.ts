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
  date?: string  // ISO date "YYYY-MM-DD" — if provided, only files from that day
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
    if (date) params.set("date", date);

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
