/* ATS.IA — orquestração da interface. */

import {
    prepareBaseHtml,
    restoreAssets,
    extractBodyHtml,
    injectBodyHtml,
    validateDesign,
    reviewContacts,
    extractContactValues,
    ensurePageRule,
    measurePageFit,
    textLength,
    readableText,
    printHtml,
    buildLetterHtml,
    escapeHtml,
} from './html.js';
import { generateWithAI, testProvider, providerLabel } from './ai.js';
import { createDemo } from './demo.js';

const SETTINGS_KEY = 'atsia.settings.v1';
const BASE_KEY = 'atsia.base.v1';

const DEFAULT_SETTINGS = {
    provider: 'gemini',
    geminiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openaiBase: '',
    openaiKey: '',
    openaiModel: 'deepseek-v4.1-flash-free',
};

const state = {
    settings: loadSettings(),
    base: loadBase(),
    prepared: null,
    questions: [],
    result: null,
    identity: { name: '', values: [] },
    printHtml: '',
    fit: { pages: 1, clipped: false, overflowing: false },
    busy: false,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let toastTimer = 0;

/* ---------- Persistência ---------- */

function loadSettings() {
    try {
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        return { ...DEFAULT_SETTINGS, ...stored };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function loadBase() {
    try {
        const stored = JSON.parse(localStorage.getItem(BASE_KEY) || '{}');
        return {
            html: typeof stored.html === 'string' ? stored.html : '',
            htmlName: typeof stored.htmlName === 'string' ? stored.htmlName : '',
            pdfText: typeof stored.pdfText === 'string' ? stored.pdfText : '',
            pdfName: typeof stored.pdfName === 'string' ? stored.pdfName : '',
        };
    } catch {
        return { html: '', htmlName: '', pdfText: '', pdfName: '' };
    }
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch {
        showToast('Não foi possível salvar a configuração neste navegador.', 'error');
    }
}

function saveBase() {
    try {
        localStorage.setItem(
            BASE_KEY,
            JSON.stringify({
                html: state.base.html,
                htmlName: state.base.htmlName,
                pdfText: state.base.pdfText.slice(0, 30000),
                pdfName: state.base.pdfName,
            })
        );
    } catch {
        showToast('O currículo é grande demais para ficar salvo; ele continua carregado nesta sessão.', 'error');
    }
}

/* ---------- Utilidades ---------- */

function showToast(message, type = '') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = `toast show${type ? ` ${type}` : ''}`;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        toast.className = 'toast';
    }, 7000);
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function slugify(value = '') {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
}

function providerReady(settings = state.settings) {
    if (settings.provider === 'gemini') return Boolean(settings.geminiKey);
    return Boolean(settings.openaiBase && settings.openaiModel);
}

/* ---------- Configuração da IA ---------- */

function updateProviderUI() {
    const ready = providerReady();
    $('#key-status').classList.toggle('ready', ready);
    $('#settings-label').textContent = ready ? 'IA configurada' : 'Configurar IA';
    $('#provider-summary').textContent = providerLabel(state.settings);
}

function openSettings() {
    const s = state.settings;
    $('#gemini-key').value = s.geminiKey || '';
    $('#gemini-model').value = s.geminiModel || 'gemini-2.5-flash';
    $('#openai-base').value = s.openaiBase || '';
    $('#openai-key').value = s.openaiKey || '';
    $('#openai-model').value = s.openaiModel || 'deepseek-v4.1-flash-free';
    setProviderTab(s.provider || 'gemini');
    $('#test-result').textContent = '';
    $('#test-result').className = 'test-result';
    const dialog = $('#settings-dialog');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    window.setTimeout(() => $('#gemini-key').focus(), 40);
}

function closeSettings() {
    const dialog = $('#settings-dialog');
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
}

function setProviderTab(provider) {
    $$('#provider-tabs .segmented-btn').forEach((button) => {
        const active = button.dataset.provider === provider;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
    });
    $('#pane-gemini').classList.toggle('hidden', provider !== 'gemini');
    $('#pane-openai').classList.toggle('hidden', provider !== 'openai');
    $('#settings-dialog').dataset.provider = provider;
}

function readSettingsForm() {
    return {
        provider: $('#settings-dialog').dataset.provider || 'gemini',
        geminiKey: $('#gemini-key').value.trim(),
        geminiModel: $('#gemini-model').value.trim(),
        openaiBase: $('#openai-base').value.trim(),
        openaiKey: $('#openai-key').value.trim(),
        openaiModel: $('#openai-model').value.trim(),
    };
}

async function handleTestConnection() {
    const button = $('#settings-test');
    const output = $('#test-result');
    const draft = readSettingsForm();
    button.disabled = true;
    button.textContent = 'Testando...';
    output.className = 'test-result';
    output.textContent = 'Conectando ao provedor...';

    try {
        const model = await testProvider(draft);
        output.className = 'test-result ok';
        output.textContent = `Conexão OK · ${model}`;
    } catch (error) {
        output.className = 'test-result error';
        output.textContent = error.message;
    } finally {
        button.disabled = false;
        button.textContent = 'Testar conexão';
    }
}

function handleSaveSettings() {
    state.settings = readSettingsForm();
    saveSettings();
    updateProviderUI();
    closeSettings();
    showToast('Configuração salva neste navegador.');
}

/* ---------- Arquivos ---------- */

let pdfjsPromise = null;
async function loadPdfJs() {
    if (!pdfjsPromise) {
        pdfjsPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs').then(
            (module) => {
                module.GlobalWorkerOptions.workerSrc =
                    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
                return module;
            }
        );
    }
    return pdfjsPromise;
}

