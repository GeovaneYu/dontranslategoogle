// ==UserScript==
// @name         DonTranslateGoogle
// @namespace    https://github.com/geovanegofredo/dontranslategoogle
// @version      1.0.0
// @description  Nunca mais abra versão traduzida do Google. Redireciona automaticamente *.translate.goog para URL original.
// @author       DonTranslateGoogle
// @match        *://*.translate.goog/*
// @match        *://www.google.com/search*
// @match        *://www.google.com.br/search*
// @match        *://*.google.com/search*
// @match        *://*.google.com.br/search*
// @run-at       document-start
// @grant        none
// ==/UserScript==

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
    } catch { return null; }
  }

  // 1) Se estiver em translate.goog, redireciona imediatamente
  if (location.hostname.endsWith(".translate.goog")) {
    const original = reconstructOriginalUrl(location.href);
    if (original && original !== location.href) {
      console.log("[DonTranslateGoogle userscript] Redirecionando para", original);
      location.replace(original);
      return;
    }
  }

  // 2) Se estiver no Google Search, reescreve links
  const isGoogleSearch = /google\.com(\.br)?\/search/.test(location.href);
  if (isGoogleSearch) {
    function isTranslateUrl(url) {
      try { return new URL(url, location.origin).hostname.endsWith(".translate.goog"); } catch { return false; }
    }
    function fixLink(a) {
      if (!a || !a.href || a.dataset.dontranslateFixed) return;
      if (!isTranslateUrl(a.href)) return;
      const original = reconstructOriginalUrl(a.href);
      if (!original) return;
      a.dataset.originalTranslateHref = a.href;
      a.dataset.dontranslateFixed = "1";
      a.href = original;
    }
    function scan() { document.querySelectorAll('a[href*=\"translate.goog\"]').forEach(fixLink); }
    document.addEventListener("mousedown", e => { const a=e.target.closest("a"); if(a) fixLink(a); }, true);
    const obs = new MutationObserver(() => scan());
    if (document.documentElement) obs.observe(document.documentElement, { childList:true, subtree:true });
    setInterval(scan, 1000);
    scan();
  }
})();
