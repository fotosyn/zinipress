const SLOTS = [
  { id: "X1", row: 0, col: 0, flipped: true, instruction: "Tuck this page in" },
  { id: "X2", row: 0, col: 1, flipped: true },
  { id: "12", row: 0, col: 2, flipped: true },
  { id: "11", row: 0, col: 3, flipped: true },
  { id: "7", row: 1, col: 0, flipped: false },
  { id: "8", row: 1, col: 1, flipped: false },
  { id: "9", row: 1, col: 2, flipped: false },
  { id: "10", row: 1, col: 3, flipped: false },
  { id: "6", row: 2, col: 0, flipped: true },
  { id: "5", row: 2, col: 1, flipped: true },
  { id: "4", row: 2, col: 2, flipped: true },
  { id: "3", row: 2, col: 3, flipped: true },
  { id: "X3", row: 3, col: 0, flipped: false, spine: true },
  { id: "C", row: 3, col: 1, flipped: false },
  { id: "1", row: 3, col: 2, flipped: false },
  { id: "2", row: 3, col: 3, flipped: false },
];

const READING_ORDER = ["C", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

// A4 portrait sheet split into 4 columns, so each panel is 210/4 mm wide.
const CELL_WIDTH_MM = 210 / 4;

const MIRROR_PAIR = { X2: "X3", X3: "X2" };

const state = {
  placements: {},
  palette: {},
  spine: {
    enabled: false,
    color: "#1b1b1b",
    widthMm: 10,
  },
};

const sheetEl = document.getElementById("sheet");
const paletteEl = document.getElementById("palette-items");
const readingPreviewEl = document.getElementById("reading-preview");
const fileInput = document.getElementById("file-input");
const clearBtn = document.getElementById("clear-btn");
const exportBtn = document.getElementById("export-btn");
const spineToggle = document.getElementById("spine-toggle");
const spineColor = document.getElementById("spine-color");
const spineWidth = document.getElementById("spine-width");

function getSlot(slotId) {
  return SLOTS.find((s) => s.id === slotId);
}

function spineFraction() {
  if (!state.spine.enabled) return 0;
  const frac = state.spine.widthMm / CELL_WIDTH_MM;
  return Math.min(Math.max(frac, 0), 0.9);
}

function normalizeName(filename) {
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase();
  const cleaned = base.replace(/[\s_-]+/g, "");

  if (cleaned === "imagec" || cleaned === "c") return "C";

  const pageMatch = cleaned.match(/^image(\d{1,2})$/);
  if (pageMatch) return String(parseInt(pageMatch[1], 10));

  const xMatch = cleaned.match(/^imagex(\d)$/);
  if (xMatch) return `X${xMatch[1]}`;

  if (cleaned === "imagex") return "X1";

  return null;
}

function createObjectUrl(file) {
  return URL.createObjectURL(file);
}

function revokeIfUnused(url) {
  const inPlacements = Object.values(state.placements).some((p) => p.url === url);
  const inPalette = Object.values(state.palette).some((p) => p.url === url);
  if (!inPlacements && !inPalette) {
    URL.revokeObjectURL(url);
  }
}

function addToPalette(slotId, file, url) {
  if (state.palette[slotId]) {
    revokeIfUnused(state.palette[slotId].url);
  }
  state.palette[slotId] = { file, url, slotId };
}

function syncMirror(sourceSlotId) {
  const targetSlotId = MIRROR_PAIR[sourceSlotId];
  if (!targetSlotId) return;
  const source = state.placements[sourceSlotId];

  if (source) {
    state.placements[targetSlotId] = {
      file: source.file,
      url: source.url,
      slotId: targetSlotId,
      mirrored: true,
    };
  } else if (state.placements[targetSlotId]?.mirrored) {
    delete state.placements[targetSlotId];
  }
}

function syncMirrorAfterChange(slotId, fromSlot) {
  if (MIRROR_PAIR[slotId]) syncMirror(slotId);
  else if (fromSlot && MIRROR_PAIR[fromSlot]) syncMirror(fromSlot);
}

function placeImage(slotId, file, url) {
  if (getSlot(slotId)?.instruction) return;

  const existing = state.placements[slotId];
  if (existing) revokeIfUnused(existing.url);

  if (state.palette[slotId]) {
    revokeIfUnused(state.palette[slotId].url);
    delete state.palette[slotId];
  }

  state.placements[slotId] = { file, url, slotId };
  if (MIRROR_PAIR[slotId]) syncMirror(slotId);
  render();
}

function removeFromSlot(slotId) {
  const item = state.placements[slotId];
  if (!item) return;

  if (item.mirrored) {
    delete state.placements[slotId];
    render();
    return;
  }

  const mirrorTarget = MIRROR_PAIR[slotId];
  if (mirrorTarget && state.placements[mirrorTarget]?.mirrored) {
    delete state.placements[mirrorTarget];
  }

  addToPalette(slotId, item.file, item.url);
  delete state.placements[slotId];
  render();
}

function clearAll() {
  Object.values(state.placements).forEach((p) => URL.revokeObjectURL(p.url));
  Object.values(state.palette).forEach((p) => URL.revokeObjectURL(p.url));
  state.placements = {};
  state.palette = {};
  render();
}

function handleFiles(files) {
  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) return;

    const slotId = normalizeName(file.name);
    const url = createObjectUrl(file);

    if (slotId && getSlot(slotId) && !getSlot(slotId).instruction) {
      placeImage(slotId, file, url);
    } else {
      addToPalette(`unmatched-${file.name}`, file, url);
    }
  });
  render();
}

