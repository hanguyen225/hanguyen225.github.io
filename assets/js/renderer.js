import { escapeHtml } from "./utils.js";

export function renderPreview(rows, previewBody, maxRows, columns) {
  const fillRows = [];

  for (let index = 0; index < maxRows; index += 1) {
    const row = rows[index] || Array(columns.length).fill("");
    const isEmpty = !rows[index];
    const cells = row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("");

    fillRows.push(`
      <tr class="${isEmpty ? "empty" : ""}">
        <td>${index + 1}</td>
        ${cells}
      </tr>
    `);
  }

  previewBody.innerHTML = fillRows.join("");
}

export function renderTransformedPreview(rows, transformedBody) {
  if (rows.length === 0) {
    transformedBody.innerHTML = `
      <tr class="empty">
        <td colspan="11">No transformed rows yet. Paste source rows and load preview first.</td>
      </tr>
    `;
    return;
  }

  const html = rows
    .map(
      (row, index) => `
        <tr data-row-index="${index}">
          <td>${escapeHtml(row.row)}</td>
          <td class="editable-cell" contenteditable="true" data-field="name">${escapeHtml(row.name)}</td>
          <td class="editable-cell" contenteditable="true" data-field="dob">${escapeHtml(row.dob)}</td>
          <td class="editable-cell" contenteditable="true" data-field="birthdateCorrectUpTo">${escapeHtml(row.birthdateCorrectUpTo)}</td>
          <td class="editable-cell" contenteditable="true" data-field="gender">${escapeHtml(row.gender)}</td>
          <td class="editable-cell" contenteditable="true" data-field="nationalityCode">${escapeHtml(row.nationalityCode)}</td>
          <td class="editable-cell" contenteditable="true" data-field="passportNumber">${escapeHtml(row.passportNumber)}</td>
          <td class="editable-cell" contenteditable="true" data-field="arrivalDate">${escapeHtml(row.arrivalDate)}</td>
          <td class="editable-cell" contenteditable="true" data-field="expectedLeavingDate">${escapeHtml(row.expectedLeavingDate)}</td>
          <td class="editable-cell" contenteditable="true" data-field="checkoutDate">${escapeHtml(row.checkoutDate)}</td>
          <td class="editable-cell" contenteditable="true" data-field="roomNumber">${escapeHtml(row.roomNumber)}</td>
        </tr>
      `,
    )
    .join("");

  transformedBody.innerHTML = html;
}
