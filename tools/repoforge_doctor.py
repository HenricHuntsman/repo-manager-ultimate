#!/usr/bin/env python3
"""RepoForge Doctor: dependency-free, read-only public repo and runtime diagnostics.

No credentials, installs, model loading, private Git operations or paid APIs.
JSON report files are written only when --output is specified.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import platform
import shutil
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

USER_AGENT = "RepoForge-Doctor/0.1 (read-only public metadata)"
API_ROOT = "https://api.github.com"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def classify(repo: dict) -> dict:
    """Metadata-only clues, not a claim that tests or CI passed."""
    archived = repo.get("archived") is True
    pushed = repo.get("pushed_at")
    age_days = None
    if isinstance(pushed, str):
        try:
            timestamp = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
            if timestamp.tzinfo:
                age_days = max(0, (datetime.now(timezone.utc) - timestamp).days)
        except ValueError:
            pass
    if archived:
        signal, suggestion = "archived", "Preserve history; review only"
    elif age_days is None:
        signal, suggestion = "unknown", "Verify activity and CI manually"
    elif age_days > 180:
        signal, suggestion = "quiet", "Review goals, upstream sync and open issues"
    else:
        signal, suggestion = "recent_activity", "Inspect CI and pull requests before concluding health"
    return {
        "name": repo.get("name"),
        "html_url": repo.get("html_url"),
        "language": repo.get("language"),
        "size_kb": repo.get("size"),
        "archived": archived,
        "fork": repo.get("fork") is True,
        "pushed_at": pushed,
        "age_days": age_days,
        "activity_signal": signal,
        "suggestion": suggestion,
        "ci_verified": False,
    }


def public_repositories(owner: str, *, max_pages: int = 2, timeout: float = 12) -> dict:
    """GitHub API public owner repositories; never sends a credential."""
    repositories = []
    for page in range(1, max_pages + 1):
        url = f"{API_ROOT}/users/{quote(owner, safe='')}/repos?per_page=100&page={page}&sort=updated&type=owner"
        request = Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": USER_AGENT})
        try:
            with urlopen(request, timeout=timeout) as response:
                records = json.load(response)
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            return {
                "status": "unavailable",
                "checked_utc": utc_now(),
                "owner": owner,
                "reason": type(exc).__name__,
                "pages_completed": page - 1,
                "repositories": repositories,
                "complete": False,
            }
        if not isinstance(records, list):
            return {"status": "unavailable", "owner": owner, "checked_utc": utc_now(),
                    "reason": "invalid_response", "pages_completed": page - 1,
                    "repositories": repositories, "complete": False}
        repositories.extend(classify(row) for row in records if isinstance(row, dict) and isinstance(row.get("name"), str))
        if len(records) < 100:
            return {"status": "ok", "checked_utc": utc_now(), "owner": owner,
                    "pages_completed": page, "complete": True, "repositories": repositories}
    return {"status": "ok", "checked_utc": utc_now(), "owner": owner,
            "pages_completed": max_pages, "complete": False, "repositories": repositories}


def runtime_report() -> dict:
    """Safe diagnostics; does not print system environment or mount Drive."""
    result = {
        "status": "ok",
        "checked_utc": utc_now(),
        "python": platform.python_version(),
        "platform": platform.system(),
        "node_version": None,
        "gpu": "not_detected",
        "notes": "Absence of nvidia-smi does not rule out GPU. No model was loaded.",
    }
    if shutil.which("node"):
        try:
            result["node_version"] = subprocess.check_output(
                ["node", "--version"], text=True, timeout=5).strip()
        except (subprocess.TimeoutExpired, OSError, subprocess.CalledProcessError):
            result["node_version"] = "unavailable"
    if shutil.which("nvidia-smi"):
        try:
            output = subprocess.check_output(
                ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                text=True, timeout=5).strip()
            result["gpu"] = output[:160] or "unavailable"
        except (subprocess.TimeoutExpired, OSError, subprocess.CalledProcessError):
            result["gpu"] = "unavailable"
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Read-only RepoForge Doctor; no paid APIs.")
    parser.add_argument("task", choices=("repos", "runtime"), help="Which safe check to run")
    parser.add_argument("--owner", default="HenricHuntsman", help="GitHub owner for public repositories")
    parser.add_argument("--max-pages", type=int, choices=(1, 2, 3), default=2)
    parser.add_argument("--output", help="Write JSON report only to this explicitly chosen path")
    args = parser.parse_args(argv)
    report = public_repositories(args.owner, max_pages=args.max_pages) if args.task == "repos" else runtime_report()
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        from pathlib import Path
        file = Path(args.output).expanduser()
        # Do not silently replace a prior report or archive.
        with file.open("x", encoding="utf-8") as handle:
            handle.write(payload)
        print("Report saved:", str(file))
    else:
        print(payload, end="")
    return 0 if report["status"] == "ok" else 2


if __name__ == "__main__":
    sys.exit(main())
