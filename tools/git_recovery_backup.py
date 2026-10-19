#!/usr/bin/env python3
"""Portable Git history backup. No remote writes and no hosting account required.

Creates a verifiable, full Git bundle from a public HTTPS Git host or a local
repository. Backups stay on the destination you choose. Private repositories
should only be backed up to private encrypted storage.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.parse import urlsplit
from uuid import uuid4

DEFAULT_SOURCE = "https://github.com/HenricHuntsman/repo-manager-ultimate.git"
ALLOWED_HOSTS = frozenset({"github.com", "gitlab.com", "codeberg.org"})


def checked_source(source: str) -> str:
    parsed = urlsplit(source)
    if parsed.scheme:
        if (
            parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS
            or parsed.username or parsed.password or parsed.query or parsed.fragment
            or not parsed.path.strip("/")
        ):
            raise ValueError("Use a public HTTPS GitHub/GitLab/Codeberg repository without embedded credentials.")
        return source
    path = Path(source).expanduser().resolve(strict=True)
    if not path.is_dir():
        raise ValueError("Local Git source must be a directory.")
    return str(path)


def run(*args: str) -> str:
    # subprocess arguments, not a shell; no source-side push or destructive operation.
    result = subprocess.run(args, check=True, text=True, capture_output=True, timeout=180)
    return result.stdout.strip()


def make_bundle(source: str, destination: Path) -> Path:
    source = checked_source(source)
    dest = destination.expanduser().resolve()
    dest.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    final_name = f"git-recovery-{stamp}-{uuid4().hex[:8]}"
    working = Path(tempfile.mkdtemp(prefix=".git-recovery-", dir=dest))
    final = dest / final_name
    try:
        mirror = working / "mirror.git"
        run("git", "clone", "--mirror", source, str(mirror))
        heads = run("git", "-C", str(mirror), "show-ref", "--heads", "--tags")
        if not heads:
            raise RuntimeError("No branch or tag references: refusing to claim a full recovery backup.")
        bundle = working / "repository.bundle"
        run("git", "-C", str(mirror), "bundle", "create", str(bundle), "--all")
        run("git", "-C", str(mirror), "bundle", "verify", str(bundle))
        checksum = hashlib.file_digest(bundle.open("rb"), "sha256").hexdigest()
        ref_lines = [line.split(" ", 1)[-1] for line in heads.splitlines()]
        manifest = {
            "schema_version": 1,
            "created_utc": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "sha256": checksum,
            "bundle": bundle.name,
            "refs": ref_lines,
            "notes": "Git commits, branches and tags only; excludes GitHub issues, PRs, Actions artifacts and Git LFS objects.",
        }
        (working / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        # The temporary clone is unnecessary after the independently verified bundle.
        shutil.rmtree(mirror)
        working.rename(final)
    except Exception:
        shutil.rmtree(working, ignore_errors=True)
        raise
    return final


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Make a local, verified, Git-host-independent source backup.")
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="Public HTTPS clone URL or existing local Git directory")
    parser.add_argument("--destination", required=True, help="Local folder for new, non-overwriting backup")
    args = parser.parse_args(argv)
    folder = make_bundle(args.source, Path(args.destination))
    print("Verified Git bundle created:", folder)
    print("Restore with: git clone", str(folder / "repository.bundle"), "restored-repo")
    print("Store another copy off the computer; GitHub issues, Actions artifacts and Git LFS need separate exports.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
