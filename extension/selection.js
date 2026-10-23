// Return only actively selected text, including accessible frames and shadow roots.
// This file runs on demand, before the explanation card takes focus.
(() => {
  function readSelection(root) {
    const selection = root.getSelection?.();
    const text = selection?.toString().trim();
    if (text) return text;
    // Some component selections expose ranges even when toString() is empty.
    if (selection && !selection.isCollapsed) {
      let ranged = '';
      for (let index = 0; index < selection.rangeCount; index++) {
        ranged += selection.getRangeAt(index).cloneContents().textContent || '';
      }
      if (ranged.trim()) return ranged.trim();
    }
    return '';
  }
  function readRoot(root) {
    const active = root.activeElement;
    // Never extract password fields or unselected field contents.
    if (active?.tagName === 'INPUT' && active.type === 'password') return '';
    if (active && (active.tagName === 'TEXTAREA' ||
      (active.tagName === 'INPUT' && ['text', 'search', 'url', 'tel'].includes(active.type)))) {
      const { selectionStart, selectionEnd } = active;
      if (Number.isInteger(selectionStart) && selectionEnd > selectionStart) {
        return active.value.slice(selectionStart, selectionEnd).trim();
      }
    }
    if (active?.shadowRoot) {
      const text = readRoot(active.shadowRoot);
      if (text) return text;
    }
    if (active?.tagName === 'IFRAME') {
      try { if (active.contentDocument) { const text = readRoot(active.contentDocument); if (text) return text; } }
      catch { /* Cross-origin frames are outside the granted page access. */ }
    }
    const own = readSelection(root);
    if (own) return own;
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) {
        const text = readRoot(element.shadowRoot);
        if (text) return text;
      }
      if (element.tagName === 'IFRAME') {
        try { if (element.contentDocument) { const text = readRoot(element.contentDocument); if (text) return text; } }
        catch { /* Do not request broader permissions for inaccessible frames. */ }
      }
    }
    return '';
  }
  return readRoot(document);
})();
