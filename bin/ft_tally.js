#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { parseCsv } from '../src/core/csv.js';
import { createQuery } from '../src/core/query.js';
import { inferTypes, inferValue } from '../src/core/types.js';

function escapeTableText(value) {
    const escapes = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };
    return String(value ?? '').replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/gu, (character) => {
        const hex = character.codePointAt(0).toString(16).padStart(4, '0');
        return escapes[character] ?? '\\u' + hex;
    });
}

function displayWidth(text, segmenter) {
    if (/^[\x20-\x7e]*$/u.test(text)) return text.length;
    // 全角の文字範囲と絵文字を2桁として数える。
    const wide = /^[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff01-\uff60\uffe0-\uffe6\u{1b000}-\u{1b2ff}\u{20000}-\u{3fffd}]/u;
    const emoji = /\p{Emoji_Presentation}|\ufe0f|\u20e3/u;
    let width = 0;
    for (const { segment } of segmenter.segment(text)) {
        width += wide.test(segment) || emoji.test(segment) ? 2 : 1;
    }
    return width;
}

function formatCell({ text, width, numeric }, columnWidth, isLast) {
    const padding = ' '.repeat(columnWidth - width);
    if (numeric) return padding + text;
    return isLast ? text : text + padding;
}

function formatTable(columns, rows) {
    const records = [columns, ...rows.map((row) => columns.map((column) => row[column]))];
    const segmenter = new Intl.Segmenter();
    const cells = records.map((record) => record.map((value) => {
        const text = escapeTableText(value);
        return { text, width: displayWidth(text, segmenter), numeric: typeof value === 'number' };
    }));
    const widths = columns.map((_, index) => cells.reduce((width, record) => {
        return Math.max(width, record[index].width);
    }, 0));
    return cells.map((record) => record.map((cell, index) => {
        return formatCell(cell, widths[index], index === columns.length - 1);
    }).join('  ')).join('\n');
}

function parseWhere(text) {
    const separator = text.indexOf('=');
    if (separator < 1) throw new Error('--where は col=value の形式で指定してください');
    return [text.slice(0, separator), inferValue(text.slice(separator + 1))];
}

function parseSort(text) {
    const separator = text.lastIndexOf(':');
    const direction = text.slice(separator + 1);
    if (separator < 1 || (direction !== 'asc' && direction !== 'desc')) {
        throw new Error('--sort は col:asc または col:desc の形式で指定してください');
    }
    return [text.slice(0, separator), direction];
}

function parseFormat(value) {
    if (value !== 'table' && value !== 'json') throw new Error(`不正な --format: ${value}`);
    return value;
}

function parseLimit(text) {
    const maximum = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(maximum)) {
        throw new Error('--limit は安全な範囲の0以上の十進整数で指定してください');
    }
    return maximum;
}

function valueOptions(options) {
    const handlers = new Map([
        ['--format', (value) => { options.format = parseFormat(value); }],
        ['--where', (value) => { options.filters.push(parseWhere(value)); }],
        ['--group-by', (value) => { options.group = value; }],
        ['--sort', (value) => { options.sort = parseSort(value); }],
        ['--limit', (value) => { options.maximum = parseLimit(value); }],
    ]);
    for (const operation of ['sum', 'avg', 'min', 'max']) {
        handlers.set(`--${operation}`, (column) => {
            options.aggregates.set(`${operation}_${column}`, [operation, column]);
        });
    }
    return handlers;
}

function parseOptions(args) {
    const options = { format: 'table', filters: [], aggregates: new Map() };
    const handlers = valueOptions(options);
    for (let index = 0; index < args.length; index += 1) {
        const flag = args[index];
        if (flag === '--count') {
            options.aggregates.set('count', ['count']);
        } else {
            const handler = handlers.get(flag);
            if (handler === undefined) throw new Error(`不正なオプション: ${flag}`);
            const value = args[index + 1];
            if (value === undefined || value.startsWith('--')) {
                throw new Error(`${flag} には値が必要です`);
            }
            handler(value);
            index += 1;
        }
    }
    return options;
}

function buildQuery(rows, options) {
    let query = options.filters.reduce((query, [column, value]) => {
        return query.where((row) => row[column] === value);
    }, createQuery(rows));
    if (options.group !== undefined) query = query.groupBy(options.group);
    if (options.aggregates.size > 0) query = query.aggregate(Object.fromEntries(options.aggregates));
    if (options.sort !== undefined) query = query.sortBy(...options.sort);
    if (options.maximum !== undefined) query = query.limit(options.maximum);
    return query;
}

function outputColumns(header, { group, aggregates }) {
    if (group !== undefined) return [group, ...aggregates.keys()];
    return aggregates.size === 0 ? header : Array.from(aggregates.keys());
}

function assertColumn(columns, column) {
    if (!columns.includes(column)) throw new Error(`未知の列: ${column}`);
}

function validateInputColumns(header, { filters, group, aggregates }) {
    filters.forEach(([column]) => assertColumn(header, column));
    if (group !== undefined) assertColumn(header, group);
    for (const [operation, column] of aggregates.values()) {
        if (operation !== 'count') assertColumn(header, column);
    }
}

function main([file, ...args]) {
    if (file === undefined || file.startsWith('--')) {
        throw new Error('使い方: ft_tally <file.csv> [オプション]');
    }
    const options = parseOptions(args);
    const { header, rows } = parseCsv(readFileSync(file, 'utf8'));
    validateInputColumns(header, options);
    const columns = outputColumns(header, options);
    if (options.sort !== undefined) assertColumn(columns, options.sort[0]);
    const result = buildQuery(inferTypes(rows), options).run();
    const output = options.format === 'json'
        ? JSON.stringify(result, null, 2)
        : formatTable(columns, result);
    process.stdout.write(`${output}\n`);
}

try {
    main(process.argv.slice(2));
} catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
}
