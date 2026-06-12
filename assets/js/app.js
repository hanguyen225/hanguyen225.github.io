const columns = [
  { key: "time in", tag: "time_in" },
  { key: "gmail", tag: "gmail" },
  { key: "name", tag: "name" },
  { key: "DOB", tag: "dob" },
  { key: "passport number", tag: "passport_number" },
  { key: "nationality", tag: "nationality" },
  { key: "check-in date", tag: "check_in_date" },
  { key: "check-out date", tag: "check_out_date" },
  { key: "phone number", tag: "phone_number" },
  { key: "number of date staying", tag: "number_of_date_staying" },
];

const transformedColumns = [
  { key: "order number", tag: "order_number" },
  { key: "name", tag: "name" },
  { key: "birthdate correct up to", tag: "birthdate_correct_up_to" },
  { key: "nationality code", tag: "nationality_code" },
  { key: "passport number", tag: "passport_number" },
  { key: "arrival date", tag: "arrival_date" },
  { key: "expected leaving date", tag: "expected_leaving_date" },
  { key: "checkout date", tag: "checkout_date" },
];

const maxRows = 100;
const previewBody = document.getElementById("previewBody");
const transformedBody = document.getElementById("transformedBody");
const pasteArea = document.getElementById("pasteArea");
const mappingArea = document.getElementById("mappingArea");
const statusBox = document.getElementById("statusBox");
const mappingStatus = document.getElementById("mappingStatus");
const rowCount = document.getElementById("rowCount");
const loadButton = document.getElementById("loadButton");
const loadMappingButton = document.getElementById("loadMappingButton");
const exportButton = document.getElementById("exportButton");
const clearButton = document.getElementById("clearButton");
const showOriginalButton = document.getElementById("showOriginalButton");
const showTransformedButton = document.getElementById("showTransformedButton");
const originalView = document.getElementById("originalView");
const transformedView = document.getElementById("transformedView");

let currentRows = [];
let transformedRows = [];
let nationalityMap = new Map();
let currentView = "original";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeCellValue(value) {
  return value == null ? "" : String(value).trim();
}

function looksLikeHeader(row) {
  const normalized = row.map((cell) => normalizeCellValue(cell).toLowerCase());
  return columns.every((column, index) => normalized[index] === column.key.toLowerCase());
}

function parsePaste(text) {
  const source = String(text || "").replace(/\r/g, "");
  const lines = source.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { rows: [], warnings: ["Paste rows into the input area first."] };
  }

  const rawRows = lines.map((line) => line.split("\t"));
  const warnings = [];

  let rows = rawRows;
  if (rows.length > 0 && looksLikeHeader(rows[0])) {
    rows = rows.slice(1);
    warnings.push("Detected and removed a header row that matched the expected column names.");
  }

  if (rows.length > maxRows) {
    warnings.push(`Input had ${rows.length} rows; only the first ${maxRows} rows were kept.`);
    rows = rows.slice(0, maxRows);
  }

  const normalizedRows = rows.map((row, index) => {
    if (row.length > columns.length) {
      warnings.push(`Row ${index + 1} has extra cells; only the first ${columns.length} columns were used.`);
    }

    return columns.map((_, colIndex) => normalizeCellValue(row[colIndex] ?? ""));
  });

  return { rows: normalizedRows, warnings };
}

function normalizeCountryName(value) {
  return String(value || "")
    .trim()
    .replace(/^\"|\"$/g, "")
    .toLowerCase();
}

function parseMapping(text) {
  const map = new Map();
  const source = String(text || "").replace(/\r/g, "\n");
  const lineParts = source.split("\n");

  lineParts.forEach((line) => {
    const chunks = line
      .split(/(?=\b[A-Z]{3}\s*-\s*[^\t\n]+\t)/g)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    chunks.forEach((chunk) => {
      const match = chunk.match(/^"?([A-Z]{3})\s*-\s*([^\t"]+)"?\t([A-Z]{3})$/i);
      if (!match) {
        return;
      }

      const countryName = normalizeCountryName(match[2]);
      const code = String(match[3] || "").trim().toUpperCase();
      if (countryName && code) {
        map.set(countryName, code);
      }
    });
  });

  return map;
}

function parseTimeInToDate(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2})?$/);
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  const candidate = new Date(year, month - 1, day);
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() + 1 !== month ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return candidate;
}

function formatDateDdMmYyyy(dateObject) {
  const day = String(dateObject.getDate()).padStart(2, "0");
  const month = String(dateObject.getMonth() + 1).padStart(2, "0");
  const year = dateObject.getFullYear();
  return `${day}/${month}/${year}`;
}

function addDays(dateObject, days) {
  const result = new Date(dateObject);
  result.setDate(result.getDate() + days);
  return result;
}

