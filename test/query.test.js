import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createQuery } from '../src/core/query.js';

test('run は条件を指定しないと入力順に全行を返す', () => {
    const rows = [{ genre: 'anime' }, { genre: 'news' }];

    assert.deepEqual(createQuery(rows).run(), rows);
});
