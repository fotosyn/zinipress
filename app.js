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
  unused: [],
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
const unusedItemsEl = document.getElementById("unused-items");
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

function getSlotDisplayLabel(slot) {
  if (slot.instruction) return "Flap (No image)";
  if (slot.id === "C") return "Front Cover";
  if (slot.id === "X2") return "Back cover";
  if (slot.id === "X3") return "Back cover (flap)";
  return slot.id;
}

function getSlotImageHint(slotId) {
  if (slotId === "C") return "imageC";
  if (slotId === "X2" || slotId === "X3") return "imageBC";
  return `image${slotId}`;
}

function normalizeName(filename) {
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase();
  const cleaned = base.replace(/[\s_-]+/g, "");

  if (cleaned === "imagec" || cleaned === "c") return "C";

  if (cleaned === "imagebc" || cleaned === "bc") return "X2";
  if (cleaned === "imagebf" || cleaned === "bf") return "X2";

  const pageMatch = cleaned.match(/^image(\d{1,2})$/);
  if (pageMatch) return String(parseInt(pageMatch[1], 10));

  const xMatch = cleaned.match(/^imagex(\d)$/);
  if (xMatch) return `X${xMatch[1]}`;

  if (cleaned === "imagex") return "X1";

  return null;
}

function generateId() {
  return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function createObjectUrl(file) {
  return URL.createObjectURL(file);
}

function revokeIfUnused(url) {
  const inPlacements = Object.values(state.placements).some((p) => p.url === url);
  const inUnused = state.unused.some((u) => u.url === url);
  if (!inPlacements && !inUnused) {
    URL.revokeObjectURL(url);
  }
}

function addToUnused(file, url = createObjectUrl(file)) {
  state.unused.push({ id: generateId(), file, url, filename: file.name });
}

function removeFromUnused(id) {
  const idx = state.unused.findIndex((u) => u.id === id);
  if (idx === -1) return;
  const item = state.unused[idx];
  state.unused.splice(idx, 1);
  URL.revokeObjectURL(item.url);
  render();
}

function displaceFromSlot(slotId) {
  const existing = state.placements[slotId];
  if (!existing) return;

  if (existing.mirrored) {
    delete state.placements[slotId];
    return;
  }

  const mirrorTarget = MIRROR_PAIR[slotId];
  if (mirrorTarget && state.placements[mirrorTarget]?.mirrored) {
    delete state.placements[mirrorTarget];
  }

  state.unused.push({
    id: generateId(),
    file: existing.file,
    url: existing.url,
    filename: existing.file.name,
  });
  delete state.placements[slotId];
}

function placeFromUnused(unusedId, slotId) {
  if (getSlot(slotId)?.instruction) return;

  const idx = state.unused.findIndex((u) => u.id === unusedId);
  if (idx === -1) return;
  const item = state.unused[idx];

  displaceFromSlot(slotId);
  state.unused.splice(idx, 1);
  state.placements[slotId] = { file: item.file, url: item.url, slotId, focusX: 50, focusY: 50 };
  if (MIRROR_PAIR[slotId]) syncMirror(slotId);
  render();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCanonicalPlacement(slotId) {
  const placement = state.placements[slotId];
  if (!placement) return null;
  if (placement.mirrored) {
    const sourceId = MIRROR_PAIR[slotId];
    return state.placements[sourceId] || placement;
  }
  return placement;
}

function getFocusForSlot(slotId) {
  const canonical = getCanonicalPlacement(slotId);
  if (!canonical) return { x: 50, y: 50 };

  // Back cover pair shares one crop; X2’s 180° rotation handles upside-down pan direction.
  return {
    x: canonical.focusX ?? 50,
    y: canonical.focusY ?? 50,
  };
}

function writePlacementFocus(slotId, focusX, focusY) {
  const placement = state.placements[slotId];
  if (!placement) return;

  if (BACK_COVER_SLOTS.has(slotId) || (placement.mirrored && BACK_COVER_SLOTS.has(MIRROR_PAIR[slotId]))) {
    const canonical = state.placements.X2;
    if (!canonical) return;
    canonical.focusX = clamp(focusX, 0, 100);
    canonical.focusY = clamp(focusY, 0, 100);
    return;
  }

  let canonical = placement;
  if (placement.mirrored) {
    const canonicalSlotId = MIRROR_PAIR[slotId];
    canonical = state.placements[canonicalSlotId];
    if (!canonical) return;
  }

  canonical.focusX = clamp(focusX, 0, 100);
  canonical.focusY = clamp(focusY, 0, 100);
}

function pointerDeltaToFocusDelta(slot, deltaX, deltaY) {
  // Back cover is upside-down on the sheet — invert drag so finger tracks on screen.
  if (slot.id === "X2") {
    return { deltaX: -deltaX, deltaY: -deltaY };
  }
  if (slot.flipped) {
    return { deltaX: -deltaX, deltaY: -deltaY };
  }
  return { deltaX, deltaY };
}

function setFocusFromSlot(slotId, focusX, focusY) {
  writePlacementFocus(slotId, focusX, focusY);
  render();
}

function refreshSlotImageFocus(slotId) {
  const slot = getSlot(slotId);
  const slotEl = sheetEl.querySelector(`.slot[data-slot-id="${slotId}"]`);
  const img = slotEl?.querySelector(".slot-image");
  if (slot && img) applyImageStyles(img, slot);
}

function refreshPreviewFrameFocus(pageKey) {
  const frame =
    pageKey === "back"
      ? readingPreviewEl.querySelector('.preview-page-frame[data-preview-page="back"]')
      : readingPreviewEl.querySelector(`.preview-page-frame[data-slot-id="${pageKey}"]`);
  const img = frame?.querySelector("img");
  if (!img) return;

  const focusSlotId =
    pageKey === "back" ? (state.placements.X2 ? "X2" : "X3") : pageKey;
  const focus = getFocusForSlot(focusSlotId);
  img.style.objectPosition = `${focus.x}% ${focus.y}%`;
}

function refreshAllImageFocus(slotId) {
  refreshSlotImageFocus(slotId);
  const mirrorId = MIRROR_PAIR[slotId];
  if (mirrorId) refreshSlotImageFocus(mirrorId);

  if (BACK_COVER_SLOTS.has(slotId)) {
    refreshPreviewFrameFocus("back");
  } else if (READING_ORDER.includes(slotId)) {
    refreshPreviewFrameFocus(slotId);
  }
}

function applyImageTransform(img, slot) {
  const parts = [];
  const spineFrac = spineFraction();

  if (slot.spine && spineFrac > 0) {
    parts.push(`translateX(${-spineFrac * 100}%)`);
  }
  if (slot.flipped) {
    parts.push("rotate(180deg)");
  }

  img.style.transform = parts.length ? parts.join(" ") : "";
}

function applyImageStyles(img, slot) {
  const focus = getFocusForSlot(slot.id);
  img.style.objectPosition = `${focus.x}% ${focus.y}%`;
  applyImageTransform(img, slot);
  applyTailToImage(img, slot);
}

function setupImagePan(img, slot, { panSlot, focusSlotId } = {}) {
  const effectivePanSlot = panSlot || slot;
  const effectiveFocusSlotId = focusSlotId || slot.id;

  img.draggable = false;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startFocusX = 50;
  let startFocusY = 50;

  img.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    img.setPointerCapture(e.pointerId);
    img.classList.add("is-panning");
    const focus = getFocusForSlot(effectiveFocusSlotId);
    startFocusX = focus.x;
    startFocusY = focus.y;
    startX = e.clientX;
    startY = e.clientY;
  });

  const endPan = (e) => {
    if (!dragging) return;
    dragging = false;
    img.classList.remove("is-panning");
    if (e.pointerId !== undefined) {
      try {
        img.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }
  };

  img.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    let deltaX = ((e.clientX - startX) / rect.width) * 100;
    let deltaY = ((e.clientY - startY) / rect.height) * 100;
    ({ deltaX, deltaY } = pointerDeltaToFocusDelta(effectivePanSlot, deltaX, deltaY));

    writePlacementFocus(
      effectiveFocusSlotId,
      startFocusX - deltaX,
      startFocusY - deltaY
    );
    refreshAllImageFocus(effectiveFocusSlotId);
  });

  const finishPan = (e) => {
    if (!dragging) return;
    endPan(e);
    render();
  };

  img.addEventListener("pointerup", finishPan);
  img.addEventListener("pointercancel", finishPan);
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

  displaceFromSlot(slotId);

  state.placements[slotId] = { file, url, slotId, focusX: 50, focusY: 50 };
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

  addToUnused(item.file, item.url);
  delete state.placements[slotId];
  render();
}