async function extractPdfText(file) {
    const pdfjs = await loadPdfJs();
    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const parts = [];
    for (let page = 1; page <= doc.numPages; page += 1) {
        const content = await doc.getPage(page).then((p) => p.getTextContent());
        const text = content.items
            .map((item) => item.str || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (text) parts.push(text);
    }
    return { text: parts.join('\n\n').slice(0, 30000), pages: doc.numPages };
}

function loadBaseHtml(raw) {
    const prepared = prepareBaseHtml(raw);
    const sanitized = restoreAssets(prepared.html, prepared.assets);
    state.base.html = sanitized;
    state.base.htmlName = state.base.htmlName || 'curriculo.html';
    state.result = null;
    state.questions = [];
    saveBase();
    renderFiles();
}

async function handleFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;

    for (const file of files) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.html') || lower.endsWith('.htm')) {
            const text = await file.text();
            if (!/<(html|body|div|p|h1)/i.test(text)) {
                showToast('Esse arquivo não parece ser um currículo HTML válido.', 'error');
                continue;
            }
            state.base.htmlName = file.name;
            loadBaseHtml(text);
            showToast('HTML carregado. O design será preservado.');
        } else if (lower.endsWith('.pdf')) {
            state.base.pdfName = file.name;
            state.base.pdfText = '';
            renderFiles('Lendo PDF...');
            try {
                const { text, pages } = await extractPdfText(file);
                state.base.pdfText = text;
                saveBase();
                renderFiles();
                showToast(`PDF lido: ${pages} página(s), ${text.length.toLocaleString('pt-BR')} caracteres.`);
            } catch (error) {
                state.base.pdfName = '';
                saveBase();
                renderFiles();
                showToast(`Não consegui ler o PDF: ${error.message}`, 'error');
            }
        } else {
            showToast('Formato não suportado. Envie .html ou .pdf.', 'error');
        }
    }
}

function renderFiles(pdfStatus = '') {
    const list = $('#file-list');
    list.innerHTML = '';

    if (state.base.html) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `<span class="file-badge">HTML</span>
            <span class="file-name"></span>
            <span class="file-meta">${formatBytes(new Blob([state.base.html]).size)}</span>
            <button type="button" class="file-remove" aria-label="Remover HTML">×</button>`;
        $('.file-name', item).textContent = state.base.htmlName || 'curriculo.html';
        $('.file-remove', item).addEventListener('click', () => {
            state.base.html = '';
            state.base.htmlName = '';
            state.result = null;
            saveBase();
            renderFiles();
        });
        list.appendChild(item);
    }

    if (state.base.pdfName) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `<span class="file-badge pdf">PDF</span>
            <span class="file-name"></span>
            <span class="file-meta"></span>
            <button type="button" class="file-remove" aria-label="Remover PDF">×</button>`;
        $('.file-name', item).textContent = state.base.pdfName;
        $('.file-meta', item).textContent =
            pdfStatus || (state.base.pdfText ? `${state.base.pdfText.length.toLocaleString('pt-BR')} caracteres` : 'lendo...');
        $('.file-remove', item).addEventListener('click', () => {
            state.base.pdfText = '';
            state.base.pdfName = '';
            saveBase();
            renderFiles();
        });
        list.appendChild(item);
    }
}

