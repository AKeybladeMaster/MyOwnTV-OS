import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const LOCAL = path.join(ROOT, '.local');
export const APP_ID = 'io.github.akeyblademaster.myowntv';
export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
export const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));

export async function writeJson(file, value, { exclusive = false } = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const text = JSON.stringify(value, null, 2) + '\n';
  if (exclusive) return fs.writeFile(file, text, { flag: 'wx', mode: 0o600 });
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  await fs.writeFile(temporary, text, { flag: 'wx', mode: 0o600 });
  await fs.rename(temporary, file);
}

export async function assertLocalPath(file, parent = LOCAL) {
  const resolved = path.resolve(file);
  const relative = path.relative(path.resolve(parent), resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('The record must be inside ' + path.basename(parent) + '.');
  return resolved;
}
