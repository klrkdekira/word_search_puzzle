const DEFAULT_TITLE = "Word Search";
const CANVAS_WIDTH = 1200;
const MAX_CELL_SIZE = 42;
const MIN_CELL_SIZE = 18;
const MAX_ATTEMPTS_PER_WORD = 300;
const MAX_FULL_PUZZLE_ATTEMPTS = 50;
const ORIENTATIONS_FORWARD = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
];
const ORIENTATIONS_ALL = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];
const ORIENTATIONS_DIAG_FORWARD = [
  { dx: 1, dy: 1 },
  { dx: -1, dy: 1 },
];
const ORIENTATIONS_DIAG_REVERSE = [
  { dx: 1, dy: -1 },
  { dx: -1, dy: -1 },
];
const ANSWER_PALETTE = [
  { fill: "rgba(220,50,50,0.2)", stroke: "rgba(200,30,30,0.9)" },
  { fill: "rgba(30,140,200,0.2)", stroke: "rgba(20,110,180,0.9)" },
  { fill: "rgba(30,160,100,0.2)", stroke: "rgba(20,130,80,0.9)" },
  { fill: "rgba(160,60,200,0.2)", stroke: "rgba(130,40,170,0.9)" },
  { fill: "rgba(200,130,10,0.25)", stroke: "rgba(170,100,0,0.9)" },
  { fill: "rgba(20,160,160,0.2)", stroke: "rgba(10,130,130,0.9)" },
  { fill: "rgba(220,80,150,0.2)", stroke: "rgba(190,50,120,0.9)" },
  { fill: "rgba(80,120,200,0.2)", stroke: "rgba(50,90,180,0.9)" },
  { fill: "rgba(50,170,80,0.2)", stroke: "rgba(30,140,60,0.9)" },
  { fill: "rgba(200,80,30,0.2)", stroke: "rgba(170,50,10,0.9)" },
];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Seeded PRNG (mulberry32). Re-seeded at the start of each generation.
let rng = Math.random.bind(Math);
function seedRng(seed) {
  let s = seed >>> 0;
  rng = function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const canvas = document.getElementById("puzzleCanvas");
const ctx = canvas.getContext("2d");
const generateBtn = document.getElementById("generateBtn");
const toggleBtn = document.getElementById("toggleBtn");
const downloadBtn = document.getElementById("downloadBtn");
const titleInput = document.getElementById("titleInput");
const termsTextarea = document.getElementById("termsTextarea");
const paddingInput = document.getElementById("paddingInput");
const allowReverseCheck = document.getElementById("allowReverseCheck");
const allowDiagonalCheck = document.getElementById("allowDiagonalCheck");
const shuffleHintsCheck = document.getElementById("shuffleHintsCheck");
const autoRegenerateCheck = document.getElementById(
  "autoRegenerateCheck",
);
const numberedHintsCheck = document.getElementById("numberedHintsCheck");
const randomiseSeedCheck = document.getElementById("randomiseSeedCheck");
const seedRandomHint = document.getElementById("seedRandomHint");
const hintFontSizeInput = document.getElementById("hintFontSizeInput");
const hintFontSizeValue = document.getElementById("hintFontSizeValue");
const seedInput = document.getElementById("seedInput");
const maxAttemptsInput = document.getElementById("maxAttemptsInput");
const maxFullAttemptsInput = document.getElementById(
  "maxFullAttemptsInput",
);
const exportPdfBtn = document.getElementById("exportPdfBtn");
const randomizeColorsBtn = document.getElementById("randomizeColorsBtn");
const shareLinkBtn = document.getElementById("shareLinkBtn");
const clearSavedBtn = document.getElementById("clearSavedBtn");
const statsMsg = document.getElementById("statsMsg");
const puzzleTable = document.getElementById("puzzleTable");
const statusMsg = document.getElementById("statusMsg");

let grid = [];
let solutionMap = [];
let currentTerms = [];
let currentGridSize = 10;
let showAnswers = true;
let puzzleTitle = DEFAULT_TITLE;
let currentPalette = ANSWER_PALETTE.map((c) => ({ ...c }));

// A dash separator ("word — hint", "ice cream - hint") allows lowercase
// and multi-word entries. It is ignored when the line already looks like
// the classic "WORD hint text" format with a dash inside the hint.
function parseLine(line) {
  const sep = line.match(/[—–]|\s-\s/);
  if (sep && sep.index > 0) {
    const left = line.slice(0, sep.index).trim();
    const tokens = left.split(/\s+/);
    const wordlike =
      /^[A-Za-z]+(?: +[A-Za-z]+)*$/.test(left) && tokens.length <= 3;
    const classicLooking =
      tokens.length > 1 &&
      /^[A-Z]+$/.test(tokens[0]) &&
      tokens.slice(1).some((t) => /[a-z]/.test(t));
    if (wordlike && !classicLooking) {
      return {
        rawWord: left,
        hint: line.slice(sep.index + sep[0].length).trim(),
      };
    }
  }
  const match = line.match(/^([A-Z]+)(.*)/);
  if (!match) return null;
  return {
    rawWord: match[1],
    hint: match[2].replace(/^[\s—–:-]+/, "").trim(),
  };
}

function parseTerms(text) {
  const terms = [];
  const seen = new Set();
  const duplicates = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = parseLine(line);
    if (!parsed) continue;
    const display = parsed.rawWord
      .toUpperCase()
      .replace(/[^A-Z ]/g, "")
      .replace(/ +/g, " ")
      .trim();
    const word = display.replace(/ /g, "");
    if (!word) continue;
    if (seen.has(word)) {
      duplicates.push(word);
      continue;
    }
    seen.add(word);
    terms.push({ word, display, hint: parsed.hint });
  }
  return { terms, duplicates };
}

