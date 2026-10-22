import { toggleFavorite, moveFavorite, ROTATIONS } from '../domain/preferences.js';
import { navigate, keyAction } from '../domain/navigation.js';
import { createWallpaper } from './wallpaper.js';
import { icon } from './icons.js';

export function mountHome({ catalog, wallpapers, device, preferences }) {
  const byId = id => document.getElementById(id);
  let state = preferences.read();
  let screen = 'home';
  let previousScreen = 'home';
  let previousFocus = null;
  let lastDock = state.favorites[0];
  let busy = false;
  let clockTimer;
  let statusTimer;
  const screens = { home: byId('home'), library: byId('library'), panel: byId('panel') };

  function message(text, duration = 5000) {
    window.clearTimeout(statusTimer);
    byId('status').textContent = text;
    byId('status').classList.remove('hidden');
    statusTimer = window.setTimeout(() => byId('status').classList.add('hidden'), duration);
  }

  function save(change) {
    try {
      state = preferences.save(change);
      document.body.classList.toggle('reduced-motion', state.reducedMotion);
      return true;
    } catch (error) { message(error.message); return false; }
  }

  function button(text, action, { name, row = 0, id, className = 'pill' } = {}) {
    const element = document.createElement('button');
    element.className = className;
    element.dataset.row = String(row);
    if (id) element.id = id;
    if (name) element.appendChild(icon(name));
    const label = document.createElement('span');
    label.textContent = text;
    element.appendChild(label);
    element.addEventListener('click', action);
    element.addEventListener('mouseenter', () => element.focus({ preventScroll: true }));
    return element;
  }

  function focus(id) {
    const element = byId(id) || screens[screen].querySelector('button');
    if (element) element.focus({ preventScroll: true });
  }

  function setScreen(next, focusId) {
    screen = next;
    Object.keys(screens).forEach(name => {
      screens[name].classList.toggle('hidden', name !== next);
      screens[name].setAttribute('aria-hidden', String(name !== next));
    });
    document.body.classList.toggle('browsing', next !== 'home');
    focus(focusId);
  }

  async function launch(app) {
    if (busy) return;
    busy = true;
    message('Opening ' + app.name + '…', 10000);
    try {
      const result = await device.launch(app.id);
      if (result.preview) message(app.name + ' will open on your TV.');
      else byId('status').classList.add('hidden');
    } catch (error) { message(error.message, 9000); }
    finally { busy = false; }
  }

  function openSystem(id, name) { launch({ id, name }); }

  function tile(app, row, prefix) {
    const element = button('', () => launch(app), { row, id: prefix + app.id, className: 'app-tile' });
    element.textContent = '';
    element.dataset.appId = app.id;
    element.setAttribute('aria-label', app.name);
    const art = document.createElement('span');
    art.className = 'app-art app-' + app.mark;
    art.style.backgroundColor = app.color;
    art.appendChild(icon(app.mark));
    const wordmark = document.createElement('span');
    wordmark.className = 'wordmark';
    wordmark.textContent = app.short || app.name;
    art.appendChild(wordmark);
    const label = document.createElement('span');
    label.className = 'app-label';
    label.textContent = app.name;
    element.appendChild(art);
    element.appendChild(label);
    element.addEventListener('focus', () => {
      if (screen === 'home') {
        lastDock = app.id;
        byId('focused-name').textContent = app.name;
      } else element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return element;
  }

  function renderDock() {
    const dock = byId('dock');
    dock.textContent = '';
    state.favorites.forEach(id => {
      const app = catalog.find(item => item.id === id);
      if (app) dock.appendChild(tile(app, 1, 'dock-'));
    });
    dock.style.setProperty('--dock-count', String(state.favorites.length));
    if (state.favorites.indexOf(lastDock) === -1) lastDock = state.favorites[0];
    byId('focused-name').textContent = catalog.find(app => app.id === lastDock).name;
  }

  function openLibrary() {
    const grid = byId('app-grid');
    grid.textContent = '';
    catalog.forEach((app, index) => grid.appendChild(tile(app, 1 + Math.floor(index / 6), 'library-')));
    setScreen('library', 'library-' + lastDock);
  }

  function closePanel() {
    renderDock();
    setScreen(previousScreen, previousFocus);
  }

  function openPanel(title, builder) {
    if (screen !== 'panel') {
      previousScreen = screen;
      previousFocus = document.activeElement && document.activeElement.id;
    }
    byId('panel-title').textContent = title;
    byId('panel-content').textContent = '';
    builder(byId('panel-content'));
    setScreen('panel', 'close-panel');
  }

  function settingRow(container, title, description, controls, row) {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-row';
    const copy = document.createElement('div');
    copy.className = 'setting-copy';
    const heading = document.createElement('h2');
    heading.textContent = title;
    copy.appendChild(heading);
    if (description) {
      const detail = document.createElement('p');
      detail.textContent = description;
      copy.appendChild(detail);
    }
    wrapper.appendChild(copy);
    const actions = document.createElement('div');
    actions.className = 'setting-actions';
    controls.forEach(control => { control.dataset.row = String(row); actions.appendChild(control); });
    wrapper.appendChild(actions);
    container.appendChild(wrapper);
  }

  function openHomeSettings(restoreId) {
    openPanel('Home settings', container => {
      settingRow(container, 'Your dock', 'Choose up to seven favorites and put them in your order.', [button('Edit dock', () => openDockEditor(), { id: 'edit-dock', name: 'grid' })], 1);
      settingRow(container, 'Wallpaper', 'Local nature photographs. No downloads or feeds.', [button('Previous', () => wallpaper.previous(), { id: 'wall-prev' }), button('Next', () => wallpaper.next(), { id: 'wall-next' })], 2);
      const rotation = state.rotationMinutes === 0 ? 'Paused' : 'Every ' + state.rotationMinutes + ' minutes';
      settingRow(container, 'Change wallpaper', 'Rotation pauses whenever you leave MyOwnTV.', [button(rotation, () => {
        if (save({ rotationMinutes: ROTATIONS[(ROTATIONS.indexOf(state.rotationMinutes) + 1) % ROTATIONS.length] })) {
          wallpaper.setInterval(state.rotationMinutes); openHomeSettings('rotation');
        }
      }, { id: 'rotation' })], 3);
      settingRow(container, 'Reduce motion', 'Use instant focus changes and wallpaper transitions.', [button(state.reducedMotion ? 'On' : 'Off', () => { if (save({ reducedMotion: !state.reducedMotion })) openHomeSettings('motion'); }, { id: 'motion' })], 4);
      settingRow(container, 'TV settings', 'Picture, sound, privacy, connections, and every original LG setting.', [button('Open TV settings', () => openSystem('com.palm.app.settings', 'TV settings'), { id: 'native-settings', name: 'settings' })], 5);
      settingRow(container, 'About MyOwnTV', 'A standalone home app. Press the remote’s Home button for LG Home. Keep Developer Mode renewed in LG’s app.', [button('Photo credits', () => openCredits(), { id: 'credits', name: 'photo' })], 6);
    });
    if (restoreId) focus(restoreId);
  }

  function openDockEditor(restoreId) {
    openPanel('Your dock', container => {
      const instruction = document.createElement('p');
      instruction.className = 'panel-intro';
      instruction.textContent = 'Add favorites from the list. Use Left and Right beside a favorite to change its position.';
      container.appendChild(instruction);
      const ordered = state.favorites.map(id => catalog.find(app => app.id === id)).concat(catalog.filter(app => state.favorites.indexOf(app.id) === -1));
      ordered.forEach((app, index) => {
        const favoriteIndex = state.favorites.indexOf(app.id);
        const pinId = 'pin-' + app.id;
        const actions = [button(favoriteIndex === -1 ? 'Add to dock' : 'In dock · ' + (favoriteIndex + 1), () => {
          try { if (save({ favorites: toggleFavorite(state.favorites, app.id) })) openDockEditor(pinId); }
          catch (error) { message(error.message); }
        }, { id: pinId })];
        if (favoriteIndex !== -1) {
          actions.push(button('Left', () => { if (save({ favorites: moveFavorite(state.favorites, app.id, -1) })) openDockEditor('left-' + app.id); }, { id: 'left-' + app.id }));
          actions.push(button('Right', () => { if (save({ favorites: moveFavorite(state.favorites, app.id, 1) })) openDockEditor('right-' + app.id); }, { id: 'right-' + app.id }));
        }
        settingRow(container, app.name, favoriteIndex === -1 ? '' : 'Favorite ' + (favoriteIndex + 1), actions, index + 1);
      });
    });
    if (restoreId) focus(restoreId);
  }

  function openCredits() {
    openPanel('Nature, at home', container => {
      const intro = document.createElement('p');
      intro.className = 'panel-intro';
      intro.textContent = 'Photographs from Wikimedia Commons. Original sources and license links are included in WALLPAPER-CREDITS.md in the release.';
      container.appendChild(intro);
      wallpapers.forEach((photo, index) => settingRow(container, photo.name, photo.credit, [button('Show', () => { wallpaper.showIndex(index); renderDock(); setScreen('home', 'dock-' + lastDock); }, { id: 'photo-' + index })], index + 1));
    });
  }

  const wallpaper = createWallpaper({
    layers: Array.from(document.querySelectorAll('.wallpaper')), wallpapers, initialIndex: state.wallpaper,
    caption: byId('landscape'), reducedMotion: () => state.reducedMotion,
    onChange: index => { if (state.wallpaper !== index) save({ wallpaper: index }); }
  });

  function updateClock() {
    window.clearTimeout(clockTimer);
    if (document.hidden) return;
    const now = new Date();
    const hour = now.getHours();
    byId('greeting').textContent = hour < 5 ? 'A quiet night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    byId('clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    byId('clock').dateTime = now.toISOString();
    byId('date').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    clockTimer = window.setTimeout(updateClock, 60000 - (Date.now() % 60000));
  }

  function fit() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    byId('stage').style.transform = 'scale(' + scale + ')';
    byId('stage').style.left = (window.innerWidth - 1920 * scale) / 2 + 'px';
    byId('stage').style.top = (window.innerHeight - 1080 * scale) / 2 + 'px';
  }

  byId('controls').appendChild(button('Inputs', () => openSystem('com.webos.app.homeconnect', 'Inputs'), { id: 'inputs', name: 'inputs' }));
  byId('controls').appendChild(button('Screen Share', () => openSystem('com.webos.app.miracast', 'Screen Share'), { id: 'screen-share', name: 'share' }));
  byId('controls').appendChild(button('Settings', () => openHomeSettings(), { id: 'settings', name: 'settings' }));
  byId('library-controls').appendChild(button('Edit dock', () => openDockEditor(), { id: 'library-edit', name: 'grid' }));
  byId('library-controls').appendChild(button('Home', () => setScreen('home', 'dock-' + lastDock), { id: 'library-home', name: 'home' }));
  byId('all-apps').addEventListener('click', openLibrary);
  byId('close-panel').addEventListener('click', closePanel);

  document.addEventListener('focusin', event => {
    if (screen === 'panel' && event.target.closest('.panel-content')) event.target.scrollIntoView({ block: 'nearest' });
  });
  document.addEventListener('keydown', event => {
    const action = keyAction(event);
    if (!action) return;
    event.preventDefault();
    if (action === 'back') {
      if (event.repeat) return;
      byId('status').classList.add('hidden');
      if (screen === 'panel') closePanel();
      else if (screen === 'library') setScreen('home', 'dock-' + lastDock);
      else device.exit();
      return;
    }
    if (action === 'select') {
      if (!event.repeat && document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.click();
      return;
    }
    if (screen === 'home' && action === 'down' && document.activeElement && document.activeElement.dataset.appId) { openLibrary(); return; }
    const rowsByNumber = {};
    screens[screen].querySelectorAll('button[data-row]').forEach(element => {
      const row = element.dataset.row;
      if (!rowsByNumber[row]) rowsByNumber[row] = [];
      rowsByNumber[row].push(element);
    });
    const rows = Object.keys(rowsByNumber).sort((a, b) => Number(a) - Number(b)).map(number => rowsByNumber[number]);
    const target = navigate(rows, document.activeElement, action);
    if (target) target.focus({ preventScroll: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { wallpaper.stop(); window.clearTimeout(clockTimer); busy = false; }
    else { wallpaper.start(state.rotationMinutes); updateClock(); focus(document.activeElement && document.activeElement.id); }
  });
  window.addEventListener('resize', fit);
  if (!device.isTV) byId('preview-label').classList.remove('hidden');
  document.body.classList.toggle('reduced-motion', state.reducedMotion);
  fit(); renderDock(); updateClock(); wallpaper.start(state.rotationMinutes); focus('dock-' + lastDock);
}
