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
    // Base: not trashed, all supported doc types
    let q =
      "trashed=false and (" +
      "mimeType='application/vnd.google-apps.document'" +
      " or mimeType='application/vnd.google-apps.spreadsheet'" +
      " or mimeType='application/pdf'" +
      ")";

    // Filter by UTC range so the user's full local day is covered correctly
    if (startUtc && endUtc) {
      q += ` and modifiedTime >= '${startUtc}' and modifiedTime <= '${endUtc}'`;
    }

    const driveUrl = new URL("https://www.googleapis.com/drive/v3/files");
    driveUrl.searchParams.set("q", q);
    driveUrl.searchParams.set(
      "fields",
      "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,owners)"
    );
    driveUrl.searchParams.set("orderBy", "modifiedTime desc");
    driveUrl.searchParams.set("pageSize", "100");

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
