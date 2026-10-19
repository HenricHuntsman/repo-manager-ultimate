"""Offline tests for dependency-free RepoForge Doctor."""
import io
import json
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import repoforge_doctor as doctor


class DoctorTests(unittest.TestCase):
    def test_recent_activity_does_not_claim_ci_passed(self):
        data = doctor.classify({"name": "example", "pushed_at": datetime.now(timezone.utc).isoformat()})
        self.assertEqual(data["activity_signal"], "recent_activity")
        self.assertFalse(data["ci_verified"])

    def test_unknown_timestamp_stays_unknown(self):
        self.assertEqual(doctor.classify({"name": "x", "pushed_at": "not-a-date"})["activity_signal"], "unknown")

    def test_archived_not_a_failure(self):
        data = doctor.classify({"name": "old", "archived": True, "pushed_at": "2020-01-01T00:00:00Z"})
        self.assertEqual(data["activity_signal"], "archived")

    def test_quiet_project_has_review_signal(self):
        stamp = (datetime.now(timezone.utc)-timedelta(days=250)).isoformat()
        self.assertEqual(doctor.classify({"name":"quiet","pushed_at":stamp})["activity_signal"],"quiet")

    def test_api_success_is_read_only_and_paginates(self):
        response = MagicMock()
        response.__enter__.return_value = io.StringIO(json.dumps([{"name":"repo","pushed_at":None}]))
        with patch.object(doctor, "urlopen", return_value=response) as fetch:
            result = doctor.public_repositories("HenricHuntsman", max_pages=2)
        self.assertEqual(result["status"], "ok")
        self.assertTrue(result["complete"])
        self.assertEqual(result["repositories"][0]["name"], "repo")
        self.assertEqual(fetch.call_count, 1)
        request = fetch.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertNotIn("Authorization", dict(request.headers))

    def test_api_failure_is_unknown_not_healthy(self):
        from urllib.error import URLError
        with patch.object(doctor, "urlopen", side_effect=URLError("offline")):
            data = doctor.public_repositories("HenricHuntsman")
        self.assertEqual(data["status"], "unavailable")
        self.assertFalse(data["complete"])
        self.assertEqual(data["repositories"], [])

    def test_runtime_does_not_require_gpu(self):
        with patch.object(doctor.shutil, "which", return_value=None):
            data = doctor.runtime_report()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["gpu"], "not_detected")


if __name__ == "__main__":
    unittest.main()
