import { gunzipSync } from 'node:zlib';
import { APP_ID } from './files.mjs';

export function readAr(data) {
  if (data.subarray(0, 8).toString() !== '!<arch>\n') throw new Error('Not an IPK/ar archive.');
  const entries = new Map();
  let offset = 8;
  while (offset + 60 <= data.length) {
    const name = data.subarray(offset, offset + 16).toString().trim().replace(/\/$/, '');
    const sizeText = data.subarray(offset + 48, offset + 58).toString().trim();
    if (!/^\d+$/.test(sizeText) || data.subarray(offset + 58, offset + 60).toString() !== '`\n') throw new Error('Malformed IPK archive.');
    const size = Number(sizeText);
    offset += 60;
    if (!Number.isSafeInteger(size) || offset + size > data.length || entries.has(name)) throw new Error('Invalid IPK member.');
    entries.set(name, data.subarray(offset, offset + size));
    offset += size + size % 2;
  }
  if (offset !== data.length) throw new Error('Invalid trailing IPK data.');
  return entries;
}

export function readTar(data) {
  const entries = new Map();
  for (let offset = 0; offset + 512 <= data.length;) {
    const header = data.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const text = (start, length) => header.subarray(start, start + length).toString().split('\0')[0];
    const name = [text(345, 155), text(0, 100)].filter(Boolean).join('/').replace(/^\.\//, '');
    const sizeText = text(124, 12).trim();
    if (!/^[0-7]+$/.test(sizeText)) throw new Error('Invalid tar member size.');
    const size = parseInt(sizeText, 8);
    const type = text(156, 1);
    const checksumText = text(148, 8).trim();
    const checksum = header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
    if (!/^[0-7]+$/.test(checksumText) || checksum !== parseInt(checksumText, 8)) throw new Error('Invalid tar checksum.');
    offset += 512;
    if (size > 25 * 1024 * 1024 || offset + size > data.length || name.split('/').includes('..') || name.startsWith('/')) throw new Error('Unsafe tar member.');
    if (type !== '5') {
      if (type !== '' && type !== '0') throw new Error('Links and special files are not allowed in a launcher IPK.');
      if (entries.has(name)) throw new Error('Duplicate tar member.');
      entries.set(name, data.subarray(offset, offset + size));
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return entries;
}

export function inspectPackage(data) {
  if (data.length > 10 * 1024 * 1024) throw new Error('Launcher IPK exceeds the 10 MB size limit.');
  const ar = readAr(data);
  if (!ar.has('data.tar.gz') || !ar.has('control.tar.gz') || ar.get('debian-binary')?.toString() !== '2.0\n' || ar.size !== 3) throw new Error('IPK is missing or has unexpected archive members.');
  const control = readTar(gunzipSync(ar.get('control.tar.gz'), { maxOutputLength: 1024 * 1024 }));
  for (const name of control.keys()) if (/^(preinst|postinst|prerm|postrm)$/.test(name)) throw new Error('Install/remove scripts are not allowed.');
  const files = readTar(gunzipSync(ar.get('data.tar.gz'), { maxOutputLength: 25 * 1024 * 1024 }));
  const prefix = 'usr/palm/applications/' + APP_ID + '/';
  for (const [name, body] of files) {
    if (!name.startsWith(prefix) && !name.startsWith('usr/palm/packages/' + APP_ID + '/')) throw new Error('IPK contains files outside this app.');
    if (body.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) || /\.(?:so|sh|node|exe)$/.test(name)) throw new Error('Native executables are not allowed in this web app.');
  }
  const infoBytes = files.get(prefix + 'appinfo.json');
  if (!infoBytes) throw new Error('No launcher appinfo in the IPK.');
  const info = JSON.parse(infoBytes.toString());
  if (info.id !== APP_ID || info.type !== 'web' || info.main !== 'index.html' || info.requiredPermissions || info.requiredACG?.some(group => group !== 'application.launcher') || !/^\d+\.\d+\.\d+$/.test(info.version)) throw new Error('IPK identity or permissions are invalid.');
  if (Array.from(files.keys()).some(name => /(?:^|\/)services\.json$/.test(name))) throw new Error('Background services are not allowed.');
  return { id: info.id, version: info.version, files: files.size };
}
