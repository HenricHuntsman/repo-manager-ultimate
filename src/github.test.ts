import { beforeEach, describe, expect, it, vi } from "vitest";
import { inspectRepository, scanPublicRepositories } from "./github";

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("session-only GitHub authorization", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it.each([undefined, "", "   "])(
    "defaults to unauthenticated requests when token is %j",
    async (token) => {
      vi.mocked(fetch).mockResolvedValueOnce(response([]));

      await scanPublicRepositories("SpidermanTotro", token);

      expect(fetch).toHaveBeenCalledOnce();
      const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      expect(new Headers(options.headers).get("Authorization")).toBeNull();
      expect(new Headers(options.headers).get("Accept")).toBe(
        "application/vnd.github+json",
      );
    },
  );

  it("uses a trimmed token only as an in-memory Authorization header", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response([]));

    await scanPublicRepositories("SpidermanTotro", "  github_pat_secret  ");

    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer github_pat_secret",
    );
  });

  it("passes the same session token to PR and Actions inspection requests", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ workflow_runs: [] }));

    await inspectRepository("SpidermanTotro", "repo-manager-ultimate", "token");

    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [, options] of vi.mocked(fetch).mock.calls) {
      expect(new Headers(options?.headers).get("Authorization")).toBe(
        "Bearer token",
      );
    }
  });
});

describe("fault-tolerant public scans", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });

  function pageRepos(n: number) {
    return Array.from({ length: n }, (_, i) => ({
      name: "project-" + i, description: null, language: "TypeScript", fork: false,
      archived: false, private: false, size: 5, open_issues_count: 0,
      pushed_at: "2026-10-01T10:00:00Z", html_url: "https://github.com/owner/example",
      stargazers_count: 0,
    }));
  }

  it("collects successive pages until the list is complete", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(pageRepos(100)))
      .mockResolvedValueOnce(response(pageRepos(2)));
    const repos = await scanPublicRepositories("HenricHuntsman");
    expect(repos).toHaveLength(102);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("page=2");
  });

  it("rejects failures on page 2 instead of publishing misleading partial results", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(pageRepos(100)))
      .mockResolvedValueOnce(response({ message: "rate limited" }, 429));
    await expect(scanPublicRepositories("HenricHuntsman")).rejects.toThrow(/rate limit/i);
  });

  it("does not treat malformed GitHub responses as empty scans", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "unexpected" }));
    await expect(scanPublicRepositories("HenricHuntsman")).rejects.toThrow(/unexpected repository list/i);
  });

  it("retries a temporary server failure once, then succeeds", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: "maintenance" }, 503))
      .mockResolvedValueOnce(response(pageRepos(1)));
    const result = await scanPublicRepositories("HenricHuntsman");
    expect(result).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("marks missing dates for manual review rather than reporting healthy", async () => {
    const data = pageRepos(1);
    data[0].pushed_at = "bad-date";
    vi.mocked(fetch).mockResolvedValueOnce(response(data));
    const [project] = await scanPublicRepositories("HenricHuntsman");
    expect(project.health).toBe("review");
    expect(project.lastActivity).toBe("Unknown");
    expect(project.checks).toContain("CI not verified");
  });

  it("paginates open pull requests and keeps workflow failures separate", async () => {
    const pulls = Array.from({ length: 100 }, (_, n) => ({ number: n + 1 }));
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ workflow_runs: [] }))
      .mockResolvedValueOnce(response(pulls))
      .mockResolvedValueOnce(response([{ number: 101 }]));
    const info = await inspectRepository("HenricHuntsman", "repo-manager-ultimate");
    expect(info.openPulls).toBe(101);
    expect(info.workflowState).toBe("none");
  });

  it("does not call 404 Actions an empty workflow list", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ message: "not found" }, 404))
      .mockResolvedValueOnce(response([]));
    const info = await inspectRepository("HenricHuntsman", "repo-manager-ultimate");
    expect(info.workflowState).toBe("unavailable");
    expect(info.workflowName).toContain("not accessible");
  });
});
