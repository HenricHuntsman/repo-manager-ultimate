import { describe, expect, it } from "vitest";
import { matchingCheckoutNames, parseLocalDoctorReport } from "./localDoctor";

const minimal = () => ({
  generated_at_utc: "2026-10-19T00:00:00+00:00",
  git_repositories: [{
    relative_path: "/home/user/Projects/TraceForge",
    branch: "main",
    head: "0123456789ab",
    tracked_changes_count: 2,
    has_node_project: true,
  }],
  repository_count: 1,
  archives: [{ path: "/home/user/Downloads/archive.zip", bytes: 100 }],
  same_size_candidates_not_verified_duplicates: [],
  ollama: { reachable: true, model_names: ["qwen3:8b"] },
  gpu: { available: true, devices: ["GPU"] },
});

describe("Dragon Project Doctor JSON importer", () => {
  it("reads local data without any GitHub API or remote calls", () => {
    const parsed = parseLocalDoctorReport(JSON.stringify(minimal()));
    expect(parsed.checkouts).toHaveLength(1);
    expect(parsed.checkouts[0]).toMatchObject({
      name: "TraceForge", branch: "main", head: "0123456789ab", trackedChanges: 2,
    });
    expect(parsed.archiveCount).toBe(1);
    expect(parsed.ollamaReachable).toBe(true);
    expect(parsed.gpuAvailable).toBe(true);
    expect(matchingCheckoutNames(parsed, ["TraceForge", "mini-AGI"]).size).toBe(1);
  });

  it("treats disabled GPU and Ollama checks as unknown", () => {
    const parsed = parseLocalDoctorReport(JSON.stringify({
      ...minimal(), ollama: { checked: false }, gpu: { checked: false },
    }));
    expect(parsed.ollamaChecked).toBe(false);
    expect(parsed.gpuChecked).toBe(false);
  });

  it("rejects malformed data or inconsistent checkout counts", () => {
    expect(() => parseLocalDoctorReport("not JSON")).toThrow("valid Dragon Project Doctor JSON");
    expect(() => parseLocalDoctorReport("[]")).toThrow("JSON object");
    expect(() => parseLocalDoctorReport(JSON.stringify({ ...minimal(), repository_count: 4 })))
      .toThrow("doesn't match");
  });

  it("rejects oversized input and invalid checkout paths", () => {
    expect(() => parseLocalDoctorReport(" ".repeat(3 * 1024 * 1024 + 1))).toThrow("3 MB");
    const report = minimal();
    report.git_repositories[0].relative_path = "";
    expect(() => parseLocalDoctorReport(JSON.stringify(report))).toThrow("relative_path");
  });
});
