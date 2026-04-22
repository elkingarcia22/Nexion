// Auth
export type User = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  workspace_id: string;
  created_at: string;
};

// Workspace
export type Workspace = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
};

// Source
export type Source = {
  id: string;
  workspace_id: string;
  title: string;
  url?: string;
  type: "document" | "meeting" | "email" | "manual" | "feedback";
  status: "pending" | "processing" | "processed" | "error";
  content?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

// Finding
export type Finding = {
  id: string;
  workspace_id: string;
  source_id: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
  created_at: string;
};

// Task Proposal
export type TaskProposal = {
  id: string;
  workspace_id: string;
  finding_id: string;
  title: string;
  description: string;
  status: "proposed" | "approved" | "rejected" | "in_progress" | "completed";
  assignee_id?: string;
  due_date?: string;
  created_at: string;
};

// Day Summary
export type DaySummary = {
  id: string;
  workspace_id: string;
  date: string;
  sources_count: number;
  findings_count: number;
  tasks_count: number;
  summary: string;
  created_at: string;
};
