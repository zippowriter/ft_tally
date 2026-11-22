import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inferValue } from '../src/core/types.js';

test('inferValue は十進整数の文字列を数値に変換する', () => {
    assert.deepEqual(['42', '7'].map(inferValue), [42, 7]);
});
