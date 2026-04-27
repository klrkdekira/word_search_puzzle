# TODO

## Implementation Tasks

- [x] **Parse textarea input** — `parseTerms(text)` extracts `{ word, hint }` from each line by matching leading `[A-Z]+` as word and remainder as hint; skip invalid/blank lines.
- [x] **Remove hardcoded TERMS array** — Replace with output of `parseTerms` on textarea value at generate time.
- [x] **Remove microbiology defaults** — Remove `DEFAULT_TITLE = "Food Microbiology Word Search"` and hardcoded 15-term list; default title to `"Word Search"`, default textarea to example content.
- [x] **Dynamic grid size** — Compute `GRID_SIZE = maxWordLength + padding × 2` per generation; remove `const GRID_SIZE = 25`.
- [x] **Padding input** — Add `<input type="number">` in sidebar (label: "Grid padding", default `2`); use value in `generatePuzzle`.
- [x] **Intersection-preferring placement** — Score each valid candidate placement by number of letter overlaps; after sampling `MAX_ATTEMPTS_PER_WORD` candidates, select the highest-scoring one.
- [x] **Remove "UNSOLVED PUZZLE" subtitle** — Render subtitle only when `showAnswers === true` (text: `"ANSWER KEY"`).
- [x] **Textarea UI** — Replace word list with `<textarea>` in sidebar; clicking "Generate" re-parses and regenerates.
- [x] **Hints section on canvas** — Render hints (not plain word bank) below grid; use `wrapText` for long hints. When `showAnswers`, prepend `WORD — ` to each hint line.
- [x] **Dynamic canvas height** — Compute canvas height before each render to fit title + optional subtitle + grid + hints; resize canvas element accordingly.
- [x] **Allow diagonal words checkbox** — Add checkbox (default checked); includes `ORIENTATIONS_DIAG_FORWARD` (↘ ↙); reverse diagonals added only when "Allow reversed" is also checked.
- [x] **Allow reversed words checkbox** — Add checkbox (default unchecked); adds cardinal reverse directions and, when diagonal is also on, bottom-to-top diagonals.
- [x] **Shuffle hints order checkbox** — Add checkbox (default unchecked); applies Fisher-Yates shuffle to hint display order on each generation; placement sort unaffected.
- [x] **Spread-aware placement** — Replace pure intersection score with composite `score = intersections × 1000 + spreadBonus` to prevent word clustering in large-padding grids.
- [x] **Diagonal answer highlight pill** — Draw a single rotated capsule (via `ctx.rotate`) for diagonal words instead of a per-cell or bounding-box rectangle.
- [x] **Show answers by default** — Initialise `showAnswers = true` so the answer key is visible on page load.

## Potential Improvements

- [x] **Debounced auto-regenerate** — Opt-in toggle to regenerate automatically while the user types in the textarea (debounced ~600 ms).
- [x] **Multi-column hints layout** — When there are few short hints, render them in 2–3 columns below the grid to reduce wasted vertical space.
- [x] **Custom highlight colour picker** — Let users choose or randomize the answer palette colors instead of the fixed 10-color set.
- [x] **Print-optimised CSS** — `@media print` stylesheet: hide sidebar, expand canvas to full page width, ensure grid and hints paginate cleanly.
- [x] **Seed-based reproducible puzzles** — Accept an optional numeric seed so the same puzzle can be shared via URL or regenerated deterministically.
- [x] **Word count / grid density indicator** — Show in the sidebar how many words were placed and what percentage of the grid cells are covered by words vs. filler letters.
- [x] **Minimum word length validation** — Warn (or silently drop) words shorter than 3 characters, which are trivially easy to find and clutter the grid.
- [x] **Export as PDF** — Generate a print-ready A4/Letter layout: puzzle on page 1, answer key on page 2, using the browser Print dialog or a library like jsPDF.
- [x] **Numbered hints mode** — Display position numbers in highlighted cells instead of color fills, with a numbered list of hints below (classic crossword-style presentation).
- [x] **Accessible text fallback** — Render an off-screen `<table>` representation of the grid for screen readers (`aria-hidden="false"` on table, `aria-hidden="true"` on canvas).
- [x] **Hint font size control** — Slider or number input to scale hint text size for printed handouts targeting different age groups.
- [x] **Expose advanced generation settings** — `MAX_ATTEMPTS_PER_WORD` and `MAX_FULL_PUZZLE_ATTEMPTS` as collapsible advanced settings, useful when placing many long words in a tight grid.
