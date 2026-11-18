# ATS.IA

Gerador de currículo adaptado para ATS, 100% no navegador.

Envie o HTML e o PDF do currículo, cole a vaga e receba:

- currículo adaptado **mantendo o design original**;
- perguntas de clarificação quando falta um dado importante;
- carta de apresentação editável;
- revisão de contatos, estrutura e paginação;
- PDF A4 com texto selecionável, gerado pela impressão do navegador.

Site: <https://wuzuy.github.io/ats-ia/>

## Como funciona

1. O HTML é sanitizado e o CSS/estrutura viram uma assinatura de design.
2. A IA recebe o HTML com placeholders no lugar de imagens base64.
3. Ela edita **somente texto** e devolve o HTML completo.
4. O app valida CSS, tags, classes, atributos e ordem dos elementos. Se algo
   mudar, a geração é bloqueada.
5. Contatos, nome e uma página A4 são conferidos. Se necessário, o conteúdo é
   reduzido com `zoom` de impressão para caber.
6. A carta é gerada na mesma chamada e pode ser editada antes do PDF.

O PDF preserva o layout e continua com texto selecionável. Como não existe
backend, o botão **Salvar PDF** abre o diálogo de impressão: escolha
**Salvar como PDF** e desative cabeçalhos/rodapés.

## Como usar

1. Abra o site.
2. Clique em **Configurar IA** e cole sua API key do Google Gemini.
3. Envie o HTML e, se quiser, o PDF do currículo-base.
4. Cole o link da vaga e clique em **Buscar** (ou cole a descrição).
5. Clique em **Gerar currículo ATS**.
6. Responda às perguntas, se houver.
7. Revise a prévia, a carta e a análise. Use **Salvar PDF**.

A chave fica apenas no `localStorage` do navegador. Não existe backend
recebendo chave, currículo, carta ou vaga.

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
js/app.js           estado, eventos, carta e impressão
js/ai.js            prompts e chamadas aos provedores
js/html.js          sanitização, validação de design e medição A4
js/demo.js          demonstração com dados fictícios
proxy/worker.js     proxy opcional para OpenCode Zen
```

## Limites conhecidos

- A leitura automática de links usa o Jina Reader e, como fallback, o
  `api.allorigins.win`. Alguns sites bloqueiam proxies; nesse caso, cole a
  descrição da vaga manualmente.
- O PDF é o resultado da impressão do HTML original. O navegador precisa ser
  instruído a salvar como PDF; não há download binário automático sem backend.
- Se o currículo crescer além de uma página, o app avisa e mostra onde o texto
  precisa ser encurtado. A escala final pode ser ajustada no diálogo de
  impressão do navegador.
- PDFs digitalizados (imagem) não têm texto extraível; envie um PDF de texto ou
  o HTML.
- Imagens e fontes externas precisam estar embutidas no HTML (data URI ou
  `<style>`). Arquivos relativos ao HTML original não são enviados junto.
- A validação de design exige que a IA preserve tags, classes e CSS. Se o modelo
  alterar a estrutura, a geração é bloqueada e pode ser tentada novamente.

## Privacidade

- Nenhum arquivo é enviado para servidores do projeto.
- A chave fica no navegador e vai apenas ao provedor selecionado.
- O HTML, o PDF e a vaga são enviados ao provedor de IA durante a geração.
- Ao buscar um link de vaga, a URL passa pelo Jina Reader/allorigins.
- A carta e o PDF são montados localmente.
- Use **Limpar dados** nas configurações para apagar tudo do navegador.
