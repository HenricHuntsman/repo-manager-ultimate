---
name: colab-session
description: Run an opt-in temporary Colab build or Greenlight recovery test using free-tier resources without exposing secrets.
---

# Temporary Colab session

## Read-only website work
1. Open `colab/RepoForge_Greenlight_Workbench.ipynb` and confirm its source branch.
2. Use a CPU runtime; verify Node >=22.12 or >=24 and available storage.
3. Clone into an empty temporary folder, run `npm ci`, `npm test`, `npm run build`; inspect log failures before rerunning.
4. Preview the built files through Colab's temporary port iframe. Do not create public tunnels or claim the iframe is permanent hosting.
5. Use `tools/repoforge_doctor.py repos` for public metadata only. The live Vercel website remains the stable independent frontend.

## Greenlight boundaries
- Archived Greenlight R9 multi-AI Colab notebooks are separate from this website workbench. Do not silently run their optional cloud API calls.
- Enable Drive mount / report saving only after consent in the notebook.
- Original model weights stay unchanged; local starter and Qwen weights are distinct.
- Drive snapshots and notebook code do not prove a session is currently running.

## Free tier
Colab compute and GitHub/Vercel hosting have usage limits; a no-paid-API demo is not a promise of unlimited always-on resources or zero-cost usage in every situation.
