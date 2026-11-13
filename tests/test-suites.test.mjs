import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {TEST_SUITES,selectTests} from '../scripts/test-suites.mjs';

test('the deck section never selects online, combat or audio tests',()=>{
  assert.deepEqual(selectTests(['deck']),['deck-storage.test.mjs']);
  assert.ok(selectTests(['online']).every(file=>file.startsWith('online')));
});
test('combining sections runs each test file only once',()=>{
  const selected=selectTests(['deck','online','deck']);
  assert.equal(selected.length,3);assert.equal(new Set(selected).size,selected.length);
});
test('every unit test belongs to a section and all includes the same files',async()=>{
  const files=(await readdir(new URL('.',import.meta.url))).filter(file=>file.endsWith('.test.mjs')).sort();
  assert.deepEqual(selectTests(['all']).sort(),files);
  assert.equal(Object.values(TEST_SUITES).flat().length,files.length);
});
test('missing or unknown sections fail instead of silently running the full suite',()=>{
  assert.throws(()=>selectTests([]),/Indicá una sección/);
  assert.throws(()=>selectTests(['decck']),/desconocida/);
});
