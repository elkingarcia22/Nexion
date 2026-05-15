import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId, step, data } = body;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "workspaceId requerido" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: ws } = await supabase.from("workspaces").select("analysis_config, jira_config").eq("id", workspaceId).single();
    const analysisConfig = (ws?.analysis_config || {}) as any;
    const jiraConfig = (ws?.jira_config || {}) as any;

    switch (step) {
      case "profile": {
        analysisConfig.onboarding_name = data.mainName;
        analysisConfig.selected_responsibles = [data.mainName, ...(data.aliases || [])].filter(Boolean);
        analysisConfig.onboarding_step = 1;
        break;
      }
      case "teams": {
        analysisConfig.tasks = { ...analysisConfig.tasks, selected_teams: data.teams, filter_teams: false };
        analysisConfig.open = { ...analysisConfig.open, selected_teams: data.teams, filter_teams: false };
        analysisConfig.onboarding_step = 2;
        break;
      }
      case "products": {
        analysisConfig.tasks = { ...analysisConfig.tasks, selected_products: data.products };
        analysisConfig.open = { ...analysisConfig.open, selected_products: data.products };
        analysisConfig.onboarding_step = 3;
        break;
      }
      case "fuentes": {
        analysisConfig.source_types = data.sources;
        analysisConfig.onboarding_step = 4;
        break;
      }
      case "gemini": {
        analysisConfig.gemini_api_key = data.apiKey;
        analysisConfig.onboarding_step = 5;
        break;
      }
      case "jira": {
        if (data.siteUrl && data.email && data.apiToken) {
          await supabase.from("workspaces").update({ jira_config: { siteUrl: data.siteUrl, email: data.email, apiToken: data.apiToken } }).eq("id", workspaceId);
        }
        analysisConfig.onboarding_step = 6;
        break;
      }
      case "slack": {
        analysisConfig.onboarding_step = 7;
        if (data.channels && Array.isArray(data.channels)) {
          const slackToken = process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN;
          const upserts = [];
          for (const ch of data.channels) {
            let chName = ch.name || "";
            let isPrivate = ch.is_private;
            if (!chName && slackToken) {
              try {
                const infoRes = await fetch(`https://slack.com/api/conversations.info?channel=${ch.id}`, {
                  headers: { Authorization: `Bearer ${slackToken}` },
                });
                const info = await infoRes.json();
                if (info.ok && info.channel) {
                  chName = info.channel.name;
                  isPrivate = info.channel.is_private;
                }
              } catch {}
            }
            upserts.push({
              workspace_id: workspaceId,
              channel_id: ch.id,
              channel_name: chName,
              is_private: isPrivate ?? false,
              enabled: ch.enabled !== false,
            });
          }
          if (upserts.length > 0) {
            await supabase.from("app_slack_channels").upsert(upserts, {
              onConflict: "workspace_id,channel_id",
            });
          }
        }
        break;
      }
      case "modules": {
        analysisConfig.active_modules = data.modules;
        analysisConfig.onboarding_step = 8;
        break;
      }
      case "complete": {
        analysisConfig.onboarding_completed = true;
        analysisConfig.onboarding_completed_at = new Date().toISOString();
        const teams = analysisConfig.tasks?.selected_teams || [];
        const products = analysisConfig.tasks?.selected_products || [];
        const updates: Record<string, any> = {};
        if (teams.length > 0) {
          updates.objectives_config = { spreadsheet_id: "", selected_teams: teams };
        }
        if (products.length > 0) {
          updates.metrics_config = { selected_categories: products };
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from("workspaces").update(updates).eq("id", workspaceId);
        }
        break;
      }
    }

    const { error } = await supabase
      .from("workspaces")
      .update({ analysis_config: analysisConfig, updated_at: new Date().toISOString() })
      .eq("id", workspaceId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
