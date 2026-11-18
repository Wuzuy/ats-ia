/* Geração de PDF A4 em texto com pdfmake. */

import { slugify } from './resume.js';

const ACCENT = '#1f5fbf';
const DARK = '#14202e';
const BODY = '#334154';
const MUTED = '#6b7a8c';
const LINE = '#c8d0da';

const LAYOUTS = [
    { fs: 10.2, gap: 5.8, line: 1.2, margin: [38, 34, 38, 30] },
    { fs: 9.8, gap: 5.2, line: 1.18, margin: [38, 32, 38, 28] },
    { fs: 9.4, gap: 4.6, line: 1.16, margin: [36, 30, 36, 26] },
    { fs: 9.0, gap: 4.0, line: 1.14, margin: [34, 28, 34, 24] },
    { fs: 8.6, gap: 3.4, line: 1.12, margin: [32, 26, 32, 22] },
    { fs: 8.2, gap: 2.8, line: 1.1, margin: [30, 24, 30, 20] },
];

function sectionTitle(text, layout) {
    return {
        text: text.toUpperCase(),
        fontSize: layout.fs * 0.9,
        bold: true,
        color: ACCENT,
        characterSpacing: 0.9,
        margin: [0, layout.gap, 0, layout.gap * 0.45],
    };
}

function divider(layout) {
    return {
        canvas: [
            {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 539,
                y2: 0,
                lineWidth: 1.2,
                lineColor: ACCENT,
            },
        ],
        margin: [0, layout.gap * 0.9, 0, 0],
    };
}

function buildDocDefinition(resume, layout) {
    const content = [];
    const fs = layout.fs;
    const lineHeight = layout.line;

    content.push({
        text: resume.name,
        fontSize: fs * 2.2,
        bold: true,
        color: DARK,
        lineHeight: 1.05,
    });

    if (resume.headline) {
        content.push({
            text: resume.headline.toUpperCase(),
            fontSize: fs * 0.82,
            bold: true,
            color: ACCENT,
            characterSpacing: 0.7,
            margin: [0, 3, 0, 0],
        });
    }

    if (resume.contacts.length) {
        content.push({
            text: resume.contacts.map((contact) => contact.value).join('   •   '),
            fontSize: fs * 0.78,
            color: '#4e5d70',
            margin: [0, 5, 0, 0],
        });
    }

    content.push(divider(layout));

    if (resume.summary) {
        content.push(sectionTitle('Resumo', layout));
        content.push({
            text: resume.summary,
            fontSize: fs * 0.94,
            color: BODY,
            lineHeight,
            alignment: 'justify',
        });
    }

    if (resume.skills.length) {
        content.push(sectionTitle('Competências', layout));
        resume.skills.forEach((group) => {
            content.push({
                text: [
                    { text: `${group.group}: `, bold: true, color: DARK },
                    { text: group.items.join(' · '), color: BODY },
                ],
                fontSize: fs * 0.93,
                lineHeight,
                margin: [0, 0, 0, 1.6],
            });
        });
    }

    if (resume.experience.length) {
        content.push(sectionTitle('Experiência', layout));
        resume.experience.forEach((item) => {
            content.push({
                columns: [
                    { text: item.role, bold: true, color: DARK, fontSize: fs },
                    {
                        text: item.period,
                        alignment: 'right',
                        color: MUTED,
                        fontSize: fs * 0.8,
                    },
                ],
                margin: [0, 0, 0, 0.6],
            });
            if (item.company) {
                content.push({
                    text: item.company,
                    color: ACCENT,
                    fontSize: fs * 0.9,
                    margin: [0, 0, 0, 1.2],
                });
            }
            if (item.bullets.length) {
                content.push({
                    ul: item.bullets,
                    fontSize: fs * 0.9,
                    color: BODY,
                    lineHeight,
                    margin: [6, 1, 0, layout.gap * 0.55],
                    markerColor: ACCENT,
                });
            } else {
                content.push({ text: '', margin: [0, 0, 0, layout.gap * 0.5] });
            }
        });
    }

    if (resume.projects.length) {
        content.push(sectionTitle('Projetos', layout));
        resume.projects.forEach((item) => {
            content.push({
                text: [
                    { text: item.name ? `${item.name} — ` : '', bold: true, color: DARK },
                    { text: item.description, color: BODY },
                ],
                fontSize: fs * 0.92,
                lineHeight,
                margin: [0, 0, 0, 2],
            });
        });
    }

    if (resume.education.length) {
        content.push(sectionTitle('Formação', layout));
        resume.education.forEach((item) => {
            content.push({
                columns: [
                    { text: item.course, bold: true, color: DARK, fontSize: fs * 0.96 },
                    {
                        text: item.period,
                        alignment: 'right',
                        color: MUTED,
                        fontSize: fs * 0.8,
                    },
                ],
            });
            if (item.school) {
                content.push({
                    text: item.school,
                    color: '#4e5d70',
                    fontSize: fs * 0.88,
                    margin: [0, 0.5, 0, 2.4],
                });
            }
        });
    }

    if (resume.courses.length) {
        content.push(sectionTitle('Cursos', layout));
        resume.courses.forEach((item) => {
            const detail = [item.issuer, item.year].filter(Boolean).join(' · ');
            content.push({
                text: [
                    { text: item.name, color: BODY },
                    ...(detail ? [{ text: ` — ${detail}`, color: MUTED }] : []),
                ],
                fontSize: fs * 0.88,
                lineHeight: 1.35,
                margin: [0, 0, 0, 0.8],
            });
        });
    }

    if (resume.languages.length) {
        content.push(sectionTitle('Idiomas', layout));
        resume.languages.forEach((item) => {
            content.push({
                text: [
                    { text: item.name, bold: true, color: DARK },
                    ...(item.level ? [{ text: ` — ${item.level}`, color: BODY }] : []),
                ],
                fontSize: fs * 0.9,
                margin: [0, 0, 0, 0.8],
            });
        });
    }

    return {
        pageSize: 'A4',
        pageMargins: layout.margin,
        defaultStyle: {
            font: 'Roboto',
            fontSize: fs,
            color: BODY,
            lineHeight,
        },
        content,
        info: {
            title: `${resume.name} — Currículo`,
            author: resume.name,
            subject: 'Currículo adaptado para ATS',
            creator: 'ATS.IA',
        },
    };
}

function getBlob(docDefinition) {
    return new Promise((resolve, reject) => {
        try {
            window.pdfMake.createPdf(docDefinition).getBlob((blob) => resolve(blob));
        } catch (error) {
            reject(error);
        }
    });
}

async function countPdfPages(blob) {
    const buffer = await blob.arrayBuffer();
    const raw = new TextDecoder('latin1').decode(buffer);
    const matches = raw.match(/\/Type\s*\/Page(?!s)/g);
    return matches ? matches.length : 1;
}

export async function generatePdf(resume) {
    if (!window.pdfMake) {
        throw new Error('A biblioteca de PDF não carregou. Verifique sua conexão e recarregue a página.');
    }

    let last = null;
    for (const layout of LAYOUTS) {
        const blob = await getBlob(buildDocDefinition(resume, layout));
        const pages = await countPdfPages(blob);
        last = { blob, pages, layout };
        if (pages <= 1) break;
    }

    return {
        blob: last.blob,
        pages: last.pages,
        compacted: last.layout !== LAYOUTS[0],
        filename: `curriculo-${slugify(resume.name) || 'ats'}.pdf`,
    };
}
