// Responsive GSAP Carousel (arrows in-flow; row flexes between)
// Fixes: exact centering with flex gap, right arrow z-index, and
//        fullscreen opens the correct image and never appears empty.

let carousel, imagesRow, prevBtn, nextBtn, playPauseBtn, fullscreenOverlay, fullscreenImg;

// State
let current = 0;
let trackIndex = 0;
let timer = null;
let isAnimating = false;
let isPlaying = true;

// Config / bounds
const DEFAULT_VISIBLE = 5;         // preferred thumbnails across
const MIN_THUMB_W = 64;
const MAX_THUMB_W = 320;
const THUMB_ASPECT = 120 / 150;    // 5:4 (height/width)
const AUTO_PLAY_MS = 3000;
const CENTER_SCALE = 1.25;
const SIDE_OPACITY = 0.75;

// Derived layout (updated on resize)
let visibleCount = DEFAULT_VISIBLE;
let centerSlot = Math.floor(visibleCount / 2);
let IMG_W = 250;
let IMG_H = 250;
let GAP = 20;                      // flex gap between items
let STEP = IMG_W + GAP;            // one item advance

// Data
let imagesMeta = [];               // [{ thumb, full }]
let extendedMeta = [];
let EXT = 0, MID_START = 0;

// ---------- utils ----------
function absURL(u) {
  try { return new URL(u, document.baseURI).href; }
  catch { return u; }
}

// ---------- position helpers ----------
function xFor(indexInTrack) {
  // with true flex gap (no per-image margins), this centers exactly
  return -((indexInTrack - centerSlot) * STEP);
}

function clampLoopIndex() {
  if (trackIndex < imagesMeta.length) {
    trackIndex += imagesMeta.length;
    gsap.set(imagesRow, { x: xFor(trackIndex) });
  } else if (trackIndex >= imagesMeta.length * 2) {
    trackIndex -= imagesMeta.length;
    gsap.set(imagesRow, { x: xFor(trackIndex) });
  }
}

// ---------- responsive sizing ----------
function recomputeSizes() {
  if (!carousel || !imagesRow) return;

  // Width available to the ROW (between arrows)
  const rowStyles = getComputedStyle(imagesRow);
  const rowW = Math.max(
    0,
    imagesRow.clientWidth
    - (parseFloat(rowStyles.paddingLeft) || 0)
    - (parseFloat(rowStyles.paddingRight) || 0)
  );

  // Height available from the carousel (for vertical clamping)
  const cs = getComputedStyle(carousel);
  const carH = Math.max(
    0,
    carousel.clientHeight
    - (parseFloat(cs.paddingTop) || 0)
    - (parseFloat(cs.paddingBottom) || 0)
  );

  // Gap scales with width; clamp to [8..32]
  GAP = Math.max(8, Math.min(32, Math.round(rowW * 0.02)));

  // Try to keep DEFAULT_VISIBLE; if too small, reduce count
  let bestW = 0, bestCount = DEFAULT_VISIBLE;
  for (let count = DEFAULT_VISIBLE; count >= 1; count--) {
    // Width model with gap: n*IMG_W + (n-1)*GAP <= rowW
    const wFromW = Math.floor((rowW - (count - 1) * GAP) / count);
    if (wFromW <= 0) continue;

    let thumbW = wFromW;
    if (carH > 0) {
      const maxThumbH = Math.max(48, carH - 72);
      const maxByH = Math.floor(maxThumbH / THUMB_ASPECT);
      thumbW = Math.min(thumbW, maxByH);
    }

    if (thumbW >= MIN_THUMB_W) {
      bestW = Math.min(thumbW, MAX_THUMB_W);
      bestCount = count;
      break;
    }
  }
  if (!bestW) { bestCount = 1; bestW = MIN_THUMB_W; }

  visibleCount = bestCount;
  centerSlot = Math.floor(visibleCount / 2);
  IMG_W = bestW;
  IMG_H = Math.round(IMG_W * THUMB_ASPECT);
  STEP = IMG_W + GAP;

  // Push CSS vars (scoped to this carousel)
  carousel.style.setProperty("--thumb-w", IMG_W + "px");
  carousel.style.setProperty("--thumb-h", IMG_H + "px");
  carousel.style.setProperty("--gap", GAP + "px");

  // Update already-rendered items (no margins; spacing from row gap)
  imagesRow.querySelectorAll(".carousel-img").forEach(img => {
    img.width = IMG_W;
    img.height = IMG_H;
  });

  // Keep current centered on resize
  gsap.set(imagesRow, { x: xFor(trackIndex) });
  updateHighlight();
}

