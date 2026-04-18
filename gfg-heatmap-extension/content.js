// selectors matching DOM of GeeksForGeeks contribution heatmap
const HEATMAP_SELECTORS = [
    'rect',
    '[class*="contribution"]',
    '[class*="heat"]',
    '[data-date]',
    '[role="gridcell"]',
    '.calendar-box', // GFG common
    '.activity-box'  // GFG common
];

const MAX_RETRIES = 10;
let retryCount = 0;
let heatmapProcessed = false;

function applyColorsToCells(cells) {
    if (!cells || cells.length === 0) return;
    
    if (cells.length < 30) return;

    // Generate specific target dates (April 1, 2026, to Today)
    const targetDates = generateTargetDates();

    if (CONFIG.debug) {
        console.log(`[GFG Heatmap Faker] Processing ${cells.length} cells. Target dates map:`, targetDates);
    }
    
    // Check if the first few cells have data-date attribute to know how to target
    const hasDataDate = Array.from(cells).some(cell => cell.hasAttribute('data-date'));
    
    // If no data-date, we will target the last ~18 boxes (since today is April 18)
    const fallbackTargetIndices = new Set();
    if (!hasDataDate) {
        const totalCells = cells.length;
        // The last 18 boxes represent roughly April 1 to April 18
        const targetCount = Math.floor(randomFunc() * (CONFIG.targetBoxCountMax - CONFIG.targetBoxCountMin + 1)) + CONFIG.targetBoxCountMin;
        
        while (fallbackTargetIndices.size < targetCount) {
            // Pick a random index in the last 18 boxes
            const randomIndex = totalCells - 1 - Math.floor(randomFunc() * 18);
            if (randomIndex >= 0) {
                fallbackTargetIndices.add(randomIndex);
            }
        }
    }

    cells.forEach((cell, index) => {
        const cellDateAttr = cell.getAttribute('data-date');
        let intensity = 0;

        // If the cell has a date and it's in our generated targets map, assign its intensity
        if (cellDateAttr && targetDates[cellDateAttr]) {
            intensity = targetDates[cellDateAttr];
        } else if (!hasDataDate && fallbackTargetIndices.has(index)) {
             // Fallback: if we don't have dates, just use the index
            intensity = getIntensity(true);
        }

        if (intensity > 0) {
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
            // Force inline style with !important to override external CSS
            cell.style.setProperty('background-color', color, 'important');
            cell.style.setProperty('fill', color, 'important');
        }
    });

    heatmapProcessed = true;
    if (CONFIG.debug) {
        console.log("[GFG Heatmap Faker] Successfully applied fake contribution targeted dates.");
    }
}

function processHeatmap() {
    if (heatmapProcessed) return;

    let targetCells = [];

    // Attempt 1: Look by exact classes or attributes if present
    for (const selector of HEATMAP_SELECTORS) {
        const elements = document.querySelectorAll(selector);
        // If it's a gridcell and there's 50+ of them, it's the heatmap
        if (elements.length > 50) {
            targetCells = Array.from(elements);
            break;
        }
    }

    // Attempt 2: Visual spatial heuristic (GFG React components might obscure classes)
    if (targetCells.length < 50) {
        const allElements = document.querySelectorAll('div, span, rect');
        const sizeMatched = [];
        for (let el of allElements) {
            const rect = el.getBoundingClientRect();
            // A heatmap cell is typically a small, square, empty block around 10-22px
            if (rect.width >= 8 && rect.width <= 25 && rect.height >= 8 && rect.height <= 25 && el.childElementCount === 0) {
                // Ignore elements that aren't generic squares (e.g. text containing elements or icons)
                const text = el.textContent.trim();
                const isSvgOrPath = el.tagName.toLowerCase() === 'svg' || el.tagName.toLowerCase() === 'path';
                if (!text && !isSvgOrPath && getComputedStyle(el).display !== 'none') {
                    sizeMatched.push(el);
                }
            }
        }
        
        if (sizeMatched.length > 100) {
            // Group by className to avoid randomly sized generic icons breaking the index
            const classCounts = {};
            sizeMatched.forEach(el => {
                // Ignore SVG internals like SVGRectElement className objects
                const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : 'no-class';
                classCounts[cls] = (classCounts[cls] || 0) + 1;
            });
            
            // Map the class appearing ~100 to 450 times (like typical 365 heatmap grid)
            let dominantClass = Object.keys(classCounts).reduce((a, b) => classCounts[a] > classCounts[b] ? a : b, '');
            
            if (classCounts[dominantClass] > 50) {
                 targetCells = sizeMatched.filter(el => {
                     const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : 'no-class';
                     return cls === dominantClass;
                 });
            } else {
                 targetCells = sizeMatched;
            }
            if (CONFIG.debug) console.log(`[GFG Heatmap Faker] Detected using visual heuristic: ${targetCells.length} cells with dom-class '${dominantClass}'`);
        }
    }

    if (targetCells.length >= 50) {
        // Ensure they are chronologically sorted if possible (document flow usually guarantees this)
        applyColorsToCells(targetCells);
        return true;
    } else {
        if (CONFIG.debug) console.log("[GFG Heatmap Faker] No heatmap grid found yet...");
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
