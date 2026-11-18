/* Demonstração com dados fictícios e design próprio. */

const demoHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Marina Costa — Currículo</title>
<style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #243244; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 210mm; min-height: 297mm; display: flex; background: #fff; }
    .side { width: 64mm; background: #102a49; color: #eaf1fa; padding: 13mm 8mm; }
    .main { flex: 1; padding: 13mm 12mm 11mm; }
    .photo { width: 28mm; height: 28mm; border-radius: 50%; background: linear-gradient(145deg, #5b9bd5, #22d3ee); display: grid; place-items: center; font-size: 18pt; font-weight: 800; color: #06111f; margin-bottom: 7mm; }
    .side h2 { font-size: 8pt; letter-spacing: 1.6px; text-transform: uppercase; color: #7fb0ff; border-bottom: 1px solid rgba(255,255,255,.18); padding-bottom: 2mm; margin: 7mm 0 3mm; }
    .side p, .side li { font-size: 8.1pt; line-height: 1.5; color: #c6d5e6; }
    .side ul { list-style: none; }
    .side li { margin-bottom: 1.4mm; }
    .side strong { color: #fff; font-weight: 600; }
    .name { font-size: 25pt; line-height: 1.02; font-weight: 800; color: #102a49; letter-spacing: -0.6px; }
    .role { margin-top: 2mm; font-size: 9.2pt; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: #1f5fbf; }
    .contact { margin-top: 3mm; font-size: 8.2pt; color: #5b6a7d; line-height: 1.5; }
    .rule { height: 1.5pt; background: #1f5fbf; margin: 5mm 0 6mm; }
    .section { margin-bottom: 5mm; }
    .section h3 { font-size: 8.4pt; letter-spacing: 1.5px; text-transform: uppercase; color: #1f5fbf; border-bottom: 0.8pt solid #d4dce6; padding-bottom: 1.2mm; margin-bottom: 2.5mm; }
    .summary { font-size: 9pt; line-height: 1.5; color: #334154; text-align: justify; }
    .item { margin-bottom: 3mm; }
    .item-head { display: flex; justify-content: space-between; gap: 4mm; }
    .item-title { font-size: 9.4pt; font-weight: 700; color: #102a49; }
    .item-period { font-size: 7.8pt; color: #6b7a8c; white-space: nowrap; }
    .item-sub { font-size: 8.5pt; color: #1f5fbf; margin: 0.3mm 0 1.2mm; }
    .item p, .bullets li { font-size: 8.6pt; line-height: 1.45; color: #334154; }
    .bullets { margin-left: 4mm; }
    .bullets li { margin-bottom: 0.6mm; }
    .skills { font-size: 8.6pt; line-height: 1.6; color: #334154; }
    .skills strong { color: #102a49; }
</style>
</head>
<body>
<div class="page">
    <aside class="side">
        <div class="photo">MC</div>
        <h2>Contato</h2>
        <p>marina.costa@email.com<br>(11) 98888-0000<br>São Paulo, SP</p>
        <h2>Links</h2>
        <p>linkedin.com/in/marinacosta<br>github.com/marinacosta</p>
        <h2>Competências</h2>
        <ul>
            <li><strong>Front-end</strong><br>React, JavaScript, HTML5, CSS3, Tailwind</li>
            <li><strong>Ferramentas</strong><br>Git, GitHub, Figma, Vite</li>
            <li><strong>APIs e dados</strong><br>REST, Fetch API, SQL básico</li>
        </ul>
        <h2>Idiomas</h2>
        <p>Português — Nativo<br>Inglês — Intermediário</p>
    </aside>
    <main class="main">
        <div class="name">Marina Costa</div>
        <div class="role">Desenvolvedora Front-end Júnior</div>
        <div class="contact">React · JavaScript · Interfaces responsivas · APIs REST</div>
        <div class="rule"></div>

        <section class="section">
            <h3>Resumo</h3>
            <p class="summary">Desenvolvedora front-end em formação, com foco em React, JavaScript e interfaces responsivas. Experiência com consumo de APIs REST, Git e colaboração em equipe. Busco estágio para evoluir tecnicamente e entregar interfaces acessíveis e bem estruturadas.</p>
        </section>

        <section class="section">
            <h3>Experiência</h3>
            <div class="item">
                <div class="item-head"><span class="item-title">Estagiária de Desenvolvimento</span><span class="item-period">2025 — atual</span></div>
                <div class="item-sub">Aurora Tech</div>
                <ul class="bullets">
                    <li>Desenvolvi telas responsivas em React e CSS para um painel interno usado por 40 pessoas.</li>
                    <li>Integrei sete endpoints REST, reduzindo o retrabalho manual do atendimento.</li>
                    <li>Documentei componentes e fluxos no Figma e no GitHub.</li>
                </ul>
            </div>
            <div class="item">
                <div class="item-head"><span class="item-title">Projeto voluntário</span><span class="item-period">2024</span></div>
                <div class="item-sub">Comunidade Dev</div>
                <ul class="bullets">
                    <li>Criei uma landing page acessível para divulgação de eventos gratuitos de tecnologia.</li>
                </ul>
            </div>
        </section>

        <section class="section">
            <h3>Projetos</h3>
            <div class="item">
                <p><strong>TaskFlow</strong> — Gerenciador de tarefas em React com filtros e persistência local. Interface responsiva e atalhos de teclado.</p>
            </div>
            <div class="item">
                <p><strong>Conversor de Moedas</strong> — Aplicação em JavaScript que consome API de câmbio e converte Real para Dólar e Euro.</p>
            </div>
            <div class="item">
                <p><strong>Painel de Contatos</strong> — Página responsiva com busca e agrupamento de contatos de serviços públicos.</p>
            </div>
        </section>

        <section class="section">
            <h3>Formação</h3>
            <div class="item">
                <div class="item-head"><span class="item-title">Técnico em Desenvolvimento de Sistemas</span><span class="item-period">2025 — 2026</span></div>
                <div class="item-sub">Firjan SENAI</div>
            </div>
            <div class="item">
                <div class="item-head"><span class="item-title">Ensino Médio</span><span class="item-period">Conclusão em 2026</span></div>
                <div class="item-sub">Escola Estadual Vila Nova</div>
            </div>
        </section>

        <section class="section" style="margin-bottom:0">
            <h3>Cursos</h3>
            <p class="skills">JavaScript do Zero ao Avançado — Curso em Vídeo · 2025<br>Git e GitHub — Curso em Vídeo · 2025<br>React: Desenvolvendo com JavaScript — Alura · 2025</p>
        </section>
    </main>
</div>
</body>
</html>`;

const demoLetter = `Prezada equipe da Aurora Tech,

Quero me candidatar à vaga de estágio em Front-end. Acompanho a Aurora Tech pelo cuidado com produtos digitais e acredito que posso contribuir com a construção de interfaces claras, responsivas e fáceis de manter.

No meu estágio atual, desenvolvo telas em React e CSS para um painel interno usado por 40 pessoas e integro endpoints REST que reduzem trabalho manual. Também participo da documentação de componentes no Figma e no GitHub, o que me ajudou a entender a importância de consistência entre design e código.

Sou organizada, aprendo rápido e gosto de trabalhar em colaboração. Tenho interesse especial em acessibilidade e performance, e busco evoluir com feedback próximo do time. Ficaria feliz em conversar sobre como posso ajudar nos próximos desafios da Aurora Tech.

Atenciosamente,
Marina Costa`;

export function createDemo() {
    return {
        html: demoHtml,
        coverLetter: demoLetter,
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
            ],
            keywordsMissing: ['TypeScript', 'Testes automatizados'],
            changes: [
                'Resumo alinhado à vaga, mantendo o histórico real.',
                'Experiência reescrita com React, responsividade e APIs REST.',
                'Projetos ganharam contexto de problema e solução.',
                'Competências e cursos reordenados por relevância.',
            ],
            gaps: [
                'TypeScript não consta no currículo-base; não foi adicionado.',
                'Testes automatizados não têm evidência em cursos ou projetos.',
            ],
        },
        selfReview: [
            'Contatos, nome e datas preservados.',
            'Nenhuma experiência ou tecnologia inventada.',
            'HTML original mantido, com apenas textos ajustados.',
            'Conteúdo permanece em uma página A4.',
            'Palavras-chave principais cobertas no resumo e nas competências.',
        ],
        demo: true,
    };
}
