const API = 'http://127.0.0.1:8000';
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'clarify', title: 'Explain with QuickClarify', contexts: ['selection'] });
});
async function requestExplanation(payload) {
  const response = await fetch(`${API}/api/explain`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(28000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Please select between 1 and 6000 characters.');
  return data;
}
async function showOnPage(tabId, text, result) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  const response = await chrome.tabs.sendMessage(tabId, { type: 'SHOW_CARD', text, result });
  await chrome.action.setBadgeText({ tabId, text: '' });
  await chrome.action.setTitle({ tabId, title: 'QuickClarify' });
  return response;
}
async function pageUnavailable(tabId, error) {
  console.warn('QuickClarify cannot run on this page:', error.message);
  if (!tabId) return;
  await chrome.action.setBadgeText({ tabId, text: '!' });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#a74e46' });
  await chrome.action.setTitle({ tabId, title: 'QuickClarify cannot access this page. Try a regular webpage, or paste text into the popup.' });
}
// Commands grant temporary activeTab access, so no always-on webpage listener is needed.
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'clarify-selection') return;
  let tabId = tab?.id;
  try {
    if (!tabId) tabId = (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    if (!tabId) return;
    const [selection] = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['selection.js']
    });
    await showOnPage(tabId, (selection?.result || '').trim());
  } catch (error) { await pageUnavailable(tabId, error); }
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clarify' || !tab?.id) return;
  try {
    await showOnPage(tab.id, info.selectionText.trim());
  } catch (error) { await pageUnavailable(tab.id, error); }
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // Accept only our extension and content scripts; never an arbitrary URL to fetch.
  if (sender.id !== chrome.runtime.id) return;
  const task = message.type === 'EXPLAIN' ? requestExplanation(message.payload)
    : message.type === 'HEALTH' ? fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) }).then(r => { if (!r.ok) throw new Error('Backend unavailable'); return r.json(); })
    : message.type === 'ON_PAGE' && !sender.tab ? showOnPage(message.tabId, message.text, message.result) : null;
  if (!task) return;
  task.then(data => respond({ ok: true, data })).catch(error => respond({ ok: false, error: error.name === 'TimeoutError' ? 'The request timed out. Please try again.' : error.message === 'Failed to fetch' ? 'Start the QuickClarify backend at http://127.0.0.1:8000, then try again.' : error.message }));
  return true;
});
