import fs from 'node:fs/promises';
import path from 'node:path';
import { APP_ID, ROOT, LOCAL, readJson, writeJson, sha256, assertLocalPath } from './lib/files.mjs';
import { connect, pair, CONNECTION_FILE } from './lib/ssap.mjs';
import { backup, validateBackup } from './lib/backup.mjs';
import { inspectPackage } from './lib/ipk.mjs';
import { ares } from './lib/ares.mjs';

const args = process.argv.slice(2);
const command = args.shift();
const option = name => { const index = args.indexOf('--' + name); return index < 0 ? undefined : args[index + 1]; };
const target = await readJson(path.join(ROOT, 'config/target.json'));
const help = `MyOwnTV device tools (no root or system-package operations)
  npm run tv -- pair --host <verified TV IP>    Accept the prompt on the TV
  npm run tv -- backup                         Save readable state before changes
  npm run tv -- capture --name <step>           Save a paired TV screenshot if allowed
  npm run tv -- remote --button <UP|DOWN|LEFT|RIGHT|ENTER|BACK|HOME|QMENU>
  npm run tv -- inventory                      Print installed app names and IDs
  npm run tv -- install                        Validate backup, install and open our IPK
  npm run tv -- restore                        Close our app and return to native LG Home
  npm run tv -- privacy                        Show the approved privacy plan
See docs/safety-and-restore.md for backup limits and settings recovery.`;

let connection;
try {
  if (!command || command === 'help' || command === '--help') console.log(help);
  else if (command === 'pair') {
    try { await fs.access(CONNECTION_FILE); throw new Error('A pairing already exists. Keep it; verify identity before changing credentials.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const host = option('host');
    if (!host) throw new Error('Supply the verified TV IP with --host.');
    console.log('Accept MyOwnTV tools on the intended TV.');
    await pair(host, target.model);
    console.log('Paired and pinned the TV certificate. Credentials are local and ignored by Git.');
  } else if (command === 'privacy') {
    console.log(await fs.readFile(path.join(ROOT, 'docs/privacy-plan.md'), 'utf8'));
  } else if (['backup', 'capture', 'remote', 'inventory', 'install', 'restore'].includes(command)) {
    connection = await connect();
    await connection.assertModel(target.model);
    if (command === 'backup') {
      const result = await backup(connection, target);
      console.log('Snapshot saved: ' + path.relative(ROOT, result.directory));
      console.log(result.manifest.scope);
      result.manifest.unavailable.forEach(entry => console.log('Unavailable: ' + entry.operation + ' — ' + entry.reason));
    } else if (command === 'capture') {
      const name = option('name');
      if (!name || !/^[a-z0-9-]{1,80}$/.test(name)) throw new Error('Use a lowercase screenshot name with letters, digits, and hyphens.');
      const destination = path.join(LOCAL, 'shots', name + '.jpg');
      await connection.capture(destination);
      console.log('TV screenshot saved: ' + path.relative(ROOT, destination));
    } else if (command === 'remote') {
      await connection.button(option('button'));
      console.log('Sent remote button. This does not verify a physical remote button.');
    } else if (command === 'inventory') {
      const response = await connection.request('com.webos.applicationManager/listApps');
      for (const app of response.apps) console.log(app.id + '\t' + app.title);
    } else if (command === 'install') {
      const { directory } = await readJson(path.join(LOCAL, 'latest-backup.json'));
      const snapshot = await validateBackup(directory, connection, target);
      if (snapshot.ownAppPreviouslyInstalled) throw new Error('An earlier MyOwnTV was installed at baseline. Preserve its IPK before an update; automatic replacement is disabled.');
      const manifest = await readJson(path.join(ROOT, 'out/release-manifest.json'));
      if (path.basename(manifest.filename) !== manifest.filename || !manifest.filename.endsWith('.ipk')) throw new Error('Invalid IPK filename.');
      const file = path.join(ROOT, 'out', manifest.filename);
      const data = await fs.readFile(file);
      const info = inspectPackage(data);
      if (sha256(data) !== manifest.sha256 || info.id !== APP_ID || info.version !== manifest.version) throw new Error('Release checksum or identity mismatch.');
      const recordFile = path.join(LOCAL, 'deployments', new Date().toISOString().replace(/[:.]/g, '-') + '.json');
      const record = { schema: 1, backup: directory, appId: APP_ID, sha256: manifest.sha256, version: info.version, status: 'prepared', systemChanges: [], created: new Date().toISOString() };
      await writeJson(recordFile, record, { exclusive: true });
      await fs.mkdir(path.join(LOCAL, 'packages'), { recursive: true });
      await fs.copyFile(file, path.join(LOCAL, 'packages', manifest.sha256 + '.ipk'));
      console.log(await ares('install', ['-d', target.aresDevice, file]));
      record.status = 'installed'; await writeJson(recordFile, record);
      console.log(await ares('launch', ['-d', target.aresDevice, APP_ID]));
      record.status = 'launched'; await writeJson(recordFile, record);
      console.log('Installed only MyOwnTV. No existing app, native Home handler, or system setting was modified.');
    } else if (command === 'restore') {
      const { directory } = await readJson(path.join(LOCAL, 'latest-backup.json'));
      await validateBackup(directory, connection, target);
      const info = await connection.request('com.webos.applicationManager/listApps');
      if (info.apps.some(app => app.id === APP_ID)) console.log(await ares('launch', ['-d', target.aresDevice, '--close', APP_ID]));
      // Ordinary application launch; the native launcher was always enabled.
      await connection.request('system.launcher/launch', { id: 'com.webos.app.home' });
      console.log('Returned to native LG Home. No packages were removed.');
      console.log('For any manually changed privacy setting, replay its recorded original value using docs/safety-and-restore.md. No system-setting writes are automated by this tool.');
    }
  } else throw new Error('Unknown command.\n' + help);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (connection) connection.close(); }
