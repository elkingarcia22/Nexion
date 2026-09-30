import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportType } from "./periods";
import { runBiweeklyPulse } from "./pulse/pipeline";
import { runWeeklyRadar } from "./radar/pipeline";
import { isRollupLevel } from "./rollup/periods";
import { runRollup } from "./rollup/pipeline";
import type { AnalyticsReport } from "./types";

export interface RunOptions {
  trigger: "cron" | "manual";
  publish: boolean;
  /** Any date inside the period to build; defaults to the last completed period. */
  date?: string;
}

export interface RunOutcome {
  report: AnalyticsReport;
  skipped?: string;
  slackError?: string;
}

/** Builds (and optionally publishes) one report of a product. */
export async function runReport(db: SupabaseClient, productId: string, type: ReportType, options: RunOptions): Promise<RunOutcome> {
  switch (type) {
    case "radar_semanal":
      return runWeeklyRadar(db, productId, { trigger: options.trigger, publish: options.publish, weekStart: options.date });
    case "pulso_quincenal":
      return runBiweeklyPulse(db, productId, { trigger: options.trigger, publish: options.publish, date: options.date });
    default:
      if (isRollupLevel(type)) return runRollup(db, productId, type, { trigger: options.trigger, publish: options.publish, date: options.date });
      throw new Error(`El nivel "${type}" todavía no se genera desde Nexión.`);
  }
}
