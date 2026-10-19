#!/usr/bin/env python3
"""Offline verification and disposable restore-test for a RepoForge Git backup.

Requires Python >=3.11 and local Git; no network, no tokens, no remote writes.
Works with backups produced by tools/git_recovery_backup.py.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

EXPECTED_NAME = "repository.bundle"
MAX_MANIFEST_BYTES = 1024 * 1024
SHA256_PATTERN = re.compile(r"[a-f0-9]{64}\Z")


class BackupVerificationError(RuntimeError):
    """Report a corrupt or incomplete backup without changing it."""


def run(*args: str) -> str:
    completed = subprocess.run(
        args, check=True, timeout=120, capture_output=True, text=True,
    )
    return completed.stdout.strip()


def verify_backup(folder: Path) -> dict:
    """Hash, check ref metadata and perform a disposable local Git clone."""
    folder = folder.expanduser().resolve(strict=True)
    if not folder.is_dir():
        raise BackupVerificationError("Backup path is not a directory.")
    manifest_path = folder / "manifest.json"
    bundle_path = folder / EXPECTED_NAME
    if not manifest_path.is_file() or not bundle_path.is_file():
        raise BackupVerificationError("Missing manifest.json or repository.bundle.")
    if manifest_path.stat().st_size > MAX_MANIFEST_BYTES:
        raise BackupVerificationError("Manifest is unexpectedly large.")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (ValueError, UnicodeError) as exc:
        raise BackupVerificationError("Backup manifest is invalid JSON or text.") from exc
    if not isinstance(manifest, dict) or manifest.get("schema_version") != 1 or manifest.get("bundle") != EXPECTED_NAME:
        raise BackupVerificationError("Unsupported backup manifest schema or bundle filename.")
    expected = manifest.get("sha256")
    if not isinstance(expected, str) or not SHA256_PATTERN.fullmatch(expected):
        raise BackupVerificationError("Backup manifest has an invalid SHA-256.")
    refs = manifest.get("refs")
    if not isinstance(refs, list) or not refs or any(
        not isinstance(ref, str) or not ref.startswith(("refs/heads/", "refs/tags/"))
        or any(char in ref for char in ("\n", "\r", "\0"))
        for ref in refs
    ):
        raise BackupVerificationError("Backup manifest has invalid branch/tag refs.")
    if len(refs) != len(set(refs)):
        raise BackupVerificationError("Backup manifest contains duplicate refs.")
    with bundle_path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != expected:
        raise BackupVerificationError("Git bundle SHA-256 mismatch. Backup must not be trusted.")
    try:
        with tempfile.TemporaryDirectory(prefix="repoforge-restore-check-") as workspace:
            bare = Path(workspace) / "restored.git"
            # All operations stay on temporary local paths. No calls to origin.
            run("git", "clone", "--bare", "--no-hardlinks", str(bundle_path), str(bare))
            restored_refs = run(
                "git", "-C", str(bare), "for-each-ref",
                "--format=%(refname)", "refs/heads", "refs/tags",
            ).splitlines()
            missing = sorted(set(refs) - set(restored_refs))
            if missing:
                raise BackupVerificationError("Restored Git repository is missing declared refs: " + ", ".join(missing[:6]))
            for ref in refs:
                run("git", "-C", str(bare), "rev-parse", "--verify", f"{ref}^{{object}}")
            run("git", "-C", str(bare), "fsck", "--full", "--no-reflogs")
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError) as exc:
        raise BackupVerificationError("Git disposable restore or object integrity check failed.") from exc
    return {
        "status": "verified",
        "verified_utc": datetime.now(timezone.utc).isoformat(),
        "backup_directory": str(folder),
        "sha256": digest,
        "declared_refs": len(refs),
        "restored_refs": len(restored_refs),
        "offline": True,
        "notes": "Git commits and refs verified; Git LFS objects and provider issue/CI metadata are not part of this bundle.",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify RepoForge backup entirely offline, without changing it.")
    parser.add_argument("folder", type=Path, help="Folder containing repository.bundle and manifest.json")
    args = parser.parse_args(argv)
    try:
        result = verify_backup(args.folder)
    except (BackupVerificationError, OSError) as exc:
        parser.exit(2, f"NOT VERIFIED: {exc}\n")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
