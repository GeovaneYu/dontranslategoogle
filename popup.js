const toggle = document.getElementById("toggle");
const statusEl = document.getElementById("status");

function render(enabled) {
  toggle.checked = enabled;
  statusEl.className = "status " + (enabled ? "on" : "off");
  statusEl.textContent = enabled
    ? "✅ Ativado — você verá o site original"
    : "⛔ Desativado — traduções do Google permitidas";
}

chrome.storage.sync.get({ enabled: true }, (res) => render(res.enabled));

toggle.addEventListener("change", () => {
  const next = toggle.checked;
  chrome.storage.sync.set({ enabled: next }, () => render(next));
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) render(changes.enabled.newValue);
});
