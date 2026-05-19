// popup.js — Kanji Flashcard Exporter
// Supports Anthropic (claude-sonnet-4) and OpenAI (gpt-4o-mini)

let kanjiData = [];
let pendingSelection = null;
let selectedFormat = 'anki';
let selectedProvider = 'anthropic';

const apiPanel = document.getElementById('apiPanel');
const mainPanel = document.getElementById('mainPanel');
const settingsToggle = document.getElementById('settingsToggle');
const anthropicKeyInput = document.getElementById('anthropicKeyInput');
const openaiKeyInput = document.getElementById('openaiKeyInput');
const anthropicFields = document.getElementById('anthropicFields');
const openaiFields = document.getElementById('openaiFields');
const btnAnthropic = document.getElementById('btnAnthropic');
const btnOpenAI = document.getElementById('btnOpenAI');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const scanBtn = document.getElementById('scanBtn');
const scanBtnText = document.getElementById('scanBtnText');
const statusEl = document.getElementById('status');
const statusText = document.getElementById('statusText');
const statusSpinner = document.getElementById('statusSpinner');
const resultsSection = document.getElementById('resultsSection');
const exportSection = document.getElementById('exportSection');
const kanjiTableBody = document.getElementById('kanjiTableBody');
const kanjiCount = document.getElementById('kanjiCount');
const exportBtn = document.getElementById('exportBtn');
const pageTitleEl = document.getElementById('pageTitle');
const keyDot = document.getElementById('keyDot');
const keyStatusEl = document.getElementById('keyStatus');

function updateScanHint(hasSelection) {
  const hint = document.getElementById('scanHint');
  if (hasSelection) {
    hint.textContent = '✓ Selection ready — click Scan to process it';
    hint.style.background = '#f0fdf4';
    hint.style.borderColor = '#bbf7d0';
    hint.style.color = '#166534';
  } else {
    hint.textContent = '💡 Right-click highlighted text → Scan selection';
    hint.style.background = '';
    hint.style.borderColor = '';
    hint.style.color = '';
  }
}

async function init() {
  const stored = await chrome.storage.local.get(['anthropicKey', 'openaiKey', 'provider']);
  selectedProvider = stored.provider || 'anthropic';
  setProviderUI(selectedProvider);
  if (stored.anthropicKey) anthropicKeyInput.value = stored.anthropicKey;
  if (stored.openaiKey) openaiKeyInput.value = stored.openaiKey;
  updateKeyIndicator(stored);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) pageTitleEl.textContent = tab.title || tab.url;

  // Check if opened via context menu with a pending selection
  const session = await chrome.storage.session.get('pendingSelection');
  if (session.pendingSelection) {
    pendingSelection = session.pendingSelection;
    await chrome.storage.session.remove('pendingSelection');
    updateScanHint(true);
  }
}

function setProviderUI(provider) {
  selectedProvider = provider;
  btnAnthropic.classList.toggle('active', provider === 'anthropic');
  btnOpenAI.classList.toggle('active', provider === 'openai');
  anthropicFields.style.display = provider === 'anthropic' ? 'block' : 'none';
  openaiFields.style.display = provider === 'openai' ? 'block' : 'none';
}

function updateKeyIndicator(stored) {
  const provider = stored.provider || 'anthropic';
  const hasKey = provider === 'openai' ? !!stored.openaiKey : !!stored.anthropicKey;
  const label = provider === 'openai' ? 'OpenAI' : 'Anthropic';
  keyDot.classList.toggle('set', hasKey);
  keyStatusEl.textContent = hasKey ? `${label} key set` : 'No API key';
}

btnAnthropic.addEventListener('click', () => setProviderUI('anthropic'));
btnOpenAI.addEventListener('click', () => setProviderUI('openai'));

settingsToggle.addEventListener('click', () => {
  const isApiVisible = apiPanel.classList.contains('active');
  apiPanel.classList.toggle('active', !isApiVisible);
  mainPanel.classList.toggle('active', isApiVisible);
  settingsToggle.textContent = isApiVisible ? '⚙' : '✕';
});

saveApiKeyBtn.addEventListener('click', async () => {
  const anthropicKey = anthropicKeyInput.value.trim();
  const openaiKey = openaiKeyInput.value.trim();
  if (selectedProvider === 'anthropic' && anthropicKey && !anthropicKey.startsWith('sk-ant-')) {
    showStatus('error', '❌ Anthropic key should start with sk-ant-');
    return;
  }
  if (selectedProvider === 'openai' && openaiKey && !openaiKey.startsWith('sk-')) {
    showStatus('error', '❌ OpenAI key should start with sk-');
    return;
  }
  await chrome.storage.local.set({ anthropicKey, openaiKey, provider: selectedProvider });
  updateKeyIndicator({ anthropicKey, openaiKey, provider: selectedProvider });
  apiPanel.classList.remove('active');
  mainPanel.classList.add('active');
  settingsToggle.textContent = '⚙';
  showStatus('success', '✓ Settings saved');
});

document.querySelectorAll('.export-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.export-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedFormat = opt.dataset.format;
  });
});

