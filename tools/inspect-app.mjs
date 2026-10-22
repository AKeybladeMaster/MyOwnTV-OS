import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { once } from 'node:events';
import { Client } from 'ssh2';
import { WebSocket } from 'ws';
import { APP_ID, LOCAL, ROOT, readJson, writeJson, sha256 } from './lib/files.mjs';
import { connect, CONNECTION_FILE } from './lib/ssap.mjs';
import { verifyAresTarget } from './lib/ares.mjs';

const args = process.argv.slice(2);
const option = key => { const index = args.indexOf('--' + key); return index < 0 ? undefined : args[index + 1]; };
const name = option('name');
const key = option('key');
const launchApp = option('launch-app');
if (launchApp) {
  const catalog = await readJson(path.join(ROOT, 'config/apps.json'));
  if (!/^[a-z0-9][a-z0-9._-]+$/.test(launchApp) || !catalog.some(app => app.id === launchApp) || key) throw new Error('Launch verification requires a configured app ID and cannot be combined with --key.');
}
const diagnose = args.includes('--diagnose');
const assertRendered = args.includes('--assert-rendered');
const keys = { left: ['ArrowLeft', 37], up: ['ArrowUp', 38], right: ['ArrowRight', 39], down: ['ArrowDown', 40], enter: ['Enter', 13], back: ['Escape', 461] };
if (!name || !/^[a-z0-9-]{1,80}$/.test(name) || (key && !keys[key])) throw new Error('Usage: node tools/inspect-app.mjs --name <capture-name> [--key left|up|right|down|enter|back]');

