import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inferValue } from '../src/core/types.js';

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
