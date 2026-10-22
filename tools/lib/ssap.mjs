import { WebSocket } from 'ws';
import { isIP } from 'node:net';
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { LOCAL, readJson, writeJson } from './files.mjs';

export const CONNECTION_FILE = path.join(LOCAL, 'connection.json');
const permissions = ['LAUNCH', 'READ_INSTALLED_APPS', 'READ_APP_STATUS', 'READ_RUNNING_APPS', 'READ_UPDATE_INFO', 'READ_NETWORK_STATE', 'READ_INPUT_DEVICE_LIST', 'READ_SETTINGS', 'READ_CURRENT_CHANNEL', 'CONTROL_INPUT_JOYSTICK', 'CONTROL_INPUT_TV', 'CONTROL_TV_SCREEN', 'CONTROL_MOUSE_AND_KEYBOARD'];
const ALLOWED = new Set([
  'system/getSystemInfo', 'com.webos.service.update/getCurrentSWInformation',
  'com.webos.applicationManager/listApps', 'com.webos.applicationManager/listLaunchPoints',
  'com.webos.applicationManager/getForegroundAppInfo', 'tv/getExternalInputList',
  'settings/getSystemSettings', 'tv/executeOneShot', 'system.launcher/launch',
  'com.webos.service.networkinput/getPointerInputSocket'
]);