function applyPastedHtml() {
    const html = $('#html-paste').value.trim();
    if (!html) {
        showToast('Cole o HTML antes de aplicar.', 'error');
        return;
    }
    if (!/<(html|body|div|p|h1)/i.test(html)) {
        showToast('O texto colado não parece um HTML de currículo.', 'error');
        return;
    }
    state.base.htmlName = 'HTML colado';
    loadBaseHtml(html);
    $('#html-paste').value = '';
    $('.manual').removeAttribute('open');
    showToast('HTML aplicado como base. O design será preservado.');
}

/* ---------- Busca da vaga ---------- */

function htmlToText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript, svg, img, iframe, header, footer, nav').forEach((el) =>
        el.remove()
    );
    return (doc.body?.textContent || '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
}

async function fetchWithTimeout(url, timeoutMs = 35000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } finally {
        window.clearTimeout(timer);
    }
}

function isBlockedPage(text) {
    return /Additional Verification Required|Just a moment\.\.\.|bot-detection-anonymous|Enable JavaScript and cookies|Cloudflare Errors/i.test(
        String(text || '')
    );
}

function isIndeedUrl(url) {
    try {
        return /(^|\.)indeed\.com$/i.test(new URL(url).hostname);
    } catch {
        return false;
    }
}

async function fetchJobContent(url) {
    try {
        const markdown = await fetchWithTimeout(`https://r.jina.ai/${url}`);
        if (isBlockedPage(markdown)) throw new Error('blocked');
        const cleaned = markdown
            .replace(/^Title:[\s\S]{0,900}?Markdown Content:\s*/i, '')
            .replace(/^\*\*Veja também:\*\*\s*/i, '')
            .replace(/^(?:\s*[*\-]\s*\[[^\]]*\]\([^)]*\)\s*\n?)+/i, '')
            .split(/\n\s*(?:Descobrir mais|Vagas mais Acessadas|Bolsa de Emprego)\b/i)[0]
            .trim();
        if (cleaned.length >= 220) return cleaned;
    } catch {
        /* cai para o próximo proxy */
    }

    const html = await fetchWithTimeout(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    );
    if (isBlockedPage(html)) throw new Error('blocked');
    const text = htmlToText(html);
    if (text.length < 220) throw new Error('A página retornou pouco texto.');
    return text;
}

async function handleFetchJob() {
    const url = $('#job-url').value.trim();
    const status = $('#fetch-status');
    const button = $('#fetch-job');

    if (!/^https?:\/\/\S+$/i.test(url)) {
        status.className = 'error';
        status.textContent = 'Informe um link válido começando com http.';
        return;
    }

    button.disabled = true;
    button.textContent = 'Buscando...';
    status.className = '';
    status.textContent = 'Lendo a página...';

    try {
        const text = await fetchJobContent(url);
        $('#job-text').value = text.slice(0, 22000);
        updateJobCount();
        status.className = 'ok';
        status.textContent = 'Descrição importada. Revise antes de gerar.';
    } catch (error) {
        status.className = 'error';
        status.textContent = isIndeedUrl(url)
            ? 'O Indeed bloqueia a leitura automática. Abra a vaga, copie a descrição e cole abaixo.'
            : 'Não consegui ler o link. Cole a descrição manualmente.';
    } finally {
        button.disabled = false;
        button.textContent = 'Buscar';
    }
}

function updateJobCount() {
    const length = $('#job-text').value.trim().length;
    $('#job-count').textContent = `${length.toLocaleString('pt-BR')} caracteres`;
}

async function handlePasteJob() {
    const status = $('#fetch-status');
    try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
            showToast('A área de transferência está vazia.', 'error');
            return;
        }
        $('#job-text').value = text.slice(0, 22000);
        updateJobCount();
        status.className = 'ok';
        status.textContent = 'Descrição colada. Revise antes de gerar.';
    } catch {
        status.className = 'error';
        status.textContent = 'Use Ctrl+V no campo de descrição.';
        $('#job-text').focus();
    }
}

/* ---------- Estados do resultado ---------- */

const loadingTimers = [];
function clearLoadingTimers() {
    loadingTimers.forEach((timer) => window.clearTimeout(timer));
    loadingTimers.length = 0;
}

function setLoading(message, sub) {
    $('#result-empty').classList.add('hidden');
    $('#result-questions').classList.add('hidden');
    $('#result-content').classList.add('hidden');
    $('#result-loading').classList.remove('hidden');
    if (message) $('#loading-title').textContent = message;
    if (sub) $('#loading-sub').textContent = sub;
}