function computeGridSize(words, padding) {
  if (words.length === 0) return 10;
  const maxLen = Math.max(...words.map((w) => w.length));
  return maxLen + padding * 2;
}

function computeCellSize(gridSize) {
  const available = CANVAS_WIDTH - 80;
  return Math.max(
    MIN_CELL_SIZE,
    Math.min(MAX_CELL_SIZE, Math.floor(available / gridSize)),
  );
}

function makeEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(""));
}

function randomInt(max) {
  return Math.floor(rng() * max);
}

function randomLetter() {
  return ALPHABET[randomInt(ALPHABET.length)];
}

function scorePlacement(word, x, y, dx, dy, board, gridSize) {
  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const nx = x + i * dx;
    const ny = y + i * dy;
    if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return null;
    const cell = board[ny][nx];
    if (cell && cell !== word[i]) return null;
    if (cell === word[i]) intersections++;
  }
  return intersections;
}

function placeWord(
  word,
  board,
  gridSize,
  orientations,
  placedCells,
  maxAttemptsPerWord,
) {
  let bestScore = -Infinity;
  let bestPlacement = null;

  // Compute centroid of already-placed cells for spread bonus
  let centroidX = 0,
    centroidY = 0;
  if (placedCells.length > 0) {
    for (const c of placedCells) {
      centroidX += c.x;
      centroidY += c.y;
    }
    centroidX /= placedCells.length;
    centroidY /= placedCells.length;
  }

  for (let attempt = 0; attempt < maxAttemptsPerWord; attempt++) {
    const { dx, dy } = orientations[randomInt(orientations.length)];
    const x = randomInt(gridSize);
    const y = randomInt(gridSize);
    const intersections = scorePlacement(
      word,
      x,
      y,
      dx,
      dy,
      board,
      gridSize,
    );
    if (intersections === null) continue;

    let spreadBonus = 0;
    if (placedCells.length > 0) {
      let totalDist = 0;
      for (let i = 0; i < word.length; i++) {
        const nx = x + i * dx;
        const ny = y + i * dy;
        totalDist += Math.sqrt(
          (nx - centroidX) ** 2 + (ny - centroidY) ** 2,
        );
      }
      spreadBonus = totalDist / word.length;
    }

    const score = intersections * 1000 + spreadBonus;
    if (score > bestScore) {
      bestScore = score;
      bestPlacement = { x, y, dx, dy };
    }
  }
  if (!bestPlacement) return null;
  const { x, y, dx, dy } = bestPlacement;
  const cells = [];
  for (let i = 0; i < word.length; i++) {
    const nx = x + i * dx;
    const ny = y + i * dy;
    board[ny][nx] = word[i];
    cells.push({ x: nx, y: ny });
  }
  return { word, cells };
}

