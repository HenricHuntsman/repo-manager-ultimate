# RepoForge on free web hosting (iPhone + desktop)

This is the existing RepoForge React/Vite dashboard, published as static files.
No GPU training, local Ollama, private source, secrets, or model checkpoints
are moved to a public site.

## GitHub Pages — no new hosting account

The "Free RepoForge website" workflow has two modes:

- Pull request: build and tests only; keep static-site artifact for review.
- Manually run from main: build and deploy after GitHub Pages is enabled.

Steps AFTER this pull request is merged:

1. Open Settings > Pages > Build and deployment for this repository.
2. Set Source to **GitHub Actions**.
3. Open Actions > Free RepoForge website > Run workflow on main.
4. Verify both jobs passed, then visit
   https://henrichuntsman.github.io/repo-manager-ultimate/

The static Vite build uses the existing relative asset paths. The public host
hides the GitHub token input and uses read-only public GitHub API requests.
Public repo status depends on the API being available and within limits.
Do not treat this URL as live until Pages reports a successful deployment.

## Independent Cloudflare Pages mirror — optional

Requires an external Cloudflare account and a one-time GitHub connection.
The Cloudflare Free plan has limits, but no paid features are required.

- Select existing repository: HenricHuntsman/repo-manager-ultimate
- Framework preset: Vite
- Production branch: main
- Build command: npm ci && npm run build
- Build environment variable: VITE_PUBLIC_HOSTED=true
- Build output directory: dist
- Use the resulting pages.dev address as a second bookmark.

Both mirrors depend on GitHub API for dynamic public repo data; hosting
redundancy does not eliminate GitHub API downtime. Do not link secrets.

## Useful free services

- GitHub Codespaces: browser coding with monthly free quota and idle timeout.
- Cloudflare Workers: limited free scheduled checks and lightweight serverless
  functions. Not a free full-time training GPU.
- UptimeRobot: optional free availability checks; not application tests.
- Existing GitHub Actions: run configured public CI and phone-friendly reports.

## Limits and safety

- iPhone can read public dashboard and start CI without Ubuntu running.
- All static-host content is public; never publish private repository source,
  access tokens, local paths, training checkpoints, or user personal data.
- Local Ollama, GPU training and Dragon Project Doctor scans require Ubuntu
  switched on. Remote access would need separate secure setup.
- Status checks do not automatically write code or fix every CI failure.
- Build verification is not the same as a successful real-world deployment.

## Verify before release

GitHub CI must pass npm test and VITE_PUBLIC_HOSTED=true npm run build.
The pull request intentionally does not deploy until you select the publishing
source and start the main-branch workflow.
