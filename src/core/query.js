import { isNumericColumn } from './types.js';

function sum(values) {
    return values.reduce((total, value) => total + value, 0);
}

function calculate(rows, operation, column) {
    if (operation === 'count') return rows.length;
    const values = rows.map((row) => row[column]).filter((value) => value !== null);
    if (operation === 'sum') return sum(values);
    if (values.length === 0) return null;
    if (operation === 'avg') return sum(values) / values.length;
    if (operation === 'min') return values.reduce((lowest, value) => Math.min(lowest, value));
    return values.reduce((highest, value) => Math.max(highest, value));
}

function summarize(rows, aggregates) {
    return Object.fromEntries(Object.entries(aggregates).map(([alias, [operation, column]]) => [
        alias, calculate(rows, operation, column),
    ]));
}

function validateNumericColumns(rows, aggregates) {
    const columns = Object.values(aggregates)
        .filter(([operation]) => operation !== 'count')
        .map(([, column]) => column);
    Array.from(new Set(columns)).forEach((column) => {
        if (!isNumericColumn(rows.map((row) => row[column]))) {
            throw new Error(`数値列ではありません: ${column}`);
        }
    });
}

function runQuery(rows, { predicates, groupColumn, aggregates }) {
    if (aggregates !== undefined) validateNumericColumns(rows, aggregates);
    const filtered = rows.filter((row) => predicates.every((predicate) => predicate(row)));
    if (groupColumn === undefined) return filtered;

    const groups = Map.groupBy(filtered, (row) => row[groupColumn]);
    return Array.from(groups, ([key, members]) => ({
        [groupColumn]: key,
        ...summarize(members, aggregates),
    }));
}

function buildQuery(rows, options) {
    return {
        where: (predicate) => buildQuery(rows, {
            ...options,
            predicates: [...options.predicates, predicate],
        }),
        groupBy: (groupColumn) => buildQuery(rows, { ...options, groupColumn }),
        aggregate: (aggregates) => buildQuery(rows, { ...options, aggregates }),
        run: () => runQuery(rows, options),
    };
}

export function createQuery(rows) {
    return buildQuery(rows, { predicates: [] });
}
