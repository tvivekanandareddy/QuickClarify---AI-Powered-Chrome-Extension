(() => {
  if (globalThis.__quickClarifyInstalled) return;
  globalThis.__quickClarifyInstalled = true;
  let host, dismiss;
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message.type !== 'SHOW_CARD') return;
    dismiss?.();
    host = document.createElement('div');
    host.style.cssText = 'position:fixed!important;right:22px!important;bottom:22px!important;z-index:2147483647!important;display:block!important;';
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `<style>
      :host{all:initial}*{box-sizing:border-box}article{width:370px;max-width:calc(100vw - 44px);max-height:75vh;overflow:auto;background:#fffefa;color:#302740;border:1px solid #e6deef;border-radius:17px;box-shadow:0 12px 60px #2d1b4530;padding:22px;font:13px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}header{display:flex;align-items:center;justify-content:space-between;font-weight:700;font-size:16px;color:#7560be}button{font:inherit;cursor:pointer;color:#76618e;border:1px solid #e7def1;background:#f8f5fd;border-radius:6px;padding:5px 9px}header button{background:none;border:0;font-size:20px}blockquote{margin:16px 0;font-size:11px;color:#9584a2;border-left:2px solid #d4c5ec;padding-left:12px;white-space:pre-wrap;max-height:70px;overflow:auto}nav{display:flex;gap:6px;margin-bottom:16px}nav button[aria-pressed=true]{background:#7960d5;color:white;border-color:#7960d5}#answer{white-space:pre-wrap;font-size:13px}footer{color:#a394b1;font-size:10px;margin-top:14px;display:flex;justify-content:space-between}#error{color:#a74e46;font-size:12px}button:focus-visible{outline:2px solid #7960d5;outline-offset:2px}</style>
      <article role="dialog" aria-label="QuickClarify explanation"><header><span>✦ QuickClarify</span><button id="close" aria-label="Close">×</button></header><blockquote></blockquote><nav aria-label="Explanation length"><button data-length="one_line">One line</button><button data-length="standard">Standard</button><button data-length="detailed">Detailed</button></nav><div id="answer" aria-live="polite"></div><p id="error" role="alert"></p><footer><span id="meta"></span><button id="copy">Copy</button></footer></article>`;
    // Selected and generated text are inserted only as text, never interpreted as HTML.
    shadow.querySelector('blockquote').textContent = message.text;
    document.documentElement.append(host);
    const close = () => { host.remove(); document.removeEventListener('keydown', onKey); };
    dismiss = close;
    const onKey = event => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    shadow.querySelector('#close').onclick = close;
    let explanation = '', sequence = 0;
    function display(result) {
      explanation = result.explanation; shadow.querySelector('#answer').textContent = explanation;
      shadow.querySelector('#meta').textContent = result.demo ? 'Demo · Prepared sample' : `${result.model} · AI can make mistakes`;
      shadow.querySelectorAll('[data-length]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.length === result.length)));
    }
    async function explain(length) {
      const requestId = ++sequence;
      explanation = '';
      shadow.querySelector('#error').textContent = '';
      shadow.querySelector('#answer').textContent = '✦ Finding the words…';
      shadow.querySelector('#copy').disabled = true;
      try {
        const { prompt = '' } = await chrome.storage.local.get('prompt');
        const response = await chrome.runtime.sendMessage({ type: 'EXPLAIN', payload: { text: message.text, length, prompt } });
        if (requestId !== sequence) return;
        if (!response.ok) throw new Error(response.error);
        display(response.data);
      } catch (err) { if (requestId === sequence) { shadow.querySelector('#answer').textContent = ''; shadow.querySelector('#error').textContent = err.message; } }
      finally { if (requestId === sequence) shadow.querySelector('#copy').disabled = !explanation; }
    }
    shadow.querySelectorAll('[data-length]').forEach(b => b.onclick = () => explain(b.dataset.length));
    shadow.querySelector('#copy').onclick = async () => {
      try { await navigator.clipboard.writeText(explanation); shadow.querySelector('#copy').textContent = 'Copied ✓'; }
      catch { shadow.querySelector('#error').textContent = 'Select the explanation and copy it manually.'; }
    };
    if (!message.text.trim() || message.text.length > 6000) {
      shadow.querySelector('#error').textContent = message.text.length > 6000
        ? 'This selection is too long. Highlight up to 6000 characters and press your shortcut again.'
        : 'Highlight a concept or sentence on the page, then press your QuickClarify shortcut again.';
      shadow.querySelectorAll('nav button, #copy').forEach(button => { button.disabled = true; });
    } else if (message.result) display(message.result);
    else chrome.storage.local.get('length').then(settings => explain(settings.length || 'standard'));
    shadow.querySelector('#close').focus();
    respond({ shown: true });
  });
})();
