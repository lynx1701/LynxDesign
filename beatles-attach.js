/*!
 * ImageMapInfo – hover/focus an <area> to show matching table in a side panel
 * - Matches <area id="X"> with <table data-spot-for="X">
 * - Auto-rescales image-map coords on resize
 * - Draws a visual highlight overlay via CSS clip-path
 * No dependencies. Works in MadCap Flare topics.
 */
(function (global) {
    const ImageMapInfo = {
        mount(opts) {
            const cfg = normalizeOptions(opts);
            if (!cfg) return;

            const { img, mapEl, panel, tables, rtl } = cfg;
            const highlight = ensureHighlightOverlay(img);

            // Build mapping: spotId -> cloned table node
            const spotMap = buildSpotMap(tables);

            // Make <area> focusable (href required in some browsers)
            const areas = Array.from(mapEl.querySelectorAll('area[id]'));
            areas.forEach(a => {
                if (!a.hasAttribute('href')) a.setAttribute('href', '#');
                a.setAttribute('role', 'button');
                a.setAttribute('tabindex', '0');
                a.setAttribute('aria-controls', stripHash(panel.id));
            });

            // Responsive image-map: capture original coords, then rescale
            const coordState = captureOriginalCoords(areas);
            const rescale = () => resizeMapCoords(img, areas, coordState);
            if (img.complete) {
                rescale();
            } else {
                img.addEventListener('load', rescale, { once: true });
            }
            window.addEventListener('resize', rescale);

            // Show the first available table by default (optional)
            const firstId = areas[0]?.id;
            if (firstId && spotMap[firstId]) {
                showPanel(panel, spotMap[firstId]);
                drawHighlightForArea(img, highlight, areas[0]);
            }

            // Interactions
            const onEnter = (ev) => {
                const id = ev.currentTarget.id;
                if (!id) return;
                if (spotMap[id]) {
                    showPanel(panel, spotMap[id]);
                } else {
                    clearPanel(panel, `לא נמצאו נתונים עבור "${id}"`);
                }
                drawHighlightForArea(img, highlight, ev.currentTarget);
            };
            const onClick = (ev) => { ev.preventDefault(); onEnter(ev); };

            areas.forEach(a => {
                a.addEventListener('mouseenter', onEnter);
                a.addEventListener('focus', onEnter);
                a.addEventListener('click', onClick);
            });

            // Optional: clear when leaving the image (keeps last by default)
            img.closest('.imx-image')?.addEventListener('mouseleave', () => {
                // keep last panel; hide visual only
                highlight.hidden = true;
            });

            // RTL-specific panel placement (CSS handles most)
            if (rtl) {
                const root = panel.closest('.imx');
                if (root) root.style.direction = 'rtl';
            }
        }
    };

    /*** helpers ***/

    function normalizeOptions(opts) {
        const getEl = (sel) => {
            if (!sel) return null;
            return typeof sel === 'string' ? document.querySelector(sel) : sel;
        };
        const img = getEl(opts.image);
        const mapEl = getEl(opts.map) || (img && getMapFromImage(img));
        const panel = getEl(opts.panel);
        const tables = Array.from(document.querySelectorAll(opts.tables || 'table[data-spot-for]'));
        if (!img || !mapEl || !panel) {
            console.warn('[ImageMapInfo] Missing image, map, or panel.');
            return null;
        }
        return { img, mapEl, panel, tables, rtl: !!opts.rtl };
    }

    function getMapFromImage(img) {
        const usemap = img.getAttribute('usemap');
        if (!usemap) return null;
        const name = stripHash(usemap);
        return document.querySelector(`map[name="${cssEscape(name)}"], map#${cssEscape(name)}`);
    }

    function ensureHighlightOverlay(img) {
        const host = img.closest('.imx-image') || img.parentElement;
        let overlay = host.querySelector('.imx-highlight');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'imx-highlight';
            overlay.hidden = true;
            host.appendChild(overlay);
        }
        return overlay;
    }

    function buildSpotMap(tables) {
        const map = {};
        tables.forEach(t => {
            const id = t.getAttribute('data-spot-for');
            if (!id) return;
            map[id] = t.cloneNode(true);   // keep your original styles/markup
            // Hide source table visually (CSS also hides it)
            t.setAttribute('hidden', 'hidden');
        });
        return map;
    }

    function showPanel(panel, node) {
        panel.innerHTML = '';
        // We clone again to avoid moving the original clone around
        panel.appendChild(node.cloneNode(true));
    }

    function clearPanel(panel, msg) {
        panel.innerHTML = msg ? `<p style="margin:0">${escapeHtml(msg)}</p>` : '';
    }

    function captureOriginalCoords(areas) {
        const state = new Map();
        areas.forEach(a => {
            const orig = a.getAttribute('data-orig-coords') || a.getAttribute('coords') || '';
            a.setAttribute('data-orig-coords', orig);
            state.set(a, parseCoords(orig));
        });
        return state;
    }

    function resizeMapCoords(img, areas, state) {
        if (!img.naturalWidth || !img.naturalHeight) return;
        const w = img.clientWidth;
        const h = img.clientHeight;
        const rx = w / img.naturalWidth;
        const ry = h / img.naturalHeight;

        areas.forEach(a => {
            const shape = (a.getAttribute('shape') || '').toLowerCase();
            const orig = state.get(a) || [];
            let scaled = orig.slice();
            if (shape === 'circle') {
                // [cx, cy, r] => scale center and radius
                if (orig.length >= 3) {
                    const cx = Math.round(orig[0] * rx);
                    const cy = Math.round(orig[1] * ry);
                    const r = Math.round(orig[2] * ((rx + ry) / 2)); // approx
                    scaled = [cx, cy, r];
                }
            } else {
                // rect or poly: scale x,y pairs
                for (let i = 0; i < scaled.length; i += 2) {
                    scaled[i] = Math.round(scaled[i] * rx);
                    scaled[i + 1] = Math.round(scaled[i + 1] * ry);
                }
            }
            a.setAttribute('coords', scaled.join(','));
        });
    }

    function drawHighlightForArea(img, overlay, area) {
        const shape = (area.getAttribute('shape') || '').toLowerCase();
        const coords = parseCoords(area.getAttribute('coords') || '');

        // Ensure overlay matches current image box
        const host = img.closest('.imx-image') || img.parentElement;
        const rect = img.getBoundingClientRect();
        overlay.style.width = img.clientWidth + 'px';
        overlay.style.height = img.clientHeight + 'px';
        overlay.style.left = (img.offsetLeft) + 'px';
        overlay.style.top = (img.offsetTop) + 'px';
        overlay.style.position = 'absolute';

        if (!coords.length) {
            overlay.hidden = true;
            overlay.style.clipPath = 'none';
            return;
        }

        if (shape === 'rect' && coords.length >= 4) {
            const [x1, y1, x2, y2] = coords;
            const path = `polygon(${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px)`;
            overlay.style.clipPath = path;
        } else if (shape === 'circle' && coords.length >= 3) {
            const [cx, cy, r] = coords;
            overlay.style.clipPath = `circle(${r}px at ${cx}px ${cy}px)`;
        } else if (shape === 'poly' && coords.length >= 6) {
            const pairs = [];
            for (let i = 0; i < coords.length; i += 2) {
                pairs.push(`${coords[i]}px ${coords[i + 1]}px`);
            }
            overlay.style.clipPath = `polygon(${pairs.join(',')})`;
        } else {
            // Fallback: don’t clip, just show a faint overlay
            overlay.style.clipPath = 'none';
        }
        overlay.hidden = false;
    }

    function parseCoords(s) {
        return s.split(',').map(n => parseFloat(n)).filter(n => !Number.isNaN(n));
    }

    function stripHash(s) { return (s || '').replace(/^#/, ''); }

    function cssEscape(s) {
        // basic escape for attribute selectors
        return String(s).replace(/"/g, '\\"');
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }

    // expose global
    global.ImageMapInfo = ImageMapInfo;
})(window);
