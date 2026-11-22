export function inferValue(text) {
    if (typeof text === 'string' && /^\d+$/.test(text)) return Number(text);
    return text;
}