function mapNationalityToCode(nationality) {
  const normalized = normalizeCountryName(nationality);
  if (!normalized) {
    return "";
  }

  return nationalityMap.get(normalized) || "";
}

function toTransformedRows(rows) {
  const nonEmptyRows = rows.filter((row) => row.some((cell) => normalizeCellValue(cell) !== ""));

  return nonEmptyRows.map((row, index) => {
    const parsedArrival = parseTimeInToDate(row[0]);
    const stayingDays = Number.parseInt(normalizeCellValue(row[9]), 10);

    if (parsedArrival) {
      const arrivalDate = formatDateDdMmYyyy(parsedArrival);
      const safeDays = Number.isNaN(stayingDays) ? 0 : stayingDays;
      const expectedDate = formatDateDdMmYyyy(addDays(parsedArrival, safeDays));
      return {
        row: String(index + 1),
        orderNumber: String(index + 1),
        name: normalizeCellValue(row[2]).toUpperCase(),
        birthdateCorrectUpTo: "D",
        nationalityCode: mapNationalityToCode(row[5]),
        passportNumber: normalizeCellValue(row[4]),
        arrivalDate,
        expectedLeavingDate: expectedDate,
        checkoutDate: expectedDate,
      };
    }

    const fallback = normalizeCellValue(row[0]);
    return {
      row: String(index + 1),
      orderNumber: String(index + 1),
      name: normalizeCellValue(row[2]).toUpperCase(),
      birthdateCorrectUpTo: "D",
      nationalityCode: mapNationalityToCode(row[5]),
      passportNumber: normalizeCellValue(row[4]),
      arrivalDate: fallback,
      expectedLeavingDate: fallback,
      checkoutDate: fallback,
    };
  });
}

