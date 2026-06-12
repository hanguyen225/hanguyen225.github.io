# handlerXML — Spreadsheet-to-XML Guest Registration Tool

A browser-based tool that replaces the broken Excel/Google Sheets workflow for preparing guest registration data as XML. Built because spreadsheet programs silently mangle dates, phone numbers, and text formatting — and no amount of cell-format tweaking fixes it reliably.

---

## The Problem

Hotels and guesthouses that need to submit guest data as XML (`KHAI_BAO_TAM_TRU` format) typically start in Excel or Google Sheets. This falls apart fast:

- **Date format mismatch.** The source data arrives as `mm/dd/yyyy hh:mm`, but the XML output needs `dd/mm/yyyy`. Excel reformats dates based on locale, so `06/11/2026` could be June 11 or November 6 depending on whose machine opens the file. Copy-pasting between sheets makes it worse.
- **Cell format destroys values.** Phone numbers like `1284750000000` get turned into scientific notation (`1.28475E+12`). Passport numbers starting with `0` lose the leading zero. There is no undo — the original value is gone once Excel "corrects" it.
- **Manual formula errors.** Calculating checkout dates (`arrival + stay duration`) with `=A1+J1` in Excel requires the cell to already be in date format. If it isn't, you get a serial number instead of a date. Multiply this across 20+ rows and errors are guaranteed.

This tool accepts the raw paste from a spreadsheet, parses it without reformatting, and generates correct XML directly.

---

## What It Does

1. **Paste** — Copy rows directly from Excel or Google Sheets into the text area. Tabs separate columns, newlines separate rows. No file upload, no import wizard.

2. **Parse** — The tool reads exactly 10 columns per row:

   | Column | Field                    | Example                                                  |
   |--------|--------------------------|----------------------------------------------------------|
   | A      | Time in                  | `06/11/2026 00:35`                                       |
   | B      | Gmail                    | `melissa.brown91@gmail.com`                              |
   | C      | Name                     | `Melissa Brown`                                          |
   | D      | Gender                   | `Nữ/ Female` or `Nam/ Male`                              |
   | E      | DOB                      | `14/07/1991`                                             |
   | F      | Passport number          | `passA7834x`                                             |
   | G      | Nationality              | `GBR - United Kingdom of Great Britain and Northern Ireland` |
   | H      | Check-out date           | `06/12/2026`                                             |
   | I      | Phone number             | `1.28475E+12`                                            |
   | J      | Number of days staying   | `1`                                                      |

3. **Transform** — Each row gets converted to the XML-ready format:

   | Transformed Field         | Source                                              | Rule                                                               |
   |---------------------------|-----------------------------------------------------|--------------------------------------------------------------------|
   | `name`                    | Column C                                            | Uppercased (`Melissa Brown` → `MELISSA BROWN`)                     |
   | `DOB`                     | Column E                                            | Passed through as-is                                               |
   | `birthdate correct up to` | —                                                   | Always `D` (day precision)                                         |
   | `gender`                  | Column D                                            | Mapped to `M` or `F` from Vietnamese/English labels                |
   | `nationality code`        | Column G + `nationality.txt`                        | Looked up from 3-letter ISO code mapping file                      |
   | `passport number`         | Column F                                            | Passed through as-is                                               |
   | `arrival date`            | Column A                                            | Parsed from `mm/dd/yyyy hh:mm` → reformatted to `dd/mm/yyyy`      |
   | `expected leaving date`   | Column A + Column J                                 | Arrival date + number of days staying                              |
   | `checkout date`           | Same as expected leaving date                       | Initialized to match expected leaving date                         |
   | `room number`             | —                                                   | Left blank for manual entry in the transformed table               |

4. **Edit** — The transformed table is fully editable. Click any cell to correct a nationality code, fix a name, or type in a room number before exporting.

5. **Export** — One click generates a well-formed XML file (`KHAI_BAO_TAM_TRU` schema) and downloads it. No server, no backend — everything runs in the browser.

---

## Date Handling (The Core Fix)

This is the main reason the tool exists. The date pipeline works like this:

- **Input:** `06/11/2026 00:35` (this is `mm/dd/yyyy hh:mm` — June 11, 2026)
- **Parsed to:** JavaScript `Date` object → June 11, 2026
- **Output:** `11/06/2026` (reformatted as `dd/mm/yyyy`)
- **Checkout:** `11/06/2026` + `1` day → `12/06/2026`

If the date in column A can't be parsed (corrupted or unexpected format), the raw text is kept as-is in all date fields — nothing is silently changed.

---

## Nationality Mapping

At page load, the tool fetches `nationality.txt` — a mapping file with lines like:

```
GBR - United Kingdom of Great Britain and Northern Ireland, GBR
ISR - Israel, ISR
AFG - Afghanistan, AFG
```

Each line maps a full country string (matching what Google Forms / Sheets produces) to its 3-letter ISO code. The lookup is case-insensitive and matches both the full string (`GBR - United Kingdom...`) and the name-only part (`United Kingdom...`).

---

## Guest Database (Local Storage)

Transformed rows can be saved to a **local IndexedDB** database in the browser. This is useful for:

- Accumulating guests across multiple paste sessions before doing a single XML export
- Reviewing past entries without re-pasting
- Selectively exporting specific guests from the database view

The database tab lets you select individual rows, export selected rows to XML, or clear the entire database.

Optionally, the storage backend can be switched to **Supabase** (cloud PostgreSQL) by filling in credentials in `db.js` — but by default it runs fully offline with IndexedDB.

---

## Project Structure

```
├── index.html              Main page — paste input, controls, preview tables
├── nationality.txt         Country name → 3-letter code mapping file
├── _config.yml             GitHub Pages config
└── assets/
    ├── css/
    │   └── main.css         Layout, table styles, editable cells, view switching
    └── js/
        ├── app.js           Main logic — parsing, transformation, event wiring, demo data
        ├── parser.js        Tab-separated paste parser, header detection, nationality mapping parser
        ├── renderer.js      DOM rendering for original, transformed, and database preview tables
        ├── utils.js         Date parsing (mm/dd/yyyy → dd/mm/yyyy), escaping, cell normalization
        ├── xmlBuilder.js    Builds the KHAI_BAO_TAM_TRU XML string from transformed rows
        └── db.js            Storage layer — IndexedDB (default) or Supabase (optional)
```

---

## Usage

1. **Open the page.** Serve it locally (`Live Server`, `python -m http.server`, etc.) or deploy to GitHub Pages. A local HTTP server is required because the tool fetches `nationality.txt` at startup.

2. **Paste data.** Copy rows from Excel or Google Sheets and paste into the text area. Click **Load preview** (or it auto-loads on paste).

3. **Check the original preview.** Verify the 10-column layout looks correct.

4. **Switch to Transformed table.** Review the converted data — dates reformatted, names uppercased, nationality codes resolved.

5. **Edit if needed.** Click any cell in the transformed table to correct values. Gender auto-normalizes on blur.

6. **Export XML.** Click **Export XML** to download the file. Or save to the local database first and export later from the database tab.

> **Tip:** Click **Demo Data** to load 20 sample rows instantly for testing.

---

## Running Locally

```bash
# Any static server works. Examples:

# VS Code Live Server extension (recommended)
# Right-click index.html → Open with Live Server

# Python
python -m http.server 5500

# Node
npx serve .
```

---

## License

MIT
