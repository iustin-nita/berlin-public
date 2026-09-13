import { getStatus, submitReport } from './storeSupabase';

const mockUpsert = jest.fn();
const mockOrder = jest.fn();
jest.mock('./deviceId', () => ({ getDeviceId: async () => 'test-device' }));
jest.mock('./supabase', () => ({ supabase: { from: () => ({
  upsert: mockUpsert,
  select: () => ({ eq: () => ({ gte: () => ({ order: mockOrder }) }) }),
}) } }));

beforeEach(() => { jest.clearAllMocks(); });

test('changing a vote updates its freshness and keeps one row per device', async () => {
  mockUpsert.mockResolvedValue({ error: null });
  const before = Date.now();
  expect(await submitReport('qa_test', 'not_working')).toEqual({ success: true });
  const [report, options] = mockUpsert.mock.calls[0];
  expect(report.device_id).toBe('test-device');
  expect(report.status).toBe('not_working');
  expect(new Date(report.created_at).getTime()).toBeGreaterThanOrEqual(before);
  expect(options.onConflict).toBe('feature_id,device_id');
});

test('existing reports do not disappear due to rounded decay weights', async () => {
  mockOrder.mockResolvedValue({ error: null, data: [{ status: 'working', device_id: 'test-device', created_at: new Date(Date.now() - 30 * 86400000).toISOString() }] });
  const status = await getStatus('qa_test');
  expect(status.totals.working).toBe(1);
  expect(status.myVote).toBe('working');
});

test('backend read errors are distinct from an amenity with no reports', async () => {
  mockOrder.mockResolvedValue({ data: null, error: { code: 'offline', message: 'network unavailable' } });
  await expect(getStatus('qa_test')).rejects.toThrow('Community status could not be loaded');
});
