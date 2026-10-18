#!/usr/bin/env node
/**
 * Read-only public GitHub status for RepoForge. No checkout of other projects,
 * code execution, private metadata collection, repo mutations or AI calls.
 */
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
export const OWNER = "HenricHuntsman";
const API = "https://api.github.com";
export function classifyRun(run) {
  if (!run) return "no-runs";
  if (run.status !== "completed") return "pending";
  if (run.conclusion === "success") return "success";
  if (run.conclusion === "failure" || run.conclusion === "timed_out") return "failure";
  return run.conclusion || "unknown";
}
export function asReport(repos, generatedAt = new Date().toISOString()) {
  return {
    schema: 1, owner: OWNER, generatedAt,
    scope: "public GitHub repositories only; private and local-only projects excluded",
    repoCount: repos.length,
    summary: {
      passing: repos.filter(r => r.ci === "success").length,
      failing: repos.filter(r => r.ci === "failure").length,
      pending: repos.filter(r => r.ci === "pending").length,
      unverified: repos.filter(r => !["success", "failure", "pending"].includes(r.ci)).length,
    },
    repositories: repos,
  };
}
export function toMarkdown(report) {
  const esc = v => String(v ?? "").replace(/[|<>\r\n]/g, " ").slice(0, 220);
  const lines = [
    "# RepoForge cloud continuity", "",
    "**Generated:** " + esc(report.generatedAt),
    "**Scope:** Public GitHub repositories only. Private repositories and local PC checks are excluded.", "",
    "Repositories **" + report.repoCount + "**; last-run success **" +
      report.summary.passing + "**; failure **" + report.summary.failing +
      "**; pending **" + report.summary.pending +
      "**; unverified **" + report.summary.unverified + "**", "",
    "| Repository | Last workflow | Open PRs | Last push |",
    "| --- | --- | ---: | --- |",
  ];
  for (const r of report.repositories) {
    lines.push("| [" + esc(r.name) + "](" + r.url + ") | " + esc(r.ci) +
      " | " + esc(r.openPulls) + " | " + esc(r.lastPush?.slice(0, 10) || "unknown") + " |");
  }
  lines.push("", "## What this report does not do", "",
    "- It does not run training, inference, builds, or coding agents.",
    "- A passing latest workflow is not proof of a usable release.",
    "- Private repositories are never included in this public report.",
    "- GitHub scheduled workflows may run late; this is a dated snapshot.",
    "- No local paths, model weights, secrets or tokens are included.");
  return lines.join("\n") + "\n";
}
export async function scanPublicOwner({ apiFetch = fetch, token = "", owner = OWNER, now = () => new Date().toISOString() } = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "repoforge-cloud-continuity",
    ...(token ? { Authorization: "Bearer " + token } : {}),
  };
  const get = async path => {
    const response = await apiFetch(API + path, { headers });
    if (!response.ok) throw new Error("GitHub API HTTP " + response.status + " on " + path.split("?")[0]);
    return response.json();
  };
  const found = [];
  for (let page = 1; page <= 2; page++) {
    const list = await get("/users/" + encodeURIComponent(owner) +
      "/repos?per_page=100&page=" + page + "&type=owner&sort=pushed");
    if (!Array.isArray(list)) throw new Error("Unexpected repository listing");
    found.push(...list.filter(r => r.private !== true));
    if (list.length < 100) break;
  }
  const unique = [...new Map(found.slice(0, 200).map(r => [r.name, r])).values()];
  const results = [];
  for (let start = 0; start < unique.length; start += 4) {
    const batch = unique.slice(start, start + 4);
    results.push(...await Promise.all(batch.map(async r => {
      const base = "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(r.name);
      let ci = "unavailable", openPulls = "unavailable";
      try {
        const runs = await get(base + "/actions/runs?per_page=1");
        ci = classifyRun(runs.workflow_runs?.[0]);
      } catch { /* inaccessible Actions must remain unknown */ }
      try {
        const pulls = await get(base + "/pulls?state=open&per_page=100");
        if (Array.isArray(pulls)) openPulls = pulls.length === 100 ? "100+" : String(pulls.length);
      } catch { /* inaccessible PR count must remain unknown */ }
      return {
        name: r.name,
        url: "https://github.com/" + encodeURIComponent(owner) + "/" + encodeURIComponent(r.name),
        ci, openPulls,
        lastPush: typeof r.pushed_at === "string" ? r.pushed_at : null,
        archived: r.archived === true,
      };
    })));
  }
  return asReport(results.sort((a, b) => a.name.localeCompare(b.name)), now());
}
export async function saveReport(report, outDir = "reports") {
  await mkdir(outDir, { recursive: true });
  const markdown = toMarkdown(report);
  await Promise.all([
    writeFile(join(outDir, "cloud-status.json"), JSON.stringify(report, null, 2) + "\n", "utf8"),
    writeFile(join(outDir, "cloud-status.md"), markdown, "utf8"),
  ]);
  return markdown;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await scanPublicOwner({ token: process.env.GITHUB_TOKEN || "" });
    const markdown = await saveReport(report, process.env.REPORT_DIR || "reports");
    console.log("RepoForge cloud check: " + report.repoCount + " public repositories; " +
      report.summary.failing + " have a failing latest workflow.");
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
    }
  } catch (error) {
    console.error("Cloud check unavailable:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
