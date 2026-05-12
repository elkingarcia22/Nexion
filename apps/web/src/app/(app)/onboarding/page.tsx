"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ANALYSIS_TEAMS, ALL_PRODUCTS, MODULES, SOURCE_TYPES } from "@/lib/services/analysis-config-service";

type Step = "profile" | "teams" | "products" | "fuentes" | "gemini" | "jira" | "slack" | "modules" | "complete";

const STEPS: { key: Step; label: string }[] = [
  { key: "profile", label: "Tu perfil" },
  { key: "teams", label: "Equipos" },
  { key: "products", label: "Productos" },
  { key: "fuentes", label: "Fuentes" },
  { key: "gemini", label: "Gemini AI" },
  { key: "jira", label: "Jira" },
  { key: "slack", label: "Slack" },
  { key: "modules", label: "Módulos" },
  { key: "complete", label: "¡Listo!" },
];

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {STEPS.slice(0, -1).map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i < current ? "bg-green-400" : i === current ? "bg-primary" : "bg-white/10"
            }`}
          />
          {i < STEPS.length - 2 && (
            <div className={`w-6 sm:w-10 h-0.5 transition-colors duration-300 ${i < current ? "bg-green-400/50" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("profile");
  const [workspace, setWorkspace] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [mainName, setMainName] = useState("");
  const [aliases, setAliases] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [jiraSiteUrl, setJiraSiteUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraTesting, setJiraTesting] = useState(false);
  const [jiraTestResult, setJiraTestResult] = useState<"idle" | "ok" | "error">("idle");

  const [selectedSources, setSelectedSources] = useState<string[]>(SOURCE_TYPES.map(s => s.key));
  const [selectedModules, setSelectedModules] = useState<string[]>(MODULES.map(m => m.key));
  const [slackChannels, setSlackChannels] = useState<any[]>([]);
  const [slackPrefs, setSlackPrefs] = useState<Map<string, boolean>>(new Map());
  const [slackLoading, setSlackLoading] = useState(false);
  const [publicChannelId, setPublicChannelId] = useState("");
  const [privateChannelId, setPrivateChannelId] = useState("");
  const prevStep = useRef<Step>("profile");

  useEffect(() => {
    if (currentStep === "products" && prevStep.current === "teams" && selectedTeams.length > 0) {
      const teamKeys = ANALYSIS_TEAMS
        .filter(t => selectedTeams.includes(t.key))
        .flatMap(t => t.products.map(p => p.key));
      setSelectedProducts([...new Set(teamKeys)]);
    }
    prevStep.current = currentStep;
  }, [currentStep]);

  const loadSlack = useCallback(async (wsId: string) => {
    setSlackLoading(true);
    try {
      const channelsRes = await fetch("/api/slack?action=my-channels").then(r => r.json());
      const publicChs = (channelsRes.success && channelsRes.data) ? channelsRes.data : [];
      const prefsRes = await supabase.from("app_slack_channels").select("*").eq("workspace_id", wsId);
      const prefsData = prefsRes.data || [];
      const prefsMap = new Map<string, boolean>();
      prefsData.forEach((p: any) => prefsMap.set(p.channel_id, p.enabled));
      const seen = new Set<string>();
      const merged = [...publicChs.filter((c: any) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })];
      prefsData.forEach((p: any) => {
        if (!seen.has(p.channel_id)) {
          merged.push({ id: p.channel_id, name: p.channel_name, is_private: p.is_private, is_channel: true, is_member: true });
          seen.add(p.channel_id);
        }
      });
      setSlackChannels(merged);
      setSlackPrefs(prefsMap);
    } catch (e) {
      console.error("Error loading Slack:", e);
    }
    setSlackLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        router.push("/auth/login");
        return;
      }
      setUser(sessionData.session.user);
      const name = sessionData.session.user.user_metadata?.full_name
        || sessionData.session.user.user_metadata?.name
        || sessionData.session.user.email?.split("@")[0]
        || "";
      setMainName(name);

      const { data: profile } = await supabase.from("profiles").select("workspace_id").eq("id", sessionData.session.user.id).single();
      if (!profile) {
        router.push("/auth/login");
        return;
      }
      const { data: ws } = await supabase.from("workspaces").select("*").eq("id", profile.workspace_id).single();
      if (ws) {
        if ((ws as any).analysis_config?.onboarding_completed) {
          router.push("/day/today");
          return;
        }
        setWorkspace(ws);
        const ac = (ws as any).analysis_config || {};
        if (ac.onboarding_name) setMainName(ac.onboarding_name);
        if (ac.selected_responsibles?.length > 0) {
          const [main, ...rest] = ac.selected_responsibles.filter(Boolean);
          if (main) setMainName(main);
          if (rest.length > 0) setAliases(rest.join(", "));
        }
        if (ac.tasks?.selected_teams?.length > 0) setSelectedTeams(ac.tasks.selected_teams);
        if (ac.tasks?.selected_products?.length > 0) setSelectedProducts(ac.tasks.selected_products);
        if (ac.gemini_api_key) setApiKey(ac.gemini_api_key);
        if (ac.active_modules) setSelectedModules(ac.active_modules);
        if (ac.source_types) setSelectedSources(ac.source_types);
        if (ac.onboarding_step === 1) setCurrentStep("teams");
        else if (ac.onboarding_step === 2) setCurrentStep("products");
        else if (ac.onboarding_step === 3) setCurrentStep("fuentes");
        else if (ac.onboarding_step === 4) setCurrentStep("gemini");
        else if (ac.onboarding_step === 5) setCurrentStep("jira");
        else if (ac.onboarding_step === 6) setCurrentStep("slack");
        else if (ac.onboarding_step === 7) setCurrentStep("modules");
        else if (ac.onboarding_step === 8) setCurrentStep("complete");
      }
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    if (workspace && currentStep === "slack") {
      loadSlack(workspace.id);
    }
  }, [currentStep, workspace, loadSlack]);

  const saveStep = async (step: Step, data: any) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace!.id, step, data }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const goNext = async (step: Step, data: any) => {
    await saveStep(step, data);
    if (error) return;
    const idx = STEPS.findIndex(s => s.key === step);
    for (let i = idx + 1; i < STEPS.length; i++) {
      const next = STEPS[i].key;
      if (next === "slack" && !selectedSources.includes("slack")) continue;
      setCurrentStep(next);
      return;
    }
  };

  const goBack = (from: Step) => {
    const idx = STEPS.findIndex(s => s.key === from);
    for (let i = idx - 1; i >= 0; i--) {
      const prev = STEPS[i].key;
      if (prev === "slack" && !selectedSources.includes("slack")) continue;
      setCurrentStep(prev);
      return;
    }
  };

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const stepLabel = STEPS.find(s => s.key === currentStep)?.label || "";

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Configura tu workspace</h1>
        <p className="text-white/50 mt-1.5 text-sm">
          Paso {stepIndex + 1} de {STEPS.length} &mdash; {stepLabel}
        </p>
      </div>

      <ProgressDots current={stepIndex} />

      <div className="bg-card rounded-2xl border border-white/10 shadow-soft p-8">
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {currentStep === "profile" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1.5">¿Quién eres?</h2>
            <p className="text-white/50 text-sm mb-6">
              Para que Nexión pueda identificar tus tareas en los análisis, necesitamos saber tu nombre y los apodos o variantes con los que te conocen.
            </p>
            <label className="block text-white/60 text-[11px] font-bold uppercase tracking-widest mb-1.5">Tu nombre principal</label>
            <input
              type="text"
              value={mainName}
              onChange={e => setMainName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary transition-colors mb-4"
              placeholder="Ej: Elkin Garcia"
            />
            <label className="block text-white/60 text-[11px] font-bold uppercase tracking-widest mb-1.5">Otros nombres con los que te conocen</label>
            <textarea
              value={aliases}
              onChange={e => setAliases(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Ej: Alexis, Elkin Alexis, Elkin G."
              rows={2}
            />
            <p className="text-white/30 text-xs mt-1.5 mb-6">Sepáralos por comas</p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const aliasList = aliases.split(",").map(a => a.trim()).filter(Boolean);
                  if (!mainName.trim()) { setError("Ingresa al menos tu nombre principal"); return; }
                  goNext("profile", { mainName: mainName.trim(), aliases: aliasList });
                }}
                disabled={saving || !mainName.trim()}
                className="px-6 py-3 bg-primary text-white text-[11px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-all"
              >
                {saving ? "Guardando..." : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "teams" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1.5">¿En qué equipos trabajas?</h2>
            <p className="text-white/50 text-sm mb-6">
              Selecciona los equipos de los que quieres que Nexión analice información.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
              {ANALYSIS_TEAMS.map(team => (
                <button
                  key={team.key}
                  onClick={() => setSelectedTeams(prev =>
                    prev.includes(team.key) ? prev.filter(t => t !== team.key) : [...prev, team.key]
                  )}
                  className={`px-4 py-3 rounded-xl border text-left font-medium transition-all ${
                    selectedTeams.includes(team.key)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                    <span className="text-sm">{team.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => goBack("teams")} className="px-4 py-3 text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors">
                Atrás
              </button>
              <button
                onClick={() => goNext("teams", { teams: selectedTeams })}
                disabled={saving}
                className="px-6 py-3 bg-primary text-white text-[11px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-all"
              >
                {saving ? "Guardando..." : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "products" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1.5">¿Qué productos manejas?</h2>
            <p className="text-white/50 text-sm mb-6">
              Selecciona los productos sobre los que quieres que Nexión te genere análisis.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {ALL_PRODUCTS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setSelectedProducts(prev =>
                    prev.includes(p.key) ? prev.filter(pr => pr !== p.key) : [...prev, p.key]
                  )}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                    selectedProducts.includes(p.key)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => goBack("products")} className="px-4 py-3 text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors">
                Atrás
              </button>
              <button
                onClick={() => goNext("products", { products: selectedProducts })}
                disabled={saving}
                className="px-6 py-3 bg-primary text-white text-[11px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-all"
              >
                {saving ? "Guardando..." : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "fuentes" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1.5">¿Qué fuentes quieres usar?</h2>
            <p className="text-white/50 text-sm mb-6">
              Selecciona los tipos de fuentes que Nexión debe analizar. Si no seleccionas un tipo, su configuración se omitirá.
            </p>
            <div className="space-y-3 mb-8">
              {SOURCE_TYPES.map(st => {
                const active = selectedSources.includes(st.key);
                return (
                  <button
                    key={st.key}
                    onClick={() => setSelectedSources(prev =>
                      prev.includes(st.key) ? prev.filter(s => s !== st.key) : [...prev, st.key]
                    )}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      active
                        ? "bg-primary/10 border-primary"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      active ? "bg-primary" : "bg-white/10"
                    }`}>
                      {active && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${active ? "text-white" : "text-white/60"}`}>{st.label}</p>
                      <p className={`text-xs ${active ? "text-white/40" : "text-white/30"}`}>{st.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between">
              <button onClick={() => goBack("fuentes")} className="px-4 py-3 text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors">
                Atrás
              </button>
              <button
                onClick={() => goNext("fuentes", { sources: selectedSources })}
                disabled={saving}
                className="px-6 py-3 bg-primary text-white text-[11px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-all"
              >
                {saving ? "Guardando..." : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "gemini" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1.5">API Key de Gemini</h2>
            <p className="text-white/50 text-sm mb-6">
              Nexión usa inteligencia artificial Gemini de Google para analizar tus fuentes. Necesitas crear una API Key gratuita. Sigue estos pasos:
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">1</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Ve a Google AI Studio</p>
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                    https://aistudio.google.com/apikey →
                  </a>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">2</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Inicia sesión con tu cuenta de Google</p>
                  <p className="text-xs text-white/40 mt-1">Usa la misma cuenta de Google con la que ingresaste a Nexión.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">3</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Haz clic en "Create API Key"</p>
                  <p className="text-xs text-white/40 mt-1">Es un botón azul en la parte superior. Si ya tienes una key creada, también puedes usarla.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">4</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Copia la API Key</p>
                  <p className="text-xs text-white/40 mt-1">Se ve así: <code className="text-primary">AIzaSyD-xxxxxxxxxxxx</code>. Cópiala exactamente como aparece.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">5</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Pégala aquí abajo</p>
                  <p className="text-xs text-white/40 mt-1">No te preocupes, se guarda de forma segura en tu workspace.</p>
                </div>
              </div>
            </div>

            <label className="block text-white/60 text-[11px] font-bold uppercase tracking-widest mb-1.5">Tu Gemini API Key</label>
            <div className="relative mb-6">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary transition-colors pr-20 font-mono"
                placeholder="Pega aquí tu API Key (AIza...)"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-[11px] font-bold uppercase tracking-widest"
              >
                {showApiKey ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-6">
              <p className="text-xs text-primary font-bold mb-1">🔒 Tu key es segura</p>
              <p className="text-xs text-white/40">Se almacena en tu workspace y solo Nexión la usa para analizar tus fuentes. Nadie más puede verla.</p>
            </div>
            <div className="flex justify-between">
              <button onClick={() => goBack("gemini")} className="px-4 py-3 text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors">
                Atrás
              </button>
              <button
                onClick={() => {
                  if (!apiKey.trim()) { setError("La API Key es necesaria para usar Nexión"); return; }
                  goNext("gemini", { apiKey: apiKey.trim() });
                }}
                disabled={saving || !apiKey.trim()}
                className="px-6 py-3 bg-primary text-white text-[11px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-all"
              >
                {saving ? "Guardando..." : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "jira" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1.5">Conectar Jira</h2>
            <p className="text-white/50 text-sm mb-6">
              Opcional. Si usas Jira, Nexión puede vincular tareas y enriquecer el análisis. Puedes saltarte este paso y configurarlo después.
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">1</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">URL del sitio Jira</p>
                  <p className="text-xs text-white/40 mt-1">Es la dirección web que ves en tu navegador cuando abres Jira. Siempre termina en <code className="text-primary">.atlassian.net</code>.</p>
                  <p className="text-xs text-white/30 mt-1">Ejemplo: <code className="text-white/50">https://mi-empresa.atlassian.net</code></p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">2</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Tu email</p>
                  <p className="text-xs text-white/40 mt-1">El correo electrónico con el que inicias sesión en Jira.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">3</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Crear un API Token</p>
                  <p className="text-xs text-white/40 mt-1">Ve a <a href="https://id.atlassian.com/manage/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://id.atlassian.com/manage/api-tokens →</a></p>
                  <p className="text-xs text-white/40 mt-1">Haz clic en <strong className="text-white/70">"Create API Token"</strong>, ponle cualquier nombre (ej: "Nexión") y cópialo.</p>
                </div>
              </div>
            </div>

            <label className="block text-white/60 text-[11px] font-bold uppercase tracking-widest mb-1.5">URL del sitio</label>
            <input
              type="text"
              value={jiraSiteUrl}
              onChange={e => setJiraSiteUrl(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary transition-colors mb-4"
              placeholder="https://tu-empresa.atlassian.net"
            />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-white/60 text-[11px] font-bold uppercase tracking-widest mb-1.5">Email</label>
                <input
                  type="email"
                  value={jiraEmail}
                  onChange={e => setJiraEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary transition-colors"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-white/60 text-[11px] font-bold uppercase tracking-widest mb-1.5">API Token</label>
                <input
                  type="password"
                  value={jiraToken}
                  onChange={e => setJiraToken(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {jiraSiteUrl && jiraEmail && jiraToken && (
              <button
                onClick={async () => {
                  setJiraTesting(true);
                  setJiraTestResult("idle");
                  try {
                    const res = await fetch("/api/jira/test", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ siteUrl: jiraSiteUrl, email: jiraEmail, apiToken: jiraToken }),
                    });
                    const result = await res.json();
                    setJiraTestResult(result.success ? "ok" : "error");
                  } catch {
                    setJiraTestResult("error");
                  }
                  setJiraTesting(false);
                }}
                disabled={jiraTesting}
                className="text-primary hover:underline text-sm mb-6 block"
              >
                {jiraTesting ? "Probando..." : "Probar conexión"}
              </button>
            )}
            {jiraTestResult === "ok" && <p className="text-green-400 text-sm mb-4">Conexión exitosa</p>}
            {jiraTestResult === "error" && <p className="text-red-400 text-sm mb-4">No se pudo conectar. Verifica los datos.</p>}
            <div className="flex justify-between">
              <button onClick={() => goBack("jira")} className="px-4 py-3 text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors">
                Atrás
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => goNext("jira", { skip: true })}
                  className="px-4 py-3 text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors"
                >
                  Saltar
                </button>
                <button
                  onClick={() => goNext("jira", { siteUrl: jiraSiteUrl, email: jiraEmail, apiToken: jiraToken })}
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white text-[11px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-all"
                >
                  {saving ? "Guardando..." : "Continuar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === "slack" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1.5">Canales de Slack</h2>
            <p className="text-white/50 text-sm mb-6">
              Opcional. Conecta los canales de Slack que Nexión debe monitorear. Puedes configurarlos después en Ajustes.
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">1</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Abre el canal en Slack</p>
                  <p className="text-xs text-white/40 mt-1">Ve al canal que quieres conectar.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">2</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Haz clic en el nombre del canal</p>
                  <p className="text-xs text-white/40 mt-1">Está en la parte superior del canal, al lado del icono de candado (#).</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">3</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Baja hasta "Acerca de"</p>
                  <p className="text-xs text-white/40 mt-1">Al final de la ventana emergente verás una sección con los detalles del canal.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-xs">4</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Copia el ID del canal</p>
                  <p className="text-xs text-white/40 mt-1">El ID está al final de la sección "Acerca de". Empieza con <code className="text-primary">C</code> (canal público) o <code className="text-primary">G</code> (privado/grupo).</p>
                  <p className="text-xs text-white/30 mt-1">Ejemplo: <code className="text-white/50">C1234567890</code></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 bg-white/5 rounded-xl">
                <h3 className="text-white/60 text-[11px] font-bold uppercase tracking-widest mb-2.5">Canal público</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={publicChannelId}
                    onChange={e => setPublicChannelId(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary transition-colors"
                    placeholder="ID del canal (C...)"
                  />
                  <button
                    onClick={async () => {
                      if (!publicChannelId.trim()) return;
                      try {
                        await fetch("/api/slack?action=join-channel", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ channel: publicChannelId.trim() }),
                        });
                        if (workspace) loadSlack(workspace.id);
                        setPublicChannelId("");
                      } catch {}
                    }}
                    className="px-3 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-lg hover:bg-primary/80 transition-all"
                  >
                    + Añadir
                  </button>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <h3 className="text-white/60 text-[11px] font-bold uppercase tracking-widest mb-2.5">Canal privado</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={privateChannelId}
                    onChange={e => setPrivateChannelId(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary transition-colors"
                    placeholder="ID del canal (C... o G...)"
                  />
                  <button
                    onClick={async () => {
                      if (!privateChannelId.trim() || !workspace) return;
                      try {
                        const res = await fetch("/api/slack/save-preferences", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ workspaceId: workspace.id, channels: [{ channel_id: privateChannelId.trim(), channel_name: privateChannelId.trim(), is_private: true, enabled: true }] }),
                        });
                        const result = await res.json();
                        if (result.success) loadSlack(workspace.id);
                        setPrivateChannelId("");
                      } catch {}
                    }}
                    className="px-3 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-lg hover:bg-primary/80 transition-all"
                  >
                    + Añadir
                  </button>
                </div>
              </div>
            </div>

            {slackLoading ? (
              <div className="text-center py-6 text-white/30 text-sm">Cargando canales...</div>
            ) : slackChannels.length > 0 ? (
              <div className="space-y-1 mb-6 max-h-52 overflow-y-auto custom-scrollbar">
                {slackChannels.map(ch => (
                  <label key={ch.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                    <button
                      onClick={() => {
                        const newPrefs = new Map(slackPrefs);
                        newPrefs.set(ch.id, slackPrefs.get(ch.id) === false);
                        setSlackPrefs(newPrefs);
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                        slackPrefs.get(ch.id) !== false
                          ? "bg-primary border-primary"
                          : "border-white/20"
                      }`}
                    >
                      {slackPrefs.get(ch.id) !== false && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm text-white font-medium">#{ch.name}</span>
                    {ch.is_private && <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full">privado</span>}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-white/30 text-sm">No hay canales disponibles</p>
            )}

            <div className="flex justify-between">
              <button onClick={() => goBack("slack")} className="px-4 py-3 text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors">
                Atrás
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    saveStep("slack", { skip: true });
                    setCurrentStep("complete");
                  }}
                  className="px-4 py-3 text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors"
                >
                  Saltar
                </button>
                <button
                  onClick={async () => {
                    await saveStep("slack", { channels: Array.from(slackPrefs.entries()).map(([id, enabled]) => ({ id, enabled })) });
                    if (!error) setCurrentStep("modules");
                  }}
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white text-[11px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-all"
                >
                  {saving ? "Guardando..." : "Continuar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === "modules" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1.5">¿Qué módulos quieres activar?</h2>
            <p className="text-white/50 text-sm mb-6">
              Selecciona los módulos de Nexión que quieres usar. Siempre puedes cambiarlo después en Configuración.
            </p>
            <div className="space-y-3 mb-8">
              {MODULES.map(mod => {
                const active = selectedModules.includes(mod.key);
                return (
                  <button
                    key={mod.key}
                    onClick={() => setSelectedModules(prev =>
                      prev.includes(mod.key) ? prev.filter(m => m !== mod.key) : [...prev, mod.key]
                    )}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      active
                        ? "bg-primary/10 border-primary"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      active ? "bg-primary" : "bg-white/10"
                    }`}>
                      {active && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${active ? "text-white" : "text-white/60"}`}>{mod.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between">
              <button onClick={() => goBack("modules")} className="px-4 py-3 text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors">
                Atrás
              </button>
              <button
                onClick={() => goNext("modules", { modules: selectedModules })}
                disabled={saving}
                className="px-6 py-3 bg-primary text-white text-[11px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-all"
              >
                {saving ? "Guardando..." : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "complete" && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Todo listo!</h2>
            <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto">
              Nexión está configurado. Ahora puedes ir a tu Día &gt; Hoy para ver tu resumen operativo.
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={async () => {
                  await saveStep("complete", {});
                  router.push("/day/today");
                }}
                disabled={saving}
                className="px-8 py-3.5 bg-gradient-to-r from-primary to-bright text-white font-bold tracking-widest uppercase rounded-2xl hover:brightness-110 disabled:opacity-50 transition-all shadow-xl"
                style={{ boxShadow: "0 4px 20px rgba(26, 107, 255, 0.25)" }}
              >
                {saving ? "Finalizando..." : "Ir a Día > Hoy"}
              </button>
              <button
                onClick={async () => {
                  await saveStep("complete", {});
                  router.push("/settings");
                }}
                className="text-white/40 hover:text-white text-[11px] font-black tracking-widest uppercase transition-colors"
              >
                Ir a Ajustes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
