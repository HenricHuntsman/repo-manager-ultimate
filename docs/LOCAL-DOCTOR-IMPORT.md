# Local Ubuntu inventory import — Dragon Project Doctor

RepoForge can now display a read-only inventory from the separately supplied
Dragon Project Doctor Python scanner, alongside its public GitHub repository
scan. **It never uploads, stores, or automatically executes the imported data.**

## Workflow

1. Obtain the Dragon Project Doctor script from your preserved project toolkit.
   It is **not** bundled in the RepoForge Git repository.
2. On Ubuntu, execute it in a terminal from your project directory:

       python3 dragon_project_doctor.py ~/Projects ~/Downloads --depth 3

   The script creates local files called dragon-project-doctor.json and
   dragon-project-doctor.md. It does not delete or rename source files.
   Optional loopback Ollama and NVIDIA status checks can be disabled with
   --no-ollama and --no-gpu.
3. Launch RepoForge with npm ci && npm run dev, or via its desktop package.
4. In the "Dragon Project Doctor" section, use "Choose local Doctor JSON"
   to select the JSON report. The selected file is read only in that window.
5. Compare the *possible* directory-name matches to current GitHub repositories.
   Name matches alone do **not** verify Git remotes, commit ancestry, project
   identity, test results, or application functionality.
6. Use "Clear imported report" to remove the imported snapshot from memory.

## Boundaries

- File imports are at most 3 MB, with at most 600 Git checkout records and
  1,200 top-level archive records. Malformed or inconsistent reports are rejected.
- Imported paths are displayed only as local folder names, not sent to an API.
- GitHub live scan remains a separate, user-triggered operation.
- Private repositories not returned by the public API do not appear in
  RepoForge's public scan; this is not a missing local checkout.
- Ollama status checks do not demonstrate model inference; GPU detection does
  not establish CUDA training correctness.
- Same-size archive groups are **candidates for review**, never confirmed
  duplicates. RepoForge never automatically removes any archive.
- Scanner output is a timestamped snapshot, not continuous monitoring.
- Import state and optional GitHub tokens exist only in React memory. No
  localStorage, analytics, telemetry or backend upload is used.

## Verification

    npm ci
    npm test
    npm run build

The standalone Doctor JSON parser can be typechecked without installing React
dependencies, but the integrated panel must pass the repository's actual
Vitest and Vite checks before release. A successful CI build is not proof that
the AppImage has been installed on the owner's Ubuntu machine.
