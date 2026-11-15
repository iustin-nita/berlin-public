import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import worker, { type Env } from '../src/index.ts';

let mf: Miniflare;
let env: Env;
const deviceId = 'testDevice000001';
const allow = { limit: async () => ({ success: true }) } as RateLimit;

before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("test"); } };', d1Databases: ['DB'] }));
  const db = await mf.getD1Database('DB');
  await db.exec((await readFile(new URL('../migrations/0001_reports.sql', import.meta.url), 'utf8')).replace(/\n/g, ' '));
  env = { DB: db as unknown as D1Database, READ_LIMITER: allow, WRITE_LIMITER: allow, IP_LIMITER: allow, IP_WRITE_LIMITER: allow };
});
after(async () => { await mf?.dispose(); });
beforeEach(async () => {
  await env.DB.prepare('DELETE FROM reports').run();
  env.READ_LIMITER = allow;
  env.WRITE_LIMITER = allow;
  env.IP_LIMITER = allow;
  env.IP_WRITE_LIMITER = allow;
});

function get(featureId = 'test.feature/1', identity = deviceId): Promise<Response> {
  return worker.fetch(new Request(`https://community.test/v1/status?featureId=${encodeURIComponent(featureId)}`, { headers: { 'X-Device-ID': identity } }), env);
}
function post(body: unknown, identity = deviceId): Promise<Response> {
  return worker.fetch(new Request('https://community.test/v1/reports', { method: 'POST', headers: { 'X-Device-ID': identity, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env);
}
async function seed(id: string, status: string, ageDays: number, identity: string, featureId = 'test.feature/1'): Promise<void> {
  await env.DB.prepare('INSERT INTO reports (id, feature_id, status, device_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, featureId, status, identity, Date.now() - ageDays * 86400000).run();
}

test('empty status is a successful summary, with CORS and no public caching', async () => {
  const response = await get();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { totals: { working: 0, notWorking: 0 }, confidence: 0 });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
});

test('a changed vote preserves one row and refreshes its server timestamp', async () => {
  await seed('original-id', 'working', 30, deviceId);
  const before = Date.now();
  assert.equal((await post({ featureId: 'test.feature/1', status: 'not_working', coordinates: { lat: 52.5, lng: 13.4 }, createdAt: 1 })).status, 201);
  const rows = await env.DB.prepare('SELECT * FROM reports').all();
  assert.equal(rows.results.length, 1);
  assert.equal(rows.results[0].id, 'original-id');
  assert.equal(rows.results[0].status, 'not_working');
  assert.ok(Number(rows.results[0].created_at) >= before);
  const summary = await (await get()).json() as { myVote: string; totals: { working: number; notWorking: number } };
  assert.equal(summary.myVote, 'not_working');
  assert.deepEqual(summary.totals, { working: 0, notWorking: 1 });
});

test('60-day window, raw counts and 14-day decay match the existing semantics', async () => {
  await seed('recent', 'working', 0, 'testDevice000002');
  await seed('old', 'not_working', 14, deviceId);
  await seed('expired', 'not_working', 61, 'testDevice000003');
  const summary = await (await get()).json() as { totals: unknown; confidence: number; lastReport: { status: string }; myVote: string };
  assert.deepEqual(summary.totals, { working: 1, notWorking: 1 });
  assert.ok(Math.abs(summary.confidence - 1 / 3) < 0.00001);
  assert.equal(summary.myVote, 'not_working');
  assert.equal(summary.lastReport.status, 'working');
});

test('30-day reports are counted even with small decay weight', async () => {
  await seed('old', 'working', 30, deviceId);
  const summary = await (await get()).json() as { totals: { working: number }; confidence: number };
  assert.equal(summary.totals.working, 1);
  assert.equal(summary.confidence, 1);
});

test('summaries do not expose other installation IDs, coordinates, or raw rows', async () => {
  await seed('private-id', 'working', 1, 'privateDevice001');
  const summary = await (await get()).text();
  assert.ok(!summary.includes('privateDevice001'));
  assert.ok(!summary.includes('private-id'));
  assert.ok(!summary.includes('device_id'));
  assert.ok(!summary.includes('lat'));
  assert.ok(!summary.includes('myVote'));
});

test('SQL metacharacters in amenity IDs are data, not executable statements', async () => {
  const featureId = "'; DROP TABLE reports; --";
  assert.equal((await post({ featureId, status: 'working' })).status, 201);
  const summary = await (await get(featureId)).json() as { totals: { working: number } };
  assert.equal(summary.totals.working, 1);
  assert.equal((await get()).status, 200);
});

test('invalid statuses, identifiers, coordinates and bodies are rejected without writes', async () => {
  for (const body of [null, [], {}, { featureId: '', status: 'working' }, { featureId: 'test', status: 'unknown' }, { featureId: 'test', status: 'working', coordinates: { lat: 91, lng: 13 } }]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal((await post({ featureId: 'test', status: 'working' }, 'bad')).status, 400);
  assert.equal((await post({ featureId: 'x'.repeat(5000), status: 'working' })).status, 413);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS count FROM reports').first<{ count: number }>())?.count, 0);
});

test('installation and IP limits return 429 without changing data', async () => {
  env.WRITE_LIMITER = { limit: async () => ({ success: false }) } as RateLimit;
  const response = await post({ featureId: 'test', status: 'working' });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  env.READ_LIMITER = { limit: async () => ({ success: false }) } as RateLimit;
  assert.equal((await get()).status, 429);
  env.READ_LIMITER = allow;
  env.IP_LIMITER = { limit: async () => ({ success: false }) } as RateLimit;
  assert.equal((await worker.fetch(new Request('https://community.test/v1/status?featureId=test', { headers: { 'X-Device-ID': deviceId, 'CF-Connecting-IP': '192.0.2.1' } }), env)).status, 429);
});

test('per-IP write limit blocks writes from rotated installation IDs but not reads', async () => {
  env.IP_WRITE_LIMITER = { limit: async () => ({ success: false }) } as RateLimit;
  const headers = (id: string) => ({ 'Content-Type': 'application/json', 'X-Device-ID': id, 'CF-Connecting-IP': '192.0.2.1' });
  for (const id of ['rotated-device-1', 'rotated-device-2']) {
    const response = await worker.fetch(new Request('https://community.test/v1/reports', { method: 'POST', headers: headers(id), body: JSON.stringify({ featureId: 'test', status: 'working' }) }), env);
    assert.equal(response.status, 429);
  }
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS count FROM reports').first<{ count: number }>())?.count, 0);
  assert.equal((await worker.fetch(new Request('https://community.test/v1/status?featureId=test', { headers: headers('rotated-device-1') }), env)).status, 200);
});

test('service failures do not become zero-vote summaries', async () => {
  const broken = { ...env, DB: { batch: async () => { throw new Error('private database details'); } } as unknown as D1Database };
  const response = await worker.fetch(new Request('https://community.test/v1/status?featureId=test', { headers: { 'X-Device-ID': deviceId } }), broken);
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('private database details'));
});

test('health checks the database and method/preflight handling is explicit', async () => {
  assert.equal((await worker.fetch(new Request('https://community.test/health'), env)).status, 200);
  assert.equal((await worker.fetch(new Request('https://community.test/v1/reports'), env)).status, 405);
  assert.equal((await worker.fetch(new Request('https://community.test/v1/reports', { method: 'OPTIONS' }), env)).status, 204);
  assert.equal((await worker.fetch(new Request('https://community.test/reports'), env)).status, 404);
});
