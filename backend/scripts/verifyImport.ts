import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fingerprint, normalizeReports } from './reportMigration.ts';

const backup = JSON.parse(await readFile(process.argv[2], 'utf8')) as { reports: Record<string, unknown>[]; sha256: string };
const source = normalizeReports(backup.reports, 'supabase');
assert.equal(fingerprint(source), backup.sha256, 'Backup fingerprint mismatch');
const result = JSON.parse(execFileSync('node_modules/.bin/wrangler', ['d1', 'execute', 'berlin-public-community', '--remote', '--command', 'SELECT * FROM reports ORDER BY id', '--json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })) as { results: Record<string, unknown>[] }[];
const destination = normalizeReports(result[0].results, 'd1');
assert.equal(destination.length, source.length, 'Imported row count mismatch');
assert.equal(fingerprint(destination), backup.sha256, 'Imported reports differ from the verified source');
console.log(JSON.stringify({ verified: true, rowCount: destination.length, sha256: fingerprint(destination) }));
