function parseRecords(text) {
    const records = [];
    let columns = [];
    let column = '';
    let inQuotes = false;

    const characters = text.match(/\r\n|./gsu) ?? [];
    characters.forEach((character) => {
        if (character === '"' && (inQuotes || column === '')) {
            inQuotes = !inQuotes;
        } else if (character === ',' && !inQuotes) {
            columns.push(column);
            column = '';
        } else if (!inQuotes && (character === '\n' || character === '\r\n')) {
            columns.push(column);
            records.push(columns);
            columns = [];
            column = '';
        } else {
            column += character;
        }
    });

    columns.push(column);
    records.push(columns);
    return records;
}

export function parseCsv(text) {
    const [header, ...dataRecords] = parseRecords(text);
    const rows = dataRecords.map((cells) =>
        Object.fromEntries(header.map((column, index) => [column, cells[index]])),
    );

    return { header, rows };
}
