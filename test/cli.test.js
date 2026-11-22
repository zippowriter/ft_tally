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