function fillEmptyCells(board, gridSize) {
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (!board[row][col]) board[row][col] = randomLetter();
    }
  }
}

function findWordOccurrences(word, board, gridSize, orientations) {
  const occurrences = [];
  for (const { dx, dy } of orientations) {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const endX = x + (word.length - 1) * dx;
        const endY = y + (word.length - 1) * dy;
        if (endX < 0 || endX >= gridSize || endY < 0 || endY >= gridSize)
          continue;
        let matches = true;
        for (let i = 0; i < word.length; i++) {
          if (board[y + i * dy][x + i * dx] !== word[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          occurrences.push(
            Array.from({ length: word.length }, (_, i) => ({
              x: x + i * dx,
              y: y + i * dy,
            })),
          );
        }
      }
    }
  }
  return occurrences;
}

// Filler letters can accidentally spell a puzzle word a second time.
// Re-roll filler cells until each word appears only at its placed
// location; returns false when an extra occurrence is made entirely of
// placed cells and cannot be fixed without breaking a placement.
function scrubAccidentalWords(board, gridSize, placed, orientations) {
  const cellKey = (c) => `${c.x},${c.y}`;
  const placedSet = new Set();
  for (const p of placed) {
    for (const c of p.cells) placedSet.add(cellKey(c));
  }
  const legitimate = new Set(
    placed.map((p) => p.cells.map(cellKey).sort().join(";")),
  );
  for (let pass = 0; pass < 80; pass++) {
    let fixed = false;
    for (const p of placed) {
      if (p.word.length < 3) continue;
      const occurrences = findWordOccurrences(
        p.word,
        board,
        gridSize,
        orientations,
      );
      for (const occ of occurrences) {
        const sig = occ.map(cellKey).sort().join(";");
        if (legitimate.has(sig)) continue;
        const fillers = occ.filter((c) => !placedSet.has(cellKey(c)));
        if (fillers.length === 0) return false;
        const cell = fillers[randomInt(fillers.length)];
        let replacement;
        do {
          replacement = randomLetter();
        } while (replacement === board[cell.y][cell.x]);
        board[cell.y][cell.x] = replacement;
        fixed = true;
      }
    }
    if (!fixed) return true;
  }
  return false;
}

function generatePuzzle(
  terms,
  padding,
  orientations,
  maxAttemptsPerWord,
  maxFullAttempts,
) {
  const sortedTerms = [...terms].sort(
    (a, b) => b.word.length - a.word.length,
  );
  const words = sortedTerms.map((t) => t.word);
  const gridSize = computeGridSize(words, padding);
  for (let attempt = 0; attempt < maxFullAttempts; attempt++) {
    const board = makeEmptyGrid(gridSize);
    const placed = [];
    const placedCells = [];
    let allPlaced = true;
    for (const word of words) {
      const result = placeWord(
        word,
        board,
        gridSize,
        orientations,
        placedCells,
        maxAttemptsPerWord,
      );
      if (!result) {
        allPlaced = false;
        break;
      }
      placed.push(result);
      for (const c of result.cells) placedCells.push(c);
    }
    if (!allPlaced) continue;
    fillEmptyCells(board, gridSize);
    if (!scrubAccidentalWords(board, gridSize, placed, orientations))
      continue;
    return { grid: board, solutionMap: placed, gridSize };
  }
  throw new Error(
    `Unable to place all words after ${maxFullAttempts} attempts. Try increasing the grid padding.`,
  );
}

// wrapTextOffset: draws text starting at (x + firstLineOffset, y) for the first
// line, then wraps subsequent lines starting at x.
function wrapTextOffset(
  ctx,
  text,
  x,
  firstLineOffset,
  y,
  maxWidth,
  lineHeight,
) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  let isFirst = true;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    const avail = isFirst ? maxWidth - firstLineOffset : maxWidth;
    if (ctx.measureText(test).width > avail && line) {
      ctx.fillText(line, isFirst ? x + firstLineOffset : x, lineY);
      line = word;
      lineY += lineHeight;
      isFirst = false;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, isFirst ? x + firstLineOffset : x, lineY);
    lineY += lineHeight;
  }
  return lineY;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, lineY);
    lineY += lineHeight;
  }
  return lineY;
}

