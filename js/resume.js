/* Currículo: normalização, prévia HTML e dados de demonstração. */

export function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    return String(value).replace(/\s+/g, ' ').trim();
};

function cleanList(values, max = 12) {
    return asArray(values)
        .map((v) => asText(v))
        .filter(Boolean)
        .slice(0, max);
}

export function normalizeResult(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const analysis = source.analysis && typeof source.analysis === 'object' ? source.analysis : {};
    const resume = source.resume && typeof source.resume === 'object' ? source.resume : {};

    const normalized = {
        analysis: {
            score: Math.max(0, Math.min(100, Math.round(Number(analysis.score) || 0))),
            jobTitle: asText(analysis.jobTitle, 'Vaga analisada'),
            company: asText(analysis.company, 'Empresa confidencial'),
            keywordsCovered: cleanList(analysis.keywordsCovered, 24),
            keywordsMissing: cleanList(analysis.keywordsMissing, 14),
            changes: cleanList(analysis.changes, 8),
            gaps: cleanList(analysis.gaps, 8),
        },
        resume: {
            name: asText(resume.name, 'Seu nome'),
            headline: asText(resume.headline, ''),
            contacts: asArray(resume.contacts)
                .map((contact) => ({
                    label: asText(contact?.label),
                    value: asText(contact?.value),
                    url: asText(contact?.url),
                }))
                .filter((contact) => contact.value)
                .slice(0, 6),
            summary: asText(resume.summary, '').slice(0, 900),
            skills: asArray(resume.skills)
                .map((group) => ({
                    group: asText(group?.group),
                    items: cleanList(group?.items, 14),
                }))
                .filter((group) => group.group && group.items.length)
                .slice(0, 6),
            experience: asArray(resume.experience)
                .map((item) => ({
                    role: asText(item?.role),
                    company: asText(item?.company),
                    period: asText(item?.period),
                    bullets: cleanList(item?.bullets, 6),
                }))
                .filter((item) => item.role || item.company)
                .slice(0, 5),
            projects: asArray(resume.projects)
                .map((item) => ({
                    name: asText(item?.name),
                    description: asText(item?.description),
                }))
                .filter((item) => item.name || item.description)
                .slice(0, 6),
            education: asArray(resume.education)
                .map((item) => ({
                    course: asText(item?.course),
                    school: asText(item?.school),
                    period: asText(item?.period),
                }))
                .filter((item) => item.course || item.school)
                .slice(0, 4),
            courses: asArray(resume.courses)
                .map((item) => ({
                    name: asText(item?.name),
                    issuer: asText(item?.issuer),
                    year: asText(item?.year),
                }))
                .filter((item) => item.name)
                .slice(0, 8),
            languages: asArray(resume.languages)
                .map((item) => ({
                    name: asText(item?.name),
                    level: asText(item?.level),
                }))
                .filter((item) => item.name)
                .slice(0, 4),
        },
    };

    if (!normalized.analysis.gaps.length && normalized.analysis.keywordsMissing.length) {
        normalized.analysis.gaps = normalized.analysis.keywordsMissing
            .slice(0, 4)
            .map((keyword) => `${keyword}: não consta no currículo-base.`);
    }

    return normalized;
}

function contactLine(contacts) {
    return contacts
        .map((contact) => {
            const label = contact.label ? `${contact.label}: ` : '';
            return `<span class="contact-item">${escapeHtml(label)}${escapeHtml(contact.value)}</span>`;
        })
        .join('<span class="contact-sep">·</span>');
}

