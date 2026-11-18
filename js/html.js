/* Edição segura do HTML: preserva CSS, estrutura e design. */

export function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function stripDangerous(doc) {
    doc.querySelectorAll('script, iframe, object, embed, form, base').forEach((el) => el.remove());

    doc.querySelectorAll('*').forEach((el) => {
        [...el.attributes].forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = String(attr.value || '').trim().toLowerCase();
            if (name.startsWith('on')) el.removeAttribute(attr.name);
            if ((name === 'href' || name === 'src' || name === 'action') && value.startsWith('javascript:')) {
                el.removeAttribute(attr.name);
            }
        });
    });
}

/**
 * Sanitiza o HTML e troca data URIs por placeholders para economizar tokens.
 * Retorna também os assets para restaurar depois da IA.
 */
export function prepareBaseHtml(rawHtml) {
    const doc = new DOMParser().parseFromString(String(rawHtml || ''), 'text/html');
    stripDangerous(doc);

    if (!doc.querySelector('meta[charset]')) {
        const meta = doc.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        doc.head.prepend(meta);
    }

    let html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    const assets = {};
    let index = 0;

    html = html.replace(/\b(src|href)=("|')(data:[^"']+)\2/gi, (match, attr, quote, data) => {
        const key = `__ATS_ASSET_${index}__`;
        assets[index] = data;
        index += 1;
        return `${attr}=${quote}${key}${quote}`;
    });

    html = html.replace(/url\((["']?)(data:[^)"']+)\1\)/gi, (match, quote, data) => {
        const key = `__ATS_ASSET_${index}__`;
        assets[index] = data;
        index += 1;
        return `url(${quote}${key}${quote})`;
    });

    const preparedDoc = new DOMParser().parseFromString(html, 'text/html');

    return {
        html,
        bodyHtml: preparedDoc.body?.innerHTML || '',
        assets,
        hasPageRule: /@page\s*\{/i.test(rawHtml),
        originalSize: String(rawHtml || '').length,
    };
}

export function restoreAssets(html, assets = {}) {
    return String(html || '').replace(/__ATS_ASSET_(\d+)__/g, (match, index) => assets[index] || match);
}

/** Extrai o conteúdo interno do body, aceitando fragmento ou documento completo. */
export function extractBodyHtml(html) {
    const value = String(html || '').trim();
    if (!/<(?:html|body|head)\b/i.test(value)) return value;
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return doc.body?.innerHTML || value;
}

/** Reinsere o body editado no documento original, preservando head, CSS e atributos. */
export function injectBodyHtml(fullHtml, bodyHtml) {
    const value = String(fullHtml || '');
    if (/<body\b[^>]*>[\s\S]*<\/body>/i.test(value)) {
        return value.replace(
            /(<body\b[^>]*>)[\s\S]*(<\/body>)/i,
            (match, open, close) => `${open}${bodyHtml}${close}`
        );
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${bodyHtml}</body></html>`;
}

function elementSignature(el) {
    const attrs = [...el.attributes]
        .filter((attr) => !attr.name.startsWith('data-ats'))
        .map((attr) => `${attr.name.toLowerCase()}=${attr.value}`)
        .sort()
        .join('\u0001');
    const children = [...el.children].map(elementSignature).join('');
    return `<${el.tagName.toLowerCase()}\u0002${attrs}>${children}`;
}

function styleSignature(doc) {
    return [...doc.querySelectorAll('style')]
        .map((style) => (style.textContent || '').replace(/\s+/g, ' ').trim())
        .join('\u0003');
}

/**
 * Confere se a IA mudou apenas texto. Qualquer tag, classe, atributo ou CSS
 * diferente é rejeitado para garantir o design original.
 */
export function validateDesign(baseHtml, resultHtml) {
    try {
        const baseDoc = new DOMParser().parseFromString(baseHtml, 'text/html');
        const resultDoc = new DOMParser().parseFromString(resultHtml, 'text/html');

        stripDangerous(baseDoc);
        stripDangerous(resultDoc);

        if (styleSignature(baseDoc) !== styleSignature(resultDoc)) {
            return { ok: false, reason: 'A IA alterou o CSS original.' };
        }

        const baseSig = elementSignature(baseDoc.documentElement);
        const resultSig = elementSignature(resultDoc.documentElement);
        if (baseSig !== resultSig) {
            return {
                ok: false,
                reason: 'A estrutura, as classes ou os atributos do HTML foram alterados.',
            };
        }

        return { ok: true };
    } catch {
        return { ok: false, reason: 'Não foi possível validar a estrutura do HTML.' };
    }
}

function visibleText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const flattened = (doc.body?.innerHTML || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/(p|div|li|h[1-6]|section|article|td|th)>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
    const container = doc.createElement('div');
    container.innerHTML = flattened;
    return (container.textContent || '').replace(/\s+/g, ' ').trim();
}

export function extractContactValues(html) {
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const text = visibleText(html);
        const hrefs = [...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '').join(' ');
        const all = `${text} ${hrefs}`;

        const email = all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
        const phone = all.match(/(?:\+55\s?)?\(?\d{2}\)?\s?9?\d{4}[-.\s]?\d{4}/);
        const linkedin = all.match(/linkedin\.com\/in\/[\w-]+/i);
        const github = all.match(/github\.com\/[\w-]+/i);
        const nameEl = doc.querySelector('.name, h1, [class*="nome"]');
        const name = nameEl?.textContent?.replace(/\s+/g, ' ').trim() || '';

        return {
            name,
            values: [email?.[0], phone?.[0], linkedin?.[0], github?.[0]].filter(Boolean),
        };
    } catch {
        return { name: '', values: [] };
    }
}

export function textLength(html) {
    return visibleText(html).replace(/\s+/g, ' ').length;
}

export function reviewContacts(baseHtml, resultHtml) {
    const base = extractContactValues(baseHtml);
    const resultDoc = new DOMParser().parseFromString(resultHtml, 'text/html');
    const hrefs = [...resultDoc.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href') || '')
        .join(' ');
    const resultText = `${visibleText(resultHtml)} ${hrefs}`;
    const missing = base.values.filter((value) => !resultText.includes(value));
    const nameMissing = Boolean(
        base.name && !resultText.toLowerCase().includes(base.name.toLowerCase())
    );
    return { missing, name: base.name, nameMissing };
}

export function ensurePageRule(html) {
    if (/@page\s*\{/i.test(html)) return html;
    const style = '<style id="ats-page-rule">@page { size: A4; margin: 10mm; }</style>';
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${style}\n</head>`);
    return style + html;
}

/** Mede quantas páginas o HTML ocupa e se algum container está cortando texto. */
export function measurePageFit(html) {
    return new Promise((resolve) => {
        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText =
            'position:fixed;left:-12000px;top:0;width:794px;height:1123px;border:0;visibility:hidden;';
        document.body.appendChild(frame);

        const finish = (result) => {
            frame.remove();
            resolve(result);
        };

        const timeout = window.setTimeout(
            () => finish({ pages: 1, clipped: false, overflowing: false, height: 1123 }),
            5000
        );

        frame.onload = () => {
            window.clearTimeout(timeout);
            try {
                const doc = frame.contentDocument;
                const view = frame.contentWindow;
                if (!doc || !view) {
                    return finish({ pages: 1, clipped: false, overflowing: false, height: 1123 });
                }

                const body = doc.body;
                const height = Math.max(
                    body?.scrollHeight || 0,
                    doc.documentElement?.scrollHeight || 0,
                    1123
                );

                let clipped = false;
                for (const el of doc.querySelectorAll('body *')) {
                    const style = view.getComputedStyle(el);
                    const overflow = style.overflowY;
                    if (
                        (overflow === 'hidden' || overflow === 'clip') &&
                        el.clientHeight > 0 &&
                        el.scrollHeight > el.clientHeight + 3
                    ) {
                        clipped = true;
                        break;
                    }
                }

                const pageBox = doc.querySelector('.page') || body;
                const pageBottom = pageBox?.getBoundingClientRect().bottom || 1123;
                let overflowing = false;
                for (const el of doc.querySelectorAll('body *')) {
                    const rect = el.getBoundingClientRect();
                    if (rect.height > 0 && rect.bottom > pageBottom + 3) {
                        overflowing = true;
                        break;
                    }
                }

                let pages = Math.max(1, Math.ceil((height - 4) / 1123));
                if (overflowing && pages <= 1) pages = 2;
                finish({ pages, clipped, overflowing, height });
            } catch {
                finish({ pages: 1, clipped: false, overflowing: false, height: 1123 });
            }
        };

        frame.srcdoc = html;
    });
}

export function printHtml(html) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText =
        'position:fixed;left:-12000px;top:0;width:794px;height:1123px;border:0;pointer-events:none;';
    document.body.appendChild(frame);

    frame.onload = () => {
        window.setTimeout(() => {
            try {
                frame.contentWindow.focus();
                frame.contentWindow.print();
            } catch {
                /* ignora bloqueios do navegador */
            }
            window.setTimeout(() => frame.remove(), 60000);
        }, 300);
    };

    frame.srcdoc = html;
}

export function buildLetterHtml(letterText, { name, contacts }) {
    const contactLine = (contacts || []).map((c) => escapeHtml(c)).join('  ·  ');
    const paragraphs = String(letterText || '')
        .split(/\n\s*\n/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
        .join('\n');

    const today = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Carta de apresentação — ${escapeHtml(name || '')}</title>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: 'Segoe UI', Arial, sans-serif; color: #26313f; }
.page { width: 210mm; min-height: 297mm; padding: 22mm 22mm 20mm; }
.name { font-size: 20pt; font-weight: 800; color: #14202e; }
.contacts { margin-top: 2mm; font-size: 8.8pt; color: #5b6a7d; }
.rule { height: 1.6pt; background: #1f5fbf; margin: 6mm 0 9mm; }
.date { font-size: 9.5pt; color: #6b7a8c; margin-bottom: 8mm; }
.subject { font-size: 10pt; font-weight: 700; color: #14202e; margin-bottom: 7mm; }
p { font-size: 10.4pt; line-height: 1.62; color: #334154; margin: 0 0 4.5mm; text-align: justify; }
.signature { margin-top: 10mm; font-size: 10pt; color: #334154; }
</style>
</head>
<body>
<div class="page">
    <div class="name">${escapeHtml(name || '')}</div>
    ${contactLine ? `<div class="contacts">${contactLine}</div>` : ''}
    <div class="rule"></div>
    <div class="date">${escapeHtml(today)}</div>
    ${paragraphs}
</div>
</body>
</html>`;
}
