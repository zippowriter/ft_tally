function parseLine(line) {
    const columns = [];
    let column = '';
    let inQuotes = false;

    [...line].forEach((character) => {
        if (character === '"' && (inQuotes || column === '')) {
            inQuotes = !inQuotes;
        } else if (character === ',' && !inQuotes) {
            columns.push(column);
            column = '';
        } else {
            column += character;
        }
    });

    columns.push(column);
    return columns;
}

export function parseCsv(text) {
    const [headerLine, ...dataLines] = text.split(/\r?\n/);
    const header = parseLine(headerLine);
    const rows = dataLines.map((line) => {
        const cells = parseLine(line);
        return Object.fromEntries(header.map((column, index) => [column, cells[index]]));
    });

    return { header, rows };
}
