export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function normalizeCellValue(value) {
  return value == null ? "" : String(value).trim();
}

export function normalizeCountryName(value) {
  return String(value || "")
    .trim()
    .replace(/^\"|\"$/g, "")
    .toLowerCase();
}

export function looksLikeHeader(row, columns) {
  const normalized = row.map((cell) => normalizeCellValue(cell).toLowerCase());
  return columns.every((column, index) => normalized[index] === column.key.toLowerCase());
}

export function parseTimeInToDate(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
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

export function formatDateDdMmYyyy(dateObject) {
  const day = String(dateObject.getDate()).padStart(2, "0");
  const month = String(dateObject.getMonth() + 1).padStart(2, "0");
  const year = dateObject.getFullYear();
  return `${day}/${month}/${year}`;
}

export function addDays(dateObject, days) {
  const result = new Date(dateObject);
  result.setDate(result.getDate() + days);
  return result;
}

export function normalizeDateString(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) {
    return raw;
  }

  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);

  // Try interpreting as mm/dd/yyyy first (Excel / US locale default)
  if (first >= 1 && first <= 12) {
    const candidate = new Date(year, first - 1, second);
    if (
      !Number.isNaN(candidate.getTime()) &&
      candidate.getFullYear() === year &&
      candidate.getMonth() + 1 === first &&
      candidate.getDate() === second
    ) {
      // Valid as mm/dd — output as dd/mm/yyyy
      return `${String(second).padStart(2, "0")}/${String(first).padStart(2, "0")}/${year}`;
    }
  }

  // Fallback: interpret as dd/mm/yyyy (already correct order)
  if (second >= 1 && second <= 12) {
    const candidate = new Date(year, second - 1, first);
    if (
      !Number.isNaN(candidate.getTime()) &&
      candidate.getFullYear() === year &&
      candidate.getMonth() + 1 === second &&
      candidate.getDate() === first
    ) {
      return `${String(first).padStart(2, "0")}/${String(second).padStart(2, "0")}/${year}`;
    }
  }

  // Neither works — return cleaned-up raw value
  return `${String(first).padStart(2, "0")}/${String(second).padStart(2, "0")}/${year}`;
}
