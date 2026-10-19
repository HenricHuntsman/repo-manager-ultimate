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
import verify_git_recovery as verifier


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
            self.assertEqual(manifest["source_type"], "local")
            self.assertNotIn(str(src), json.dumps(manifest))
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


class OfflineVerifyTests(unittest.TestCase):
    def make_repo_backup(self, root):
        source = root / "source"
        source.mkdir()
        git("init", "-b", "main", source)
        git("-C", source, "config", "user.email", "repo@invalid.example")
        git("-C", source, "config", "user.name", "RepoForge Test")
        (source / "file.txt").write_text("immutable historical sample")
        git("-C", source, "add", ".")
        git("-C", source, "commit", "-m", "baseline")
        git("-C", source, "tag", "snapshot-v1")
        return backup.make_bundle(str(source), root / "backup")

    def test_disposable_restore_verifies_commit_objects_and_tags(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = self.make_repo_backup(Path(tmp))
            before = (folder / "repository.bundle").read_bytes()
            result = verifier.verify_backup(folder)
            self.assertEqual(result["status"], "verified")
            self.assertTrue(result["offline"])
            self.assertEqual(result["declared_refs"], 2)
            self.assertEqual((folder / "repository.bundle").read_bytes(), before)

    def test_tampering_bundle_fails_without_changing_backup(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = self.make_repo_backup(Path(tmp))
            bundle = folder / "repository.bundle"
            with bundle.open("ab") as file:
                file.write(b"tampered")
            with self.assertRaisesRegex(verifier.BackupVerificationError, "SHA-256 mismatch"):
                verifier.verify_backup(folder)

    def test_missing_manifest_and_unexpected_refs_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = self.make_repo_backup(Path(tmp))
            manifest_file = folder / "manifest.json"
            data = json.loads(manifest_file.read_text())
            data["refs"] = ["refs/heads/fictional"]
            manifest_file.write_text(json.dumps(data))
            with self.assertRaisesRegex(verifier.BackupVerificationError, "missing declared refs"):
                verifier.verify_backup(folder)
            manifest_file.unlink()
            with self.assertRaisesRegex(verifier.BackupVerificationError, "Missing manifest"):
                verifier.verify_backup(folder)



if __name__ == "__main__":
    unittest.main()
