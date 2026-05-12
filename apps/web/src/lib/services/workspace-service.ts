import { supabase } from "@/lib/supabase";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export async function getOrCreateWorkspace(
  userId: string,
  email: string
): Promise<{ success: boolean; data?: Workspace; error?: string }> {
  // Hard fallback for Demo Mode
  if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
    console.log("DEMO_MODE: Returning fallback workspace");
    return { 
      success: true, 
      data: {
        id: '406370f6-50bc-45d0-9f93-3e83bce60de6',
        name: 'Demo Workspace',
        slug: 'demo-workspace',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
  }
  try {
    // 1. Check if profile exists and has a workspace
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", userId);

    if (profileError) {
      if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
        console.warn("Using fallback workspace for Demo Mode");
        return { 
          success: true, 
          data: {
            id: '406370f6-50bc-45d0-9f93-3e83bce60de6',
            name: 'Demo Workspace',
            slug: 'demo-workspace',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };
      }
      return { success: false, error: profileError.message };
    }

    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

    if (profile?.workspace_id) {
      // Profile exists and has a workspace, fetch it
      const { data: workspaces, error: getError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", profile.workspace_id);

      if (getError) {
        return { success: false, error: getError.message };
      }

      if (!workspaces || workspaces.length === 0) {
        return { success: false, error: "Workspace not found" };
      }

      // Ensure membership exists (defense in depth for users created before
      // the signup trigger was fixed)
      const { data: existingMembership } = await supabase
        .from("workspace_memberships")
        .select("id")
        .eq("workspace_id", profile.workspace_id)
        .eq("profile_id", userId)
        .maybeSingle();

      if (!existingMembership) {
        await supabase.from("workspace_memberships").insert({
          workspace_id: profile.workspace_id,
          profile_id: userId,
          membership_role: "owner",
        });
      }

      return { success: true, data: workspaces[0] };
    }

    // 2. Create new workspace if not found
    const workspaceName = email.split("@")[0];
    const slug = `${workspaceName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.random().toString(36).substring(2, 6)}`;

    const { data: newWorkspaces, error: createError } = await supabase
      .from("workspaces")
      .insert([
        {
          name: workspaceName,
          slug: slug,
        },
      ])
      .select();

    if (createError) {
      console.error("Workspace creation error:", createError);
      return { success: false, error: createError.message };
    }

    if (!newWorkspaces || newWorkspaces.length === 0) {
      return { success: false, error: "Failed to create workspace" };
    }

    const newWorkspace = newWorkspaces[0];

    // 3. Create profile and link to workspace
    const { error: profileCreateError } = await supabase
      .from("profiles")
      .upsert([
        {
          id: userId,
          workspace_id: newWorkspace.id,
          email: email,
          role: "admin",
        },
      ]);

    if (profileCreateError) {
      return { success: false, error: profileCreateError.message };
    }

    // 4. Create membership
    const { error: memberError } = await supabase
      .from("workspace_memberships")
      .insert([
        {
          workspace_id: newWorkspace.id,
          profile_id: userId,
          membership_role: "owner",
        },
      ]);

    if (memberError) {
      return { success: false, error: memberError.message };
    }

    return { success: true, data: newWorkspace };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function updateWorkspaceJiraConfig(
  workspaceId: string,
  config: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("workspaces")
      .update({ jira_config: config, updated_at: new Date().toISOString() })
      .eq("id", workspaceId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error updating Jira config:", err);
    return { success: false, error: err.message };
  }
}

export async function updateWorkspaceGeminiKey(
  workspaceId: string,
  geminiApiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("workspaces")
      .update({ gemini_api_key: geminiApiKey || null, updated_at: new Date().toISOString() })
      .eq("id", workspaceId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getUserWorkspace(
  userId: string
): Promise<{ success: boolean; data?: Workspace; error?: string }> {
  if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
    return { 
      success: true, 
      data: {
        id: '406370f6-50bc-45d0-9f93-3e83bce60de6',
        name: 'Demo Workspace',
        slug: 'demo-workspace',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
  }
  try {
    const { data, error } = await supabase
      .from("workspace_memberships")
      .select("workspaces(*)")
      .eq("profile_id", userId)
      .limit(1);

    if (error) {
      if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
        return { 
          success: true, 
          data: {
            id: '406370f6-50bc-45d0-9f93-3e83bce60de6',
            name: 'Demo Workspace',
            slug: 'demo-workspace',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };
      }
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "No workspace found" };
    }

    const workspace = (data[0] as any).workspaces;
    return { success: true, data: workspace };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
