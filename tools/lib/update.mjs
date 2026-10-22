import { APP_ID, sha256 } from './files.mjs';

export function assertPreferenceExport(record, { version, fingerprint, snapshotCreated, now = Date.now() }) {
  const captured = typeof record.created === 'string' ? Date.parse(record.created) : NaN;
  const baseline = typeof snapshotCreated === 'string' ? Date.parse(snapshotCreated) : NaN;
  const validTime = Number.isFinite(captured) && Number.isFinite(baseline) && captured >= baseline && captured <= now + 1000 && baseline <= now && now - captured <= 600000 && now - baseline <= 600000;
  const validRaw = record.raw === null || typeof record.raw === 'string';
  if (record.appId !== APP_ID || record.version !== version || record.fingerprint !== fingerprint || !validTime || !validRaw || sha256(JSON.stringify(record.raw)) !== record.sha256) throw new Error('Take a fresh backup, then export current MyOwnTV preferences before updating.');
}
