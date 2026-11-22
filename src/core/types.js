export function inferValue(text) {
    if (typeof text !== 'string') return text;
    if (text.trim() === '') return null;
    if (text === 'true' || text === 'false') return text === 'true';

    const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
    if (decimal.test(text)) {
        return Number(text);
    }
    return text;
}

export function inferTypes(rows) {
    return rows.map((row) => Object.fromEntries(
        Object.entries(row).map(([column, text]) => [column, inferValue(text)]),
    ));
}

export function isNumericColumn(values) {
    return values.every(Number.isFinite);
}
