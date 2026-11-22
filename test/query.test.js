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

test('groupBy と aggregate はグループごとの件数を返す', () => {
    const rows = [{ genre: 'anime' }, { genre: 'news' }, { genre: 'anime' }];
    const result = createQuery(rows).groupBy('genre').aggregate({ n: ['count'] }).run();

    assert.deepEqual(result, [{ genre: 'anime', n: 2 }, { genre: 'news', n: 1 }]);
});

test('sum は欠損値を除いた数値を合計する', () => {
    const rows = [
        { genre: 'anime', minutes: 7 },
        { genre: 'anime', minutes: null },
        { genre: 'anime', minutes: -2.5 },
    ];
    const result = createQuery(rows).groupBy('genre').aggregate({ total: ['sum', 'minutes'] }).run();

    assert.deepEqual(result, [{ genre: 'anime', total: 4.5 }]);
});

test('avg は欠損値を件数に含めず平均を返す', () => {
    const rows = [
        { genre: 'anime', minutes: 0 },
        { genre: 'anime', minutes: 5 },
        { genre: 'anime', minutes: null },
    ];
    const result = createQuery(rows).groupBy('genre').aggregate({ mean: ['avg', 'minutes'] }).run();

    assert.deepEqual(result, [{ genre: 'anime', mean: 2.5 }]);
});

test('min は欠損値を除いた最小値を返す', () => {
    const rows = [
        { genre: 'anime', minutes: 5 },
        { genre: 'anime', minutes: null },
        { genre: 'anime', minutes: 2 },
    ];
    const result = createQuery(rows).groupBy('genre').aggregate({ low: ['min', 'minutes'] }).run();

    assert.deepEqual(result, [{ genre: 'anime', low: 2 }]);
});

test('max は欠損値を除いた最大値を返す', () => {
    const rows = [
        { genre: 'anime', score: -4 },
        { genre: 'anime', score: null },
        { genre: 'anime', score: -2 },
    ];
    const result = createQuery(rows).groupBy('genre').aggregate({ high: ['max', 'score'] }).run();

    assert.deepEqual(result, [{ genre: 'anime', high: -2 }]);
});

test('数値集計は絞り込み前に列全体を調べて列名付きのエラーを返す', () => {
    const rows = [
        { genre: 'anime', minutes: 4 },
        { genre: 'news', minutes: '不明' },
        { genre: 'drama', minutes: null },
    ];

    for (const operation of ['sum', 'avg', 'min', 'max']) {
        const query = createQuery(rows).where((row) => row.genre === 'anime').groupBy('genre');
        assert.throws(() => query.aggregate({ value: [operation, 'minutes'] }).run(), /minutes/);
    }
});

test('sortBy は数値を昇順と降順で並べ替え入力と親クエリを保つ', () => {
    const rows = Object.freeze([{ score: 10 }, { score: -3 }, { score: 2 }]);
    const base = createQuery(rows);
    const ascending = base.sortBy('score', 'asc');
    const descending = base.sortBy('score', 'desc');

    assert.notEqual(ascending, base);
    assert.notEqual(descending, base);
    assert.deepEqual(ascending.run(), [rows[1], rows[2], rows[0]]);
    assert.deepEqual(descending.run(), [rows[0], rows[2], rows[1]]);
    assert.deepEqual(base.run(), [{ score: 10 }, { score: -3 }, { score: 2 }]);
});

test('limit は先頭から指定件数を返し0件や過大な指定も扱う', () => {
    const rows = [{ score: 1 }, { score: 2 }, { score: 3 }];
    const base = createQuery(rows);

    assert.notEqual(base.limit(2), base);
    assert.deepEqual(base.limit(2).run(), rows.slice(0, 2));
    assert.deepEqual(base.limit(0).run(), []);
    assert.deepEqual(base.limit(10).run(), rows);
    assert.deepEqual(base.run(), rows);
});
