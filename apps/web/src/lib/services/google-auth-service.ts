/**
 * Helper service to handle Google OAuth token refresh
 */
export async function refreshGoogleToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem("google_provider_refresh_token") || 
                         sessionStorage.getItem("google_provider_refresh_token");

    if (!refreshToken) {
      console.warn("No refresh token found in storage");
      return null;
    }

    console.log("Attempting to refresh Google token...");

    const res = await fetch("/api/google/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("Failed to refresh Google token:", error);
      
      // If the refresh token itself is invalid/expired, we should clear it
      if (res.status === 400 || res.status === 401) {
        localStorage.removeItem("google_provider_token");
        localStorage.removeItem("google_provider_refresh_token");
        sessionStorage.removeItem("google_provider_token");
        sessionStorage.removeItem("google_provider_refresh_token");
      }
      return null;
    }

    const data = await res.json();
    const newToken = data.access_token;

    if (newToken) {
      console.log("Google token refreshed successfully");
      localStorage.setItem("google_provider_token", newToken);
      sessionStorage.setItem("google_provider_token", newToken);
      return newToken;
    }

    return null;
  } catch (err) {
    console.error("Error in refreshGoogleToken:", err);
    return null;
  }
}
