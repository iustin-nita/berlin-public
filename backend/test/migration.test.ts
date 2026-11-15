import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { fingerprint, importSql, normalizeReports } from '../scripts/reportMigration.ts';

test('migration preserves all fields, handles SQL quoting and does not overwrite newer votes', async () => {
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("test"); } };', d1Databases: ['DB'] }));
  try {
    const db = await mf.getD1Database('DB');
    await db.exec((await readFile(new URL('../migrations/0001_reports.sql', import.meta.url), 'utf8')).replace(/\n/g, ' '));
    const source = normalizeReports([{ id: 'source-id', feature_id: "test'feature", status: 'working', device_id: 'existingDevice01', created_at: '2026-08-01T12:00:00.123Z', lat: 52.5, lng: 13.4, app_version: '1.0.0' }], 'supabase');
    await db.exec(importSql(source));
    await db.exec(importSql(source));
    const destination = normalizeReports((await db.prepare('SELECT * FROM reports').all()).results, 'd1');
    assert.equal(destination.length, 1);
    assert.equal(fingerprint(destination), fingerprint(source));
    await db.prepare('UPDATE reports SET status = ?, created_at = ?').bind('not_working', source[0].created_at + 1000).run();
    await db.exec(importSql(source));
    const updated = await db.prepare('SELECT status, created_at FROM reports').first();
    assert.equal(updated?.status, 'not_working');
    assert.equal(updated?.created_at, source[0].created_at + 1000);
  } finally { await mf.dispose(); }
});

test('invalid or duplicate source data aborts instead of losing rows', () => {
  const report = { id: 'source-id', feature_id: 'test', status: 'working', device_id: 'existingDevice01', created_at: '2026-08-01T12:00:00Z' };
  assert.throws(() => normalizeReports([report, { ...report, id: 'second-id' }], 'supabase'), /Duplicate/);
  assert.throws(() => normalizeReports([{ ...report, created_at: 'invalid' }], 'supabase'), /Invalid/);
  assert.throws(() => normalizeReports([{ ...report, lat: 100 }], 'supabase'), /Invalid/);
});