function computeHintColumns(terms, maxHintWidth, hintTextFn, fontSize) {
  ctx.font = `${fontSize}px Arial, sans-serif`;
  const COL_GAP = 40;
  for (const numCols of [3, 2]) {
    const colWidth = (maxHintWidth - COL_GAP * (numCols - 1)) / numCols;
    const allFit = terms.every((term) => {
      return ctx.measureText(hintTextFn(term)).width <= colWidth;
    });
    if (allFit) return numCols;
  }
  return 1;
}

function measureHintsHeight(
  terms,
  maxHintWidth,
  lineHeight,
  numCols,
  hintTextFn,
  fontSize,
) {
  ctx.font = `${fontSize}px Arial, sans-serif`;
  const COL_GAP = 40;
  const colWidth = (maxHintWidth - COL_GAP * (numCols - 1)) / numCols;
  const chunkSize = Math.ceil(terms.length / numCols);
  let maxColHeight = 0;
  for (let col = 0; col < numCols; col++) {
    const chunk = terms.slice(col * chunkSize, (col + 1) * chunkSize);
    let colHeight = 0;
    for (const term of chunk) {
      const text = hintTextFn(term);
      const words = text.split(" ");
      let line = "";
      let lineCount = 1;
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > colWidth && line) {
          lineCount++;
          line = w;
        } else {
          line = test;
        }
      }
      colHeight += lineCount * lineHeight + 8;
    }
    maxColHeight = Math.max(maxColHeight, colHeight);
  }
  return maxColHeight;
}

function normalizeTitle(value) {
  const title = value.trim();
  return title || DEFAULT_TITLE;
}

function getRenderedTitle() {
  return puzzleTitle.toUpperCase();
}

function makeFilenameBase() {
  const slug = puzzleTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "word-search";
}

