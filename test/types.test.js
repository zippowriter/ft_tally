import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from '../src/core/csv.js';
import { inferTypes, inferValue, isNumericColumn } from '../src/core/types.js';

test('inferValue は十進整数の文字列を数値に変換する', () => {
    assert.deepEqual(['42', '7'].map(inferValue), [42, 7]);
});

test('inferValue は負の小数を数値に変換する', () => {
    assert.equal(inferValue('-3.5'), -3.5);
});

test('inferValue は指数表記を数値に変換する', () => {
    assert.equal(inferValue('1e3'), 1000);
});

test('inferValue は空文字列を欠損値に変換する', () => {
    assert.equal(inferValue(''), null);
});

test('inferValue は空白だけの文字列を欠損値に変換する', () => {
    assert.equal(inferValue(' \t\n'), null);
});

test('inferValue は NaN と Infinity を文字列のまま返す', () => {
    assert.deepEqual(['NaN', 'Infinity'].map(inferValue), ['NaN', 'Infinity']);
});

test('inferValue は十六進表記を文字列のまま返す', () => {
    assert.equal(inferValue('0x1F'), '0x1F');
});

test('inferValue は数値で始まる文字列全体を保持する', () => {
    assert.equal(inferValue('12abc'), '12abc');
});

test('inferValue は true と false を真偽値に変換する', () => {
    assert.deepEqual(['true', 'false'].map(inferValue), [true, false]);
});

test('inferValue は通常の文字列の前後の空白を保持する', () => {
    assert.equal(inferValue('  Tokyo  '), '  Tokyo  ');
});

test('inferTypes は CSV の行順と列名を保ち各セルを変換する', () => {
    const { rows } = parseCsv('値,表示,備考\n7,true,東京\n保留,false,');

    assert.deepEqual(inferTypes(rows), [
        { 値: 7, 表示: true, 備考: '東京' },
        { 値: '保留', 表示: false, 備考: null },
    ]);
    assert.deepEqual(rows, [
        { 値: '7', 表示: 'true', 備考: '東京' },
        { 値: '保留', 表示: 'false', 備考: '' },
    ]);
});

test('isNumericColumn は数値だけの列を数値列と判定する', () => {
    assert.equal(isNumericColumn([0, -3.5, 7]), true);
});

test('isNumericColumn は欠損値を除外して数値列を判定する', () => {
    assert.equal(isNumericColumn([null, 7, null, -3.5]), true);
});

test('isNumericColumn は文字列が混在する列を数値列と判定しない', () => {
    assert.equal(isNumericColumn([1, '2', null]), false);
});

test('isNumericColumn は真偽値が混在する列を数値列と判定しない', () => {
    assert.equal(isNumericColumn([1, false, null]), false);
});

test('isNumericColumn は非欠損値がない列を数値列と判定する', () => {
    assert.equal(isNumericColumn([null, null]), true);
    assert.equal(isNumericColumn([]), true);
});

test('inferValue は変換候補の前後に空白があると文字列を保持する', () => {
    const cells = [' 42 ', '42\n', ' true ', '\tfalse'];
    assert.deepEqual(cells.map(inferValue), cells);
});

test('inferValue は符号と小数点と指数の十進表記を扱う', () => {
    assert.deepEqual(['+42', '.5', '1.', '2E-1'].map(inferValue), [42, 0.5, 1, 0.2]);
});

test('inferValue は有限な数値に変換できない十進表記を文字列のまま返す', () => {
    const cells = ['1e309', '-1e309'];
    assert.deepEqual(cells.map(inferValue), cells);
});
