"""Independent stdlib checks for the DragonHub read-only exporter."""
import importlib.util
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

FILE = pathlib.Path(__file__).resolve().parents[1] / "tools" / "dragonhub_readonly_export.py"
spec = importlib.util.spec_from_file_location("dragonhub_export", FILE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DragonHubExportTests(unittest.TestCase):
    def test_response_classifications(self):
        self.assertEqual(module.classify(403, "forgejo")[0], "refused")
        self.assertEqual(module.classify(200, "forgejo")[0], "reachable")
        self.assertEqual(module.classify(405, "mcp")[0], "reachable_protocol")
        self.assertEqual(module.classify(0, "mcp")[0], "unreachable")

    def test_report_includes_no_raw_data(self):
        with patch.object(module, "check", return_value={"http_code": 403, "classification": "refused", "note": "access denied"}):
            data = module.report()
        self.assertEqual(data["schema"], "dragonhub-readonly-v1")
        self.assertFalse(data["chatgpt"]["connected"])
        self.assertEqual(set(data["services"]), {"forgejo", "mcp"})
        self.assertNotIn("Authorization", json.dumps(data))
        self.assertNotIn("127.0.0.1", json.dumps(data))

    def test_create_private_file_and_refuse_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            output = pathlib.Path(directory) / "report.json"
            args = [sys.executable, str(FILE), "--output", str(output)]
            first = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertEqual(json.loads(output.read_text())["schema"], "dragonhub-readonly-v1")
            again = subprocess.run(args, capture_output=True, text=True)
            self.assertNotEqual(again.returncode, 0)
            self.assertIn("refusing to overwrite", again.stderr)

    def test_browser_resources_are_local_and_csp_disallows_network(self):
        root = FILE.parents[1] / "public"
        html = (root / "dragonhub.html").read_text()
        self.assertIn("connect-src 'none'", html)
        self.assertIn("src=\"/dragonhub.js\"", html)
        self.assertIn('href="/dragonhub.css"', html)
        self.assertTrue((root / "dragonhub.js").is_file())
        self.assertTrue((root / "dragonhub.css").is_file())


if __name__ == "__main__":
    unittest.main()