function renderPuzzle() {
  if (currentTerms.length === 0 || grid.length === 0) return;

  const terms = currentTerms;
  const gridSize = currentGridSize;
  const cellSize = computeCellSize(gridSize);
  const gridPixelSize = gridSize * cellSize;

  const TITLE_FONT_SIZE = 48;
  const HEADER_HEIGHT = TITLE_FONT_SIZE + 30;
  const SUBTITLE_HEIGHT = showAnswers ? 44 : 0;
  const GRID_TOP_MARGIN = 20;
  const HINT_FONT_SIZE = parseInt(hintFontSizeInput.value, 10) || 22;
  const HINT_LINE_HEIGHT = HINT_FONT_SIZE + 10;
  const HINT_MARGIN_X = 50;
  const HINTS_TOP_MARGIN = 50;
  const CANVAS_BOTTOM_MARGIN = 40;
  const maxHintWidth = CANVAS_WIDTH - HINT_MARGIN_X * 2;

  const wordNumberIndex = new Map();
  terms.forEach((t, i) => wordNumberIndex.set(t.word, i + 1));

  const getHintText = ({ word, display, hint }) => {
    if (!showAnswers) return hint;
    if (numberedHintsCheck.checked) {
      const n = wordNumberIndex.get(word);
      return n != null ? `${n}. ${hint}` : hint;
    }
    return `${display || word} \u2014 ${hint}`;
  };

  const numCols = computeHintColumns(
    terms,
    maxHintWidth,
    getHintText,
    HINT_FONT_SIZE,
  );
  const hintsHeight = measureHintsHeight(
    terms,
    maxHintWidth,
    HINT_LINE_HEIGHT,
    numCols,
    getHintText,
    HINT_FONT_SIZE,
  );

  const gridStartY = HEADER_HEIGHT + SUBTITLE_HEIGHT + GRID_TOP_MARGIN;
  const canvasHeight =
    gridStartY +
    gridPixelSize +
    HINTS_TOP_MARGIN +
    hintsHeight +
    CANVAS_BOTTOM_MARGIN;

  canvas.width = CANVAS_WIDTH;
  canvas.height = Math.ceil(canvasHeight);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvas.height);

  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const renderedTitle = getRenderedTitle();
  let titleFS = TITLE_FONT_SIZE;
  while (titleFS > 24) {
    ctx.font = `bold ${titleFS}px Arial, sans-serif`;
    if (ctx.measureText(renderedTitle).width <= CANVAS_WIDTH - 80) break;
    titleFS -= 2;
  }
  ctx.fillText(renderedTitle, CANVAS_WIDTH / 2, titleFS + 20);

  if (showAnswers) {
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText("ANSWER KEY", CANVAS_WIDTH / 2, HEADER_HEIGHT + 32);
  }

  const gridStartX = Math.floor((CANVAS_WIDTH - gridPixelSize) / 2);

  if (showAnswers) {
    solutionMap.forEach((placement, idx) => {
      const color = currentPalette[idx % currentPalette.length];
      const cells = placement.cells;
      if (cells.length === 0) return;
      const xs = cells.map((c) => c.x);
      const ys = cells.map((c) => c.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      const isDiagonal = maxX - minX > 0 && maxY - minY > 0;
      if (isDiagonal) {
        // Draw a single rotated pill along the word's diagonal angle
        const first = cells[0];
        const last = cells[cells.length - 1];
        const cx1 = gridStartX + first.x * cellSize + cellSize / 2;
        const cy1 = gridStartY + first.y * cellSize + cellSize / 2;
        const cx2 = gridStartX + last.x * cellSize + cellSize / 2;
        const cy2 = gridStartY + last.y * cellSize + cellSize / 2;
        const midX = (cx1 + cx2) / 2;
        const midY = (cy1 + cy2) / 2;
        const angle = Math.atan2(cy2 - cy1, cx2 - cx1);
        const pillW =
          Math.sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2) + cellSize - 4;
        const pillH = cellSize - 4;
        const radius = pillH / 2;
        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, radius);
        ctx.fillStyle = color.fill;
        ctx.fill();
        ctx.strokeStyle = color.stroke;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      } else {
        const rx = gridStartX + minX * cellSize + 2;
        const ry = gridStartY + minY * cellSize + 2;
        const rw = (maxX - minX + 1) * cellSize - 4;
        const rh = (maxY - minY + 1) * cellSize - 4;
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, 6);
        ctx.fillStyle = color.fill;
        ctx.fill();
        ctx.strokeStyle = color.stroke;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    });
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000000";
  const gridFontSize = Math.max(12, Math.floor(cellSize * 0.72));
  ctx.font = `bold ${gridFontSize}px "Courier New", monospace`;
  const textOffsetX = Math.floor(cellSize * 0.15);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const px = gridStartX + col * cellSize + textOffsetX;
      const py = gridStartY + row * cellSize + cellSize / 2;
      ctx.fillText(grid[row][col], px, py);
    }
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000000";
  ctx.font = `${HINT_FONT_SIZE}px Arial, sans-serif`;

  const wordColorIndex = new Map();
  solutionMap.forEach((p, i) => wordColorIndex.set(p.word, i));

  // Draw word numbers in grid cells (numbered hints mode)
  if (showAnswers && numberedHintsCheck.checked) {
    const numSize = Math.max(9, Math.floor(cellSize * 0.28));
    ctx.font = `bold ${numSize}px Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    solutionMap.forEach((placement, idx) => {
      const color = currentPalette[idx % currentPalette.length];
      const first = placement.cells[0];
      ctx.fillStyle = color.stroke;
      const n = wordNumberIndex.get(placement.word) ?? idx + 1;
      ctx.fillText(
        String(n),
        gridStartX + first.x * cellSize + 2,
        gridStartY + first.y * cellSize + 2,
      );
    });
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000000";
  ctx.font = `${HINT_FONT_SIZE}px Arial, sans-serif`;
  const COL_GAP = 40;
  const colWidth = (maxHintWidth - COL_GAP * (numCols - 1)) / numCols;
  const chunkSize = Math.ceil(terms.length / numCols);
  for (let col = 0; col < numCols; col++) {
    const chunk = terms.slice(col * chunkSize, (col + 1) * chunkSize);
    const colStartX = HINT_MARGIN_X + col * (colWidth + COL_GAP);
    let currentY = gridStartY + gridPixelSize + HINTS_TOP_MARGIN;
    for (const { word, display, hint } of chunk) {
      if (showAnswers) {
        const cidx = wordColorIndex.has(word)
          ? wordColorIndex.get(word) % currentPalette.length
          : 0;
        const isNumbered = numberedHintsCheck.checked;
        const n = isNumbered ? wordNumberIndex.get(word) : null;
        const prefix = isNumbered
          ? n != null
            ? `${n}. `
            : ""
          : `${display || word} \u2014 `;
        const prefixWidth = ctx.measureText(prefix).width;
        if (prefix) {
          ctx.fillStyle = currentPalette[cidx].stroke;
          ctx.fillText(prefix, colStartX, currentY);
        }
        ctx.fillStyle = "#000000";
        currentY = wrapTextOffset(
          ctx,
          hint,
          colStartX,
          prefixWidth,
          currentY,
          colWidth,
          HINT_LINE_HEIGHT,
        );
      } else {
        currentY = wrapText(
          ctx,
          hint,
          colStartX,
          currentY,
          colWidth,
          HINT_LINE_HEIGHT,
        );
      }
      currentY += 8;
    }
  }
}

function updateToggleLabel() {
  toggleBtn.textContent = showAnswers ? "Hide Answers" : "Show Answers";
  canvas.setAttribute(
    "aria-label",
    `${puzzleTitle} word search puzzle grid${
      showAnswers ? " - ANSWER KEY" : ""
    }`,
  );
}

function downloadImage() {
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  const filenameBase = makeFilenameBase();
  link.download = showAnswers
    ? `${filenameBase}-answer-key.png`
    : `${filenameBase}-word-search.png`;
  link.click();
}

function setStatus(message) {
  statusMsg.textContent = message;
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h || 1;
}

function shuffleArray(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function safeGenerateAndRender() {
  const { terms, duplicates } = parseTerms(termsTextarea.value);
  if (terms.length === 0) {
    setStatus(
      "No valid words found. Each line should start with uppercase letters, or use word — hint.",
    );
    return;
  }

  const notes = [];
  if (duplicates.length > 0) {
    const unique = [...new Set(duplicates)];
    notes.push(
      `Duplicate ${unique.length === 1 ? "word" : "words"} skipped: ${unique.join(", ")}.`,
    );
  }
  const shortWords = terms
    .filter((t) => t.word.length < 3)
    .map((t) => t.word);
  if (shortWords.length > 0) {
    notes.push(
      `Note: "${shortWords.join('", "')}" ${shortWords.length === 1 ? "is" : "are"} shorter than 3 letters and may be trivially easy to find.`,
    );
  }
  setStatus(notes.join(" "));

  // Seed handling. All-digit seeds are used verbatim so the displayed
  // auto-generated seed reproduces the same puzzle when typed back in.
  if (randomiseSeedCheck.checked) seedInput.value = "";
  const rawSeed = seedInput.value.trim();
  const numericSeed =
    rawSeed === ""
      ? Date.now() >>> 0 || 1
      : /^\d+$/.test(rawSeed)
        ? Number(rawSeed) >>> 0 || 1
        : hashSeed(rawSeed);
  if (rawSeed === "") seedInput.value = String(numericSeed);
  seedRng(numericSeed);

  const padding = Math.max(1, parseInt(paddingInput.value, 10) || 2);
  const maxAttemptsPerWord = Math.max(
    50,
    parseInt(maxAttemptsInput.value, 10) || 300,
  );
  const maxFullAttempts = Math.max(
    5,
    parseInt(maxFullAttemptsInput.value, 10) || 50,
  );
  const orientations = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    ...(allowReverseCheck.checked
      ? [
          { dx: -1, dy: 0 },
          { dx: 0, dy: -1 },
        ]
      : []),
    ...(allowDiagonalCheck.checked ? ORIENTATIONS_DIAG_FORWARD : []),
    ...(allowDiagonalCheck.checked && allowReverseCheck.checked
      ? ORIENTATIONS_DIAG_REVERSE
      : []),
  ];
  const displayTerms = shuffleHintsCheck.checked
    ? shuffleArray(terms)
    : terms;
  try {
    const result = generatePuzzle(
      terms,
      padding,
      orientations,
      maxAttemptsPerWord,
      maxFullAttempts,
    );
    grid = result.grid;
    solutionMap = result.solutionMap;
    currentTerms = displayTerms;
    currentGridSize = result.gridSize;

    // Stats
    const totalCells = result.gridSize * result.gridSize;
    const wordCells = new Set();
    for (const { cells } of result.solutionMap) {
      for (const c of cells) wordCells.add(`${c.x},${c.y}`);
    }
    const pct = ((wordCells.size / totalCells) * 100).toFixed(1);
    statsMsg.textContent = `${result.solutionMap.length} word${
      result.solutionMap.length !== 1 ? "s" : ""
    } placed \u00b7 ${result.gridSize}\u00d7${result.gridSize} grid \u00b7 ${pct}% coverage`;

    renderPuzzle();
    updateAccessibleTable();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected error.";
    console.error(err);
    setStatus(message);
  }
}

function updateAccessibleTable() {
  if (!grid.length) return;
  puzzleTable.innerHTML = grid
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`,
    )
    .join("");
}

