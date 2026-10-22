const paths = {
  play: '<rect x="5" y="9" width="38" height="29" rx="9"/><path d="m21 16 13 8-13 8z" fill="currentColor" stroke="none"/>',
  prime: '<path d="M8 30c9 8 21 8 31 0m-8-1 9-1-2 8"/>',
  music: '<path d="M8 16c11-5 22-4 32 1M10 24c9-4 18-3 28 1M13 32c8-3 14-2 21 1"/>',
  channels: '<rect x="7" y="12" width="34" height="24" rx="5"/><path d="m17 5 7 7 7-7m-12 19h10"/>',
  rakuten: '<path d="M14 36V12h10c15 0 15 16 0 16H14m10 0 12 8M10 42h28"/>',
  klan: '<path d="M13 10v28m24-28L18 24l19 14"/>',
  store: '<path d="M10 15h28l3 25H7zM17 16v-5a7 7 0 0 1 14 0v5"/>',
  code: '<path d="m15 12-11 12 11 12m18-24 11 12-11 12m-6-28-6 32"/>',
  tv: '<rect x="5" y="9" width="38" height="27" rx="4"/><path d="M16 43h16m-8-7v7"/>',
  inputs: '<rect x="12" y="7" width="30" height="34" rx="4"/><path d="M4 24h25m-8-8 8 8-8 8"/>',
  share: '<path d="M6 32V9h36v23m-18-8 12 18H12z"/>',
  settings: '<circle cx="24" cy="24" r="7"/><path d="m20 5-2 6-6 3-6-1-4 8 5 4 1 7-3 5 7 6 5-3 7 1 4 5 8-4-1-6 3-6 6-2V17l-6-2-3-6 1-6-8-4-4 5z" transform="translate(2 3) scale(.85)"/>',
  globe: '<circle cx="24" cy="24" r="18"/><ellipse cx="24" cy="24" rx="8" ry="18"/><path d="M6 24h36M10 13h28M10 35h28"/>',
  photo: '<rect x="5" y="8" width="38" height="32" rx="4"/><circle cx="16" cy="18" r="3"/><path d="m6 36 12-11 7 6 7-13 10 18"/>',
  game: '<path d="M14 14h20c8 0 13 25 5 25l-8-7H17l-8 7c-8 0-3-25 5-25zM12 23h10m-5-5v10m16-6h.1m5 5h.1"/>',
  back: '<path d="m22 10-14 14 14 14M8 24h33"/>',
  grid: '<rect x="7" y="7" width="13" height="13" rx="3"/><rect x="28" y="7" width="13" height="13" rx="3"/><rect x="7" y="28" width="13" height="13" rx="3"/><rect x="28" y="28" width="13" height="13" rx="3"/>',
  home: '<path d="m5 22 19-16 19 16M11 19v23h26V19M20 42V28h8v14"/>'
};

export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  // All markup comes exclusively from this static, local map.
  svg.innerHTML = paths[name] || paths.tv;
  return svg;
}
