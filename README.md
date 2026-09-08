# DonTranslateGoogle — Nunca mais sofra com `translate.goog`

Extensão leve para Chrome, Edge, Brave, Opera e Firefox que **impede o Google de te jogar na versão traduzida** quando você clica num resultado em inglês.

> Você busca no Google (em qualquer navegador, qualquer sistema) → clica num link em inglês → o Google abre `https://site-com.translate.goog/?_x_tr_sl=auto&_x_tr_tl=pt...` com a página toda traduzida e quebrada.  
> **Esta extensão detecta e te redireciona instantaneamente para a URL original** (`https://site.com`) sem tradução, sem `_x_tr_*`, preservando path, query e hash.

Baseado **100% na documentação oficial do Google Search Central**: [Ad Networks & Translation Search Features](https://developers.google.com/search/docs/appearance/translated-results) — mesma lógica que o Google recomenda para decodificar o hostname.

---

## ✨ Como funciona

1. **Em `*.translate.goog`** (`content.js` roda em `document_start`):
   - Extrai o prefixo antes de `.translate.goog`
   - Lê `_x_tr_enc` e `_x_tr_hp` e aplica os 9 passos da doc (remove `0-`/`1-`, troca `\b-\b` → `.`, `--` → `-`, adiciona `xn--` se IDN)
   - Reconstrói a URL trocando o hostname e removendo todos `?_x_tr_*`
   - Faz `location.replace(urlOriginal)` (não suja seu histórico)

2. **No Google Search** (`search-fix.js`):
   - Observa todos os `<a href="...translate.goog">` nos resultados
   - Reescreve o `href` para a URL original **antes** de você clicar (intercepta `mousedown` + `MutationObserver`)
   - Você nem chega a ver o flash da página traduzida

3. **Popup com toggle** para ativar/desativar sem desinstalar.

> Sem coleta de dados, sem tracking, sem permissão de `tabs` ou `webRequest`. Só `storage` para guardar o on/off.

---

## 📦 Instalação (2 minutos)

### Opção A — Extensão (recomendado)

**Chrome / Edge / Brave / Opera:**

1. Baixe ou clone esta pasta `dontranslategoogle`
2. Abra `chrome://extensions` (ou `edge://extensions`, `brave://extensions`)
3. Ative **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação** → selecione a pasta `dontranslategoogle`
5. Pronto! Abra `https://example-com.translate.goog` para testar — deve virar `https://example.com`

Para atualizar: clique em **Recarregar** na página de extensões após editar os arquivos.

**Firefox:**

1. Vá em `about:debugging#/runtime/this-firefox` → **Carregar extensão temporária**
2. Selecione `manifest.json` dentro da pasta.  
   > Para permanente, empacote como `.xpi` ou publique na AMO (mesmo manifest V3 funciona no Firefox 109+).

### Opção B — Userscript (Tampermonkey / Violentmonkey)

Se não quiser instalar extensão:

1. Instale [Tampermonkey](https://www.tampermonkey.net/) no seu navegador
2. Crie um novo script e cole o conteúdo de [`dontranslategoogle.user.js`](./dontranslategoogle.user.js)
3. Salve — funciona igual, mas sem popup.

### Opção C — Bookmarklet (sem instalar nada)

Crie um favorito com este código como URL (útil para uso pontual):

```js
javascript:(()=>{function d(u){let p=new URL(u),h=p.hostname,s=".translate.goog",x=h.endsWith(s)?h.slice(0,-s.length):h.substring(0,h.indexOf(".")),e=p.searchParams.has("_x_tr_enc")?p.searchParams.get("_x_tr_enc").split(","):[],r=p.searchParams.get("_x_tr_hp");if(r)x=r+x;if(e.includes("1")&&x.startsWith("1-"))x=x.slice(2);let i=!1;if(e.includes("0")&&x.startsWith("0-")){i=!0;x=x.slice(2)}let o=x.replaceAll(/\b-\b/g,".").replaceAll("--","-");if(i)o="xn--"+o;return o}let u=new URL(location.href);if(!u.hostname.endsWith(".translate.goog"))alert("Não é translate.goog");else{u.hostname=d(location.href);for(let k of[...u.searchParams.keys()])if(k.startsWith("_x_tr_"))u.searchParams.delete(k);location.replace(u.toString())}})();
```

Quando cair numa página traduzida, clique no favorito.

---

## 🧪 Testes (validados com a tabela oficial do Google)

Rode:

```bash
node test.js
```

Todos os 12 casos da documentação passam:

| `proxyUrl` | `decodeHostname` |
|---|---|
| `https://example-com.translate.goog` | `example.com` |
| `https://foo-example-com.translate.goog` | `foo.example.com` |
| `https://foo--example-com.translate.goog` | `foo-example.com` |
| `https://0-57hw060o-com.translate.goog/?_x_tr_enc=0` | `xn--57hw060o.com` |
| `https://1-en--us-example-com.translate.goog/?_x_tr_enc=1` | `en-us.example.com` |
| `https://0-en---w45as309w-com.translate.goog/?_x_tr_enc=0` | `xn--en--w45as309w.com` |
| `https://1-0---16pw588q-com.translate.goog/?_x_tr_enc=0,1` | `xn---16pw588q.com` |
| `https://lanfair...-co-uk.translate.goog/?_x_tr_hp=l` | `llanfair...co.uk` |
| `https://g5h39...-com.translate.goog/?_x_tr_enc=0&_x_tr_hp=0-` | `xn--g5h39...com` |

Veja `utils.js:1` e `test.js:1` para a implementação fiel ao sample da doc.

Também testado o `reconstructOriginalUrl` preservando `path`, `search` (sem `_x_tr_*`) e `hash`.

---

## ⚙️ Arquivos

```
dontranslategoogle/
├─ manifest.json              # Manifest V3
├─ content.js                 # Redireciona translate.goog → original (document_start)
├─ search-fix.js              # Reescreve links no google.com/search
├─ background.js              # Badge ON/OFF + storage
├─ popup.html / popup.js      # Toggle da extensão
├─ utils.js                   # Funções puras decodeHostname / reconstructOriginalUrl
├─ dontranslategoogle.user.js # Userscript standalone
├─ test.js                    # Testes da tabela Google
└─ icons/                     # 16/48/128
```

---

## ❓ Por que o Google faz isso?

O Google Search oferece “Translated Results” para usuários que não falam inglês: ele busca a página no publisher, reescreve a URL para `*.translate.goog` e traduz após o clique. Ótimo para quem quer, péssimo quando é forçado. Não há botão “desativar” global — por isso a extensão.

Dica extra sem extensão: em `google.com/preferences` desmarque traduções, ou use `google.com/ncr` e `?hl=en`, mas o proxy ainda aparece em muitos casos. A extensão é a única garantia 100% cliente-side.

---

## 🔒 Privacidade

- Não envia dados para lugar nenhum
- Não injeta ads, não lê histórico
- Código aberto, auditável — só 150 linhas de JS

## 📄 Licença

MIT — use, fork, publique onde quiser.

---

Feito para acabar com o sofrimento de todo clique virar `translate.goog` 🙏
