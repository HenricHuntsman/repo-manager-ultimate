import { beforeEach, describe, expect, it, vi } from "vitest";
import { inspectRepository, scanPublicRepositories } from "./github";

function response(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

const run = (workflow_id: number, conclusion: string, overrides = {}) => ({
  id: workflow_id * 100, workflow_id, name: `Workflow ${workflow_id}`,
  status: "completed", conclusion, updated_at: "2026-11-01T01:00:00Z", ...overrides,
});

describe("default-branch workflow history", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });

  function mock(runs: unknown[], headers: HeadersInit = {}, pulls = response([])) {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/pulls?")) return pulls;
      if (url.includes("/actions/runs?")) return response({ workflow_runs: runs }, 200, headers);
      return response({ default_branch: "dev/active" });
    });
  }

  it("reports an independent workflow failure even after another workflow passes", async () => {
    mock([run(1, "success"), run(2, "failure")]);
    const info = await inspectRepository("owner", "project");
    expect(info.workflowState).toBe("failure");
    expect(info.workflowName).toBe("Workflow 2");
    expect(info.workflowBranch).toBe("dev/active");
    expect(info.message).toContain("2 workflows");
    expect(vi.mocked(fetch).mock.calls.some(([url]) =>
      String(url).includes("branch=dev%2Factive"))).toBe(true);
  });

  it("uses only the latest result per workflow, so resolved failures stay resolved", async () => {
    mock([run(1, "success"), run(1, "failure")]);
    const info = await inspectRepository("owner", "project");
    expect(info.workflowState).toBe("success");
    expect(info.message).toContain("1 workflow");
    expect(info.message).toContain("not proof of current HEAD");
  });

  it("does not describe an incomplete window of successful runs as a full pass", async () => {
    mock([run(1, "success")], { Link: '<https://api.github.com/next>; rel="next"' });
    const info = await inspectRepository("owner", "project");
    expect(info.workflowState).toBe("unavailable");
    expect(info.message).toMatch(/incomplete/i);
  });

  it("keeps cancelled workflows visible alongside successful workflows", async () => {
    mock([run(1, "success"), run(2, "cancelled")]);
    expect((await inspectRepository("owner", "project")).workflowState).toBe("unavailable");
  });

  it("retains CI evidence if pull-request counting is unavailable", async () => {
    mock([run(1, "failure")], {}, response({ message: "denied" }, 403));
    const info = await inspectRepository("owner", "project");
    expect(info.openPulls).toBeNull();
    expect(info.workflowState).toBe("failure");
    expect(info.message).toContain("Pull-request count unavailable");
  });

  it("rejects malformed run rows without inventing a successful check", async () => {
    mock([null]);
    expect((await inspectRepository("owner", "project")).workflowState).toBe("unavailable");
  });
});

describe("public scan visibility", () => {
  it("excludes private or unclassified entries even when returned to an authenticated client", async () => {
    const base = { description: null, language: null, fork: false, archived: false,
      size: 1, open_issues_count: 0, pushed_at: "2026-11-01T01:00:00Z",
      html_url: "https://github.com/owner/public", stargazers_count: 0 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([
      { ...base, name: "public", private: false },
      { ...base, name: "private", private: true },
      { ...base, name: "unknown" },
    ])));
    expect((await scanPublicRepositories("owner", "token")).map(r => r.name)).toEqual(["public"]);
  });
});
