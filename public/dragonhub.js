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