function clearAll() {
  Object.values(state.placements).forEach((p) => URL.revokeObjectURL(p.url));
  state.unused.forEach((u) => URL.revokeObjectURL(u.url));
  state.placements = {};
  state.unused = [];
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
      addToUnused(file, url);
    }
  });
  render();
}

function setupUnusedDragSource(el, unusedId) {
  el.draggable = true;
  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("application/ziner-unused", unusedId);
    e.dataTransfer.setData("application/ziner-source", "unused");
    e.dataTransfer.effectAllowed = "move";
  });
}

function setupDragSource(el, slotId, source, { blockDragFrom = ".slot-image" } = {}) {
  el.draggable = true;
  el.addEventListener("dragstart", (e) => {
    if (blockDragFrom && e.target.closest(blockDragFrom)) {
      e.preventDefault();
      return;
    }
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
    const unusedId = e.dataTransfer.getData("application/ziner-unused");

    if (source === "unused" && unusedId) {
      placeFromUnused(unusedId, slotId);
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
    slotEl.dataset.slotId = slot.id;
    slotEl.style.gridRow = slot.row + 1;
    slotEl.style.gridColumn = slot.col + 1;
    if (slot.flipped) slotEl.classList.add("flipped");
    if (slot.instruction) slotEl.classList.add("instruction");

    const label = document.createElement("span");
    label.className = "slot-label";
    label.textContent = getSlotDisplayLabel(slot);
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
      applyImageStyles(img, slot);
      setupImagePan(img, slot);
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
      hint.textContent = getSlotImageHint(slot.id);
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

function renderUnused() {
  unusedItemsEl.innerHTML = "";

  if (state.unused.length === 0) {
    const empty = document.createElement("p");
    empty.className = "unused-empty";
    empty.textContent = "No unused images.";
    unusedItemsEl.appendChild(empty);
    return;
  }

  state.unused.forEach((item) => {
    const card = document.createElement("div");
    card.className = "unused-item";

    const thumb = document.createElement("div");
    thumb.className = "unused-item-thumb";

    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.filename;
    thumb.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "unused-item-meta";

    const name = document.createElement("span");
    name.className = "unused-item-name";
    name.textContent = item.filename;
    name.title = item.filename;
    meta.appendChild(name);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "unused-item-remove";
    removeBtn.title = "Remove";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFromUnused(item.id);
    });
    meta.appendChild(removeBtn);

    card.appendChild(thumb);
    card.appendChild(meta);
    setupUnusedDragSource(card, item.id);
    unusedItemsEl.appendChild(card);
  });
}

function getBackCoverPreviewContent() {
  if (isSolidBackCoverSlot("X3")) {
    return { type: "solid" };
  }

  const placement = state.placements.X3 || state.placements.X2;
  if (placement) {
    return { type: "image", placement };
  }

  return null;
}

function getPreviewPlacementSlotId(pageDef) {
  return pageDef.backCover ? "X2" : pageDef.id;
}

function getPreviewDragSlotId(pageDef) {
  if (!pageDef.backCover) return pageDef.id;
  if (state.placements.X2) return "X2";
  if (state.placements.X3 && !state.placements.X3.mirrored) return "X3";
  return "X2";
}

function canPreviewAcceptDrop(pageDef) {
  if (pageDef.backCover) {
    return !isSolidBackCoverSlot("X3");
  }
  const slot = getSlot(pageDef.id);
  return slot && !slot.instruction;
}

function getReadingPanSlot(pageDef) {
  if (pageDef.backCover) {
    return { id: "X3", flipped: false };
  }
  const slot = getSlot(pageDef.id);
  return slot ? { ...slot, flipped: false } : slot;
}

function setupPreviewDropTarget(frame, pageDef) {
  const slotId = getPreviewPlacementSlotId(pageDef);
  if (!canPreviewAcceptDrop(pageDef)) return;

  frame.dataset.slotId = pageDef.backCover ? "back" : slotId;
  if (pageDef.backCover) {
    frame.dataset.previewPage = "back";
  }

  setupSlotDrop(frame, slotId);

  frame.addEventListener("dragover", (e) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      frame.classList.add("drag-over");
    }
  });

  frame.addEventListener("dragleave", () => {
    frame.classList.remove("drag-over");
  });

  frame.addEventListener("drop", (e) => {
    if (e.dataTransfer.files?.length) {
      e.preventDefault();
      frame.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        placeImage(slotId, file, createObjectUrl(file));
      }
    }
  });
}

