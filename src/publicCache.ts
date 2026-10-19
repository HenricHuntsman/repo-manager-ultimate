import type { Repository } from "./types";

const KEY = "repoforge-public-scan-v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REPOS = 500;

interface CachedPublicSnapshot {
  schema: 1;
  scannedAt: number;
  repositories: Repository[];
}

function validRepo(value: unknown): value is Repository {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && v.name.length > 0 && v.name.length < 256
    && typeof v.description === "string" && typeof v.language === "string"
    && typeof v.lastActivity === "string" && typeof v.checks === "string"
    && typeof v.recommendation === "string"
    && ["healthy", "attention", "review"].includes(String(v.health))
    && ["active", "experiment", "upstream", "cleanup"].includes(String(v.kind))
    && (v.htmlUrl === undefined || (typeof v.htmlUrl === "string" && v.htmlUrl.startsWith("https://github.com/")));
}

export function readPublicCache(storage: Storage = localStorage): CachedPublicSnapshot | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;
    if (record.schema !== 1 || typeof record.scannedAt !== "number") return null;
    const age = Date.now() - record.scannedAt;
    if (!Number.isFinite(age) || age < -5 * 60 * 1000 || age > MAX_AGE_MS) return null;
    if (!Array.isArray(record.repositories) || record.repositories.length > MAX_REPOS
      || !record.repositories.every(validRepo)) return null;
    return data as CachedPublicSnapshot;
  } catch {
    // Storage can be disabled in privacy mode; fall back to seeded historical data.
    return null;
  }
}

export function savePublicCache(repositories: Repository[], storage: Storage = localStorage): boolean {
  try {
    if (repositories.length > MAX_REPOS || !repositories.every(validRepo)) return false;
    const publicOnly = repositories.map((repo) => ({
      name: repo.name, description: repo.description, language: repo.language,
      kind: repo.kind, health: repo.health, openPulls: null, lastActivity: repo.lastActivity,
      checks: repo.checks, recommendation: repo.recommendation, htmlUrl: repo.htmlUrl,
      stars: repo.stars, sizeKb: repo.sizeKb,
    }));
    storage.setItem(KEY, JSON.stringify({ schema: 1, scannedAt: Date.now(), repositories: publicOnly }));
    return true;
  } catch {
    // Quotas and disabled localStorage must never interrupt a successful scan.
    return false;
  }
}
