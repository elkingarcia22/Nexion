/**
 * What a product needs for its weekly PostHog radar. Everything product-specific lives here;
 * the queries, metrics, analysis and Slack rendering are shared.
 */
export interface FeatureFamily {
  key: string;
  label: string;
  events: string[];
}

export interface FunnelStep {
  key: string;
  label: string;
  /** Exact lowercased $pathname of the step. */
  path: string;
}

export interface ReplayCategory {
  key: string;
  label: string;
  /** Lower number = reviewed first. */
  priority: number;
  /** Path fragment that must appear in the session's route (optional). */
  pathFragment?: string;
  minRageClicks?: number;
  minDeadClicks?: number;
}

export interface RadarConfig {
  productId: string;
  productName: string;
  posthogProjectId: number;
  /** Production host, lowercased. */
  host: string;
  /** Screens that belong to the product (friction scope), e.g. "/recruitment". */
  pathPrefix: string;
  features: FeatureFamily[];
  funnel: { label: string; steps: FunnelStep[]; confirmEvent?: string; confirmLabel?: string };
  /** Readable names for known screens (friction, routes). Longest matching prefix wins. */
  screenLabels: Array<{ prefix: string; label: string }>;
  /** Product-specific replay categories, checked after the generic error ones. */
  replayCategories: ReplayCategory[];
  /** Words the analysis uses for the core object ("vacante", "objetivo"…). */
  vocabulary: { object: string; objectPlural: string };
}

/** Internal traffic excluded from every query: Ubits staff and demo/commercial companies. */
export const INTERNAL_FILTER = {
  emailDomains: ["@ubits.co", "@ubits.com"],
  companyNames: ["comercial ubits", "ubits - talentos"],
  companyIds: ["1024", "3639"],
};

export function keyEvents(config: RadarConfig): string[] {
  return config.features.flatMap((family) => family.events);
}

export function screenLabel(config: RadarConfig, path: string): string {
  if (path.includes("/undefined")) return `Ruta inválida (${path})`;
  if (path === "/" || path === "") return "Inicio de la plataforma";
  const match = config.screenLabels
    .filter((entry) => path.startsWith(entry.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? match.label : path;
}
