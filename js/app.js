/* ATS.IA — orquestração da interface. */

import {
    normalizeResult,
    buildResumeHtml,
    createDemoResult,
    extractIdentity,
    mergeIdentity,
    slugify,
} from './resume.js';
import { generateWithAI, testProvider, providerLabel } from './ai.js';
import { generatePdf } from './pdf.js';

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
    result: null,
    pdf: null,
    pdfBusy: false,
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
                html: state.base.html.slice(0, 120000),
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
    }, 6500);
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function providerReady(settings = state.settings) {
    if (settings.provider === 'gemini') return Boolean(settings.geminiKey);
    return Boolean(settings.openaiBase && settings.openaiModel);
}

function scrollToApp() {
    $('#app').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        geminiModel: $('#gemini-model').value,
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
            state.base.html = text;
            state.base.htmlName = file.name;
            saveBase();
            renderFiles();
            showToast('HTML carregado. Ele será a fonte da verdade.');
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
    state.base.html = html;
    state.base.htmlName = 'HTML colado';
    saveBase();
    renderFiles();
    $('#html-paste').value = '';
    $('.manual').removeAttribute('open');
    showToast('HTML aplicado como base do currículo.');
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

async function fetchText(url) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } finally {
        window.clearTimeout(timer);
    }
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
        const html = await fetchText(url);
        const text = htmlToText(html);
        if (text.length < 220) throw new Error('A página retornou pouco texto.');

        $('#job-text').value = text.slice(0, 22000);
        updateJobCount();
        status.className = 'ok';
        status.textContent = 'Descrição importada. Revise antes de gerar.';
    } catch (error) {
        status.className = 'error';
        status.textContent = 'Não consegui ler o link. Cole a descrição manualmente.';
    } finally {
        button.disabled = false;
        button.textContent = 'Buscar';
    }
}

function updateJobCount() {
    const length = $('#job-text').value.trim().length;
    $('#job-count').textContent = `${length.toLocaleString('pt-BR')} caracteres`;
}

/* ---------- Resultado ---------- */

const loadingTimers = [];
let loadingStepIndex = 0;

function clearLoadingTimers() {
    loadingTimers.forEach((timer) => window.clearTimeout(timer));
    loadingTimers.length = 0;
}

function setLoading(message, sub) {
    $('#result-empty').classList.add('hidden');
    $('#result-content').classList.add('hidden');
    $('#result-loading').classList.remove('hidden');
    if (message) $('#loading-title').textContent = message;
    if (sub) $('#loading-sub').textContent = sub;
}

function setLoadingStep(index, title, sub) {
    loadingStepIndex = index;
    $$('#loading-steps .loading-step').forEach((step, i) => {
        step.classList.toggle('active', i === index);
        step.classList.toggle('done', i < index);
    });
    if (title) $('#loading-title').textContent = title;
    if (sub) $('#loading-sub').textContent = sub;
}

function showEmptyState() {
    $('#result-loading').classList.add('hidden');
    $('#result-content').classList.add('hidden');
    $('#result-empty').classList.remove('hidden');
}