function setLoadingStep(index, title, sub) {
    $$('#loading-steps .loading-step').forEach((step, i) => {
        step.classList.toggle('active', i === index);
        step.classList.toggle('done', i < index);
    });
    if (title) $('#loading-title').textContent = title;
    if (sub) $('#loading-sub').textContent = sub;
}

function showEmptyState(message) {
    $('#result-loading').classList.add('hidden');
    $('#result-questions').classList.add('hidden');
    $('#result-content').classList.add('hidden');
    $('#result-empty').classList.remove('hidden');

    if (message) {
        $('#result-empty h3').textContent = 'Não foi possível gerar';
        $('#result-empty p').textContent =
            message.length > 240 ? `${message.slice(0, 240)}...` : message;
    }
}

/* ---------- Perguntas de clarificação ---------- */

function normalizeQuestions(raw) {
    return (Array.isArray(raw) ? raw : [])
        .map((question, index) => ({
            id: String(question?.id || `q${index + 1}`),
            question: String(question?.question || '').trim(),
            why: String(question?.why || '').trim(),
            type: question?.type === 'choice' ? 'choice' : 'text',
            options: Array.isArray(question?.options)
                ? question.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 4)
                : [],
        }))
        .filter((question) => question.question)
        .slice(0, 4);
}

function renderQuestions(questions) {
    state.questions = questions;
    const list = $('#questions-list');
    list.innerHTML = '';

    questions.forEach((question, index) => {
        const block = document.createElement('div');
        block.className = 'question-item';

        const label = document.createElement('label');
        label.className = 'question-label';
        label.htmlFor = `q-${index}`;
        label.textContent = question.question;
        block.appendChild(label);

        if (question.why) {
            const why = document.createElement('p');
            why.className = 'question-why';
            why.textContent = question.why;
            block.appendChild(why);
        }

        if (question.type === 'choice' && question.options.length) {
            const select = document.createElement('select');
            select.id = `q-${index}`;
            select.dataset.qid = question.id;
            select.innerHTML = `<option value="">Selecione...</option>${question.options
                .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
                .join('')}<option value="__other__">Outra resposta</option>`;
            block.appendChild(select);

            const other = document.createElement('input');
            other.type = 'text';
            other.id = `q-other-${index}`;
            other.className = 'question-other hidden';
            other.placeholder = 'Digite sua resposta';
            other.dataset.qid = question.id;
            block.appendChild(other);

            select.addEventListener('change', () => {
                other.classList.toggle('hidden', select.value !== '__other__');
                if (select.value === '__other__') other.focus();
            });
        } else {
            const input = document.createElement('textarea');
            input.id = `q-${index}`;
            input.rows = 2;
            input.dataset.qid = question.id;
            input.placeholder = 'Sua resposta';
            block.appendChild(input);
        }

        list.appendChild(block);
    });

    $('#result-empty').classList.add('hidden');
    $('#result-loading').classList.add('hidden');
    $('#result-content').classList.add('hidden');
    $('#result-questions').classList.remove('hidden');
    $('#questions-title').textContent = `${questions.length} ponto${questions.length > 1 ? 's' : ''} para confirmar`;
    $('#result-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function collectAnswers() {
    const answers = {};
    state.questions.forEach((question, index) => {
        const select = document.getElementById(`q-${index}`);
        let value = '';
        if (select?.tagName === 'SELECT') {
            value = select.value;
            if (value === '__other__') value = document.getElementById(`q-other-${index}`)?.value || '';
        } else if (select) {
            value = select.value;
        }
        if (String(value || '').trim()) answers[question.question] = String(value).trim();
    });
    return answers;
}

function handleQuestionsSubmit(skip = false) {
    const answers = skip ? {} : collectAnswers();
    $('#result-questions').classList.add('hidden');
    handleGenerate({ answers, force: true });
}

/* ---------- Resultado ---------- */

function renderChips(container, values, emptyLabel, className = '') {
    container.innerHTML = '';
    if (!values.length) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = emptyLabel;
        container.appendChild(chip);
        return;
    }
    values.forEach((value) => {
        const chip = document.createElement('span');
        chip.className = `chip ${className}`.trim();
        chip.textContent = value;
        container.appendChild(chip);
    });
}

