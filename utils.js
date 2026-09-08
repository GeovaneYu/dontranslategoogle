// utils.js - lógica compartilhada de decodificação de URL do Google Translate
// Baseado em: https://developers.google.com/search/docs/appearance/translated-results
// Documentação Ad Networks & Translation Search Features

/**
 * Decodifica o hostname original a partir de uma URL proxy do Google Translate (*.translate.goog)
 * @param {string} proxyUrl - URL completa do proxy (ex: https://example-com.translate.goog/?_x_tr_enc=1)
 * @returns {string} hostname decodificado (ex: example.com)
 */
function decodeHostname(proxyUrl) {
  const parsedProxyUrl = new URL(proxyUrl);
  const fullHost = parsedProxyUrl.hostname;

  // 1. Extract domain prefix by removing ".translate.goog" suffix
  let domainPrefix;
  const idx = fullHost.indexOf('.translate.goog');
  if (idx !== -1) {
    domainPrefix = fullHost.substring(0, idx);
  } else {
    // fallback: pega até primeiro ponto (casos da tabela sem .translate.goog explicito em alguns testes)
    // Ex: https://1-en--us-example-com/?_x_tr_enc=1 -> hostname é 1-en--us-example-com, sem sufixo
    // Mas na prática todas as URLs reais têm .translate.goog. Mantemos compatibilidade com tabela de testes.
    domainPrefix = fullHost.substring(0, fullHost.indexOf('.') !== -1 ? fullHost.indexOf('.') : fullHost.length);
    // se não tem ponto, é o próprio host
    if (!fullHost.includes('.')) domainPrefix = fullHost;
    // para o caso acima "1-en--us-example-com" -> não tem ".translate.goog" mas é o hostname inteiro
    if (fullHost === domainPrefix && !fullHost.includes('.translate.goog')) {
      domainPrefix = fullHost;
    }
  }

  // Corrige: se hostname termina com .translate.goog mas buscamos indexOf('.'), o código da doc usa indexOf('.')
  // Isso quebraria para domínios com prefixo contendo pontos? Na doc eles fazem indexOf('.') direto.
  // Vamos ser fiel à doc para passar nos testes, mas também funcionar para .translate.goog
  // A doc original faz: fullHost.substring(0, fullHost.indexOf('.'))
  // Isso funciona porque o proxy sempre é <encoded>.translate.goog -> primeiro ponto separa.
  // Então refazemos exatamente como a doc para garantir compatibilidade com tabela:
  // Se tem .translate.goog, o primeiro ponto já é o separador, então ambos dão mesmo resultado.
  // Mantemos o valor já extraído.

  // 2. Split _x_tr_enc
  const encodingList = parsedProxyUrl.searchParams.has('_x_tr_enc')
    ? parsedProxyUrl.searchParams.get('_x_tr_enc').split(',')
    : [];

  // 3. Prepend _x_tr_hp if exists
  if (parsedProxyUrl.searchParams.has('_x_tr_hp')) {
    domainPrefix = parsedProxyUrl.searchParams.get('_x_tr_hp') + domainPrefix;
  }

  // 4. Remove '1-' prefix if encodingList contains '1'
  if (encodingList.includes('1') && domainPrefix.startsWith('1-')) {
    domainPrefix = domainPrefix.substring(2);
  }

  // 5. Remove '0-' prefix if encodingList contains '0' and check isIdn
  let isIdn = false;
  if (encodingList.includes('0') && domainPrefix.startsWith('0-')) {
    isIdn = true;
    domainPrefix = domainPrefix.substring(2);
  }

  // 6. Replace /\b-\b/ with '.'
  // 7. Replace '--' with '-'
  let decodedSegment = domainPrefix.replaceAll(/\b-\b/g, '.').replaceAll('--', '-');

  // 8. If isIdn, add punycode prefix
  if (isIdn) {
    decodedSegment = 'xn--' + decodedSegment;
  }

  return decodedSegment;
}

/**
 * Reconstrói a URL original removendo proxy e parâmetros _x_tr_*
 * @param {string} proxyUrl
 * @returns {string} URL original
 */
function reconstructOriginalUrl(proxyUrl) {
  const parsed = new URL(proxyUrl);
  const decodedHostname = decodeHostname(proxyUrl);

  // Substitui hostname
  parsed.hostname = decodedHostname;

  // Remove todos parâmetros _x_tr_*
  const keysToDelete = [];
  for (const key of parsed.searchParams.keys()) {
    if (key.startsWith('_x_tr_')) keysToDelete.push(key);
  }
  for (const k of keysToDelete) parsed.searchParams.delete(k);

  return parsed.toString();
}

// Export para Node e para extensão (global)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { decodeHostname, reconstructOriginalUrl };
}
if (typeof window !== 'undefined') {
  window.decodeHostname = decodeHostname;
  window.reconstructOriginalUrl = reconstructOriginalUrl;
}
