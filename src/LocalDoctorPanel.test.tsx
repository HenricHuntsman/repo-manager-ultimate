import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocalDoctorPanel } from "./LocalDoctorPanel";
import type { Repository } from "./types";

const repositories = [{
  name: "TraceForge", description: "", language: "TypeScript", kind: "active",
  health: "attention", openPulls: 0, lastActivity: "", checks: "",
  recommendation: "Review",
}] satisfies Repository[];

const report = {
  generated_at_utc: "2026-10-19T00:00:00Z",
  repository_count: 1,
  git_repositories: [{
    relative_path: "/home/user/Projects/TraceForge",
    branch: "main",
    head: "abcdefabcdef",
    tracked_changes_count: 0,
  }],
  archives: [],
  same_size_candidates_not_verified_duplicates: [],
  ollama: { checked: false },
  gpu: { checked: false },
};

describe("local report upload-free import", () => {
  it("reads a local file in memory, shows name match and clears it", async () => {
    const user = userEvent.setup();
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    render(<LocalDoctorPanel repositories={repositories} />);
    const f = new File([JSON.stringify(report)], "dragon-project-doctor.json", { type: "application/json" });
    Object.defineProperty(f, "text", { value: async () => JSON.stringify(report) });

    await user.upload(screen.getByLabelText("Choose local Doctor JSON"), f);
    expect(await screen.findByText("1 local Git checkouts")).toBeInTheDocument();
    expect(screen.getByText("Possible GitHub name match")).toBeInTheDocument();
    expect(screen.getByText(/Ollama: not checked/)).toBeInTheDocument();
    expect(storageWrite).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Clear imported report" }));
    expect(screen.queryByText("1 local Git checkouts")).not.toBeInTheDocument();
    storageWrite.mockRestore();
  });
});
