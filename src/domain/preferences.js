export const STORAGE_KEY = 'myowntv.preferences.v1';
export const ROTATIONS = [0, 5, 10, 30];
export const MAX_FAVORITES = 7;

export function defaults(catalog) {
  return { version: 1, favorites: catalog.filter(app => app.favorite).map(app => app.id).slice(0, MAX_FAVORITES), rotationMinutes: 10, reducedMotion: false, wallpaper: 0 };
}

export function normalize(value, catalog, wallpaperCount) {
  const base = defaults(catalog);
  if (!value || typeof value !== 'object' || value.version !== 1) return base;
  const ids = catalog.map(app => app.id);
  const favorites = Array.isArray(value.favorites)
    ? value.favorites.filter((id, index, all) => ids.indexOf(id) !== -1 && all.indexOf(id) === index).slice(0, MAX_FAVORITES) : base.favorites;
  return {
    version: 1,
    favorites: favorites.length ? favorites : base.favorites,
    rotationMinutes: ROTATIONS.indexOf(value.rotationMinutes) !== -1 ? value.rotationMinutes : base.rotationMinutes,
    reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : false,
    wallpaper: Number.isInteger(value.wallpaper) && value.wallpaper >= 0 && value.wallpaper < wallpaperCount ? value.wallpaper : 0
  };
}

export function createPreferences(storage, catalog, wallpaperCount) {
  let value;
  let readable = true;
  try { value = JSON.parse(storage.getItem(STORAGE_KEY)); } catch (_) { readable = false; }
  let state = normalize(value, catalog, wallpaperCount);
  return {
    read() { return { ...state, favorites: state.favorites.slice() }; },
    save(change) {
      const next = normalize({ ...state, ...change }, catalog, wallpaperCount);
      // Keep unreadable prior choices for inspection instead of silently destroying them.
      try {
        if (!readable) {
          const raw = storage.getItem(STORAGE_KEY);
          if (raw !== null) storage.setItem(STORAGE_KEY + '.unreadable', raw);
        }
        storage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_) { throw new Error('Your home settings could not be saved. Free some app storage and try again.'); }
      readable = true;
      state = next;
      return this.read();
    }
  };
}

export function toggleFavorite(favorites, id) {
  if (favorites.indexOf(id) !== -1) {
    if (favorites.length === 1) throw new Error('Keep at least one app in your dock.');
    return favorites.filter(value => value !== id);
  }
  if (favorites.length >= MAX_FAVORITES) throw new Error('Your dock holds up to seven apps. Remove one before adding another.');
  return favorites.concat(id);
}

export function moveFavorite(favorites, id, delta) {
  const from = favorites.indexOf(id);
  const to = Math.max(0, Math.min(favorites.length - 1, from + delta));
  if (from === -1 || from === to) return favorites.slice();
  const next = favorites.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