const ssh = new Client();
const sockets = new Set();
const server = net.createServer(incoming => {
  sockets.add(incoming); incoming.on('close', () => sockets.delete(incoming));
  incoming.on('error', () => incoming.destroy());
  ssh.forwardOut('127.0.0.1', incoming.remotePort || 0, '127.0.0.1', 9998, (error, outgoing) => {
    if (error) return incoming.destroy();
    outgoing.on('error', () => incoming.destroy()); incoming.pipe(outgoing); outgoing.pipe(incoming);
  });
});
let connection; let inspector;
try {
  const target = await readJson(path.join(ROOT, 'config/target.json'));
  connection = await connect();
  await verifyAresTarget(target, connection);
  const foreground = await connection.request('com.webos.applicationManager/getForegroundAppInfo');
  if (foreground.appId !== APP_ID) throw new Error('MyOwnTV must be visible before an app-viewport capture. This tool never captures a hidden app as proof of another screen.');
  const credentials = await readJson(CONNECTION_FILE);
  const devices = await readJson(path.join(process.env.APPDATA || process.env.HOME || process.env.USERPROFILE, '.webos/tv/novacom-devices.json'));
  const device = devices.find(entry => entry.name === target.aresDevice && entry.profile === 'tv');
  let privateKey;
  if (typeof device.privateKey === 'string') privateKey = Buffer.from(device.privateKey, 'base64');
  else {
    const filename = device.privateKey?.openSsh;
    if (!filename || path.basename(filename) !== filename) throw new Error('Unexpected SSH key path.');
    privateKey = await fs.readFile(path.join(os.homedir(), '.ssh', filename));
  }
  let sshFingerprint;
  const ready = once(ssh, 'ready');
  ssh.connect({ host: connection.host, port: 9922, username: 'prisoner', privateKey, passphrase: device.passphrase, readyTimeout: 10000, hostHash: 'sha256', hostVerifier: hash => { sshFingerprint = hash; return !credentials.sshFingerprint || credentials.sshFingerprint === hash; } });
  await ready;
  if (!credentials.sshFingerprint) await writeJson(CONNECTION_FILE, { ...credentials, sshFingerprint });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port;
  const response = await fetch('http://127.0.0.1:' + port + '/json/list', { signal: AbortSignal.timeout(7000), redirect: 'error' });
  const pages = await response.json();
  const page = Array.isArray(pages) && pages.find(entry => entry.url?.includes('/' + APP_ID + '/') && entry.webSocketDebuggerUrl);
  if (!page) throw new Error('No Web Inspector page for this developer app. No system app will be inspected.');
  const url = new URL(page.webSocketDebuggerUrl);
  if (!url.pathname.startsWith('/devtools/page/')) throw new Error('Unexpected app inspector path.');
  url.hostname = '127.0.0.1'; url.port = String(port);
  inspector = new WebSocket(url, { handshakeTimeout: 7000 });
  await once(inspector, 'open');
  let counter = 0;
  const pending = new Map();
  const logs = [];
  inspector.on('message', raw => {
    const result = JSON.parse(raw.toString());
    if (result.method === 'Log.entryAdded') logs.push(result.params.entry.text);
    if (!pending.has(result.id)) return;
    const entry = pending.get(result.id); clearTimeout(entry.timer); pending.delete(result.id);
    result.error ? entry.reject(new Error(result.error.message)) : entry.resolve(result.result);
  });
  inspector.on('error', error => { for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error); } pending.clear(); });
  const request = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++counter;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('App inspector timed out: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timer }); inspector.send(JSON.stringify({ id, method, params }));
  });
  await request('Page.enable');
  await request('Runtime.enable');
  if (diagnose) await request('Log.enable');
  if (key) {
    const [name, code] = keys[key];
    await request('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
    await request('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  const evaluation = await request('Runtime.evaluate', { expression: 'JSON.stringify({stylesheets:document.styleSheets.length,controls:document.querySelectorAll("#controls button").length,dock:document.querySelectorAll("#dock button").length,fitted:!!document.getElementById("stage").style.transform,visible:!document.hidden,focused:document.activeElement&&document.activeElement.id,title:document.getElementById("focused-name").textContent,home:document.getElementById("home").getAttribute("aria-hidden"),library:document.getElementById("library").getAttribute("aria-hidden"),panel:document.getElementById("panel").getAttribute("aria-hidden"),bridge:typeof PalmServiceBridge,platformBack:typeof((window.webOSSystem||window.PalmSystem||{}).platformBack),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight]})', returnByValue: true });
  if (evaluation.exceptionDetails) throw new Error('Could not inspect the launcher state.');
  const state = JSON.parse(evaluation.result.value);
  if (!state.visible) throw new Error('The launcher is no longer visible. A background viewport will not be saved as a TV screenshot.');
  if (args.includes('--export-preferences')) {
    const evaluated = await request('Runtime.evaluate', { expression: 'localStorage.getItem("myowntv.preferences.v1")', returnByValue: true });
    if (evaluated.exceptionDetails) throw new Error('Could not export launcher preferences; an update is not authorized.');
    const current = await connection.request('com.webos.applicationManager/listApps');
    const installed = current.apps.find(app => app.id === APP_ID);
    if (!installed) throw new Error('The installed launcher could not be identified.');
    const preferenceFile = path.join(LOCAL, 'preferences', new Date().toISOString().replace(/[:.]/g, '-') + '.json');
    const raw = evaluated.result.value ?? null;
    const preferenceRecord = { appId: APP_ID, version: installed.version, fingerprint: connection.fingerprint, created: new Date().toISOString(), raw, sha256: sha256(JSON.stringify(raw)) };
    await writeJson(preferenceFile, preferenceRecord, { exclusive: true });
    await writeJson(path.join(LOCAL, 'latest-own-preferences.json'), { file: preferenceFile });
    console.log('Exported only MyOwnTV preferences to a private local record.');
  }
  const capture = await request('Page.captureScreenshot', { format: 'png' });
  const image = Buffer.from(capture.data, 'base64');
  if (image.length < 100 || image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid app screenshot.');
  const destination = path.join(LOCAL, 'shots', name + '.png');
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, image, { flag: 'wx', mode: 0o600 });
  await writeJson(path.join(LOCAL, 'shots', name + '.json'), { source: 'Actual TV app viewport via Developer Mode Web Inspector; not whole-screen compositor capture', ...state }, { exclusive: true });
  console.log('Captured actual TV app viewport: ' + path.relative(ROOT, destination));
  console.log(JSON.stringify(state));
  if (diagnose) console.log(JSON.stringify({resourceDiagnostics:logs}));
  if (assertRendered && (state.stylesheets < 1 || state.controls !== 3 || state.dock < 1 || !state.fitted)) throw new Error('Render check failed: stylesheet and launcher UI did not initialize.');
  if (launchApp) {
    // Invoke an existing visible UI control, exercising the app's public launch bridge.
    const expression = '(function(){var id=' + JSON.stringify(launchApp) + ';var buttons=document.querySelectorAll("button[data-app-id]");for(var i=0;i<buttons.length;i++){if(buttons[i].dataset.appId===id&&buttons[i].getBoundingClientRect().width>0){buttons[i].scrollIntoView({block:"nearest",inline:"nearest"});buttons[i].focus();var r=buttons[i].getBoundingClientRect();if(r.top<0||r.left<0||r.bottom>innerHeight||r.right>innerWidth)return false;buttons[i].click();return true;}}return false;})()';
    const action = await request('Runtime.evaluate', { expression, returnByValue: true });
    if (action.exceptionDetails || action.result.value !== true) throw new Error('The requested app has no visible launcher button.');
    let opened = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const foreground = await connection.request('com.webos.applicationManager/getForegroundAppInfo');
      if (foreground.appId === launchApp) { opened = true; break; }
    }
    await writeJson(path.join(LOCAL, 'shots', name + '-launch.json'), { appId: launchApp, opened, created: new Date().toISOString(), evidence: 'Existing MyOwnTV button invoked; foreground ID checked via paired SSAP. No target-app screenshot or signed-in playback verification.' }, { exclusive: true });
    if (!opened) throw new Error('The requested app did not become foreground within 30 seconds.');
    console.log('Verified launcher button opened ' + launchApp + '. Playback remains a physical check.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (inspector) inspector.close();
  for (const socket of sockets) socket.destroy();
  if (server.listening) server.close();
  ssh.end();
  if (connection) connection.close();
}
