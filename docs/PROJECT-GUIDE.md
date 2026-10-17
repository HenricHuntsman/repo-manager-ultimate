# Project and folder guide

RepoForge is a repository dashboard and Electron application, not a Linux distribution.

| Path | Role |
| --- | --- |
| src/ | Dashboard code and seeded fallback data |
| electron/ | Desktop wrapper |
| .github/ | Build and packaging workflows |
| Root package and TypeScript/Vite configuration | Active build inputs; retain configured locations |
| release/ | Generated Linux packages, when built |

Previous main CI passed. Linux AppImage/deb configuration exists, but this review has not installed or smoke-tested those packages. Seeded account data is historical; use live scanning for current state.

Next: build packages from the current lockfile, record artifact checksums, install in a disposable Linux environment and test launch, scan, API errors and export. Keep read-only behaviour and session-only token handling.
