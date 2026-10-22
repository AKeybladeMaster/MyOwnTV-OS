import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreferences, defaults, normalize, toggleFavorite, moveFavorite, STORAGE_KEY } from '../src/domain/preferences.js';
import { navigate, keyAction } from '../src/domain/navigation.js';
import { createDevice } from '../src/platform/device.js';
import fs from 'node:fs/promises';

const catalog = JSON.parse(await fs.readFile(new URL('../config/apps.json', import.meta.url)));
const expected = ['youtube.leanback.v4', 'amazon', 'spotify-beehive', 'lgchannels.eu', 'ui30', 'al.tvklan.app.klaniim'];
function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, value), data };
}

test('all six owner-required apps start in the dock using verified webOS IDs', () => {
  assert.deepEqual(defaults(catalog).favorites, expected);
  assert.equal(new Set(catalog.map(app => app.id)).size, catalog.length);
  assert(catalog.some(app => app.id === 'com.palmdts.devmode'));
  assert(catalog.some(app => app.id === 'com.webos.app.discovery'));
});

test('invalid saved preferences cannot add unknown or duplicate shortcuts or unsupported timers', () => {
  const state = normalize({ version: 1, favorites: [expected[0], 'factory.menu', expected[0]], rotationMinutes: -1, wallpaper: Infinity }, catalog, 6);
  assert.deepEqual(state.favorites, [expected[0]]);
  assert.equal(state.rotationMinutes, 10);
  assert.equal(state.wallpaper, 0);
  assert.deepEqual(normalize({ version: 2, favorites: [] }, catalog, 6), defaults(catalog));
});

test('corrupt original settings survive the next deliberate edit, and edits persist across reopen', () => {
  const saved = storage({ [STORAGE_KEY]: '{bad json' });
  const first = createPreferences(saved, catalog, 6);
  first.save({ reducedMotion: true, rotationMinutes: 0 });
  assert.equal(saved.getItem(STORAGE_KEY + '.unreadable'), '{bad json');
  const reopened = createPreferences(saved, catalog, 6).read();
  assert.equal(reopened.reducedMotion, true);
  assert.equal(reopened.rotationMinutes, 0);
});

test('a failed storage write does not replace the in-memory baseline', () => {
  const store = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const prefs = createPreferences(store, catalog, 6);
  assert.throws(() => prefs.save({ favorites: [expected[0]] }), /could not be saved/);
  assert.deepEqual(prefs.read().favorites, expected);
});

test('dock editing keeps one favorite, caps at seven, and moves only the chosen app', () => {
  assert.throws(() => toggleFavorite([expected[0]], expected[0]), /at least one/);
  const seven = catalog.slice(0, 7).map(app => app.id);
  assert.throws(() => toggleFavorite(seven, catalog[7].id), /seven/);
  const moved = moveFavorite(expected, expected[2], -1);
  assert.deepEqual(moved, [expected[0], expected[2], expected[1], ...expected.slice(3)]);
  assert.deepEqual(moveFavorite(expected, 'absent', 1), expected);
  assert.deepEqual(expected, defaults(catalog).favorites);
});

test('physical grid edges never wrap; vertical moves clamp on a ragged last row', () => {
  const rows = [['inputs', 'share', 'settings'], ['a', 'b', 'c', 'd'], ['e', 'f']];
  assert.equal(navigate(rows, 'a', 'left'), 'a');
  assert.equal(navigate(rows, 'd', 'right'), 'd');
  assert.equal(navigate(rows, 'd', 'down'), 'f');
  assert.equal(navigate(rows, 'c', 'up'), 'settings');
  assert.equal(navigate(rows, 'inputs', 'up'), 'inputs');
  assert.equal(navigate(rows, 'missing', 'left'), 'inputs');
});

test('webOS Back is handled; native Home, volume, inputs and app keys are not intercepted', () => {
  assert.equal(keyAction({ keyCode: 461 }), 'back');
  for (const keyCode of [36, 172, 175, 174, 403, 404, 405, 406, 457]) assert.equal(keyAction({ keyCode }), null);
});

test('the TV adapter only launches through the public application manager and exits through platformBack', async () => {
  const calls = [];
  let exits = 0;
  class Bridge {
    call(uri, params) { calls.push({ uri, params: JSON.parse(params) }); queueMicrotask(() => this.onservicecallback('{"returnValue":true}')); }
    cancel() {}
  }
  const device = createDevice({ PalmServiceBridge: Bridge, setTimeout, clearTimeout, webOSSystem: { platformBack: () => exits++ } });
  await device.launch(expected[0]);
  assert.deepEqual(calls, [{ uri: 'luna://com.webos.applicationManager/launch', params: { id: expected[0] } }]);
  await assert.rejects(device.launch('app; rm -rf /'), /invalid/);
  device.exit(); assert.equal(exits, 1);
});

test('a rejected or malformed launch response is surfaced instead of reporting success', async () => {
  for (const response of ['{"returnValue":false}', 'not JSON', '{}']) {
    class Bridge { call() { queueMicrotask(() => this.onservicecallback(response)); } cancel() {} }
    const device = createDevice({ PalmServiceBridge: Bridge, setTimeout, clearTimeout });
    await assert.rejects(device.launch(expected[0]), /TV/);
  }
});