function exportPdf() {
  if (!grid.length) return;
  const was = showAnswers;
  showAnswers = false;
  renderPuzzle();
  const puzzleOnly = canvas.toDataURL("image/png");
  showAnswers = true;
  renderPuzzle();
  const withAnswers = canvas.toDataURL("image/png");
  showAnswers = was;
  renderPuzzle();
  updateToggleLabel();
  const win = window.open("", "_blank");
  if (!win) {
    setStatus("Pop-up blocked. Allow pop-ups to use Export PDF.");
    return;
  }
  const safeTitle = puzzleTitle
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  win.document.write(
    `<!doctype html><html><head><title>${safeTitle} \u2014 PDF</title>` +
      `<style>body{margin:0}img{width:100%;display:block;page-break-after:always}</style></head>` +
      `<body><img src="${puzzleOnly}" alt="Puzzle"/><img src="${withAnswers}" alt="Answer Key"/>` +
      `<script>window.onload=function(){window.print()}<\/script></body></html>`,
  );
  win.document.close();
}

function randomizeColors() {
  currentPalette = ANSWER_PALETTE.map(() => {
    const h = (rng() * 360) | 0;
    const s = (55 + rng() * 35) | 0;
    const l = (45 + rng() * 15) | 0;
    return {
      fill: `hsla(${h},${s}%,${l}%,0.25)`,
      stroke: `hsla(${h},${s}%,${l - 15}%,0.9)`,
    };
  });
  renderPuzzle();
}

