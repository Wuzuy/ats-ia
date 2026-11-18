/* Integração com Gemini e endpoints OpenAI-compatíveis. */

const SYSTEM_PROMPT = `Você é um especialista sênior em recrutamento, ATS (Applicant Tracking Systems) e currículos.

Sua prioridade é dupla: preservar o design original do currículo e preservar a verdade dos fatos.

MODO DE EDIÇÃO DO HTML
1. Você recebe o conteúdo interno do <body> do currículo-base. Ele é a fonte da verdade e também o design que deve ser mantido.
2. Altere SOMENTE texto dentro dos elementos existentes. NÃO altere:
   - tags, classes, ids, atributos, ordem dos elementos ou estrutura;
   - imagens, ícones ou placeholders __ATS_ASSET_n__.
3. Não adicione nem remova elementos. Se precisar de espaço, encurte o texto existente. Preserve tags internas como <b>, <strong>, <em> e <span>, alterando apenas o texto dentro delas.
4. Não altere nome, e-mail, telefone, LinkedIn, GitHub, empresas, instituições, datas, cursos ou certificações. Só faça isso se o candidato confirmar explicitamente nas respostas.
5. Pode reescrever resumo, objetivo, bullets, descrições de projetos e linhas de competências para destacar o que a vaga pede — desde que o fato já exista.
6. Corrija erros óbvios de português ou digitação no texto (ex.: “Fundção” → “Fundação”), sem alterar nomes próprios, instituições, datas ou fatos.
7. Não invente tecnologias, experiências, métricas, cursos ou resultados. Se a vaga pede algo ausente, registre em "keywordsMissing" e "gaps".
8. Mantenha o currículo em UMA página A4 e não aumente o volume total de texto: reescreva, encurte e reorganize, mas não acrescente frases novas. O layout é fixo e pode cortar o excesso.
9. Preserve exatamente os placeholders de imagens (ex.: __ATS_ASSET_0__) no mesmo lugar.
10. Retorne APENAS o conteúdo interno do <body>, sem <!DOCTYPE>, <html>, <head>, <style> ou <body>. O app reinsere o conteúdo no documento original.

PERGUNTAS ANTES DE GERAR
- Se houver dúvida material que mudaria o currículo e a resposta não estiver no HTML/PDF, retorne status "questions" e NÃO edite o HTML.
- Pergunte no máximo 4 pontos. Bons exemplos:
  - a vaga exige inglês avançado, mas o currículo diz intermediário;
  - a vaga exige uma ferramenta que não aparece, mas o candidato pode ter usado em projeto/curso;
  - disponibilidade para presencial, horário ou início;
  - se um projeto foi profissional, acadêmico ou voluntário.
- Não pergunte o que já está no currículo e não pergunte sobre estilo/design.
- Use type "choice" com até 4 options quando a resposta for objetiva; use "text" quando precisar de detalhe.
- Se não houver dúvida material, retorne status "done" e gere o resultado.
- Quando receber respostas do candidato, NÃO pergunte novamente. Gere o resultado final.

CARTA DE APRESENTAÇÃO
- Escreva em português do Brasil, 3 a 4 parágrafos, 180 a 260 palavras.
- Conecte fatos reais do currículo aos requisitos da vaga.
- Inclua saudação e fechamento. Não invente fatos, empresas, métricas ou experiências.
- Não repita o currículo inteiro; mostre motivação e encaixe.

ANÁLISE E REVISÃO
- score: 0 a 100, aderência honesta.
- keywordsCovered: palavras-chave da vaga realmente cobertas.
- keywordsMissing: palavras-chave relevantes ausentes.
- changes: 3 a 6 mudanças objetivas.
- gaps: lacunas reais.
- selfReview: 3 a 5 verificações que você fez (contatos preservados, sem invenção, uma página, palavras-chave, coesão).

FORMATO
Responda SOMENTE com JSON válido, sem markdown, neste formato:
{
  "status": "done",
  "questions": [
    { "id": "q1", "question": "", "why": "", "type": "choice", "options": [""] }
  ],
  "analysis": {
    "score": 0,
    "jobTitle": "",
    "company": "",
    "keywordsCovered": [""],
    "keywordsMissing": [""],
    "changes": [""],
    "gaps": [""]
  },
  "html": "<conteúdo interno do body, sem html/head/style>",
  "coverLetter": "",
  "selfReview": [""]
}`;

function cleanPdfText(text) {
    return String(text || 'Não enviado.').slice(0, 9000);
}

function buildUserPrompt({ html, pdfText, job, url, answers, forceDone }) {
    const answerBlock =
        answers && Object.keys(answers).length
            ? Object.entries(answers)
                  .filter(([, value]) => String(value || '').trim())
                  .map(([question, answer]) => `- ${question}: ${answer}`)
                  .join('\n')
            : 'Nenhuma resposta fornecida.';

    return `CURRÍCULO-BASE (conteúdo interno do <body>, design e fatos):
<curriculo_body>
${String(html || '').slice(0, 60000)}
</curriculo_body>

TEXTO EXTRAÍDO DO PDF (apoio; pode estar incompleto):
<curriculo_pdf>
${cleanPdfText(pdfText)}
</curriculo_pdf>

VAGA ALVO:
<vaga>
${String(job || '').slice(0, 24000)}
</vaga>

URL DA VAGA: ${url || 'não informada'}

RESPOSTAS DO CANDIDATO:
<respostas>
${answerBlock}
</respostas>

${forceDone ? 'O candidato já respondeu. Retorne status "done", não faça novas perguntas e preserve o design.' : ''}

Adapte o currículo mantendo o design e a estrutura. Retorne apenas o JSON do formato definido.`;
}

