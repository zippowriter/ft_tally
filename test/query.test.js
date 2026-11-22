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
