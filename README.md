# Word Search Puzzle Generator

A single-page browser app that generates printable word search puzzles from user-supplied words and hints.

**Live Demo:** [cheeleong.dev/word_search_puzzle](https://cheeleong.dev/word_search_puzzle)

## Features

- **Generate puzzles** from a textarea of words + hints (one per line)
- **Configurable grid**: adjustable padding, orientation toggles (horizontal, vertical, diagonal, reversed)
- **Canvas rendering** with answer key highlights using a color palette
- **Download** the puzzle as a PNG image
- **Zero dependencies** — runs entirely in the browser

## Quick Start

1. Open `index.html` in a browser
2. Enter words and hints in the sidebar textarea
3. Adjust settings (title, padding, orientations) as needed
4. Click **Generate New Puzzle**, then **Download Image**

## Input Format

```
WORD — hint text
ANOTHER — another hint
```

Leading uppercase letters are parsed as the puzzle word; the rest is the hint.
