/**
 * Proxy opcional para OpenCode Zen (Cloudflare Worker).
 *
 * O site é estático e fala com o Gemini direto do navegador. A API do
 * OpenCode Zen não libera CORS para o navegador, então este Worker faz a
 * ponte e guarda a chave como secret — ela nunca vai para o frontend.
 *
 * Deploy:
 *   npm create cloudflare@latest -- ats-ia-proxy
 *   (cole este arquivo em src/index.js)
 *   npx wrangler secret put OPENCODE_API_KEY
 *   npx wrangler secret put APP_TOKEN
 *   npx wrangler deploy
 *
 * No site, use "OpenAI-compatível":
 *   Base URL: https://SEU-WORKER.workers.dev
 *   API key:  o valor de APP_TOKEN
 *   Modelo:   deepseek-v4.1-flash-free
 */

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-app-token',
    'Access-Control-Max-Age': '86400',
};

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS });
        }

        if (request.method !== 'POST') {
            return json({ error: 'Use POST em /chat/completions.' }, 405);
        }

        const url = new URL(request.url);
        if (!/\/chat\/completions\/?$/.test(url.pathname)) {
            return json({ error: 'Rota não encontrada. Use /chat/completions.' }, 404);
        }

        const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
        const appToken = request.headers.get('x-app-token') || '';
        if (env.APP_TOKEN && token !== env.APP_TOKEN && appToken !== env.APP_TOKEN) {
            return json({ error: 'Token do app inválido.' }, 401);
        }

        if (!env.OPENCODE_API_KEY) {
            return json({ error: 'OPENCODE_API_KEY não configurada no Worker.' }, 500);
        }

        const body = await request.text();

        const upstream = await fetch('https://opencode.ai/zen/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.OPENCODE_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'ats-ia-proxy/1.0',
            },
            body,
        });

        const text = await upstream.text();
        return new Response(text, {
            status: upstream.status,
            headers: {
                ...CORS,
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    },
};

function json(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
    });
}
