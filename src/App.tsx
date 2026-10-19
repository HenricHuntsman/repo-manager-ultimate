import { useMemo, useState } from "react";
import { repositories as seededRepositories } from "./data";
import { CompareAndExport } from "./CompareAndExport";
import { FreeTools } from "./FreeTools";
import { inspectRepository, scanPublicRepositories } from "./github";
import { readPublicCache, savePublicCache } from "./publicCache";
import type { Health, RepoInspection, RepoKind, Repository } from "./types";

const OWNER = "HenricHuntsman";
const PUBLIC_HOSTED = import.meta.env.VITE_PUBLIC_HOSTED === "true";

const kindLabels: Record<RepoKind | "all", string> = {
  all: "All repositories",
  active: "Active",
  experiment: "Experiments",
  upstream: "Upstream",
  cleanup: "Cleanup",
};

const healthLabels: Record<Health, string> = {
  healthy: "Recent activity",
  attention: "Older activity",
  review: "Review",
};

function App() {
  const [cachedPublic] = useState(() => PUBLIC_HOSTED ? readPublicCache() : null);
  const [repositories, setRepositories] = useState<Repository[]>(
    () => cachedPublic?.repositories ?? seededRepositories,
  );
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<RepoKind | "all">("all");
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(() => cachedPublic
    ? `Showing browser-cached public data from ${new Date(cachedPublic.scannedAt).toLocaleString("en-AU")}. Run a scan to refresh.`
    : "Showing historical sample data. Run a live scan for current public repositories.");
  const [scanError, setScanError] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [inspections, setInspections] = useState<Record<string, RepoInspection>>({});
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [token, setToken] = useState("");

  const runScan = async () => {
    setScanning(true);
    setScanError(false);
    setScanMessage("Reading public GitHub repository metadata…");
    try {
      const live = await scanPublicRepositories(OWNER, token);
      setRepositories(live);
      if (PUBLIC_HOSTED) savePublicCache(live);
      setLastScan(new Date());
      setScanMessage(`Live scan complete: ${live.length} public repositories loaded.`);
    } catch (error) {
      setScanError(true);
      setScanMessage(error instanceof Error ? error.message : "The GitHub scan failed.");
    } finally {
      setScanning(false);
    }
  };

  const inspect = async (name: string) => {
    setInspecting(name);
    try {
      const result = await inspectRepository(OWNER, name, token);
      setInspections((current) => ({ ...current, [name]: result }));
    } catch (error) {
      setInspections((current) => ({
        ...current,
        [name]: {
          openPulls: null,
          workflowName: "Inspection failed",
          workflowState: "unavailable",
          message: error instanceof Error ? error.message : "Unknown inspection error",
        },
      }));
    } finally {
      setInspecting(null);
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return repositories.filter((repo) => {
      const matchesKind = kind === "all" || repo.kind === kind;
      const matchesQuery =
        !needle ||
        repo.name.toLowerCase().includes(needle) ||
        repo.description.toLowerCase().includes(needle) ||
        repo.language.toLowerCase().includes(needle);
      return matchesKind && matchesQuery;
    });
  }, [kind, query, repositories]);

  const healthy = repositories.filter((repo) => repo.health === "healthy").length;
  const attention = repositories.length - healthy;
  const cleanup = repositories.filter((repo) => repo.kind === "cleanup").length;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark">RF</span>
          <div>
            <strong>RepoForge</strong>
            <span>Repository command centre</span>
          </div>
        </div>
        <button className="scanButton" type="button" onClick={runScan} disabled={scanning}>
          <span className={scanning ? "spin" : ""} aria-hidden="true">↻</span>
          {scanning ? " Scanning…" : " Run live scan"}
        </button>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">ACCOUNT OVERVIEW · {OWNER}</p>
          <h1>See repository activity, verify CI, and plan safe improvements.</h1>
          <p className="heroCopy">
            A local-first dashboard for repository health, activity, duplicates,
            upstream tracking, and deliberate cleanup.
          </p>
          <div className={`scanStatus ${scanError ? "error" : ""}`} role="status">
            <span>{scanError ? "!" : "●"}</span>
            <div>
              <strong>{scanMessage}</strong>
              <small>
                {lastScan
                  ? `Updated ${lastScan.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`
                  : "Run a live scan to replace the snapshot with current public data."}
              </small>
            </div>
          </div>
        </section>

        <section className="labPanel" aria-label="Free Colab development workbench">
          <div>
            <p className="eyebrow">OPTIONAL FREE DEVELOPMENT LAB</p>
            <h2>Run RepoForge in a temporary Colab session</h2>
            <p>Rebuild the same public dashboard, run tests and preview it from a browser.
              Greenlight report checks are optional and read-only. Colab is not a 24/7 host.</p>
          </div>
          <a
            href="https://colab.research.google.com/github/HenricHuntsman/repo-manager-ultimate/blob/main/colab/RepoForge_Greenlight_Workbench.ipynb"
            target="_blank"
            rel="noopener noreferrer"
          >Open free Colab workbench ↗</a>
        </section>

        {!PUBLIC_HOSTED && (
        <section className="tokenPanel">
          <div>
            <p className="eyebrow">OPTIONAL API ACCESS</p>
            <h2>Session-only read token</h2>
            <p>Use a fine-grained GitHub token with read-only repository permissions for higher API limits. It stays in memory and is erased when this window closes.</p>
          </div>
          <label>
            <span>Fine-grained token</span>
            <input aria-label="Fine-grained token" type="password" value={token} onChange={(event) => setToken(event.target.value)}
              autoComplete="off" spellCheck={false} placeholder="github_pat_… (optional)" />
            <small>{token ? "Token active for this session only." : "Public unauthenticated mode."}</small>
          </label>
        </section>
        )}

        <section className="stats" aria-label="Repository summary">
          <article><span>Total tracked</span><strong>{repositories.length}</strong><small>public scan or historical sample</small></article>
          <article><span>Recently active</span><strong className="green">{healthy}</strong><small>not proof of passing tests</small></article>
          <article><span>Review or older</span><strong className="amber">{attention}</strong><small>CI status checked separately</small></article>
          <article><span>Cleanup queue</span><strong className="violet">{cleanup}</strong><small>never delete automatically</small></article>
        </section>

        <FreeTools />

        <CompareAndExport owner={OWNER} repositories={repositories} token={token} />

        <section className="workspace">
          <div className="controls">
            <label className="search">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search repositories, languages, or descriptions"
              />
            </label>
            <div className="filters" aria-label="Repository type">
              {(Object.keys(kindLabels) as Array<RepoKind | "all">).map((value) => (
                <button type="button" className={kind === value ? "active" : ""}
                  onClick={() => setKind(value)} key={value}>
                  {kindLabels[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="tableHeader">
            <div><h2>Repository activity and CI</h2><p>{filtered.length} result{filtered.length === 1 ? "" : "s"}</p></div>
            <span className="safeBadge">Read-only safe mode</span>
          </div>

          <div className="repoGrid">
            {filtered.map((repo) => (
              <article className="repoCard" key={repo.name}>
                <div className="repoTop">
                  <div><span className={`healthDot ${repo.health}`} /><span className="kind">{kindLabels[repo.kind]}</span></div>
                  <span className={`healthPill ${repo.health}`}>{healthLabels[repo.health]}</span>
                </div>
                <h3>
                  {repo.htmlUrl ? <a href={repo.htmlUrl} target="_blank" rel="noreferrer">{repo.name}</a> : repo.name}
                </h3>
                <p>{repo.description}</p>
                <dl>
                  <div><dt>Language</dt><dd>{repo.language}</dd></div>
                  <div><dt>Last activity</dt><dd>{repo.lastActivity}</dd></div>
                  <div><dt>Signal</dt><dd>{repo.checks}</dd></div>
                  {repo.sizeKb !== undefined && <div><dt>Repository size</dt><dd>{repo.sizeKb.toLocaleString()} KB</dd></div>}
                </dl>
                <div className="recommendation"><span>Recommended</span><strong>{repo.recommendation}</strong></div>
                <div className="inspection">
                  {inspections[repo.name] ? (
                    <>
                      <div className="inspectionRow">
                        <span>Open pull requests</span>
                        <strong>{inspections[repo.name].openPulls ?? "Unavailable"}</strong>
                      </div>
                      <div className="inspectionRow">
                        <span>Latest workflow</span>
                        <strong className={`workflow ${inspections[repo.name].workflowState}`}>
                          {inspections[repo.name].workflowName}
                        </strong>
                      </div>
                      {inspections[repo.name].workflowUpdatedAt && (
                        <small>Updated {inspections[repo.name].workflowUpdatedAt}</small>
                      )}
                      {inspections[repo.name].message && <small>{inspections[repo.name].message}</small>}
                    </>
                  ) : (
                    <small>CI and pull-request details have not been inspected.</small>
                  )}
                  <button type="button" onClick={() => inspect(repo.name)} disabled={inspecting === repo.name}>
                    {inspecting === repo.name ? "Inspecting…" : inspections[repo.name] ? "Refresh details" : "Inspect CI & PRs"}
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="emptyState">
              <strong>No repositories match this view.</strong>
              <button type="button" onClick={() => { setQuery(""); setKind("all"); }}>Reset filters</button>
            </div>
          )}
        </section>

        <section className="principles">
          <div><span>01</span><h2>Inspect first</h2><p>Collect evidence before proposing a change.</p></div>
          <div><span>02</span><h2>Preserve history</h2><p>Archive and consolidate before considering deletion.</p></div>
          <div><span>03</span><h2>Verify fixes</h2><p>Build, lint, and test every repair before merging.</p></div>
        </section>
      </main>

      <footer>RepoForge 0.7 · Compare and export · No destructive actions</footer>
    </div>
  );
}

export default App;