function renderResult(result) {
    state.result = result;
    const { analysis, resume } = result;

    $('#score-ring').style.setProperty('--p', analysis.score);
    $('#score-value').textContent = analysis.score;
    $('#result-role').textContent = analysis.jobTitle;
    $('#result-company').textContent = analysis.company;
    $('#badge-keywords').textContent = `${analysis.keywordsCovered.length} palavras-chave`;
    $('#badge-warn').classList.toggle('hidden', analysis.gaps.length === 0);
    $('#badge-pages').textContent = 'PDF · preparando...';
    $('#download-pdf').disabled = true;

    const covered = $('#keywords-covered');
    covered.innerHTML = '';
    if (analysis.keywordsCovered.length) {
        analysis.keywordsCovered.forEach((keyword) => {
            const chip = document.createElement('span');
            chip.className = 'chip ok';
            chip.textContent = keyword;
            covered.appendChild(chip);
        });
    } else {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = 'Nenhuma palavra-chave identificada';
        covered.appendChild(chip);
    }

    const missing = $('#keywords-missing');
    missing.innerHTML = '';
    analysis.keywordsMissing.forEach((keyword) => {
        const chip = document.createElement('span');
        chip.className = 'chip miss';
        chip.textContent = keyword;
        missing.appendChild(chip);
    });
    $('#no-gaps-note').classList.toggle('hidden', analysis.keywordsMissing.length > 0);

    const changes = $('#changes-list');
    changes.innerHTML = '';
    analysis.changes.forEach((change) => {
        const item = document.createElement('li');
        item.textContent = change;
        changes.appendChild(item);
    });

    const frame = $('#preview-frame');
    frame.srcdoc = buildResumeHtml(resume);
    frame.onload = fitPreview;

    $('#result-empty').classList.add('hidden');
    $('#result-loading').classList.add('hidden');
    $('#result-content').classList.remove('hidden');
    switchTab('preview');
    fitPreview();
    $('#result-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    $('#tab-analysis').classList.toggle('hidden', name !== 'analysis');
    if (name === 'preview') window.setTimeout(fitPreview, 30);
}

async function finishPdf(result) {
    state.pdfBusy = true;
    $('#badge-pages').textContent = 'PDF · montando...';
    try {
        const pdf = await generatePdf(result.resume);
        state.pdf = pdf;
        const pageLabel = pdf.pages === 1 ? 'PDF · 1 página' : `PDF · ${pdf.pages} páginas`;
        $('#badge-pages').textContent = pageLabel;
        $('#badge-pages').classList.toggle('badge-good', pdf.pages === 1);
        $('#badge-pages').classList.toggle('badge-warn', pdf.pages > 1);
        $('#download-pdf').disabled = false;
        if (pdf.pages > 1) {
            showToast('O conteúdo passou de uma página. Revise ou encurte o currículo-base.', 'error');
        }
    } catch (error) {
        $('#badge-pages').textContent = 'PDF · erro';
        $('#badge-pages').classList.add('badge-warn');
        showToast(`Erro ao montar o PDF: ${error.message}`, 'error');
    } finally {
        state.pdfBusy = false;
    }
}

async function handleGenerate() {
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
    state.pdf = null;
    state.result = null;
    clearLoadingTimers();
    $('#generate-btn').disabled = true;
    $('#generate-spinner').classList.remove('hidden');
    $('#generate-icon').classList.add('hidden');
    $('#generate-label').textContent = 'Gerando...';
    setLoading('Analisando a vaga...', 'Extraindo requisitos e palavras-chave.');
    setLoadingStep(0);

    loadingTimers.push(
        window.setTimeout(() => {
            if (state.busy) setLoadingStep(1, 'Cruzando com seu histórico...', 'Reescrevendo sem inventar nada.');
        }, 2200)
    );
    loadingTimers.push(
        window.setTimeout(() => {
            if (state.busy) setLoadingStep(2, 'Montando o PDF...', 'Ajustando o layout para uma página A4.');
        }, 6500)
    );

    try {
        const raw = await generateWithAI({
            html: state.base.html,
            pdfText: state.base.pdfText,
            job,
            url: $('#job-url').value.trim(),
            settings: state.settings,
        });
        const result = mergeIdentity(normalizeResult(raw), extractIdentity(state.base.html));
        if (!result.resume.summary && !result.resume.skills.length && !result.resume.experience.length) {
            throw new Error('A IA retornou um currículo vazio. Tente novamente com a descrição completa da vaga.');
        }
        clearLoadingTimers();
        setLoadingStep(3, 'Quase pronto', 'Organizando a prévia e o relatório.');
        renderResult(result);
        await finishPdf(result);
    } catch (error) {
        clearLoadingTimers();
        showEmptyState();
        showToast(error.message, 'error');
        const fallbackTitle = $('#result-empty h3');
        const fallbackText = $('#result-empty p');
        if (fallbackTitle) fallbackTitle.textContent = 'Não foi possível gerar';
        if (fallbackText) {
            fallbackText.textContent =
                error.message.length > 220 ? `${error.message.slice(0, 220)}...` : error.message;
        }
    } finally {
        state.busy = false;
        $('#generate-btn').disabled = false;
        $('#generate-spinner').classList.add('hidden');
        $('#generate-icon').classList.remove('hidden');
        $('#generate-label').textContent = 'Gerar currículo ATS';
    }
}

/* ---------- Downloads ---------- */

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

async function handleDownloadPdf() {
    if (!state.result) return;
    const button = $('#download-pdf');
    if (!state.pdf) {
        if (state.pdfBusy) {
            showToast('O PDF ainda está sendo montado.');
            return;
        }
        button.disabled = true;
        button.textContent = 'Montando...';
        await finishPdf(state.result);
        button.textContent = 'Baixar PDF';
    }
    if (!state.pdf) return;
    const company = slugify(state.result.analysis.company);
    const name = slugify(state.result.resume.name);
    const filename = `curriculo-${name}${company ? `-${company}` : ''}.pdf`;
    downloadBlob(state.pdf.blob, filename);
    showToast('PDF baixado.');
}

function handleOpenPreview() {
    if (!state.result) return;
    const html = buildResumeHtml(state.result.resume, { standalone: true });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function handleDownloadHtml() {
    if (!state.result) return;
    const html = buildResumeHtml(state.result.resume, { standalone: true });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const company = slugify(state.result.analysis.company);
    const name = slugify(state.result.resume.name);
    downloadBlob(blob, `curriculo-${name}${company ? `-${company}` : ''}.html`);
    showToast('HTML baixado.');
}

/* ---------- Demonstração ---------- */

function runDemo({ scroll = true } = {}) {
    clearLoadingTimers();
    state.busy = false;
    state.pdf = null;
    const result = createDemoResult();
    renderResult(result);
    showToast('Demonstração com dados fictícios. A prévia e o PDF são reais.');
    finishPdf(result);
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
        state.pdf = null;
        renderFiles();
        updateProviderUI();
        closeSettings();
        showEmptyState();
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
    $('#generate-btn').addEventListener('click', handleGenerate);
    $('#demo-btn').addEventListener('click', () => runDemo());

    $$('.tab').forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

    $('#download-pdf').addEventListener('click', handleDownloadPdf);
    $('#open-preview').addEventListener('click', handleOpenPreview);
    $('#download-html').addEventListener('click', handleDownloadHtml);

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
