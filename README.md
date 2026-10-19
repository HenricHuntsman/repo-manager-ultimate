# RepoForge Dashboard

RepoForge is a local-first repository health and cleanup dashboard. It makes active projects, experiments, upstream mirrors, CI state, and cleanup candidates understandable without performing destructive actions.

## Open from iPhone or PC — works now

These **GitHub-hosted links** work from a phone or computer without an Ubuntu session:

- **[Public project hub / repository list](https://github.com/HenricHuntsman?tab=repositories)** — browse code, history and public projects.
- **[Cloud progress reports](https://github.com/HenricHuntsman/repo-manager-ultimate/actions/workflows/cloud-continuity.yml)** — run/view the read-only status scan; its completed runs include a short report and downloadable JSON.
- **[Shared programming queue](https://github.com/HenricHuntsman/repo-manager-ultimate/issues/13)** — keep next actions in one place.
- **[RepoForge build & test results](https://github.com/HenricHuntsman/repo-manager-ultimate/actions/workflows/ci.yml)** — confirm the dashboard is building.
- **[RepoForge website build / future Pages deployment](https://github.com/HenricHuntsman/repo-manager-ultimate/actions/workflows/repoforge-website.yml)** — tested static build, but **not confirmed as a live public website**.
- **[DragonForge Code](https://github.com/HenricHuntsman/dragonforge-code)** · **[Greenlight / mini-AGI](https://github.com/HenricHuntsman/mini-AGI)** · **[AgentFoundry](https://github.com/HenricHuntsman/AgentFoundry-instantly)** — public source and per-project Actions.

The built React website requires **Settings → Pages → Source: GitHub Actions**, then a manual run of **Free RepoForge website** on `main` before a Pages URL is claimed live. [Instructions](docs/FREE-WEB-HOSTING.md). No GitHub token or private repo content belongs on public hosting. Public status checks **do not** train models, run local Ollama, or automatically fix code.

---
## Version 0.7

- Responsive repository health dashboard
- Search and category filters
- Health, activity, and CI summaries
- Safe cleanup recommendations
- Seeded fallback data based on a historical account audit; sample data is not a current scan
- Live read-only scan of public GitHub repositories
- Loading, API failure, and public rate-limit handling
- Automatic metadata classification and activity signals
- On-demand open pull-request counts
- Latest GitHub Actions workflow status and date
- Explicit no-workflow, unavailable, pending, success, and failure states
- Read-only recursive tree comparison for duplicate review
- Downloadable JSON cleanup-plan exports
- Security-hardened Electron desktop wrapper
- Isolated renderer with Node integration disabled
- External navigation restricted to GitHub links
- AppImage and Debian package generation
- Manual GitHub Actions packaging with downloadable artifacts
- Optional fine-grained read-only GitHub token
- Token retained only in memory for the active window
- No token persistence, export, logging, or build embedding
- Explicit non-destructive design

## Free hosted web dashboard

Prepare the existing RepoForge interface for **GitHub Pages** and optionally mirror it on **Cloudflare Pages**, so the same public dashboard can be opened from iPhone or desktop without the Ubuntu machine. See [free web-hosting instructions](docs/FREE-WEB-HOSTING.md). Static site publishing requires a one-time GitHub Pages setting; no site is claimed live until the deployment succeeds.

## Phone and cloud progress

Run read-only public repository checks from [GitHub Actions](https://github.com/HenricHuntsman/repo-manager-ultimate/actions) on iPhone or desktop. See [Phone & Cloud Continuity](docs/MOBILE-CLOUD-CONTINUITY.md) for manual triggering, the scheduled Melbourne-time check-ins and what still requires a powered-on Ubuntu computer. These checks do not write code or include private repositories.

## Run locally

```bash
npm ci
npm run dev
```

Open the Vite address shown in the terminal.

## Run as a desktop application

```bash
npm ci
npm run desktop
```

For Vite live development, start `npm run dev` and then run:

```bash
REPOFORGE_DEV_URL=http://localhost:4173 npm run desktop:dev
```

## Build Linux packages

```bash
npm ci
npm run package:linux
```

Packages are written to `release/`. These development packages are currently unsigned.

## Validate

```bash
npm run build
```

## Planned next steps

1. Installer signing through protected GitHub Secrets

RepoForge never deletes or archives repositories automatically.

## Optional higher API limits

Paste a fine-grained GitHub token into the session-only field. Grant only read access to repository metadata, pull requests, and Actions. RepoForge does not persist the token; closing or refreshing the window clears it. Never commit tokens to the repository or place them in Vite environment variables.

## Folder organisation and recovery

See the [project and folder guide](docs/PROJECT-GUIDE.md) for preserved material, verified limits and the next milestone.

## Qualification status

The 18 October documentation-cleanup commit passed [CI](https://github.com/HenricHuntsman/repo-manager-ultimate/actions/runs/39079681607). This verifies the workflow's checks, not installation of AppImage/deb packages. Treat version 0.7 as a development version; RC/RTM readiness has not been established. Use the committed lockfile with npm ci.
