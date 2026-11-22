export function inferValue(text) {
    if (typeof text === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
        return Number(text);
    }
    return text;
}
