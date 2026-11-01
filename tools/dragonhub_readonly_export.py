#!/usr/bin/env python3
"""Offline-safe DragonHub status exporter. No tokens, raw response bodies, or non-loopback requests."""
import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, hdrs, url):
        return None


def classify(code, service):
    if code == 0:
        return "unreachable", "No HTTP response from loopback."
    if code in (401, 403):
        return "refused", "HTTP endpoint is reachable but refused anonymous access."
    if service == "mcp" and code in (400, 405, 406):
        return "reachable_protocol", "Likely requires MCP request framing, headers or authentication; tools unverified."
    if 200 <= code < 300:
        return "reachable", "Endpoint responded; authentication and tool calls still need testing."
    return "unexpected", "Endpoint responded with an unexpected code; inspect locally."


def check(url, service):
    # URL parameters are constants defined by this program, not user-supplied.
    assert url.startswith(("http://127.0.0.1:3000/", "http://127.0.0.1:8787/"))
    try:
        req = Request(url, headers={"Accept": "application/json, text/event-stream"})
        with build_opener(NoRedirect()).open(req, timeout=3) as response:
            code = response.status
    except HTTPError as exc:
        code = exc.code
        exc.close()
    except (URLError, OSError, TimeoutError):
        code = 0
    label, note = classify(code, service)
    return {"http_code": code, "classification": label, "note": note}


def report():
    return {
        "schema": "dragonhub-readonly-v1",
        "created_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "services": {
            "forgejo": check("http://127.0.0.1:3000/api/v1/version", "forgejo"),
            "mcp": check("http://127.0.0.1:8787/mcp", "mcp"),
        },
        "chatgpt": {"connected": False, "note": "Only a ChatGPT MCP tool call can prove this."},
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--output", type=Path, help="Create JSON with 0600 permissions (never overwrite).")
    args = p.parse_args()
    data = json.dumps(report(), indent=2) + "\n"
    if not args.output:
        print(data, end="")
        return
    target = args.output.expanduser()
    if not target.parent.is_dir():
        p.error("Output directory does not exist.")
    try:
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        p.error("Report already exists; refusing to overwrite.")
    with os.fdopen(fd, "w", encoding="utf-8") as out:
        out.write(data)
    print("Created read-only report:", target)


if __name__ == "__main__":
    main()
