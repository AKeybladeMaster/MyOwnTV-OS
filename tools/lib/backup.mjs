import fs from 'node:fs/promises';
import path from 'node:path';
import { APP_ID, LOCAL, ROOT, readJson, writeJson, sha256, assertLocalPath } from './files.mjs';
import { ares } from './ares.mjs';

export async function backup(connection, target) {
  const system = await connection.assertModel(target.model);
  const directory = path.join(LOCAL, 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
  await fs.mkdir(directory, { recursive: true });
  const entries = [];
  const errors = [];
  async function save(name, data) {
    const text = JSON.stringify(data, null, 2) + '\n';
    await fs.writeFile(path.join(directory, name), text, { flag: 'wx', mode: 0o600 });
    entries.push({ path: name, sha256: sha256(text) });
  }
  await save('system.json', system);
  let apps;
  for (const [name, uri, payload] of [
    ['apps.json', 'com.webos.applicationManager/listApps', {}],
    ['launchpoints.json', 'com.webos.applicationManager/listLaunchPoints', {}],
    ['inputs.json', 'tv/getExternalInputList', {}],
    ['foreground.json', 'com.webos.applicationManager/getForegroundAppInfo', {}],
    ['software.json', 'com.webos.service.update/getCurrentSWInformation', {}],
    ['readable-option-settings.json', 'settings/getSystemSettings', { category: 'option' }]
  ]) {
    try {
      const data = await connection.request(uri, payload);
      if (name === 'apps.json') apps = data.apps;
      await save(name, data);
    } catch (error) { errors.push({ operation: name, reason: error.message }); }
  }
  if (!Array.isArray(apps) || !apps.length) throw new Error('No installed-app inventory was obtained. Nothing may be installed or changed.');
  const systemInfo = await ares('device', ['-d', target.aresDevice, '--system-info']);
  if (!systemInfo.includes('modelName : ' + target.model) || !systemInfo.includes('firmwareVersion : ' + target.firmware)) throw new Error('SSH target identity/firmware differs from this project.');
  await save('developer-system-info.json', { text: systemInfo });
  await save('developer-apps.json', { text: await ares('install', ['-d', target.aresDevice, '--list']) });
  try { await connection.capture(path.join(directory, 'baseline.jpg')); entries.push({ path: 'baseline.jpg', sha256: sha256(await fs.readFile(path.join(directory, 'baseline.jpg'))) }); }
  catch (error) { errors.push({ operation: 'baseline screenshot', reason: error.message }); }
  const manifest = { schema: 1, created: new Date().toISOString(), model: target.model, firmware: target.firmware, fingerprint: connection.fingerprint, ownAppPreviouslyInstalled: apps.some(app => app.id === APP_ID), scope: 'Readable app/input/system inventory only. No firmware, system files, credentials, login data, or full settings backup.', entries, unavailable: errors };
  await writeJson(path.join(directory, 'manifest.json'), manifest, { exclusive: true });
  await writeJson(path.join(LOCAL, 'latest-backup.json'), { directory });
  return { directory, manifest };
}

export async function validateBackup(directory, connection, target) {
  const resolved = await assertLocalPath(directory, path.join(LOCAL, 'backups'));
  const manifest = await readJson(path.join(resolved, 'manifest.json'));
  if (manifest.schema !== 1 || manifest.model !== target.model || manifest.firmware !== target.firmware || manifest.fingerprint !== connection.fingerprint || !Array.isArray(manifest.entries) || !manifest.entries.length) throw new Error('Backup does not match the paired target.');
  for (const entry of manifest.entries) {
    if (!/^[a-z0-9-]+\.(json|jpg)$/.test(entry.path)) throw new Error('Invalid path in the backup manifest.');
    if (sha256(await fs.readFile(path.join(resolved, entry.path))) !== entry.sha256) throw new Error('Backup verification failed: ' + entry.path);
  }
  await connection.assertModel(target.model);
  return manifest;
}
