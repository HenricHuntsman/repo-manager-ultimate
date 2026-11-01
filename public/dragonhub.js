(() => {
  'use strict';
  const input = document.getElementById('report-file');
  const status = document.getElementById('report-message');
  const time = document.getElementById('report-time');
  if (!input || !status || !time) return;

  function observation(service, name) {
    if (!service || !Number.isInteger(service.http_code) ||
        (service.http_code !== 0 && (service.http_code < 100 || service.http_code > 599))) {
      throw new Error('Invalid ' + name + ' HTTP observation.');
    }
    const code = service.http_code;
    if (code === 0) return ['UNREACHABLE', 'bad', 'No HTTP response was recorded.'];
    if (code === 401 || code === 403) return ['ACCESS REFUSED', 'warn', 'HTTP ' + code + ': the endpoint refused anonymous access.'];
    if (name === 'mcp' && [400,405,406].includes(code)) return ['ENDPOINT DETECTED', 'warn', 'HTTP ' + code + ': MCP framing or authentication may be required. Tool discovery is unverified.'];
    if (code >= 200 && code < 300) return ['HTTP REACHABLE', 'good', 'HTTP ' + code + ': an endpoint responded. Authenticated access and tool calls are still unverified.'];
    return ['REVIEW NEEDED', 'warn', 'HTTP ' + code + ': inspect the local service response.'];
  }

  function applyCard(name, observation) {
    const card = document.querySelector('[data-service="' + name + '"]');
    card.querySelector('.pill').className = 'pill ' + observation[1];
    card.querySelector('.pill').textContent = observation[0];
    card.querySelector('.detail').textContent = observation[2];
  }

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 32768) { status.textContent = 'File too large (32 KB limit).'; return; }
    try {
      const data = JSON.parse(await file.text());
      if (data.schema !== 'dragonhub-readonly-v1' || !data.services) throw new Error('Not a DragonHub read-only report.');
      const created = Date.parse(data.created_at);
      if (!Number.isFinite(created)) throw new Error('The report needs a valid creation timestamp.');
      // Validate the complete report before replacing either service observation.
      const forgejo = observation(data.services.forgejo, 'forgejo');
      const mcp = observation(data.services.mcp, 'mcp');
      applyCard('forgejo', forgejo);
      applyCard('mcp', mcp);
      applyCard('chatgpt', ['TO VERIFY', 'pending', 'An imported file cannot prove ChatGPT-to-Forgejo access. A real authenticated MCP read is still required.']);
      const age = Date.now() - created;
      const label = age < -300000 ? 'Future-dated report' : age > 86400000 ? 'Historical report' : 'Imported observation';
      time.textContent = label + ': ' + new Date(created).toLocaleString('en-AU', {timeZone:'Australia/Melbourne'}) + ' Melbourne';
      status.textContent = 'Loaded ' + file.name + ' locally. These are reported HTTP observations, not a live connection test.';
    } catch (err) {
      status.textContent = 'Cannot load report: ' + (err.message || 'Invalid file') + ' Previous observations are unchanged.';
    }
  });
})();

/* Public GitHub browsing stays separate from the private Forgejo/MCP boundary. */
(() => {
  'use strict';
  const grid = document.getElementById('repo-grid');
  const message = document.getElementById('repos-status');
  const search = document.getElementById('repo-search');
  const reload = document.getElementById('reload-repos');
  const more = document.getElementById('show-more-repos');
  if (!grid || !message || !search || !reload || !more) return;
  const owner = 'HenricHuntsman';
  let repos = [];
  let visible = 18;
  let capped = false;

  function text(tag, value, className) {
    const el = document.createElement(tag);
    el.textContent = value;
    if (className) el.className = className;
    return el;
  }
  function externalLink(label, href, className) {
    const link = text('a', label, className);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }
  function render() {
    const query = search.value.toLowerCase().trim();
    const found = repos.filter(r => (r.name + ' ' + (r.description || '')).toLowerCase().includes(query));
    grid.replaceChildren();
    if (!found.length) grid.append(text('div', repos.length ? 'No matching public repositories.' : 'No public repositories available.', 'repo-placeholder'));
    for (const r of found.slice(0, visible)) {
      const card = document.createElement('article');
      card.className = 'repo-item';
      const url = 'https://github.com/' + owner + '/' + encodeURIComponent(r.name);
      card.append(externalLink(r.name + ' ↗', url, 'repo-name'));
      card.append(text('p', r.description || 'Public source repository; no description provided.', 'repo-description'));
      const when = Date.parse(r.pushed_at || r.updated_at);
      const date = Number.isFinite(when) ? new Date(when).toLocaleDateString('en-AU', {year:'numeric',month:'short',day:'numeric'}) : 'Unknown';
      card.append(text('small', 'Last push ' + date + ' · CI is a separate check.', 'repo-meta'));
      const branch = typeof r.default_branch === 'string' ? r.default_branch : '';
      card.append(externalLink('Inspect ' + (branch || 'repository') + ' CI ↗', url + '/actions' + (branch ? '?query=' + encodeURIComponent('branch:' + branch) : ''), 'repo-ci'));
      grid.append(card);
    }
    more.hidden = found.length <= visible;
    more.textContent = 'Show next ' + Math.min(18, Math.max(0, found.length - visible)) + ' repositories';
    message.textContent = 'Showing ' + Math.min(found.length, visible) + ' of ' + found.length + ' matching public repositories; ' + repos.length + ' loaded from GitHub.' + (capped ? ' Scan capped at 300; browse GitHub for the complete inventory.' : '');
  }
  async function refresh() {
    reload.disabled = true;
    more.hidden = true;
    grid.replaceChildren(text('div', 'Contacting GitHub public API…', 'repo-placeholder'));
    message.textContent = 'Loading public GitHub metadata…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const collected = [];
      capped = false;
      for (let page = 1; page <= 3; page += 1) {
        const response = await fetch('https://api.github.com/users/' + owner + '/repos?per_page=100&sort=updated&page=' + page, {
          method:'GET', headers:{'Accept':'application/vnd.github+json'}, signal:controller.signal, cache:'no-store', credentials:'omit'
        });
        if (!response.ok) throw new Error('GitHub HTTP ' + response.status + (response.status === 403 ? ' (possibly rate-limited)' : ''));
        const payload = await response.json();
        if (!Array.isArray(payload)) throw new Error('Unexpected GitHub response');
        collected.push(...payload);
        if (payload.length < 100) break;
        if (page === 3) capped = true;
      }
      const unique = new Map();
      for (const r of collected) {
        if (r && r.private === false && typeof r.owner?.login === 'string' &&
            r.owner.login.toLowerCase() === owner.toLowerCase() && typeof r.name === 'string') unique.set(r.name, r);
      }
      repos = [...unique.values()].sort((a,b) => Date.parse(b.pushed_at || 0) - Date.parse(a.pushed_at || 0));
      visible = 18;
      render();
    } catch (err) {
      repos = [];
      grid.replaceChildren(text('div', 'Public GitHub data is unavailable. Open the inventory on GitHub or try Refresh.', 'repo-placeholder'));
      message.textContent = err && err.name === 'AbortError' ? 'GitHub timed out; try refreshing.' : String(err.message || 'GitHub request failed');
    } finally {
      clearTimeout(timer);
      reload.disabled = false;
    }
  }
  search.addEventListener('input', () => { visible = 18; render(); });
  more.addEventListener('click', () => { visible += 18; render(); });
  reload.addEventListener('click', refresh);
  refresh();
})();
