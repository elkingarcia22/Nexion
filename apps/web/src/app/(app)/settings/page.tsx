"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateWorkspace, updateWorkspaceJiraConfig, updateWorkspaceGeminiKey } from "@/lib/services/workspace-service";
import { testJiraConnection } from "@/lib/services/jira-service";
import {
  addPrivateChannelToSync,
  getSlackBotChannels,
  getChannelPreferences,
  joinChannel,
  verifyPrivateChannel,
} from "@/lib/services/slack-service";
import {
  getObjectivesConfig,
  updateObjectivesConfig,
  getObjectives,
} from "@/lib/services/objectives-service";
import {
  getMetricsConfig,
  updateMetricsConfig,
  getMetrics,
} from "@/lib/services/metric-service";
import {
  getAnalysisConfig,
  updateAnalysisConfig,
  ANALYSIS_TEAMS,
  ALL_PRODUCTS,
  MODULES,
  SOURCE_TYPES,
  SectionConfig,
} from "@/lib/services/analysis-config-service";
import {
  getTasks,
} from "@/lib/services/task-service";

const CATEGORY_ALIAS: Record<string, string> = {
  matrix: "matriz_talento",
  "360": "evaluacion_360",
  hiring: "reclutamiento",
  creator: "lms_creator",
};

function normalizeCategory(cat: string): string {
  return CATEGORY_ALIAS[cat] || cat;
}

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_mpim: boolean;
  is_private?: boolean;
  is_member?: boolean;
  num_members: number;
}

type TabType = "slack" | "drive" | "jira" | "objetivos" | "metricas" | "analisis" | "gemini" | "modulos";