// ---------- animation & highlight ----------
function centerByIndex(newTrackIndex, animate = true) {
  if (isAnimating) return;
  isAnimating = true;

  gsap.to(imagesRow, {
    x: xFor(newTrackIndex),
    duration: animate ? 0.6 : 0,
    ease: "power2.inOut",
    onUpdate: updateHighlight,  // safe now (logic-based center)
    onComplete: () => {
      trackIndex = newTrackIndex;
      clampLoopIndex();
      updateHighlight();
      isAnimating = false;
    },
  });
}

// The center is the item whose data-extindex equals the current trackIndex
function updateHighlight() {
  const imgs = imagesRow.querySelectorAll(".carousel-img");
  let logicalIndex = 0;

  imgs.forEach((img) => {
    const extIndex = parseInt(img.dataset.extIndex, 10);
    const isCenter = extIndex === trackIndex;

    img.classList.toggle("is-center", isCenter);

    gsap.to(img, {
      scale: isCenter ? CENTER_SCALE : 1,
      opacity: isCenter ? 1 : SIDE_OPACITY,
      zIndex: isCenter ? 2 : 1,     // arrows (z:10) stay above
      duration: 0.25,
      overwrite: "auto",
    });

    img.style.cursor = isCenter ? "zoom-in" : "pointer";
    if (isCenter) logicalIndex = parseInt(img.dataset.idx, 10);
  });

  current = logicalIndex;
}

// ---------- fullscreen ----------
function ensureFullscreenElements() {
  fullscreenOverlay = document.getElementById("fullscreen-overlay");
  fullscreenImg = document.getElementById("fullscreen-img");
  if (!fullscreenOverlay) {
    fullscreenOverlay = document.createElement("div");
    fullscreenOverlay.id = "fullscreen-overlay";
    Object.assign(fullscreenOverlay.style, {
      position: "fixed", inset: "0", display: "none",
      alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.9)", zIndex: "2147483647", cursor: "pointer",
    });
    fullscreenImg = document.createElement("img");
    fullscreenImg.id = "fullscreen-img";
    fullscreenImg.alt = "Fullscreen view";
    fullscreenImg.style.width = "auto";
    fullscreenImg.style.height = "auto";
    fullscreenOverlay.appendChild(fullscreenImg);
    document.body.appendChild(fullscreenOverlay);
  }
}

function openFullscreen(src) {
  ensureFullscreenElements();
  if (!fullscreenImg || !fullscreenOverlay) return;

  // Resolve to absolute URL; avoid showing overlay until image is ready
  const target = absURL(src);
  fullscreenImg.onload = () => {
    fullscreenOverlay.style.display = "flex";
    fullscreenImg.onload = null;    // cleanup
  };
  fullscreenImg.onerror = () => {
    console.error("Fullscreen image failed to load:", target);
    fullscreenOverlay.style.display = "none";
    fullscreenImg.onerror = null;
  };

  fullscreenImg.removeAttribute("width");
  fullscreenImg.removeAttribute("height");
  fullscreenImg.style.width = "auto";
  fullscreenImg.style.height = "auto";

  // Set src last so onload/onerror above catch it
  fullscreenImg.src = target;

  // Lock page scroll once shown (handled in onload)
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";

  fullscreenOverlay.onclick = (e) => { if (e.target === fullscreenOverlay) closeFullscreen(); };
  document.addEventListener("keydown", handleFullscreenKeydown);
}

function closeFullscreen() {
  if (!fullscreenOverlay) return;
  fullscreenOverlay.style.display = "none";
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
  document.removeEventListener("keydown", handleFullscreenKeydown);
}
function handleFullscreenKeydown(e) { if (e.key === "Escape") closeFullscreen(); }

