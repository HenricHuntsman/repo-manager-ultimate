# RepoForge stability, incident response, and independent recovery

Status: development documentation prepared 19 October 2026. The second hosting account/mirror is **not provisioned** by this document.

## Independence strategy

Do not treat GitHub, a Vercel status badge, a notebook's existence, or a recent commit as sufficient evidence that the app and backups are sound.

| Layer | Primary | Independent recovery |
| --- | --- | --- |
| Git history | GitHub | Verified local `git bundle` on a different disk; optionally GitLab or Codeberg remote |
| Static website | Vercel | GitHub Pages build (needs one-time activation) or a separate provider such as Cloudflare Pages (requires account and configured source) |
| Hosted CI | GitHub Actions | `npm ci --ignore-scripts && npm test && npm run build` on a separate machine, or independently configured GitLab CI |
| Greenlight/LLM compute | Ubuntu/Colab as configured | Saved user-controlled checkpoint copies and reproducible read-only restore tests (not provided by a web host) |
| Data/metadata | Public GitHub API | Last explicitly labeled snapshot; unknown and rate-limited data stay unknown |

**Do not mirror secrets, API keys, recovery codes, private checkpoints, or private projects to a public service.** Git history backups may contain deleted files in old commits. Audit before publishing new mirrors. Encrypt backups containing private information.

## New verified bundle backup tool

From your Ubuntu computer, once the existing checkout is up to date, make an **offline-source** backup to another disk:

```bash
python3 tools/git_recovery_backup.py \
  --source "$HOME/Projects/your-existing-repoforge-checkout" \
  --destination "/path/to/other-disk/repo-backups"
```

Or source from public Git hosting over HTTPS when available:

```bash
python3 tools/git_recovery_backup.py \
  --source "https://github.com/HenricHuntsman/repo-manager-ultimate.git" \
  --destination "$HOME/Backups/RepoForge"
```

Each run creates a new timestamped folder with `repository.bundle` and a SHA-256 manifest; it **never force-pushes**, overwrites old backup files or touches your original checkout. The command requires local Git and storage. CI covers a complete offline round-trip restore including a tag.

To verify **an existing** archive entirely offline, including a disposable restore and Git object integrity check:

```bash
python3 tools/verify_git_recovery.py "/path/to/backup/git-recovery-YYYYMMDDTHHMMSSZ-xxxxxxxx"
```

The verifier checks the saved SHA-256, declared branch/tag references, the local restored Git repository and `git fsck --full`. It does not require GitHub, GitLab, Vercel, Colab or any credentials. A failed check exits nonzero and reports **NOT VERIFIED**; no backup source is modified. **A newly created or verified bundle still needs to be copied to a different physical disk or trusted encrypted offsite storage to survive PC/disk loss.** Backup manifests redact original local checkout paths.

To restore from an available bundle after an outage:

```bash
git clone "/path/to/backup/repository.bundle" repoforge-restored
git -C repoforge-restored log -1 --oneline
git -C repoforge-restored tag -l
```

The bundle includes Git history/branches/tags (as fetched) but **not** GitHub issues, PR reviews, Actions artifacts, GitHub releases assets, Git LFS object content, or any external secrets/services. Those need separate export and verification.

A bundle taken before recent commits may be **stale**; compare HEAD SHAs before depending on it. Keep **at least two independently stored copies** of critical repositories, one not dependent on GitHub.

## Alternative Git hosting: preserve optionality

- **GitLab.com Free** — suitable second code host with its own CI; quota and account verification apply. Recommended as a second host for projects with complex CI/private work.
- **Codeberg / Forgejo** — community-run free-software oriented alternative, able to migrate code and metadata. Respect its free/open-source use expectations and resource policies; hosted Actions resources are constrained.
- **Self-hosted Forgejo/Gitea** — source control owned by you, especially useful on Ubuntu, but it is **not an offsite backup** if on the same computer/disk or unavailable when powered off.
- **Bitbucket** — another hosted git-provider choice; compare quotas and available CI before moving.

Never claim any provider will be universally more reliable or immune to outages. Using multiple independently controlled copies provides stronger recovery than replacing GitHub outright.

### How to set up a new independent remote (requires its own account)

1. Create a separate account with 2FA on GitLab or Codeberg.
2. Create an **empty** repository for RepoForge, leaving existing GitHub `origin` unchanged. Do not initialize the empty destination with independent commits.
3. Locally add a second remote: `git remote add backup <your-exact-gitlab-or-codeberg-clone-url>`.
4. Test permissions and inspect that the destination is empty. For first publication, push only approved branches/tags (e.g. `git push backup main` and selected tags), rather than destructive `--mirror` or `--force`.
5. Compare exact commit SHAs and restore-test the mirror. Repeat when source history changes. Back up issues/release assets separately if needed.
6. If source hosting goes offline, work from the local checkout or recovery bundle and push to your independently verified backup host. Reconcile divergent branches when both services recover.

The **current GitHub repo is still primary**; this guide does not imply GitLab/Codeberg accounts have been created or synchronized.

## Standalone CI without GitHub Actions

The committed `.gitlab-ci.yml` is an independent build/test pipeline *template* for GitLab.com or compatible GitLab installations. Once you personally create and connect an authorized GitLab repository, GitLab can run the Vite build, React regression tests, Python Doctor tests, and offline Git-bundle recovery tests using its own runners. Until that first GitLab execution succeeds, the independent CI remains **unverified**.

GitLab's free hosted compute has limits. Keep the first mirror read-only until its branches and artifacts have been checked; **never force-push an unrelated history**.

## Failure handling and validation

| Failure | Expected outcome | Test |
| --- | --- | --- |
| GitHub API returns 429 / rate limit | Existing dashboard data remains; explicit error | Unit tests |
| Page 2 fails after page 1 succeeds | No truncated scan falsely reported as complete | Unit tests |
| GitHub 502/503/504 | One bounded retry; then preserve prior results | Unit tests |
| GitHub returns non-array/invalid timestamps | Reject malformed results; flag unknown timestamps | Unit tests |
| More than 500 repositories | Explicit incomplete-scan error | Unit tests |
| 100+ open PRs | Inspect additional pages; unknown if too many to verify | Unit tests |
| CI is inaccessible/404 | Unavailable, not a fictitious successful state | Unit tests |
| GitHub hosting unavailable, local Git checkout exists | Local Git bundle + independent restore | Python offline integration tests |
| Vercel previews work but production fails | Review last READY deployment and build logs before promotion; use known-good rollback if needed | Manual Vercel verification |
| Colab disconnects | Website stays separate; only saved Drive-approved artifacts persist | Manual Colab test |

The current app is primarily a public-source **dashboard**, not a hosted CI engine, universal repair service or permanent LLM inference platform. No tool here autonomously modifies external repositories.

## Further work (not yet verified)

- Set up and validate a second Git hosting account and test a real pushed/restored mirror.
- Export issues and release assets with explicit permission for each repository.
- Independently host a second read-only static website and verify it from a phone.
- Add slow network/browser smoke tests separately from code CI, to avoid false build failures during GitHub/Vercel outages.
- Perform actual runtime Colab/Greenlight checks, separate from repo/website tests.
