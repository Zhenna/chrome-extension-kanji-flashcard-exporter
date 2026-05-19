// content.js - Extracts Japanese text from the current page (full page fallback)

function extractFromPage() {
  const kanjiRegex = /[一-龯㐀-䶿][一-龯㐀-䶿぀-ゟ゠-ヿ]*/g;
  const japaneseRegex = /[　-鿿豈-﫿぀-ゟ゠-ヿ]/;

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
  const sentences = text.split(/[
。！？]/).filter(s => japaneseRegex.test(s));

  return {
    uniqueKanji,
    sampleText: sentences.slice(0, 8).join("。").substring(0, 1500),
    source: "page"
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractKanji") {
    sendResponse(extractFromPage());
  }
  return true;
});
