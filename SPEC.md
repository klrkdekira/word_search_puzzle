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
  * `padding` = user-configurable integer input, default `2`.
* **Allowed Orientations:** Cardinal directions only (horizontal and vertical, both forward and backward). No diagonals.

### 3.2 Placement Logic
1. Initialize an empty `GRID_SIZE × GRID_SIZE` 2D array.
2. Sort words by length descending.
3. For each word, attempt up to `MAX_ATTEMPTS_PER_WORD` (300) random placements. For each valid candidate (no out-of-bounds, no letter conflict), compute an **intersection score** — the count of cells already occupied by the matching letter. After sampling, select the candidate with the **highest intersection score** to encourage word overlaps.
4. If no valid placement is found for any word, discard the board and restart (up to `MAX_FULL_PUZZLE_ATTEMPTS = 50` retries).
5. After all words are placed, fill remaining empty cells with random uppercase letters (A–Z).

## 4. Canvas Rendering

### 4.1 Layout (Top to Bottom)
1. **Title** — Rendered from the title input field, uppercased, bold sans-serif, centered. Font size scales down to fit canvas width.
2. **Subtitle** — Only rendered when answers are visible: `"ANSWER KEY"`, centered below the title. Not shown otherwise.
3. **Grid** — Centered on the canvas. Cell size is computed as `min(MAX_CELL_SIZE=42, floor((CANVAS_WIDTH − 80) / GRID_SIZE))`, minimum `18px`. Letter font is a bold monospaced font (Courier New) sized proportional to the cell.
4. **Answer highlights** — When answers are shown, semi-transparent red rectangles (`#FF000055`) are drawn behind each word's cells before drawing letters.
5. **Hints section** — Rendered below the grid. Each line shows the hint text. When answers are visible, the word is prepended: `WORD — hint text`. Long hints wrap within the canvas margins.

### 4.2 Canvas Sizing
- Width: fixed at `1200px`.
- Height: computed dynamically before each render to exactly fit the title, optional subtitle, grid, and hints sections without overflow.

### 4.3 Output & Interactivity
* **Generate New Puzzle** — Re-parses the textarea and regenerates the puzzle. Does not auto-regenerate while typing.
* **Show/Hide Answers** — Toggles answer highlights and word prefixes in the hints section. Re-renders the canvas without regenerating.
* **Download Image** — Exports the current canvas state as PNG via `canvas.toDataURL("image/png")`.

## 5. UI Controls

| Control | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| Puzzle title | `<input type="text">` | `"Word Search"` | Canvas title text |
| Words & hints | `<textarea>` | Example terms | One word+hint per line |
| Grid padding | `<input type="number">` | `2` | Extra cells added on each side beyond the longest word |
| Generate New Puzzle | `<button>` | — | Triggers re-parse and regeneration |
| Show/Hide Answers | `<button>` | — | Toggles answer display |
| Download Image | `<button>` | — | Downloads current canvas as PNG |

## 6. Technical Stack
* **Language:** JavaScript (ES6+), running entirely in the user's browser.
* **Rendering Engine:** HTML5 Canvas API (`getContext('2d')`).
* **Packaging:** Single `index.html` file containing HTML, CSS, and JS.
