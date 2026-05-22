// content.js - Extracts Japanese text from the current page (full page fallback)

function extractFromPage() {
  const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf][\u4e00-\u9faf\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]{0,9}/g;
  const japaneseRegex = /[\u3000-\u9fff\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName.toLowerCase();
      if (["script", "style", "noscript"].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let text = "", node;
  while ((node = walker.nextNode())) text += node.textContent + " ";

  const allKanji = text.match(kanjiRegex) || [];
  const uniqueKanji = [...new Set(allKanji)];
  const sentences = text.split(/[\n\u3002\uff01\uff1f]/).filter(s => japaneseRegex.test(s));

  return {
    uniqueKanji,
    sampleText: sentences.slice(0, 8).join("\u3002").substring(0, 1500),
    source: "page"
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractKanji") {
    sendResponse(extractFromPage());
  }
  return true;
});
