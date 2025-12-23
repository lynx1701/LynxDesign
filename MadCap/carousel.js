/* Vanilla JS, Flare-friendly, supports multiple carousels per page */
(function () {
    var DEFAULT_VISIBLE = 4;

    // Fullscreen overlay elements (singleton)
    var overlay = null;
    var overlayImg = null;
    var closeBtn = null;
    var lastFocus = null;

    function ensureOverlay() {
        if (overlay) return;

        overlay = document.createElement("div");
        overlay.className = "flare-carousel-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");

        overlay.innerHTML =
            '<button type="button" class="flare-carousel-close" aria-label="Close fullscreen">×</button>' +
            '<img class="flare-carousel-fullimg" alt="">';

        document.body.appendChild(overlay);

        overlayImg = overlay.querySelector(".flare-carousel-fullimg");
        closeBtn = overlay.querySelector(".flare-carousel-close");

        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) closeOverlay();
        });

        closeBtn.addEventListener("click", closeOverlay);

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && overlay.classList.contains("is-open")) {
                closeOverlay();
            }
        });
    }

    function openOverlay(imgEl) {
        ensureOverlay();

        lastFocus = document.activeElement;

        var src = imgEl.currentSrc || imgEl.src;
        overlayImg.src = src;
        overlayImg.alt = imgEl.alt || "";

        overlay.classList.add("is-open");
        document.documentElement.classList.add("flare-carousel-lock");
        document.body.classList.add("flare-carousel-lock");

        closeBtn.focus();
    }

    function closeOverlay() {
        if (!overlay) return;

        overlay.classList.remove("is-open");
        overlayImg.src = "";

        document.documentElement.classList.remove("flare-carousel-lock");
        document.body.classList.remove("flare-carousel-lock");

        if (lastFocus && typeof lastFocus.focus === "function") {
            lastFocus.focus();
        }
    }

    function buildStructure(root) {
        // Already enhanced?
        if (root.__flareCarouselEnhanced) return;

        // Read visible count (minimum items shown)
        var visibleAttr = root.getAttribute("data-visible");
        var visibleCount = parseInt(visibleAttr, 10);
        if (!visibleCount || visibleCount < 1) visibleCount = DEFAULT_VISIBLE;

        // Apply CSS variable so images size correctly
        root.style.setProperty("--visible-count", String(visibleCount));

        // Collect existing images
        var imgs = [];
        for (var i = 0; i < root.children.length; i++) {
            var child = root.children[i];
            if (child && child.tagName && child.tagName.toLowerCase() === "img") {
                imgs.push(child);
            }
        }

        // Create viewport + track
        var viewport = document.createElement("div");
        viewport.className = "flare-carousel-viewport";

        var track = document.createElement("div");
        track.className = "flare-carousel-track";

        // Move images into track
        for (var j = 0; j < imgs.length; j++) {
            track.appendChild(imgs[j]);
        }

        viewport.appendChild(track);

        // Clear root and rebuild
        root.innerHTML = "";
        root.appendChild(viewport);

        // Add nav arrows (always visible)
        var prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.className = "flare-carousel-nav prev";
        prevBtn.setAttribute("aria-label", "Previous images");
        prevBtn.innerHTML = "‹";

        var nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "flare-carousel-nav next";
        nextBtn.setAttribute("aria-label", "Next images");
        nextBtn.innerHTML = "›";

        root.appendChild(prevBtn);
        root.appendChild(nextBtn);

        // State
        var state = {
            index: 0,
            visibleCount: visibleCount,
            track: track,
            viewport: viewport,
            images: imgs
        };

        // Click image => fullscreen
        track.addEventListener("click", function (e) {
            var t = e.target;
            if (t && t.tagName && t.tagName.toLowerCase() === "img") {
                openOverlay(t);
            }
        });

        function getGapPx() {
            var cs = window.getComputedStyle(track);
            // flex gap may be reported as "gap" or "column-gap"
            var g = cs.gap || cs.columnGap || "0px";
            var n = parseFloat(g);
            return isNaN(n) ? 0 : n;
        }

        function getStepPx() {
            // Measure first image width (after layout)
            if (!state.images.length) return 0;
            var rect = state.images[0].getBoundingClientRect();
            var gap = getGapPx();
            return rect.width + gap;
        }

        function getMaxIndex() {
            var total = state.images.length;
            var max = total - state.visibleCount;
            return max > 0 ? max : 0;
        }

        function clampIndex() {
            var max = getMaxIndex();
            if (state.index < 0) state.index = 0;
            if (state.index > max) state.index = max;
        }

        function applyTransform() {
            clampIndex();
            var step = getStepPx();
            var tx = -state.index * step;
            state.track.style.transform = "translateX(" + tx + "px)";
        }

        function move(delta) {
            var max = getMaxIndex();

            if (delta < 0) {
                if (state.index === 0) return; // at start: do nothing (arrows stay active)
                state.index = state.index - 1;
            } else {
                if (state.index === max) return; // at end: do nothing (arrows stay active)
                state.index = state.index + 1;
            }

            applyTransform();
        }

        prevBtn.addEventListener("click", function () { move(-1); });
        nextBtn.addEventListener("click", function () { move(1); });

        // Re-measure on resize / after images load
        function refreshSoon() {
            // Wait a tick so layout settles
            setTimeout(applyTransform, 0);
        }

        // If images not loaded yet, wait for them
        var pending = 0;
        for (var k = 0; k < state.images.length; k++) {
            if (!state.images[k].complete) {
                pending++;
                state.images[k].addEventListener("load", function () {
                    refreshSoon();
                });
            }
        }

        window.addEventListener("resize", refreshSoon);

        // Initial
        refreshSoon();

        root.__flareCarouselEnhanced = true;
    }

    function initAll() {
        var carousels = document.querySelectorAll(".flare-carousel[data-carousel]");
        for (var i = 0; i < carousels.length; i++) {
            buildStructure(carousels[i]);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAll);
    } else {
        initAll();
    }
})();
