---
name: repoforge-audit
description: Safely inspect public GitHub project activity and local runtime prerequisites before recommending changes.
---

# RepoForge evidence-first audit

Goal: identify *what to test next*, not to label arbitrary projects healthy from a commit timestamp.

## Run (Python 3.9+, no dependencies)
```bash
python3 tools/repoforge_doctor.py repos --owner HenricHuntsman
python3 tools/repoforge_doctor.py runtime
```

Optional durable output is opt-in and uses exclusive creation:
```bash
python3 tools/repoforge_doctor.py repos --output repoforge-public-report.json
```

Only public repository metadata is fetched. Network failure, quota failure and unknown commit timestamps must remain unknown/unavailable; never fabricate CI results. Scan bounded pages, never silently retrieve tokens. For deeper review, examine explicit GitHub Actions outcomes, test logs, dependencies, release assets and repository code with permission. Recommend read-only cleanup plans first and preserve Git history. Never delete, archive, publish, merge, push or install packages solely because this skill is invoked.

## Do not claim
- A successful activity scan means CI passed.
- A Greenlight checkpoint exists based on a readme or historical log.
- A Colab GPU is running or available because a notebook exists.
- Private source can be scanned from a public dashboard.
