export type Health = "healthy" | "attention" | "review";
export type RepoKind = "active" | "experiment" | "upstream" | "cleanup";

export interface Repository {
  name: string;
  description: string;
  language: string;
  kind: RepoKind;
  health: Health;
  openPulls: number | null;
  lastActivity: string;
  checks: string;
  recommendation: string;
  htmlUrl?: string;
  stars?: number;
  sizeKb?: number;
}

export interface RepoInspection {
  openPulls: number | null;
  workflowName: string;
  workflowState: "success" | "failure" | "pending" | "none" | "unavailable";
  workflowUpdatedAt?: string;
  message?: string;
}

export interface TreeComparison {
  leftFiles: number;
  rightFiles: number;
  sharedPaths: number;
  identicalFiles: number;
  leftOnly: string[];
  rightOnly: string[];
}
