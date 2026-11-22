#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { parseCsv } from '../src/core/csv.js';
import { inferTypes } from '../src/core/types.js';

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

function main([file]) {
    const { header, rows } = parseCsv(readFileSync(file, 'utf8'));
    const output = formatTable(header, inferTypes(rows));
    process.stdout.write(`${output}\n`);
}

try {
    main(process.argv.slice(2));
} catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
}