function renderReview(result) {
    const list = $('#review-list');
    list.innerHTML = '';
    const contactsMissing = result.contactCheck?.missing?.length || 0;
    const identityOk = contactsMissing === 0 && !result.contactCheck?.nameMissing;
    const onePage = result.fit.pages <= 1 && !result.fit.clipped && !result.fit.overflowing;

    const checks = [
        { ok: result.designPreserved, text: 'Design original preservado' },
        { ok: identityOk, text: identityOk ? 'Contatos e nome preservados' : 'Contatos ou nome precisam de revisão' },
        { ok: onePage, text: onePage ? 'Conteúdo em uma página A4' : `Conteúdo em ${result.fit.pages} página(s)` },
        {
            ok: result.lengthCheck?.ok !== false,
            text:
                result.lengthCheck?.ok === false
                    ? 'Volume de texto acima do original'
                    : 'Volume de texto preservado',
        },
        {
            ok: result.atsCheck?.ok !== false,
            text:
                result.atsCheck?.ok === false
                    ? 'Palavras-chave fora do texto extraível'
                    : 'Palavras-chave visíveis no texto',
        },
        { ok: true, text: 'Sem scripts ou conteúdo executável' },
        ...(result.selfReview || []).map((text) => ({ ok: true, text })),
    ];

    checks.forEach((check) => {
        const item = document.createElement('li');
        item.className = `review-item ${check.ok ? 'ok' : 'warn'}`;
        item.innerHTML = `<span class="review-icon" aria-hidden="true">${check.ok ? '✓' : '!'}</span><span></span>`;
        item.lastElementChild.textContent = check.text;
        list.appendChild(item);
    });
}

function renderLetter(result) {
    const identity = state.identity || { name: '', values: [] };
    $('#letter-head').textContent = identity.name || '';
    $('#letter-contact').textContent = identity.values.join(' · ');
    $('#letter-date').textContent = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
    $('#letter-body').textContent = result.coverLetter || 'A IA não retornou uma carta. Gere novamente.';
    $('#letter-empty').classList.toggle('hidden', Boolean(result.coverLetter));
}

function renderResult(result) {
    state.result = result;
    const { analysis } = result;
    const onePage = result.fit.pages <= 1 && !result.fit.clipped && !result.fit.overflowing;

    $('#score-ring').style.setProperty('--p', analysis.score);
    $('#score-value').textContent = analysis.score;
    $('#result-role').textContent = analysis.jobTitle;
    $('#result-company').textContent = analysis.company;
    $('#badge-keywords').textContent = `${analysis.keywordsCovered.length} palavras-chave`;
    $('#badge-warn').classList.toggle('hidden', analysis.gaps.length === 0);
    $('#badge-pages').textContent = onePage ? 'PDF · 1 página' : `PDF · ${result.fit.pages} páginas`;
    $('#badge-pages').classList.toggle('badge-good', onePage);
    $('#badge-pages').classList.toggle('badge-warn', !onePage);
    $('#badge-design').classList.toggle('badge-good', result.designPreserved);
    $('#badge-design').classList.toggle('badge-warn', !result.designPreserved);
    $('#badge-design').textContent = result.designPreserved ? 'Design preservado' : 'Design alterado';

    const scaleNote = $('#print-scale-note');
    if (onePage) {
        scaleNote.classList.add('hidden');
        scaleNote.textContent = '';
    } else {
        scaleNote.classList.remove('hidden');
        scaleNote.textContent =
            'O conteúdo passou de uma página. Encurte o texto ou ajuste a escala no diálogo de impressão.';
    }

    renderChips($('#keywords-covered'), analysis.keywordsCovered, 'Nenhuma palavra-chave identificada', 'ok');
    renderChips($('#keywords-missing'), analysis.keywordsMissing, 'Nenhuma lacuna crítica', 'miss');
    $('#no-gaps-note').classList.toggle('hidden', analysis.keywordsMissing.length > 0);

    const changes = $('#changes-list');
    changes.innerHTML = '';
    analysis.changes.forEach((change) => {
        const item = document.createElement('li');
        item.textContent = change;
        changes.appendChild(item);
    });

    renderReview(result);
    renderLetter(result);

    const frame = $('#preview-frame');
    frame.srcdoc = state.printHtml;
    frame.onload = fitPreview;

    $('#result-empty').classList.add('hidden');
    $('#result-loading').classList.add('hidden');
    $('#result-questions').classList.add('hidden');
    $('#result-content').classList.remove('hidden');
    switchTab('preview');
    fitPreview();
    $('#result-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (result.contactCheck?.missing?.length || result.contactCheck?.nameMissing) {
        showToast('Atenção: confira o nome e os contatos no currículo final.', 'error');
    }
}

