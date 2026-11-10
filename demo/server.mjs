import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createAdvisorHandler } from '../server/gift-advisor.mjs';
import { catalog } from './catalog.mjs';
import { memoryStore } from './store.mjs';

const host = '127.0.0.1';
const port = 4184;
const origin = `http://${host}:${port}`;
const store = memoryStore();
// No network request or API key: a local parser simulates a model response.
const mockProvider = async (_url, options) => {
  const input = JSON.parse(options.body).input;
  const profile = globalThis.GiftAdvisorEngine.parseLocal(input);
  return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(profile) }] }] });
};
const handler = createAdvisorHandler({ catalog, getStore: () => store, env: { OPENAI_API_KEY: 'local-demo-only', GIFT_AI_ENABLED: 'true' }, fetchImpl: mockProvider });
const page = await readFile(new URL('./index.html', import.meta.url));
http.createServer(async (req, res) => {
  if (req.url === '/' && req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(page); return; }
  if (req.url !== '/api/gift-advisor') { res.writeHead(404); res.end(); return; }
  try {
    const request = new Request(origin + req.url, { method: req.method, headers: req.headers, ...(req.method === 'POST' ? { body: req, duplex: 'half' } : {}) });
    const response = await handler(request, { ip: 'local-demo' });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(400); res.end(); }
}).listen(port, host, () => console.log(`Lokale Demo: ${origin}`));
