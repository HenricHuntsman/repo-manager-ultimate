// @vitest-environment node
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";

const html = readFileSync(new URL("../public/dragonhub.html", import.meta.url), "utf8");
const script = readFileSync(process.env.DRAGONHUB_TEST_SCRIPT || new URL("../public/dragonhub.js", import.meta.url), "utf8");
const windows: JSDOM[] = [];
afterEach(() => { for (const dom of windows.splice(0)) dom.window.close(); });

function repository(i: number, extra = {}) {
  return { name: "project-" + i, private: false, owner: { login: "HenricHuntsman" },
    description: "Public project", default_branch: "main", pushed_at: "2026-11-01T00:00:00Z", ...extra };
}
async function page(pages = [Array.from({ length: 35 }, (_, i) => repository(i))]) {
  const dom = new JSDOM(html, { url: "https://example.test/dragonhub.html", runScripts: "outside-only" });
  windows.push(dom);
  const fetch = vi.fn(async (url: string) => {
    const number = Number(new URL(url).searchParams.get("page") || 1);
    return { ok: true, json: async () => pages[number - 1] || [] };
  });
  dom.window.fetch = fetch as unknown as typeof dom.window.fetch;
  dom.window.eval(script);
  await vi.waitFor(() => expect(dom.window.document.querySelector("#reload-repos")?.hasAttribute("disabled")).toBe(false));
  return { dom, document: dom.window.document, fetch };
}
function report(services = { forgejo: { http_code: 200, classification: "reachable" }, mcp: { http_code: 405, classification: "reachable_protocol" } }) {
  return { schema: "dragonhub-readonly-v1", created_at: new Date().toISOString(), services };
}
async function importReport(dom: JSDOM, data: unknown) {
  const input = dom.window.document.querySelector<HTMLInputElement>("#report-file")!;
  const text = JSON.stringify(data);
  Object.defineProperty(input, "files", { configurable: true, value: [{ name: "status.json", size: text.length, text: async () => text }] });
  input.dispatchEvent(new dom.window.Event("change"));
  await vi.waitFor(() => expect(dom.window.document.querySelector("#report-message")?.textContent).toMatch(/Loaded|Cannot load/));
}

it("lets visitors reveal all 35 public repositories and resets pagination when filtering", async () => {
  const { dom, document } = await page();
  expect(document.querySelectorAll(".repo-item")).toHaveLength(18);
  const more = document.querySelector<HTMLButtonElement>("#show-more-repos")!;
  more.click();
  expect(document.querySelectorAll(".repo-item")).toHaveLength(35);
  expect(more.hidden).toBe(true);
  const search = document.querySelector<HTMLInputElement>("#repo-search")!;
  search.value = "project-34";
  search.dispatchEvent(new dom.window.Event("input"));
  expect(document.querySelectorAll(".repo-item")).toHaveLength(1);
  expect(document.querySelector(".repo-name")?.textContent).toContain("project-34");
  search.value = "";
  search.dispatchEvent(new dom.window.Event("input"));
  expect(document.querySelectorAll(".repo-item")).toHaveLength(18);
  expect(more.hidden).toBe(false);
});

it("paginates GitHub GET requests, deduplicates results and excludes private, unknown and other-owner records", async () => {
  const first = Array.from({ length: 100 }, (_, i) => repository(i));
  const { document, fetch } = await page([first, [repository(99), repository(100), repository(101, { private: true }), repository(102, { private: undefined }), repository(103, { owner: { login: "someone-else" } })]]);
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [, options] of fetch.mock.calls as unknown as [string, {method: string; credentials: string}][]) {
    expect(options.method).toBe("GET");
    expect(options.credentials).toBe("omit");
  }
  expect(document.querySelector("#repos-status")?.textContent).toContain("101 loaded");
});

it("keeps a bounded 300-repository scan explicit", async () => {
  const pages = Array.from({ length: 3 }, (_, p) => Array.from({ length: 100 }, (_, i) => repository(p * 100 + i)));
  const { document, fetch } = await page(pages);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(document.querySelector("#repos-status")?.textContent).toContain("Scan capped at 300");
});

it("links to the default-branch CI without treating push activity as a passed check", async () => {
  const { document } = await page([[repository(1, { default_branch: "feature/a b" })]]);
  const link = document.querySelector<HTMLAnchorElement>(".repo-ci")!;
  expect(new URL(link.href).searchParams.get("query")).toBe("branch:feature/a b");
  expect(document.querySelector(".repo-meta")?.textContent).toContain("CI is a separate check");
});

it("derives access refusal from HTTP status even when the imported classification claims success", async () => {
  const { dom, document } = await page();
  const data = report();
  data.services.forgejo.http_code = 403;
  await importReport(dom, data);
  expect(document.querySelector('[data-service="forgejo"] .pill')?.textContent).toBe("ACCESS REFUSED");
  expect(document.querySelector('[data-service="chatgpt"] .pill')?.textContent).toBe("TO VERIFY");
});

it("validates the entire report before changing either service card", async () => {
  const { dom, document } = await page();
  const before = document.querySelector('[data-service="forgejo"]')?.textContent;
  const data = report();
  data.services.mcp.http_code = 999;
  await importReport(dom, data);
  expect(document.querySelector("#report-message")?.textContent).toContain("Cannot load");
  expect(document.querySelector('[data-service="forgejo"]')?.textContent).toBe(before);
});

it("shows the age of historical observations and never promotes MCP HTTP reachability into tool access", async () => {
  const { dom, document } = await page();
  const data = { ...report(), created_at: "2020-01-01T00:00:00Z" };
  await importReport(dom, data);
  expect(document.querySelector("#report-time")?.textContent).toContain("Historical report");
  expect(document.querySelector('[data-service="mcp"] .detail')?.textContent).toContain("Tool discovery is unverified");
  expect(document.querySelector('[data-service="chatgpt"] .pill')?.textContent).toBe("TO VERIFY");
});
