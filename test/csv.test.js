import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from '../src/core/csv.js';

test('parseCsv は LF 区切りの CSV を読み取り、セルの値を文字列のまま保持する', () => {
    const text = 'id,active\n001,false\n002,true';

    assert.deepEqual(parseCsv(text), {
        header: ['id', 'active'],
        rows: [
            { id: '001', active: 'false' },
            { id: '002', active: 'true' },
        ],
    });
});
