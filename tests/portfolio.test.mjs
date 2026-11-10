import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdvisorHandler } from '../server/gift-advisor.mjs';
import { catalog } from '../demo/catalog.mjs';
import { memoryStore } from '../demo/store.mjs';

const engine = globalThis.GiftAdvisorEngine;
const base = { ...engine.empty(), age: 22, audience: 'adult', topics: ['nature'], budgetMax: 30 };
test('Katalogauswahl respektiert Budget und gibt nur vorhandene Produkte aus', () => {
  const result = engine.recommend(catalog, base);
  assert.ok(result.products.length > 0);
  assert.ok(result.products.every(p => p.priceAmount <= 30 && catalog.products.some(x => x.id === p.id)));
  assert.equal(engine.recommend(catalog, { ...base, budgetMax: 10 }).products.length, 0);
});
test('Für Kinder ohne Altersangabe wird nachgefragt', () => {
  const result = engine.recommend(catalog, { ...engine.empty(), audience: 'child', topics: ['games'] });
  assert.match(result.question, /alt/i);
  assert.deepEqual(result.products, []);
});
test('Ein Modell kann ein ausdrücklich genanntes Budget nicht lockern', async () => {
  const store = memoryStore();
  let calls = 0;
  const handler = createAdvisorHandler({ catalog, getStore: () => store, env: { OPENAI_API_KEY: 'dummy', GIFT_AI_ENABLED: 'true' }, fetchImpl: async () => {
    calls++;
    const profile = { ...base, budgetMax: 100 };
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(profile) }] }] });
  }});
  const request = new Request('http://localhost/api/gift-advisor', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify({ description: 'Sie ist 22 Jahre alt, mag Wald und Picknick, bis 20 Euro', consent: true }) });
  const response = await handler(request, { ip: 'test' });
  assert.equal(response.status, 200); assert.equal(calls, 1);
  const result = await response.json();
  assert.equal(result.profile.budgetMax, 20);
  assert.equal(result.products.length, 0);
});
test('Ohne Freigabe oder bei fremdem Origin erfolgt kein Modellaufruf', async () => {
  let calls = 0;
  const handler = createAdvisorHandler({ catalog, getStore: memoryStore, env: { OPENAI_API_KEY: 'dummy', GIFT_AI_ENABLED: 'true' }, fetchImpl: async () => { calls++; throw Error('unexpected'); } });
  for (const [origin, consent, status] of [['http://localhost', false, 400], ['https://elsewhere.test', true, 403]]) {
    const request = new Request('http://localhost/api/gift-advisor', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ description: 'Ein ausreichend langer Beispieltext', consent }) });
    assert.equal((await handler(request, { ip: 'test' })).status, status);
  }
  assert.equal(calls, 0);
});
