import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT, readJson } from './files.mjs';

export function assertAresDefinition(devices, target, host) {
  const device = Array.isArray(devices) && devices.find(item => item.name === target.aresDevice && item.profile === 'tv');
  if (!device || device.host !== host || Number(device.port) !== 9922 || device.username !== 'prisoner') throw new Error('The LG CLI device alias does not match the paired TV SSH endpoint. Nothing may be installed or changed.');
}

export async function verifyAresTarget(target, connection) {
  const configRoot = process.env.APPDATA || process.env.HOME || process.env.USERPROFILE;
  const devices = await readJson(path.join(configRoot, '.webos/tv/novacom-devices.json'));
  assertAresDefinition(devices, target, connection.host);
  const info = await ares('device', ['-d', target.aresDevice, '--system-info']);
  if (!info.includes('modelName : ' + target.model) || !info.includes('firmwareVersion : ' + target.firmware)) throw new Error('The current SSH target identity/firmware differs from this project.');
  return info;
}

export function ares(command, args, { timeout = 45000 } = {}) {
  if (!['package', 'install', 'launch', 'device', 'inspect', 'novacom'].includes(command)) throw new Error('Unsupported CLI operation.');
  return new Promise((resolve, reject) => {
    const executable = path.join(ROOT, 'node_modules', '@webos-tools', 'cli', 'bin', 'ares-' + command + '.js');
    const child = spawn(process.execPath, [executable, ...args], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('LG CLI timed out during ' + command + '. Check the TV before retrying.')); }, timeout);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      code === 0 ? resolve(output.trim()) : reject(new Error(output.trim() || 'LG CLI failed: ' + command));
    });
  });
}
