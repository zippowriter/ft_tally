import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createQuery } from '../src/core/query.js';

test('run は条件を指定しないと入力順に全行を返す', () => {
    const rows = [{ genre: 'anime' }, { genre: 'news' }];

    assert.deepEqual(createQuery(rows).run(), rows);
});

test('where は述語を満たす行だけを返す', () => {
    const rows = [{ device: 'tv' }, { device: 'pc' }, { device: 'tv' }];

    assert.deepEqual(createQuery(rows).where((row) => row.device === 'tv').run(), [
        rows[0], rows[2],
    ]);
});

test('where の分岐は独立し連続する条件をすべて適用する', () => {
    const rows = [
        { device: 'tv', minutes: 3 },
        { device: 'pc', minutes: 10 },
        { device: 'tv', minutes: 10 },
    ];
    const base = createQuery(rows);
    const tv = base.where((row) => row.device === 'tv');
    const pc = base.where((row) => row.device === 'pc');
    const longTv = tv.where((row) => row.minutes >= 10);

    assert.notEqual(base, tv);
    assert.notEqual(tv, longTv);
    assert.deepEqual(longTv.run(), [rows[2]]);
    assert.deepEqual(pc.run(), [rows[1]]);
    assert.deepEqual(tv.run(), [rows[0], rows[2]]);
    assert.deepEqual(base.run(), rows);
});
