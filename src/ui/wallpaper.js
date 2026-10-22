export function createWallpaper({ layers, wallpapers, initialIndex, caption, reducedMotion, onChange, timers = window }) {
  let active = true;
  let index = initialIndex;
  let front = 0;
  let timer = null;
  let interval = 0;
  let request = 0;
  let loading = null;
  function schedule() {
    timers.clearTimeout(timer);
    if (active && interval > 0) timer = timers.setTimeout(() => show((index + 1) % wallpapers.length), interval);
  }
  function show(next) {
    const token = ++request;
    const normalized = (next + wallpapers.length) % wallpapers.length;
    loading = new Image();
    loading.onload = () => {
      if (token !== request || !active) return;
      const nextFront = 1 - front;
      layers[nextFront].style.backgroundImage = 'url("assets/wallpapers/' + wallpapers[normalized].file + '")';
      layers[nextFront].style.transitionDuration = reducedMotion() ? '0ms' : '900ms';
      layers[nextFront].classList.add('visible');
      layers[front].classList.remove('visible');
      front = nextFront;
      index = normalized;
      caption.textContent = wallpapers[index].name;
      caption.title = wallpapers[index].credit;
      loading = null;
      onChange(index);
      schedule();
    };
    loading.onerror = () => { if (token === request) { loading = null; schedule(); } };
    loading.src = 'assets/wallpapers/' + wallpapers[normalized].file;
  }
  return {
    start(minutes) { active = true; interval = minutes * 60000; show(index); },
    stop() { active = false; ++request; loading = null; timers.clearTimeout(timer); },
    setInterval(minutes) { interval = minutes * 60000; schedule(); },
    next() { if (active) show(index + 1); },
    previous() { if (active) show(index - 1); },
    showIndex(next) { if (active) show(next); },
    current() { return index; }
  };
}
