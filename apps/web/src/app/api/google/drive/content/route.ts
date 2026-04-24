import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const mimeType = searchParams.get("mimeType");
    const googleToken = request.headers.get("x-google-token");

    if (!fileId || !googleToken) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    // For Google Docs/Sheets, we MUST use the export endpoint
    if (mimeType?.includes("google-apps")) {
      let exportType = "text/plain";
      if (mimeType.includes("spreadsheet")) exportType = "text/csv";
      if (mimeType.includes("presentation")) exportType = "text/plain";
      
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${exportType}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${googleToken}`,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.error?.message || "Error fetching file content" },
        { status: res.status }
      );
    }

    const content = await res.text();
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error in drive content route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
