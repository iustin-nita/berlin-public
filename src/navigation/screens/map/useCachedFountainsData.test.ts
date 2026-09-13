import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWithTimeout } from '../../../constants/datasets';
import { useCachedFountainsData } from './useCachedFountainsData';

const { act, create } = require('react-test-renderer');
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../constants/datasets', () => ({ fetchWithTimeout: jest.fn() }));

let value: ReturnType<typeof useCachedFountainsData>;
let renderer: { unmount: () => void };
function Harness() { value = useCachedFountainsData(); return null; }
const request = fetchWithTimeout as jest.Mock;
const response = (id: string) => ({ json: async () => ({ type: 'FeatureCollection', features: [{ id, geometry: { type: 'Point', coordinates: [13.4, 52.5] }, properties: { name: id } }] }) });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem('category:selection:v1', JSON.stringify(['drinking']));
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); });

test('a failed first load exposes an error instead of a blank successful map', async () => {
  request.mockRejectedValue(new Error('offline'));
  await act(async () => { renderer = create(React.createElement(Harness)); });
  expect(value.loading).toBe(false);
  expect(value.error).toContain('Drinking');
  expect(value.features).toEqual([]);
});

test('failed refresh retains cached amenities and their original age', async () => {
  const timestamp = Date.now() - 172800000;
  await AsyncStorage.setItem('category:cache:drinking', JSON.stringify({ timestamp, data: [{ id: 'saved', title: 'Saved fountain', coordinates: [13.4, 52.5] }] }));
  request.mockRejectedValue(new Error('offline'));
  await act(async () => { renderer = create(React.createElement(Harness)); });
  await act(async () => { await value.refresh(); });
  expect(value.features[0].id).toBe('saved');
  expect(value.isStale).toBe(true);
  expect(value.hasCachedData).toBe(true);
  expect(value.error).toContain('Drinking');
});

test('category changes share pending requests without losing their results', async () => {
  let resolveDrinking!: (result: unknown) => void;
  const pending = new Promise((resolve) => { resolveDrinking = resolve; });
  request.mockImplementation((url: string) => url.includes('trinkwasserbrunnen') ? pending : Promise.resolve(response('toilet')));
  await act(async () => { renderer = create(React.createElement(Harness)); });
  await act(async () => { value.toggleCategory('toilet'); });
  await act(async () => { resolveDrinking(response('fountain')); });
  expect(value.features.map((item) => item.title).sort()).toEqual(['fountain', 'toilet']);
  expect(request.mock.calls.filter(([url]) => url.includes('trinkwasserbrunnen'))).toHaveLength(1);
  expect(value.error).toBeNull();
});
