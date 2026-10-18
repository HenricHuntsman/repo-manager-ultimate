# RepoForge Phone & Cloud Continuity

**Goal:** keep *public GitHub project status and normal GitHub CI* accessible from
an iPhone, browser or PC. This does not imply a coding agent automatically
writes code while nobody is asking it to work.

## On iPhone

1. Open the GitHub Mobile app, go to `HenricHuntsman/repo-manager-ultimate`.
2. Open **Actions → Phone & Cloud Progress → Run workflow**.
3. Open the finished run to read its **Summary**. Download its
   `public-project-status` artifact (JSON + Markdown) when needed.
4. Use repository **Issues** to capture ideas, failures or next tasks while away.
   GitHub stores them independently of the Ubuntu computer.
5. Existing CI workflows on other public repos still run when triggered by
   their configured GitHub events. This dashboard only checks their statuses.

A scheduled read-only status check is configured for 08:17, 12:17, 14:17 and
19:17 **Australia/Melbourne** each day. GitHub scheduling is best effort and
may be delayed. Both scheduled and manually triggered workflows must live on
the **default branch**; until this pull request is merged, only feature-branch
push validation is available.

## What's actually running

- The cloud scan fetches the owner's PUBLIC repository metadata, most recent
  Actions status and open PR counts. It does **not** clone other repositories,
  run their builds, merge or push code, or invoke AI.
- Output appears in the GitHub Actions step summary and a three-day artifact.
- The full archive and all original source remain in GitHub or on Ubuntu.
- The collector uses a built-in short-lived GitHub Actions token restricted to
  read-only repository access. It does not include tokens in the reports.
- Public reports cannot include private TraceForge or other private projects.
  Use their own GitHub screens and authorised workflows for private status.
- Standard GitHub-hosted runners for public repositories are included free
  by GitHub. Artifact/storage and platform policies are separately subject
  to account limits. No paid or larger runner is configured.

## Ubuntu versus cloud

| Work | PC powered OFF | PC powered ON |
| --- | --- | --- |
| Cloud status and public GitHub Actions | Yes | Yes |
| GitHub Issues and PR review from iPhone | Yes | Yes |
| Public CI configured on other repositories | Yes | Yes |
| Local Ollama on `127.0.0.1:11434` | No | Yes |
| RTX 5060 Ti Greenlight checkpoint training | No | Yes |
| Dragon Project Doctor local folder scan | No | Yes |
| Automated code generation while unattended | Not configured | Not configured |

For safe **optional** remote access to a powered-on Ubuntu PC from iPhone,
consider a private encrypted network such as Tailscale. Do not forward the
unauthenticated Ollama API or local telemetry endpoints to the public internet.
A running PC and secure access must be configured and validated separately.

## Development verification

- `node --check scripts/cloud-continuity.mjs`
- `node --test scripts/cloud-continuity.test.mjs`
- GitHub Actions workflow **Phone & Cloud Progress** should produce a
  `public-project-status` artifact on the feature branch before merging.
- The scheduled jobs will not run until the workflow is on `main`.

This is an intentionally non-destructive first version. It provides
cross-device *status and control*, not continuous GPU computation or
autonomous coding.
