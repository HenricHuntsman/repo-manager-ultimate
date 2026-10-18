import { useMemo, useRef, useState } from "react";
import {
  MAX_DOCTOR_BYTES,
  matchingCheckoutNames,
  parseLocalDoctorReport,
  type LocalDoctorInventory,
} from "./localDoctor";
import type { Repository } from "./types";

interface Props { repositories: Repository[]; }

export function LocalDoctorPanel({ repositories }: Props) {
  const [report, setReport] = useState<LocalDoctorInventory | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const matched = useMemo(
    () => report ? matchingCheckoutNames(report, repositories.map((repo) => repo.name)) : new Set<string>(),
    [report, repositories],
  );

  const importReport = async (file?: File) => {
    if (!file) return;
    setError("");
    if (file.size > MAX_DOCTOR_BYTES) {
      setReport(null);
      setError("The selected report exceeds the 3 MB import limit.");
      return;
    }
    try {
      setReport(parseLocalDoctorReport(await file.text()));
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : "Unable to read local report.");
    }
  };

  const clear = () => {
    setReport(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="localDoctor" aria-labelledby="doctor-heading">
      <div>
        <p className="eyebrow">OPTIONAL · YOUR UBUNTU INVENTORY</p>
        <h2 id="doctor-heading">Dragon Project Doctor</h2>
        <p>
          Import <code>dragon-project-doctor.json</code> to compare local Git
          folders with the repository list. The file stays in this window;
          it is never uploaded, posted to GitHub, or saved by RepoForge.
        </p>
        <p className="doctorHint">
          Directory-name matches are suggestions only, not verified Git remotes or working applications.
        </p>
      </div>
      <label className="doctorFile">
        <span>Choose local Doctor JSON</span>
        <input
          ref={inputRef}
          aria-label="Choose local Doctor JSON"
          type="file"
          accept=".json,application/json"
          onChange={(event) => void importReport(event.currentTarget.files?.[0])}
        />
      </label>
      {error && <p className="doctorError" role="alert">{error}</p>}
      {report && (
        <div className="doctorResults">
          <div className="doctorSummary" role="status">
            <strong>{report.checkouts.length} local Git checkouts</strong>
            <span>{matched.size} directory-name matches in current repository view</span>
            <span>{report.archiveCount} top-level archives</span>
            <span>{report.duplicateSizeGroupCount} unverified same-size archive groups</span>
            <span>Ollama: {report.ollamaChecked ? (report.ollamaReachable ? "reachable (status only)" : "unreachable") : "not checked"}</span>
            <span>GPU: {report.gpuChecked ? (report.gpuAvailable ? "detected" : "not detected") : "not checked"}</span>
          </div>
          <p className="doctorHint">
            Snapshot from {new Date(report.generatedAt).toLocaleString("en-AU")}.
            No code execution or inference is verified by this import.
          </p>
          <ul className="doctorList">
            {report.checkouts.slice(0, 30).map((checkout, index) => (
              <li key={[checkout.relativePath, index].join("-")}>
                <strong>{checkout.name}</strong>
                <span>{matched.has(checkout.name.toLocaleLowerCase("en")) ? "Possible GitHub name match" : "Not matched by directory name"}</span>
                <small>Branch {checkout.branch}; commit {checkout.head}; tracked changes {checkout.trackedChanges ?? "unknown"}</small>
              </li>
            ))}
          </ul>
          {report.checkouts.length > 30 && <p className="doctorHint">Showing the first 30 local checkouts.</p>}
          <button type="button" className="doctorClear" onClick={clear}>Clear imported report</button>
        </div>
      )}
    </section>
  );
}
