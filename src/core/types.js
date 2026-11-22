export function inferValue(text) {
    if (text === '') return null;

    const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
    if (typeof text === 'string' && decimal.test(text)) {
        return Number(text);
    }
    return text;
}
