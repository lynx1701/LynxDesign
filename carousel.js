// GSAP Carousel (index-based, fixed-step, scale-only center)

let carousel,
  imagesRow,
  prevBtn,
  nextBtn,
  playPauseBtn,
  fullscreenOverlay,
  fullscreenImg;

// State
let current = 0; // current logical image (0..images.length-1)
let trackIndex = 0; // index in the extended track
let timer = null;
let isAnimating = false;
let isPlaying = true;

// Constants
const visibleCount = 5; // odd number for centering
const imgWidth = 150; // must match CSS .carousel-img width
const gap = 20; // total gap per step (10px margins on each side)
const STEP = imgWidth + gap; // constant step per item
const autoPlayInterval = 3000;

// Images
const images = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800",
  "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800",
  "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=800",
  "https://images.unsplash.com/photo-1540202403-312d3366ae7f?w=800",
  "https://images.unsplash.com/photo-1526336023234-3a10942ed150?w=800",
];

// Extended track (3x for looping)
let extendedImages = [];
let EXT; // extended length
let MID_START; // start of the middle block (images.length)
const CENTER_SLOT = Math.floor(visibleCount / 2);

// ---------- Helpers ----------
function xFor(indexInTrack) {
  // Position so that item at 'indexInTrack' sits at CENTER_SLOT
  return -((indexInTrack - CENTER_SLOT) * STEP);
}

function clampLoopIndex() {
  // Keep trackIndex within the middle block to avoid drifting to ends
  if (trackIndex < images.length) {
    trackIndex += images.length;
    gsap.set(imagesRow, { x: xFor(trackIndex) });
  } else if (trackIndex >= images.length * 2) {
    trackIndex -= images.length;
    gsap.set(imagesRow, { x: xFor(trackIndex) });
  }
}

function centerByIndex(newTrackIndex, animate = true) {
  if (isAnimating) return;
  isAnimating = true;

  const targetX = xFor(newTrackIndex);
  gsap.to(imagesRow, {
    x: targetX,
    duration: animate ? 0.6 : 0,
    ease: "power2.inOut",
    onComplete: () => {
      trackIndex = newTrackIndex;
      clampLoopIndex();
      updateHighlight();
      isAnimating = false;
    },
  });
}

function updateHighlight() {
  const imgs = imagesRow.querySelectorAll(".carousel-img");
  const rowRect = imagesRow.getBoundingClientRect();
  const container = imagesRow.parentElement;
  const containerRect = container.getBoundingClientRect();
  const containerCenter = containerRect.left + containerRect.width / 2;

  let best = { idx: -1, dist: Infinity };

  imgs.forEach((img, idx) => {
    const rect = img.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const d = Math.abs(center - containerCenter);
    if (d < best.dist) {
      best = { idx, dist: d };
    }
  });

  imgs.forEach((img, idx) => {
    const isCenter = idx === best.idx;
    img.classList.toggle("is-center", isCenter);
    gsap.to(img, {
      scale: isCenter ? 1.85 : 1,
      opacity: isCenter ? 1 : 0.6,
      zIndex: isCenter ? 2 : 1,
      duration: 0.25,
    });
    img.style.cursor = isCenter ? "zoom-in" : "pointer";
  });

  // Update logical 'current' using the centered element's logical index
  const centered = imgs[best.idx];
  if (centered) {
    current = parseInt(centered.dataset.idx, 10);
  }
}

function renderImages() {
  imagesRow.innerHTML = "";

  extendedImages = images.concat(images, images);
  EXT = extendedImages.length;
  MID_START = images.length;

  extendedImages.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.className = "carousel-img";
    img.style.margin = "0 " + gap / 2 + "px";
    img.dataset.idx = i % images.length; // logical index 0..images.length-1
    img.dataset.extIndex = i; // index in extended track

    img.addEventListener("click", () => {
      const extIndex = parseInt(img.dataset.extIndex, 10);
      const isCenter = img.classList.contains("is-center");
      if (isCenter) {
        openFullscreen(img.src);
      } else {
        centerByIndex(extIndex);
      }
    });

    imagesRow.appendChild(img);
  });

  // Start centered on the first image of the middle block
  trackIndex = MID_START;
  gsap.set(imagesRow, { x: xFor(trackIndex) });

  updateHighlight();
}

// ---------- Navigation ----------
function nextImage() {
  if (isAnimating) return;
  centerByIndex(trackIndex + 1);
}

function prevImage() {
  if (isAnimating) return;
  centerByIndex(trackIndex - 1);
}

// ---------- Autoplay ----------
function togglePlayPause() {
  isPlaying = !isPlaying;
  const icon = playPauseBtn.querySelector("i");
  if (isPlaying) {
    icon.className = "fas fa-pause";
    startAutoPlay();
  } else {
    icon.className = "fas fa-play";
    stopAutoPlay();
  }
}

function startAutoPlay() {
  stopAutoPlay();
  if (isPlaying) {
    timer = setInterval(nextImage, autoPlayInterval);
  }
}

function stopAutoPlay() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// ---------- Fullscreen ----------
function openFullscreen(src) {
  if (!fullscreenImg || !fullscreenOverlay) return;
  fullscreenImg.src = src;
  fullscreenOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";

  fullscreenOverlay.onclick = (e) => {
    if (e.target === fullscreenOverlay) closeFullscreen();
  };
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

function handleFullscreenKeydown(e) {
  if (e.key === "Escape") closeFullscreen();
}

// ---------- Init ----------
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
    carousel.addEventListener("mouseleave", () => {
      if (isPlaying) startAutoPlay();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") nextImage();
    else if (e.key === "ArrowLeft") prevImage();
    else if (e.key === "Escape") closeFullscreen();
    else if (e.key === " ") {
      e.preventDefault();
      togglePlayPause();
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // keep centered item centered after resize
      gsap.set(imagesRow, { x: xFor(trackIndex) });
      updateHighlight();
    }, 200);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  renderImages();
  startAutoPlay();
});
