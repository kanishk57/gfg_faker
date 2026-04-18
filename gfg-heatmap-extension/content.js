// selectors matching DOM of GeeksForGeeks contribution heatmap
const HEATMAP_SELECTORS = [
    'rect',
    '[class*="contribution"]',
    '[class*="heat"]',
    '[data-date]',
    'role="gridcell"'
];

const MAX_RETRIES = 10;
let retryCount = 0;
let heatmapProcessed = false;

function applyColorsToCells(cells) {
    if (!cells || cells.length === 0) return;
    
    // Check if this looks like a heatmap by ensuring there's a decent number of cells (e.g., 30+)
    if (cells.length < 30) return;

    if (CONFIG.debug) {
        console.log(`[GFG Heatmap Faker] Processing ${cells.length} cells...`);
    }

    const activity = generateActivitySequence(cells.length);

    cells.forEach((cell, index) => {
        const intensity = activity[index] || 0;
        const color = COLORS[intensity];

        // Apply styles appropriately depending on the element type
        if (cell.tagName.toLowerCase() === 'rect') {
            cell.style.fill = color;
        } else {
            cell.style.backgroundColor = color;
        }

        // Some cells might use CSS attributes instead of styles, apply fallback dataset overrides
        cell.setAttribute('data-level', intensity);
        cell.setAttribute('data-faked', 'true');
    });

    heatmapProcessed = true;
    if (CONFIG.debug) {
        console.log("[GFG Heatmap Faker] Successfully applied fake contribution data.");
    }
}

function processHeatmap() {
    if (heatmapProcessed) return;

    let targetCells = [];

    // Find cells across possible selectors
    for (const selector of HEATMAP_SELECTORS) {
        // Find elements matching the selector inside a potential heatmap container
        // Targeting specific SVG or DIV containers typically housing the heatmap 
        const container = document.querySelector('svg.js-calendar-graph-svg, .heatmap-container, [id*="heatmap"], .js-calendar-graph');
        
        let elements = null;
        if (container) {
            elements = container.querySelectorAll(selector);
        } else {
            // Unscoped selection if container not explicitly matchable
            elements = document.querySelectorAll(selector);
        }
        
        // Filter out non-gridcell rectangles/divs by structural heuristics
        const potentialCells = Array.from(elements || []).filter(el => {
            const width = el.getAttribute('width') || el.offsetWidth;
            const height = el.getAttribute('height') || el.offsetHeight;
            // Heatmap cells are typically small square-ish boxes
            return (width && height && width < 30 && height < 30) || el.hasAttribute('data-date');
        });

        if (potentialCells.length >= 30) {
            targetCells = potentialCells;
            break;
        }
    }

    if (targetCells.length > 0) {
        applyColorsToCells(targetCells);
        return true;
    } else {
        return false;
    }
}

// Ensure the code reacts continuously to single-page application navigation
function startObserver() {
    const observer = new MutationObserver(() => {
        if (!heatmapProcessed) {
            processHeatmap();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Initial start logic with retries delayed
function init() {
    // Retry interval just in case DOM load is very slow, without maxing out performance.
    const interval = setInterval(() => {
        if (processHeatmap() || retryCount >= MAX_RETRIES) {
            clearInterval(interval);
            
            // Once initial load logic is dealt with, we fallback to DOM observer for single page nav
            if (!heatmapProcessed) {
                startObserver();
            }
        }
        retryCount++;
    }, 500);
}

// Fire init when window loads and DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
