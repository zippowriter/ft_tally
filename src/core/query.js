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
    return Object.fromEntries(aggregates.map(([alias, [operation, column]]) => [
        alias, calculate(rows, operation, column),
    ]));
}

function validateNumericColumns(rows, aggregates) {
    const columns = aggregates
        .filter(([, [operation]]) => operation !== 'count')
        .map(([, [, column]]) => column);
    Array.from(new Set(columns)).forEach((column) => {
        if (!isNumericColumn(rows.map((row) => row[column]))) {
            throw new Error(`数値列ではありません: ${column}`);
        }
    });
}

function selectRows(rows, { predicates, groupColumn, aggregates }) {
    if (aggregates !== undefined) validateNumericColumns(rows, aggregates);
    const filtered = rows.filter((row) => predicates.every((predicate) => predicate({ ...row })));
    if (groupColumn === undefined) {
        return aggregates === undefined ? filtered.map((row) => ({ ...row })) : [summarize(filtered, aggregates)];
    }

    const groups = Map.groupBy(filtered, (row) => row[groupColumn]);
    return Array.from(groups, ([key, members]) => ({
        [groupColumn]: key,
        ...summarize(members, aggregates ?? []),
    }));
}

function sortRows(rows, [column, direction]) {
    const sign = direction === 'desc' ? -1 : 1;
    return rows.toSorted((left, right) => {
        if (left[column] < right[column]) return -sign;
        if (left[column] > right[column]) return sign;
        return 0;
    });
}

function runQuery(rows, options) {
    const selected = selectRows(rows, options);
    const sorted = options.sort === undefined ? selected : sortRows(selected, options.sort);
    return options.maximum === undefined ? sorted : sorted.slice(0, options.maximum);
}

function buildQuery(rows, options) {
    return {
        where: (predicate) => buildQuery(rows, {
            ...options,
            predicates: [...options.predicates, predicate],
        }),
        groupBy: (groupColumn) => buildQuery(rows, { ...options, groupColumn }),
        aggregate: (specification) => buildQuery(rows, {
            ...options,
            aggregates: Object.entries(specification).map(([alias, fields]) => [alias, [...fields]]),
        }),
        sortBy: (column, direction) => buildQuery(rows, { ...options, sort: [column, direction] }),
        limit: (maximum) => buildQuery(rows, { ...options, maximum }),
        run: () => runQuery(rows, options),
    };
}

export function createQuery(rows) {
    return buildQuery(rows.map((row) => ({ ...row })), { predicates: [] });
}
