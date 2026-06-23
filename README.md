# ZiniPress

A browser-based zine template builder. Arrange images on a single A4 print sheet using a drag-and-drop interface, with automatic panel rotation, cover mirroring, spine and tail bands, optional solid back cover, cut guides, and PNG export.

No build step, no dependencies — just static HTML, CSS, and JavaScript.

## Features

- **4×4 print sheet** — One A4 page, 16 panels, laid out for a fold-and-cut zine
- **Drag and drop** — Drop images onto the sheet or individual panels; drag between panels
- **Auto-placement by filename** — Name files `image1.jpg`, `imageC.png`, etc. and they land in the right slot
- **Automatic rotation** — Panels on rows 1 and 3 are flipped 180° for correct print orientation
- **Cover mirroring** — `imageBC` fills both back cover panels automatically
- **Cut guides** — Scissors markers on the sheet edges; hover to highlight the cut line across three panels (one panel stays attached as the hinge)
- **Spine band** — Optional band on the back cover (flap) so the image aligns when glued to the back cover
- **Tail band** — Optional vertical credit strip on the back cover panel
- **Solid back cover** — Optional flat colour fill with text on both back cover panels instead of images
- **Tuck instruction** — Flap panel prints with "Tuck this page in"
- **Live preview** — Reading-order preview shows front cover, pages 1–12, and back cover
- **PNG export** — Download a print-ready sheet at 2480 px wide (A4 aspect ratio)

## Quick start

### Option 1: Open directly

Open `index.html` in a modern browser. Some browsers restrict file drag-and-drop when opened from `file://`; if that happens, use a local server (option 2).

### Option 2: Local server

```bash
cd zinipress
python3 -m http.server 8765
```

