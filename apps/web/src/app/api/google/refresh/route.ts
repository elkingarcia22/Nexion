import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/newsletters/repository";
import { resolveGoogleOAuthClient } from "@/lib/secrets";

export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: "No refresh token provided" },
        { status: 400 }
      );
    }

    // Saved in Configuración → Google, falling back to GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
    const oauthClient = await resolveGoogleOAuthClient(createServiceClient());
    if (!oauthClient) {
      console.error("Missing Google OAuth client (Configuración → Google or GOOGLE_CLIENT_ID/SECRET)");
      return NextResponse.json(
        { error: "Falta configurar el cliente OAuth de Google en Configuración → Google." },
        { status: 500 }
      );
    }
    const { clientId, clientSecret } = oauthClient;

    // Call Google's token endpoint
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google token refresh failed:", data);
      return NextResponse.json(
        { error: data.error_description || "Failed to refresh token" },
        { status: response.status }
      );
    }

    // Google returns a new access_token
    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    });
  } catch (error) {
    console.error("Token refresh route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