const previewStyles = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body {
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        color: #26313f;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .page {
        width: 210mm;
        min-height: 297mm;
        padding: 13mm 15mm 12mm;
        background: #ffffff;
    }
    .name {
        font-size: 22pt;
        line-height: 1.08;
        font-weight: 800;
        letter-spacing: -0.4px;
        color: #14202e;
    }
    .headline {
        margin-top: 1.6mm;
        font-size: 9.6pt;
        font-weight: 700;
        letter-spacing: 1.1px;
        text-transform: uppercase;
        color: #1f5fbf;
    }
    .contacts {
        margin-top: 2.6mm;
        font-size: 8.5pt;
        line-height: 1.5;
        color: #4e5d70;
    }
    .contact-item { white-space: nowrap; }
    .contact-sep { margin: 0 2.2mm; color: #a7b2c1; }
    .divider {
        height: 1.6pt;
        margin: 4mm 0 0;
        background: #1f5fbf;
        border-radius: 2px;
    }
    .section { margin-top: 4.6mm; }
    .section-title {
        margin: 0 0 2mm;
        padding-bottom: 1mm;
        border-bottom: 0.7pt solid #c8d0da;
        font-size: 8.7pt;
        font-weight: 800;
        letter-spacing: 1.3px;
        text-transform: uppercase;
        color: #1f5fbf;
    }
    .summary {
        font-size: 9.2pt;
        line-height: 1.45;
        color: #334154;
        text-align: justify;
    }
    .skill-line {
        font-size: 9pt;
        line-height: 1.48;
        margin-bottom: 0.8mm;
        color: #334154;
    }
    .skill-line strong { color: #14202e; }
    .item { margin-bottom: 2.6mm; }
    .item:last-child { margin-bottom: 0; }
    .item-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 4mm;
    }
    .item-role {
        font-size: 9.6pt;
        font-weight: 700;
        color: #14202e;
    }
    .item-period {
        font-size: 8pt;
        color: #6b7a8c;
        white-space: nowrap;
    }
    .item-sub {
        font-size: 8.8pt;
        color: #1f5fbf;
        margin-top: 0.3mm;
    }
    .bullets {
        margin: 1.1mm 0 0;
        padding-left: 4.4mm;
    }
    .bullets li {
        font-size: 8.9pt;
        line-height: 1.42;
        margin-bottom: 0.5mm;
        color: #334154;
    }
    .project-name { font-weight: 700; color: #14202e; }
    .project-desc { font-size: 8.9pt; line-height: 1.42; color: #334154; }
    .edu-head { font-size: 9.3pt; font-weight: 700; color: #14202e; }
    .edu-school { font-size: 8.7pt; color: #4e5d70; }
    .edu-period { font-size: 8pt; color: #6b7a8c; }
    .course-line {
        font-size: 8.7pt;
        line-height: 1.5;
        color: #334154;
        margin-bottom: 0.4mm;
    }
    .course-line .muted { color: #6b7a8c; }
    .lang-line { font-size: 8.9pt; color: #334154; margin-bottom: 0.5mm; }
    .empty { color: #8a96a6; font-size: 8.8pt; }
`;

export function buildResumeHtml(resume, { standalone = false } = {}) {
    const sections = [];

    if (resume.summary) {
        sections.push(`<section class="section">
            <h2 class="section-title">Resumo</h2>
            <p class="summary">${escapeHtml(resume.summary)}</p>
        </section>`);
    }

    if (resume.skills.length) {
        sections.push(`<section class="section">
            <h2 class="section-title">Competências</h2>
            ${resume.skills
                .map(
                    (group) =>
                        `<p class="skill-line"><strong>${escapeHtml(group.group)}:</strong> ${group.items
                            .map((item) => escapeHtml(item))
                            .join(' · ')}</p>`
                )
                .join('')}
        </section>`);
    }

    if (resume.experience.length) {
        sections.push(`<section class="section">
            <h2 class="section-title">Experiência</h2>
            ${resume.experience
                .map(
                    (item) => `<div class="item">
                        <div class="item-head">
                            <span class="item-role">${escapeHtml(item.role)}</span>
                            <span class="item-period">${escapeHtml(item.period)}</span>
                        </div>
                        ${item.company ? `<div class="item-sub">${escapeHtml(item.company)}</div>` : ''}
                        ${
                            item.bullets.length
                                ? `<ul class="bullets">${item.bullets
                                      .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
                                      .join('')}</ul>`
                                : ''
                        }
                    </div>`
                )
                .join('')}
        </section>`);
    }

    if (resume.projects.length) {
        sections.push(`<section class="section">
            <h2 class="section-title">Projetos</h2>
            ${resume.projects
                .map(
                    (item) => `<div class="item">
                        <p class="project-desc"><span class="project-name">${escapeHtml(
                            item.name
                        )}</span>${item.name && item.description ? ' — ' : ''}${escapeHtml(
                            item.description
                        )}</p>
                    </div>`
                )
                .join('')}
        </section>`);
    }

    if (resume.education.length) {
        sections.push(`<section class="section">
            <h2 class="section-title">Formação</h2>
            ${resume.education
                .map(
                    (item) => `<div class="item">
                        <div class="item-head">
                            <span class="edu-head">${escapeHtml(item.course)}</span>
                            <span class="edu-period">${escapeHtml(item.period)}</span>
                        </div>
                        ${item.school ? `<div class="edu-school">${escapeHtml(item.school)}</div>` : ''}
                    </div>`
                )
                .join('')}
        </section>`);
    }

    if (resume.courses.length) {
        sections.push(`<section class="section">
            <h2 class="section-title">Cursos</h2>
            ${resume.courses
                .map(
                    (item) => `<p class="course-line">${escapeHtml(item.name)}${
                        item.issuer || item.year
                            ? ` <span class="muted">— ${escapeHtml(
                                  [item.issuer, item.year].filter(Boolean).join(' · ')
                              )}</span>`
                            : ''
                    }</p>`
                )
                .join('')}
        </section>`);
    }

    if (resume.languages.length) {
        sections.push(`<section class="section">
            <h2 class="section-title">Idiomas</h2>
            ${resume.languages
                .map(
                    (item) =>
                        `<p class="lang-line"><strong>${escapeHtml(item.name)}</strong>${
                            item.level ? ` — ${escapeHtml(item.level)}` : ''
                        }</p>`
                )
                .join('')}
        </section>`);
    }

    const title = `${resume.name || 'Currículo'} — Currículo`;
    const head = standalone
        ? `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${previewStyles}</style>
</head>
<body>`
        : `<style>${previewStyles}</style>`;

    return `${head}
<div class="page">
    <header>
        <div class="name">${escapeHtml(resume.name)}</div>
        ${resume.headline ? `<div class="headline">${escapeHtml(resume.headline)}</div>` : ''}
        <div class="contacts">${contactLine(resume.contacts)}</div>
        <div class="divider"></div>
    </header>
    ${sections.join('\n') || '<p class="empty">Sem conteúdo suficiente para montar o currículo.</p>'}
</div>
${standalone ? '</body>\n</html>' : ''}`;
}

const normalizeContactKey = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/^mailto:|^tel:/g, '')
        .replace(/[^a-z0-9@.+]/g, '');

export function extractIdentity(html) {
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const text = (doc.body?.textContent || '').replace(/\s+/g, ' ');
        const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
        const phone = text.match(/(?:\+55\s?)?\(?\d{2}\)?\s?9?\d{4}[-.\s]?\d{4}/);
        const linkedin = text.match(/linkedin\.com\/in\/[\w-]+/i);
        const github = text.match(/github\.com\/[\w-]+/i);
        const nameEl = doc.querySelector('.name, h1, [class*="nome"]');
        let name = nameEl?.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (!name) {
            const title = doc.querySelector('title')?.textContent || '';
            name = title.replace(/^curr[ií]culo\s*[-–—:]\s*/i, '').trim();
        }

        const contacts = [];
        if (email) contacts.push({ label: 'E-mail', value: email[0], url: `mailto:${email[0]}` });
        if (phone) contacts.push({ label: 'Telefone', value: phone[0].trim(), url: '' });
        if (linkedin) {
            contacts.push({
                label: 'LinkedIn',
                value: linkedin[0],
                url: `https://${linkedin[0]}`,
            });
        }
        if (github) {
            contacts.push({
                label: 'GitHub',
                value: github[0],
                url: `https://${github[0]}`,
            });
        }

        return { name, contacts };
    } catch {
        return { name: '', contacts: [] };
    }
}

export function mergeIdentity(result, identity) {
    if (!identity) return result;
    if (identity.name) result.resume.name = identity.name;

    const merged = [];
    const seen = new Set();
    const add = (contact) => {
        const key = normalizeContactKey(contact.value);
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(contact);
    };

    identity.contacts.forEach(add);
    result.resume.contacts.forEach(add);
    result.resume.contacts = merged.slice(0, 7);
    return result;
}

export function slugify(value = '') {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
}

export function createDemoResult() {
    return normalizeResult({
        analysis: {
            score: 91,
            jobTitle: 'Estágio em Front-end',
            company: 'Aurora Tech',
            keywordsCovered: [
                'React',
                'JavaScript',
                'HTML5',
                'CSS3',
                'Git',
                'GitHub',
                'REST API',
                'Figma',
                'Responsividade',
                'Trabalho em equipe',
            ],
            keywordsMissing: ['TypeScript', 'Testes automatizados'],
            changes: [
                'Resumo reescrito para destacar React, responsividade e APIs REST.',
                'Competências reordenadas com as tecnologias citadas na vaga no topo.',
                'Projetos acadêmicos ganharam contexto de problema, solução e tecnologias.',
                'Cursos de Git e JavaScript foram priorizados na seção de formação complementar.',
                'Idiomas e formação mantidos exatamente como no currículo-base.',
            ],
            gaps: [
                'TypeScript não aparece no currículo-base; não foi adicionado.',
                'Testes automatizados não têm evidência em cursos ou projetos.',
            ],
        },
        resume: {
            name: 'Marina Costa',
            headline: 'Desenvolvedora Front-end Júnior',
            contacts: [
                { label: 'E-mail', value: 'marina.costa@email.com', url: '' },
                { label: 'LinkedIn', value: 'linkedin.com/in/marinacosta', url: '' },
                { label: 'GitHub', value: 'github.com/marinacosta', url: '' },
                { label: '', value: 'São Paulo, SP', url: '' },
            ],
            summary:
                'Desenvolvedora front-end em formação, com foco em React, JavaScript e interfaces responsivas. Experiência com consumo de APIs REST, Git e colaboração em equipe. Busco estágio para evoluir tecnicamente e entregar interfaces acessíveis e bem estruturadas.',
            skills: [
                {
                    group: 'Front-end',
                    items: ['React', 'JavaScript (ES6+)', 'HTML5', 'CSS3', 'Tailwind CSS'],
                },
                {
                    group: 'Ferramentas',
                    items: ['Git', 'GitHub', 'Figma', 'Vite', 'VS Code'],
                },
                {
                    group: 'APIs e dados',
                    items: ['REST APIs', 'Fetch API', 'SQL básico'],
                },
                {
                    group: 'Soft skills',
                    items: ['Comunicação', 'Colaboração', 'Organização', 'Aprendizado contínuo'],
                },
            ],
            experience: [
                {
                    role: 'Estagiária de Desenvolvimento',
                    company: 'Aurora Tech',
                    period: '2025 — atual',
                    bullets: [
                        'Desenvolvi telas responsivas em React e CSS para um painel interno usado por 40 pessoas.',
                        'Integrei sete endpoints REST, reduzindo o retrabalho manual da equipe de atendimento.',
                        'Documentei componentes e fluxos no Figma e no GitHub para facilitar a manutenção.',
                    ],
                },
                {
                    role: 'Projeto voluntário',
                    company: 'Comunidade Dev',
                    period: '2024',
                    bullets: [
                        'Criei uma landing page acessível para divulgação de eventos gratuitos de tecnologia.',
                        'Trabalhei em dupla com design e revisei o código antes da publicação.',
                    ],
                },
            ],
            projects: [
                {
                    name: 'TaskFlow',
                    description:
                        'Gerenciador de tarefas em React com criação, filtros e persistência local. Interface responsiva e atalhos de teclado.',
                },
                {
                    name: 'Conversor de Moedas',
                    description:
                        'Aplicação em JavaScript que consome API de câmbio e converte Real para Dólar e Euro em tempo real.',
                },
                {
                    name: 'Painel de Contatos',
                    description:
                        'Página responsiva com busca e agrupamento de contatos de serviços públicos, feita com HTML, CSS e JavaScript puro.',
                },
            ],
            education: [
                {
                    course: 'Técnico em Desenvolvimento de Sistemas',
                    school: 'Firjan SENAI',
                    period: '2025 — 2026',
                },
                {
                    course: 'Ensino Médio',
                    school: 'Escola Estadual Vila Nova',
                    period: 'Conclusão em 2026',
                },
            ],
            courses: [
                { name: 'JavaScript do Zero ao Avançado', issuer: 'Curso em Vídeo', year: '2025' },
                { name: 'Git e GitHub', issuer: 'Curso em Vídeo', year: '2025' },
                { name: 'React: Desenvolvendo com JavaScript', issuer: 'Alura', year: '2025' },
                { name: 'Introdução à Segurança da Informação', issuer: 'Cisco', year: '2024' },
            ],
            languages: [
                { name: 'Português', level: 'Nativo' },
                { name: 'Inglês', level: 'Intermediário' },
            ],
        },
    });
}
