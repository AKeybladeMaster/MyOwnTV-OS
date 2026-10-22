import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_ID, sha256 } from '../tools/lib/files.mjs';
import { assertPreferenceExport } from '../tools/lib/update.mjs';

test('an update needs fresh preferences from this TV and version, after its baseline', () => {
  const now = Date.parse('2026-10-22T14:00:00.000Z');
  const context = { version: '0.1.0', fingerprint: 'paired-tv', snapshotCreated: '2026-10-22T13:59:00.000Z', now };
  const record = { appId: APP_ID, version: '0.1.0', fingerprint: 'paired-tv', created: '2026-10-22T13:59:30.000Z', raw: null, sha256: sha256('null') };
  assert.doesNotThrow(() => assertPreferenceExport(record, context));
  for (const change of [{ created: undefined }, { created: 'bad date' }, { created: '2026-10-22T13:58:00.000Z' }, { created: '2026-10-22T14:01:00.000Z' }, { raw: {} }, { version: '0.2.0' }, { fingerprint: 'another-tv' }, { sha256: 'damaged' }]) assert.throws(() => assertPreferenceExport({ ...record, ...change }, context), /fresh backup/);
  assert.throws(() => assertPreferenceExport(record, { ...context, now: now + 700000 }), /fresh backup/);
  assert.throws(() => assertPreferenceExport(record, { ...context, snapshotCreated: undefined }), /fresh backup/);
});
