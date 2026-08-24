# SPEC.md: Client-Side Word Search Generator

## 1. Project Overview
A single-page frontend application (HTML/CSS/JS) that generates a word search puzzle from user-supplied words and hints entered via a textarea. The application renders the puzzle on an HTML5 Canvas, supports toggling the answer key, and allows downloading the result as a PNG image or exporting a two-page PDF. Settings persist in `localStorage`, and puzzles can be shared via URL.

## 2. Input Format
Words and hints are entered one per line in a `<textarea>`. Two formats are accepted:

1. **Classic:** Leading contiguous uppercase letters (`[A-Z]+`) are the puzzle **word**; the remainder of the line (trimmed, with any leading `—`, `–`, `:`, or `-` separator stripped) is the **hint**.
2. **Dash separator:** `word — hint` (em dash `—`, en dash `–`, or spaced hyphen ` - `). The text before the first separator becomes the word, allowing **lowercase** and **multi-word** entries (up to 3 tokens of letters only). Spaces are stripped for grid placement (`ICECREAM`) while the spaced form (`ICE CREAM`) is kept as the **display** name in the answer key. A line that already looks like the classic format with a dash inside the hint (all-caps first token followed by mixed-case words) is parsed as classic.

Additional rules:
- Blank lines and lines matching neither format are ignored.
- **Duplicate words** (after normalization) are skipped; a status notice lists them.
- Words shorter than 3 letters produce a warning (they are still placed).

**Example:**
```
BIOFILM A protective microbial community attached to food contact surfaces that resists sanitizers
SPORES Dormant heat-resistant survival structures produced by certain bacteria
LISTERIA A foodborne pathogen that can survive and grow under refrigeration temperature
ice cream — a frozen dessert (multi-word entry via dash separator)
```

## 3. Algorithm Requirements

### 3.1 Grid Constraints
* **Dimensions:** `GRID_SIZE = maxWordLength + padding × 2` (square grid, same for X and Y).
  * `maxWordLength` = length of the longest parsed word.
  * `padding` = user-configurable integer input, default `2`, range `1–20`.
* **Allowed Orientations:** Controlled via checkboxes (see §5). Default active set: horizontal forward, vertical forward, and both forward diagonals (↘ ↙).

### 3.2 Orientation Sets

| Constant | Vectors | Active when |
| :--- | :--- | :--- |
| `ORIENTATIONS_FORWARD` | `(+1,0)` `(0,+1)` | Always included |
| Cardinal reverse | `(-1,0)` `(0,-1)` | "Allow reversed words" checked |
| `ORIENTATIONS_DIAG_FORWARD` | `(+1,+1)` `(-1,+1)` | "Allow diagonal words" checked |
| `ORIENTATIONS_DIAG_REVERSE` | `(+1,-1)` `(-1,-1)` | Both "Allow diagonal" **and** "Allow reversed" checked |

Diagonal words are always top-to-bottom (`dy ≥ 0`) unless "Allow reversed" is also enabled, which adds bottom-to-top diagonals.

### 3.3 Placement Logic
1. Initialize an empty `GRID_SIZE × GRID_SIZE` 2D array.
2. Sort words by length descending.
3. Track all previously placed cells (`placedCells`) across words to compute a running centroid.
4. For each word, attempt up to `MAX_ATTEMPTS_PER_WORD` (default 300) random placements. For each valid candidate (no out-of-bounds, no letter conflict), compute a **composite score**:
   * `score = intersections × 1000 + spreadBonus`
   * `intersections` = count of cells already occupied by the matching letter (encourages overlaps).
   * `spreadBonus` = average Euclidean distance of the candidate word's cells from the centroid of all already-placed cells (prevents clustering in large-padding grids). Zero when no cells have been placed yet.
5. Select the candidate with the highest composite score.
6. If no valid placement is found for any word, discard the board and restart (up to `MAX_FULL_PUZZLE_ATTEMPTS`, default 50, retries).
7. After all words are placed, fill remaining empty cells with random uppercase letters (A–Z).
8. **Accidental-word scrub:** scan the filled grid along all active orientations for extra occurrences of any puzzle word (length ≥ 3) beyond its placed location. Occurrences containing at least one filler cell are fixed by re-rolling a filler cell (bounded passes); an extra occurrence made entirely of placed cells cannot be fixed, so the board is discarded and generation retries.

### 3.4 Seeding & Reproducibility
* All randomness flows through a seeded PRNG (mulberry32), re-seeded at the start of each generation.
* **Seed input:** blank → seeded from `Date.now()`, and the numeric seed used is written back into the input. An **all-digit** seed is used verbatim (so the displayed seed reproduces the same puzzle); any other string is hashed (FNV-1a) to a 32-bit seed.
* "Randomise seed on each generate" (default checked) clears the seed before each generation; unchecking it locks the current seed.
* On load, a seed may be restored from the URL hash (`#seed=...`, or as part of a share link).

## 4. Canvas Rendering

### 4.1 Layout (Top to Bottom)
1. **Title** — Rendered from the title input field, uppercased, bold sans-serif, centered. Font size scales down to fit canvas width (min 24px).
2. **Subtitle** — Only rendered when answers are visible: `"ANSWER KEY"`, centered below the title.
3. **Grid** — Centered on the canvas. Cell size is `min(MAX_CELL_SIZE=42, floor((CANVAS_WIDTH − 80) / GRID_SIZE))`, minimum `18px`. Letters use bold Courier New sized proportional to the cell.
4. **Answer highlights** — When answers are shown, each word's cells are highlighted using a color from the current palette (10 distinct fill/stroke pairs cycling by word index; "Randomize Colors" regenerates the palette from random HSL values):
   * **Non-diagonal words** — a single rounded rectangle spanning the word's bounding box.
   * **Diagonal words** — a single rotated pill (capsule) drawn along the word's angle, centered between the first and last cell centers, using `ctx.save()` / `ctx.rotate()` / `ctx.restore()`.
   * **Numbered hints mode** — additionally draws the word's number in the word's stroke color at its first cell.
