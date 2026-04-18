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
    
    // Check if cells have any date-like attribute to know how to target directly
    const hasDateInfo = Array.from(cells).some(cell => 
        cell.hasAttribute('data-date') || 
        cell.hasAttribute('title') || 
        cell.hasAttribute('data-tip') || 
        (cell.textContent && cell.textContent.includes('2026'))
    );
    
    // If zero direct date info, we will target exactly the indices for April 1st to April 18th in a 365 day year
    const fallbackTargetIndices = new Set();
    if (!hasDateInfo) {
        // In 2026, April 1 is the 91st day (index 90). April 18 is 108th day (index 107).
        const targetCount = Math.floor(randomFunc() * (CONFIG.targetBoxCountMax - CONFIG.targetBoxCountMin + 1)) + CONFIG.targetBoxCountMin;
        
        let attempts = 0;
        let validIndices = [];
        for(let i = 90; i <= 107; i++) validIndices.push(i);
        
        // Randomly pick targetCount items from the validIndices
        while (fallbackTargetIndices.size < targetCount && validIndices.length > 0) {
            const randomIndex = Math.floor(randomFunc() * validIndices.length);
            fallbackTargetIndices.add(validIndices[randomIndex]);
            validIndices.splice(randomIndex, 1);
        }
    }

    cells.forEach((cell, index) => {
        let cellDateAttr = cell.getAttribute('data-date') || cell.getAttribute('title') || cell.getAttribute('data-tip') || cell.getAttribute('data-bs-original-title') || '';
        
        // Sometimes dates are embedded as text in tooltips inside the cell
        if (!cellDateAttr && cell.children.length > 0) {
            const innerText = cell.textContent.trim();
            if (innerText.match(/\d{4}-\d{2}-\d{2}/) || innerText.match(/2026/)) {
                cellDateAttr = innerText;
            }
        }
        
        let intensity = 0;

        // Strip leading zeros or different formatting to maximize match chances
        const normalizedAttr = cellDateAttr ? cellDateAttr.replace(/-0?/g, '-').replace(/\//g, '-') : '';

        // Check against our target map
        let foundDateMatch = false;
        if (cellDateAttr) {
            for (let dateKey in targetDates) {
                // dateKey is YYYY-MM-DD
                const normalizedKey = dateKey.replace(/-0?/g, '-');
                if (normalizedAttr.includes(normalizedKey)) { // use includes just in case it's "18 contributions on 2026-04-18"
                    intensity = targetDates[dateKey];
                    foundDateMatch = true;
                    break;
                }
            }
            
            // Try matching textual date formats like "April 18, 2026" or "18 Apr 2026"
            if (!foundDateMatch) {
                for (let dateKey in targetDates) {
                    const d = new Date(dateKey);
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const monthFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    if (normalizedAttr.includes(monthNames[d.getMonth()]) || normalizedAttr.includes(monthFull[d.getMonth()])) {
                        if (normalizedAttr.includes(String(d.getDate())) && normalizedAttr.includes("2026")) {
                            intensity = targetDates[dateKey];
                            foundDateMatch = true;
                            break;
                        }
                    }
                }
            }
        }

        if (!foundDateMatch && !hasDateInfo && fallbackTargetIndices.has(index)) {
             // Fallback: if we don't have dates at all, just use the chronological index exactly in April
            intensity = getIntensity(true);
        }

        if (intensity > 0) {
            const color = COLORS[intensity];

            // Apply styles appropriately depending on the element type
            if (cell.tagName.toLowerCase() === 'rect') {
                cell.setAttribute('fill', color);
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
        // Filter out parent wrappers or large background SVG rects: we only want the tiny leaf grid cells
        const leafElements = Array.from(elements).filter(el => {
            const isRect = el.tagName.toLowerCase() === 'rect';
            const rectDetails = el.getBoundingClientRect();
            // Valid boxes are typically 8px to 25px wide/tall. Reject huge container boxes or wide SVG backgrounds.
            const validSize = rectDetails.width > 5 && rectDetails.width <= 25 && rectDetails.height > 5 && rectDetails.height <= 25;
            
            return (el.children.length === 0 || isRect) && validSize;
        });

        // If it's a gridcell and there's roughly a year's worth of them, it's the heatmap
        if (leafElements.length > 50) {
            targetCells = leafElements;
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
