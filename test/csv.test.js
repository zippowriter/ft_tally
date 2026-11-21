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

test('parseCsv は CRLF 区切りの CSV を読み取る', () => {
    const text = 'id,active\r\n001,false\r\n002,true';

    assert.deepEqual(parseCsv(text), {
        header: ['id', 'active'],
        rows: [
            { id: '001', active: 'false' },
            { id: '002', active: 'true' },
        ],
    });
});

test('parseCsv は引用符で囲んだヘッダー名にカンマを含められる', () => {
    const text = 'id,"city,country"\n001,Tokyo';

    assert.deepEqual(parseCsv(text), {
        header: ['id', 'city,country'],
        rows: [{ id: '001', 'city,country': 'Tokyo' }],
    });
});

test('parseCsv は引用符で囲んだセルにカンマを含められる', () => {
    const text = 'id,location,active\n001,"Tokyo,Japan",true';

    assert.deepEqual(parseCsv(text), {
        header: ['id', 'location', 'active'],
        rows: [{ id: '001', location: 'Tokyo,Japan', active: 'true' }],
    });
});