Then visit [http://localhost:8765](http://localhost:8765).

## Print sheet layout

The sheet is a 4×4 grid. Each cell is one panel on the physical page. Rows 1 and 3 are **upside down** on screen — that is intentional; they print correctly once folded.

```
┌─────────┬─────────┬─────────┬─────────┐
│  Flap   │ Back cv │   12    │   11    │  row 1  ↑ flipped
│  tuck   │         │         │         │
├─ ✂ ─ ─ ─┼ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ┤  cut (left; 3 panels)
│    7    │    8    │    9    │   10    │  row 2
├ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ┼ ─ ✂ ─ ─ ┤  cut (right; 3 panels)
│    6    │    5    │    4    │    3    │  row 3  ↑ flipped
├─ ✂ ─ ─ ─┼ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ┤  cut (left; 3 panels)
│  flap   │    C    │    1    │    2    │  row 4
│         │  front  │         │         │
└─────────┴─────────┴─────────┴─────────┘
```

| Panel label | File name | Role |
|-------------|-----------|------|
| **Front Cover** | `imageC` | Front cover |
| **1–12** | `image1` … `image12` | Interior pages in reading order |
| **Back cover** | `imageBC` | Back cover (mirrors to flap; tail band here when enabled) |
| **Back cover (flap)** | `imageBC` | Back cover flap (mirrors from back cover; spine band here when enabled) |
| **Flap (No image)** | — | Tuck flap — prints instruction text, no image |

### Cut guides

Scissors icons sit beside the sheet at three fold lines:

| Location | Cut direction | Panels cut | Hinge (uncut) |
|----------|---------------|------------|---------------|
| Between rows 1 and 2 | Left → right | First three columns | Right column |
| Between rows 2 and 3 | Right → left | Last three columns | Left column |
| Between rows 3 and 4 | Left → right | First three columns | Right column |

Hover a guide to turn it red and show the full dashed cut line across the sheet. Cut guides are preview-only and are not included in the exported PNG.

## Image naming

Drop a batch of files anywhere on the page, or use **Add images**. Files are placed automatically when the name matches:

| Filename examples | Panel |
|-------------------|-------|
| `imageC`, `image_c`, `image C` | Front cover |
| `image1` … `image12` | Pages 1–12 |
| `imageBC`, `image_bc`, `image BC` | Back cover (both panels) |

Rules:

- Extension is ignored (`image1.jpg`, `image1.png`, etc.)
- Spaces, underscores, and hyphens are treated the same
- `imageX` (no number) maps to the flap panel, but it is instruction-only — those files go to **Unused images**
- Unmatched filenames appear in **Unused images** for manual placement

## Privacy

ZiniPress runs entirely in your browser — no backend, sign-in, or database. Images stay in memory on your device and are **never uploaded**. Export saves a PNG locally; closing the tab, refreshing, or clicking **Clear all** ends the session. The app uses no cookies, accounts, analytics, or third-party scripts.

Full details are in the collapsible **Guide and Privacy** section on the page.

## Using the app

### Layout

- **Guide and Privacy** — Collapsible instructions and privacy notice at the top
- **Top bar** — Add images, Clear all, Download sheet
- **Left column** — Print sheet with cut guides
- **Right column** — Spine, Tail, Solid back cover, and **Unused images**
- **Below** — Reading preview in page order

### Adding images

1. **Batch drop** — Drag multiple files onto the sheet; each is placed by filename
2. **Single panel** — Drag a file onto one panel
3. **File picker** — Click **Add images**
4. **Unused images** — Drag from the unused panel onto any panel

### Moving and removing

- **Drag between panels** to swap or move images
- Click **×** on a panel to remove its image (returns to **Unused images** unless it was a mirror copy)
- **Clear all** removes every placement and unused images

### Back cover panels

The **back cover** and **back cover (flap)** always show the same image from a single `imageBC` file (unless **Solid back cover** is enabled). Drop `imageBC` anywhere in a batch and it lands on the back cover panel, then mirrors to the flap.

The back cover panel is rotated 180° on the print sheet (row 1). The flap is upright (row 4).

Removing the **source** panel clears the mirrored copy. Removing a **mirrored** copy only clears that panel; the source stays.

Legacy names `imageBF`, `imageX2`, and `imageX3` still map to the back cover panels.

### Spine (cover alignment)

When you glue the flap to the back cover, the two sides need to line up across the fold. Enable **Spine** in the options column:

| Control | Default | Description |
|---------|---------|-------------|
| **Enable spine** | off | Toggle spine on/off |
| **Tone** | `#1b1b1b` | Fill colour for the spine band |
| **Width** | 10 mm | Spine width in millimetres |

When enabled:

- A coloured band is drawn on the **right edge of the back cover (flap) only**
- The flap image is shifted **left** by the spine width (same scale as the back cover, left edge cropped)
- The back cover panel is unchanged — no spine band there
- The offset is included in the downloaded PNG

Spine width is calculated against A4 panel width (210 mm ÷ 4 = 52.5 mm per column), so 10 mm ≈ 19% of the panel.

### Tail (back cover credit strip)

Enable **Tail** to add a vertical strip on the back cover panel for credits or a colophon:

| Control | Default | Description |
|---------|---------|-------------|
| **Enable tail** | off | Toggle tail on/off |
| **Message** | `© 2026 · Your Name` | Text printed bottom-to-top on the strip |
| **Background** | `#1b1b1b` | Strip fill colour |
| **Text** | `#ffffff` | Message colour |
| **Font** | Georgia | One of eight web-safe fonts |

When enabled:

- A band is drawn on the **left edge of the back cover panel** (cover-left when the panel is read upright)
- The back cover image is inset to make room for the strip
- Included in the downloaded PNG

### Solid back cover

Enable **Solid back cover** to replace images on both back cover panels with a flat fill and optional text line:

| Control | Default | Description |
|---------|---------|-------------|
| **Enable solid back** | off | Toggle solid fill on/off |
| **Colour** | `#1b1b1b` | Background fill (matches spine/tail default) |
| **Text** | (empty) | Optional line on both back cover panels |
| **Text colour** | `#ffffff` | Text colour |
| **Position** | Middle | Top, middle, or bottom |
| **Font** | Georgia | One of eight web-safe fonts |

When enabled, both back cover panels show the solid fill instead of images. Text is nudged to align with spine/tail insets when those are also enabled. Mirroring is suspended while solid back is on.

### Reading preview

Below the sheet, pages appear in reading order: **Front cover → 1 → 2 → … → 12 → Back cover**. This is how the zine reads once assembled; it does not reflect print-sheet orientation or spine/tail offset.

### Export

Click **Download sheet** to save `zine-sheet.png`:

- **2480 × 3508 px** (A4 aspect ratio at ~300 DPI width)
- Images use **cover-fit** (aspect ratio preserved, edges cropped if needed)
- Flipped panels, tuck text, spine, tail, and solid back cover are baked in
- Panels are edge-to-edge with no grid lines or cell borders

Print at **100% scale** on A4 paper for correct panel sizes.

## Project structure

```
zinipress/
├── index.html   # App shell and controls
├── style.css    # Layout, sheet grid, cut guides, panel styling
├── app.js       # Slot map, drag-drop, mirror, spine, tail, export
└── README.md
```

All logic lives in `app.js`. Key constants at the top:

- `SLOTS` — Panel grid positions, flip flags, special roles
- `READING_ORDER` — Preview sequence
- `MIRROR_PAIR` — X2 ↔ X3 sync
- `CELL_WIDTH_MM` — Used for spine/tail width in mm
- `TAIL_FONTS` — Shared font list for tail and solid back cover

## Browser support

Works in any modern browser with:

- HTML5 drag and drop
- `URL.createObjectURL` / `File` API
- Canvas 2D for export
- CSS Grid and `:has()` for cut-guide hover

Tested with Chrome, Safari, and Firefox.

## Tips

- Use **portrait-oriented** source images when possible; landscape images are cover-fitted and may crop heavily
- Enable the spine before export if you are gluing the flap to the back cover
- Hover the cut guides to confirm which panels to cut and which hinge to leave attached
- Only `imageBC` is needed for the back cover — it mirrors to both panels. Legacy `imageBF` is accepted too.
- The flap panel cannot take an image; it always prints the tuck instruction

## License

Copyright © 2026 Jim Moore.

Released under the [MIT License](LICENSE). You may use, copy, modify, and distribute this software freely, provided the license and copyright notice are included.
