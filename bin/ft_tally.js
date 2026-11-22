#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { parseCsv } from '../src/core/csv.js';
import { createQuery } from '../src/core/query.js';
import { inferTypes, inferValue } from '../src/core/types.js';

function formatCell(value, width, isLast) {
    const text = value === null ? '' : String(value);
    if (typeof value === 'number') return text.padStart(width);
    return isLast ? text : text.padEnd(width);
}

function formatTable(columns, rows) {
    const records = [columns, ...rows.map((row) => columns.map((column) => row[column]))];
    const widths = columns.map((_, index) => records.reduce((width, record) => {
        return Math.max(width, String(record[index] ?? '').length);
    }, 0));
    return records.map((record) => record.map((value, index) => {
        return formatCell(value, widths[index], index === columns.length - 1);
    }).join('  ')).join('\n');
}

function parseWhere(text) {
    const separator = text.indexOf('=');
    return [text.slice(0, separator), inferValue(text.slice(separator + 1))];
}

function readOption(options, flag, value) {
    switch (flag) {
        case '--format': options.format = value; break;
        case '--where': options.filters.push(parseWhere(value)); break;
        default: throw new Error(`不正なオプション: ${flag}`);
    }
}

function parseOptions(args) {
    const options = { format: 'table', filters: [] };
    for (let index = 0; index < args.length; index += 2) {
        readOption(options, args[index], args[index + 1]);
    }
    return options;
}

function buildQuery(rows, options) {
    return options.filters.reduce((query, [column, value]) => {
        return query.where((row) => row[column] === value);
    }, createQuery(rows));
}

function main([file, ...args]) {
    const options = parseOptions(args);
    const { header, rows } = parseCsv(readFileSync(file, 'utf8'));
    const result = buildQuery(inferTypes(rows), options).run();
    const output = options.format === 'json' ? JSON.stringify(result, null, 2) : formatTable(header, result);
    process.stdout.write(`${output}\n`);
}

try {
    main(process.argv.slice(2));
} catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
}
