function buildQuery(rows, predicates) {
    return {
        where: (predicate) => buildQuery(rows, [...predicates, predicate]),
        run: () => rows.filter((row) => predicates.every((predicate) => predicate(row))),
    };
}

export function createQuery(rows) {
    return buildQuery(rows, []);
}