function appendSolidBackPreview(frame) {
  const fill = document.createElement("div");
  fill.className = "preview-back-fill";
  fill.style.background = state.backCover.color;
  frame.appendChild(fill);

  const message = state.backCover.text.trim();
  if (message) {
    const text = document.createElement("div");
    text.className = `preview-back-text preview-back-text--${state.backCover.textPosition}`;
    text.textContent = message;
    text.style.color = state.backCover.textColor;
    text.style.fontFamily = getBackCoverFont().family;
    frame.appendChild(text);
  }
}

function renderReadingPreview() {
  readingPreviewEl.innerHTML = "";

  const pages = [
    { id: "C", label: "Front Cover", cover: true },
    ...READING_ORDER.filter((id) => id !== "C").map((id) => ({ id, label: `Page ${id}` })),
    { id: "back", label: "Back cover", backCover: true },
  ];

  pages.forEach((pageDef) => {
    const page = document.createElement("div");
    page.className = "preview-page";
    if (pageDef.cover) page.classList.add("cover");
    if (pageDef.backCover) page.classList.add("back-cover");

    const label = document.createElement("div");
    label.className = "preview-page-label";
    label.textContent = pageDef.label;
    page.appendChild(label);

    const frame = document.createElement("div");
    frame.className = "preview-page-frame";

    if (pageDef.backCover) {
      const back = getBackCoverPreviewContent();
      if (back?.type === "solid") {
        appendSolidBackPreview(frame);
      } else if (back?.type === "image") {
        const img = document.createElement("img");
        img.className = "preview-image";
        img.src = back.placement.url;
        img.alt = "Back cover preview";
        const focusSlotId = state.placements.X2 ? "X2" : "X3";
        const focus = getFocusForSlot(focusSlotId);
        img.style.objectPosition = `${focus.x}% ${focus.y}%`;
        const panSlot = getReadingPanSlot(pageDef);
        setupImagePan(img, getSlot("X3"), {
          panSlot,
          focusSlotId: "X3",
        });
        frame.appendChild(img);
      } else {
        frame.classList.add("empty");
        frame.textContent = "Drop image";
      }
    } else {
      const placement = state.placements[pageDef.id];
      if (placement) {
        const img = document.createElement("img");
        img.className = "preview-image";
        img.src = placement.url;
        img.alt = `Preview page ${pageDef.id}`;
        const focus = getFocusForSlot(pageDef.id);
        img.style.objectPosition = `${focus.x}% ${focus.y}%`;
        const slot = getSlot(pageDef.id);
        setupImagePan(img, slot, {
          panSlot: getReadingPanSlot(pageDef),
          focusSlotId: pageDef.id,
        });
        frame.appendChild(img);
      } else {
        frame.classList.add("empty");
        frame.textContent = "Drop image";
      }
    }

    if (canPreviewAcceptDrop(pageDef)) {
      setupPreviewDropTarget(frame, pageDef);
      const hasPlacement = pageDef.backCover
        ? getBackCoverPreviewContent()?.type === "image"
        : Boolean(state.placements[pageDef.id]);
      if (hasPlacement) {
        setupDragSource(page, getPreviewDragSlotId(pageDef), "slot", {
          blockDragFrom: ".preview-image",
        });
      }
    }

    page.appendChild(frame);
    readingPreviewEl.appendChild(page);
  });
}

