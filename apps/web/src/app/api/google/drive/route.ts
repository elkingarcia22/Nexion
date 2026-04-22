import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = authHeader.split(" ")[1];
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const googleToken = request.headers.get("x-google-token");
  if (!googleToken) {
    return NextResponse.json(
      { error: "No Google token available. Please re-login with Google." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  // startUtc / endUtc = full ISO strings in UTC covering the user's local day
  // e.g. for UTC-5, April 20 local → startUtc=2026-04-20T05:00:00Z endUtc=2026-04-21T05:00:00Z
  const startUtc = searchParams.get("startUtc");
  const endUtc   = searchParams.get("endUtc");

  try {
    // Base filter:
    // 1. Owned by me OR
    // 2. Shared with me AND has relevant keywords (Objetivos, Meeting, Gemini, Transcript)
    // Exclusions for noise like receipts, transfers, etc.
    const noiseWords = ["Comprobante", "Transferencia", "Factura", "Payment"];
    const noiseFilter = noiseWords.map(w => `not name contains '${w}'`).join(" and ");

    // We want all Docs, Sheets, Slides, PDFs and Office formats that are NOT noise and NOT trashed
    const mimeTypes = [
      "mimeType='application/vnd.google-apps.document'",
      "mimeType='application/vnd.google-apps.spreadsheet'",
      "mimeType='application/vnd.google-apps.presentation'",
      "mimeType='application/pdf'",
      "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
      "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
      "mimeType='application/vnd.openxmlformats-officedocument.presentationml.presentation'",
      "mimeType='application/msword'",
      "mimeType='application/vnd.ms-excel'"
    ];

    let q = `(${noiseFilter}) and trashed=false and (${mimeTypes.join(" or ")})`;

    // Filter by UTC range covering modifiedTime OR viewedByMeTime
    // This captures files the user edited AND files they just opened to read.
    if (startUtc && endUtc) {
      q += ` and (modifiedTime >= '${startUtc}' and modifiedTime <= '${endUtc}' or viewedByMeTime >= '${startUtc}' and viewedByMeTime <= '${endUtc}')`;
    }

    const driveUrl = new URL("https://www.googleapis.com/drive/v3/files");
    driveUrl.searchParams.set("q", q);
    driveUrl.searchParams.set(
      "fields",
      "files(id,name,mimeType,createdTime,modifiedTime,viewedByMeTime,webViewLink,owners)"
    );
    driveUrl.searchParams.set("orderBy", "modifiedTime desc");
    driveUrl.searchParams.set("pageSize", "1000");
    
    // Support Shared Drives and Items shared with me
    driveUrl.searchParams.set("supportsAllDrives", "true");
    driveUrl.searchParams.set("includeItemsFromAllDrives", "true");

    const driveRes = await fetch(driveUrl.toString(), {
      headers: { Authorization: `Bearer ${googleToken}` },
    });

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      console.error("Google Drive API error:", errText);
      return NextResponse.json(
        { error: "Google Drive API error", detail: errText },
        { status: driveRes.status }
      );
    }

    const driveData = await driveRes.json();
    return NextResponse.json({
      files: driveData.files || [],
      total: (driveData.files || []).length,
    });
  } catch (err) {
    console.error("Drive fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