function updateSeedInputState() {
  const isRandom = randomiseSeedCheck.checked;
  seedInput.disabled = isRandom;
  seedRandomHint.style.display = isRandom ? "none" : "inline";
}

const STORAGE_KEY = "wordSearchPuzzleSettings";

function collectSettings() {
  return {
    title: titleInput.value,
    words: termsTextarea.value,
    padding: paddingInput.value,
    reverse: allowReverseCheck.checked,
    diagonal: allowDiagonalCheck.checked,
    shuffle: shuffleHintsCheck.checked,
    auto: autoRegenerateCheck.checked,
    numbered: numberedHintsCheck.checked,
    fontSize: hintFontSizeInput.value,
    randomiseSeed: randomiseSeedCheck.checked,
    maxAttempts: maxAttemptsInput.value,
    maxFullAttempts: maxFullAttemptsInput.value,
  };
}

function applySettings(s) {
  if (typeof s.title === "string") titleInput.value = s.title;
  if (typeof s.words === "string") termsTextarea.value = s.words;
  if (s.padding != null) paddingInput.value = s.padding;
  if (typeof s.reverse === "boolean")
    allowReverseCheck.checked = s.reverse;
  if (typeof s.diagonal === "boolean")
    allowDiagonalCheck.checked = s.diagonal;
  if (typeof s.shuffle === "boolean")
    shuffleHintsCheck.checked = s.shuffle;
  if (typeof s.auto === "boolean") autoRegenerateCheck.checked = s.auto;
  if (typeof s.numbered === "boolean")
    numberedHintsCheck.checked = s.numbered;
  if (s.fontSize != null) hintFontSizeInput.value = s.fontSize;
  if (typeof s.randomiseSeed === "boolean")
    randomiseSeedCheck.checked = s.randomiseSeed;
  if (s.maxAttempts != null) maxAttemptsInput.value = s.maxAttempts;
  if (s.maxFullAttempts != null)
    maxFullAttemptsInput.value = s.maxFullAttempts;
  hintFontSizeValue.textContent = hintFontSizeInput.value;
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSettings()));
  } catch {
    /* storage unavailable (private mode, quota) — ignore */
  }
}

