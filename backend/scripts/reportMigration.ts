import { createHash } from 'node:crypto';

export interface MigratedReport {
  id: string; feature_id: string; status: 'working' | 'not_working'; device_id: string;
  created_at: number; lat: number | null; lng: number | null; app_version: string | null;
}

export function normalizeReports(rows: Record<string, unknown>[], source: 'supabase' | 'd1'): MigratedReport[] {
  const identities = new Set<string>();
  const ids = new Set<string>();
  return rows.map((row, index): MigratedReport => {
    const createdAt = source === 'supabase' ? Date.parse(String(row.created_at)) : Number(row.created_at);
    if (typeof row.id !== 'string' || !row.id ||
        typeof row.feature_id !== 'string' || !row.feature_id.trim() || row.feature_id.length > 512 || /[\u0000-\u001f\u007f]/.test(row.feature_id) ||
        typeof row.device_id !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(row.device_id) ||
        (row.status !== 'working' && row.status !== 'not_working') || !Number.isSafeInteger(createdAt) ||
        (row.lat != null && (typeof row.lat !== 'number' || !Number.isFinite(row.lat) || Math.abs(row.lat) > 90)) ||
        (row.lng != null && (typeof row.lng !== 'number' || !Number.isFinite(row.lng) || Math.abs(row.lng) > 180)) ||
        (row.app_version != null && typeof row.app_version !== 'string')) throw new Error(`Invalid source report at row ${index}; nothing imported`);
    const identity = JSON.stringify([row.feature_id, row.device_id]);
    if (identities.has(identity) || ids.has(row.id)) throw new Error('Duplicate source identities; nothing imported');
    identities.add(identity); ids.add(row.id);
    return { id: row.id, feature_id: row.feature_id, status: row.status, device_id: row.device_id, created_at: createdAt, lat: row.lat as number ?? null, lng: row.lng as number ?? null, app_version: row.app_version as string ?? null };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export function fingerprint(rows: MigratedReport[]): string {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

function sqlValue(value: string | number | null): string {
  if (value === null) return 'NULL';
  return typeof value === 'number' ? String(value) : `'${value.replace(/'/g, "''")}'`;
}

export function importSql(rows: MigratedReport[]): string {
  if (!rows.length) return 'SELECT 1;\n';
  return rows.map((row) => `INSERT INTO reports (id, feature_id, status, device_id, created_at, lat, lng, app_version) VALUES (${Object.values(row).map(sqlValue).join(', ')}) ON CONFLICT(feature_id, device_id) DO UPDATE SET status = excluded.status, created_at = excluded.created_at, lat = excluded.lat, lng = excluded.lng, app_version = excluded.app_version WHERE excluded.created_at > reports.created_at;`).join('\n') + '\n';
}