function setupDragSource(el, slotId, source) {
  el.draggable = true;
  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("application/ziner-slot", slotId);
    e.dataTransfer.setData("application/ziner-source", source);
    e.dataTransfer.effectAllowed = "move";
  });
}

function setupSlotDrop(slotEl, slotId) {
  slotEl.addEventListener("dragover", (e) => {
    if (getSlot(slotId)?.instruction) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    slotEl.classList.add("drag-over");
  });

  slotEl.addEventListener("dragleave", () => {
    slotEl.classList.remove("drag-over");
  });

  slotEl.addEventListener("drop", (e) => {
    e.preventDefault();
    slotEl.classList.remove("drag-over");

    if (getSlot(slotId)?.instruction) return;

    const fromSlot = e.dataTransfer.getData("application/ziner-slot");
    const source = e.dataTransfer.getData("application/ziner-source");

    if (source === "palette" && state.palette[fromSlot]) {
      const item = state.palette[fromSlot];
      delete state.palette[fromSlot];
      placeImage(slotId, item.file, item.url);
      return;
    }

    if (source === "slot" && fromSlot && fromSlot !== slotId) {
      const fromItem = state.placements[fromSlot];
      const toItem = state.placements[slotId];
      if (!fromItem) return;

      if (toItem) {
        state.placements[fromSlot] = toItem;
        state.placements[slotId] = fromItem;
      } else {
        delete state.placements[fromSlot];
        state.placements[slotId] = fromItem;
      }
      syncMirrorAfterChange(slotId, fromSlot);
      render();
    }
  });
}

function applySpineToImage(img, slot) {
  const frac = spineFraction();
  if (!slot.spine || frac <= 0) return;
  // Keep X2's scale, just slide the image left by the spine width so the two
  // covers line up once they're stuck together. The right strip is freed for
  // the spine band and the left edge is cropped by the panel.
  img.style.transform = `translateX(${-frac * 100}%)`;
}

function buildSpineBand(slot) {
  const frac = spineFraction();
  if (!slot.spine || frac <= 0) return null;

  const band = document.createElement("div");
  band.className = "slot-spine";
  band.style.width = `${frac * 100}%`;
  band.style.right = "0";
  band.style.background = state.spine.color;
  return band;
}

