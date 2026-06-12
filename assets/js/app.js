import {
  normalizeCellValue,
  normalizeCountryName,
  parseTimeInToDate,
  formatDateDdMmYyyy,
  addDays,
} from "./utils.js";

import {
  parsePaste,
  parseMapping,
  mapGenderToCode,
} from "./parser.js";

import {
  renderPreview,
  renderTransformedPreview,
} from "./renderer.js";

import {
  buildTransformedXml,
} from "./xmlBuilder.js";

const columns = [
  { key: "time in", tag: "time_in" },
  { key: "gmail", tag: "gmail" },
  { key: "name", tag: "name" },
  { key: "gender", tag: "gender" },
  { key: "DOB", tag: "dob" },
  { key: "passport number", tag: "passport_number" },
  { key: "nationality", tag: "nationality" },
  { key: "check-out date", tag: "check_out_date" },
  { key: "phone number", tag: "phone_number" },
  { key: "number of date staying", tag: "number_of_date_staying" },
];

const transformedColumns = [
  { key: "name", tag: "name" },
  { key: "DOB", tag: "DOB" },
  { key: "birthdate correct up to", tag: "birthdate_correct_up_to" },
  { key: "gender", tag: "gender" },
  { key: "nationality code", tag: "nationality_code" },
  { key: "passport number", tag: "passport_number" },
  { key: "arrival date", tag: "arrival_date" },
  { key: "expected leaving date", tag: "expected_leaving_date" },
  { key: "checkout date", tag: "checkout_date" },
  { key: "room number", tag: "room_number" },
];

const maxRows = 100;
const previewBody = document.getElementById("previewBody");
const transformedBody = document.getElementById("transformedBody");
const pasteArea = document.getElementById("pasteArea");
const statusBox = document.getElementById("statusBox");
const mappingStatus = document.getElementById("mappingStatus");
const rowCount = document.getElementById("rowCount");
const loadButton = document.getElementById("loadButton");
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
        name: normalizeCellValue(row[2]).toUpperCase(),
        dob: normalizeCellValue(row[4]),
        birthdateCorrectUpTo: "D",
        gender: mapGenderToCode(row[3]),
        nationalityCode: mapNationalityToCode(row[6]),
        passportNumber: normalizeCellValue(row[5]),
        arrivalDate,
        expectedLeavingDate: expectedDate,
        checkoutDate: expectedDate,
        roomNumber: "",
      };
    }

    const fallback = normalizeCellValue(row[0]);
    return {
      row: String(index + 1),
      name: normalizeCellValue(row[2]).toUpperCase(),
      dob: normalizeCellValue(row[4]),
      birthdateCorrectUpTo: "D",
      gender: mapGenderToCode(row[3]),
      nationalityCode: mapNationalityToCode(row[6]),
      passportNumber: normalizeCellValue(row[5]),
      arrivalDate: fallback,
      expectedLeavingDate: fallback,
      checkoutDate: fallback,
      roomNumber: "",
    };
  });
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

  // Divide size by 2 since each line maps both name-only and prefix-name fallback
  const uniqueCount = Math.ceil(count / 2);
  mappingStatus.textContent = `Loaded ${uniqueCount} nationality mapping row${uniqueCount === 1 ? "" : "s"} from 'nationality' file.`;
}

function refreshTransformed() {
  transformedRows = toTransformedRows(currentRows);
  renderTransformedPreview(transformedRows, transformedBody);
}

function loadPreview() {
  const parsed = parsePaste(pasteArea.value, columns, maxRows);
  currentRows = parsed.rows;
  renderPreview(currentRows, previewBody, maxRows, columns);
  refreshTransformed();
  updateStatus(currentRows, parsed.warnings);
}

async function loadNationalityFile() {
  try {
    mappingStatus.textContent = "Loading nationality mapping from file...";
    const response = await fetch("./nationality");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    nationalityMap = parseMapping(text);
    updateMappingStatus();

    if (currentRows.length > 0) {
      refreshTransformed();
      updateStatus(currentRows);
    }
  } catch (error) {
    console.error("Error loading nationality file:", error);
    mappingStatus.textContent = `Error loading nationality file: ${error.message}. Codes in transformed view can still be edited manually.`;
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
    renderTransformedPreview(transformedRows, transformedBody);
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

  let value = normalizeCellValue(cell.textContent);
  if (cell.dataset.field === "gender") {
    value = mapGenderToCode(value);
    cell.textContent = value;
  }

  transformedRows[rowIndex][cell.dataset.field] = value;
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
  currentRows = [];
  transformedRows = [];
  renderPreview([], previewBody, maxRows, columns);
  renderTransformedPreview([], transformedBody);
  switchView("original");
  updateStatus([]);
}

loadButton.addEventListener("click", loadPreview);
exportButton.addEventListener("click", exportXml);
clearButton.addEventListener("click", clearAll);
showOriginalButton.addEventListener("click", () => switchView("original"));
showTransformedButton.addEventListener("click", () => switchView("transformed"));

pasteArea.addEventListener("paste", () => {
  window.setTimeout(loadPreview, 0);
});

pasteArea.addEventListener("input", () => {
  if (pasteArea.value.trim() === "") {
    currentRows = [];
    transformedRows = [];
    renderPreview([], previewBody, maxRows, columns);
    renderTransformedPreview([], transformedBody);
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

renderPreview([], previewBody, maxRows, columns);
renderTransformedPreview([], transformedBody);
switchView("original");
loadNationalityFile();
