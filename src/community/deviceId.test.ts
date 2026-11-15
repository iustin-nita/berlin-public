const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStore.get(key) ?? null,
    setItem: async (key: string, value: string) => void mockStore.set(key, value),
  },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d' }));

beforeEach(() => {
  mockStore.clear();
  jest.resetModules();
});

test('new installation ID comes from a secure UUID and is persisted', async () => {
  const { getDeviceId } = require('./deviceId');
  const id = await getDeviceId();
  expect(id).toBe('0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d');
  // The Worker accepts only [a-zA-Z0-9_-]{8,128}.
  expect(id).toMatch(/^[a-zA-Z0-9_-]{8,128}$/);
  expect(mockStore.get('community:device_id')).toBe(id);
});

test('existing installation ID is kept', async () => {
  mockStore.set('community:device_id', 'legacyId12345678');
  const { getDeviceId } = require('./deviceId');
  expect(await getDeviceId()).toBe('legacyId12345678');
});
