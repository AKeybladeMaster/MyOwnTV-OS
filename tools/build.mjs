import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { ROOT, sha256, writeJson, readJson } from './lib/files.mjs';

export async function buildApp() {
  const output = path.join(ROOT, 'dist');
  // Only remove this fixed, generated directory after resolving it inside this checkout.
  if (path.dirname(output) !== path.resolve(ROOT)) throw new Error('Invalid output path.');
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
  await build({ entryPoints: [path.join(ROOT, 'src/app.js')], outfile: path.join(output, 'app.js'), bundle: true, minify: true, target: ['chrome68'], format: 'iife', legalComments: 'none', metafile: true });
  await build({ entryPoints: [path.join(ROOT, 'src/style.css')], outfile: path.join(output, 'style.css'), minify: true, target: ['chrome68'] });
  await fs.copyFile(path.join(ROOT, 'src/index.html'), path.join(output, 'index.html'));
  await fs.copyFile(path.join(ROOT, 'assets/icon.png'), path.join(output, 'icon.png'));
  await fs.copyFile(path.join(ROOT, 'assets/largeIcon.png'), path.join(output, 'largeIcon.png'));
  await fs.cp(path.join(ROOT, 'assets/wallpapers'), path.join(output, 'assets/wallpapers'), { recursive: true });
  for (const file of ['WALLPAPER-CREDITS.md', 'THIRD-PARTY-NOTICES.md', 'LICENSE']) await fs.copyFile(path.join(ROOT, file), path.join(output, file));
  const appinfo = await readJson(path.join(ROOT, 'config/appinfo.json'));
  const pkg = await readJson(path.join(ROOT, 'package.json'));
  if (appinfo.version !== pkg.version) throw new Error('App and package versions differ.');
  if ('requiredPermissions' in appinfo || appinfo.type !== 'web') throw new Error('A release must be an unprivileged web app.');
  await writeJson(path.join(output, 'appinfo.json'), appinfo);
  const files = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else {
        const data = await fs.readFile(file);
        files.push({ path: path.relative(output, file).replaceAll('\\', '/'), bytes: data.length, sha256: sha256(data) });
      }
    }
  }
  await walk(output);
  await writeJson(path.join(output, 'build-manifest.json'), { version: appinfo.version, target: 'chrome68', files });
  const javascript = files.find(file => file.path === 'app.js');
  if (javascript.bytes > 100000) throw new Error('Launcher JavaScript exceeded the 100 KB budget.');
  console.log('Built webOS 5 app: ' + javascript.bytes + ' bytes JavaScript; ' + files.reduce((sum, file) => sum + file.bytes, 0) + ' bytes with local photos.');
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) await buildApp();