// ---------- render ----------
function renderImages() {
  imagesRow.innerHTML = "";

  extendedMeta = imagesMeta.concat(imagesMeta, imagesMeta);
  EXT = extendedMeta.length;
  MID_START = imagesMeta.length;

  extendedMeta.forEach((meta, i) => {
    const img = document.createElement("img");
    img.src = meta.thumb;
    img.className = "carousel-img";
    img.width = IMG_W;
    img.height = IMG_H;
    img.setAttribute("decoding", "async");
    img.setAttribute("loading", "lazy");

    // Store both logical and track indices
    img.dataset.idx = i % imagesMeta.length;  // logical index 0..N-1
    img.dataset.extIndex = i;                 // index in extended track
    img.dataset.full = meta.full || meta.thumb;

    // Click: if centered → fullscreen; otherwise center it
    img.addEventListener("click", () => {
      const extIndex = parseInt(img.dataset.extIndex, 10);
      if (extIndex === trackIndex) {
        // Use the exact node's full/attr (absolute)
        openFullscreen(absURL(img.dataset.full || img.getAttribute("src")));
      } else {
        centerByIndex(extIndex);
      }
    });

    // Dblclick: always fullscreen THIS image immediately
    img.addEventListener("dblclick", (ev) => {
      ev.stopPropagation();
      openFullscreen(absURL(img.dataset.full || img.getAttribute("src")));
    });

    imagesRow.appendChild(img);
  });

  // Compute sizes from actual row width/height and center the middle block
  trackIndex = MID_START;
  recomputeSizes();
  gsap.set(imagesRow, { x: xFor(trackIndex) });
  updateHighlight();
}

// ---------- navigation & autoplay ----------
function nextImage() { if (!isAnimating) centerByIndex(trackIndex + 1); }
function prevImage() { if (!isAnimating) centerByIndex(trackIndex - 1); }
function togglePlayPause() {
  isPlaying = !isPlaying;
  if (isPlaying) startAutoPlay(); else stopAutoPlay();
}
function startAutoPlay() { stopAutoPlay(); if (isPlaying) timer = setInterval(nextImage, AUTO_PLAY_MS); }
function stopAutoPlay() { if (timer) { clearInterval(timer); timer = null; } }

// ---------- init & observers ----------
function initEventListeners() {
  carousel = document.getElementById("gsap-carousel");
  imagesRow = document.getElementById("carousel-images-row");
  prevBtn = document.getElementById("gsap-carousel-prev");
  nextBtn = document.getElementById("gsap-carousel-next");
  playPauseBtn = document.getElementById("carousel-play-pause");
  fullscreenOverlay = document.getElementById("fullscreen-overlay");
  fullscreenImg = document.getElementById("fullscreen-img");

  if (prevBtn) prevBtn.addEventListener("click", prevImage);
  if (nextBtn) nextBtn.addEventListener("click", nextImage);
  if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlayPause);

  if (carousel) {
    carousel.addEventListener("mouseenter", stopAutoPlay);
    carousel.addEventListener("mouseleave", () => { if (isPlaying) startAutoPlay(); });
  }

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") nextImage();
    else if (e.key === "ArrowLeft") prevImage();
    else if (e.key === "Escape") closeFullscreen();
    else if (e.key === " ") { e.preventDefault(); togglePlayPause(); }
  });

  // Window resize (debounced)
  let deb;
  window.addEventListener("resize", () => {
    clearTimeout(deb);
    deb = setTimeout(recomputeSizes, 100);
  });

  // Respond to container/row width changes
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => recomputeSizes());
    ro.observe(carousel);
    ro.observe(imagesRow);
  }
}

// Build data from inline <img>
function buildImagesMetaFromInline() {
  const row = document.getElementById("carousel-images-row");
  if (!row) return [];
  return Array.from(row.querySelectorAll("img")).map(el => {
    const thumb = el.getAttribute("src");
    const full = el.getAttribute("data-full") || thumb;
    return { thumb, full };
  });
}

// Boot
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  ensureFullscreenElements();

  const inline = buildImagesMetaFromInline();
  imagesMeta = inline.length ? inline : [{ thumb: "images/01.jpg", full: "images/01.jpg" }];

  renderImages();
  startAutoPlay();
});
