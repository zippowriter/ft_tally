export function parseCsv(text) {
    const [headerLine, ...dataLines] = text.split('\n');
    const header = headerLine.split(',');
    const rows = dataLines.map((line) => {
        const cells = line.split(',');
        return Object.fromEntries(header.map((column, index) => [column, cells[index]]));
    });

    return { header, rows };
}
