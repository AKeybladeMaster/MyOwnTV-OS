import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { readAr, readTar, inspectPackage } from '../tools/lib/ipk.mjs';
import { APP_ID } from '../tools/lib/files.mjs';

function tar(entries) {
  const chunks = [];
  for (const { name, body = '', type = '0' } of entries) {
    const data = Buffer.from(body); const header = Buffer.alloc(512);
    header.write(name, 0, 100); header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
    header.write(data.length.toString(8).padStart(11, '0') + '\0', 124); header.write('00000000000\0', 136); header.fill(32, 148, 156); header.write(type, 156);
    header.write('ustar\0', 257); header.write('00', 263);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);
    chunks.push(header, data, Buffer.alloc((512 - data.length % 512) % 512));
  }
  return Buffer.concat([...chunks, Buffer.alloc(1024)]);
}
function ar(entries) {
  const chunks = [Buffer.from('!<arch>\n')];
  for (const [name, body] of entries) {
    const header = name.padEnd(16) + '0'.padEnd(12) + '0'.padEnd(6) + '0'.padEnd(6) + '100644'.padEnd(8) + String(body.length).padEnd(10) + '`\n';
    chunks.push(Buffer.from(header), body);
    if (body.length % 2) chunks.push(Buffer.from('\n'));
  }
  return Buffer.concat(chunks);
}
function packageWith({ id = APP_ID, permissions, extras = [], control = [], controlId = id, packageId = id } = {}) {
  const info = { id, type: 'web', main: 'index.html', version: '0.1.0' };
  if (permissions) info.requiredPermissions = permissions;
  return ar([['debian-binary', Buffer.from('2.0\n')], ['control.tar.gz', gzipSync(tar([{ name: 'control', body: 'Package: ' + controlId + '\nVersion: 0.1.0\nArchitecture: all\n' }, ...control]))], ['data.tar.gz', gzipSync(tar([{ name: 'usr/palm/applications/' + id + '/appinfo.json', body: JSON.stringify(info) }, { name: 'usr/palm/packages/' + id + '/packageinfo.json', body: JSON.stringify({ id: packageId, version: '0.1.0', app: packageId }) }, ...extras]))]]);
}

test('the installer accepts only this standalone web app identity', () => {
  assert.deepEqual(inspectPackage(packageWith()), { id: APP_ID, version: '0.1.0', files: 2 });
  assert.throws(() => inspectPackage(packageWith({ id: 'com.webos.app.home' })), /outside|identity/);
  assert.throws(() => inspectPackage(packageWith({ permissions: ['all'] })), /permissions/);
});
test('install scripts, services, links and files outside the app cannot enter an installation', () => {
  assert.throws(() => inspectPackage(packageWith({ control: [{ name: 'postinst', body: 'danger' }] })), /scripts/);
  assert.throws(() => inspectPackage(packageWith({ extras: [{ name: 'etc/profile', body: 'danger' }] })), /outside/);
  assert.throws(() => inspectPackage(packageWith({ extras: [{ name: 'usr/palm/applications/' + APP_ID + '/services.json', body: '{}' }] })), /services/);
  assert.throws(() => readTar(tar([{ name: 'link', type: '2' }])), /Links/);
  assert.throws(() => readTar(tar([{ name: '../etc/profile', body: 'danger' }])), /Unsafe/);
});
test('corrupt or truncated archives cannot be installed', () => {
  assert.throws(() => readAr(Buffer.from('not an archive')), /Not an IPK/);
  const valid = packageWith();
  assert.throws(() => readAr(valid.subarray(0, valid.length - 30)), /Invalid/);
  assert.throws(() => readTar(tar([{ name: 'file', body: 'hello' }]).subarray(0, 514)), /Unsafe/);
});
test('path aliases cannot replace validated metadata or hide install scripts and directories', () => {
  assert.throws(() => inspectPackage(packageWith({ control: [{ name: '././postinst', body: 'danger' }] })), /scripts/);
  assert.throws(() => inspectPackage(packageWith({ extras: [{ name: 'usr/palm/applications/' + APP_ID + '/./appinfo.json', body: '{"type":"native"}' }] })), /noncanonical/);
  assert.throws(() => inspectPackage(packageWith({ extras: [{ name: 'etc/', type: '5' }] })), /outside/);
  assert.throws(() => readTar(tar([{ name: 'file' }, { name: '././file' } ])), /Duplicate/);
});
test('control and package identities cannot redirect an otherwise valid web app package', () => {
  assert.throws(() => inspectPackage(packageWith({ controlId: 'com.webos.app.home' })), /identity/);
  assert.throws(() => inspectPackage(packageWith({ packageId: 'com.webos.app.home' })), /identity/);
});
test('unsupported tar formats and ambiguous directory headers cannot differ from LG extraction', () => {
  const legacy = tar([{ name: 'etc/profile', body: 'danger' }]);
  legacy.fill(0, 257, 265);
  legacy.write('usr/palm/applications/' + APP_ID, 345);
  legacy.fill(32, 148, 156);
  const checksum = legacy.subarray(0, 512).reduce((sum, byte) => sum + byte, 0);
  legacy.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);
  assert.throws(() => readTar(legacy), /ustar/);
  assert.throws(() => readTar(tar([{ name: 'folder/', body: 'hidden header' }])), /directory slash/);
});
