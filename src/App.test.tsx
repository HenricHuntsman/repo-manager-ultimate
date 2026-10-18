import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { scanPublicRepositories } from "./github";

vi.mock("./github", () => ({
  scanPublicRepositories: vi.fn().mockResolvedValue([]),
  inspectRepository: vi.fn(),
}));

vi.mock("./LocalDoctorPanel", () => ({
  LocalDoctorPanel: () => <div data-testid="local-doctor-panel" />,
}));

vi.mock("./CompareAndExport", () => ({
  CompareAndExport: () => <div data-testid="compare-and-export" />,
}));

describe("session-only token UI", () => {
  beforeEach(() => {
    vi.mocked(scanPublicRepositories).mockReset().mockResolvedValue([]);
  });

  it("starts in public unauthenticated mode and scans without a token", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("Public unauthenticated mode.")).toBeInTheDocument();
    expect(screen.getByLabelText("Fine-grained token")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: /run live scan/i }));

    expect(scanPublicRepositories).toHaveBeenCalledWith("HenricHuntsman", "");
    expect(await screen.findByText("Live scan complete: 0 public repositories loaded.")).toBeInTheDocument();
  });

  it("keeps the token only in component memory and forgets it on remount", async () => {
    const user = userEvent.setup();
    const localWrite = vi.spyOn(Storage.prototype, "setItem");
    const localRemove = vi.spyOn(Storage.prototype, "removeItem");
    const view = render(<App />);
    const input = screen.getByLabelText("Fine-grained token");

    await user.type(input, "github_pat_session_secret");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(screen.getByText("Token active for this session only.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /run live scan/i }));
    expect(scanPublicRepositories).toHaveBeenCalledWith(
      "HenricHuntsman",
      "github_pat_session_secret",
    );
    expect(await screen.findByText("Live scan complete: 0 public repositories loaded.")).toBeInTheDocument();
    expect(localWrite).not.toHaveBeenCalled();
    expect(localRemove).not.toHaveBeenCalled();

    view.unmount();
    render(<App />);

    expect(screen.getByLabelText("Fine-grained token")).toHaveValue("");
    expect(screen.getByText("Public unauthenticated mode.")).toBeInTheDocument();
  });
});