function renderPreview(rows) {
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

function renderTransformedPreview(rows) {
  if (rows.length === 0) {
    transformedBody.innerHTML = `
      <tr class="empty">
        <td colspan="9">No transformed rows yet. Paste source rows and load preview first.</td>
      </tr>
    `;
    return;
  }

  const html = rows
    .map(
      (row, index) => `
        <tr data-row-index="${index}">
          <td>${escapeHtml(row.row)}</td>
          <td class="editable-cell" contenteditable="true" data-field="orderNumber">${escapeHtml(row.orderNumber)}</td>
          <td class="editable-cell" contenteditable="true" data-field="name">${escapeHtml(row.name)}</td>
          <td class="editable-cell" contenteditable="true" data-field="birthdateCorrectUpTo">${escapeHtml(row.birthdateCorrectUpTo)}</td>
          <td class="editable-cell" contenteditable="true" data-field="nationalityCode">${escapeHtml(row.nationalityCode)}</td>
          <td class="editable-cell" contenteditable="true" data-field="passportNumber">${escapeHtml(row.passportNumber)}</td>
          <td class="editable-cell" contenteditable="true" data-field="arrivalDate">${escapeHtml(row.arrivalDate)}</td>
          <td class="editable-cell" contenteditable="true" data-field="expectedLeavingDate">${escapeHtml(row.expectedLeavingDate)}</td>
          <td class="editable-cell" contenteditable="true" data-field="checkoutDate">${escapeHtml(row.checkoutDate)}</td>
        </tr>
      `,
    )
    .join("");

  transformedBody.innerHTML = html;
}

function updateStatus(rows, warnings = []) {
  const parts = [];

  if (rows.length === 0) {
    parts.push("Waiting for pasted rows.");
  } else {
    parts.push(`Loaded ${rows.length} row${rows.length === 1 ? "" : "s"} into the 100-row workspace.`);
    parts.push(`Transformed table has ${transformedRows.length} row${transformedRows.length === 1 ? "" : "s"}.`);
    parts.push("Export XML uses transformed table values (including manual edits).");
  }

  if (warnings.length > 0) {
    parts.push(warnings.join(" "));
  }

  statusBox.textContent = parts.join("\n");
  if (currentView === "original") {
    rowCount.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"} loaded`;
  } else {
    rowCount.textContent = `${transformedRows.length} transformed row${transformedRows.length === 1 ? "" : "s"}`;
  }
}

function updateMappingStatus() {
  const count = nationalityMap.size;
  if (count === 0) {
    mappingStatus.textContent = "Nationality mapping is empty. Codes in transformed view can still be edited manually.";
    return;
  }

  mappingStatus.textContent = `Loaded ${count} nationality mapping row${count === 1 ? "" : "s"}.`;
}

function refreshTransformed() {
  transformedRows = toTransformedRows(currentRows);
  renderTransformedPreview(transformedRows);
}

function loadPreview() {
  const parsed = parsePaste(pasteArea.value);
  currentRows = parsed.rows;
  renderPreview(currentRows);
  refreshTransformed();
  updateStatus(currentRows, parsed.warnings);
}

function loadMapping() {
  nationalityMap = parseMapping(mappingArea.value);
  updateMappingStatus();

  if (currentRows.length > 0) {
    refreshTransformed();
    updateStatus(currentRows);
  }
}

function switchView(targetView) {
  currentView = targetView;

  const showOriginal = targetView === "original";
  originalView.classList.toggle("active", showOriginal);
  transformedView.classList.toggle("active", !showOriginal);
  transformedView.setAttribute("aria-hidden", showOriginal ? "true" : "false");

  showOriginalButton.classList.toggle("active", showOriginal);
  showTransformedButton.classList.toggle("active", !showOriginal);
  showOriginalButton.setAttribute("aria-selected", showOriginal ? "true" : "false");
  showTransformedButton.setAttribute("aria-selected", showOriginal ? "false" : "true");

  if (!showOriginal) {
    renderTransformedPreview(transformedRows);
    rowCount.textContent = `${transformedRows.length} transformed row${transformedRows.length === 1 ? "" : "s"}`;
  } else {
    rowCount.textContent = `${currentRows.length} row${currentRows.length === 1 ? "" : "s"} loaded`;
  }
}

function handleTransformedEdit(event) {
  const cell = event.target;
  if (!cell || !cell.dataset || !cell.dataset.field) {
    return;
  }

  const rowElement = cell.closest("tr");
  if (!rowElement) {
    return;
  }

  const rowIndex = Number.parseInt(rowElement.dataset.rowIndex, 10);
  if (Number.isNaN(rowIndex) || !transformedRows[rowIndex]) {
    return;
  }

  transformedRows[rowIndex][cell.dataset.field] = normalizeCellValue(cell.textContent);
}

function buildTransformedXml(rows) {
  const now = new Date().toISOString();
  const rowsXml = rows
    .map((row, rowIndex) => {
      const cells = transformedColumns
        .map((column) => {
          const field = {
            order_number: "orderNumber",
            name: "name",
            birthdate_correct_up_to: "birthdateCorrectUpTo",
            nationality_code: "nationalityCode",
            passport_number: "passportNumber",
            arrival_date: "arrivalDate",
            expected_leaving_date: "expectedLeavingDate",
            checkout_date: "checkoutDate",
          }[column.tag];

          return `        <${column.tag}>${escapeXml(row[field] ?? "")}</${column.tag}>`;
        })
        .join("\n");

      return `      <row index="${rowIndex + 1}">\n${cells}\n      </row>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook exportedAt="${escapeXml(now)}" mode="transformed">
  <worksheet name="Sheet1">
    <rows>
${rowsXml || "      <!-- no rows -->"}
    </rows>
  </worksheet>
</workbook>
`;
}

function exportXml() {
  if (currentRows.length === 0) {
    loadPreview();
  }

  if (transformedRows.length === 0) {
    updateStatus(currentRows, ["Nothing to export yet. Paste spreadsheet rows first."]);
    return;
  }

  const xml = buildTransformedXml(transformedRows);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const link = document.createElement("a");

  link.href = url;
  link.download = `sheet-export-${stamp}.xml`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  updateStatus(currentRows, ["XML file generated from transformed table and downloaded."]);
}

function clearAll() {
  pasteArea.value = "";
  mappingArea.value = "";
  currentRows = [];
  transformedRows = [];
  nationalityMap = new Map();
  renderPreview([]);
  renderTransformedPreview([]);
  updateMappingStatus();
  switchView("original");
  updateStatus([]);
}

loadButton.addEventListener("click", loadPreview);
loadMappingButton.addEventListener("click", loadMapping);
exportButton.addEventListener("click", exportXml);
clearButton.addEventListener("click", clearAll);
showOriginalButton.addEventListener("click", () => switchView("original"));
showTransformedButton.addEventListener("click", () => switchView("transformed"));

pasteArea.addEventListener("paste", () => {
  window.setTimeout(loadPreview, 0);
});

mappingArea.addEventListener("paste", () => {
  window.setTimeout(loadMapping, 0);
});

pasteArea.addEventListener("input", () => {
  if (pasteArea.value.trim() === "") {
    currentRows = [];
    transformedRows = [];
    renderPreview([]);
    renderTransformedPreview([]);
    updateStatus([]);
  }
});

transformedBody.addEventListener("blur", handleTransformedEdit, true);
transformedBody.addEventListener("keydown", (event) => {
  const target = event.target;
  if (
    event.key === "Enter" &&
    target &&
    target.classList &&
    target.classList.contains("editable-cell")
  ) {
    event.preventDefault();
    target.blur();
  }
});

renderPreview([]);
renderTransformedPreview([]);
updateMappingStatus();
switchView("original");
