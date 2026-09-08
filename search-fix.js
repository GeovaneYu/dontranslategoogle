// search-fix.js - Reescreve links de resultados do Google que apontam para translate.goog
// Isso evita até de entrar no proxy; já corrige no momento do clique.
// Roda em google.com/search e google.com.br/search

(() => {
  "use strict";

  function decodeHostname(proxyUrl) {
    const parsedProxyUrl = new URL(proxyUrl);
    const fullHost = parsedProxyUrl.hostname;
    const suffix = ".translate.goog";
    let domainPrefix;
    if (fullHost.endsWith(suffix)) {
      domainPrefix = fullHost.slice(0, -suffix.length);
    } else {
      const dotIdx = fullHost.indexOf(".");
      domainPrefix = dotIdx !== -1 ? fullHost.substring(0, dotIdx) : fullHost;
      if (fullHost === domainPrefix && !fullHost.includes(suffix)) domainPrefix = fullHost;
    }
    const encodingList = parsedProxyUrl.searchParams.has("_x_tr_enc")
      ? parsedProxyUrl.searchParams.get("_x_tr_enc").split(",")
      : [];
    if (parsedProxyUrl.searchParams.has("_x_tr_hp")) {
      domainPrefix = parsedProxyUrl.searchParams.get("_x_tr_hp") + domainPrefix;
    }
    if (encodingList.includes("1") && domainPrefix.startsWith("1-")) {
      domainPrefix = domainPrefix.substring(2);
    }
    let isIdn = false;
    if (encodingList.includes("0") && domainPrefix.startsWith("0-")) {
      isIdn = true;
      domainPrefix = domainPrefix.substring(2);
    }
    let decodedSegment = domainPrefix.replaceAll(/\b-\b/g, ".").replaceAll("--", "-");
    if (isIdn) decodedSegment = "xn--" + decodedSegment;
    return decodedSegment;
  }

  function reconstructOriginalUrl(proxyUrl) {
    try {
      const parsed = new URL(proxyUrl);
      if (!parsed.hostname.endsWith(".translate.goog")) return null;
      const decodedHostname = decodeHostname(proxyUrl);
      parsed.hostname = decodedHostname;
      for (const key of [...parsed.searchParams.keys()]) {
        if (key.startsWith("_x_tr_")) parsed.searchParams.delete(key);
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  function isTranslateUrl(url) {
    try {
      return new URL(url, location.origin).hostname.endsWith(".translate.goog");
    } catch {
      return false;
    }
  }

  // Checa se extensão está habilitada
  let enabled = true;
  try {
    chrome.storage.sync.get({ enabled: true }, (res) => { enabled = res.enabled; });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) enabled = changes.enabled.newValue;
    });
  } catch {}

  function fixLink(a) {
    if (!enabled) return;
    if (!a || !a.href) return;
    // Evita reprocessar
    if (a.dataset.dontranslateFixed) return;
    if (!isTranslateUrl(a.href)) return;

    const original = reconstructOriginalUrl(a.href);
    if (!original || original === a.href) return;

    // Guarda original para debug e marca
    a.dataset.originalTranslateHref = a.href;
    a.dataset.dontranslateFixed = "1";
    a.href = original;

    // Também corrige possíveis atributos de tracking do Google (jsaction, data-jsarwt, ping)
    // O Google às vezes reescreve o href no mousedown, então interceptamos eventos
    console.log("[DonTranslateGoogle] Link corrigido no Search:", a.dataset.originalTranslateHref, "->", original);
  }

  function scanAllLinks() {
    if (!enabled) return;
    document.querySelectorAll('a[href*="translate.goog"]').forEach(fixLink);
  }

  // Intercepta clique para pegar casos onde Google reescreve href dinamicamente
  document.addEventListener("mousedown", (e) => {
    const a = e.target.closest("a");
    if (a) fixLink(a);
  }, true);

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a && isTranslateUrl(a.href)) {
      fixLink(a);
      // Se ainda for translate.goog, faz redirect manual para evitar flash
      if (isTranslateUrl(a.href)) {
        const original = reconstructOriginalUrl(a.href);
        if (original) {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = original;
        }
      }
    }
  }, true);

  // Observa DOM para links injetados via JS (Google usa render dinâmico)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          if (node.tagName === "A") fixLink(node);
          else if (node.querySelectorAll) {
            node.querySelectorAll('a[href*="translate.goog"]').forEach(fixLink);
          }
        }
      }
      // Também checa mudança de href em nós existentes
      if (m.type === "attributes" && m.attributeName === "href" && m.target.tagName === "A") {
        fixLink(m.target);
      }
    }
  });

  function startObserver() {
    scanAllLinks();
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }

  // Também escaneia periodicamente (fallback para lazy-load)
  setInterval(scanAllLinks, 1000);

  // Feedback visual opcional: adiciona tooltip nos links corrigidos
  // Pode ser removido se preferir invisível
})();
