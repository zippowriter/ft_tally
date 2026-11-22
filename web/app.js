import { parseCsv } from '../src/core/csv.js';

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

function initialize() {
    const fileInput = document.querySelector('#csv-file');
    const conditions = document.querySelector('#conditions');
    const group = document.querySelector('#group-column');
    const aggregate = document.querySelector('#aggregate-column');

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        const { header } = parseCsv(await file.text());
        setColumnOptions(group, header);
        setColumnOptions(aggregate, header);
        conditions.disabled = false;
    });
    fileInput.disabled = false;
}

initialize();
