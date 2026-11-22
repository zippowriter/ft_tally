import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

function runCli(...args) {
    const cli = fileURLToPath(new URL('../bin/ft_tally.js', import.meta.url));
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    if (result.error) throw result.error;
    return result;
}

function runWithCsv(t, csv, ...options) {
    const directory = mkdtempSync(join(tmpdir(), 'ft-tally-'));
    const file = join(directory, 'input data.csv');
    writeFileSync(file, csv);
    t.after(() => {
        unlinkSync(file);
        rmdirSync(directory);
    });
    return runCli(file, ...options);
}

function assertSuccess(result, expected) {
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, expected);
}

function assertFailure(result, message) {
    assert.equal(result.status, 1);
    assert.equal(result.signal, null);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, message);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
}

test('CLI は指定の CSV を読み込んで列幅を揃えた表を出す', (t) => {
    const result = runWithCsv(t, 'genre,minutes\nanime,5\ndocumentary,123\n');

    assertSuccess(result, 'genre        minutes\nanime              5\ndocumentary      123\n');
});

test('CLI は型推論済みの行を整形済み JSON で出す', (t) => {
    const result = runWithCsv(t, 'minutes,active,note\n1e3,true,\n-2.5,false,保留\n', '--format', 'json');

    assertSuccess(result, JSON.stringify([
        { minutes: 1000, active: true, note: null },
        { minutes: -2.5, active: false, note: '保留' },
    ], null, 2) + '\n');
});

test('CLI の複数の絞り込み条件は型推論した値を比較する', (t) => {
    const csv = 'device,active,minutes\ntv,true,1000\ntv,false,1000\npc,true,1000\ntv,true,5\n';
    const result = runWithCsv(t, csv,
        '--where', 'device=tv', '--where', 'active=true', '--where', 'minutes=1e3', '--format', 'json');

    assertSuccess(result, JSON.stringify([{ device: 'tv', active: true, minutes: 1000 }], null, 2) + '\n');
});

test('CLI はグループごとの行数を数える', (t) => {
    const result = runWithCsv(t, 'genre,minutes\nanime,7\nnews,4\nanime,\n',
        '--group-by', 'genre', '--count', '--format', 'json');

    assertSuccess(result, JSON.stringify([
        { genre: 'anime', count: 2 }, { genre: 'news', count: 1 },
    ], null, 2) + '\n');
});

test('CLI の --sum は欠損値を除いた合計を返す', (t) => {
    const result = runWithCsv(t, 'genre,minutes\nanime,8\nnews,\nanime,2\n',
        '--sum', 'minutes', '--format', 'json');

    assertSuccess(result, JSON.stringify([{ sum_minutes: 10 }], null, 2) + '\n');
});

test('CLI の --avg は欠損値を除いた平均を返す', (t) => {
    const result = runWithCsv(t, 'genre,minutes\nanime,8\nnews,\nanime,2\n',
        '--avg', 'minutes', '--format', 'json');

    assertSuccess(result, JSON.stringify([{ avg_minutes: 5 }], null, 2) + '\n');
});

test('CLI の --min は欠損値を除いた最小値を返す', (t) => {
    const result = runWithCsv(t, 'genre,minutes\nanime,8\nnews,\nanime,2\n',
        '--min', 'minutes', '--format', 'json');

    assertSuccess(result, JSON.stringify([{ min_minutes: 2 }], null, 2) + '\n');
});

test('CLI の --max は欠損値を除いた最大値を返す', (t) => {
    const result = runWithCsv(t, 'genre,minutes\nanime,8\nnews,\nanime,2\n',
        '--max', 'minutes', '--format', 'json');

    assertSuccess(result, JSON.stringify([{ max_minutes: 8 }], null, 2) + '\n');
});

test('CLI の並べ替えは入力列の数値を昇順と降順に並べる', (t) => {
    const csv = 'minutes\n10\n-3\n2\n';
    for (const [direction, values] of [['asc', [-3, 2, 10]], ['desc', [10, 2, -3]]]) {
        const result = runWithCsv(t, csv, '--sort', `minutes:${direction}`, '--format', 'json');
        assertSuccess(result, JSON.stringify(values.map((minutes) => ({ minutes })), null, 2) + '\n');
    }
});

test('CLI の件数制限は並べ替え後に適用し0件も扱う', (t) => {
    const csv = 'minutes\n2\n10\n3\n';
    for (const [maximum, rows] of [['1', [{ minutes: 10 }]], ['0', []]]) {
        const result = runWithCsv(t, csv, '--limit', maximum, '--sort', 'minutes:desc', '--format', 'json');
        assertSuccess(result, JSON.stringify(rows, null, 2) + '\n');
    }
});

