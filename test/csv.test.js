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

test('parseCsv は引用符で囲んだセルに改行を含められる', () => {
    const text = 'id,note,active\n001,"first line\nsecond line",true';

    assert.deepEqual(parseCsv(text), {
        header: ['id', 'note', 'active'],
        rows: [{ id: '001', note: 'first line\nsecond line', active: 'true' }],
    });
});

test('parseCsv は引用符付きセル内の連続する二重引用符を1文字として読み取る', () => {
    const text = 'id,note\n001,"He said ""hello""."';

    assert.deepEqual(parseCsv(text), {
        header: ['id', 'note'],
        rows: [{ id: '001', note: 'He said "hello".' }],
    });
});

test('parseCsv は行末の空セルを空文字列として保持する', () => {
    const text = 'id,note\n001,\n002,';

    assert.deepEqual(parseCsv(text), {
        header: ['id', 'note'],
        rows: [{ id: '001', note: '' }, { id: '002', note: '' }],
    });
});

test('parseCsv はファイル末尾の改行で余分なレコードを作らない', () => {
    const text = 'id,note\n001,hello\n';

    assert.deepEqual(parseCsv(text), {
        header: ['id', 'note'],
        rows: [{ id: '001', note: 'hello' }],
    });
});

test('parseCsv は閉じていない引用符のエラーにレコードの開始行を含める', () => {
    const text = 'id,note\r\n001,ok\r\n002,"first line\r\nsecond line';

    assert.throws(() => parseCsv(text), /\bline 3\b/);
});
