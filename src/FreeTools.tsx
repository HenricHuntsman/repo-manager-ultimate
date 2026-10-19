import { useState } from "react";

type Group = "all" | "build" | "audit" | "recovery";
const items: Array<{
  name: string;
  group: Exclude<Group, "all">;
  mode: string;
  note: string;
  href: string;
}> = [
  {
    name: "RepoForge on Colab",
    group: "build",
    mode: "Temporary CPU session",
    note: "Build, test and preview the open-source web dashboard in a notebook; Colab can disconnect.",
    href: "https://colab.research.google.com/github/HenricHuntsman/repo-manager-ultimate/blob/main/colab/RepoForge_Greenlight_Workbench.ipynb",
  },
  {
    name: "Web build and tests",
    group: "build",
    mode: "GitHub Actions",
    note: "See the real CI build and tests. A successful run does not verify every runtime.",
    href: "https://github.com/HenricHuntsman/repo-manager-ultimate/actions/workflows/ci.yml",
  },
  {
    name: "RepoForge Doctor",
    group: "audit",
    mode: "Read-only Python CLI",
    note: "Inspect public repository activity clues and local runtime details; no token or paid API needed.",
    href: "https://github.com/HenricHuntsman/repo-manager-ultimate/blob/main/tools/repoforge_doctor.py",
  },
  {
    name: "Cloud status checks",
    group: "audit",
    mode: "GitHub Actions",
    note: "Use the existing public-repository cloud scan, including scheduled and manual reports.",
    href: "https://github.com/HenricHuntsman/repo-manager-ultimate/actions/workflows/cloud-continuity.yml",
  },
  {
    name: "Greenlight evidence",
    group: "recovery",
    mode: "Historical archive",
    note: "Review the 12 October R9.1 records; this is not proof that Colab or native Greenlight is running now.",
    href: "https://drive.google.com/drive/folders/18ymYRJ7FRTV56ZJPvR-WMZi9XYWjbDpU",
  },
  {
    name: "Safe project recovery",
    group: "recovery",
    mode: "Reusable local skill",
    note: "An evidence-first checklist for unknown checkpoints, test gaps and preserving source history.",
    href: "https://github.com/HenricHuntsman/repo-manager-ultimate/blob/main/skills/greenlight-recovery/SKILL.md",
  },
];

const filters: Array<{ id: Group; label: string }> = [
  { id: "all", label: "All tools" },
  { id: "build", label: "Build" },
  { id: "audit", label: "Audit" },
  { id: "recovery", label: "Recovery" },
];

export function FreeTools() {
  const [category, setCategory] = useState<Group>("all");
  const visible = items.filter(item => category === "all" || item.group === category);
  return (
    <section className="freeTools" aria-label="Free tools and skills">
      <div className="toolHead">
        <div>
          <p className="eyebrow">FREE TOOLBOX</p>
          <h2>Build, inspect and recover</h2>
          <p>Tools run on different services. Links never start training or paid API requests.</p>
        </div>
        <span className="safeBadge">No paid API required</span>
      </div>
      <nav aria-label="Tool categories" className="toolFilters">
        {filters.map(option => (
          <button type="button" key={option.id}
            aria-pressed={category === option.id}
            className={category === option.id ? "selected" : ""}
            onClick={() => setCategory(option.id)}
          >{option.label}</button>
        ))}
      </nav>
      <div className="toolCards">
        {visible.map(tool => (
          <article key={tool.name}>
            <span className="toolMode">{tool.mode}</span>
            <h3>{tool.name}</h3>
            <p>{tool.note}</p>
            <a href={tool.href} target="_blank" rel="noopener noreferrer"
              aria-label={`Open ${tool.name}`}>Open tool ↗</a>
          </article>
        ))}
      </div>
      <small>RepoForge public metadata checks are not model training. An archived record is not a live health check.</small>
    </section>
  );
}