export async function connect({ host, clientKey, fingerprint, model, pairing = false } = {}) {
  if (!host) ({ host, clientKey, fingerprint, model } = await readJson(CONNECTION_FILE));
  if (!isIP(host) || host === '0.0.0.0' || host === '::') throw new Error('Use the verified TV IP address.');
  if (!pairing && (!clientKey || !fingerprint)) throw new Error('Pair the TV first; the stored TLS certificate must be pinned.');
  const socket = new WebSocket('wss://' + (isIP(host) === 6 ? '[' + host + ']' : host) + ':3001', { rejectUnauthorized: false });
  const pending = new Map();
  let counter = 0;
  let peerFingerprint;
  let registered;
  let closing = false;
  const ready = new Promise((resolve, reject) => { registered = { resolve, reject }; });
  const registrationTimer = setTimeout(() => { registered.reject(new Error('TV pairing timed out. Accept the connection on the TV, then try once more.')); socket.close(); }, pairing ? 90000 : 12000);
  socket.on('open', () => {
    peerFingerprint = socket._socket.getPeerCertificate().fingerprint256;
    if (!peerFingerprint || (fingerprint && fingerprint !== peerFingerprint)) {
      registered.reject(new Error('The TV certificate changed. Verify the TV identity before pairing again.'));
      socket.close(); return;
    }
    const payload = { forcePairing: pairing, pairingType: 'PROMPT', manifest: { manifestVersion: 1, appVersion: '0.1.0', appId: 'io.github.akeyblademaster.myowntv.tools', localizedAppNames: { '': 'MyOwnTV tools' }, permissions } };
    if (clientKey) payload['client-key'] = clientKey;
    socket.send(JSON.stringify({ id: 'register', type: 'register', payload }));
  });
  socket.on('message', data => {
    let message;
    try { message = JSON.parse(data.toString()); } catch (_) { return; }
    if (message.type === 'registered') {
      clearTimeout(registrationTimer);
      registered.resolve(message.payload['client-key'] || clientKey);
    } else if (message.type === 'error' && message.id === 'register') {
      clearTimeout(registrationTimer);
      registered.reject(new Error(message.error || 'TV refused registration.'));
      socket.close();
    } else if (pending.has(message.id)) {
      const entry = pending.get(message.id);
      clearTimeout(entry.timer); pending.delete(message.id);
      if (message.type === 'error' || message.payload?.returnValue === false) entry.reject(new Error(message.error || message.payload.errorText || 'The TV refused the request.'));
      else entry.resolve(message.payload);
    }
  });
  function fail(error) {
    clearTimeout(registrationTimer); registered.reject(error);
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    pending.clear();
  }
  socket.on('error', fail);
  socket.on('close', () => { if (!closing) fail(new Error('The TV connection closed.')); });
  let pairedKey;
  try { pairedKey = await ready; } catch (error) { socket.close(); throw error; }
  const request = (endpoint, payload = {}) => {
    if (!ALLOWED.has(endpoint)) return Promise.reject(new Error('This tool does not allow that TV operation.'));
    if (socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error('The TV is disconnected.'));
    return new Promise((resolve, reject) => {
      const id = 'myown-' + (++counter);
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('TV request timed out: ' + endpoint)); }, 10000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, type: 'request', uri: 'ssap://' + endpoint, payload }));
    });
  };
  const connection = {
    host, fingerprint: peerFingerprint, clientKey: pairedKey, request,
    close() { closing = true; fail(new Error('Connection closed.')); socket.close(); },
    async assertModel(expected) {
      const info = await request('system/getSystemInfo');
      if (info.modelName !== expected) throw new Error('Connected TV model does not match the intended target.');
      return info;
    },
    async button(name) {
      if (!['UP', 'DOWN', 'LEFT', 'RIGHT', 'ENTER', 'BACK', 'HOME', 'MENU', 'QMENU', 'EXIT'].includes(name)) throw new Error('Unsupported remote button. Factory/service keys are never allowed.');
      const response = await request('com.webos.service.networkinput/getPointerInputSocket');
      const url = new URL(response.socketPath);
      if (url.hostname.replace(/^\[|\]$/g, '') !== host || !['wss:', 'ws:'].includes(url.protocol)) throw new Error('TV returned an unexpected input endpoint.');
      await new Promise((resolve, reject) => {
        const pointer = new WebSocket(url, { rejectUnauthorized: false });
        const timer = setTimeout(() => { pointer.terminate(); reject(new Error('Remote input timed out.')); }, 7000);
        pointer.on('open', () => {
          if (url.protocol === 'wss:' && pointer._socket.getPeerCertificate().fingerprint256 !== peerFingerprint) { pointer.close(); clearTimeout(timer); reject(new Error('Input certificate does not match the paired TV.')); return; }
          pointer.send('type:button\nname:' + name + '\n\n', error => { clearTimeout(timer); pointer.close(); error ? reject(error) : resolve(); });
        });
        pointer.on('error', error => { clearTimeout(timer); reject(error); });
      });
    },
    async capture(destination) {
      const response = await request('tv/executeOneShot');
      if (!response.imageUri) throw new Error('The TV returned no screenshot. DRM or capture restrictions may apply.');
      const url = new URL(response.imageUri);
      if (url.hostname.replace(/^\[|\]$/g, '') !== host || !['http:', 'https:'].includes(url.protocol)) throw new Error('The screenshot URL is outside the paired TV.');
      const data = await new Promise((resolve, reject) => {
        const client = url.protocol === 'https:' ? https : http;
        const download = client.get(url, { rejectUnauthorized: false }, response => {
          if (url.protocol === 'https:' && response.socket.getPeerCertificate().fingerprint256 !== peerFingerprint) { response.destroy(); reject(new Error('Screenshot certificate differs from the paired TV.')); return; }
          if (response.statusCode !== 200) { response.resume(); reject(new Error('The TV screenshot could not be downloaded.')); return; }
          const chunks = []; let size = 0;
          response.on('data', data => { size += data.length; if (size > 20 * 1024 * 1024) { response.destroy(); reject(new Error('Screenshot exceeds size limit.')); } else chunks.push(data); });
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        });
        download.setTimeout(10000, () => download.destroy(new Error('Screenshot download timed out.')));
        download.on('error', reject);
      });
      if (data.length < 100) throw new Error('Empty screenshot. No capture was saved.');
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, data, { flag: 'wx', mode: 0o600 });
      return destination;
    }
  };
  if (!pairing && model) {
    try { await connection.assertModel(model); } catch (error) { connection.close(); throw error; }
  }
  return connection;
}

export async function pair(host, expectedModel) {
  const connection = await connect({ host, pairing: true });
  try {
    await connection.assertModel(expectedModel);
    await writeJson(CONNECTION_FILE, { host, clientKey: connection.clientKey, fingerprint: connection.fingerprint, model: expectedModel }, { exclusive: true });
  } finally { connection.close(); }
}
