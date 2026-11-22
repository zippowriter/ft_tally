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
        case '--group-by': options.group = value; break;
        default: throw new Error(`不正なオプション: ${flag}`);
    }
}

function parseOptions(args) {
    const options = { format: 'table', filters: [], aggregates: new Map() };
    for (let index = 0; index < args.length; index += 1) {
        const flag = args[index];
        if (flag === '--count') {
            options.aggregates.set('count', ['count']);
        } else {
            readOption(options, flag, args[index + 1]);
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
    return query;
}

function outputColumns(header, { group, aggregates }) {
    if (group !== undefined) return [group, ...aggregates.keys()];
    return aggregates.size === 0 ? header : Array.from(aggregates.keys());
}

function main([file, ...args]) {
    const options = parseOptions(args);
    const { header, rows } = parseCsv(readFileSync(file, 'utf8'));
    const result = buildQuery(inferTypes(rows), options).run();
    const output = options.format === 'json'
        ? JSON.stringify(result, null, 2)
        : formatTable(outputColumns(header, options), result);
    process.stdout.write(`${output}\n`);
}

try {
    main(process.argv.slice(2));
} catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
}