function renderSheet() {
  sheetEl.innerHTML = "";

  SLOTS.forEach((slot) => {
    const slotEl = document.createElement("div");
    slotEl.className = "slot";
    slotEl.style.gridRow = slot.row + 1;
    slotEl.style.gridColumn = slot.col + 1;
    if (slot.flipped) slotEl.classList.add("flipped");
    if (slot.instruction) slotEl.classList.add("instruction");

    const label = document.createElement("span");
    label.className = "slot-label";
    label.textContent = slot.id === "C" ? "C (cover)" : slot.id;
    slotEl.appendChild(label);

    if (slot.instruction) {
      const text = document.createElement("span");
      text.className = "slot-instruction";
      text.textContent = slot.instruction;
      slotEl.appendChild(text);
      sheetEl.appendChild(slotEl);
      return;
    }

    const placement = state.placements[slot.id];

    if (placement) {
      const img = document.createElement("img");
      img.className = "slot-image";
      img.src = placement.url;
      img.alt = `Page ${slot.id}`;
      applySpineToImage(img, slot);
      slotEl.appendChild(img);

      const band = buildSpineBand(slot);
      if (band) slotEl.appendChild(band);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "slot-remove";
      removeBtn.title = "Remove image";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFromSlot(slot.id);
      });
      slotEl.appendChild(removeBtn);

      setupDragSource(slotEl, slot.id, "slot");
    } else {
      const band = buildSpineBand(slot);
      if (band) slotEl.appendChild(band);

      const hint = document.createElement("span");
      hint.className = "slot-empty-hint";
      hint.textContent = `image${slot.id === "C" ? "C" : slot.id}`;
      slotEl.appendChild(hint);
    }

    slotEl.addEventListener("dragover", (e) => {
      if (e.dataTransfer.types.includes("Files")) {
        e.preventDefault();
        slotEl.classList.add("drag-over");
      }
    });

    slotEl.addEventListener("drop", (e) => {
      if (e.dataTransfer.files?.length) {
        e.preventDefault();
        slotEl.classList.remove("drag-over");
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith("image/")) {
          placeImage(slot.id, file, createObjectUrl(file));
        }
      }
    });

    setupSlotDrop(slotEl, slot.id);
    sheetEl.appendChild(slotEl);
  });
}

function renderPalette() {
  paletteEl.innerHTML = "";
  const entries = Object.entries(state.palette);

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "palette-empty";
    empty.textContent = "Drop files here or use Add images.";
    paletteEl.appendChild(empty);
    return;
  }

  entries.forEach(([key, item]) => {
    const el = document.createElement("div");
    el.className = "palette-item";

    const img = document.createElement("img");
    img.src = item.url;
    img.alt = key;
    el.appendChild(img);

    const name = document.createElement("span");
    name.textContent = item.file.name;
    el.appendChild(name);

    setupDragSource(el, key, "palette");
    paletteEl.appendChild(el);
  });
}

function renderReadingPreview() {
  readingPreviewEl.innerHTML = "";

  READING_ORDER.forEach((pageId) => {
    const page = document.createElement("div");
    page.className = "preview-page";
    if (pageId === "C") page.classList.add("cover");

    const label = document.createElement("div");
    label.className = "preview-page-label";
    label.textContent = pageId === "C" ? "Cover" : `Page ${pageId}`;
    page.appendChild(label);

    const frame = document.createElement("div");
    frame.className = "preview-page-frame";

    const placement = state.placements[pageId];
    if (placement) {
      const img = document.createElement("img");
      img.src = placement.url;
      img.alt = `Preview page ${pageId}`;
      frame.appendChild(img);
    } else {
      frame.classList.add("empty");
      frame.textContent = "—";
    }

    page.appendChild(frame);
    readingPreviewEl.appendChild(page);
  });
}

function render() {
  renderSheet();
  renderPalette();
  renderReadingPreview();
}

