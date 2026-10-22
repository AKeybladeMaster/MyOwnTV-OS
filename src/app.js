import catalog from '../config/apps.json';
import wallpapers from '../config/wallpapers.json';
import { createPreferences } from './domain/preferences.js';
import { createDevice } from './platform/device.js';
import { mountHome } from './ui/home.js';

let storage;
try { storage = window.localStorage; } catch (_) {
  const memory = {};
  storage = { getItem: key => memory[key] || null, setItem: (key, value) => { memory[key] = value; } };
}
const preferences = createPreferences(storage, catalog, wallpapers.length);
mountHome({ catalog, wallpapers, device: createDevice(window), preferences });
