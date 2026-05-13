// popup.js - Main extension logic

let kanjiData = [];
let selectedFormat = 'anki';
let pageData = null;

// DOM elements
const apiPanel = document.getElementById('apiPanel');
const mainPanel = document.getElementById('mainPanel');
const settingsToggle = document.getElementById('settingsToggle');
const apiKeyInput = document.getElementById('apiKeyInput');
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

// Init
async function init() {
  const { apiKey } = await chrome.storage.local.get('apiKey');

  if (apiKey) {
    keyDot.classList.add('set');
    keyStatusEl.textContent = 'API key set';
    apiKeyInput.value = apiKey;
  }

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    pageTitleEl.textContent = tab.title || tab.url;
  }
}

// Settings toggle
settingsToggle.addEventListener('click', () => {
  const isApiVisible = apiPanel.classList.contains('active');
  apiPanel.classList.toggle('active', !isApiVisible);
  mainPanel.classList.toggle('active', isApiVisible);
  settingsToggle.textContent = isApiVisible ? '⚙' : '✕';
});

// Save API key
saveApiKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('sk-ant-')) {
    showStatus('error', '❌ Invalid key format. Should start with sk-ant-');
    return;
  }
  await chrome.storage.local.set({ apiKey: key });
  keyDot.classList.add('set');
  keyStatusEl.textContent = 'API key set';

  // Switch back to main panel
  apiPanel.classList.remove('active');
  mainPanel.classList.add('active');
  settingsToggle.textContent = '⚙';
  showStatus('success', '✓ API key saved successfully');
});

// Export format selection
document.querySelectorAll('.export-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.export-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedFormat = opt.dataset.format;
  });
});

// Scan button
scanBtn.addEventListener('click', async () => {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) {
    showStatus('error', '❌ Please set your Anthropic API key first (⚙ settings)');
    return;
  }

  scanBtn.disabled = true;
  scanBtnText.textContent = 'Scanning...';
  resultsSection.classList.remove('visible');
  exportSection.classList.remove('visible');
  kanjiData = [];

  showStatus('loading', 'Extracting Japanese text from page...');

  // Get page content via content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let extracted;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractFromPage
    });
    extracted = results[0].result;
  } catch (err) {
    showStatus('error', '❌ Cannot access this page. Try a regular webpage.');
    scanBtn.disabled = false;
    scanBtnText.textContent = 'Scan Page for Kanji';
    return;
  }

  if (!extracted || extracted.uniqueKanji.length === 0) {
    showStatus('error', '❌ No kanji found on this page.');
    scanBtn.disabled = false;
    scanBtnText.textContent = 'Scan Page for Kanji';
    return;
  }

  pageData = extracted;
  const uniqueKanji = extracted.uniqueKanji.slice(0, 50); // Limit to 50 per scan

  showStatus('loading', `Found ${uniqueKanji.length} unique kanji. Asking Claude for readings...`);

  // Show table with loading state
  resultsSection.classList.add('visible');
  kanjiCount.textContent = `${uniqueKanji.length} kanji`;
  kanjiTableBody.innerHTML = `<tr class="loading-row"><td colspan="3">⏳ Claude is generating readings...</td></tr>`;

  // Call Claude API
  try {
    kanjiData = await lookupKanjiWithClaude(apiKey, uniqueKanji, extracted.sampleText);
    renderTable(kanjiData);
    exportSection.classList.add('visible');
    showStatus('success', `✓ ${kanjiData.length} kanji processed successfully!`);
  } catch (err) {
    showStatus('error', `❌ Claude API error: ${err.message}`);
    kanjiTableBody.innerHTML = `<tr class="loading-row"><td colspan="3">Error loading data</td></tr>`;
  }

  scanBtn.disabled = false;
  scanBtnText.textContent = 'Scan Again';
});

// Extract function injected into page
function extractFromPage() {
  const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/g;
  const japaneseRegex = /[\u3000-\u9fff\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (node.textContent.trim().length === 0) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let text = '';
  let node;
  while ((node = walker.nextNode())) text += node.textContent + ' ';

  const allKanji = text.match(kanjiRegex) || [];
  const uniqueKanji = [...new Set(allKanji)];
  const sentences = text.split(/[\n。！？]/).filter(s => japaneseRegex.test(s));

  return {
    pageTitle: document.title,
    pageUrl: window.location.href,
    uniqueKanji,
    kanjiCount: uniqueKanji.length,
    sampleText: sentences.slice(0, 8).join('。').substring(0, 1500)
  };
}

// Call Claude API to get readings and translations
async function lookupKanjiWithClaude(apiKey, kanjiList, context) {
  const prompt = `You are a Japanese language expert. For each kanji in the list below, provide:
1. The most common reading in hiragana (on'yomi or kun'yomi, whichever is most useful for a learner)
2. The most common English meaning/translation (concise, 1-4 words)

Context from the page these kanji appeared on (use this to pick the most relevant reading):
"${context.substring(0, 500)}"

Kanji list: ${kanjiList.join(', ')}

Respond ONLY with a valid JSON array, no markdown, no explanation. Format:
[{"kanji":"字","hiragana":"じ","english":"character/letter"},...]

Rules:
- One object per kanji
- Keep english translations brief (1-4 words)
- Use the most common/useful reading for learners
- If a character is not actually a kanji (e.g. punctuation), skip it`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text.trim();

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// Render results table
function renderTable(data) {
  kanjiTableBody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-kanji">${row.kanji}</td>
      <td class="td-hira">${row.hiragana}</td>
      <td class="td-eng">${row.english}</td>
    `;
    kanjiTableBody.appendChild(tr);
  });
}

// Status display
function showStatus(type, message) {
  statusEl.className = 'status visible ' + type;
  statusText.textContent = message;
  statusSpinner.style.display = type === 'loading' ? 'block' : 'none';
}

// Export
exportBtn.addEventListener('click', () => {
  if (!kanjiData.length) return;

  let content, filename, mimeType;

  if (selectedFormat === 'anki') {
    // Anki CSV: front, back (tab-separated is also supported but comma is safer for import)
    const rows = kanjiData.map(r =>
      `"${r.kanji}","${r.hiragana} - ${r.english}"`
    );
    content = rows.join('\n');
    filename = 'kanji_anki.csv';
    mimeType = 'text/csv';
  } else if (selectedFormat === 'quizlet') {
    // Quizlet: term[tab]definition, each pair on new line
    const rows = kanjiData.map(r =>
      `${r.kanji}\t${r.hiragana} (${r.english})`
    );
    content = rows.join('\n');
    filename = 'kanji_quizlet.txt';
    mimeType = 'text/plain';
  } else {
    // Raw CSV with headers
    const header = 'Kanji,Hiragana,English';
    const rows = kanjiData.map(r =>
      `"${r.kanji}","${r.hiragana}","${r.english}"`
    );
    content = [header, ...rows].join('\n');
    filename = 'kanji_flashcards.csv';
    mimeType = 'text/csv';
  }

  // Add BOM for proper UTF-8 encoding (important for Japanese characters)
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: mimeType + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  showStatus('success', `✓ Exported ${kanjiData.length} flashcards as ${filename}`);
});

// Start
init();
