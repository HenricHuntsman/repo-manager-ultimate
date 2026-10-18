import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { asReport, classifyRun, scanPublicOwner, saveReport, toMarkdown } from "./cloud-continuity.mjs";

test("workflow states are never inferred as successful without a successful run", () => {
  assert.equal(classifyRun(null), "no-runs");
  assert.equal(classifyRun({ status: "in_progress" }), "pending");
  assert.equal(classifyRun({ status: "completed", conclusion: "success" }), "success");
  assert.equal(classifyRun({ status: "completed", conclusion: "failure" }), "failure");
  assert.equal(classifyRun({ status: "completed", conclusion: "cancelled" }), "cancelled");
});

test("read-only scan omits private projects and treats API failures as unavailable", async () => {
  const calls = [];
  const apiFetch = async (url, init) => {
    calls.push(url);
    assert.equal(init.headers.Authorization, undefined);
    const path = new URL(url).pathname;
    if (path === "/users/HenricHuntsman/repos") return {
      ok: true, json: async () => [
        { name: "repoforge", private: false, pushed_at: "2026-10-18T10:00:00Z" },
        { name: "TraceForge", private: true, pushed_at: "2026-10-18T11:00:00Z" },
        { name: "dragonforge", private: false, pushed_at: "2026-10-18T12:00:00Z" },
      ],
    };
    if (path === "/repos/HenricHuntsman/repoforge/actions/runs") return {
      ok: true, json: async () => ({ workflow_runs: [{ status: "completed", conclusion: "success" }] }),
    };
    if (path === "/repos/HenricHuntsman/dragonforge/actions/runs") return { ok: false, status: 403 };
    if (path.endsWith("/pulls")) return { ok: true, json: async () => [{ number: 1 }] };
    throw new Error("Unexpected request: " + path);
  };
  const report = await scanPublicOwner({ apiFetch, now: () => "2026-10-19T00:00:00Z" });
  assert.equal(report.repoCount, 2);
  assert.deepEqual(report.summary, { passing: 1, failing: 0, pending: 0, unverified: 1 });
  assert.equal(report.repositories.find(r => r.name === "dragonforge").ci, "unavailable");
  assert.equal(calls.some(url => url.includes("/TraceForge/")), false);
  assert.equal(toMarkdown(report).includes("TraceForge"), false);
});

test("report exports valid JSON and a phone-readable Markdown summary", async () => {
  const dir = await mkdtemp(join(tmpdir(), "repoforge-cloud-test-"));
  try {
    const report = asReport([{
      name: "alpha", url: "https://github.com/HenricHuntsman/alpha",
      ci: "failure", openPulls: "2", lastPush: null, archived: false,
    }], "2026-10-19T00:00:00Z");
    await saveReport(report, dir);
    const parsed = JSON.parse(await readFile(join(dir, "cloud-status.json"), "utf8"));
    const markdown = await readFile(join(dir, "cloud-status.md"), "utf8");
    assert.equal(parsed.summary.failing, 1);
    assert.match(markdown, /Public GitHub repositories only/);
    assert.match(markdown, /alpha/);
    assert.match(markdown, /private repositories/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