function render() {
  renderSheet();
  renderUnused();
  renderReadingPreview();
}

function drawImageCover(ctx, img, dx, dy, dw, dh, focusX = 50, focusY = 50) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const destAspect = dw / dh;
  const srcAspect = srcW / srcH;

  let sx;
  let sy;
  let sw;
  let sh;
  if (srcAspect > destAspect) {
    sh = srcH;
    sw = sh * destAspect;
    sx = (srcW - sw) * (focusX / 100);
    sy = 0;
  } else {
    sw = srcW;
    sh = sw / destAspect;
    sx = 0;
    sy = (srcH - sh) * (focusY / 100);
  }

  sx = clamp(sx, 0, Math.max(0, srcW - sw));
  sy = clamp(sy, 0, Math.max(0, srcH - sh));

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

    const insetX = x;
    const insetY = y;
    const insetW = cellW;
    const insetH = cellH;

    if (slot.instruction) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(insetX, insetY, insetW, insetH);
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fontSize = Math.round(insetW * 0.07);
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

        const focus = getFocusForSlot(slot.id);
        const spinePx = slot.spine ? spineFrac * insetW : 0;
        const tailPx = slot.tail ? tailFrac * insetW : 0;

        if (slot.flipped) {
          ctx.translate(x + cellW / 2, y + cellH / 2);
          ctx.rotate(Math.PI);
          drawImageCover(
            ctx,
            img,
            -insetW / 2 - 1,
            -insetH / 2 - 1,
            insetW - tailPx + 2,
            insetH + 2,
            focus.x,
            focus.y
          );
        } else {
          drawImageCover(
            ctx,
            img,
            insetX - spinePx - 1,
            insetY - 1,
            insetW + 2,
            insetH + 2,
            focus.x,
            focus.y
          );
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

const guidePanel = document.getElementById("guide");
const guideLink = document.getElementById("guide-link");

function openGuidePanel(scrollTarget) {
  guidePanel.open = true;
  requestAnimationFrame(() => {
    const target = scrollTarget || guidePanel;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

guideLink?.addEventListener("click", (e) => {
  e.preventDefault();
  history.pushState(null, "", "#guide");
  openGuidePanel();
});

function handleGuideHash() {
  if (location.hash !== "#guide" && location.hash !== "#privacy") return;
  const scrollTarget = location.hash === "#privacy"
    ? document.getElementById("privacy")
    : guidePanel;
  openGuidePanel(scrollTarget);
}

window.addEventListener("hashchange", handleGuideHash);
if (location.hash === "#guide" || location.hash === "#privacy") {
  handleGuideHash();
}

render();
