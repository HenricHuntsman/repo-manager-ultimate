# RepoForge Dashboard

RepoForge is a local-first repository health and cleanup dashboard. It makes active projects, experiments, upstream mirrors, CI state, and cleanup candidates understandable without performing destructive actions.

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
- Optional import of local Dragon Project Doctor JSON (read-only, browser-only, no upload)
- Live GitHub scan defaults to the current `HenricHuntsman` account rather than the older username
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

For local Ubuntu checkout and archive inventory, see [Dragon Project Doctor import](docs/LOCAL-DOCTOR-IMPORT.md). GitHub scan results and local filesystem evidence are kept separate. The seeded six-repository sample is historical, not a current account census.

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
