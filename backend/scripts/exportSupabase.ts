import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fingerprint, importSql, normalizeReports } from './reportMigration.ts';

const sourceUrl = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const output = process.argv[2];
if (!sourceUrl || !key || !output) throw new Error('Provide source environment and a private backup output path');
const base = new URL(sourceUrl);
if (base.hostname !== 'ryeqylmoxygkjolhcpme.supabase.co' || base.protocol !== 'https:') throw new Error('Unexpected source project');

async function readAll(): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let total: number | undefined;
  for (;;) {
    const url = new URL('/rest/v1/reports', base);
    url.search = new URLSearchParams({ select: '*', order: 'id.asc', limit: '1000', offset: String(rows.length) }).toString();
    const response = await fetch(url, { headers: { apikey: key!, Authorization: `Bearer ${key}`, Prefer: 'count=exact' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Source reports request failed: HTTP ${response.status}`);
    const expected = Number(response.headers.get('Content-Range')?.split('/')[1]);
    if (!Number.isSafeInteger(expected)) throw new Error('Source did not return an exact count');
    if (total !== undefined && total !== expected) throw new Error('Source changed during pagination; retry the export');
    total = expected;
    const page = await response.json() as Record<string, unknown>[];
    if (!Array.isArray(page)) throw new Error('Invalid source response');
    rows.push(...page);
    if (rows.length === total) return rows;
    if (!page.length || rows.length > total) throw new Error('Incomplete source export');
  }
}

const raw = await readAll();
const normalized = normalizeReports(raw, 'supabase');
const hash = fingerprint(normalized);
if (fingerprint(normalizeReports(await readAll(), 'supabase')) !== hash) throw new Error('Source changed between verification reads; retry the export');
const target = resolve(output);
await mkdir(dirname(target), { recursive: true, mode: 0o700 });
await writeFile(target, JSON.stringify({ source: base.hostname, exportedAt: new Date().toISOString(), rowCount: raw.length, sha256: hash, reports: raw }, null, 2), { mode: 0o600, flag: 'wx' });
await writeFile(`${target}.sql`, importSql(normalized), { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ rowCount: raw.length, sha256: hash, backup: target, sql: `${target}.sql` }));
