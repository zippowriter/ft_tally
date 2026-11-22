export function createQuery(rows) {
    return {
        run: () => rows.slice(),
    };
}