function extractJson(text) {
    if (!text) throw new Error('A IA não retornou conteúdo.');
    let value = String(text).trim();

    const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) value = fenced[1].trim();

    if (!value.startsWith('{')) {
        const start = value.indexOf('{');
        const end = value.lastIndexOf('}');
        if (start >= 0 && end > start) value = value.slice(start, end + 1);
    }

    try {
        return JSON.parse(value);
    } catch {
        throw new Error('A IA retornou um JSON inválido. Tente gerar novamente.');
    }
}

function normalizeBaseUrl(base) {
    const clean = String(base || '').trim().replace(/\/+$/, '');
    if (!clean) throw new Error('Informe a Base URL do provedor.');
    if (/\/chat\/completions$/i.test(clean)) return clean;
    return `${clean}/chat/completions`;
}

function friendlyHttpError(status, detail) {
    const short = String(detail || '').replace(/\s+/g, ' ').slice(0, 220);
    if (status === 400) return `Requisição recusada pelo provedor. Confira o modelo escolhido. ${short}`;
    if (status === 401 || status === 403) {
        return `Chave inválida ou sem permissão (HTTP ${status}). Confira a chave nas configurações.`;
    }
    if (status === 402) return 'Créditos insuficientes no provedor escolhido.';
    if (status === 404) return 'Modelo ou endpoint não encontrado. Confira o nome do modelo e a Base URL.';
    if (status === 429) return 'Limite de uso atingido. Aguarde alguns minutos ou troque de modelo.';
    if (status >= 500) return `O provedor está instável (HTTP ${status}). Tente novamente.`;
    return `Erro do provedor (HTTP ${status}). ${short}`;
}

async function requestJson(url, options, timeoutMs = 180000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const raw = await response.text();
        if (!response.ok) {
            let detail = raw;
            try {
                const parsed = JSON.parse(raw);
                detail = parsed.error?.message || parsed.message || raw;
            } catch {
                /* texto puro */
            }
            throw new Error(friendlyHttpError(response.status, detail));
        }
        return raw;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('A requisição demorou demais. Tente novamente ou escolha um modelo mais rápido.');
        }
        if (error instanceof TypeError) {
            throw new Error(
                'Não foi possível conectar ao provedor. Pode ser bloqueio de CORS, rede ou Base URL incorreta.'
            );
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

async function callGemini({ settings, prompt, system, maxTokens = 16384 }) {
    const key = String(settings.geminiKey || '').trim();
    if (!key) throw new Error('Informe sua API key do Gemini.');
    const model = settings.geminiModel || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
    )}:generateContent?key=${encodeURIComponent(key)}`;

    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json',
        },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    const raw = await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const data = JSON.parse(raw);
    const blockReason = data.promptFeedback?.blockReason;
    if (blockReason) throw new Error(`O conteúdo foi bloqueado pelo Gemini (${blockReason}).`);

    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts || []).map((part) => part.text || '').join('');
    if (!text) {
        const finish = candidate?.finishReason;
        throw new Error(
            finish === 'MAX_TOKENS'
                ? 'A resposta ficou longa demais. Tente novamente com uma vaga mais curta.'
                : 'O Gemini não retornou texto. Tente novamente.'
        );
    }
    return text;
}

async function callOpenAiCompatible({ settings, prompt, system, maxTokens = 8192 }) {
    const endpoint = normalizeBaseUrl(settings.openaiBase);
    const key = String(settings.openaiKey || '').trim();
    const model = String(settings.openaiModel || '').trim();
    if (!model) throw new Error('Informe o nome do modelo no provedor compatível.');

    const headers = { 'Content-Type': 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;

    const payload = {
        model,
        messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
    };

    let raw;
    try {
        raw = await requestJson(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
    } catch (error) {
        if (!/HTTP 400|Requisição recusada/i.test(error.message)) throw error;
        delete payload.response_format;
        raw = await requestJson(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
    }

    const data = JSON.parse(raw);
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('O provedor não retornou texto. Confira o modelo escolhido.');
    return text;
}

export async function generateWithAI({ html, pdfText, job, url, answers, forceDone, settings }) {
    if (!settings?.provider) throw new Error('Configure um provedor de IA.');
    const prompt = buildUserPrompt({ html, pdfText, job, url, answers, forceDone });
    const payload = { settings, prompt, system: SYSTEM_PROMPT };

    const text =
        settings.provider === 'gemini'
            ? await callGemini(payload)
            : await callOpenAiCompatible(payload);

    return extractJson(text);
}

export async function testProvider(settings) {
    if (!settings?.provider) throw new Error('Escolha um provedor.');

    if (settings.provider === 'gemini') {
        await callGemini({
            settings,
            prompt: 'Responda apenas: {"ok":true}',
            system: 'Responda somente JSON.',
            maxTokens: 20,
        });
        return settings.geminiModel || 'gemini-2.5-flash';
    }

    await callOpenAiCompatible({
        settings,
        prompt: 'Responda apenas: {"ok":true}',
        system: 'Responda somente JSON.',
        maxTokens: 20,
    });
    return settings.openaiModel || 'modelo compatível';
}

export function providerLabel(settings) {
    if (!settings) return 'Configure sua chave para começar.';
    if (settings.provider === 'gemini') {
        if (!settings.geminiKey) return 'Configure sua chave do Gemini para começar.';
        return `Google Gemini · ${settings.geminiModel || 'gemini-2.5-flash'}`;
    }
    if (!settings.openaiBase || !settings.openaiModel) {
        return 'Configure a Base URL e o modelo compatível.';
    }
    return `OpenAI-compatível · ${settings.openaiModel}`;
}
