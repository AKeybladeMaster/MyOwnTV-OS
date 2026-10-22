import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAresDefinition } from '../tools/lib/ares.mjs';

const target = { aresDevice: 'myown-lg' };
const device = { name: 'myown-lg', profile: 'tv', host: '192.0.2.10', port: '9922', username: 'prisoner' };
test('the SSH alias must still match the paired TV, even if a previous backup was valid', () => {
  assert.doesNotThrow(() => assertAresDefinition([device], target, '192.0.2.10'));
  for (const change of [{ host: '192.0.2.11' }, { port: 22 }, { username: 'root' }, { profile: 'ose' }, { name: 'another-tv' }]) {
    assert.throws(() => assertAresDefinition([{ ...device, ...change }], target, '192.0.2.10'), /does not match/);
  }
  assert.throws(() => assertAresDefinition([], target, '192.0.2.10'), /does not match/);
});
