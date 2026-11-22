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