function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) applySettings(JSON.parse(raw));
  } catch {
    /* corrupt or unavailable storage — fall back to defaults */
  }
}

function encodeShareState() {
  const state = { ...collectSettings(), seed: seedInput.value.trim() };
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeShareState(encoded) {
  try {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function copyShareLink() {
  if (!grid.length) return;
  const encoded = encodeShareState();
  history.replaceState(null, "", `#p=${encoded}`);
  const url = location.href;
  const fallback = () => window.prompt("Copy this link:", url);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(
      () => setStatus("Share link copied to clipboard."),
      fallback,
    );
  } else {
    fallback();
  }
}

randomiseSeedCheck.addEventListener("change", updateSeedInputState);
updateSeedInputState();

generateBtn.addEventListener("click", safeGenerateAndRender);
allowReverseCheck.addEventListener("change", safeGenerateAndRender);
allowDiagonalCheck.addEventListener("change", safeGenerateAndRender);
shuffleHintsCheck.addEventListener("change", safeGenerateAndRender);
seedInput.addEventListener("change", safeGenerateAndRender);
maxAttemptsInput.addEventListener("change", safeGenerateAndRender);
maxFullAttemptsInput.addEventListener("change", safeGenerateAndRender);

numberedHintsCheck.addEventListener("change", renderPuzzle);

hintFontSizeInput.addEventListener("input", () => {
  hintFontSizeValue.textContent = hintFontSizeInput.value;
  renderPuzzle();
});

let _debounceTimer = null;
termsTextarea.addEventListener("input", () => {
  if (!autoRegenerateCheck.checked) return;
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(safeGenerateAndRender, 600);
});

exportPdfBtn.addEventListener("click", exportPdf);
randomizeColorsBtn.addEventListener("click", randomizeColors);
shareLinkBtn.addEventListener("click", copyShareLink);

clearSavedBtn.addEventListener("click", () => {
  if (!window.confirm("Clear saved settings and restore the defaults?"))
    return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  history.replaceState(null, "", location.pathname + location.search);
  location.reload();
});

// Persist settings whenever any sidebar control changes.
const sidebarEl = document.querySelector(".sidebar");
let _saveTimer = null;
sidebarEl.addEventListener("input", () => {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveSettings, 300);
});
sidebarEl.addEventListener("change", saveSettings);

toggleBtn.addEventListener("click", () => {
  showAnswers = !showAnswers;
  updateToggleLabel();
  renderPuzzle();
});

downloadBtn.addEventListener("click", downloadImage);

titleInput.addEventListener("input", () => {
  puzzleTitle = normalizeTitle(titleInput.value);
  updateToggleLabel();
  renderPuzzle();
});

// Restore state on load: saved settings first, then the URL hash
// (a shared link overrides what was saved locally).
loadSavedSettings();
const _hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
const _sharedEncoded = _hashParams.get("p");
const _sharedState = _sharedEncoded
  ? decodeShareState(_sharedEncoded)
  : null;
if (_sharedState) {
  applySettings(_sharedState);
  if (_sharedState.seed) {
    seedInput.value = _sharedState.seed;
    randomiseSeedCheck.checked = false;
  }
} else {
  const _initSeed = _hashParams.get("seed");
  if (_initSeed) {
    seedInput.value = _initSeed;
    randomiseSeedCheck.checked = false;
  }
}
puzzleTitle = normalizeTitle(titleInput.value);
updateToggleLabel();
updateSeedInputState();
safeGenerateAndRender();
