"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("DEBUG: Auth callback starting...");
        
        // 1. Check if we have tokens in the hash fragment (most reliable for provider tokens)
        let hashProviderToken = null;
        let hashRefreshToken = null;

        if (typeof window !== "undefined" && window.location.hash) {
          console.log("DEBUG: Parsing tokens from URL hash...");
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          
          hashProviderToken = params.get("provider_token");
          hashRefreshToken = params.get("provider_refresh_token");
          
          if (hashProviderToken) console.log("DEBUG: Found provider_token in hash fragment");
          if (hashRefreshToken) console.log("DEBUG: Found provider_refresh_token in hash fragment");
        }

        // 2. Wait for Supabase to process the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth error from getSession:", error);
        }

        const session = data?.session;
        let providerToken = hashProviderToken || (session as any)?.provider_token;
        let providerRefreshToken = hashRefreshToken || (session as any)?.provider_refresh_token;

        console.log("DEBUG: Session user:", session?.user?.email || "none");
        console.log("DEBUG: Final providerToken present:", !!providerToken);
        console.log("DEBUG: Final refreshToken present:", !!providerRefreshToken);

        // 3. Save tokens explicitly
        if (providerToken) {
          localStorage.setItem("google_provider_token", providerToken);
          sessionStorage.setItem("google_provider_token", providerToken);
          console.log("DEBUG: Token saved to storage");
        }

        if (providerRefreshToken) {
          localStorage.setItem("google_provider_refresh_token", providerRefreshToken);
          sessionStorage.setItem("google_provider_refresh_token", providerRefreshToken);
          console.log("DEBUG: Refresh token saved to storage");
        }

        // 4.5. Ensure profile exists for this user
        if (session?.user) {
          try {
            const { error: profileError } = await supabase.rpc('ensure_profile_exists', { user_id: session.user.id });
            if (profileError) {
              console.warn("Could not ensure profile exists:", profileError);
              // Try to create profile directly
              const { data: ws } = await supabase.from('workspaces').insert({
                name: session.user.user_metadata?.full_name || 'Mi Workspace',
                slug: 'workspace-' + session.user.id.replace(/-/g, ''),
                status: 'active'
              }).select().single();
              
              if (ws) {
                await supabase.from('profiles').upsert({
                  id: session.user.id,
                  workspace_id: ws.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || '',
                  role: 'owner',
                  is_active: true
                });

                await supabase.from('workspace_memberships').insert({
                  workspace_id: ws.id,
                  profile_id: session.user.id,
                  membership_role: 'owner',
                });
              }
            } else {
              // Update profile with latest info
              await supabase.from('profiles').update({
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || '',
                updated_at: new Date().toISOString()
              }).eq('id', session.user.id);

              // Ensure workspace_memberships exists (defense in depth)
              const { data: profile } = await supabase.from('profiles')
                .select('workspace_id').eq('id', session.user.id).single();
              if (profile?.workspace_id) {
                const { data: existing } = await supabase.from('workspace_memberships')
                  .select('id').eq('profile_id', session.user.id).maybeSingle();
                if (!existing) {
                  await supabase.from('workspace_memberships').insert({
                    workspace_id: profile.workspace_id,
                    profile_id: session.user.id,
                    membership_role: 'owner',
                  });
                }
              }
            }
          } catch (profileErr) {
            console.warn("Profile creation error:", profileErr);
          }
        }

        // 4. Force a small wait to ensure storage is committed and Supabase state is stable
        await new Promise(resolve => setTimeout(resolve, 800));

        // 5. Check if onboarding is needed
        let needsOnboarding = false;
        if (session?.user) {
          try {
            const { data: profile } = await supabase.from("profiles")
              .select("workspace_id").eq("id", session.user.id).single();
            if (profile?.workspace_id) {
              const { data: ws } = await supabase.from("workspaces")
                .select("analysis_config, name").eq("id", profile.workspace_id).single();
              const ac = (ws as any)?.analysis_config || {};
              // Only redirect if explicitly not onboarded AND workspace has no existing config
              const hasExistingConfig = ac.tasks?.selected_products?.length > 0 || ac.selected_responsibles?.length > 0;
              needsOnboarding = !ac.onboarding_completed && !hasExistingConfig;
            }
          } catch (e) {
            console.warn("Onboarding check error:", e);
          }
        }

        // 6. Redirect
        if (session?.user || providerToken) {
          console.log("✓ Authentication successful, redirecting...");
          router.push(needsOnboarding ? "/onboarding" : "/day/today");
        } else {
          console.warn("DEBUG: Authentication failed - no session or token");
          router.push("/auth/login?error=auth_failed");
        }
      } catch (err) {
        console.error("Callback critical error:", err);
        router.push("/auth/login?error=callback_exception");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-navy to-dark-ui">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-white text-lg">Completando autenticación...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-navy to-dark-ui">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white text-lg">Completando autenticación...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
