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
  const directories = new Set();
  entries.directories = directories;
  let ended = false;
  for (let offset = 0; offset + 512 <= data.length;) {
    const header = data.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) {
      if (!data.subarray(offset).every(byte => byte === 0)) throw new Error('Unexpected data after tar terminator.');
      ended = true; break;
    }
    const text = (start, length) => header.subarray(start, start + length).toString().split('\0')[0];
    if (header.subarray(257, 263).toString() !== 'ustar\0' || header.subarray(263, 265).toString() !== '00') throw new Error('Only the supported ustar archive format is allowed.');
    let name = [text(345, 155), text(0, 100)].filter(Boolean).join('/');
    while (name.startsWith('./')) name = name.slice(2);
    const trailingSlash = name.endsWith('/');
    name = name.replace(/\/$/, '');
    if (!name || name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Unsafe or noncanonical tar path.');
    const sizeText = text(124, 12).trim();
    if (!/^[0-7]+$/.test(sizeText)) throw new Error('Invalid tar member size.');
    const size = parseInt(sizeText, 8);
    const type = text(156, 1);
    if (trailingSlash && type !== '5') throw new Error('Regular files may not end with a directory slash.');
    const checksumText = text(148, 8).trim();
    const checksum = header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
    if (!/^[0-7]+$/.test(checksumText) || checksum !== parseInt(checksumText, 8)) throw new Error('Invalid tar checksum.');
    offset += 512;
    if (size > 25 * 1024 * 1024 || offset + size > data.length || name.startsWith('/')) throw new Error('Unsafe tar member.');
    if (entries.has(name) || directories.has(name)) throw new Error('Duplicate canonical tar member.');
    if (type === '5') {
      if (size !== 0) throw new Error('Directory members may not contain data.');
      directories.add(name);
    } else {
      if (type !== '' && type !== '0') throw new Error('Links and special files are not allowed in a launcher IPK.');
      entries.set(name, data.subarray(offset, offset + size));
    }
    offset += Math.ceil(size / 512) * 512;
  }
  if (!ended) throw new Error('Truncated tar archive.');
  return entries;
}

export function inspectPackage(data) {
  if (data.length > 10 * 1024 * 1024) throw new Error('Launcher IPK exceeds the 10 MB size limit.');
  const ar = readAr(data);
  if (!ar.has('data.tar.gz') || !ar.has('control.tar.gz') || ar.get('debian-binary')?.toString() !== '2.0\n' || ar.size !== 3) throw new Error('IPK is missing or has unexpected archive members.');
  const control = readTar(gunzipSync(ar.get('control.tar.gz'), { maxOutputLength: 1024 * 1024 }));
  if (control.size !== 1 || !control.has('control') || control.directories.size) throw new Error('Only package control metadata is allowed; install/remove scripts are forbidden.');
  const fields = new Map();
  const allowedFields = new Set(['Package', 'Version', 'Section', 'Priority', 'Architecture', 'Installed-Size', 'Maintainer', 'Description', 'webOS-Package-Format-Version', 'webOS-Packager-Version']);
  for (const line of control.get('control').toString().split(/\r?\n/)) {
    if (!line || /^\s/.test(line)) continue;
    const field = line.match(/^([A-Za-z0-9-]+):\s*(.*)$/);
    if (!field || !allowedFields.has(field[1]) || fields.has(field[1])) throw new Error('Invalid, unsupported or duplicate package control field.');
    fields.set(field[1], field[2]);
  }
  const files = readTar(gunzipSync(ar.get('data.tar.gz'), { maxOutputLength: 25 * 1024 * 1024 }));
  const prefix = 'usr/palm/applications/' + APP_ID + '/';
  const packagePrefix = 'usr/palm/packages/' + APP_ID + '/';
  const parents = new Set(['usr', 'usr/palm', 'usr/palm/applications', 'usr/palm/packages', prefix.slice(0, -1), packagePrefix.slice(0, -1)]);
  for (const directory of files.directories) if (!parents.has(directory) && !directory.startsWith(prefix) && !directory.startsWith(packagePrefix)) throw new Error('IPK contains a directory outside this app.');
  for (const [name, body] of files) {
    if (!name.startsWith(prefix) && !name.startsWith('usr/palm/packages/' + APP_ID + '/')) throw new Error('IPK contains files outside this app.');
    if (body.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) || /\.(?:so|sh|node|exe)$/.test(name)) throw new Error('Native executables are not allowed in this web app.');
  }
  const infoBytes = files.get(prefix + 'appinfo.json');
  if (!infoBytes) throw new Error('No launcher appinfo in the IPK.');
  const info = JSON.parse(infoBytes.toString());
  const allowedAppFields = new Set(['id', 'version', 'vendor', 'type', 'main', 'title', 'appDescription', 'icon', 'largeIcon', 'resolution', 'uiRevision', 'disableBackHistoryAPI', 'requiredACG']);
  if (Object.keys(info).some(key => !allowedAppFields.has(key))) throw new Error('Unsupported app metadata or permissions.');
  if (info.id !== APP_ID || info.type !== 'web' || info.main !== 'index.html' || info.requiredPermissions || info.requiredACG?.some(group => group !== 'application.launcher') || !/^\d+\.\d+\.\d+$/.test(info.version)) throw new Error('IPK identity or permissions are invalid.');
  if (Array.from(files.keys()).some(name => /(?:^|\/)services\.json$/.test(name))) throw new Error('Background services are not allowed.');
  const packageBytes = files.get(packagePrefix + 'packageinfo.json');
  if (!packageBytes) throw new Error('No package identity metadata.');
  const packageInfo = JSON.parse(packageBytes.toString());
  if (fields.get('Package') !== APP_ID || fields.get('Version') !== info.version || fields.get('Architecture') !== 'all' || packageInfo.id !== APP_ID || packageInfo.version !== info.version || packageInfo.app !== APP_ID || Object.keys(packageInfo).some(key => !['id', 'version', 'app'].includes(key))) throw new Error('Control or package identity disagrees with this standalone app.');
  return { id: info.id, version: info.version, files: files.size };
}
