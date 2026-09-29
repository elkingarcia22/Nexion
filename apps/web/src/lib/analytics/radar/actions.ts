import type { AnalyticsAction } from "../types";
import type { NewAction } from "../repository";
import type { RadarAction } from "./types";

const ACTIVE = new Set(["open", "in_progress"]);

/** Base signal of an action key ("signal" or "signal@2026-W40" when a closed signal came back). */
export function signalOf(actionKey: string): string {
  return actionKey.split("@")[0];
}

export interface ActionPlan {
  actions: RadarAction[];
  created: NewAction[];
  continuedKeys: string[];
}

/**
 * Decides which proposed actions are new and which continue an open one. An open action with
 * the same signal is continued even if the model forgot to say so; a signal whose action was
 * already closed gets a fresh, period-suffixed key.
 */
export function planActions(proposed: RadarAction[], existing: AnalyticsAction[], periodKey: string): ActionPlan {
  const openBySignal = new Map(existing.filter((a) => ACTIVE.has(a.status)).map((a) => [signalOf(a.action_key), a]));
  const openKeys = new Set(existing.filter((a) => ACTIVE.has(a.status)).map((a) => a.action_key));
  const usedKeys = new Set(existing.map((a) => a.action_key));

  const actions: RadarAction[] = [];
  const created: NewAction[] = [];
  const continued = new Set<string>();

  for (const action of proposed) {
    const openMatch = action.continuesActionKey && openKeys.has(action.continuesActionKey)
      ? action.continuesActionKey
      : openBySignal.get(action.signalKey)?.action_key;
    if (openMatch) {
      if (continued.has(openMatch)) continue;
      continued.add(openMatch);
      actions.push({ ...action, continuesActionKey: openMatch });
      continue;
    }

    const key = usedKeys.has(action.signalKey) ? `${action.signalKey}@${periodKey}` : action.signalKey;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    const { continuesActionKey: _ignored, ...fresh } = action;
    actions.push(fresh);
    created.push({ action_key: key, title: action.title, detail: [action.evidence, action.nextStep].filter(Boolean).join(" · ") || null, owner: action.owner });
  }

  return { actions, created, continuedKeys: Array.from(continued) };
}
