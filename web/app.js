import { parseCsv } from '../src/core/csv.js';
import { inferTypes } from '../src/core/types.js';

function setColumnOptions(select, header) {
    const options = header.map((column, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = column;
        return option;
    });
    select.replaceChildren(select.options[0], ...options);
    select.value = '';
}

function makeRow(values, tag) {
    const row = document.createElement('tr');
    values.forEach((value) => {
        const cell = document.createElement(tag);
        if (tag === 'th') cell.scope = 'col';
        cell.textContent = String(value ?? '');
        row.append(cell);
    });
    return row;
}

function renderTable(table, columns, rows) {
    const body = rows.map((row) => makeRow(columns.map((column) => row[column]), 'td'));
    table.tHead.replaceChildren(makeRow(columns, 'th'));
    table.tBodies[0].replaceChildren(...body);
    table.hidden = false;
}

function initialize() {
    const fileInput = document.querySelector('#csv-file');
    const conditions = document.querySelector('#conditions');
    const group = document.querySelector('#group-column');
    const aggregate = document.querySelector('#aggregate-column');
    const table = document.querySelector('#result');

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        const { header, rows } = parseCsv(await file.text());
        setColumnOptions(group, header);
        setColumnOptions(aggregate, header);
        renderTable(table, header, inferTypes(rows));
        conditions.disabled = false;
    });
    fileInput.disabled = false;
}

initialize();
