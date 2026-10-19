"""Offline end-to-end tests for portable recovery; no GitHub/network needed."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import git_recovery_backup as backup


def git(*args):
    return subprocess.check_output(["git", *map(str, args)], text=True).strip()


class BackupTests(unittest.TestCase):
    def test_https_source_rejects_embedded_credentials_or_unknown_host(self):
        for source in (
            "https://token@github.com/owner/repo.git",
            "https://github.com/owner/repo.git?secret=abc",
            "https://example.org/owner/repo.git",
            "http://github.com/owner/repo.git",
        ):
            with self.subTest(source=source), self.assertRaises(ValueError):
                backup.checked_source(source)

    def test_local_backup_round_trip_restores_history_and_tags(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / "source"
            src.mkdir()
            git("init", "-b", "main", src)
            git("-C", src, "config", "user.email", "repo@invalid.example")
            git("-C", src, "config", "user.name", "RepoForge Test")
            (src / "README.md").write_text("offline backup\n")
            git("-C", src, "add", "README.md")
            git("-C", src, "commit", "-m", "offline")
            git("-C", src, "tag", "v0.1")
            original = git("-C", src, "rev-parse", "HEAD")
            backup_root = root / "backups"
            completed = backup.make_bundle(str(src), backup_root)
            bundle = completed / "repository.bundle"
            manifest = json.loads((completed / "manifest.json").read_text())
            with bundle.open("rb") as source_file:
                expected_hash = hashlib.file_digest(source_file, "sha256").hexdigest()
            self.assertEqual(manifest["sha256"], expected_hash)
            self.assertIn("refs/tags/v0.1", manifest["refs"])
            restored = root / "restored"
            git("clone", bundle, restored)
            self.assertEqual(git("-C", restored, "rev-parse", "HEAD"), original)
            self.assertEqual((restored / "README.md").read_text(), "offline backup\n")
            self.assertIn("v0.1", git("-C", restored, "tag", "-l"))
            self.assertTrue(completed.exists())
            self.assertEqual(len(list(backup_root.iterdir())), 1)

    def test_separate_runs_never_overwrite_prior_backup(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / "source"
            src.mkdir()
            git("init", "-b", "main", src)
            git("-C", src, "config", "user.email", "repo@invalid.example")
            git("-C", src, "config", "user.name", "RepoForge Test")
            (src / "a").write_text("x")
            git("-C", src, "add", ".")
            git("-C", src, "commit", "-m", "first")
            one = backup.make_bundle(str(src), root / "out")
            two = backup.make_bundle(str(src), root / "out")
            self.assertNotEqual(one, two)
            self.assertTrue((one / "repository.bundle").exists())
            self.assertTrue((two / "repository.bundle").exists())


if __name__ == "__main__":
    unittest.main()
