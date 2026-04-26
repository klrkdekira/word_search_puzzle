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

## Potential Improvements

- [ ] Debounced auto-regenerate when textarea changes (opt-in toggle)
- [ ] Multi-column hints layout for shorter hint sets
- [ ] Custom highlight colour picker for answer cells
- [ ] Print-optimised CSS (`@media print`)
