# 漢字 Kanji Flashcard Exporter — Chrome Extension

A Chrome extension that extracts kanji from any Japanese webpage and exports Anki-ready flashcard CSV files using Claude AI.

---

## Features

- 🔍 **Scan any webpage** for kanji automatically
- 🤖 **Claude AI** generates hiragana readings + English translations
- 🃏 **Export to Anki CSV** (import-ready), Quizlet, or raw CSV
- 🔐 **API key stored locally** — never sent anywhere except Anthropic
- ⚡ Processes up to 50 unique kanji per scan

---

## Installation (Developer Mode)

Since this is a local extension (not on the Chrome Web Store), load it manually:

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select this folder (`kanji-extension/`)
5. The 漢字 icon will appear in your Chrome toolbar

---

## Setup

1. Click the extension icon in your toolbar
2. Click **⚙** (settings) in the top right
3. Paste your Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))
   - Key format: `sk-ant-api03-...`
4. Click **Save Key**

---

## Usage

1. Navigate to any Japanese webpage (JLPT lists, NHK Web Easy, news sites, etc.)
2. Click the 漢字 extension icon
3. Click **"Scan Page for Kanji"**
4. Wait for Claude to generate readings (~5–15 seconds)
5. Review the kanji table (漢字 | Hiragana | English)
6. Choose export format and click **Export Flashcards**

---

## Export Formats

| Format | Use With | Notes |
|--------|----------|-------|
| **Anki CSV** | Anki (File → Import) | Front = kanji, Back = hiragana + English |
| **Quizlet** | Quizlet import | Tab-separated, paste directly |
| **Raw CSV** | Excel, Google Sheets | Includes headers, all 3 columns |

### Importing into Anki

1. Open Anki → File → Import
2. Select the exported `.csv` file
3. Set field separator to **Comma**
4. Map Field 1 → Front, Field 2 → Back
5. Click Import

---

## Good Pages to Try

- [NHK Web Easy](https://www3.nhk.or.jp/news/easy/) — News in simple Japanese
- [JLPT Sensei](https://jlptsensei.com/) — Kanji lists by level
- [Wanikani](https://www.wanikani.com/) — (if you have an account)
- Any Wikipedia article in Japanese

---

## Privacy

- Your API key is stored only in Chrome's local storage (`chrome.storage.local`)
- It is sent **only** to `api.anthropic.com` when you click Scan
- No data is sent to any other server
- Page content is processed locally; only kanji characters + brief context are sent to Claude

---

## Limitations

- Scans up to **50 unique kanji** per page (to manage API costs)
- Cannot scan `chrome://` pages or the Chrome Web Store
- Requires a paid Anthropic API account
- Japanese text must be in the page's HTML (not embedded in images)

---

## Cost Estimate

Using `claude-sonnet-4-20250514`, a typical scan of 50 kanji costs approximately **$0.001–0.003** (less than half a cent). You can scan hundreds of pages for a few cents.

---

## File Structure

```
kanji-extension/
├── manifest.json      # Extension config (Manifest V3)
├── popup.html         # Extension popup UI
├── popup.js           # Main logic: scan, API call, export
├── content.js         # Injected into pages to extract text
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Extending This

Ideas for future improvements:
- [ ] Add stroke order diagrams (via external API)
- [ ] Save scan history per domain
- [ ] JLPT level tagging for each kanji
- [ ] Support for full vocabulary (not just individual kanji)
- [ ] Batch export across multiple tabs
- [ ] Audio pronunciation (text-to-speech)
