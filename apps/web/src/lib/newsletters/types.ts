export type SourceType = "RSS" | "HTML" | "SITEMAP" | "REDDIT";
export type SourcePriority = "high" | "medium" | "low";
export type EditionStatus = "published" | "preview" | "skipped" | "failed";
export type EditionTrigger = "cron" | "manual";

export interface Newsletter {
  id: string;
  name: string;
  description: string | null;
  slack_channel_id: string;
  schedule_label: string;
  model: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSource {
  id: string;
  newsletter_id: string;
  source_key: string;
  name: string;
  url: string;
  source_type: SourceType;
  category: string;
  priority: SourcePriority;
  max_items: number;
  is_active: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
}

export interface NewsletterEdition {
  id: string;
  newsletter_id: string;
  status: EditionStatus;
  trigger: EditionTrigger;
  message: string | null;
  pills: SelectedArticle[];
  stats: Record<string, unknown>;
  error: string | null;
  model: string | null;
  usage: TokenUsage | null;
  slack_ts: string | null;
  created_at: string;
}

/** A story extracted from a feed, before editorial ranking. */
export interface Article {
  title: string;
  url: string;
  summary: string;
  source: string;
  sourceKey: string;
  category: string;
  priority: SourcePriority;
  publishedAt: string;
  domain: string;
}

export interface SelectedArticle {
  title: string;
  url: string;
  source: string;
  domain: string;
  angle: string;
  editorialScore: number;
  adjustedScore: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Previously published story used to avoid repeats. */
export interface SeenItem {
  url: string;
  title: string | null;
}
