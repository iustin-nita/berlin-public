export interface Env {
  DB: D1Database;
  READ_LIMITER: RateLimit;
  WRITE_LIMITER: RateLimit;
  IP_LIMITER: RateLimit;
}

type ReportStatus = 'working' | 'not_working';
type SummaryRow = { working: number; not_working: number; working_weight: number | null; not_working_weight: number | null };
type LatestRow = { status: ReportStatus; created_at: number };
const WINDOW_MS = 60 * 24 * 60 * 60 * 1000;
const DECAY_RATE = Math.LN2 / (14 * 24 * 60 * 60 * 1000);
const MAX_BODY_BYTES = 4096;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-ID',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function json(value: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(value, { status, headers: { ...headers, ...extraHeaders } });
}

function isFeatureId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 512 && !/[\u0000-\u001f\u007f]/.test(value);
}

function isStatus(value: unknown): value is ReportStatus {
  return value === 'working' || value === 'not_working';
}

async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) throw new Error('body_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error('body_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function getSummary(env: Env, featureId: string, deviceId: string): Promise<Response> {
  const now = Date.now();
  const since = now - WINDOW_MS;
  const results = await env.DB.batch([
    env.DB.prepare(`
      SELECT
        COALESCE(SUM(status = 'working'), 0) AS working,
        COALESCE(SUM(status = 'not_working'), 0) AS not_working,
        SUM(CASE WHEN status = 'working' THEN exp(-(? - created_at) * ?) ELSE 0 END) AS working_weight,
        SUM(CASE WHEN status = 'not_working' THEN exp(-(? - created_at) * ?) ELSE 0 END) AS not_working_weight
      FROM reports WHERE feature_id = ? AND created_at >= ?
    `).bind(now, DECAY_RATE, now, DECAY_RATE, featureId, since),
    env.DB.prepare('SELECT status, created_at FROM reports WHERE feature_id = ? AND created_at >= ? ORDER BY created_at DESC, id DESC LIMIT 1').bind(featureId, since),
    env.DB.prepare('SELECT status FROM reports WHERE feature_id = ? AND device_id = ? AND created_at >= ? LIMIT 1').bind(featureId, deviceId, since),
  ]);
  const totals = results[0].results[0] as SummaryRow;
  const last = results[1].results[0] as LatestRow | undefined;
  const own = results[2].results[0] as { status: ReportStatus } | undefined;
  const workingWeight = totals.working_weight ?? 0;
  const notWorkingWeight = totals.not_working_weight ?? 0;
  const totalWeight = workingWeight + notWorkingWeight;
  return json({
    totals: { working: totals.working, notWorking: totals.not_working },
    ...(last ? { lastReport: { status: last.status, createdAt: last.created_at } } : {}),
    ...(own ? { myVote: own.status } : {}),
    confidence: totalWeight > 0 ? Math.abs(workingWeight - notWorkingWeight) / totalWeight : 0,
  });
}

async function saveReport(request: Request, env: Env, deviceId: string): Promise<Response> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Expected JSON' }, 415);
  let body: unknown;
  try { body = await readBody(request); } catch (error) {
    return json({ error: 'Invalid report body' }, error instanceof Error && error.message === 'body_too_large' ? 413 : 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid report' }, 400);
  const { featureId, status, coordinates } = body as Record<string, unknown>;
  if (!isFeatureId(featureId) || !isStatus(status)) return json({ error: 'Invalid amenity or status' }, 400);
  let lat: number | null = null;
  let lng: number | null = null;
  if (coordinates !== undefined) {
    if (!coordinates || typeof coordinates !== 'object' || Array.isArray(coordinates)) return json({ error: 'Invalid coordinates' }, 400);
    const values = coordinates as Record<string, unknown>;
    if (typeof values.lat !== 'number' || !Number.isFinite(values.lat) || Math.abs(values.lat) > 90 ||
        typeof values.lng !== 'number' || !Number.isFinite(values.lng) || Math.abs(values.lng) > 180) return json({ error: 'Invalid coordinates' }, 400);
    lat = values.lat;
    lng = values.lng;
  }
  await env.DB.prepare(`
    INSERT INTO reports (id, feature_id, status, device_id, created_at, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(feature_id, device_id) DO UPDATE SET
      status = excluded.status, created_at = excluded.created_at, lat = excluded.lat, lng = excluded.lng
  `).bind(crypto.randomUUID(), featureId, status, deviceId, Date.now(), lat, lng).run();
  return json({ success: true }, 201);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const route = url.pathname;
    if (route === '/health' && request.method === 'GET') {
      try {
        await env.DB.prepare('SELECT 1 FROM reports LIMIT 1').first();
        return json({ status: 'ok', service: 'berlin-public-community', version: 1 });
      } catch { return json({ error: 'Service temporarily unavailable' }, 503); }
    }
    if (route !== '/v1/status' && route !== '/v1/reports') return json({ error: 'Not found' }, 404);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if ((route === '/v1/status' && request.method !== 'GET') || (route === '/v1/reports' && request.method !== 'POST')) return json({ error: 'Method not allowed' }, 405);
    const deviceId = request.headers.get('X-Device-ID') ?? '';
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(deviceId)) return json({ error: 'Invalid installation ID' }, 400);
    if (route === '/v1/status' && !isFeatureId(url.searchParams.get('featureId'))) return json({ error: 'Invalid amenity' }, 400);
    try {
      const ip = request.headers.get('CF-Connecting-IP');
      const limiter = request.method === 'POST' ? env.WRITE_LIMITER : env.READ_LIMITER;
      const limits = await Promise.all([limiter.limit({ key: deviceId }), ...(ip ? [env.IP_LIMITER.limit({ key: ip })] : [])]);
      if (limits.some((limit) => !limit.success)) return json({ error: 'Too many requests. Please try again shortly.' }, 429, { 'Retry-After': '60' });
      return route === '/v1/status' ? await getSummary(env, url.searchParams.get('featureId')!, deviceId) : await saveReport(request, env, deviceId);
    } catch {
      // Never log report payloads, installation IDs, coordinates, or database errors.
      return json({ error: 'Community service temporarily unavailable' }, 503);
    }
  },
};