function drawImageCover(ctx, img, dx, dy, dw, dh) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const destAspect = dw / dh;
  const srcAspect = srcW / srcH;

  let sx, sy, sw, sh;
  if (srcAspect > destAspect) {
    sh = srcH;
    sw = sh * destAspect;
    sx = (srcW - sw) / 2;
    sy = 0;
  } else {
    sw = srcW;
    sh = sw / destAspect;
    sx = 0;
    sy = (srcH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

async function exportSheet() {
  const width = 2480;
  const height = Math.round(width * 1.414);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const cellW = width / 4;
  const cellH = height / 4;
  const gap = 2;
  const frac = spineFraction();

  const loadImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  for (const slot of SLOTS) {
    const x = slot.col * cellW;
    const y = slot.row * cellH;
    const placement = state.placements[slot.id];

    const insetX = x + gap;
    const insetY = y + gap;
    const insetW = cellW - gap * 2;
    const insetH = cellH - gap * 2;

    if (slot.instruction) {
      ctx.save();
      ctx.fillStyle = "#faf8f5";
      ctx.fillRect(insetX, insetY, insetW, insetH);
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fontSize = Math.round(insetW * 0.11);
      ctx.font = `600 ${fontSize}px Georgia, "Times New Roman", serif`;
      if (slot.flipped) {
        ctx.translate(x + cellW / 2, y + cellH / 2);
        ctx.rotate(Math.PI);
        ctx.fillText(slot.instruction, 0, 0, insetW * 0.9);
      } else {
        ctx.fillText(slot.instruction, x + cellW / 2, y + cellH / 2, insetW * 0.9);
      }
      ctx.restore();
    } else if (placement) {
      try {
        const img = await loadImage(placement.url);
        ctx.save();
        ctx.beginPath();
        ctx.rect(insetX, insetY, insetW, insetH);
        ctx.clip();

        const spinePx = slot.spine ? frac * insetW : 0;

        if (slot.flipped) {
          ctx.translate(x + cellW / 2, y + cellH / 2);
          ctx.rotate(Math.PI);
          drawImageCover(ctx, img, -insetW / 2, -insetH / 2, insetW, insetH);
        } else {
          // Same full-cell scale as the mirror, slid left by the spine width.
          drawImageCover(ctx, img, insetX - spinePx, insetY, insetW, insetH);
        }

        if (spinePx > 0) {
          ctx.fillStyle = state.spine.color;
          ctx.fillRect(insetX + insetW - spinePx, insetY, spinePx, insetH);
        }

        ctx.restore();
      } catch {
        ctx.fillStyle = "#f0ebe4";
        ctx.fillRect(insetX, insetY, insetW, insetH);
      }
    } else {
      ctx.fillStyle = "#faf8f5";
      ctx.fillRect(insetX, insetY, insetW, insetH);

      if (slot.spine && frac > 0) {
        const spinePx = frac * insetW;
        ctx.fillStyle = state.spine.color;
        ctx.fillRect(insetX + insetW - spinePx, insetY, spinePx, insetH);
      }
    }

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellW, cellH);
  }

  const link = document.createElement("a");
  link.download = "zine-sheet.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
  e.target.value = "";
});

clearBtn.addEventListener("click", clearAll);
exportBtn.addEventListener("click", exportSheet);

spineToggle.addEventListener("change", (e) => {
  state.spine.enabled = e.target.checked;
  render();
});

spineColor.addEventListener("input", (e) => {
  state.spine.color = e.target.value;
  render();
});

spineWidth.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  state.spine.widthMm = Number.isFinite(val) ? val : 0;
  render();
});

document.body.addEventListener("dragover", (e) => {
  if (e.dataTransfer.types.includes("Files")) e.preventDefault();
});

document.body.addEventListener("drop", (e) => {
  if (e.dataTransfer.files?.length) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }
});

paletteEl.addEventListener("dragover", (e) => e.preventDefault());

render();