scanBtn.addEventListener('click', async () => {
  const stored = await chrome.storage.local.get(['anthropicKey', 'openaiKey', 'provider']);
  const provider = stored.provider || 'anthropic';
  const apiKey = provider === 'openai' ? stored.openaiKey : stored.anthropicKey;

  if (!apiKey) {
    showStatus('error', '❌ Please set your API key first (⚙ settings)');
    return;
  }

  scanBtn.disabled = true;
  scanBtnText.textContent = 'Scanning...';
  resultsSection.classList.remove('visible');
  exportSection.classList.remove('visible');
  kanjiData = [];

  showStatus('loading', 'Extracting Japanese text...');

  const limit = parseInt(document.getElementById('kanjiLimit').value, 10) || 50;
  let extracted;

  if (pendingSelection) {
    // Use text captured via context menu before popup stole focus
    const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf][\u4e00-\u9faf\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]{0,5}/g;
    const allKanji = pendingSelection.match(kanjiRegex) || [];
    const uniqueKanjiFromSel = [...new Set(allKanji)].slice(0, limit);
    extracted = { uniqueKanji: uniqueKanjiFromSel, sampleText: pendingSelection.substring(0, 1500), source: 'selection' };
    pendingSelection = null;
    updateScanHint(false);
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractFromPage });
      extracted = results[0].result;
    } catch (err) {
      showStatus('error', '❌ Cannot access this page. Try a regular webpage.');
      scanBtn.disabled = false;
      scanBtnText.textContent = 'Scan Page for Kanji';
      return;
    }
  }

  if (!extracted || extracted.uniqueKanji.length === 0) {
    showStatus('error', '❌ No kanji found. Right-click highlighted text and choose "Scan selection", or navigate to a Japanese webpage.');
    scanBtn.disabled = false;
    scanBtnText.textContent = 'Scan Page for Kanji';
    return;
  }

  const uniqueKanji = extracted.source === 'selection'
    ? extracted.uniqueKanji
    : extracted.uniqueKanji.slice(0, limit);
  const providerLabel = provider === 'openai' ? 'OpenAI' : 'Claude';
  const sourceLabel = extracted.source === 'selection' ? 'selection' : 'page';
  showStatus('loading', `Found ${uniqueKanji.length} kanji from ${sourceLabel}. Asking ${providerLabel} for readings...`);

  resultsSection.classList.add('visible');
  kanjiCount.textContent = `${uniqueKanji.length} kanji`;
  kanjiTableBody.innerHTML = `<tr class="loading-row"><td colspan="3">⏳ Generating readings...</td></tr>`;

  try {
    kanjiData = provider === 'openai'
      ? await lookupWithOpenAI(apiKey, uniqueKanji, extracted.sampleText)
      : await lookupWithAnthropic(apiKey, uniqueKanji, extracted.sampleText);
    renderTable(kanjiData);
    exportSection.classList.add('visible');
    showStatus('success', `✓ ${kanjiData.length} kanji processed via ${providerLabel}!`);
  } catch (err) {
    showStatus('error', `❌ API error: ${err.message}`);
    kanjiTableBody.innerHTML = `<tr class="loading-row"><td colspan="3">Error loading data</td></tr>`;
  }

  scanBtn.disabled = false;
  scanBtnText.textContent = 'Scan Again';
});

function extractFromPage() {
  const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf][\u4e00-\u9faf\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]*/g;
  const japaneseRegex = /[\u3000-\u9fff\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName.toLowerCase();
      if (['script', 'style', 'noscript'].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let text = '', node;
  while ((node = walker.nextNode())) text += node.textContent + ' ';
  const allKanji = text.match(kanjiRegex) || [];
  const uniqueKanji = [...new Set(allKanji)];
  const sentences = text.split(/[\n。！？]/).filter(s => japaneseRegex.test(s));
  return { uniqueKanji, sampleText: sentences.slice(0, 8).join('。').substring(0, 1500) };
}

function buildPrompt(kanjiList, context) {
  return `You are a Japanese language expert. For each kanji below, provide the most common reading in hiragana and a brief English meaning (1-4 words).

Context from the source page: "${context.substring(0, 400)}"

Kanji: ${kanjiList.join(', ')}

Reply ONLY with a JSON array, no markdown, no explanation:
[{"kanji":"字","hiragana":"じ","english":"character"},...]

Rules: one object per kanji, skip punctuation, keep english brief.`;
}

async function lookupWithAnthropic(apiKey, kanjiList, context) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildPrompt(kanjiList, context) }]
    })
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  return JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim());
}

async function lookupWithOpenAI(apiKey, kanjiList, context) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildPrompt(kanjiList, context) }]
    })
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content.replace(/```json|```/g, '').trim());
}

function renderTable(data) {
  kanjiTableBody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="td-kanji">${row.kanji}</td><td class="td-hira">${row.hiragana}</td><td class="td-eng">${row.english}</td>`;
    kanjiTableBody.appendChild(tr);
  });
}

function showStatus(type, message) {
  statusEl.className = 'status visible ' + type;
  statusText.textContent = message;
  statusSpinner.style.display = type === 'loading' ? 'block' : 'none';
}

exportBtn.addEventListener('click', () => {
  if (!kanjiData.length) return;
  let content, filename, mimeType;
  if (selectedFormat === 'anki') {
    content = kanjiData.map(r => `"${r.kanji}","${r.hiragana} - ${r.english}"`).join('\n');
    filename = 'kanji_anki.csv'; mimeType = 'text/csv';
  } else if (selectedFormat === 'quizlet') {
    content = kanjiData.map(r => `${r.kanji}\t${r.hiragana} (${r.english})`).join('\n');
    filename = 'kanji_quizlet.txt'; mimeType = 'text/plain';
  } else {
    content = ['Kanji,Hiragana,English', ...kanjiData.map(r => `"${r.kanji}","${r.hiragana}","${r.english}"`)].join('\n');
    filename = 'kanji_flashcards.csv'; mimeType = 'text/csv';
  }
  const blob = new Blob(['\uFEFF' + content], { type: mimeType + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showStatus('success', `✓ Exported ${kanjiData.length} flashcards as ${filename}`);
});

init();
