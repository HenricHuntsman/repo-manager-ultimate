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

## Run locally

```bash
npm install
npm run dev
```

Open the Vite address shown in the terminal.

## Run as a desktop application

```bash
npm install
npm run desktop
```

For Vite live development, start `npm run dev` and then run:

```bash
REPOFORGE_DEV_URL=http://localhost:4173 npm run desktop:dev
```

## Build Linux packages

```bash
npm install
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
