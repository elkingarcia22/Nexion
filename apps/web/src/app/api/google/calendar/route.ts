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
  const timeMin = searchParams.get("timeMin"); // ISO string
  const timeMax = searchParams.get("timeMax"); // ISO string

  try {
    const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    
    if (timeMin) calendarUrl.searchParams.set("timeMin", timeMin);
    if (timeMax) calendarUrl.searchParams.set("timeMax", timeMax);
    
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy", "startTime");

    const calendarRes = await fetch(calendarUrl.toString(), {
      headers: { Authorization: `Bearer ${googleToken}` },
      cache: 'no-store',
    });

    if (!calendarRes.ok) {
      const errText = await calendarRes.text();
      console.error("Google Calendar API error:", errText);
      
      if (calendarRes.status === 401 || calendarRes.status === 403) {
        return NextResponse.json(
          { error: "Su sesión de Google ha expirado. Por favor, reconecte su cuenta.", detail: errText },
          { status: calendarRes.status }
        );
      }

      return NextResponse.json(
        { error: "Error en la API de Google Calendar", detail: errText },
        { status: calendarRes.status }
      );
    }

    const calendarData = await calendarRes.json();
    
    // Filter out all-day events if desired, or keep them. 
    // Usually, we want events with specific times for a "Meetings" section.
    const events = (calendarData.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary,
      description: item.description,
      location: item.location,
      start: item.start.dateTime || item.start.date,
      end: item.end.dateTime || item.end.date,
      hangoutLink: item.hangoutLink,
      status: item.status,
    }));

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Calendar fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
