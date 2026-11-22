import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';

function runBrowser(chrome) {
    const profile = mkdtempSync(join(tmpdir(), 'ft-tally-viewer-'));
    try {
        const harness = new URL('./browser/viewer.html', import.meta.url);
        return spawnSync(chrome, [
            '--headless', '--no-first-run', '--disable-background-networking',
            '--allow-file-access-from-files', '--virtual-time-budget=10000',
            `--user-data-dir=${profile}`, '--dump-dom', harness.href,
        ], { encoding: 'utf8', timeout: 30000 });
    } finally {
        rmSync(profile, { recursive: true, force: true });
    }
}

const chrome = process.env.FT_TALLY_CHROME;
const browser = chrome ? runBrowser(chrome) : null;

function browserTest(id, name) {
    test(name, { skip: chrome ? false : 'FT_TALLY_CHROME に Chrome の実行ファイルを指定してください' }, () => {
        assert.equal(browser.error, undefined);
        assert.equal(browser.status, 0, browser.stderr);
        const report = browser.stdout.match(/<output id="results">([^<]+)<\/output>/u)?.[1];
        assert.ok(report, 'ブラウザのテスト結果を取得できる');
        const results = JSON.parse(decodeURIComponent(report));
        assert.ok(Object.hasOwn(results, id), '対象のテストがブラウザで実行される');
        assert.equal(results[id], '成功');
    });
}

browserTest('initial', 'ビューアはモジュールを読み込みファイル入力だけを有効にする');
browserTest('columns', 'ビューアは CSV ヘッダーから両方の列選択肢を作る');
browserTest('render', 'ビューアは型推論した CSV をヘッダーとデータ行に表示する');
browserTest('groups', 'ビューアは再読み込みせずにグループ化列の変更を反映する');
