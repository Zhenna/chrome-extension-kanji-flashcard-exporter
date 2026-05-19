# 漢字 Kanji Flashcard Exporter — Chrome Extension

A Chrome extension that extracts kanji words and compounds from any Japanese webpage, generates hiragana readings and English translations using AI, and exports Anki-ready flashcard files in one click.

---

## Features

- 🔍 **Scan any Japanese webpage** for kanji words and compounds (e.g. 日本語, 食べる, 東京)
- 🤖 **AI-powered** hiragana readings + English translations via Anthropic or OpenAI
- 🔢 **Adjustable scan limit** — default 50 words, up to 200
- 🃏 **Export to Anki CSV**, Quizlet, or raw CSV
- 🔐 **Your API key, your data** — stored locally, sent only to your chosen provider

---

## Installation (Developer Mode)

Since this extension is not yet on the Chrome Web Store, load it manually:

1. Download and unzip this folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `kanji-extension/` folder
6. The 漢字 icon will appear in your Chrome toolbar

---

## Getting an API Key

You need an API key from either Anthropic or OpenAI. Both offer pay-as-you-go pricing — a typical scan costs less than $0.01.

### Option A — Anthropic (Claude)

1. Go to **[console.anthropic.com](https://console.anthropic.com)** and sign in or create an account
2. In the left sidebar, click **API Keys**
3. Click **Create Key**, give it a name (e.g. "kanji extension")
4. Copy the key — it starts with `sk-ant-api03-...`
5. Go to **Billing** → add a credit card and load a small amount (e.g. $5)

> **Note:** Anthropic's Claude Enterprise subscription (claude.ai) is separate from API access. If you have an Enterprise account, check with your IT or Anthropic account manager — your organisation may already have an API account you can get a key from.

---

### Option B — OpenAI (GPT)

1. Go to **[platform.openai.com](https://platform.openai.com)** and sign in or create an account
2. Click your profile icon (top right) → **API keys**
3. Click **Create new secret key**, give it a name
4. Copy the key — it starts with `sk-...`
5. Go to **Settings** → **Billing** → add a credit card and load a small amount (e.g. $5)

> **Note:** A ChatGPT Plus subscription does not include API access — these are billed separately on the platform.openai.com account.

---

## Setup

1. Click the 漢字 icon in your Chrome toolbar
2. Click **⚙** (settings) in the top-right corner
3. Select your provider: **🟠 Anthropic** or **🟢 OpenAI**
4. Paste your API key into the field
5. Click **Save Settings**

---

## Usage

### Option A — Scan a selected passage (recommended)

More precise and token-efficient — scans only the text you highlight.

1. Navigate to any Japanese webpage
2. **Highlight the sentence or paragraph** you want to study
3. **Right-click** the highlighted text
4. Select **"🔍 Scan selection for kanji"** from the context menu
5. The popup opens with a green **"✓ Selection ready"** indicator
6. Adjust **Max words to scan** if needed (default: 50)
7. Click **Scan Page for Kanji**
8. Review the results table (漢字 | Hiragana | English)
9. Choose your export format and click **Export Flashcards**

> **Why right-click?** Clicking the toolbar icon causes the browser to clear your text selection before the extension can read it. The right-click context menu captures the text first, so the selection is preserved correctly.

---

### Option B — Scan the full page

1. Navigate to any Japanese webpage
   - Try [NHK Web Easy](https://www3.nhk.or.jp/news/easy/) for beginner-friendly news
   - Or any JLPT vocab list, Wikipedia in Japanese, manga sites, etc.
2. Click the **漢字 icon** in your Chrome toolbar
3. Adjust **Max words to scan** if needed (default: 50, max: 200)
4. Click **Scan Page for Kanji**
5. Wait ~5–15 seconds for the AI to generate readings
6. Review the results table (漢字 | Hiragana | English)
7. Choose your export format and click **Export Flashcards**

---

## Export Formats

| Format | Use With | Notes |
|--------|----------|-------|
| **Anki CSV** | Anki desktop app | Front = word, Back = hiragana + English |
| **Quizlet** | Quizlet import | Tab-separated, paste directly |
| **Raw CSV** | Excel, Google Sheets | Includes column headers |

### Importing into Anki

1. Open Anki → **File** → **Import**
2. Select the exported `.csv` file
3. Set field separator to **Comma**
4. Map Field 1 → Front, Field 2 → Back
5. Click **Import**

---

## Cost Estimate

| Provider | Model | Cost per 50-word scan |
|----------|-------|-----------------------|
| Anthropic | claude-sonnet-4 | ~$0.001–0.003 |
| OpenAI | gpt-4o-mini | ~$0.001–0.002 |

A month of daily study (one scan per day) costs well under $0.10.

---

## Privacy

- Your API key is stored only in Chrome's local storage (`chrome.storage.local`) on your device
- It is sent **only** to your chosen provider (`api.anthropic.com` or `api.openai.com`) when you scan
- Page content is processed locally — only the extracted kanji words are sent to the AI
- No data is sent to the extension developer or any third party

---

## Good Pages to Try

- [NHK Web Easy](https://www3.nhk.or.jp/news/easy/) — news in simple Japanese
- [JLPT Sensei](https://jlptsensei.com/) — kanji lists by JLPT level
- [Wikipedia 日本語](https://ja.wikipedia.org/) — any topic in Japanese
- Japanese restaurant menus, travel sites, news sites

---

## Limitations

- Cannot scan `chrome://` pages or the Chrome Web Store itself
- Japanese text must be in the page's HTML (not inside images)
- Very long pages: raise the scan limit but expect a slightly longer API response time

---

## File Structure

```
kanji-extension/
├── manifest.json      # Extension config (Manifest V3)
├── popup.html         # Extension popup UI
├── popup.js           # Main logic: scan, API calls, export
├── content.js         # Injected into pages to extract Japanese text
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Changelog

### v1.0.0
- Initial release
- Anthropic (Claude) and OpenAI (GPT) support
- Adjustable scan limit (default 50, max 200)
- Exports: Anki CSV, Quizlet, Raw CSV
- Extracts kanji compounds and words (not just individual characters)
