// background.js - Service Worker (MV3)
// Mantém estado do ícone e lida com mensagens do popup

chrome.runtime.onInstalled.addListener(() => {
  // Default habilitado
  chrome.storage.sync.get({ enabled: true }, (res) => {
    chrome.storage.sync.set({ enabled: res.enabled });
    updateBadge(res.enabled);
  });
  console.log("[DonTranslateGoogle] Extensão instalada");
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) updateBadge(changes.enabled.newValue);
});

function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: "DonTranslateGoogle: ATIVADO (bloqueando traduções)" });
  } else {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#888" });
    chrome.action.setTitle({ title: "DonTranslateGoogle: DESATIVADO" });
  }
}

// Inicializa badge ao iniciar
chrome.storage.sync.get({ enabled: true }, (res) => updateBadge(res.enabled));

// Permite que content.js verifique rapidamente
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getStatus") {
    chrome.storage.sync.get({ enabled: true }, (res) => sendResponse(res));
    return true;
  }
  if (msg.type === "toggle") {
    chrome.storage.sync.get({ enabled: true }, (res) => {
      const next = !res.enabled;
      chrome.storage.sync.set({ enabled: next }, () => sendResponse({ enabled: next }));
    });
    return true;
  }
});
