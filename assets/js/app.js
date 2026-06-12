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
  renderDbPreview,
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
  renderDbPreview,
} from "./renderer.js";

import {
  buildTransformedXml,
} from "./xmlBuilder.js";

import {
  addGuests,
  getAllGuests,
  deleteGuest,
  clearAllGuests,
} from "./db.js";
import { loginAsAdmin, loginAsGuest, logout, getRole, updateUI, isAdmin } from "./auth.js";

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
const demoButton = document.getElementById("demoButton");
const showOriginalButton = document.getElementById("showOriginalButton");
const showTransformedButton = document.getElementById("showTransformedButton");
const originalView = document.getElementById("originalView");
const transformedView = document.getElementById("transformedView");

// Database elements
const saveToDbButton = document.getElementById("saveToDbButton");
const showDbButton = document.getElementById("showDbButton");
const dbView = document.getElementById("dbView");
const dbBody = document.getElementById("dbBody");
const exportDbButton = document.getElementById("exportDbButton");
const clearDbButton = document.getElementById("clearDbButton");
const selectAllDb = document.getElementById("selectAllDb");

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
  } else if (currentView === "transformed") {
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
  mappingStatus.textContent = `Loaded ${uniqueCount} nationality mapping row${uniqueCount === 1 ? "" : "s"} from 'nationality.txt' file.`;
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
    const response = await fetch("./nationality.txt");
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

async function refreshDbList() {
  try {
    const guests = await getAllGuests();
    renderDbPreview(guests, dbBody);
    rowCount.textContent = `${guests.length} guest${guests.length === 1 ? "" : "s"} logged in database`;
  } catch (error) {
    console.error("Error refreshing database list:", error);
    statusBox.textContent = `Error loading database: ${error.message}`;
  }
}

async function switchView(targetView) {
  currentView = targetView;

  const showOriginal = targetView === "original";
  const showTransformed = targetView === "transformed";
  const showDb = targetView === "db";

  originalView.classList.toggle("active", showOriginal);
  transformedView.classList.toggle("active", showTransformed);
  dbView.classList.toggle("active", showDb);

  originalView.setAttribute("aria-hidden", showOriginal ? "false" : "true");
  transformedView.setAttribute("aria-hidden", showTransformed ? "false" : "true");
  dbView.setAttribute("aria-hidden", showDb ? "false" : "true");

  showOriginalButton.classList.toggle("active", showOriginal);
  showTransformedButton.classList.toggle("active", showTransformed);
  showDbButton.classList.toggle("active", showDb);

  showOriginalButton.setAttribute("aria-selected", showOriginal ? "true" : "false");
  showTransformedButton.setAttribute("aria-selected", showTransformed ? "true" : "false");
  showDbButton.setAttribute("aria-selected", showDb ? "true" : "false");

  if (showOriginal) {
    rowCount.textContent = `${currentRows.length} row${currentRows.length === 1 ? "" : "s"} loaded`;
  } else if (showTransformed) {
    renderTransformedPreview(transformedRows, transformedBody);
    rowCount.textContent = `${transformedRows.length} transformed row${transformedRows.length === 1 ? "" : "s"}`;
  } else if (showDb) {
    selectAllDb.checked = false;
    await refreshDbList();
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

async function saveToDatabase() {
  if (transformedRows.length === 0) {
    updateStatus(currentRows, ["No transformed data to save. Load preview first."]);
    return;
  }
  try {
    await addGuests(transformedRows);
    updateStatus(currentRows, [`Successfully saved ${transformedRows.length} guest records to the database!`]);
  } catch (error) {
    console.error("Error saving to database:", error);
    updateStatus(currentRows, [`Error saving to database: ${error.message}`]);
  }
}

async function clearDatabase() {
  if (confirm("Are you sure you want to clear all guest records from the database? This cannot be undone.")) {
    try {
      await clearAllGuests();
      selectAllDb.checked = false;
      await refreshDbList();
      updateStatus(currentRows, ["Database cleared successfully."]);
    } catch (error) {
      console.error("Error clearing database:", error);
      updateStatus(currentRows, [`Error clearing database: ${error.message}`]);
    }
  }
}

async function exportSelectedDbXml() {
  const selectedCheckboxes = dbBody.querySelectorAll(".db-select:checked");
  if (selectedCheckboxes.length === 0) {
    alert("Please select at least one guest record to export.");
    return;
  }

  const ids = Array.from(selectedCheckboxes).map((cb) => Number.parseInt(cb.dataset.id, 10));
  try {
    const allGuests = await getAllGuests();
    const selectedGuests = allGuests.filter((g) => ids.includes(g.id));

    if (selectedGuests.length === 0) {
      alert("No matching records found in the database.");
      return;
    }

    const xml = buildTransformedXml(selectedGuests);
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const link = document.createElement("a");

    link.href = url;
    link.download = `database-selected-export-${stamp}.xml`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    updateStatus(currentRows, [`Exported ${selectedGuests.length} selected guest records from the database to XML.`]);
  } catch (error) {
    console.error("Error exporting selected guests:", error);
    alert(`Error exporting guests: ${error.message}`);
  }
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

function loadDemoData() {
  pasteArea.value = "25/07/2016 10:00\tphamhungthai@gmail.com\tPHAM HUNG THAI\tNam/Male\t10/10/1976\t51N5337648\tRussia\t28/07/2017\t123456789\t3";
  loadPreview();
}

loadButton.addEventListener("click", loadPreview);
saveToDbButton.addEventListener("click", saveToDatabase);
exportButton.addEventListener("click", exportXml);
clearButton.addEventListener("click", clearAll);
demoButton.addEventListener("click", loadDemoData);
showOriginalButton.addEventListener("click", () => switchView("original"));
showTransformedButton.addEventListener("click", () => switchView("transformed"));

// Database logs actions
showDbButton.addEventListener("click", () => {
  if (isAdmin()) {
    switchView("db");
  } else {
    alert("Admin login required to view the database");
  }
});
clearDbButton.addEventListener("click", clearDatabase);
exportDbButton.addEventListener("click", exportSelectedDbXml);

// Login modal event handlers
const loginModal = document.getElementById("loginModal");
const adminPwdInput = document.getElementById("adminPassword");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const guestLoginBtn = document.getElementById("guestLoginBtn");
const logoutBtn = document.getElementById("logoutButton");

adminLoginBtn?.addEventListener("click", () => {
  const pwd = adminPwdInput.value;
  if (loginAsAdmin(pwd)) {
    updateUI();
  } else {
    alert("Incorrect admin password");
  }
});

guestLoginBtn?.addEventListener("click", () => {
  loginAsGuest();
  updateUI();
});

logoutBtn?.addEventListener("click", () => {
  logout();
  updateUI();
});

// Existing selectAllDb listener
selectAllDb.addEventListener("change", () => {
  const checked = selectAllDb.checked;
  const checkboxes = dbBody.querySelectorAll(".db-select");
  checkboxes.forEach((cb) => {
    cb.checked = checked;
  });
});

dbBody.addEventListener("click", async (event) => {
  if (event.target.classList.contains("delete-btn")) {
    const id = Number.parseInt(event.target.dataset.id, 10);
    if (!Number.isNaN(id) && confirm("Are you sure you want to delete this guest record?")) {
      try {
        await deleteGuest(id);
        await refreshDbList();
        updateStatus(currentRows, ["Guest record deleted."]);
      } catch (error) {
        console.error("Error deleting guest:", error);
        updateStatus(currentRows, [`Error deleting guest: ${error.message}`]);
      }
    }
  }
});

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

// Original preview editable handling
previewBody.addEventListener("blur", handleOriginalEdit, true);

function handleOriginalEdit(event) {
  const cell = event.target;
  if (!cell || !cell.dataset || typeof cell.dataset.colIndex === 'undefined') {
    return;
  }
  const rowElement = cell.closest('tr');
  if (!rowElement) return;
  const rowIndex = Number.parseInt(rowElement.dataset.rowIndex, 10);
  const colIdx = Number.parseInt(cell.dataset.colIndex, 10);
  if (Number.isNaN(rowIndex) || Number.isNaN(colIdx) || !currentRows[rowIndex]) {
    return;
  }
  // Update the underlying data model
  currentRows[rowIndex][colIdx] = cell.textContent.trim();
  // Refresh transformed view based on edited original data
  refreshTransformed();
  updateStatus(currentRows);
}

transformedBody.addEventListener("keydown", (event) => {
  // Also handle Enter key for original preview cells
  const target = event.target;
  if (event.key === "Enter" && target && target.classList && target.classList.contains("editable-cell")) {
    event.preventDefault();
    target.blur();
  }

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
// Initialize authentication UI based on stored role
updateUI();
