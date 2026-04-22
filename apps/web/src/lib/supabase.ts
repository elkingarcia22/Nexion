import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const client = createClient(supabaseUrl, supabaseAnonKey);

// Bypass Auth logic for local development/demo
const isDemoMode = () => typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true';

const originalGetSession = client.auth.getSession.bind(client.auth);

client.auth.getSession = async () => {
  if (isDemoMode()) {
    return {
      data: {
        session: {
          user: {
            id: '5b76deb4-31ea-4b7e-b791-5caf71e015d3',
            email: 'demo@ubits.com',
            user_metadata: { full_name: 'Demo User (Nexión)' }
          },
          access_token: null,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        } as any
      },
      error: null
    };
  }
  return originalGetSession();
};

export const supabase = client;
