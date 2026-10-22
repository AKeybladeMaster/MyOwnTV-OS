import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../tools/lib/files.mjs';

const executablePath = process.env.MYOWNTV_BROWSER || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(ROOT, 'dist/index.html')).href);
  try { await page.waitForFunction(() => document.querySelectorAll('#dock button').length === 6 && document.querySelectorAll('#controls button').length === 3 && getComputedStyle(document.getElementById('stage')).width === '1920px', null, { timeout: 3000 }); }
  catch (_) { throw new Error('File-origin launcher did not initialize.\n' + errors.join('\n')); }
  await page.locator('.wallpaper.visible').waitFor({ timeout: 3000 });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Modern browser file-origin smoke check passed. Chrome 68 rendering must also pass the actual-TV --assert-rendered check.');
} finally { await browser.close(); }
