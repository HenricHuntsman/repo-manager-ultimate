# DragonHub Forgejo + ChatGPT MCP bridge

The new [DragonHub status page](/dragonhub.html) extends the existing Vite RepoForge project. It does **not** host a second Forgejo instance or replace the existing DragonHub code reviewer.

## Confirmed context

- Existing Ubuntu Forgejo at `127.0.0.1:3000`, previously returned HTTP **403** for unauthenticated `/api/v1/version`.
- Existing `dragonhub-mcp.service` listens on `127.0.0.1:8787`. Its MCP handshake and tools are **not yet verified**.
- Existing RepoForge dashboard runs on Vercel. A hosted browser cannot connect to localhost on a different device.
- An HTTP 200 from a status endpoint cannot prove an MCP tool call works.

## Safe status export

From your **RepoForge checkout** on Ubuntu:

```bash
python3 tools/dragonhub_readonly_export.py --output "$HOME/Downloads/dragonhub-status.json"
```

Open the site at `/dragonhub.html` on desktop or mobile and select the JSON file. The page processes it locally in browser memory; the Content-Security-Policy blocks outgoing requests. The script contacts only `127.0.0.1`, follows no redirects, sends no token, reads no response body, and refuses to overwrite an existing report. A 403 is classified as `refused`, not `connected`. Each report reflects one point in time.

## Production-safe next steps

1. **Security first:** Verify your installed Forgejo version. Forgejo 11.0.16 is past its supported life (ended 16 July 2026). Back up repos and database, read upgrade notes for 12–15, and plan a controlled upgrade to supported **15 LTS**. Rotate any token that appeared in URLs or access logs before exposing an integration. Do not rush an in-place database migration.
2. **Confirm MCP protocol:** On Ubuntu, identify whether port 8787 speaks MCP Streamable HTTP (`/mcp`) or another transport; perform real JSON-RPC `initialize`, `tools/list`, and one read-only tool call. A listening TCP socket alone is insufficient.
3. **Use dedicated credentials:** No admin token in the site, Vite variables, source repository or browser. Create scoped read-only credentials for selected repos with Forgejo Applications. Protect the backend and prevent arbitrary URL forwarding.
4. **Connect ChatGPT:** ChatGPT Sites can host an MCP-powered plugin if available. For a private service, use an authorized Secure MCP Tunnel (subject to ChatGPT workspace and Platform requirements), or an appropriately authenticated HTTPS MCP gateway. The Vercel page by itself is **not** an MCP transport and does not solve remote network access.
5. **Verify end-to-end:** In ChatGPT, invoke a newly registered tool such as `list_repositories` or `get_actions_status`, compare real output to Forgejo UI, confirm scopes and error paths, and only then mark the plugin connected.

The web page does not perform writes, pushes, merges, restarts, CI retries or administrative operations.

## Provenance

- `HenricHuntsman/repo-manager-ultimate` is the public RepoForge web source.
- `HenricHuntsman/dragonhub-agent` is a **private local PR reviewer**, and no private source was copied into this page.
- `dragonhub-mcp.service` is on the Ubuntu machine, not part of a Vercel deployment.

## Local tests

```bash
python3 -m unittest discover -s tests -p 'test_dragonhub_export.py' -v
node --check public/dragonhub.js
npm run build
```

The first two commands have no third-party dependencies. The Vite build needs the project's existing `npm ci` dependencies. Test locally or wait for the Vercel preview workflow before merging the review branch.

## Official references

- https://forgejo.org/releases/11.x/
- https://forgejo.org/docs/latest/admin/upgrade/
- https://forgejo.org/docs/latest/user/api/usage/
- https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites
- https://developers.openai.com/api/docs/guides/secure-mcp-tunnels