5. **Hints section** — Rendered below the grid (font size from the "Hint font size" slider, default 22px), in 1–3 columns depending on hint widths. When answers are visible, each hint is prefixed in the word's palette color: `N. ` in numbered mode, or `DISPLAYWORD — ` otherwise (the display form preserves spaces in multi-word entries). Long hints wrap within their column (`HINT_MARGIN_X = 50px`).

### 4.2 Canvas Sizing
- Width: fixed at `1200px`.
- Height: computed dynamically before each render to exactly fit the title, optional subtitle, grid, and hints sections without overflow.

### 4.3 Output & Interactivity
* **Generate New Puzzle** — Re-parses the textarea and regenerates. Auto-regeneration while typing is available via the "Auto-regenerate on edit" checkbox (debounced ~600 ms).
* **Show/Hide Answers** — Toggles answer highlights and hint prefixes. Re-renders without regenerating. **Answers are visible by default on page load.**
* **Download Image** — Exports the current canvas state as PNG via `canvas.toDataURL("image/png")`. Filename is `<slug>-answer-key.png` or `<slug>-word-search.png` depending on answer visibility.
* **Export PDF** — Opens a new window with the puzzle on page 1 and the answer key on page 2, then triggers the browser print dialog.
* **Copy Share Link** — Serializes title, words, settings, and seed as URL-safe base64 into the URL hash (`#p=...`) and copies the full URL to the clipboard. Opening a share link restores everything and regenerates the identical puzzle.
* **Clear Saved Data** — After confirmation, removes the `localStorage` entry, strips the URL hash, and reloads with defaults.

## 5. UI Controls

| Control | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| Puzzle title | `<input type="text">` | `"Word Search"` | Canvas title text; updates canvas live on input |
| Words & hints | `<textarea>` | Example terms | One word+hint per line (see §2) |
| Grid padding | `<input type="number">` | `2` (range 1–20) | Extra cells on each side beyond the longest word |
| Allow reversed words | checkbox | Unchecked | Adds cardinal reverse directions; also enables reverse diagonals when diagonal is on |
| Allow diagonal words | checkbox | **Checked** | Adds top-to-bottom diagonal directions (↘ ↙) |
| Shuffle hints order | checkbox | **Checked** | Randomizes hint display order (Fisher-Yates, seeded) on each generation; word placement sort is unaffected |
| Auto-regenerate on edit | checkbox | Unchecked | Regenerates ~600 ms after typing stops |
| Numbered hints mode | checkbox | **Checked** | Numbers in grid cells + numbered hint list instead of word prefixes |
| Hint font size | range slider | `22` (14–36) | Scales hint text for printed handouts |
| Randomise seed on each generate | checkbox | **Checked** | Clears the seed before each generation |
| Puzzle seed | `<input type="text">` | (auto) | All-digit seeds are used verbatim; other strings are hashed |
| Attempts per word | number (advanced) | `300` (50–2000) | `MAX_ATTEMPTS_PER_WORD` |
| Full puzzle retries | number (advanced) | `50` (5–200) | `MAX_FULL_PUZZLE_ATTEMPTS` |
| Generate New Puzzle | button (primary) | — | Triggers re-parse and regeneration |
| Show/Hide Answers | button | — | Toggles answer display; label reflects current state |
| Download PNG | button | — | Downloads current canvas as PNG |
| Export PDF | button | — | Two-page print layout (puzzle + answer key) |
| Share Link | button | — | Copies a URL that restores this exact puzzle |
| New Colors | button | — | Regenerates the highlight palette |
| Clear saved data | text button | — | Clears `localStorage` and reloads with defaults |

The sidebar is organized into titled groups — **Puzzle** (title, words), **Options** (padding, font size, orientation/display checkboxes), **Seed** (randomise toggle, seed input, advanced settings), and **Actions** (buttons, status). Only the primary Generate button uses the accent color; the other actions are neutral, with the four export/share actions in a two-column grid.

## 6. Persistence
* All sidebar settings (title, words, padding, checkboxes, hint font size, advanced settings — but not the seed) are saved to `localStorage` (key `wordSearchPuzzleSettings`) on any control change (debounced) and restored on load.
* A share-link hash (`#p=...`) in the URL overrides saved settings on load.
* Storage failures (private mode, quota) are silently ignored; the app falls back to defaults.

## 7. Accessibility & Responsive Layout
* An off-screen `<table>` mirrors the grid for screen readers; the canvas is `aria-hidden`.
* Status (errors/warnings, in the sidebar) and stats (placement summary, above the canvas) messages use `aria-live="polite"`.
* The sidebar is sticky on desktop (scrolls independently when taller than the viewport); keyboard focus uses a visible `:focus-visible` outline in the accent color.
* Below `800px` viewport width, the sidebar stacks above the canvas panel and sticky positioning is disabled.

## 8. Technical Stack
* **Language:** JavaScript (ES6+), running entirely in the user's browser.
* **Rendering Engine:** HTML5 Canvas API (`getContext('2d')`).
* **Packaging:** Three static files — `index.html` (markup), `styles.css` (styles), `app.js` (logic). Zero dependencies, no build step; works from `file://` or any static host.