function fitPreview() {
    const wrap = $('#paper-wrap');
    const frame = $('#preview-frame');
    if (!wrap || !frame || $('#result-content').classList.contains('hidden')) return;
    const available = wrap.clientWidth - 44;
    const scale = Math.max(0.3, Math.min(1, available / 794));
    frame.style.zoom = String(scale);
}

function switchTab(name) {
    $$('.tab').forEach((tab) => {
        const active = tab.dataset.tab === name;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
    });
    $('#tab-preview').classList.toggle('hidden', name !== 'preview');
    $('#tab-letter').classList.toggle('hidden', name !== 'letter');
    $('#tab-analysis').classList.toggle('hidden', name !== 'analysis');
    if (name === 'preview') window.setTimeout(fitPreview, 30);
}

function normalizeAnalysis(raw) {
    const analysis = raw && typeof raw === 'object' ? raw : {};
    const list = (value, max = 20) =>
        (Array.isArray(value) ? value : [])
            .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .slice(0, max);

    const scoreValue = Number(String(analysis.score ?? '').replace(/[^\d]/g, ''));
    const unique = (values) => [...new Set(values)];

    return {
        score: Math.max(0, Math.min(100, Math.round(Number.isFinite(scoreValue) ? scoreValue : 0))),
        jobTitle: String(analysis.jobTitle || 'Vaga analisada').trim(),
        company: String(analysis.company || 'Empresa confidencial').trim(),
        keywordsCovered: unique(list(analysis.keywordsCovered, 24)),
        keywordsMissing: unique(list(analysis.keywordsMissing, 14)),
        changes: unique(list(analysis.changes, 8)),
        gaps: unique(list(analysis.gaps, 8)),
    };
}

async function processDone(raw) {
    const rawBody = extractBodyHtml(String(raw.html || '').trim());
    if (!rawBody) throw new Error('A IA não retornou o conteúdo do currículo.');

    const baseSanitized = restoreAssets(state.prepared.html, state.prepared.assets);
    const restored = restoreAssets(
        injectBodyHtml(state.prepared.html, rawBody),
        state.prepared.assets
    );

    const design = validateDesign(baseSanitized, restored);
    if (!design.ok) {
        throw new Error(
            `A IA alterou o design e a geração foi bloqueada. ${design.reason} Tente novamente.`
        );
    }

    const withPageRule = ensurePageRule(restored);
    const contactCheck = reviewContacts(baseSanitized, withPageRule);
    const analysis = normalizeAnalysis(raw.analysis);
    const coverLetter = String(raw.coverLetter || '').trim();
    const selfReview = (Array.isArray(raw.selfReview) ? raw.selfReview : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 6);

    setLoadingStep(3, 'Revisando e medindo a página...', 'Conferindo contatos, design e paginação.');
    const fit = await measurePageFit(withPageRule);
    const baseLength = textLength(baseSanitized);
    const resultLength = textLength(withPageRule);
    const lengthCheck = {
        base: baseLength,
        result: resultLength,
        ok: resultLength <= baseLength * 1.12 + 80,
    };
    const readable = readableText(withPageRule);
    const missingInText = analysis.keywordsCovered.filter(
        (keyword) => !readable.toLowerCase().includes(keyword.toLowerCase())
    );
    const keywordTotal = Math.max(1, analysis.keywordsCovered.length);
    const atsCheck = {
        ok: readable.length > 300 && missingInText.length / keywordTotal <= 0.4,
        missing: missingInText,
    };

    state.printHtml = withPageRule;
    state.fit = fit;
    state.identity = extractContactValues(baseSanitized);

    const result = {
        analysis,
        coverLetter,
        selfReview,
        fit,
        lengthCheck,
        atsCheck,
        designPreserved: true,
        contactCheck,
        html: withPageRule,
    };

    if (fit.pages > 1 || fit.clipped || fit.overflowing) {
        showToast('O currículo passou de uma página. Revise o texto antes de salvar o PDF.', 'error');
    } else if (!lengthCheck.ok) {
        showToast('A IA aumentou o volume de texto. Confira se nada foi cortado.', 'error');
    }
    renderResult(result);
}

