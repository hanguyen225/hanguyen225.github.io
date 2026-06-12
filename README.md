# hanguyen225.github.io

Static GitHub Pages tool that accepts pasted table data from Google Sheets or Excel and exports it as an XML file.

## Features

- Fixed 10-column source table layout (A to J)
- Supports up to 100 rows in the source workspace
- Switchable preview modes: original source table and transformed editable table
- Transformed fields for order number, uppercase name, nationality code, and date calculations
- Automatic nationality mapping loaded from the `nationality` file at startup
- Client-side XML export from transformed editable rows (no backend)

## Project Structure

- `index.html` - page markup, dual preview tables, and controls
- `assets/css/main.css` - styles for layout, table switching, and editable cells
- `assets/js/app.js` - source parsing, transformed-row generation, mapping parser, and XML export logic
- `nationality` - list of 3-letter codes and country names mapped at page load
- `_config.yml` - GitHub Pages config

## Usage

1. Open the site. (Requires a local HTTP server locally due to browser CORS policies on file fetches).
2. Paste source rows from Excel or Google Sheets into the spreadsheet input.
3. Click **Load preview** to refresh both original and transformed views.
4. Use the switch buttons above the preview table to move between original and transformed views.
5. Edit transformed cells directly in the transformed table when needed.
6. Click **Export XML** to download XML from transformed rows.

## Date Rules

- Arrival date: parsed from source column A (`mm/dd/yyyy hh:mm`) to `dd/mm/yyyy`
- Expected leaving date: arrival date + source column J (`number of date staying`)
- Checkout date: initialized from expected leaving date
- If column A is not parseable, arrival/expected/checkout keep the original text value
