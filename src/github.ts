import type { Health, RepoKind, Repository } from "./types";

const API_ROOT = "https://api.github.com";

function apiHeaders(token?: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    ...(token?.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
  };
}
const ACTIVE_REPOS = new Set([
  "AgentFoundry-instantly",
  "azeroth-pilot-reloaded-Pro-",
  "NebulaUltimate",
  "repo-manager-ultimate",
  "book-publish-forge",
  "AgentFoundry-TrinityCore-Studio",
]);
const UPSTREAM_REPOS = new Set([
  "TrinityCore", "codex", "continue", "gemini-cli", "Kimi-K2", "nvm", "Vitruvian",
]);

interface GitHubRepository {
  name: string;
  description: string | null;
  language: string | null;
  fork: boolean;
  archived: boolean;
  private: boolean;
  size: number;
  open_issues_count: number;
  pushed_at: string;
  html_url: string;
  stargazers_count: number;
}

function classify(repo: GitHubRepository): RepoKind {
  if (ACTIVE_REPOS.has(repo.name)) return "active";
  if (UPSTREAM_REPOS.has(repo.name) || repo.fork) return "upstream";
  if (
    repo.archived ||
    repo.size === 0 ||
    /(^|[-_])(test|new)([-_]|$)|your_username|https-github|github\.io/i.test(repo.name)
  ) return "cleanup";
  return "experiment";
}

function score(repo: GitHubRepository, kind: RepoKind): Health {
  if (repo.archived || kind === "cleanup" || repo.size === 0) return "review";
  const pushed = Date.parse(repo.pushed_at || "");
  if (!Number.isFinite(pushed) || pushed > Date.now() + 24 * 60 * 60 * 1000) return "review";
  const ageMs = Date.now() - pushed;
  return ageMs > 365 * 24 * 60 * 60 * 1000 ? "attention" : "healthy";
}

function recommendation(repo: GitHubRepository, kind: RepoKind): string {
  if (repo.archived) return "Archived — preserve";
  if (repo.size === 0) return "Review for archive";
  if (kind === "upstream") return "Document upstream sync";
  if (kind === "cleanup") return "Compare before archiving";
  if (kind === "experiment") return "Name and document purpose";
  return "Keep active and verify CI";
}

function mapRepository(repo: GitHubRepository): Repository {
  const kind = classify(repo);
  return {
    name: repo.name,
    description: repo.description || "No repository description provided.",
    language: repo.language || "Not detected",
    kind,
    health: score(repo, kind),
    // GitHub open_issues_count includes issues and PRs; it is NOT an exact PR count.
    openPulls: null,
    lastActivity: Number.isFinite(Date.parse(repo.pushed_at || ""))
      ? new Intl.DateTimeFormat("en-AU", {
        day: "numeric", month: "short", year: "numeric",
      }).format(new Date(repo.pushed_at)) : "Unknown",
    checks: repo.archived ? "Repository archived" : "Public metadata only; CI not verified",
    recommendation: recommendation(repo, kind),
    htmlUrl: repo.html_url,
    stars: repo.stargazers_count,
    sizeKb: repo.size,
  };
}

const MAX_PUBLIC_PAGES = 5;
const PAGE_SIZE = 100;

async function fetchGitHub(url: string, headers: HeadersInit): Promise<Response> {
  // Bounded retry for transient server errors; don't retry auth/rate limits.
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
    } catch (error) {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw new Error("GitHub is unreachable or timed out. Existing repository data was preserved.");
    }
    if (![502, 503, 504].includes(response.status) || attempt === 1) return response;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("GitHub request failed after one retry.");
}

function githubFailure(response: Response, context: string): Error {
  const remaining = response.headers.get("x-ratelimit-remaining");
  const rateLimited = response.status === 429 || (response.status === 403 && remaining === "0");
  const hint = rateLimited
    ? " GitHub API rate limit reached. Try later; the previous results are preserved."
    : " Try later; the previous results are preserved.";
  return new Error(`${context} (HTTP ${response.status}).${hint}`);
}

export async function scanPublicRepositories(owner: string, token?: string): Promise<Repository[]> {
  const repositories: Repository[] = [];
  for (let page = 1; page <= MAX_PUBLIC_PAGES; page++) {
    const response = await fetchGitHub(
      `${API_ROOT}/users/${encodeURIComponent(owner)}/repos?per_page=${PAGE_SIZE}&page=${page}&sort=pushed`,
      apiHeaders(token),
    );
    if (!response.ok) throw githubFailure(response, "GitHub scan failed");
    let payload: unknown;
    try { payload = await response.json(); }
    catch { throw new Error("GitHub returned invalid JSON. Existing results were preserved."); }
    if (!Array.isArray(payload) || payload.some((row) => !row || typeof row !== "object" || typeof row.name !== "string")) {
      throw new Error("GitHub returned an unexpected repository list. Existing results were preserved.");
    }
    const pageResults = (payload as GitHubRepository[]).map(mapRepository);
    repositories.push(...pageResults);
    if (pageResults.length < PAGE_SIZE) return repositories;
  }
  // Never silently publish a first-page or truncated list as 'complete'.
  throw new Error(`More than ${MAX_PUBLIC_PAGES * PAGE_SIZE} repositories may exist. Scan truncated; existing results were preserved.`);
}

