import {
  normalizeCellValue,
  normalizeCountryName,
  looksLikeHeader,
} from "./utils.js";

export function parsePaste(text, columns, maxRows) {
  const source = String(text || "").replace(/\r/g, "");
  const lines = source.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { rows: [], warnings: ["Paste rows into the input area first."] };
  }

  const rawRows = lines.map((line) => line.split("\t"));
  const warnings = [];

  let rows = rawRows;
  if (rows.length > 0 && looksLikeHeader(rows[0], columns)) {
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

export function parseMapping(text) {
  const map = new Map();
  const source = String(text || "").replace(/\r/g, "");
  const lines = source.split("\n");

  lines.forEach((line) => {
    line = line.trim();
    if (!line) {
      return;
    }

    const lastCommaIndex = line.lastIndexOf(",");
    if (lastCommaIndex === -1) {
      return;
    }

    const leftPart = line.substring(0, lastCommaIndex).trim();
    const code = line.substring(lastCommaIndex + 1).trim().toUpperCase();

    // Map full entry (e.g. "AFG - Afghanistan" -> "AFG")
    const fullNormalized = normalizeCountryName(leftPart);
    if (fullNormalized && code) {
      map.set(fullNormalized, code);
    }

    // Also map name-only fallback (e.g. "Afghanistan" -> "AFG")
    const hyphenIndex = leftPart.indexOf(" - ");
    if (hyphenIndex !== -1) {
      const nameOnlyNormalized = normalizeCountryName(leftPart.substring(hyphenIndex + 3));
      if (nameOnlyNormalized && code) {
        map.set(nameOnlyNormalized, code);
      }
    }
  });

  return map;
}

export function mapGenderToCode(gender) {
  const val = String(gender || "").trim().toLowerCase();
  if (!val) {
    return "";
  }
  if (val.startsWith("n") || val.startsWith("f") || val.includes("nữ") || val.includes("female")) {
    return "F";
  }
  if (val.startsWith("m") || val.startsWith("nam") || val.includes("male")) {
    return "M";
  }
  return "M";
}
