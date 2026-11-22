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

function makeDataRow(values) {
    const row = document.createElement('tr');
    values.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = String(value ?? '');
        row.append(cell);
    });
    return row;
}

function makeHeader(columns, sort) {
    const row = document.createElement('tr');
    columns.forEach((column) => {
        const cell = document.createElement('th');
        cell.scope = 'col';
        cell.dataset.column = column;
        if (sort?.column === column) {
            cell.setAttribute('aria-sort', sort.direction === 'asc' ? 'ascending' : 'descending');
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = column;
        cell.append(button);
        row.append(cell);
    });
    return row;
}

function renderTable(table, columns, rows, sort) {
    const body = document.createDocumentFragment();
    rows.forEach((row) => body.append(makeDataRow(columns.map((column) => row[column]))));
    table.tHead.replaceChildren(makeHeader(columns, sort));
    table.tBodies[0].replaceChildren(body);
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

function renderResult(ui, data, sort) {
    const { query, columns, needsColumn } = buildResult(data, ui);
    const activeSort = columns.includes(sort?.column) ? sort : undefined;
    const sorted = activeSort ? query.sortBy(activeSort.column, activeSort.direction) : query;
    const rows = sorted.run();
    renderTable(ui.table, columns, rows, activeSort);
    ui.status.textContent = needsColumn ? '集計列を選択してください' : `${rows.length} 行`;
    return activeSort;
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
        error: document.querySelector('#error'),
    };
}

function showError(ui, error) {
    ui.error.textContent = error.message;
    ui.error.hidden = false;
    ui.status.textContent = '';
    ui.table.hidden = true;
}

function clearError(ui) {
    ui.error.textContent = '';
    ui.error.hidden = true;
}

function resetFileUi(ui, file) {
    clearError(ui);
    ui.conditions.disabled = true;
    ui.operation.value = '';
    setColumnOptions(ui.group, []);
    setColumnOptions(ui.aggregate, []);
    ui.table.tHead.replaceChildren();
    ui.table.tBodies[0].replaceChildren();
    ui.table.hidden = true;
    ui.status.textContent = file ? '読み込み中…' : '';
}

function bindFileInput(ui, onData) {
    let latestRead = 0;
    ui.file.addEventListener('change', async () => {
        const read = ++latestRead;
        const file = ui.file.files[0];
        onData(undefined);
        resetFileUi(ui, file);
        if (!file) return;
        try {
            const text = await file.text();
            if (read !== latestRead) return;
            const { header, rows } = parseCsv(text);
            setColumnOptions(ui.group, header);
            setColumnOptions(ui.aggregate, header);
            ui.conditions.disabled = false;
            onData({ header, rows: inferTypes(rows) });
        } catch (error) {
            if (read !== latestRead) return;
            ui.conditions.disabled = true;
            showError(ui, error);
        }
    });
    ui.file.disabled = false;
}

function initialize() {
    const ui = getUi();
    let data;
    let sort;

    const redraw = () => {
        if (!data) return;
        clearError(ui);
        try {
            sort = renderResult(ui, data, sort);
        } catch (error) {
            showError(ui, error);
        }
    };

    bindFileInput(ui, (nextData) => {
        data = nextData;
        sort = undefined;
        redraw();
    });
    ui.conditions.addEventListener('change', redraw);
    ui.table.addEventListener('click', (event) => {
        const header = event.target.closest('th[data-column]');
        if (!header || !ui.table.tHead.contains(header)) return;
        const column = header.dataset.column;
        const direction = sort?.column === column && sort.direction === 'asc' ? 'desc' : 'asc';
        sort = { column, direction };
        redraw();
    });
}

initialize();
