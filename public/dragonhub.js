(() => {
  'use strict';
  const input = document.getElementById('report-file');
  const status = document.getElementById('report-message');
  const time = document.getElementById('report-time');
  if (!input || !status || !time) return;
  function setCard(name, label, cls, note) {
    const card = document.querySelector('[data-service="' + name + '"]');
    const pill = card.querySelector('.pill');
    pill.className = 'pill ' + cls;
    pill.textContent = label;
    card.querySelector('.detail').textContent = note;
  }
  function validate(s, name) {
    if (!s || !Number.isInteger(s.http_code) || typeof s.classification !== 'string')
      throw new Error('Missing ' + name + ' diagnostic.');
    const labels = {
      reachable: ['REACHABLE','good'], refused: ['ACCESS REFUSED','warn'],
      reachable_protocol: ['ENDPOINT DETECTED','good'],
      unreachable: ['UNREACHABLE','bad'], unexpected: ['REVIEW NEEDED','warn']
    };
    const pair = labels[s.classification] || ['UNVERIFIED',''];
    setCard(name, pair[0], pair[1], 'HTTP ' + s.http_code + '. ' + String(s.note || '').slice(0,300));
  }
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 32768) { status.textContent = 'File too large (32 KB limit).'; return; }
    try {
      const data = JSON.parse(await file.text());
      if (data.schema !== 'dragonhub-readonly-v1' || !data.services)
        throw new Error('Not a DragonHub read-only report.');
      validate(data.services.forgejo, 'forgejo');
      validate(data.services.mcp, 'mcp');
      setCard('chatgpt', 'NOT CONNECTED', 'pending', 'Local reports cannot prove ChatGPT access. Verify a real MCP tool call.');
      time.textContent = 'Local report: ' + String(data.created_at || 'time unavailable').slice(0,40);
      status.textContent = 'Loaded ' + file.name + ' locally. Nothing uploaded.';
    } catch (err) { status.textContent = 'Cannot load report: ' + (err.message || 'Invalid file'); }
  });
})();

/* Public GitHub browsing is separate from the private Forgejo/MCP connection.
   No tokens, backend secrets, or Git write calls are involved. */
(() => {
  'use strict';
  const grid = document.getElementById('repo-grid');
  const message = document.getElementById('repos-status');
  const search = document.getElementById('repo-search');
  const reload = document.getElementById('reload-repos');
  if (!grid || !message || !search || !reload) return;
  const owner = 'HenricHuntsman';
  let repos = [];
  function text(tag, value, className) {
    const el = document.createElement(tag);
    el.textContent = value;
    if (className) el.className = className;
    return el;
  }
  function render() {
    const query = search.value.toLowerCase().trim();
    const found = repos.filter(r => (r.name + ' ' + (r.description || '')).toLowerCase().includes(query));
    grid.replaceChildren();
    if (!found.length) {
      grid.append(text('div', repos.length ? 'No matching public repositories.' : 'No public repositories available.', 'repo-placeholder'));
    }
    for (const r of found.slice(0, 18)) {
      const card = document.createElement('article');
      card.className = 'repo-item';
      const link = text('a', r.name + ' ↗', 'repo-name');
      link.href = 'https://github.com/' + encodeURIComponent(owner) + '/' + encodeURIComponent(r.name);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      card.append(link);
      card.append(text('p', r.description || 'Public source repository; no description provided.', 'repo-description'));
      const when = Date.parse(r.pushed_at || r.updated_at);
      const date = Number.isFinite(when) ? new Date(when).toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}) : 'Unknown';
      card.append(text('small', 'GitHub · Last push ' + date, 'repo-meta'));
      grid.append(card);
    }
    message.textContent = 'Showing ' + Math.min(found.length,18) + ' of ' + found.length + ' matching public repositories from GitHub.';
  }
  async function refresh() {
    reload.disabled = true;
    grid.replaceChildren(text('div', 'Contacting GitHub public API…', 'repo-placeholder'));
    message.textContent = 'Loading from GitHub (never Forgejo).';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('https://api.github.com/users/' + owner + '/repos?per_page=100&sort=updated', {
        method:'GET',
        headers:{'Accept':'application/vnd.github+json'},
        signal:controller.signal,
        cache:'no-store',
        credentials:'omit'
      });
      if (!response.ok) throw new Error('GitHub HTTP ' + response.status + (response.status === 403 ? ' (possibly rate-limited)' : ''));
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('Unexpected GitHub response');
      repos = payload.filter(r => r && r.private === false && r.owner && r.owner.login.toLowerCase() === owner.toLowerCase() && typeof r.name === 'string')
        .sort((a,b) => Date.parse(b.pushed_at || 0) - Date.parse(a.pushed_at || 0));
      render();
    } catch(err) {
      repos = [];
      grid.replaceChildren(text('div', 'Public GitHub data unavailable right now. You can still use the local report importer below.', 'repo-placeholder'));
      message.textContent = err && err.name === 'AbortError' ? 'GitHub timed out; try refreshing.' : String(err.message || 'GitHub request failed');
    } finally {
      clearTimeout(timer);
      reload.disabled = false;
    }
  }
  search.addEventListener('input', render);
  reload.addEventListener('click', refresh);
  refresh();
})();
