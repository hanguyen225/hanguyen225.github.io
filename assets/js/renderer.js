import { escapeHtml } from "./utils.js";

export function renderPreview(rows, previewBody, maxRows, columns) {
  const fillRows = [];

  for (let index = 0; index < maxRows; index += 1) {
    const row = rows[index] || Array(columns.length).fill("");
    const isEmpty = !rows[index];
    const cells = row.map((cell, colIdx) => `	<td class="editable-cell" contenteditable="true" data-col-index="${colIdx}">${escapeHtml(cell)}</td>`).join("");

    fillRows.push(`
      <tr data-row-index="${index}" class="${isEmpty ? "empty" : ""}">
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

export function renderDbPreview(guests, dbBody) {
  if (guests.length === 0) {
    dbBody.innerHTML = `
      <tr class="empty">
        <td colspan="13" style="text-align: center;">No guests logged in the database yet.</td>
      </tr>
    `;
    return;
  }

  const html = guests
    .map(
      (guest, index) => `
        <tr data-guest-id="${guest.id}">
          <td style="text-align: center;"><input type="checkbox" class="db-select" data-id="${guest.id}" style="cursor: pointer;" /></td>
          <td>${index + 1}</td>
          <td>${escapeHtml(guest.name)}</td>
          <td>${escapeHtml(guest.dob)}</td>
          <td>${escapeHtml(guest.birthdateCorrectUpTo)}</td>
          <td>${escapeHtml(guest.gender)}</td>
          <td>${escapeHtml(guest.nationalityCode)}</td>
          <td>${escapeHtml(guest.passportNumber)}</td>
          <td>${escapeHtml(guest.arrivalDate)}</td>
          <td>${escapeHtml(guest.expectedLeavingDate)}</td>
          <td>${escapeHtml(guest.checkoutDate)}</td>
          <td>${escapeHtml(guest.roomNumber)}</td>
          <td>
            <button class="delete-btn secondary" data-id="${guest.id}" style="padding: 4px 8px; font-size: 11px; margin: 0; background: #ffebeb; color: #cc0000; border-color: #ffcccc; border-radius: 6px; font-weight: 700; width: 100%;">Delete</button>
          </td>
        </tr>
      `,
    )
    .join("");

  dbBody.innerHTML = html;
}

