import type { RadarConfig } from "../config";
import { HIRING_RADAR } from "./hiring";

/** Products with a PostHog weekly radar. */
export const RADAR_CONFIGS: Record<string, RadarConfig> = { hiring: HIRING_RADAR };