async function handleGenerate({ answers = null, force = false } = {}) {
    if (state.busy) return;

    if (!state.base.html) {
        showToast('Envie o HTML do currículo (ou cole o código) antes de gerar.', 'error');
        $('#dropzone').scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('#dropzone').focus();
        return;
    }

    const job = $('#job-text').value.trim();
    if (job.length < 80) {
        showToast('Cole a descrição da vaga (pelo menos 80 caracteres).', 'error');
        $('#job-text').focus();
        return;
    }

    if (!providerReady()) {
        showToast('Configure sua chave de IA para gerar.', 'error');
        openSettings();
        return;
    }

    state.busy = true;
    state.questions = [];
    state.result = null;
    state.printHtml = '';
    clearLoadingTimers();
    $('#generate-btn').disabled = true;
    $('#generate-spinner').classList.remove('hidden');
    $('#generate-icon').classList.add('hidden');
    $('#generate-label').textContent = 'Gerando...';
    setLoading('Lendo o design e a vaga...', 'Extraindo requisitos sem alterar a estrutura.');
    setLoadingStep(0);

    loadingTimers.push(
        window.setTimeout(() => {
            if (state.busy) setLoadingStep(1, 'Cruzando com seu histórico...', 'Identificando dúvidas antes de assumir fatos.');
        }, 2200)
    );
    loadingTimers.push(
        window.setTimeout(() => {
            if (state.busy) setLoadingStep(2, 'Adaptando os textos...', 'Mantendo CSS, classes e layout intactos.');
        }, 7000)
    );

    try {
        state.prepared = prepareBaseHtml(state.base.html);
        const raw = await generateWithAI({
            html: state.prepared.bodyHtml,
            pdfText: state.base.pdfText,
            job,
            url: $('#job-url').value.trim(),
            answers,
            forceDone: force,
            settings: state.settings,
        });

        if (raw.status === 'questions' && !force) {
            clearLoadingTimers();
            const questions = normalizeQuestions(raw.questions);
            if (questions.length) {
                state.busy = false;
                renderQuestions(questions);
                return;
            }
        }

        if (raw.status === 'questions' && force) {
            throw new Error('A IA insistiu em perguntar mesmo após as respostas. Tente novamente.');
        }

        clearLoadingTimers();
        await processDone(raw);
    } catch (error) {
        clearLoadingTimers();
        showEmptyState(error.message);
        showToast(error.message, 'error');
    } finally {
        state.busy = false;
        $('#generate-btn').disabled = false;
        $('#generate-spinner').classList.add('hidden');
        $('#generate-icon').classList.remove('hidden');
        $('#generate-label').textContent = 'Gerar currículo ATS';
    }
}

/* ---------- Downloads, carta e impressão ---------- */

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function baseFilename() {
    const name = slugify(state.identity.name || 'curriculo');
    const company = slugify(state.result?.analysis?.company || '');
    return `curriculo-${name}${company ? `-${company}` : ''}`;
}

function handlePrintResume() {
    if (!state.result) return;
    showToast('No diálogo, escolha “Salvar como PDF” e desative cabeçalhos/rodapés.');
    printHtml(state.printHtml);
}

