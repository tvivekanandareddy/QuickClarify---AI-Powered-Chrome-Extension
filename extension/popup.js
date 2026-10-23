/* One interface for the Chrome popup and local browser playground. */
const isExtension = Boolean(globalThis.chrome?.runtime?.id);
const $ = selector => document.querySelector(selector);
let length = 'standard', currentResult = null, activeTabId = null;
const store = {
  async get(key, fallback) {
    if (isExtension) return (await chrome.storage.local.get(key))[key] ?? fallback;
    try { return JSON.parse(localStorage.getItem(`qc-${key}`)) ?? fallback; } catch { return fallback; }
  },
  async set(key, value) {
    if (isExtension) return chrome.storage.local.set({ [key]: value });
    localStorage.setItem(`qc-${key}`, JSON.stringify(value));
  }
};
async function api(type, payload) {
  if (isExtension) {
    const response = await chrome.runtime.sendMessage({ type, payload });
    if (!response?.ok) throw new Error(response?.error || 'Extension connection lost. Reopen QuickClarify.');
    return response.data;
  }
  try {
    const response = await fetch(type === 'HEALTH' ? '/health' : '/api/explain', type === 'HEALTH'
      ? { signal: AbortSignal.timeout(3000) }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(28000) });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Select between 1 and 6000 characters.');
    return data;
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Cannot reach the backend. Start the FastAPI server and try again.');
    throw error;
  }
}
function count() { $('#count').textContent = `${$('#selection').value.length} / 6000`; }
function chooseLength(value) {
  length = value;
  document.querySelectorAll('[data-length]').forEach(button => {
    const selected = button.dataset.length === value;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
function showResult(result) {
  currentResult = result;
  $('#result-text').textContent = result.explanation;
  $('#model').textContent = result.demo ? 'DEMO · Prepared sample, not an AI response' : `${result.model} · AI can make mistakes`;
  $('#result').hidden = false;
  $('#on-page').hidden = !activeTabId;
}
function error(message) { $('#error').textContent = message; $('#error').hidden = !message; }
$('#selection').addEventListener('input', () => { count(); currentResult = null; $('#on-page').hidden = true; });
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
  $('#selection').value = button.dataset.example; count(); currentResult = null; $('#result').hidden = true; $('#selection').focus();
}));
document.querySelectorAll('[data-length]').forEach(button => button.addEventListener('click', () => {
  chooseLength(button.dataset.length); store.set('length', length).catch(() => error('Could not save your preference.'));
}));
$('#settings-toggle').addEventListener('click', () => { $('#settings').hidden = !$('#settings').hidden; });
$('#save-settings').addEventListener('click', async () => {
  try { await store.set('prompt', $('#prompt').value); $('#settings').hidden = true; } catch { error('Could not save your preference.'); }
});
$('#explain').addEventListener('click', async () => {
  const text = $('#selection').value.trim();
  if (!text) { error('Add some text or try a sample concept first.'); $('#selection').focus(); return; }
  error(''); $('#result').hidden = true; $('#explain').disabled = true;
  $('#explain').firstElementChild.textContent = '✦   Finding the words…';
  try {
    const data = await api('EXPLAIN', { text, length, prompt: $('#prompt').value });
    const entry = { ...data, text, created: Date.now() };
    showResult(entry);
    const history = await store.get('history', []);
    await store.set('history', [entry, ...history].slice(0, 20));
    if (!$('#history').hidden) await renderHistory();
  } catch (err) { error(err.message); }
  finally { $('#explain').disabled = false; $('#explain').firstElementChild.textContent = '✦   Clarify this'; }
});
$('#copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(currentResult.explanation); $('#copy').textContent = 'Copied ✓'; setTimeout(() => { $('#copy').textContent = 'Copy ↗'; }, 1600); }
  catch { error('Clipboard unavailable. Select and copy the explanation manually.'); }
});
$('#on-page').addEventListener('click', async () => {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'ON_PAGE', tabId: activeTabId, text: currentResult.text, result: currentResult });
    if (!response.ok) throw new Error('This page does not allow extension cards. Try a regular webpage.');
    window.close();
  } catch (err) { error(err.message); }
});
async function renderHistory() {
  const entries = await store.get('history', []);
  $('#history-list').replaceChildren();
  if (!entries.length) { $('#history-list').textContent = 'Your next aha! moment will appear here.'; return; }
  for (const entry of entries) {
    const button = document.createElement('button'); button.className = 'history-item';
    button.textContent = entry.text.slice(0, 90);
    const date = document.createElement('small'); date.textContent = `${new Date(entry.created).toLocaleDateString()} · ${entry.length.replace('_', ' ')}`; button.append(date);
    button.addEventListener('click', () => { $('#selection').value = entry.text; count(); chooseLength(entry.length); showResult(entry); error(''); });
    $('#history-list').append(button);
  }
}
$('#history-toggle').addEventListener('click', async () => { $('#history').hidden = !$('#history').hidden; if (!$('#history').hidden) await renderHistory(); });
$('#clear-history').addEventListener('click', async () => { await store.set('history', []); await renderHistory(); });
async function init() {
  if (isExtension) document.body.classList.add('extension');
  chooseLength(await store.get('length', 'standard')); $('#prompt').value = await store.get('prompt', '');
  if (isExtension) {
    const commands = await chrome.commands.getAll();
    const shortcut = commands.find(command => command.name === 'clarify-selection')?.shortcut;
    $('#shortcut-hint').textContent = shortcut
      ? `Highlight text, then press ${shortcut}. Change it at chrome://extensions/shortcuts.`
      : 'Assign your QuickClarify shortcut at chrome://extensions/shortcuts, then highlight text and press it.';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTabId = tab.id;
      const [selection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['selection.js'] });
      $('#selection').value = (selection.result || '').slice(0, 6000); count();
    } catch { activeTabId = null; $('#selection').placeholder = 'Paste text here. Chrome internal pages and the Web Store do not allow selection access.'; }
  }
  try { const health = await api('HEALTH'); $('#connection').textContent = health.demo ? 'Demo mode · Try a sample' : 'Connected · Ready to clarify'; $('.status').classList.add('connected'); }
  catch { $('#connection').textContent = 'Backend offline · Start the server'; }
}
init().catch(err => error(err.message));
