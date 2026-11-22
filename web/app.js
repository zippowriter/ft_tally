import { parseCsv } from '../src/core/csv.js';
import { createQuery } from '../src/core/query.js';
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

function selectedColumn(select, header) {
    return select.value === '' ? undefined : header[Number(select.value)];
}

function buildResult(data, ui) {
    const group = selectedColumn(ui.group, data.header);
    const column = selectedColumn(ui.aggregate, data.header);
    const operation = ui.operation.value;
    let query = createQuery(data.rows);
    if (group !== undefined) query = query.groupBy(group);

    const needsColumn = operation !== '' && operation !== 'count' && column === undefined;
    if (operation === '' || needsColumn) {
        return { query, columns: group === undefined ? data.header : [group], needsColumn };
    }

    const alias = operation === 'count' ? 'count' : `${operation}_${column}`;
    const columns = group === undefined ? [alias] : [group, alias];
    return { query: query.aggregate({ [alias]: [operation, column] }), columns, needsColumn };
}

function renderResult(ui, data) {
    const { query, columns, needsColumn } = buildResult(data, ui);
    const rows = query.run();
    renderTable(ui.table, columns, rows);
    ui.status.textContent = needsColumn ? '集計列を選択してください' : `${rows.length} 行`;
}

function getUi() {
    return {
        file: document.querySelector('#csv-file'),
        conditions: document.querySelector('#conditions'),
        group: document.querySelector('#group-column'),
        aggregate: document.querySelector('#aggregate-column'),
        operation: document.querySelector('#operation'),
        table: document.querySelector('#result'),
        status: document.querySelector('#status'),
    };
}

function initialize() {
    const ui = getUi();
    let data;

    ui.file.addEventListener('change', async () => {
        const file = ui.file.files[0];
        if (!file) return;
        const { header, rows } = parseCsv(await file.text());
        data = { header, rows: inferTypes(rows) };
        setColumnOptions(ui.group, header);
        setColumnOptions(ui.aggregate, header);
        renderResult(ui, data);
        ui.conditions.disabled = false;
    });
    ui.conditions.addEventListener('change', () => {
        if (data) renderResult(ui, data);
    });
    ui.file.disabled = false;
}

initialize();
