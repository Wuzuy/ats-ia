# ATS.IA

Gerador de currículo adaptado para ATS, 100% no navegador.

Envie o HTML e o PDF do currículo, cole a vaga e receba:

- currículo reescrito sem inventar experiências;
- prévia A4 em uma página;
- PDF com texto selecionável (bom para ATS);
- relatório com aderência, palavras-chave cobertas e lacunas reais.

Site: <https://wuzuy.github.io/ats-ia/>

## Como usar

1. Abra o site.
2. Clique em **Configurar IA** e cole sua API key do Google Gemini.
3. Envie o HTML e, se quiser, o PDF do currículo-base.
4. Cole o link da vaga e clique em **Buscar** (ou cole a descrição).
5. Clique em **Gerar currículo ATS**.
6. Baixe o PDF ou o HTML.

A chave fica apenas no `localStorage` do navegador. Não existe backend recebendo chave, currículo ou vaga.

## Provedores

### Google Gemini

Chamada direta do navegador para a API do Google (CORS liberado).

- Modelo padrão: `gemini-2.5-flash`
- Chave gratuita: <https://aistudio.google.com/apikey>

### OpenAI-compatível / OpenCode Zen

A API do OpenCode Zen não responde CORS para o navegador. Para usar a chave do
OpenCode, publique o proxy incluso em `proxy/worker.js` em um Cloudflare Worker.

```bash
cd proxy
npx wrangler login
npx wrangler secret put OPENCODE_API_KEY
npx wrangler secret put APP_TOKEN
npx wrangler deploy
```

No site, selecione **OpenAI-compatível**:

| Campo | Valor |
| --- | --- |
| Base URL | `https://seu-worker.workers.dev` |
| API key | o valor de `APP_TOKEN` |
| Modelo | `deepseek-v4.1-flash-free` |

O site chama `POST {base}/chat/completions`. O Worker troca seu token pela
chave real do OpenCode, que fica como secret no Cloudflare.

## Rodar localmente

```bash
python -m http.server 8080
```

Abra <http://localhost:8080>.

## Estrutura

```text
index.html          interface
css/style.css       visual
js/app.js           estado, eventos e downloads
js/ai.js            prompts e chamadas aos provedores
js/pdf.js           geração do PDF A4 com pdfmake
js/resume.js        normalização, prévia HTML e demo
proxy/worker.js     proxy opcional para OpenCode Zen
```

## Limites conhecidos

- A leitura automática de links depende do `api.allorigins.win`; alguns sites
  bloqueiam proxy. Nesse caso, cole a descrição da vaga manualmente.
- O PDF é gerado com pdfmake para manter texto extraível. Não é uma captura de
  tela do HTML: o layout é uma versão ATS, com a mesma informação.
- PDFs digitalizados (imagem) não têm texto extraível; envie um PDF de texto ou
  o HTML.
- Uma página é validada automaticamente. Se o conteúdo não couber nem na versão
  compacta, o site avisa para encurtar a base.

## Privacidade

- Nenhum arquivo é enviado para servidores do projeto.
- A chave fica no navegador e vai apenas ao provedor selecionado.
- O HTML, o PDF e a vaga são enviados ao provedor de IA durante a geração.
- Use **Limpar dados** nas configurações para apagar tudo do navegador.
