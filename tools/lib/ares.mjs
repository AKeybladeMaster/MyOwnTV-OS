import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './files.mjs';

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
