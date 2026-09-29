import type { Article, NewsletterSource, SeenItem, SelectedArticle, TokenUsage } from "../types";

/** A candidate story after editorial scoring. */
export interface RankedArticle extends Article {
  /** Editorial angle or pillar; the two pills of an edition must differ in it when possible. */
  angle: string;
  editorialScore: number;
  adjustedScore: number;
}

export type ValidationResult = { ok: true; message: string } | { ok: false; error: string };

export interface PromptContext {
  dateLabel: string;
  /** Last published edition, so the model avoids repeating angles and phrasing. */
  previousMessage: string | null;
}

/**
 * Everything that differs between news newsletters. The engine (run.ts) owns fetching,
 * history, selection and the retry loop; a profile owns relevance, scoring, prompt and format.
 */
export interface NewsProfile {
  pillsCount: number;
  /** Relevant, fresh and domain-balanced candidates from everything the sources returned. */
  shortlist: (articles: Article[], now: Date) => Article[];
  rank: (articles: Article[]) => RankedArticle[];
  /**
   * Fixed mode: the profile picks exactly `pillsCount` stories and the model only writes them.
   * Model-picks mode (`modelPicks` set): `select` returns a varied shortlist and the model chooses
   * `pillsCount` of them, useful when headlines need editorial judgement keywords cannot capture.
   */
  select: (ranked: RankedArticle[], count: number) => RankedArticle[];
  modelPicks?: { shortlistSize: number };
  buildPrompt: (pills: RankedArticle[], context: PromptContext) => string;
  /** `pick` set: the message must link exactly `pick` distinct URLs from `urls`; otherwise all of `urls`. */
  validate: (raw: string, urls: string[], pick?: number) => ValidationResult;
}

export interface PipelineDeps {
  fetchBody: (url: string) => Promise<string>;
  generate: (prompt: string) => Promise<{ text: string; usage: TokenUsage }>;
  now: () => Date;
}

export interface PipelineInput {
  sources: NewsletterSource[];
  seen: SeenItem[];
  previousMessage?: string | null;
}

export interface PipelineStats {
  sourcesFetched: number;
  sourceErrors: Array<{ source: string; error: string }>;
  articlesParsed: number;
  candidates: number;
  newCandidates: number;
  ranked: number;
  attempts: number;
}

export type PipelineResult =
  | { status: "ready"; message: string; pills: SelectedArticle[]; usage: TokenUsage; stats: PipelineStats }
  | { status: "skipped"; reason: string; pills: SelectedArticle[]; stats: PipelineStats }
  | { status: "failed"; error: string; pills: SelectedArticle[]; stats: PipelineStats };
