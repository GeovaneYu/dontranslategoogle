// content.js - Intercepta páginas translate.goog e redireciona para original
// Baseado na documentação oficial Google: Ad Networks & Translation Search Features
// Executa em document_start para ser o mais rápido possível

(() => {
  "use strict";

  // Flag para evitar loop
  const REDIRECT_FLAG = "__dontranslate_redirecting";

  function decodeHostname(proxyUrl) {
    const parsedProxyUrl = new URL(proxyUrl);
    const fullHost = parsedProxyUrl.hostname;

    // 1. Extract domain prefix by removing ".translate.goog" suffix
    // A doc usa indexOf('.'), mas usamos replace para ser robusto
    let domainPrefix;
    const suffix = ".translate.goog";
    if (fullHost.endsWith(suffix)) {
      domainPrefix = fullHost.slice(0, -suffix.length);
    } else {
      // Fallback para URLs da tabela de testes sem sufixo
      const dotIdx = fullHost.indexOf(".");
      domainPrefix = dotIdx !== -1 ? fullHost.substring(0, dotIdx) : fullHost;
      if (fullHost === domainPrefix && !fullHost.includes(suffix)) {
        domainPrefix = fullHost;
      }
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

    if (isIdn) {
      decodedSegment = "xn--" + decodedSegment;
    }

    return decodedSegment;
  }

  function reconstructOriginalUrl(proxyUrl) {
    const parsed = new URL(proxyUrl);
    const decodedHostname = decodeHostname(proxyUrl);
    // Se falhou, retorna null
    if (!decodedHostname || decodedHostname === parsed.hostname) {
      // ainda pode ser diferente por causa do sufixo, então verifica se contém translate.goog
      if (!parsed.hostname.endsWith(".translate.goog")) return null;
    }
    parsed.hostname = decodedHostname;

    // Remove todos _x_tr_* params (inclui _x_tr_sl, _x_tr_tl, _x_tr_hl, _x_tr_pto, _x_tr_enc, _x_tr_hp, _x_tr_sch, etc.)
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith("_x_tr_")) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  }

  function shouldRedirect() {
    // Verifica se está em translate.goog
    if (!location.hostname.endsWith(".translate.goog")) return false;
    // Evita loop se já redirecionou
    if (sessionStorage.getItem(REDIRECT_FLAG)) return false;
    // Verifica opção do usuário
    return true;
  }

  async function tryRedirect() {
    // Checa storage se estiver desabilitado
    try {
      const result = await chrome.storage.sync.get({ enabled: true });
      if (result.enabled === false) {
        console.log("[DonTranslateGoogle] Desabilitado pelo usuário, não vai redirecionar");
        return;
      }
    } catch (e) {
      // se storage falhar, continua
    }

    if (!shouldRedirect()) return;

    try {
      const originalUrl = reconstructOriginalUrl(location.href);
      if (!originalUrl) return;
      if (originalUrl === location.href) return;
      // Valida que não é ainda translate.goog
      const originalHost = new URL(originalUrl).hostname;
      if (originalHost.endsWith(".translate.goog")) return;

      console.log("[DonTranslateGoogle] Redirecionando:", location.href, "->", originalUrl);

      // Marca flag para evitar loop em caso de voltar
      try { sessionStorage.setItem(REDIRECT_FLAG, "1"); } catch {}
      // Usa replace para não poluir histórico
      location.replace(originalUrl);
      // Fallback se replace não funcionar imediatamente (ex: CSP)
      setTimeout(() => {
        if (location.hostname.endsWith(".translate.goog")) {
          window.location.href = originalUrl;
        }
      }, 100);
    } catch (err) {
      console.error("[DonTranslateGoogle] Erro ao decodificar URL", err);
    }
  }

  // Tenta redirecionar imediatamente (document_start)
  tryRedirect();

  // Também observa mudanças de URL em SPAs do translate.goog (alguns usam history.pushState)
  let lastHref = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      // limpa flag quando navega para nova URL
      try { sessionStorage.removeItem(REDIRECT_FLAG); } catch {}
      tryRedirect();
    }
  });
  // Começa a observar após DOM disponível
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  // Escuta mensagens do popup/background para toggle
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.enabled) {
        console.log("[DonTranslateGoogle] enabled mudou para", changes.enabled.newValue);
      }
    });
  } catch {}

  // Expor para debug
  window.__dontranslate = { decodeHostname, reconstructOriginalUrl };
})();
