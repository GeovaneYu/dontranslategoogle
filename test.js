const { decodeHostname, reconstructOriginalUrl } = require('./utils.js');

const tests = [
  ["https://example-com.translate.goog", "example.com"],
  ["https://foo-example-com.translate.goog", "foo.example.com"],
  ["https://foo--example-com.translate.goog", "foo-example.com"],
  ["https://0-57hw060o-com.translate.goog/?_x_tr_enc=0", "xn--57hw060o.com"],
  ["https://1-en--us-example-com.translate.goog/?_x_tr_enc=1", "en-us.example.com"],
  ["https://0-en---w45as309w-com.translate.goog/?_x_tr_enc=0", "xn--en--w45as309w.com"],
  ["https://1-0---16pw588q-com.translate.goog/?_x_tr_enc=0,1", "xn---16pw588q.com"],
  ["https://lanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch-co-uk.translate.goog/?_x_tr_hp=l", "llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch.co.uk"],
  ["https://lanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch-co-uk.translate.goog/?_x_tr_hp=www-l", "www.llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch.co.uk"],
  // Nota: docs mostram "---aa" mas implementação oficial com replaceAll dá "--aa"
  // Ambas interpretações são equivalentes para domínios reais; mantemos o que o código da doc realmente produz
  ["https://a--aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-com.translate.goog/?_x_tr_hp=a--xn--xn--xn--xn--xn---a", "a-xn-xn-xn-xn-xn--aa-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.com"],
  ["https://g5h3969ntadg44juhyah3c9aza87iiar4i410avdl8d3f1fuq3nz05dg5b-com.translate.goog/?_x_tr_enc=0&_x_tr_hp=0-", "xn--g5h3969ntadg44juhyah3c9aza87iiar4i410avdl8d3f1fuq3nz05dg5b.com"],
  // Caso da tabela sem .translate.goog (bug da documentação no 5º exemplo)
  ["https://1-en--us-example-com/?_x_tr_enc=1", "en-us.example.com"],
];

let ok = 0, fail = 0;
for (const [url, expected] of tests) {
  const got = decodeHostname(url);
  const pass = got === expected;
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${url} => got "${got}" expected "${expected}"`);
  if (pass) ok++; else fail++;
}
console.log(`\nHostname decoding: ${ok}/${tests.length} passaram, ${fail} falharam`);

// Teste reconstruct
console.log("\n--- Teste reconstructOriginalUrl ---");
const reconstructTests = [
  ["https://example-com.translate.goog/foo/bar?_x_tr_sl=en&_x_tr_tl=pt&_x_tr_hl=pt-BR&keep=1#hash", "https://example.com/foo/bar?keep=1#hash"],
  ["https://foo-example-com.translate.goog/search?q=hello&_x_tr_enc=1", "https://foo.example.com/search?q=hello"],
  ["https://0-57hw060o-com.translate.goog/path?_x_tr_enc=0&_x_tr_sl=auto", "https://xn--57hw060o.com/path"],
];

let ok2=0;
for (const [proxy, expected] of reconstructTests) {
  const got = reconstructOriginalUrl(proxy);
  const pass = got === expected;
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: reconstruct(${proxy}) => "${got}" expected "${expected}"`);
  if (pass) ok2++;
}
console.log(`\nReconstruct: ${ok2}/${reconstructTests.length} passaram`);

if (fail===0 && ok2===reconstructTests.length) {
  console.log("\n🎉 TODOS OS TESTES PASSARAM");
} else {
  console.log("\n⚠️ ALGUM TESTE FALHOU - revisar");
  process.exit(1);
}
