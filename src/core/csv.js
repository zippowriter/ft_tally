function readCharacter(state, character, index, characters) {
    const isLineBreak = character === '\n' || character === '\r\n';
    if (isLineBreak) state.line += 1;

    if (state.inQuotes && character === '"' && characters[index + 1] === '"') {
        state.column += '"';
        characters[index + 1] = ''; // The second quote is consumed by this pair.
    } else if (character === '"' && (state.inQuotes || state.column === '')) {
        state.inQuotes = !state.inQuotes;
    } else if (character === ',' && !state.inQuotes) {
        state.columns.push(state.column);
        state.column = '';
    } else if (isLineBreak && !state.inQuotes) {
        state.columns.push(state.column);
        state.records.push(state.columns);
        state.columns = [];
        state.column = '';
        state.recordLine = state.line;
    } else {
        state.column += character;
    }
}

function parseRecords(text) {
    const records = [];
    const state = { records, columns: [], column: '', inQuotes: false, line: 1, recordLine: 1 };
    const characters = text.match(/\r\n|./gsu) ?? [];
    characters.forEach((character, index) => readCharacter(state, character, index, characters));

    if (state.inQuotes) throw new Error(`Unclosed quote at line ${state.recordLine}`);
    if (text.endsWith('\n')) return records;

    state.columns.push(state.column);
    records.push(state.columns);
    return records;
}

export function parseCsv(text) {
    const [header, ...dataRecords] = parseRecords(text);
    const rows = dataRecords.map((cells) =>
        Object.fromEntries(header.map((column, index) => [column, cells[index]])),
    );

    return { header, rows };
}