function handleOpenPreview() {
    if (!state.result) return;
    const url = URL.createObjectURL(new Blob([state.printHtml], { type: 'text/html;charset=utf-8' }));
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function handleDownloadHtml() {
    if (!state.result) return;
    const blob = new Blob([state.printHtml], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${baseFilename()}.html`);
    showToast('HTML baixado.');
}

function letterText() {
    return $('#letter-body').innerText.trim();
}

function fullLetterText() {
    const identity = state.identity || { name: '', values: [] };
    const date = $('#letter-date').textContent;
    return `${identity.name}\n${identity.values.join(' · ')}\n${date}\n\n${letterText()}`;
}

async function handleCopyLetter() {
    try {
        await navigator.clipboard.writeText(fullLetterText());
        showToast('Carta copiada.');
    } catch {
        showToast('Não foi possível copiar automaticamente.', 'error');
    }
}

function handleDownloadLetter() {
    if (!state.result) return;
    downloadBlob(new Blob([fullLetterText()], { type: 'text/plain;charset=utf-8' }), `${baseFilename()}-carta.txt`);
    showToast('Carta baixada em .txt.');
}

function handlePrintLetter() {
    if (!state.result) return;
    const identity = state.identity || { name: '', values: [] };
    printHtml(buildLetterHtml(letterText(), identity));
    showToast('No diálogo, escolha “Salvar como PDF”.');
}

/* ---------- Demonstração ---------- */

async function runDemo({ scroll = true } = {}) {
    clearLoadingTimers();
    state.busy = false;
    state.questions = [];
    state.result = null;
    state.prepared = null;
    const demo = createDemo();
    state.identity = extractContactValues(demo.html);
    setLoading('Montando a demonstração...', 'Design preservado, carta e revisão.');
    const fit = await measurePageFit(demo.html);
    state.printHtml = demo.html;
    state.fit = fit;
    renderResult({
        analysis: demo.analysis,
        coverLetter: demo.coverLetter,
        selfReview: demo.selfReview,
        fit,
        lengthCheck: { ok: true },
        atsCheck: { ok: true },
        designPreserved: true,
        contactCheck: { missing: [] },
        html: demo.html,
    });
    showToast('Demonstração com dados fictícios. A prévia, a carta e a impressão são reais.');
    if (scroll) $('#app').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Eventos ---------- */

function bindEvents() {
    $('#settings-open').addEventListener('click', openSettings);
    $('#settings-close').addEventListener('click', closeSettings);
    $('#settings-save').addEventListener('click', handleSaveSettings);
    $('#settings-test').addEventListener('click', handleTestConnection);
    $('#settings-clear').addEventListener('click', () => {
        if (!window.confirm('Limpar chave, arquivos e preferências deste navegador?')) return;
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(BASE_KEY);
        state.settings = { ...DEFAULT_SETTINGS };
        state.base = { html: '', htmlName: '', pdfText: '', pdfName: '' };
        state.result = null;
        state.questions = [];
        state.printHtml = '';
        renderFiles();
        updateProviderUI();
        closeSettings();
        showEmptyState();
        $('#result-empty h3').textContent = 'Sua prévia A4 aparece aqui';
        $('#result-empty p').textContent =
            'Depois da análise, você vê o currículo pronto, as palavras-chave cobertas e as lacunas reais.';
        showToast('Dados locais removidos.');
    });

    $('#settings-dialog').addEventListener('click', (event) => {
        if (event.target === $('#settings-dialog')) closeSettings();
    });

    $$('#provider-tabs .segmented-btn').forEach((button) => {
        button.addEventListener('click', () => setProviderTab(button.dataset.provider));
    });

    $$('.key-toggle').forEach((button) => {
        button.addEventListener('click', () => {
            const input = document.getElementById(button.dataset.target);
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            button.textContent = show ? 'Ocultar' : 'Ver';
            button.setAttribute('aria-label', show ? 'Ocultar chave' : 'Mostrar chave');
        });
    });

    $('#dropzone').addEventListener('click', () => $('#file-input').click());
    $('#dropzone').addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            $('#file-input').click();
        }
    });
    $('#file-input').addEventListener('change', (event) => {
        handleFiles(event.target.files);
        event.target.value = '';
    });

    ['dragenter', 'dragover'].forEach((name) => {
        $('#dropzone').addEventListener(name, (event) => {
            event.preventDefault();
            $('#dropzone').classList.add('dragover');
        });
    });
    ['dragleave', 'drop'].forEach((name) => {
        $('#dropzone').addEventListener(name, (event) => {
            event.preventDefault();
            $('#dropzone').classList.remove('dragover');
        });
    });
    $('#dropzone').addEventListener('drop', (event) => handleFiles(event.dataTransfer.files));

    $('#html-apply').addEventListener('click', applyPastedHtml);
    $('#fetch-job').addEventListener('click', handleFetchJob);
    $('#job-url').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleFetchJob();
        }
    });
    $('#job-text').addEventListener('input', updateJobCount);
    $('#paste-job').addEventListener('click', handlePasteJob);
    $('#generate-btn').addEventListener('click', () => handleGenerate());
    $('#demo-btn').addEventListener('click', () => runDemo());

    $('#questions-submit').addEventListener('click', () => handleQuestionsSubmit(false));
    $('#questions-skip').addEventListener('click', () => handleQuestionsSubmit(true));

    $$('.tab').forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

    $('#print-pdf').addEventListener('click', handlePrintResume);
    $('#open-preview').addEventListener('click', handleOpenPreview);
    $('#download-html').addEventListener('click', handleDownloadHtml);

    $('#copy-letter').addEventListener('click', handleCopyLetter);
    $('#download-letter').addEventListener('click', handleDownloadLetter);
    $('#print-letter').addEventListener('click', handlePrintLetter);

    window.addEventListener('resize', fitPreview);
    window.addEventListener('scroll', () => {
        $('.topbar').classList.toggle('scrolled', window.scrollY > 8);
    });
}

/* ---------- Inicialização ---------- */

function init() {
    bindEvents();
    renderFiles();
    updateJobCount();
    updateProviderUI();
    $('#year').textContent = new Date().getFullYear();
    if (new URLSearchParams(location.search).get('demo') === '1') {
        window.setTimeout(() => runDemo({ scroll: false }), 350);
    }
}

init();
