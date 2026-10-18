/** Read-only import of Dragon Project Doctor's local report. */
export const MAX_DOCTOR_BYTES = 3 * 1024 * 1024;
const MAX_REPOSITORIES = 600;
const MAX_ARCHIVES = 1200;

export interface LocalDoctorCheckout {
  relativePath: string;
  name: string;
  branch: string;
  head: string;
  trackedChanges: number | null;
  hasNodeProject: boolean;
  hasPythonProject: boolean;
  hasGoProject: boolean;
  hasRustProject: boolean;
}

export interface LocalDoctorInventory {
  generatedAt: string;
  checkouts: LocalDoctorCheckout[];
  archiveCount: number;
  duplicateSizeGroupCount: number;
  reportedCount: number;
  ollamaChecked: boolean;
  ollamaReachable: boolean | null;
  modelCount: number | null;
  gpuChecked: boolean;
  gpuAvailable: boolean | null;
}

type RecordValue = Record<string, unknown>;
function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function textField(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length > 4096 || value.trim() === "") {
    throw new Error("Invalid local report: " + field + " must be a non-empty string.");
  }
  return value;
}
function nonnegativeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error("Invalid local report: " + field + " must be a non-negative integer.");
  }
  return value as number;
}
function optionalBoolean(value: unknown): boolean {
  return value === true;
}
function projectName(path: string): string {
  return path.replace(/[\\/]+$/u, "").split(/[\\/]/u).pop() || path;
}

export function parseLocalDoctorReport(raw: string): LocalDoctorInventory {
  if (new TextEncoder().encode(raw).byteLength > MAX_DOCTOR_BYTES) {
    throw new Error("The local report exceeds the 3 MB import limit.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Choose a valid Dragon Project Doctor JSON report.");
  }
  if (!isRecord(parsed)) throw new Error("The local report must be a JSON object.");
  const generatedAt = textField(parsed.generated_at_utc, "generated_at_utc");
  if (Number.isNaN(Date.parse(generatedAt))) throw new Error("Invalid local report timestamp.");
  if (!Array.isArray(parsed.git_repositories) || parsed.git_repositories.length > MAX_REPOSITORIES) {
    throw new Error("Invalid local report: git_repositories must be an array of at most 600 checkouts.");
  }
  const reportedCount = nonnegativeInteger(parsed.repository_count, "repository_count");
  if (reportedCount !== parsed.git_repositories.length) {
    throw new Error("Local report checkout count doesn't match its entries.");
  }
  if (!Array.isArray(parsed.archives) || parsed.archives.length > MAX_ARCHIVES) {
    throw new Error("Invalid local report: archives must be an array of at most 1,200 entries.");
  }
  if (!Array.isArray(parsed.same_size_candidates_not_verified_duplicates)) {
    throw new Error("Invalid local report: same-size archive groups are missing.");
  }
  const checkouts = parsed.git_repositories.map((entry: unknown, index: number) => {
    if (!isRecord(entry)) throw new Error("Invalid checkout entry " + (index + 1) + ".");
    const relativePath = textField(entry.relative_path, "relative_path");
    const branch = textField(entry.branch, "branch");
    const head = textField(entry.head, "head");
    const trackedChanges = entry.tracked_changes_count === null
      ? null : nonnegativeInteger(entry.tracked_changes_count, "tracked_changes_count");
    return {
      relativePath,
      name: projectName(relativePath),
      branch,
      head,
      trackedChanges,
      hasNodeProject: optionalBoolean(entry.has_node_project),
      hasPythonProject: optionalBoolean(entry.has_python_project),
      hasGoProject: optionalBoolean(entry.has_go_project),
      hasRustProject: optionalBoolean(entry.has_rust_project),
    };
  });
  const ollama = isRecord(parsed.ollama) ? parsed.ollama : null;
  const gpu = isRecord(parsed.gpu) ? parsed.gpu : null;
  const ollamaChecked = ollama?.checked !== false && typeof ollama?.reachable === "boolean";
  const gpuChecked = gpu?.checked !== false && typeof gpu?.available === "boolean";
  return {
    generatedAt,
    checkouts,
    reportedCount,
    archiveCount: parsed.archives.length,
    duplicateSizeGroupCount: parsed.same_size_candidates_not_verified_duplicates.length,
    ollamaChecked,
    ollamaReachable: ollamaChecked ? ollama!.reachable as boolean : null,
    modelCount: ollamaChecked && Array.isArray(ollama!.model_names) ? ollama!.model_names.length : null,
    gpuChecked,
    gpuAvailable: gpuChecked ? gpu!.available as boolean : null,
  };
}

/** Match by directory name only, not by verified Git remote identity. */
export function matchingCheckoutNames(
  inventory: LocalDoctorInventory,
  repositoryNames: readonly string[],
): Set<string> {
  const known = new Set(repositoryNames.map((name) => name.toLocaleLowerCase("en")));
  return new Set(inventory.checkouts
    .filter((checkout) => known.has(checkout.name.toLocaleLowerCase("en")))
    .map((checkout) => checkout.name.toLocaleLowerCase("en")));
}
