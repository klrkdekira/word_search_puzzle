# SPEC.md: Client-Side Word Search Generator (Food Microbiology)

## 1. Project Overview
The objective is to develop a single-page frontend application (HTML/CSS/JS) that dynamically generates a word search puzzle from a hardcoded list of 15 food microbiology terms. The application must render the puzzle using the HTML5 Canvas API, allowing users to view the unsolved puzzle, toggle the answer key, and download the resulting configurations as image files (PNG/JPEG).

## 2. Terminology & Content
The generator must use the following 15 uppercase strings.

| Term | Count | Term | Count |
| :--- | :--- | :--- | :--- |
| **CROSSCONTAMINATION** | 18 | **SPORES** | 6 |
| **THERMALDESTRUCTION** | 18 | **DVALUE** | 6 |
| **HURDLETECHNOLOGY** | 16 | **ZVALUE** | 6 |
| **BACILLUSCEREUS** | 14 | **LISTERIA** | 8 |
| **BACTERIOCIN** | 11 | **BIOFILM** | 7 |
| **ATPTESTING** | 10 | **AMR** | 3 |
| **SANITATION** | 10 | **VBNC** | 4 |
| **SWABBING** | 8 | | |

## 3. Algorithm Requirements

### 3.1 Grid Constraints
* **Dimensions:** Fixed at 25 × 25 characters.
* **Allowed Orientations:** Strictly limited to the cardinal points.
  * Horizontal (Forward & Backward)
  * Vertical (Forward & Upward)
* **Strict Rule:** No diagonal placements allowed.

### 3.2 Placement Logic
1. Initialize a empty 2D array of size 25 × 25.
2. Sort words by length descending.
3. For each word, attempt placement up to 200 times at random coordinates and orientations. Store successful placements in a `solutionMap`.
4. If a conflict arises, re-roll the coordinate/orientation. Overlapping words sharing a letter are allowed.
5. After all 15 words are placed, fill remaining cells with random uppercase letters (A–Z).

## 4. Client-Side Image Generation Specs (HTML5 Canvas)

The application must use a hidden or visible `<canvas>` element to draw the puzzle worksheet. The visual layout described in text must be strictly implemented by the Canvas `DrawingContext2D`.

### 4.1 Drawing Environment & Layout
* **Canvas Size:** Sufficient for high resolution (e.g., 1200x1600 pixels).
* **Font:** Use a bold, **monospaced** font (e.g., `30px "Courier New"`) for the grid letters to ensure perfect grid alignment.
* **Colors:** Background: `#FFFFFF`. Text: `#000000`.

### 4.2 Worksheet Layout Components (Top to Bottom)

#### A. Header Section
1. **Title:** "FOOD MICROBIOLOGY WORD SEARCH"
   * Center-aligned, bold, sans-serif font (e.g., Arial), large size.
2. **Subtitle:** Either "UNSOLVED PUZZLE" or "ANSWER KEY".
   * Center-aligned, smaller size.

#### B. The Grid Section
1. **Rendering:** Centered on the canvas. Loop through the 25 × 25 array, drawing letters at calculated `(x, y)` coordinates with ample line-height and letter-spacing.
2. **Solution Logic:** When rendering the **Answer Key** version:
   * Before drawing the letters, access the `solutionMap`. Draw semi-transparent colored rectangles (e.g., Light Red `#FF000055`) over the specific cells containing words from the list.

#### C. Footer Section (Word Bank)
1. **Layout:** organize the 15 words into three columns below the grid.
2. **Rendering:** Standard sans-serif font, left-aligned within each column.

### 4.3 Output & Interactivity
* **UI Controls:** Buttons for "Generate New Puzzle", "Show/Hide Answers", and "Download Image".
* **Export Logic:** Use `canvas.toDataURL("image/png")` to generate a base64 string and programmatically create a download link to save the final image locally.

## 5. Summary of Technical Stack
* **Language:** JavaScript (ES6+), running entirely in the user's browser.
* **Rendering Engine:** HTML5 Canvas API (`getContext('2d')`).
* **Packaging:** Single `index.html` file containing HTML, CSS, and JS.
