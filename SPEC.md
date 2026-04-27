# SPEC.md: Client-Side Word Search Generator

## 1. Project Overview
A single-page frontend application (HTML/CSS/JS) that generates a word search puzzle from user-supplied words and hints entered via a textarea. The application renders the puzzle on an HTML5 Canvas, supports toggling the answer key, and allows downloading the result as a PNG image.

## 2. Input Format
Words and hints are entered one per line in a `<textarea>`:
- Leading contiguous uppercase letters (`[A-Z]+`) are parsed as the puzzle **word**.
- The remainder of the line (trimmed) is the **hint** text displayed below the grid.
- Blank lines and lines with no leading uppercase letters are ignored.

**Example:**
```
BIOFILM A protective microbial community attached to food contact surfaces that resists sanitizers
SPORES Dormant heat-resistant survival structures produced by certain bacteria
LISTERIA A foodborne pathogen that can survive and grow under refrigeration temperature
BACILLUSCEREUS A spore-forming foodborne bacterium commonly associated with cooked rice
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
4. For each word, attempt up to `MAX_ATTEMPTS_PER_WORD` (300) random placements. For each valid candidate (no out-of-bounds, no letter conflict), compute a **composite score**:
   * `score = intersections × 1000 + spreadBonus`
   * `intersections` = count of cells already occupied by the matching letter (encourages overlaps).
   * `spreadBonus` = average Euclidean distance of the candidate word's cells from the centroid of all already-placed cells (prevents clustering in large-padding grids). Zero when no cells have been placed yet.
5. Select the candidate with the highest composite score.
6. If no valid placement is found for any word, discard the board and restart (up to `MAX_FULL_PUZZLE_ATTEMPTS = 50` retries).
7. After all words are placed, fill remaining empty cells with random uppercase letters (A–Z).

## 4. Canvas Rendering

### 4.1 Layout (Top to Bottom)
1. **Title** — Rendered from the title input field, uppercased, bold sans-serif, centered. Font size scales down to fit canvas width (min 24px).
2. **Subtitle** — Only rendered when answers are visible: `"ANSWER KEY"`, centered below the title.
3. **Grid** — Centered on the canvas. Cell size is `min(MAX_CELL_SIZE=42, floor((CANVAS_WIDTH − 80) / GRID_SIZE))`, minimum `18px`. Letters use bold Courier New sized proportional to the cell.
4. **Answer highlights** — When answers are shown, each word's cells are highlighted using a color from `ANSWER_PALETTE` (10 distinct fill/stroke pairs cycling by word index):
   * **Non-diagonal words** — a single rounded rectangle spanning the word's bounding box.
   * **Diagonal words** — a single rotated pill (capsule) drawn along the word's angle, centered between the first and last cell centers, using `ctx.save()` / `ctx.rotate()` / `ctx.restore()`.
5. **Hints section** — Rendered below the grid with `22px Arial`. When answers are visible, the word is prepended in the word's palette color: `WORD — hint text`. Long hints wrap within canvas margins (`HINT_MARGIN_X = 50px`).

### 4.2 Canvas Sizing
- Width: fixed at `1200px`.
- Height: computed dynamically before each render to exactly fit the title, optional subtitle, grid, and hints sections without overflow.

### 4.3 Output & Interactivity
* **Generate New Puzzle** — Re-parses the textarea and regenerates. Does not auto-regenerate while typing.
* **Show/Hide Answers** — Toggles answer highlights and word prefixes in hints. Re-renders without regenerating. **Answers are visible by default on page load.**
* **Download Image** — Exports the current canvas state as PNG via `canvas.toDataURL("image/png")`. Filename is `<slug>-answer-key.png` or `<slug>-word-search.png` depending on answer visibility.

## 5. UI Controls

| Control | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| Puzzle title | `<input type="text">` | `"Word Search"` | Canvas title text; updates canvas live on input |
| Words & hints | `<textarea>` | Example terms | One word+hint per line |
| Grid padding | `<input type="number">` | `2` (range 1–20) | Extra cells on each side beyond the longest word |
| Allow reversed words | `<input type="checkbox">` | Unchecked | Adds cardinal reverse directions; also enables reverse diagonals when diagonal is on |
| Allow diagonal words | `<input type="checkbox">` | **Checked** | Adds top-to-bottom diagonal directions (↘ ↙) |
| Shuffle hints order | `<input type="checkbox">` | Unchecked | Randomizes hint display order (Fisher-Yates) on each generation; word placement sort is unaffected |
| Generate New Puzzle | `<button>` | — | Triggers re-parse and regeneration |
| Show/Hide Answers | `<button>` | — | Toggles answer display; label reflects current state |
| Download Image | `<button>` | — | Downloads current canvas as PNG |

## 6. Technical Stack
* **Language:** JavaScript (ES6+), running entirely in the user's browser.
* **Rendering Engine:** HTML5 Canvas API (`getContext('2d')`).
* **Packaging:** Single `index.html` file containing HTML, CSS, and JS.
