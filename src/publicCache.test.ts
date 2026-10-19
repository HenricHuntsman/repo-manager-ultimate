import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPublicCache, savePublicCache } from "./publicCache";
import type { Repository } from "./types";

const item: Repository = {
  name: "repo-manager-ultimate", description: "Public dashboard", language: "TypeScript",
  kind: "active", health: "healthy", openPulls: null, lastActivity: "19 Oct 2026",
  checks: "Public metadata only; CI not verified", recommendation: "Inspect CI",
  htmlUrl: "https://github.com/HenricHuntsman/repo-manager-ultimate",
};

describe("public-data-only browser resilience", () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it("stores public repository fields and restores them after remount", () => {
    expect(savePublicCache([item])).toBe(true);
    expect(readPublicCache()?.repositories[0].name).toBe(item.name);
    expect(localStorage.getItem("repoforge-public-scan-v1")).not.toContain("token");
  });

  it("never stores arbitrary added properties or credentials", () => {
    const record = { ...item, token: "github_pat_do_not_save", password: "private" };
    expect(savePublicCache([record])).toBe(true);
    const serialized = localStorage.getItem("repoforge-public-scan-v1") || "";
    expect(serialized).not.toContain("github_pat_do_not_save");
    expect(serialized).not.toContain("password");
  });

  it("drops malformed and stale data", () => {
    localStorage.setItem("repoforge-public-scan-v1", "{broken");
    expect(readPublicCache()).toBeNull();
    localStorage.setItem("repoforge-public-scan-v1",
      JSON.stringify({ schema: 1, scannedAt: Date.now() - 40 * 86400000, repositories: [item] }));
    expect(readPublicCache()).toBeNull();
  });

  it("rejects poisoned URL or untrusted repository fields", () => {
    expect(savePublicCache([{ ...item, htmlUrl: "javascript:alert(1)" }])).toBe(false);
    localStorage.setItem("repoforge-public-scan-v1", JSON.stringify({
      schema: 1, scannedAt: Date.now(),
      repositories: [{ ...item, htmlUrl: "javascript:alert(1)" }],
    }));
    expect(readPublicCache()).toBeNull();
  });

  it("gracefully handles disabled browser storage", () => {
    const storage = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("quota"); },
    } as unknown as Storage;
    expect(readPublicCache(storage)).toBeNull();
    expect(savePublicCache([item], storage)).toBe(false);
  });
});
