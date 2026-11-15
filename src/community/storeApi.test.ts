import { getStatus, submitReport } from './storeApi';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { communityApiUrl: 'https://community.example.test/' } } } }));
jest.mock('./deviceId', () => ({ getDeviceId: async () => 'existing-device-id' }));
const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeEach(() => { jest.clearAllMocks(); global.fetch = mockFetch; });
afterAll(() => { global.fetch = originalFetch; });

test('reports use the existing installation identity and omit client timestamps', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  expect(await submitReport('wfs.feature/1', 'not_working', { lat: 52.5, lng: 13.4 })).toEqual({ success: true });
  const [url, options] = mockFetch.mock.calls[0];
  expect(url).toBe('https://community.example.test/v1/reports');
  expect(options.headers['X-Device-ID']).toBe('existing-device-id');
  expect(JSON.parse(options.body)).toEqual({ featureId: 'wfs.feature/1', status: 'not_working', coordinates: { lat: 52.5, lng: 13.4 } });
});

test('reads preserve raw counts, the latest report, and own vote', async () => {
  const summary = { totals: { working: 1, notWorking: 0 }, confidence: 1, myVote: 'working', lastReport: { status: 'working', createdAt: Date.now() - 30 * 86400000 } };
  mockFetch.mockResolvedValue({ ok: true, json: async () => summary });
  expect(await getStatus('wfs.feature/1 &2')).toEqual(summary);
  expect(mockFetch.mock.calls[0][0]).toBe('https://community.example.test/v1/status?featureId=wfs.feature%2F1%20%262');
});

test('backend errors remain distinct from no reports', async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 503 });
  await expect(getStatus('test')).rejects.toThrow('Community status could not be loaded');
  expect((await submitReport('test', 'working')).success).toBe(false);
});

test('an empty successful summary is valid', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ totals: { working: 0, notWorking: 0 }, confidence: 0 }) });
  expect((await getStatus('test')).totals.working).toBe(0);
});

test('invalid backend payloads are not displayed as real reports', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ totals: { working: -1, notWorking: 0 }, confidence: 0 }) });
  await expect(getStatus('test')).rejects.toThrow('Community status could not be loaded');
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
  expect((await submitReport('test', 'working')).success).toBe(false);
});

test('rate limiting gives an actionable save error', async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 429 });
  expect(await submitReport('test', 'working')).toEqual({ success: false, error: 'Please wait a minute before trying again.' });
});

test('network failures do not claim a report was saved', async () => {
  mockFetch.mockRejectedValue(new Error('offline'));
  expect((await submitReport('test', 'working')).success).toBe(false);
});

test('stalled requests are aborted instead of leaving reporting permanently pending', async () => {
  jest.useFakeTimers();
  try {
    mockFetch.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const pending = submitReport('test', 'working');
    await jest.advanceTimersByTimeAsync(10000);
    expect((await pending).success).toBe(false);
    expect(mockFetch.mock.calls[0][1].signal.aborted).toBe(true);
  } finally { jest.useRealTimers(); }
});
