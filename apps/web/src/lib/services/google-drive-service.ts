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
        ? (localStorage.getItem("google_provider_token") || sessionStorage.getItem("google_provider_token"))
        : null);

    if (!googleToken) {
      if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
        // Return mock files for testing in Demo Mode
        console.log("Using mock Drive files for Demo Mode");
        return {
          success: true,
          files: [
            {
              id: "mock-doc-1",
              name: "Propuesta Proyecto Nexion.docx",
              mimeType: "application/vnd.google-apps.document",
              createdTime: new Date().toISOString(),
              modifiedTime: new Date().toISOString(),
              webViewLink: "https://docs.google.com/document/d/mock-doc-1",
            },
            {
              id: "mock-sheet-1",
              name: "Presupuesto Operativo Q2.xlsx",
              mimeType: "application/vnd.google-apps.spreadsheet",
              createdTime: new Date().toISOString(),
              modifiedTime: new Date().toISOString(),
              webViewLink: "https://docs.google.com/spreadsheets/d/mock-sheet-1",
            }
          ],
          total: 2
        };
      }
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
      // new Date("YYYY-MM-DDT00:00:00") without Z is local time — .toISOString() converts to UTC correctly.
      const startUtc = new Date(`${date}T00:00:00`).toISOString();
      const endUtc   = new Date(`${date}T23:59:59`).toISOString();
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
      
      // If unauthorized, clear tokens to force re-login
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem("google_provider_token");
          sessionStorage.removeItem("google_provider_token");
        }
      }

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
