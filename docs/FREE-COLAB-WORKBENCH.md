# Free RepoForge + Greenlight Colab workbench

## What it does

[Open RepoForge + Greenlight notebook in Colab](https://colab.research.google.com/github/HenricHuntsman/repo-manager-ultimate/blob/main/colab/RepoForge_Greenlight_Workbench.ipynb)

This is a **homegrown, no-paid-API-required** companion to the existing [RepoForge website](https://repoforge-dashboard.vercel.app). It builds the public React/Vite dashboard, runs its tests, previews the locally built site in a temporary Colab session, and obtains a *read-only public GitHub metadata* snapshot. Colab itself has free-tier usage limits and session expiry; this is not an always-on server or free GPU guarantee.

The **optional** Greenlight Drive step checks only whether a small, named set of archived progress files exist in the user's own Drive. It does not fetch, execute, publish, or overwrite checkpoint weights. Both Drive mounting and saving status to Drive require explicit notebook-variable changes from `False` to `True`.

## Start on iPhone or PC

1. Open the notebook link above while signed in to a Google account with Colab access. CPU runtime is sufficient.
2. Read the notebook cells before running them; the repo is cloned from public GitHub and `npm ci` installs published dependencies. Vite 7 requires supported Node (22.12+ or 24). The notebook reports and stops on an outdated Node version; it does not silently install system packages.
3. Run clone → test/build → temporary preview → public GitHub snapshot.
4. If you want archived Greenlight checks, explicitly turn on `INSPECT_MY_DRIVE`. Review Google's access prompt. `SAVE_REPORT_TO_DRIVE` separately controls whether a metadata-only JSON report is saved.
5. When Colab disconnects, the temporary preview stops; your Vercel dashboard and GitHub workflows remain independent.

No subscription, personal access token, paid model API key, public tunnel, or Colab GPU is required for the above.

## Existing Greenlight status — archived evidence, **not** a live run

The following status is from the user's original **12 October 2026** progress reports. It is provided for handoff and must not be interpreted as fresh hardware validation.

| Branch / release | Evidence as of 12 Oct | Unverified / incomplete |
| --- | --- | --- |
| Greenlight Multi-AI R9.1 | 270 CPU tests passed, 3 skipped; 94 subtests; provider configuration-error isolation tested | Flask-dependent modules and live MCP, GPU, private phone connection |
| Earlier Greenlight R8 | 257 CPU tests and 84 subtests in accessible subset | Full Flask/MCP stack and actual Windows/Colab runtime |
| iPhone mini-AGI v0.1.1 fresh starter | Colab T4 checkpoint step 297 to 595 verified, Qwen3 8B GPU inference separate, saved starter 1.08M parameters | Held-out diagnostic was 0/20 exact arithmetic; actual quality still insufficient |
| Original Greenlight trained weights | Source history backups and checkpoint inventory tooling preserved | Historical multi-GB trained checkpoint and optimizer resume not recovered/verified |
| R9 Colab multi-AI notebook | Existing notebook includes tests, optional providers, status and reporting cells | No notebook execution outputs were saved in the inspected original file; live execution is unknown |

The native small starter, Qwen3:8b through Ollama, and original large Greenlight checkpoints must remain distinct. Historical source archives should not be uploaded into this public repository, especially if they include private source, model weights, tokens, or personal details.

## What this workbench cannot do

- Permanently host Ollama, the Greenlight MCP/Flask gateway or GPU training.
- Monitor private repos or scan the user's Ubuntu files when the computer is off.
- Recover original large trained Greenlight checkpoints just by reading public GitHub.
- Make ChatGPT or commercial model APIs free; the original R9 paid-cloud provider cells remain opt-in and are not run here.
- Guarantee Colab GPU access, uninterrupted sessions, or a persistent connection between phones and the notebook.

## Verification

In GitHub CI, `npm test` covers the optional Colab link. A Python AST check validates all code cells and forbids saved notebook outputs. That does **not** execute Colab or substitute for the user's live runtime test.

Keep the existing Vercel and GitHub Pages delivery paths intact. Merge only after CI checks, then open the notebook from the newly published dashboard.
