import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from '../src/core/csv.js';
import { createQuery } from '../src/core/query.js';
import { inferTypes } from '../src/core/types.js';

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

test('CSV の型推論から絞り込みとグループ集計と上位抽出まで実行できる', () => {
    const csv = [
        'device,genre,minutes',
        'tv,news,4',
        'tv,anime,7',
        'pc,news,100',
        'tv,anime,5',
    ].join('\n');
    const { rows } = parseCsv(csv);

    const result = createQuery(inferTypes(rows))
        .where((row) => row.device === 'tv')
        .groupBy('genre')
        .aggregate({ total: ['sum', 'minutes'], n: ['count'] })
        .sortBy('total', 'desc')
        .limit(1)
        .run();

    assert.deepEqual(result, [{ genre: 'anime', total: 12, n: 2 }]);
});

test('groupBy 単独では型の違いと欠損値を保ちキーを初出順に返す', () => {
    const rows = [{ key: 7 }, { key: null }, { key: '7' }, { key: 7 }, { key: null }];
    const base = createQuery(rows);
    const grouped = base.groupBy('key');

    assert.notEqual(grouped, base);
    assert.deepEqual(grouped.run(), [{ key: 7 }, { key: null }, { key: '7' }]);
    assert.deepEqual(base.run(), rows);
});

test('グループ指定なしの aggregate は全行の集計を1行で返す', () => {
    const rows = [{ minutes: 5 }, { minutes: null }, { minutes: 7 }];
    const base = createQuery(rows);
    const summary = base.aggregate({ n: ['count'], total: ['sum', 'minutes'] });

    assert.notEqual(summary, base);
    assert.deepEqual(summary.run(), [{ n: 3, total: 12 }]);
    assert.deepEqual(base.run(), rows);
});

test('数値が0件のときは集計の種類とグループ指定に応じた結果を返す', () => {
    const aggregates = {
        n: ['count'],
        total: ['sum', 'minutes'],
        mean: ['avg', 'minutes'],
        low: ['min', 'minutes'],
        high: ['max', 'minutes'],
    };
    const base = createQuery([{ genre: 'anime', minutes: null }]);
    const emptyTotals = { n: 0, total: 0, mean: null, low: null, high: null };

    assert.deepEqual(base.groupBy('genre').aggregate(aggregates).run(), [
        { genre: 'anime', ...emptyTotals, n: 1 },
    ]);
    assert.deepEqual(createQuery([]).aggregate(aggregates).run(), [emptyTotals]);
    assert.deepEqual(base.where(() => false).aggregate(aggregates).run(), [emptyTotals]);
    assert.deepEqual(createQuery([]).groupBy('genre').aggregate(aggregates).run(), []);
});

test('入力と集計指定と述語に渡る行と実行結果からクエリの内部状態を変更できない', () => {
    const rows = [{ genre: 'anime', minutes: 4 }];
    const base = createQuery(rows);
    const aggregates = { total: ['sum', 'minutes'] };
    const summary = base.groupBy('genre').aggregate(aggregates);
    const filtered = base.where((row) => {
        row.minutes = 100;
        return true;
    });

    const result = filtered.run();
    assert.deepEqual(rows, [{ genre: 'anime', minutes: 4 }]);
    result[0].genre = 'news';
    result.push({ genre: 'news', minutes: 5 });
    rows[0].minutes = 200;
    rows.push({ genre: 'news', minutes: 3 });
    aggregates.total[0] = 'count';
    aggregates.extra = ['max', 'minutes'];

    assert.deepEqual(filtered.run(), [{ genre: 'anime', minutes: 4 }]);
    assert.deepEqual(base.run(), [{ genre: 'anime', minutes: 4 }]);
    assert.deepEqual(summary.run(), [{ genre: 'anime', total: 4 }]);
});

test('sortBy は方向省略時に文字列を昇順に並べ同値の順序と欠損値の末尾を保つ', () => {
    const rows = [
        { id: 1, genre: 'news' },
        { id: 2, genre: null },
        { id: 3, genre: 'anime' },
        { id: 4, genre: 'news' },
    ];
    const base = createQuery(rows);

    assert.deepEqual(base.sortBy('genre').run(), [rows[2], rows[0], rows[3], rows[1]]);
    assert.deepEqual(base.sortBy('genre', 'desc').run(), [rows[0], rows[3], rows[2], rows[1]]);
});

test('未知の集計関数を指定すると関数名を含むエラーになる', () => {
    const base = createQuery([{ minutes: 4 }]);

    assert.throws(() => base.aggregate({ value: ['median', 'minutes'] }).run(), /median/);
});

test('集計対象に存在しない列を指定すると列名を含むエラーになる', () => {
    const base = createQuery([{ minutes: 4 }]);

    assert.throws(() => base.aggregate({ total: ['sum', 'seconds'] }).run(), /未知の列: seconds/);
});

test('不正な並べ替え方向を指定するとエラーになる', () => {
    const base = createQuery([{ minutes: 4 }, { minutes: 2 }]);

    assert.throws(() => base.sortBy('minutes', 'up').run(), /並べ替え方向/);
});
