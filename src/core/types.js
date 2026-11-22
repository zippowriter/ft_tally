export function inferValue(text) {
    if (typeof text !== 'string') return text;
    if (text.trim() === '') return null;

    const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
    if (decimal.test(text)) {
        return Number(text);
    }
    return text;
}