// Private channels known to work (must match slack-service.ts)
const KNOWN_PRIVATE = [
  { id: "C084AP7K4Q2", name: "triada-growth" },
  { id: "C083FSV36KY", name: "ux_team_ubits" },
  { id: "C0APCFJJ39V", name: "claude-masters" },
  { id: "C09JV33J9PB", name: "growth-interno" },
  { id: "C085E86CDEC", name: "talent-growth-implementation" },
  { id: "C08VBKFA9ST", name: "hiring-team" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("slack");
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [channelIdInput, setChannelIdInput] = useState("");
  const [connectingPrivate, setConnectingPrivate] = useState(false);
  const [privateChannelError, setPrivateChannelError] = useState("");
  const [privateChannelSuccess, setPrivateChannelSuccess] = useState("");

  const [publicChannelIdInput, setPublicChannelIdInput] = useState("");
  const [connectingPublic, setConnectingPublic] = useState(false);
  const [publicChannelError, setPublicChannelError] = useState("");
  const [publicChannelSuccess, setPublicChannelSuccess] = useState("");
  const [allChannels, setAllChannels] = useState<SlackChannel[]>([]);
  const [channelPrefs, setChannelPrefs] = useState<Map<string, { enabled: boolean }>>(new Map());
  const [syncingChannels, setSyncingChannels] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [savingChannels, setSavingChannels] = useState(false);
  const [channelSaveStatus, setChannelSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [channelSaveMsg, setChannelSaveMsg] = useState("");

  // Jira state
  const [jiraConfig, setJiraConfig] = useState({ siteUrl: "", email: "", apiToken: "" });
  const [jiraStatus, setJiraStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [jiraError, setJiraError] = useState("");
  const [jiraUserData, setJiraUserData] = useState<any>(null);
  const [jiraSaving, setJiraSaving] = useState(false);

  // Objectives state
  const [objSheetId, setObjSheetId] = useState("");
  const [objSelectedTeams, setObjSelectedTeams] = useState<string[]>([]);
  const [objAvailableTeams, setObjAvailableTeams] = useState<string[]>([]);
  const [objSaving, setObjSaving] = useState(false);
  const [objStatus, setObjStatus] = useState<"idle" | "success" | "error">("idle");
  const [objStatusMsg, setObjStatusMsg] = useState("");

  // Metrics state
  const [metSelectedCats, setMetSelectedCats] = useState<string[]>([]);
  const [metAvailableCats, setMetAvailableCats] = useState<string[]>([]);
  const [metSaving, setMetSaving] = useState(false);
  const [metStatus, setMetStatus] = useState<"idle" | "success" | "error">("idle");
  const [metStatusMsg, setMetStatusMsg] = useState("");

  // Analysis config state — split by section
  const [anTasks, setAnTasks] = useState<SectionConfig & { selected_responsibles?: string[]; custom_categories?: string[]; filter_active?: boolean }>({ selected_products: [], selected_teams: [], filter_teams: false, selected_responsibles: [], custom_categories: [], filter_active: true });
  const [anTasksResponsibleInput, setAnTasksResponsibleInput] = useState("");
  const [anResponsibleInput, setAnResponsibleInput] = useState("");
  const [anTasksCustomInput, setAnTasksCustomInput] = useState("");
  const [anTasksEditingCat, setAnTasksEditingCat] = useState<string | null>(null);
  const [anTasksEditingCatVal, setAnTasksEditingCatVal] = useState("");
  const [anEditingCat, setAnEditingCat] = useState<string | null>(null);
  const [anEditingCatVal, setAnEditingCatVal] = useState("");
  const [anOpen, setAnOpen] = useState<SectionConfig & { custom_categories: string[] }>({ selected_products: [], selected_teams: [], filter_teams: false, custom_categories: [] });
  const [anFilterResponsibles, setAnFilterResponsibles] = useState(false);
  const [anSelectedResponsibles, setAnSelectedResponsibles] = useState<string[]>([]);
  const [anKnownResponsibles, setAnKnownResponsibles] = useState<string[]>([]);
  const [anCustomInput, setAnCustomInput] = useState("");
  const [anSaving, setAnSaving] = useState(false);
  const [anStatus, setAnStatus] = useState<"idle" | "success" | "error">("idle");
  const [anStatusMsg, setAnStatusMsg] = useState("");
  const [anTasksSaving, setAnTasksSaving] = useState(false);
  const [anTasksStatus, setAnTasksStatus] = useState<"idle" | "success" | "error">("idle");
  const [anTasksStatusMsg, setAnTasksStatusMsg] = useState("");
  const [anOpenSaving, setAnOpenSaving] = useState(false);
  const [anOpenStatus, setAnOpenStatus] = useState<"idle" | "success" | "error">("idle");
  const [anOpenStatusMsg, setAnOpenStatusMsg] = useState("");

  // Modules state
  const [activeModules, setActiveModules] = useState<string[]>(MODULES.map(m => m.key));
  const [activeSources, setActiveSources] = useState<string[]>(SOURCE_TYPES.map(s => s.key));
  const [modulesSaving, setModulesSaving] = useState(false);
  const [modulesStatus, setModulesStatus] = useState<"idle" | "success" | "error">("idle");
  const [modulesStatusMsg, setModulesStatusMsg] = useState("");

  // Gemini state
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<"idle" | "success" | "error">("idle");
  const [geminiStatusMsg, setGeminiStatusMsg] = useState("");

  // Drive state
  const [driveSaving, setDriveSaving] = useState(false);

  const loadChannels = async (wsId: string) => {
    setSyncingChannels(true);
    setPendingChanges(new Map());
    try {
      const channelsResult = await getSlackBotChannels();
      const publicChannels = (channelsResult.success && channelsResult.data) ? channelsResult.data : [];

      // Load private channels from DB
      const prefsResult = await getChannelPreferences(wsId);
      const dbChannels: SlackChannel[] = [];
      if (prefsResult.success && prefsResult.data) {
        for (const p of prefsResult.data) {
          if (p.is_private && !publicChannels.some(c => c.id === p.channel_id)) {
            dbChannels.push({
              id: p.channel_id,
              name: p.channel_name,
              is_channel: true,
              is_group: true,
              is_mpim: false,
              is_private: true,
              is_member: true,
              num_members: 0,
            });
          }
        }
      }

      // Add known private channels not already in the list
      for (const kp of KNOWN_PRIVATE) {
        if (!publicChannels.some(c => c.id === kp.id) && !dbChannels.some(c => c.id === kp.id)) {
          dbChannels.push({
            id: kp.id,
            name: kp.name,
            is_channel: true,
            is_group: true,
            is_mpim: false,
            is_private: true,
            is_member: true,
            num_members: 0,
          });
        }
      }

      const merged = [...publicChannels, ...dbChannels];
      const seen = new Set<string>();
      const unique = merged.filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      setAllChannels(unique);
    } catch (err) {
      console.error("[loadChannels] Error:", err);
    } finally {
      setSyncingChannels(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        window.location.href = "/auth/login";
        return;
      }
      setUser(sessionData.session.user);
      const wsResult = await getOrCreateWorkspace(
        sessionData.session.user.id,
        sessionData.session.user.email || ""
      );
      if (wsResult.success && wsResult.data) {
        setWorkspace(wsResult.data);

        const prefsResult = await getChannelPreferences(wsResult.data.id);
        if (prefsResult.success && prefsResult.data) {
          setChannelPrefs(new Map(prefsResult.data.map(p => [p.channel_id, { enabled: p.enabled }])));
        }

        await loadChannels(wsResult.data.id);

        // Load Jira config
        const jc = (wsResult.data as any).jira_config;
        if (jc) setJiraConfig(jc);

        // Load Gemini API key (from column or analysis_config)
        const wsData = wsResult.data as any;
        const gk = wsData.gemini_api_key || wsData.analysis_config?.gemini_api_key;
        if (gk) setGeminiApiKey(gk);

        // Load objectives config
        const objConfigResult = await getObjectivesConfig(wsResult.data.id);
        if (objConfigResult.success && objConfigResult.data) {
          setObjSheetId(objConfigResult.data.spreadsheet_id);
          setObjSelectedTeams(objConfigResult.data.selected_teams || []);
        }

        // Load objectives to discover available teams
        const objsResult = await getObjectives(wsResult.data.id);
        if (objsResult.success && objsResult.data) {
          const teams = [...new Set(objsResult.data.map((o: any) => o.team).filter(Boolean))] as string[];
          setObjAvailableTeams(teams.length > 0 ? teams.sort() : ANALYSIS_TEAMS.map(t => t.key));
        } else {
          setObjAvailableTeams(ANALYSIS_TEAMS.map(t => t.key));
        }

        // Load metrics config
        const metConfigResult = await getMetricsConfig(wsResult.data.id);
        if (metConfigResult.success && metConfigResult.data) {
          setMetSelectedCats(metConfigResult.data.selected_categories || []);
        }

        // Load metrics to discover available categories
        const metResult = await getMetrics(wsResult.data.id);
        if (metResult.success && metResult.data) {
          const cats = [...new Set(metResult.data.map((m: any) => normalizeCategory(m.category)).filter((c: string) => c !== "general"))] as string[];
          setMetAvailableCats(cats.length > 0 ? cats.sort() : ALL_PRODUCTS.map(p => p.key));
        } else {
          setMetAvailableCats(ALL_PRODUCTS.map(p => p.key));
        }

        // Load analysis config
        const anConfigResult = await getAnalysisConfig(wsResult.data.id);
        console.log('⚙️ SETTINGS - LOADED CONFIG:', JSON.stringify(anConfigResult.data));
        if (anConfigResult.success && anConfigResult.data) {
          const tasksConfig = anConfigResult.data.tasks;
          console.log('⚙️ SETTINGS - TASKS CONFIG:', JSON.stringify(tasksConfig));
          const userDisplayName = sessionData.session.user?.user_metadata?.full_name
            || sessionData.session.user?.user_metadata?.name
            || sessionData.session.user?.email?.split("@")[0]
            || "";
          setAnTasks({
            ...tasksConfig,
            filter_active: tasksConfig.filter_active ?? true,
            selected_responsibles: tasksConfig.selected_responsibles?.length
              ? tasksConfig.selected_responsibles
              : (userDisplayName ? [userDisplayName] : []),
          });
          setAnOpen(anConfigResult.data.open);
          const savedResponsibles = anConfigResult.data.selected_responsibles || [];
          setAnSelectedResponsibles(savedResponsibles.length > 0 ? savedResponsibles : (userDisplayName ? [userDisplayName] : []));
          setAnFilterResponsibles(anConfigResult.data.filter_responsibles ?? false);
          if (anConfigResult.data.active_modules) setActiveModules(anConfigResult.data.active_modules);
          if (anConfigResult.data.source_types) {
            setActiveSources(anConfigResult.data.source_types);
            const sources = anConfigResult.data.source_types;
            if (!sources.includes("slack") && activeTab === "slack") {
              setActiveTab("drive");
            }
          } else {
            const sources = SOURCE_TYPES.map(s => s.key);
            if (!sources.includes("slack") && activeTab === "slack") {
              setActiveTab("drive");
            }
          }
        }

        // Load known responsables from tasks
        const tasksResult = await getTasks(wsResult.data.id);
        if (tasksResult.success && tasksResult.data) {
          const responsibles = new Set<string>();
          (tasksResult.data as any[]).forEach((t: any) => {
            if (t.responsible) {
              t.responsible.split("|").map((r: string) => r.trim()).filter(Boolean).forEach((r: string) => responsibles.add(r));
            }
          });
          setAnKnownResponsibles(Array.from(responsibles).sort());
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  // ── Slack ──

  const handleConnectPublicChannel = async () => {
    if (!workspace || !publicChannelIdInput.trim()) return;
    setConnectingPublic(true);
    setPublicChannelError("");
    setPublicChannelSuccess("");

    const verifyResult = await verifyPrivateChannel(publicChannelIdInput.trim());
    const channel = verifyResult.data;
    if (!verifyResult.success || !channel) {
      setPublicChannelError(verifyResult.error || "No se pudo verificar el canal");
      setConnectingPublic(false);
      return;
    }
    if (channel.is_private) {
      setPublicChannelError("Este es un canal privado. Usa la sección 'Conectar Canal Privado'.");
      setConnectingPublic(false);
      return;
    }
    if (channel.is_member) {
      setPublicChannelSuccess(`El bot ya está en #${channel.name}`);
      setPublicChannelIdInput("");
      setConnectingPublic(false);
      await loadChannels(workspace.id);
      return;
    }

    const joinResult = await joinChannel(publicChannelIdInput.trim());
    if (!joinResult.success) {
      setPublicChannelError(joinResult.error || "No se pudo unir al canal");
      setConnectingPublic(false);
      return;
    }

    setPublicChannelSuccess(`Bot conectado a #${channel.name}`);
    setPublicChannelIdInput("");
    setConnectingPublic(false);
    await loadChannels(workspace.id);
  };

  const handleConnectPrivateChannel = async () => {
    if (!workspace || !channelIdInput.trim()) return;
    setConnectingPrivate(true);
    setPrivateChannelError("");
    setPrivateChannelSuccess("");

    const result = await addPrivateChannelToSync(workspace.id, channelIdInput.trim());
    if (!result.success) {
      setPrivateChannelError(result.error || "Error al conectar canal");
      setConnectingPrivate(false);
      return;
    }
    setPrivateChannelSuccess(`Canal #${result.channel?.name} conectado`);
    setChannelIdInput("");
    setConnectingPrivate(false);
    await loadChannels(workspace.id);
    if (result.channel) {
      setChannelPrefs(prev => {
        const next = new Map(prev);
        next.set(result.channel!.id, { enabled: true });
        return next;
      });
    }
  };

  const toggleChannel = (ch: SlackChannel, enabled: boolean) => {
    if (!workspace) return;
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(ch.id, enabled);
      return next;
    });
    setChannelSaveStatus("idle");
  };

  const hasChannelChanges = pendingChanges.size > 0;

  const getEffectiveEnabled = (ch: SlackChannel): boolean => {
    if (pendingChanges.has(ch.id)) return pendingChanges.get(ch.id)!;
    const pref = channelPrefs.get(ch.id);
    if (pref !== undefined) return pref.enabled;
    return true;
  };

  const isChannelEnabled = (ch: SlackChannel): boolean => {
    return getEffectiveEnabled(ch);
  };

  const handleSaveChannels = async () => {
    if (!workspace || pendingChanges.size === 0) return;
    setSavingChannels(true);
    setChannelSaveStatus("idle");
    setChannelSaveMsg("");

    const changes = Array.from(pendingChanges.entries()).map(([channelId, enabled]) => {
      const ch = allChannels.find(c => c.id === channelId);
      return {
        channel_id: channelId,
        channel_name: ch?.name || "unknown",
        is_private: ch?.is_private || false,
        enabled,
      };
    });

    try {
      const response = await fetch("/api/slack/save-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, channels: changes }),
      });
      const result = await response.json();

      if (result.success) {
        // Reload preferences from DB
        const prefsResult = await getChannelPreferences(workspace.id);
        if (prefsResult.success && prefsResult.data) {
          setChannelPrefs(new Map(prefsResult.data.map(p => [p.channel_id, { enabled: p.enabled }])));
        }
        setPendingChanges(new Map());
        setChannelSaveStatus("success");
        setChannelSaveMsg(`${result.saved} canal(es) guardado(s)`);
      } else {
        setChannelSaveStatus("error");
        setChannelSaveMsg(result.error || "Error al guardar");
      }
    } catch (err) {
      setChannelSaveStatus("error");
      setChannelSaveMsg("Error de red al guardar");
    } finally {
      setSavingChannels(false);
    }
  };

  // ── Objetivos ──

  const handleObjSave = async () => {
    if (!workspace) return;
    setObjSaving(true);
    setObjStatus("idle");
    setObjStatusMsg("");

    const result = await updateObjectivesConfig(workspace.id, {
      spreadsheet_id: objSheetId,
      selected_teams: objSelectedTeams,
    });

    if (result.success) {
      setObjStatus("success");
      setObjStatusMsg("Configuración guardada");
    } else {
      setObjStatus("error");
      setObjStatusMsg(result.error || "Error al guardar");
    }
    setObjSaving(false);
  };

  const toggleObjTeam = (team: string) => {
    setObjSelectedTeams(prev =>
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  // ── Métricas ──

  const handleMetSave = async () => {
    if (!workspace) return;
    setMetSaving(true);
    setMetStatus("idle");
    setMetStatusMsg("");

    const result = await updateMetricsConfig(workspace.id, {
      selected_categories: metSelectedCats,
    });

    if (result.success) {
      setMetStatus("success");
      setMetStatusMsg("Configuración guardada");
    } else {
      setMetStatus("error");
      setMetStatusMsg(result.error || "Error al guardar");
    }
    setMetSaving(false);
  };

  const toggleMetCat = (cat: string) => {
    setMetSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // ── Análisis IA ──

  const handleTasksSave = async () => {
    if (!workspace) return;
    setAnTasksSaving(true);
    setAnTasksStatus("idle");
    setAnTasksStatusMsg("");

    const result = await updateAnalysisConfig(workspace.id, {
      tasks: anTasks,
    });
    console.log('⚙️ SETTINGS - SAVE RESULT:', JSON.stringify(result));

    if (result.success) {
      setAnTasksStatus("success");
      setAnTasksStatusMsg("Guardado");
    } else {
      setAnTasksStatus("error");
      setAnTasksStatusMsg(result.error || "Error al guardar");
    }
    setAnTasksSaving(false);
  };

  const handleOpenSave = async () => {
    if (!workspace) return;
    setAnOpenSaving(true);
    setAnOpenStatus("idle");
    setAnOpenStatusMsg("");

    const result = await updateAnalysisConfig(workspace.id, {
      open: anOpen,
      filter_responsibles: anFilterResponsibles,
      selected_responsibles: anSelectedResponsibles,
    });

    if (result.success) {
      setAnOpenStatus("success");
      setAnOpenStatusMsg("Guardado");
    } else {
      setAnOpenStatus("error");
      setAnOpenStatusMsg(result.error || "Error al guardar");
    }
    setAnOpenSaving(false);
  };

  const toggleOpenProduct = (key: string) => {
    setAnOpen(prev => ({
      ...prev,
      selected_products: prev.selected_products.includes(key)
        ? prev.selected_products.filter(c => c !== key)
        : [...prev.selected_products, key],
    }));
  };

  const toggleOpenTeam = (teamKey: string) => {
    const team = ANALYSIS_TEAMS.find(t => t.key === teamKey);
    if (!team) return;
    const teamIsSelected = anOpen.selected_teams.includes(teamKey);
    setAnOpen(prev => {
      const newSelectedTeams = teamIsSelected
        ? prev.selected_teams.filter(t => t !== teamKey)
        : [...prev.selected_teams, teamKey];
      let newSelectedProducts = prev.selected_products;
      if (team.products.length > 0) {
        const allSelected = team.products.every(p => prev.selected_products.includes(p.key));
        newSelectedProducts = allSelected
          ? prev.selected_products.filter(c => !team.products.some(p => p.key === c))
          : [...prev.selected_products, ...team.products.map(p => p.key).filter(k => !prev.selected_products.includes(k))];
      }
      return {
        ...prev,
        selected_teams: newSelectedTeams,
        selected_products: newSelectedProducts,
      };
    });
  };

  const addAnCustomCategory = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || anOpen.custom_categories.includes(trimmed)) return;
    setAnOpen(prev => ({ ...prev, custom_categories: [...prev.custom_categories, trimmed] }));
    setAnCustomInput("");
  };

  const removeAnCustomCategory = (val: string) => {
    setAnOpen(prev => ({ ...prev, custom_categories: prev.custom_categories.filter(c => c !== val) }));
  };

  const toggleAnResponsible = (name: string) => {
    setAnSelectedResponsibles(prev =>
      prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]
    );
  };

  const toggleTasksProduct = (key: string) => {
    setAnTasks(prev => ({
      ...prev,
      selected_products: prev.selected_products.includes(key)
        ? prev.selected_products.filter(c => c !== key)
        : [...prev.selected_products, key],
    }));
  };

  const toggleTasksTeam = (teamKey: string) => {
    const team = ANALYSIS_TEAMS.find(t => t.key === teamKey);
    if (!team) return;
    const teamIsSelected = anTasks.selected_teams.includes(teamKey);
    setAnTasks(prev => {
      const newSelectedTeams = teamIsSelected
        ? prev.selected_teams.filter(t => t !== teamKey)
        : [...prev.selected_teams, teamKey];
      let newSelectedProducts = prev.selected_products;
      if (team.products.length > 0) {
        if (teamIsSelected) {
          // Desactivar: quitar productos de este equipo
          newSelectedProducts = prev.selected_products.filter(c => !team.products.some(p => p.key === c));
        } else {
          // Activar: agregar productos de este equipo
          newSelectedProducts = [...prev.selected_products, ...team.products.map(p => p.key).filter(k => !prev.selected_products.includes(k))];
        }
      }
      return {
        ...prev,
        selected_teams: newSelectedTeams,
        selected_products: newSelectedProducts,
      };
    });
  };

  const addAnTasksResponsible = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAnTasks(prev => ({
      ...prev,
      selected_responsibles: prev.selected_responsibles?.includes(trimmed)
        ? prev.selected_responsibles
        : [...(prev.selected_responsibles || []), trimmed],
    }));
  };

  const removeAnTasksResponsible = (name: string) => {
    setAnTasks(prev => ({
      ...prev,
      selected_responsibles: (prev.selected_responsibles || []).filter(r => r !== name),
    }));
  };

  const addAnTasksCustomCategory = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || (anTasks.custom_categories || []).includes(trimmed)) return;
    setAnTasks(prev => ({ ...prev, custom_categories: [...(prev.custom_categories || []), trimmed] }));
    setAnTasksCustomInput("");
  };

  const removeAnTasksCustomCategory = (val: string) => {
    setAnTasks(prev => ({ ...prev, custom_categories: (prev.custom_categories || []).filter(c => c !== val) }));
  };

  const startEditTasksCat = (val: string) => {
    setAnTasksEditingCat(val);
    setAnTasksEditingCatVal(val);
  };

  const saveEditTasksCat = () => {
    const trimmed = anTasksEditingCatVal.trim();
    if (!trimmed || anTasksEditingCat === null) { setAnTasksEditingCat(null); return; }
    setAnTasks(prev => ({
      ...prev,
      custom_categories: (prev.custom_categories || []).map(c => c === anTasksEditingCat ? trimmed : c),
    }));
    setAnTasksEditingCat(null);
  };

  const startEditOpenCat = (val: string) => {
    setAnEditingCat(val);
    setAnEditingCatVal(val);
  };

  const saveEditOpenCat = () => {
    const trimmed = anEditingCatVal.trim();
    if (!trimmed || anEditingCat === null) { setAnEditingCat(null); return; }
    setAnOpen(prev => ({
      ...prev,
      custom_categories: prev.custom_categories.map(c => c === anEditingCat ? trimmed : c),
    }));
    setAnEditingCat(null);
  };

  // ── Jira ──

  const handleTestJira = async () => {
    setJiraStatus("testing");
    setJiraError("");
    setJiraUserData(null);
    const result = await testJiraConnection(jiraConfig);
    if (result.success) {
      setJiraStatus("success");
      setJiraUserData(result.data);
    } else {
      setJiraStatus("error");
      setJiraError(result.error || "Error desconocido");
    }
  };

  const handleSaveJira = async () => {
    if (!workspace) return;
    setJiraSaving(true);
    const result = await updateWorkspaceJiraConfig(workspace.id, jiraConfig);
    if (!result.success) setJiraError(result.error || "Error al guardar");
    setJiraSaving(false);
  };

  // ── Módulos ──
  const handleModulesSave = async () => {
    if (!workspace) return;
    setModulesSaving(true);
    setModulesStatus("idle");
    setModulesStatusMsg("");
    const result = await updateAnalysisConfig(workspace.id, { active_modules: activeModules, source_types: activeSources });
    if (result.success) {
      setModulesStatus("success");
      setModulesStatusMsg("Módulos guardados");
    } else {
      setModulesStatus("error");
      setModulesStatusMsg(result.error || "Error al guardar");
    }
    setModulesSaving(false);
  };

  // ── Gemini ──
  const handleSaveGemini = async () => {
    if (!workspace) return;
    setGeminiSaving(true);
    setGeminiStatus("idle");
    setGeminiStatusMsg("");
    const result = await updateWorkspaceGeminiKey(workspace.id, geminiApiKey);
    if (result.success) {
      setGeminiStatus("success");
      setGeminiStatusMsg("Clave API guardada correctamente");
    } else {
      setGeminiStatus("error");
      setGeminiStatusMsg(result.error || "Error al guardar");
    }
    setGeminiSaving(false);
  };

  // ── Drive / Fuentes ──
  const handleDriveSave = async () => {
    if (!workspace) return;
    setDriveSaving(true);
    await updateAnalysisConfig(workspace.id, { source_types: activeSources });
    setDriveSaving(false);
  };

  const tabs = [
    { id: "modulos" as TabType, label: "Módulos" },
    { id: "drive" as TabType, label: "Fuentes" },
    { id: "gemini" as TabType, label: "Gemini AI" },
    { id: "analisis" as TabType, label: "Análisis IA" },
    { id: "objetivos" as TabType, label: "Objetivos" },
    { id: "metricas" as TabType, label: "Métricas" },
    { id: "jira" as TabType, label: "Jira" },
    ...(activeSources.includes("slack") ? [{ id: "slack" as TabType, label: "Slack" }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Configuración</h1>
        <p className="text-white/60 text-sm">Administra tus integraciones y fuentes de datos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? "text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Slack ── */}
      {activeTab === "slack" && (
        <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#E01E5A">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.521-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-white">Slack</h2>
              <p className="text-xs text-white/40">Selecciona los canales que Nexión debe monitorear como fuentes</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/70">Canales disponibles ({allChannels.length})</h3>
            <button
              onClick={() => workspace && loadChannels(workspace.id)}
              disabled={syncingChannels}
              className="p-1.5 text-white/20 hover:text-primary transition-colors bg-card border border-white/10 rounded-lg shadow-sm disabled:opacity-40"
              title="Sincronizar canales"
            >
              {syncingChannels ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              )}
            </button>
          </div>
          {allChannels.length === 0 && (
            <p className="text-sm text-white/40 py-4">No hay canales conectados. Usa el formulario "Conectar Canal Público" o invita a @Nexion a un canal y sincroniza.</p>
          )}
          {allChannels.map(ch => {
            const enabled = getEffectiveEnabled(ch);
            const isPending = pendingChanges.has(ch.id);
            const willEnable = pendingChanges.get(ch.id);
            return (
              <div key={ch.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors ${isPending ? 'bg-primary/5' : ''}`}>
                <button
                  onClick={() => toggleChannel(ch, !enabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    enabled ? "bg-primary" : "bg-white/10"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
                <div className={`w-2 h-2 rounded-full ${ch.is_private ? "bg-yellow-400" : "bg-green-400"}`} />
                <span className="text-sm text-white flex-1">#{ch.name}</span>
                <span className="text-[10px] text-white/30">{ch.is_private ? "Privado" : "Público"}</span>
                {isPending && (
                  <span className="text-[9px] text-primary font-mono">
                    {willEnable ? "← activar" : "← desactivar"}
                  </span>
                )}
              </div>
            );
          })}

          {/* Save button — always visible */}
          <div className="flex items-center gap-3 pt-6 mt-4 border-t border-white/10">
            <button
              onClick={handleSaveChannels}
              disabled={savingChannels || !hasChannelChanges}
              className={`px-5 py-2.5 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all flex items-center gap-2 ${
                hasChannelChanges
                  ? "bg-primary text-white hover:bg-primary/80"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
            >
              {savingChannels ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  {hasChannelChanges ? `Guardar Cambios (${pendingChanges.size})` : "Guardar"}
                </>
              )}
            </button>
            {hasChannelChanges && (
              <button
                onClick={() => setPendingChanges(new Map())}
                disabled={savingChannels}
                className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            )}
            {channelSaveStatus === "success" && (
              <span className="text-[10px] text-green-400 font-mono">{channelSaveMsg}</span>
            )}
            {channelSaveStatus === "error" && (
              <span className="text-[10px] text-red-400 font-mono">{channelSaveMsg}</span>
            )}
          </div>

          {/* Conectar Canales */}
          <div className="mt-10 pt-8 border-t border-white/10 space-y-8">
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-3">Conectar Canal Público</h3>
              <p className="text-xs text-white/40 mb-4">
                Pega el ID de un canal público para que el bot se una automáticamente.
                Para obtener el ID: abre el canal en Slack, ve a <strong>Acerca de</strong> y copia el ID.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="ID del canal público (C...)"
                  value={publicChannelIdInput}
                  onChange={(e) => setPublicChannelIdInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleConnectPublicChannel}
                  disabled={connectingPublic}
                  className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-lg hover:bg-primary/80 transition-all disabled:opacity-50"
                >
                  {connectingPublic ? "Conectando..." : "Conectar"}
                </button>
              </div>
              {publicChannelError && <p className="text-xs text-red-400 mt-2">{publicChannelError}</p>}
              {publicChannelSuccess && <p className="text-xs text-green-400 mt-2">{publicChannelSuccess}</p>}
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-3">Conectar Canal Privado</h3>
              <p className="text-xs text-white/40 mb-4">
                Invita al bot <code className="text-primary">@Nexion</code> al canal privado en Slack,
                luego pega el ID del canal aquí. Para obtener el ID: abre el canal, ve a <strong>Acerca de</strong> y copia el ID.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="ID del canal privado (C...)"
                  value={channelIdInput}
                  onChange={(e) => setChannelIdInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleConnectPrivateChannel}
                  disabled={connectingPrivate}
                  className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-lg hover:bg-primary/80 transition-all disabled:opacity-50"
                >
                  {connectingPrivate ? "Verificando..." : "Conectar"}
                </button>
              </div>
              {privateChannelError && <p className="text-xs text-red-400 mt-2">{privateChannelError}</p>}
              {privateChannelSuccess && <p className="text-xs text-green-400 mt-2">{privateChannelSuccess}</p>}
            </div>
          </div>
        </section>
      )}

      {/* ── Tab: Google Drive ── */}
      {activeTab === "drive" && (
        <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#4285F4">
              <path d="M12 2L2 18l4 4 6-11 6 11 4-4L12 2z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-white">Google Drive</h2>
              <p className="text-xs text-white/40">Archivos sincronizados como fuentes</p>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <p className="text-xs text-white/40 mb-1">Cuenta conectada</p>
            <p className="text-sm text-white font-mono">{user?.email || "—"}</p>
          </div>
          <p className="text-sm text-white/50 mb-4">
            Los archivos modificados hoy en tu Drive se sincronizan automáticamente como fuentes.
            La conexión usa tu cuenta de Google autenticada al iniciar sesión — no requiere configuración adicional.
          </p>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mb-10">
            <p className="text-xs text-primary font-bold mb-1">✓ Funciona con tu inicio de sesión de Google</p>
            <p className="text-xs text-white/40">
              Nexión usa los scopes de Google Drive que autorizaste al iniciar sesión. No necesitas API keys adicionales.
            </p>
          </div>

          <div className="border-t border-white/10 pt-8">
            <h3 className="text-sm font-semibold text-white mb-1.5">Tipos de fuentes</h3>
            <p className="text-xs text-white/40 mb-4">Selecciona qué tipos de fuentes quieres que Nexión analice. Las fuentes no seleccionadas se ocultarán de la configuración.</p>
            <div className="space-y-3 max-w-lg">
              {SOURCE_TYPES.map(st => {
                const active = activeSources.includes(st.key);
                return (
                  <div key={st.key} className="flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all bg-white/5 border-white/10">
                    <button
                      onClick={() => setActiveSources(prev =>
                        prev.includes(st.key) ? prev.filter(s => s !== st.key) : [...prev, st.key]
                      )}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                        active ? "bg-primary" : "bg-white/10"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                        active ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                    <div>
                      <p className={`text-sm font-medium ${active ? "text-white" : "text-white/40"}`}>{st.label}</p>
                      <p className={`text-xs ${active ? "text-white/40" : "text-white/20"}`}>{st.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleDriveSave}
                disabled={driveSaving}
                className="px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {driveSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Tab: Jira ── */}
      {activeTab === "jira" && (
        <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0052CC">
              <path d="M11.99 2C10.34 2 9 3.34 9 5.01V8H5.01C3.34 8 2 9.34 2 11.01V19c0 1.66 1.34 3 3.01 3H19c1.66 0 3-1.34 3-3V5.01C22 3.34 20.66 2 19 2h-7.01z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-white">Jira</h2>
              <p className="text-xs text-white/40">Configuración de conexión Jira</p>
            </div>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Jira Site URL</label>
              <input
                type="text"
                placeholder="https://tu-dominio.atlassian.net"
                value={jiraConfig.siteUrl}
                onChange={(e) => setJiraConfig({ ...jiraConfig, siteUrl: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Email</label>
              <input
                type="email"
                placeholder="email@tu-empresa.com"
                value={jiraConfig.email}
                onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">API Token</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={jiraConfig.apiToken}
                onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary mt-1"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestJira}
                disabled={jiraStatus === "testing"}
                className="px-4 py-2 border border-white/20 text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-white/5 transition-all disabled:opacity-50"
              >
                {jiraStatus === "testing" ? "Probando..." : "Probar Conexión"}
              </button>
              <button
                onClick={handleSaveJira}
                disabled={jiraSaving}
                className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {jiraSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>

            {jiraStatus === "success" && jiraUserData && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-xs text-green-400 font-bold">✓ Conexión exitosa</p>
                <p className="text-xs text-white/50 mt-1">{jiraUserData.displayName} — {jiraUserData.email}</p>
              </div>
            )}
            {jiraStatus === "error" && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-xs text-red-400 font-bold">Error: {jiraError}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Tab: Módulos ── */}
      {activeTab === "modulos" && (
        <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-white">Módulos</h2>
              <p className="text-xs text-white/40">Selecciona qué módulos quieres mostrar en la navegación</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs text-white/40 mb-4">Estos módulos aparecerán en el menú de navegación lateral.</p>
          </div>
          <div className="space-y-3 max-w-lg mb-10">
            {MODULES.map(mod => {
              const active = activeModules.includes(mod.key);
              return (
                <div key={mod.key} className="flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all bg-white/5 border-white/10">
                  <button
                    onClick={() => setActiveModules(prev =>
                      prev.includes(mod.key) ? prev.filter(m => m !== mod.key) : [...prev, mod.key]
                    )}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                      active ? "bg-primary" : "bg-white/10"
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                      active ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                  <div>
                    <p className={`text-sm font-medium ${active ? "text-white" : "text-white/40"}`}>{mod.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-6 mt-4 border-t border-white/10">
            <button
              onClick={handleModulesSave}
              disabled={modulesSaving}
              className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
            >
              {modulesSaving ? "Guardando..." : "Guardar"}
            </button>
            {modulesStatus === "success" && (
              <span className="text-xs text-green-400">{modulesStatusMsg}</span>
            )}
            {modulesStatus === "error" && (
              <span className="text-xs text-red-400">{modulesStatusMsg}</span>
            )}
          </div>
        </section>
      )}

      {/* ── Tab: Gemini ── */}
      {activeTab === "gemini" && (
        <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2ec6ff" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M6 12h12" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-white">Gemini AI</h2>
              <p className="text-xs text-white/40">Configura tu propia clave de API de Google Gemini</p>
            </div>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary mt-1 font-mono"
              />
              <p className="text-[10px] text-white/30 mt-2 ml-1">
                Cada usuario debe usar su propia clave gratuita de{" "}
                <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google AI Studio
                </a>.
                Si no configuras una, se usará la clave global del sistema.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveGemini}
                disabled={geminiSaving}
                className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {geminiSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>

            {geminiStatus === "success" && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-xs text-green-400 font-bold">✓ {geminiStatusMsg}</p>
              </div>
            )}
            {geminiStatus === "error" && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-xs text-red-400 font-bold">Error: {geminiStatusMsg}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Tab: Objetivos ── */}
      {activeTab === "objetivos" && (
        <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f49e04" strokeWidth="1.8">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-white">Objetivos</h2>
              <p className="text-xs text-white/40">Archivo fuente de OKRs</p>
            </div>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Google Sheet ID</label>
              <input
                type="text"
                placeholder="ID del spreadsheet de Google Sheets"
                value={objSheetId}
                onChange={(e) => setObjSheetId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary mt-1"
              />
            </div>

            {objAvailableTeams.length > 0 && (
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Equipos visibles</label>
                <p className="text-[10px] text-white/30 ml-1 mt-1 mb-3">
                  Selecciona qué equipos mostrar en el módulo de objetivos. Si no seleccionas ninguno, se muestran todos.
                </p>
                <div className="space-y-2">
                  {objAvailableTeams.map(team => {
                    const enabled = objSelectedTeams.length === 0 || objSelectedTeams.includes(team);
                    return (
                      <div key={team} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                        <button
                          onClick={() => toggleObjTeam(team)}
                          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                            enabled ? "bg-primary" : "bg-white/10"
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                            enabled ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                        <span className="text-sm text-white">{team}</span>
                      </div>
                    );
                  })}
                </div>
                {objSelectedTeams.length > 0 && (
                  <button
                    onClick={() => setObjSelectedTeams([])}
                    className="mt-2 text-[9px] text-white/20 hover:text-white/40 transition-colors"
                  >
                    Mostrar todos
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleObjSave}
                disabled={objSaving}
                className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {objSaving ? "Guardando..." : "Guardar"}
              </button>
              {objStatus === "success" && (
                <span className="text-xs text-green-400">{objStatusMsg}</span>
              )}
              {objStatus === "error" && (
                <span className="text-xs text-red-400">{objStatusMsg}</span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Tab: Métricas ── */}
      {activeTab === "metricas" && (
        <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 4-6" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-white">Métricas</h2>
              <p className="text-xs text-white/40">Selecciona qué equipos mostrar en el módulo de métricas</p>
            </div>
          </div>

          <div className="space-y-4 max-w-lg">
            {metAvailableCats.length > 0 ? (
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Categorías visibles</label>
                <p className="text-[10px] text-white/30 ml-1 mt-1 mb-3">
                  Selecciona qué categorías mostrar como tabs en el módulo de métricas. La pestaña "General" siempre se muestra.
                  Si no seleccionas ninguna, se muestran todas las categorías.
                </p>
                <div className="space-y-2">
                  {metAvailableCats.map(cat => {
                    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
                    const enabled = metSelectedCats.length === 0 || metSelectedCats.includes(cat);
                    return (
                      <div key={cat} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                        <button
                          onClick={() => toggleMetCat(cat)}
                          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                            enabled ? "bg-primary" : "bg-white/10"
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                            enabled ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                        <span className="text-sm text-white">{label}</span>
                      </div>
                    );
                  })}
                </div>
                {metSelectedCats.length > 0 && (
                  <button
                    onClick={() => setMetSelectedCats([])}
                    className="mt-2 text-[9px] text-white/20 hover:text-white/40 transition-colors"
                  >
                    Mostrar todas
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-white/40">No hay categorías de métricas disponibles. Puedes sembrar métricas desde el módulo de Métricas para que aparezcan aquí.</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleMetSave}
                disabled={metSaving}
                className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {metSaving ? "Guardando..." : "Guardar"}
              </button>
              {metStatus === "success" && (
                <span className="text-xs text-green-400">{metStatusMsg}</span>
              )}
              {metStatus === "error" && (
                <span className="text-xs text-red-400">{metStatusMsg}</span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Tab: Análisis IA ── */}
      {activeTab === "analisis" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Card 1: Tareas ── */}
          <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <div>
                <h2 className="text-base font-semibold text-white">Tareas</h2>
                <p className="text-[10px] text-white/40">Categorías predefinidas del producto</p>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Productos para generar tareas</label>
              <p className="text-[10px] text-white/30 ml-1 mt-1 mb-3">
                Selecciona productos. Si no seleccionas ninguno, se consideran todos.
              </p>
              <div className="space-y-4">
                {ANALYSIS_TEAMS.map(team => {
                  const teamIsSelected = anTasks.selected_teams.includes(team.key);
                  const allSelected = teamIsSelected;
                  const noneSelected = !teamIsSelected;
                  return (
                    <div key={team.key}>
                      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] mb-1">
                        <button
                          onClick={() => toggleTasksTeam(team.key)}
                          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                            allSelected ? "bg-primary" : "bg-white/10"
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                            allSelected ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                        <span className="text-xs font-bold text-white font-mono uppercase tracking-widest" style={{ color: team.color }}>
                          {team.label}
                        </span>
                      </div>
                      {team.products.length > 0 && (
                        <div className="ml-8 space-y-1">
                          {team.products.map(prod => {
                            const productSelected = anTasks.selected_products.includes(prod.key);
                            return (
                              <div key={prod.key} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                <button
                                  onClick={() => toggleTasksProduct(prod.key)}
                                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                                    productSelected ? "bg-primary" : "bg-white/10"
                                  }`}
                                >
                                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
                                    productSelected ? "translate-x-4" : "translate-x-0"
                                  }`} />
                                </button>
                                <span className="text-sm text-white/80">{prod.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {anTasks.selected_products.length > 0 && (
                <button
                  onClick={() => setAnTasks({ selected_products: [], selected_teams: [], filter_teams: true })}
                  className="mt-2 text-[9px] text-white/20 hover:text-white/40 transition-colors"
                >
                  Considerar todos los productos
                </button>
              )}
            </div>

            {/* Tasks custom categories */}
            <div className="border-t border-white/5 pt-4 mt-4">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Categorías personalizadas</label>
              <p className="text-[9px] text-white/20 ml-1 mt-1 mb-2">
                Agrega palabras clave adicionales para categorizar tareas
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Ej: UX, onboarding, churn"
                  value={anTasksCustomInput}
                  onChange={(e) => setAnTasksCustomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAnTasksCustomCategory(anTasksCustomInput); } }}
                  className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => addAnTasksCustomCategory(anTasksCustomInput)}
                  className="px-3 py-2 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white/5 transition-all"
                >
                  Agregar
                </button>
              </div>
              {(anTasks.custom_categories || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(anTasks.custom_categories || []).map((c, i) => (
                    anTasksEditingCat === c ? (
                      <div key={c + i} className="flex gap-1">
                        <input
                          type="text"
                          value={anTasksEditingCatVal}
                          onChange={(e) => setAnTasksEditingCatVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEditTasksCat(); if (e.key === "Escape") setAnTasksEditingCat(null); }}
                          onBlur={saveEditTasksCat}
                          className="w-28 px-2 py-1.5 rounded-lg text-[10px] border border-primary/50 bg-white/5 text-white focus:outline-none"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div
                        key={c + i}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[#2ec6ff]/20 border border-[#2ec6ff]/30 text-[#2ec6ff] flex items-center gap-1"
                      >
                        <span className="cursor-pointer hover:text-white transition-colors" onClick={() => startEditTasksCat(c)}>{c}</span>
                        <button onClick={() => removeAnTasksCustomCategory(c)} className="hover:text-white transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Tasks responsibles filter — last */}
            <div className="border-t border-white/5 pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Filtrar por responsable</label>
                  <p className="text-[9px] text-white/20 mt-0.5">Aplica a tareas.</p>
                </div>
                <button
                  onClick={() => setAnTasks(prev => ({ ...prev, filter_active: !prev.filter_active }))}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    anTasks.filter_active ? "bg-primary" : "bg-white/10"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    anTasks.filter_active ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {anTasks.filter_active && (
                <div className="mb-4">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Nombre del responsable"
                      value={anTasksResponsibleInput}
                      onChange={e => setAnTasksResponsibleInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addAnTasksResponsible(anTasksResponsibleInput); setAnTasksResponsibleInput(""); } }}
                      className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => { addAnTasksResponsible(anTasksResponsibleInput); setAnTasksResponsibleInput(""); }}
                      className="px-3 py-2 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white/5 transition-all"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(anTasks.selected_responsibles || []).map(r => (
                      <button
                        key={r}
                        onClick={() => removeAnTasksResponsible(r)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-primary/20 border border-primary/30 text-primary transition-all flex items-center gap-1"
                      >
                        {r}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  {anKnownResponsibles.length > 0 && (
                    <div>
                      <p className="text-[9px] text-white/30 mb-2">Seleccionar existentes:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {anKnownResponsibles.filter(r => !(anTasks.selected_responsibles || []).includes(r)).slice(0, 30).map(r => (
                          <button
                            key={r}
                            onClick={() => addAnTasksResponsible(r)}
                            className="px-2 py-1 rounded-lg text-[10px] font-medium border bg-white/5 border-white/10 text-white/50 hover:text-white transition-all"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-4 mt-4 flex items-center gap-3">
              <button
                onClick={handleTasksSave}
                disabled={anTasksSaving}
                className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {anTasksSaving ? "Guardando..." : "Guardar"}
              </button>
              {anTasksStatus === "success" && (
                <span className="text-xs text-green-400">{anTasksStatusMsg}</span>
              )}
              {anTasksStatus === "error" && (
                <span className="text-xs text-red-400">{anTasksStatusMsg}</span>
              )}
            </div>
          </section>

          {/* ── Card 2: Insights, Metrics, Alerts ── */}
          <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2ec6ff" strokeWidth="1.8">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <div>
                <h2 className="text-base font-semibold text-white">Insights, Métricas, Alertas</h2>
                <p className="text-[10px] text-white/40">Categorías abiertas — todas activas por defecto</p>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Productos para insights, métricas, alertas</label>
              <p className="text-[10px] text-white/30 ml-1 mt-1 mb-3">
                Todas las categorías están activas por defecto. Puedes restringir a productos específicos si lo deseas.
              </p>
              <div className="space-y-4">
                {ANALYSIS_TEAMS.map(team => {
                  const hasProducts = team.products.length > 0;
                  const selectedCount = team.products.filter(p => anOpen.selected_products.includes(p.key)).length;
                  const allSelected = hasProducts
                    ? selectedCount === team.products.length
                    : anOpen.selected_teams.includes(team.key);
                  const noneSelected = hasProducts
                    ? selectedCount === 0
                    : !anOpen.selected_teams.includes(team.key);
                  return (
                    <div key={team.key}>
                      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] mb-1">
                        <button
                          onClick={() => toggleOpenTeam(team.key)}
                          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                            allSelected ? "bg-primary" : noneSelected ? "bg-white/10" : "bg-primary/50"
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                            allSelected ? "translate-x-5" : "translate-x-0"
                          }`} />
                          {!allSelected && !noneSelected && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="w-2 h-0.5 bg-white rounded" />
                            </span>
                          )}
                        </button>
                        <span className="text-xs font-bold text-white font-mono uppercase tracking-widest" style={{ color: team.color }}>
                          {team.label}
                        </span>
                        {hasProducts && !allSelected && !noneSelected && (
                          <span className="text-[9px] text-white/30 font-mono">{selectedCount}/{team.products.length}</span>
                        )}
                      </div>
                      {hasProducts && (
                        <div className="ml-8 space-y-1">
                          {team.products.map(prod => {
                            const productSelected = anOpen.selected_products.includes(prod.key);
                            return (
                              <div key={prod.key} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                <button
                                  onClick={() => toggleOpenProduct(prod.key)}
                                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                                    productSelected ? "bg-primary" : "bg-white/10"
                                  }`}
                                >
                                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
                                    productSelected ? "translate-x-4" : "translate-x-0"
                                  }`} />
                                </button>
                                <span className="text-sm text-white/80">{prod.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {anOpen.selected_products.length > 0 && (
                <button
                  onClick={() => setAnOpen({ ...anOpen, selected_products: [], selected_teams: [] })}
                  className="mt-2 text-[9px] text-white/20 hover:text-white/40 transition-colors"
                >
                  Considerar todos los productos
                </button>
              )}

              {/* Custom categories */}
              <div className="mt-5">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Categorías personalizadas</label>
                <p className="text-[9px] text-white/20 ml-1 mt-1 mb-2">
                  Agrega palabras clave adicionales para categorizar insights, métricas o alertas
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Ej: UX, onboarding, churn"
                    value={anCustomInput}
                    onChange={(e) => setAnCustomInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAnCustomCategory(anCustomInput); } }}
                    className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => addAnCustomCategory(anCustomInput)}
                    className="px-3 py-2 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white/5 transition-all"
                  >
                    Agregar
                  </button>
                </div>
                {anOpen.custom_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {anOpen.custom_categories.map(c => (
                      anEditingCat === c ? (
                        <div key={c} className="flex gap-1">
                          <input
                            type="text"
                            value={anEditingCatVal}
                            onChange={(e) => setAnEditingCatVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEditOpenCat(); if (e.key === "Escape") setAnEditingCat(null); }}
                            onBlur={saveEditOpenCat}
                            className="w-28 px-2 py-1.5 rounded-lg text-[10px] border border-primary/50 bg-white/5 text-white focus:outline-none"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div
                          key={c}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[#2ec6ff]/20 border border-[#2ec6ff]/30 text-[#2ec6ff] flex items-center gap-1"
                        >
                          <span className="cursor-pointer hover:text-white transition-colors" onClick={() => startEditOpenCat(c)}>{c}</span>
                          <button onClick={() => removeAnCustomCategory(c)} className="hover:text-white transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Responsibles — inside the right card */}
            <div className="border-t border-white/5 pt-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Filtrar por responsable</label>
                  <p className="text-[9px] text-white/20 mt-0.5">Aplica a tareas e insights.</p>
                </div>
                <button
                  onClick={() => setAnFilterResponsibles(!anFilterResponsibles)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    anFilterResponsibles ? "bg-primary" : "bg-white/10"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    anFilterResponsibles ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {anFilterResponsibles && (
                <div className="mb-4">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Nombre del responsable"
                      value={anResponsibleInput}
                      onChange={e => setAnResponsibleInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); toggleAnResponsible(anResponsibleInput); setAnResponsibleInput(""); } }}
                      className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => { toggleAnResponsible(anResponsibleInput); setAnResponsibleInput(""); }}
                      className="px-3 py-2 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white/5 transition-all"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {anSelectedResponsibles.map(r => (
                      <button
                        key={r}
                        onClick={() => toggleAnResponsible(r)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-primary/20 border border-primary/30 text-primary transition-all flex items-center gap-1"
                      >
                        {r}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  {anKnownResponsibles.length > 0 && (
                    <div>
                      <p className="text-[9px] text-white/30 mb-2">Seleccionar existentes:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {anKnownResponsibles.filter(r => !anSelectedResponsibles.includes(r)).slice(0, 40).map(r => (
                          <button
                            key={r}
                            onClick={() => toggleAnResponsible(r)}
                            className="px-2 py-1 rounded-lg text-[10px] font-medium border bg-white/5 border-white/10 text-white/50 hover:text-white transition-all"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-4 flex items-center gap-3">
              <button
                onClick={handleOpenSave}
                disabled={anOpenSaving}
                className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {anOpenSaving ? "Guardando..." : "Guardar"}
              </button>
              {anOpenStatus === "success" && (
                <span className="text-xs text-green-400">{anOpenStatusMsg}</span>
              )}
              {anOpenStatus === "error" && (
                <span className="text-xs text-red-400">{anOpenStatusMsg}</span>
              )}
            </div>
          </section>
        </div>
      )}


    </div>
  );
}
