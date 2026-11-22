function summarize(rows, aggregates) {
    return Object.fromEntries(Object.keys(aggregates).map((alias) => [alias, rows.length]));
}

function runQuery(rows, { predicates, groupColumn, aggregates }) {
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
