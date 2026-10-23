const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker({ selection = '  A technical concept  ', restricted = false } = {}) {
  const listeners = {}, messages = [], badges = [], injections = [], requests = [];
  const chrome = {
    runtime: { id: 'test', onInstalled: { addListener() {} }, onMessage: { addListener(fn) { listeners.message = fn; } } },
    contextMenus: { create() {}, onClicked: { addListener(fn) { listeners.context = fn; } } },
    commands: { onCommand: { addListener(fn) { listeners.command = fn; } } },
    tabs: {
      query: async () => [{ id: 42 }],
      sendMessage: async (id, message) => { messages.push({ id, message }); return { shown: true }; }
    },
    scripting: { executeScript: async options => {
      injections.push(options);
      if (restricted) throw new Error('Cannot access chrome:// pages');
      return options.files?.[0] === 'selection.js' ? [{ result: selection }] : [];
    } },
    action: {
      setBadgeText: async data => badges.push(data),
      setBadgeBackgroundColor: async () => {}, setTitle: async () => {}
    }
  };
  vm.runInNewContext(fs.readFileSync('extension/background.js', 'utf8'), {
    chrome, window: { getSelection: () => ({ toString: () => selection }) },
    console: { warn() {} }, AbortSignal,
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({ explanation: 'Explained', length: 'standard' }) }; }
  });
  return { listeners, messages, badges, injections, requests };
}

test('shortcut extracts the selection and opens an on-page card in the invoking tab', async () => {
  const instance = worker();
  await instance.listeners.command('clarify-selection', { id: 7 });
  assert.equal(instance.messages[0].id, 7);
  assert.equal(instance.messages[0].message.text, 'A technical concept');
  assert.equal(instance.messages[0].message.type, 'SHOW_CARD');
  assert.equal(instance.injections[1].files[0], 'content.js');
});
test('shortcut resolves the active tab when Chrome does not supply one', async () => {
  const instance = worker();
  await instance.listeners.command('clarify-selection');
  assert.equal(instance.messages[0].id, 42);
});
test('empty selection reaches the card for guidance without an API call', async () => {
  const instance = worker({ selection: '   ' });
  await instance.listeners.command('clarify-selection', { id: 7 });
  assert.equal(instance.messages[0].message.text, '');
  assert.equal(instance.requests.length, 0);
});
test('restricted pages show an action badge and never send selected text', async () => {
  const instance = worker({ restricted: true });
  await instance.listeners.command('clarify-selection', { id: 7 });
  assert.equal(instance.messages.length, 0);
  assert.equal(instance.badges[0].text, '!');
});
test('explanation proxy sends selection, length, and custom prompt only to the fixed API', async () => {
  const instance = worker();
  const payload = { text: 'An API', length: 'one_line', prompt: 'Use an analogy' };
  const response = await new Promise(resolve => instance.listeners.message({ type: 'EXPLAIN', payload }, { id: 'test', tab: { id: 7 } }, resolve));
  assert.equal(response.ok, true);
  assert.equal(instance.requests[0].url, 'http://127.0.0.1:8000/api/explain');
  assert.deepEqual(JSON.parse(instance.requests[0].options.body), payload);
});
test('unrelated commands do not read the page', async () => {
  const instance = worker();
  await instance.listeners.command('other', { id: 7 });
  assert.equal(instance.injections.length, 0);
});

function readSelection(document) {
  return vm.runInNewContext(fs.readFileSync('extension/selection.js', 'utf8'), { document });
}
const root = (text = '', activeElement = null, elements = []) => ({
  activeElement, getSelection: () => ({ toString: () => text, isCollapsed: !text }),
  querySelectorAll: () => elements
});
test('selection reader extracts ordinary document text', () => {
  assert.equal(readSelection(root('Highlighted sentence')), 'Highlighted sentence');
});
test('selection reader finds a selection inside a shadow root', () => {
  assert.equal(readSelection(root('', null, [{ shadowRoot: root('Component selection') } ])), 'Component selection');
});
test('selection reader finds a focused same-origin frame selection', () => {
  assert.equal(readSelection(root('', { tagName: 'IFRAME', contentDocument: root('Frame selection') })), 'Frame selection');
});
test('selection reader returns only the selected part of a text field', () => {
  assert.equal(readSelection(root('', { tagName: 'TEXTAREA', value: 'before concept after', selectionStart: 7, selectionEnd: 14 })), 'concept');
});
test('selection reader does not extract passwords', () => {
  assert.equal(readSelection(root('secret', { tagName: 'INPUT', type: 'password' })), '');
});
test('selection reader uses DOM ranges when selection string is empty', () => {
  const document = root();
  document.getSelection = () => ({ toString: () => '', isCollapsed: false, rangeCount: 1,
    getRangeAt: () => ({ cloneContents: () => ({ textContent: 'Selected range' }) }) });
  assert.equal(readSelection(document), 'Selected range');
});
