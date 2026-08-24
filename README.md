# Word Search Puzzle Generator

A single-page browser app that generates printable word search puzzles from user-supplied words and hints.

**Live Demo:** [cheeleong.dev/word_search_puzzle](https://cheeleong.dev/word_search_puzzle)

## Features

- **Generate puzzles** from a textarea of words + hints (one per line)
- **Configurable grid**: adjustable padding, orientation toggles (horizontal, vertical, diagonal, reversed)
- **Canvas rendering** with answer key highlights using a color palette, or numbered-hints mode
- **Reproducible puzzles** via numeric seeds — the displayed seed regenerates the exact same puzzle
- **Share links** — one click copies a URL that encodes the words, settings, and seed
- **No accidental answers** — filler letters are re-rolled so no puzzle word appears twice in the grid
- **Download** the puzzle as a PNG image, or **export a two-page PDF** (puzzle + answer key)
- **Settings persistence** — words and options are saved in `localStorage` (with a "Clear Saved Data" button)
- **Zero dependencies** — runs entirely in the browser

## Project Structure

```
index.html      Page markup, SEO metadata, structured data
styles.css      Styles (screen, responsive, print)
app.js          Puzzle generation, canvas rendering, persistence
assets/         Favicon, touch icon, social preview image
sitemap.xml     Sitemap for search engines
docs/SPEC.md    Full functional specification
docs/TODO.md    Implementation history and task tracking
```

No build step — open `index.html` directly or serve the folder statically.

## Quick Start

1. Open `index.html` in a browser
2. Enter words and hints in the sidebar textarea
3. Adjust settings (title, padding, orientations) as needed
4. Click **Generate New Puzzle**, then **Download Image** (or **Export PDF**)

## Input Format

One entry per line, in either format:

```
WORD hint text
word — hint text
```

- **Classic:** leading uppercase letters are the puzzle word; the rest of the line is the hint.
- **Dash separator** (`—`, `–`, or ` - `): allows lowercase and multi-word entries — `ice cream — a frozen dessert` places `ICECREAM` in the grid but displays `ICE CREAM` in the answer key.
- Duplicate words are skipped (with a notice), and words shorter than 3 letters trigger a warning.
