// background.js — service worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'scanSelection',
    title: '🔍 Scan selection for kanji',
    contexts: ['selection']
  });
});

// Capture selected text before popup steals focus
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'scanSelection' && info.selectionText) {
    chrome.storage.session.set({ pendingSelection: info.selectionText }, () => {
      chrome.action.openPopup();
    });
  }
});
