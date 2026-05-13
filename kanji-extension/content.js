// content.js - Extracts Japanese text from the current page

function extractJapaneseText() {
  // Get all text nodes from the page
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script, style, noscript tags
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'meta', 'link'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        // Only include nodes with actual content
        if (node.textContent.trim().length === 0) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let text = '';
  let node;
  while ((node = walker.nextNode())) {
    text += node.textContent + ' ';
  }

  // Filter to only keep text containing Japanese characters
  const japaneseRegex = /[\u3000-\u9fff\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/;
  const sentences = text.split(/[\n。！？]/);
  const japaneseSentences = sentences.filter(s => japaneseRegex.test(s));

  // Extract unique kanji
  const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/g;
  const allKanji = text.match(kanjiRegex) || [];
  const uniqueKanji = [...new Set(allKanji)];

  return {
    pageTitle: document.title,
    pageUrl: window.location.href,
    uniqueKanji: uniqueKanji,
    kanjiCount: uniqueKanji.length,
    sampleText: japaneseSentences.slice(0, 10).join('。').substring(0, 2000)
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractKanji') {
    const result = extractJapaneseText();
    sendResponse(result);
  }
  return true;
});
