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
  pasteArea.value = [
    "06/11/2026 00:35\tmelissa.brown91@gmail.com\tMelissa Brown\tNữ/ Female\t14/07/1991\tpassA7834x\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t1.28475E+12\t1",
    "06/11/2026 00:37\tjacob.turner88@hotmail.com\tJacob Turner\tNam/ Male\t23/11/1988\tturnB5521q\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t9.87321E+11\t1",
    "06/11/2026 00:40\tsara.goldman77@gmail.com\tSara Goldman\tNữ/ Female\t05/04/1977\tgoldC9812w\tISR - Israel\t06/13/2026\t1.14789E+12\t2",
    "06/11/2026 00:42\tdaniel.levi84@yahoo.com\tDaniel Levi\tNam/ Male\t17/09/1984\tleviD6619p\tISR - Israel\t06/13/2026\t8.56123E+11\t2",
    "06/11/2026 00:44\temma.wilson95@gmail.com\tEmma Wilson\tNữ/ Female\t29/01/1995\twilsE3377m\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t1.30294E+12\t1",
    "06/11/2026 00:47\tnoah.carter90@hotmail.com\tNoah Carter\tNam/ Male\t12/08/1990\tcartF8821n\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t7.98452E+11\t1",
    "06/11/2026 00:49\trachel.cohen86@gmail.com\tRachel Cohen\tNữ/ Female\t18/02/1986\tcoheG4412k\tISR - Israel\t06/13/2026\t1.02358E+12\t2",
    "06/11/2026 00:51\tethan.shapiro92@gmail.com\tEthan Shapiro\tNam/ Male\t04/12/1992\tshapH1948j\tISR - Israel\t06/13/2026\t9.43125E+11\t2",
    "06/11/2026 00:54\tolivia.green99@yahoo.com\tOlivia Green\tNữ/ Female\t07/06/1999\tgreeJ7735h\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t1.21877E+12\t1",
    "06/11/2026 00:56\tliam.evans87@gmail.com\tLiam Evans\tNam/ Male\t30/03/1987\tevanK5689g\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t8.75439E+11\t1",
    "06/11/2026 00:58\tmaya.rosen94@hotmail.com\tMaya Rosen\tNữ/ Female\t22/10/1994\troseL1134f\tISR - Israel\t06/13/2026\t1.17384E+12\t2",
    "06/11/2026 01:01\taaron.katz89@gmail.com\tAaron Katz\tNam/ Male\t15/05/1989\tkatzM9032d\tISR - Israel\t06/13/2026\t9.65281E+11\t2",
    "06/11/2026 01:04\tchloe.harris96@gmail.com\tChloe Harris\tNữ/ Female\t11/09/1996\tharrN4417s\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t1.33125E+12\t1",
    "06/11/2026 01:07\tlucas.morgan85@yahoo.com\tLucas Morgan\tNam/ Male\t26/07/1985\tmorgP7628a\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t8.91734E+11\t1",
    "06/11/2026 01:10\tyael.peretz93@gmail.com\tYael Peretz\tNữ/ Female\t03/01/1993\tpereQ1189z\tISR - Israel\t06/13/2026\t1.05273E+12\t2",
    "06/11/2026 01:13\tomer.mizrahi88@hotmail.com\tOmer Mizrahi\tNam/ Male\t21/11/1988\tmizrR5527x\tISR - Israel\t06/13/2026\t9.87416E+11\t2",
    "06/11/2026 01:16\tsophia.baker97@gmail.com\tSophia Baker\tNữ/ Female\t09/04/1997\tbakeS2281v\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t1.28753E+12\t1",
    "06/11/2026 01:18\tjames.foster91@gmail.com\tJames Foster\tNam/ Male\t14/12/1991\tfostT7742b\tGBR - United Kingdom of Great Britain and Northern Ireland\t06/12/2026\t8.63127E+11\t1",
    "06/11/2026 01:21\ttamar.benami90@yahoo.com\tTamar Benami\tNữ/ Female\t27/08/1990\tbenaU9918c\tISR - Israel\t06/13/2026\t1.10865E+12\t2",
    "06/11/2026 01:24\tyonatan.barak95@gmail.com\tYonatan Barak\tNam/ Male\t06/02/1995\tbaraV4473l\tISR - Israel\t06/13/2026\t9.20837E+11\t2",
  ].join("\n");
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
showDbButton.addEventListener("click", () => switchView("db"));
clearDbButton.addEventListener("click", clearDatabase);
exportDbButton.addEventListener("click", exportSelectedDbXml);

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
