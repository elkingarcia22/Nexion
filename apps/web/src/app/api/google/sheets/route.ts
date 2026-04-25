import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get("spreadsheetId");
    const range = searchParams.get("range");
    const googleToken = request.headers.get("x-google-token");

    if (!spreadsheetId || !googleToken) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const url = range 
      ? `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`
      : `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${googleToken}`,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.error?.message || "Error fetching sheet data" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in sheets values route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