interface WorkflowRun {
  name: string;
  status: string;
  conclusion: string | null;
  updated_at: string;
}

interface WorkflowResponse {
  workflow_runs: WorkflowRun[];
}

export async function inspectRepository(owner: string, name: string, token?: string): Promise<import("./types").RepoInspection> {
  const headers = apiHeaders(token);
  const base = `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  // One workflow fetch, plus bounded PR pagination; never call issue count a PR count.
  const workflowRequest = fetchGitHub(`${base}/actions/runs?per_page=1`, headers);
  const prRequest = (async () => {
    let count = 0;
    for (let page = 1; page <= 5; page++) {
      const response = await fetchGitHub(`${base}/pulls?state=open&per_page=100&page=${page}`, headers);
      if (!response.ok) return { count: null, note: `Pull-request count unavailable (HTTP ${response.status}).` };
      const data: unknown = await response.json();
      if (!Array.isArray(data)) return { count: null, note: "Unexpected pull-request response." };
      count += data.length;
      if (data.length < 100) return { count, note: undefined };
    }
    return { count: null, note: "More than 500 pull requests; exact count not verified." };
  })();
  const [pull, workflowResponse] = await Promise.all([prRequest, workflowRequest]);
  if (workflowResponse.status === 429 || (workflowResponse.status === 403 && workflowResponse.headers.get("x-ratelimit-remaining") === "0")) {
    return { openPulls: pull.count, workflowName: "GitHub API limit reached",
      workflowState: "unavailable", message: "Retry after the rate limit resets." };
  }
  if (workflowResponse.status === 404) {
    return { openPulls: pull.count, workflowName: "Actions not accessible", workflowState: "unavailable",
      message: pull.note || "Actions may be disabled or unavailable. Do not assume no workflows exist." };
  }
  if (!workflowResponse.ok) {
    return { openPulls: pull.count, workflowName: `Workflow check unavailable (HTTP ${workflowResponse.status})`,
      workflowState: "unavailable", message: pull.note };
  }
  let workflows: WorkflowResponse;
  try { workflows = await workflowResponse.json() as WorkflowResponse; }
  catch { return { openPulls: pull.count, workflowName: "Workflow response invalid",
    workflowState: "unavailable", message: pull.note }; }
  if (!Array.isArray(workflows.workflow_runs)) return {
    openPulls: pull.count, workflowName: "Unexpected workflow response",
    workflowState: "unavailable", message: pull.note,
  };
  const latest = workflows.workflow_runs[0];
  if (!latest) return { openPulls: pull.count, workflowName: "No workflow runs found",
    workflowState: "none", message: pull.note };
  const workflowState = latest.status !== "completed" ? "pending"
    : latest.conclusion === "success" ? "success"
    : latest.conclusion === "failure" ? "failure" : "unavailable";
  const updated = Date.parse(latest.updated_at);
  return {
    openPulls: pull.count,
    workflowName: latest.name || "Unnamed workflow",
    workflowState,
    workflowUpdatedAt: Number.isFinite(updated)
      ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(updated))
      : undefined,
    message: pull.note,
  };
}

interface TreeItem { path: string; type: string; sha: string; }
interface TreeResponse { tree: TreeItem[]; truncated: boolean; }
interface RepoDetails { default_branch: string; }

async function fetchTree(owner: string, name: string, token?: string): Promise<Map<string, string>> {
  const headers = apiHeaders(token);
  const detailsResponse = await fetch(
    `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    { headers },
  );
  if (!detailsResponse.ok) throw new Error(`Cannot read ${name} metadata (HTTP ${detailsResponse.status}).`);
  const details = (await detailsResponse.json()) as RepoDetails;
  const treeResponse = await fetch(
    `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(details.default_branch)}?recursive=1`,
    { headers },
  );
  if (!treeResponse.ok) throw new Error(`Cannot read ${name} tree (HTTP ${treeResponse.status}).`);
  const tree = (await treeResponse.json()) as TreeResponse;
  if (tree.truncated) throw new Error(`${name} is too large for a complete public tree comparison.`);
  return new Map(tree.tree.filter((item) => item.type === "blob").map((item) => [item.path, item.sha]));
}

export async function compareRepositories(owner: string, left: string, right: string, token?: string): Promise<import("./types").TreeComparison> {
  if (left === right) throw new Error("Choose two different repositories.");
  const [leftTree, rightTree] = await Promise.all([fetchTree(owner, left, token), fetchTree(owner, right, token)]);
  const shared = [...leftTree.keys()].filter((path) => rightTree.has(path));
  return {
    leftFiles: leftTree.size,
    rightFiles: rightTree.size,
    sharedPaths: shared.length,
    identicalFiles: shared.filter((path) => leftTree.get(path) === rightTree.get(path)).length,
    leftOnly: [...leftTree.keys()].filter((path) => !rightTree.has(path)).slice(0, 8),
    rightOnly: [...rightTree.keys()].filter((path) => !leftTree.has(path)).slice(0, 8),
  };
}