test('CLI は課題文の使用例どおり集計済みの上位3件を表で出す', (t) => {
    const csv = 'genre,minutes\nnews,3310\nanime,18000\ndrama,12004\nanime,230\nsports,1500\n';
    const result = runWithCsv(t, csv, '--group-by', 'genre', '--sum', 'minutes',
        '--sort', 'sum_minutes:desc', '--limit', '3');

    assertSuccess(result, 'genre  sum_minutes\nanime        18230\ndrama        12004\nnews          3310\n');
});

test('CLI はファイル引数がないと使い方を標準エラー出力に出す', () => {
    assertFailure(runCli(), /使い方.*<file\.csv>/);
});

test('CLI は存在しないファイルを標準エラー出力と終了コード1で伝える', (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'ft-tally-'));
    t.after(() => rmdirSync(directory));

    assertFailure(runCli(join(directory, 'missing.csv')), /ENOENT.*missing\.csv/);
});

test('CLI は不正な CSV のエラーに行番号を含める', (t) => {
    const result = runWithCsv(t, 'genre,minutes\nanime\n');

    assertFailure(result, /line 2/);
});

test('CLI は未知のオプションと余分な位置引数を拒否する', (t) => {
    for (const argument of ['--unknown', 'extra.csv']) {
        const result = runWithCsv(t, 'genre\nanime\n', argument);
        assertFailure(result, /不正なオプション/);
        assert.ok(result.stderr.includes(argument));
    }
});

test('CLI は値を必要とするオプションの値がなければ拒否する', (t) => {
    for (const flag of ['--format', '--where', '--group-by', '--sum', '--avg', '--min', '--max', '--sort', '--limit']) {
        for (const rest of [[], ['--count']]) {
            const result = runWithCsv(t, 'genre\nanime\n', flag, ...rest);
            assertFailure(result, /値が必要/);
            assert.ok(result.stderr.includes(flag));
        }
    }
});

test('CLI は未対応の出力形式を拒否する', (t) => {
    const result = runWithCsv(t, 'genre\nanime\n', '--format', 'csv');

    assertFailure(result, /--format.*csv/);
});

test('CLI は列名と等号が揃っていない絞り込み条件を拒否する', (t) => {
    for (const condition of ['genre', '=anime']) {
        const result = runWithCsv(t, 'genre\nanime\n', '--where', condition);
        assertFailure(result, /--where.*col=value/);
    }
});

test('CLI は列名や方向が不正な並べ替え指定を拒否する', (t) => {
    for (const order of ['genre', 'genre:', ':asc', 'genre:up']) {
        const result = runWithCsv(t, 'genre\nanime\n', '--sort', order);
        assertFailure(result, /--sort.*col:asc/);
    }
});

test('CLI は安全な非負の十進整数でない件数を拒否する', (t) => {
    for (const maximum of ['-1', '1.5', '1e3', '9007199254740992', '']) {
        const result = runWithCsv(t, 'genre\nanime\n', '--limit', maximum);
        assertFailure(result, /--limit.*整数/);
    }
});

test('CLI はデータ行がなくても未知の入力列を拒否する', (t) => {
    for (const options of [
        ['--where', 'unknown=tv'],
        ['--group-by', 'unknown'],
        ['--sum', 'unknown'],
        ['--avg', 'unknown'],
        ['--min', 'unknown'],
        ['--max', 'unknown'],
    ]) {
        const result = runWithCsv(t, 'genre,minutes\n', ...options);
        assertFailure(result, /未知の列: unknown/);
    }
});

test('CLI は結果が0行でも結果の列にない並べ替え指定を拒否する', (t) => {
    const csv = 'genre,minutes\nanime,5\n';
    const result = runWithCsv(t, csv, '--where', 'genre=news', '--group-by', 'genre',
        '--sum', 'minutes', '--sort', 'minutes:desc');

    assertFailure(result, /未知の列: minutes/);
});

test('CLI は数値列でない列の集計エラーに列名を含める', (t) => {
    const result = runWithCsv(t, 'genre,minutes\nanime,5\nnews,不明\n',
        '--where', 'genre=anime', '--sum', 'minutes');

    assertFailure(result, /数値列.*minutes/);
});

test('CLI の絞り込みでは空の値と等号を含む値を指定できる', (t) => {
    const csv = 'note,minutes\n,1\na=b=c,2\na,3\n';
    for (const [condition, row] of [
        ['note=', { note: null, minutes: 1 }],
        ['note=a=b=c', { note: 'a=b=c', minutes: 2 }],
    ]) {
        const result = runWithCsv(t, csv, '--where', condition, '--format', 'json');
        assertSuccess(result, JSON.stringify([row], null, 2) + '\n');
    }
});
