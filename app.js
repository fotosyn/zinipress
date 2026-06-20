const SLOTS = [
  { id: "X1", row: 0, col: 0, flipped: true, instruction: "Tuck this page in" },
  { id: "X2", row: 0, col: 1, flipped: true, tail: true },
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

const TAIL_FONTS = [
  { id: "georgia", label: "Georgia", family: 'Georgia, "Times New Roman", serif' },
  { id: "palatino", label: "Palatino", family: '"Palatino Linotype", Palatino, Georgia, serif' },
  { id: "helvetica", label: "Helvetica", family: 'Helvetica, Arial, sans-serif' },
  { id: "verdana", label: "Verdana", family: "Verdana, Geneva, sans-serif" },
  { id: "trebuchet", label: "Trebuchet", family: '"Trebuchet MS", Helvetica, sans-serif' },
  { id: "courier", label: "Courier", family: '"Courier New", Courier, monospace' },
  { id: "impact", label: "Impact", family: "Impact, Haettenschweiler, Arial Narrow, sans-serif" },
  { id: "script", label: "Script", family: '"Brush Script MT", "Segoe Script", cursive' },
];

const BACK_COVER_SLOTS = new Set(["X2", "X3"]);

const state = {
  placements: {},
  spine: {
    enabled: false,
    color: "#1b1b1b",
    widthMm: 10,
  },
  tail: {
    enabled: false,
    text: "© 2026 · Your Name",
    bgColor: "#1b1b1b",
    textColor: "#ffffff",
    widthMm: 10,
    fontId: "georgia",
  },
  backCover: {
    enabled: false,
    color: "#1b1b1b",
    text: "",
    textColor: "#ffffff",
    textPosition: "middle",
    fontId: "georgia",
  },
};

const sheetEl = document.getElementById("sheet");
const readingPreviewEl = document.getElementById("reading-preview");
const fileInput = document.getElementById("file-input");
const clearBtn = document.getElementById("clear-btn");
const exportBtn = document.getElementById("export-btn");
const spineToggle = document.getElementById("spine-toggle");
const spineColor = document.getElementById("spine-color");
const spineWidth = document.getElementById("spine-width");
const tailToggle = document.getElementById("tail-toggle");
const tailText = document.getElementById("tail-text");
const tailBg = document.getElementById("tail-bg");
const tailColor = document.getElementById("tail-color");
const tailFont = document.getElementById("tail-font");
const backCoverToggle = document.getElementById("back-cover-toggle");
const backCoverColor = document.getElementById("back-cover-color");
const backCoverText = document.getElementById("back-cover-text");
const backCoverTextColor = document.getElementById("back-cover-text-color");
const backCoverPosition = document.getElementById("back-cover-position");
const backCoverFont = document.getElementById("back-cover-font");

function getFont(fontId) {
  return TAIL_FONTS.find((f) => f.id === fontId) || TAIL_FONTS[0];
}

function getTailFont() {
  return getFont(state.tail.fontId);
}

function getBackCoverFont() {
  return getFont(state.backCover.fontId);
}

function isSolidBackCoverSlot(slotId) {
  return state.backCover.enabled && BACK_COVER_SLOTS.has(slotId);
}

function populateFontSelect(selectEl, selectedId) {
  selectEl.innerHTML = "";
  TAIL_FONTS.forEach((font) => {
    const option = document.createElement("option");
    option.value = font.id;
    option.textContent = font.label;
    option.style.fontFamily = font.family;
    selectEl.appendChild(option);
  });
  selectEl.value = selectedId;
}

function setTailControlsEnabled(enabled) {
  tailText.disabled = !enabled;
  tailFont.disabled = !enabled;
}

function setBackCoverControlsEnabled(enabled) {
  backCoverText.disabled = !enabled;
  backCoverPosition.disabled = !enabled;
  backCoverFont.disabled = !enabled;
}

function getSlot(slotId) {
  return SLOTS.find((s) => s.id === slotId);
}

function spineFraction() {
  if (!state.spine.enabled) return 0;
  const frac = state.spine.widthMm / CELL_WIDTH_MM;
  return Math.min(Math.max(frac, 0), 0.9);
}

function tailFraction() {
  if (!state.tail.enabled) return 0;
  const frac = state.tail.widthMm / CELL_WIDTH_MM;
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
  if (!inPlacements) {
    URL.revokeObjectURL(url);
  }
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

  revokeIfUnused(item.url);
  delete state.placements[slotId];
  render();
}

function clearAll() {
  Object.values(state.placements).forEach((p) => URL.revokeObjectURL(p.url));
  state.placements = {};
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
      URL.revokeObjectURL(url);
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
  img.style.transform = `translateX(${-frac * 100}%)`;
}

function applyTailToImage(img, slot) {
  const frac = tailFraction();
  if (!slot.tail || frac <= 0) return;
  // X2 is flipped 180° on the sheet; reserve the right side in grid coords so
  // the tail prints on the cover's left edge when the panel is read upright.
  if (slot.flipped) {
    img.style.right = `${frac * 100}%`;
    img.style.left = "0";
  } else {
    img.style.left = `${frac * 100}%`;
    img.style.right = "0";
  }
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

function buildTailBand(slot) {
  const frac = tailFraction();
  if (!slot.tail || frac <= 0) return null;

  const band = document.createElement("div");
  band.className = "slot-tail";
  band.style.width = `${frac * 100}%`;
  if (slot.flipped) {
    band.style.right = "0";
  } else {
    band.style.left = "0";
  }
  band.style.background = state.tail.bgColor;

  const text = document.createElement("span");
  text.className = "slot-tail-text";
  text.textContent = state.tail.text;
  text.style.color = state.tail.textColor;
  text.style.fontFamily = getTailFont().family;
  band.appendChild(text);

  return band;
}

function buildSolidBackCover(slotEl, slot) {
  const fill = document.createElement("div");
  fill.className = "slot-back-fill";
  fill.style.background = state.backCover.color;
  slotEl.appendChild(fill);

  const message = state.backCover.text.trim();
  if (message) {
    const text = document.createElement("div");
    text.className = `slot-back-text slot-back-text--${state.backCover.textPosition}`;
    text.textContent = message;
    text.style.color = state.backCover.textColor;
    text.style.fontFamily = getBackCoverFont().family;
    applyCoverContentInset(text, slot);
    slotEl.appendChild(text);
  }
}

function appendCoverBands(slotEl, slot) {
  const band = buildSpineBand(slot);
  if (band) slotEl.appendChild(band);

  const tailBand = buildTailBand(slot);
  if (tailBand) slotEl.appendChild(tailBand);
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
    const solidBack = isSolidBackCoverSlot(slot.id);

    if (solidBack) {
      buildSolidBackCover(slotEl, slot);
      appendCoverBands(slotEl, slot);
    } else if (placement) {
      const img = document.createElement("img");
      img.className = "slot-image";
      img.src = placement.url;
      img.alt = `Page ${slot.id}`;
      applySpineToImage(img, slot);
      applyTailToImage(img, slot);
      slotEl.appendChild(img);

      appendCoverBands(slotEl, slot);

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
      appendCoverBands(slotEl, slot);

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

function tailBandX(insetX, insetW, tailPx, flipped) {
  return flipped ? insetX + insetW - tailPx : insetX;
}

/** Visible content area after spine (X3) / tail (X2) strips — matches image nudge. */
function getCoverContentRect(slot, insetX, insetY, insetW, insetH, spineFrac, tailFrac) {
  let w = insetW;

  if (slot.spine && spineFrac > 0) {
    w -= spineFrac * insetW;
  }

  if (slot.tail && tailFrac > 0 && slot.flipped) {
    w -= tailFrac * insetW;
  }

  return { x: insetX, y: insetY, w, h: insetH };
}

function applyCoverContentInset(el, slot) {
  const spineFrac = spineFraction();
  const tailFrac = tailFraction();
  let rightPct = 0;

  if (slot.spine && spineFrac > 0) {
    rightPct += spineFrac * 100;
  }

  if (slot.tail && tailFrac > 0 && slot.flipped) {
    rightPct += tailFrac * 100;
  }

  if (rightPct > 0) {
    el.style.left = "0";
    el.style.right = `${rightPct}%`;
  }
}

function drawTailBand(ctx, x, y, w, h, flipped) {
  ctx.save();
  ctx.fillStyle = state.tail.bgColor;
  ctx.fillRect(x, y, w, h);

  const message = state.tail.text.trim();
  if (message) {
    ctx.fillStyle = state.tail.textColor;
    const fontSize = Math.max(12, Math.round(w * 0.42));
    ctx.font = `600 ${fontSize}px ${getTailFont().family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(x + w / 2, y + h / 2);
    if (flipped) ctx.rotate(Math.PI);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(message, 0, 0, h * 0.92);
  }

  ctx.restore();
}

function drawBackCoverText(ctx, content, flipped) {
  const message = state.backCover.text.trim();
  if (!message) return;

  const { x, y, w, h } = content;
  const position = state.backCover.textPosition;
  const fontSize = Math.round(w * 0.09);
  const centerX = x + w / 2;
  let textY;
  let baseline;

  if (position === "top") {
    textY = y + h * 0.12;
    baseline = "top";
  } else if (position === "bottom") {
    textY = y + h * 0.88;
    baseline = "bottom";
  } else {
    textY = y + h / 2;
    baseline = "middle";
  }

  ctx.save();
  ctx.fillStyle = state.backCover.textColor;
  ctx.font = `600 ${fontSize}px ${getBackCoverFont().family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = baseline;

  if (flipped) {
    ctx.translate(centerX, textY);
    ctx.rotate(Math.PI);
    ctx.fillText(message, 0, 0, w * 0.88);
  } else {
    ctx.fillText(message, centerX, textY, w * 0.88);
  }

  ctx.restore();
}

function drawSolidBackCover(ctx, slot, insetX, insetY, insetW, insetH, spineFrac, tailFrac) {
  ctx.fillStyle = state.backCover.color;
  ctx.fillRect(insetX, insetY, insetW, insetH);

  const spinePx = slot.spine ? spineFrac * insetW : 0;
  if (spinePx > 0) {
    ctx.fillStyle = state.spine.color;
    ctx.fillRect(insetX + insetW - spinePx, insetY, spinePx, insetH);
  }

  const tailPx = slot.tail ? tailFrac * insetW : 0;
  if (tailPx > 0) {
    drawTailBand(ctx, tailBandX(insetX, insetW, tailPx, slot.flipped), insetY, tailPx, insetH, slot.flipped);
  }

  const content = getCoverContentRect(slot, insetX, insetY, insetW, insetH, spineFrac, tailFrac);
  drawBackCoverText(ctx, content, slot.flipped);
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
  const spineFrac = spineFraction();
  const tailFrac = tailFraction();

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
    } else if (isSolidBackCoverSlot(slot.id)) {
      drawSolidBackCover(ctx, slot, insetX, insetY, insetW, insetH, spineFrac, tailFrac);
    } else if (placement) {
      try {
        const img = await loadImage(placement.url);
        ctx.save();
        ctx.beginPath();
        ctx.rect(insetX, insetY, insetW, insetH);
        ctx.clip();

        const spinePx = slot.spine ? spineFrac * insetW : 0;
        const tailPx = slot.tail ? tailFrac * insetW : 0;

        if (slot.flipped) {
          ctx.translate(x + cellW / 2, y + cellH / 2);
          ctx.rotate(Math.PI);
          drawImageCover(ctx, img, -insetW / 2, -insetH / 2, insetW - tailPx, insetH);
        } else {
          drawImageCover(ctx, img, insetX - spinePx, insetY, insetW, insetH);
        }

        if (spinePx > 0) {
          ctx.fillStyle = state.spine.color;
          ctx.fillRect(insetX + insetW - spinePx, insetY, spinePx, insetH);
        }

        ctx.restore();

        if (tailPx > 0) {
          drawTailBand(ctx, tailBandX(insetX, insetW, tailPx, slot.flipped), insetY, tailPx, insetH, slot.flipped);
        }
      } catch {
        ctx.fillStyle = "#f0ebe4";
        ctx.fillRect(insetX, insetY, insetW, insetH);
      }
    } else {
      ctx.fillStyle = "#faf8f5";
      ctx.fillRect(insetX, insetY, insetW, insetH);

      if (slot.spine && spineFrac > 0) {
        const spinePx = spineFrac * insetW;
        ctx.fillStyle = state.spine.color;
        ctx.fillRect(insetX + insetW - spinePx, insetY, spinePx, insetH);
      }

      if (slot.tail && tailFrac > 0) {
        const tailPx = tailFrac * insetW;
        drawTailBand(ctx, tailBandX(insetX, insetW, tailPx, slot.flipped), insetY, tailPx, insetH, slot.flipped);
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

tailToggle.addEventListener("change", (e) => {
  state.tail.enabled = e.target.checked;
  setTailControlsEnabled(e.target.checked);
  render();
});

tailText.addEventListener("input", (e) => {
  state.tail.text = e.target.value;
  render();
});

tailBg.addEventListener("input", (e) => {
  state.tail.bgColor = e.target.value;
  render();
});

tailColor.addEventListener("input", (e) => {
  state.tail.textColor = e.target.value;
  render();
});

tailFont.addEventListener("change", (e) => {
  state.tail.fontId = e.target.value;
  render();
});

backCoverToggle.addEventListener("change", (e) => {
  state.backCover.enabled = e.target.checked;
  setBackCoverControlsEnabled(e.target.checked);
  render();
});

backCoverColor.addEventListener("input", (e) => {
  state.backCover.color = e.target.value;
  render();
});

backCoverText.addEventListener("input", (e) => {
  state.backCover.text = e.target.value;
  render();
});

backCoverTextColor.addEventListener("input", (e) => {
  state.backCover.textColor = e.target.value;
  render();
});

backCoverPosition.addEventListener("change", (e) => {
  state.backCover.textPosition = e.target.value;
  render();
});

backCoverFont.addEventListener("change", (e) => {
  state.backCover.fontId = e.target.value;
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

populateFontSelect(tailFont, state.tail.fontId);
setTailControlsEnabled(false);
populateFontSelect(backCoverFont, state.backCover.fontId);
setBackCoverControlsEnabled(false);
render();
