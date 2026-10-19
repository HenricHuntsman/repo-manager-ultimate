# RepoForge on Vercel

RepoForge is a static React/Vite dashboard. Its public-hosted build reads **public GitHub data only**; it does not run the local Ollama server, train models, scan private local files, or move GPU workloads to the cloud.

## Account prerequisite

At the initial setup check on 19 October 2026, Vercel could identify the Hobby account, but creating a Git-linked project returned:

> Failed to link HenricHuntsman/repo-manager-ultimate. You need to add a Login Connection to your GitHub account first.

Vercel also returned `403 Forbidden` for the previously identified default workspace. These are **account configuration blockers**, not evidence of a broken React build.

1. Sign in to your existing Vercel account at https://vercel.com.
2. Open **Account Settings → Authentication → Login Connections**.
3. Connect the GitHub account that owns `HenricHuntsman/repo-manager-ultimate`. Grant the Vercel GitHub app access to this repository as prompted. Review permissions before authorizing; do not share credentials or personal access tokens.
4. Confirm the appropriate Vercel team/workspace is accessible.
5. Import `HenricHuntsman/repo-manager-ultimate` as a new project. Avoid creating a duplicate if it is already linked.
6. Use the `main` branch as production, and examine a **Preview** deployment before promoting or relying on the production site.
7. Verify the generated Vercel URL loads correctly on iPhone and Ubuntu and check the browser's network requests and GitHub API failure/rate-limit states.

## Repository-supplied configuration

The tracked `vercel.json` specifies:

- **Framework**: Vite
- **Install**: `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --ignore-scripts --no-audit --no-fund`
- **Build**: `VITE_PUBLIC_HOSTED=true npm run build`
- **Output**: `dist`

The hosted build setting keeps the optional GitHub access-token field out of the public UI. Do not add GitHub tokens to `VITE_*` variables, source files, build arguments or hosting settings. Any `VITE_*` build variable can be exposed to the browser. This dashboard is deliberately public-data-only.

## Validation and scope

Vercel is not required to operate the existing GitHub Actions cloud checks. Run `npm test` and `VITE_PUBLIC_HOSTED=true npm run build` for local validation. CI passing is **not** proof that a live deployment exists.

Vercel can host the read-only web dashboard independently of the Ubuntu computer. It does not remotely run Electron AppImages, local Ollama, GPU training, private repository scans or autonomous code repairs. Current public GitHub API limits still apply.

When Vercel Git integration is connected, pushes to feature branches normally create preview deployments and merges to `main` can publish production. Use tested and reviewed changes before production.
