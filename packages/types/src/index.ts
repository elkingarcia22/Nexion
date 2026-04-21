// Nexión — Domain Types
// These mirror the Supabase schema (SUPABASE_SCHEMA_SPEC.md)
// and are the canonical type definitions used across the app.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SourceStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'error'
  | 'reprocessing'

export type SourceType =
  | 'meeting_link'
  | 'document_link'
  | 'sheet_link'
  | 'manual_note'
  | 'slack_message'
  | 'other'

export type TaskStatus =
  | 'por_iniciar'
  | 'completada'
  | 'incompleta'
  | 'en_pausa'
  | 'deprecada'

export type ProposalStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'edited_approved'

export type FindingCategory =
  | 'feedback'
  | 'insight'
  | 'alert'
  | 'metric_signal'
  | 'task_signal'
  | 'objective_signal'

export type Priority = 'alta' | 'media' | 'baja'

export type MetricLevel = 'daily' | 'global'

export type IntegrationStatus =
  | 'active'
  | 'pending_setup'
  | 'pending_credentials'
  | 'planned'
  | 'error'

export type LinkStatus =
  | 'detected'
  | 'suggested'
  | 'confirmed'
  | 'edited'
  | 'removed'

// ─── Core Entities (Release 1) ────────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  workspace_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface Source {
  id: string
  workspace_id: string
  added_by: string
  title: string | null
  source_type: SourceType
  url: string | null
  raw_content: string | null
  current_status: SourceStatus
  source_date: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SourceRun {
  id: string
  source_id: string
  workspace_id: string
  run_status: SourceStatus
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
}

export interface Analysis {
  id: string
  source_id: string
  source_run_id: string
  workspace_id: string
  model_used: string | null
  prompt_version: string | null
  raw_output: Record<string, unknown> | null
  summary: string | null
  confidence_score: number | null
  created_at: string
}

export interface Finding {
  id: string
  analysis_id: string
  source_id: string
  workspace_id: string
  category: FindingCategory
  title: string
  description: string | null
  confidence: number | null
  priority: Priority | null
  created_at: string
}

export interface DaySummary {
  id: string
  workspace_id: string
  summary_date: string
  generated_at: string
  focus_of_day: string | null
  analysis_summary: string | null
  priority_tasks: unknown[]
  priority_alerts: unknown[]
  day_metrics: unknown[]
  day_insights: unknown[]
  pending_approvals: unknown[]
  auto_update_notes: unknown[]
  created_at: string
  updated_at: string
}

// ─── Release 2 Entities ───────────────────────────────────────────────────────

export interface TaskProposal {
  id: string
  workspace_id: string
  finding_id: string | null
  analysis_id: string | null
  source_id: string | null
  title: string
  description: string | null
  rationale: string | null
  priority_suggested: Priority
  due_date_suggested: string | null
  objective_hint: string | null
  key_result_hint: string | null
  confidence: number
  proposal_status: ProposalStatus
  proposed_by: string
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  workspace_id: string
  proposal_id: string | null
  finding_id: string | null
  source_id: string | null
  created_by: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ─── UI View Models ───────────────────────────────────────────────────────────

export interface DayTodayViewModel {
  date: string
  focus_of_day: string | null
  analysis_summary: string | null
  priority_tasks: TaskSummary[]
  priority_alerts: AlertSummary[]
  day_metrics: MetricSummary[]
  day_insights: InsightSummary[]
  pending_approvals: TaskProposalSummary[]
  sources_status: SourceStatusSummary
}

export interface TaskSummary {
  id: string
  title: string
  priority: Priority
  status: TaskStatus
  due_date: string | null
}

export interface AlertSummary {
  id: string
  title: string
  priority: Priority
  category: string
}

export interface MetricSummary {
  id: string
  label: string
  value: string
  trend?: 'up' | 'down' | 'stable'
  delta?: string
}

export interface InsightSummary {
  id: string
  title: string
  description: string
}

export interface TaskProposalSummary {
  id: string
  title: string
  priority_suggested: Priority
  confidence: number
}

export interface SourceStatusSummary {
  total: number
  processed: number
  processing: number
  pending: number
  error: number
}
