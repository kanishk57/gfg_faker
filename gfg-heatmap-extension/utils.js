// Configuration Object
const CONFIG = {
    activityProbability: 0.7, // unused with explicit date targeting 
    maxIntensity: 4,          // scale range 0-4
    streakBias: 0.15,         // unused with explicit date targeting
    debug: true,              // print console logs
    seed: null,               // randomize it so we get 8-10 random boxes
    targetBoxCountMin: 8,     // target minimum 8 active boxes
    targetBoxCountMax: 10,    // target maximum 10 active boxes
    startDate: new Date('2026-04-01'), // start date for active boxes
    endDate: new Date()       // today's date for active boxes
};

// Intensity scale colors (similar to GitHub and GFG scales)
const COLORS = [
    '#ebedf0', // 0: no activity
    '#9be9a8', // 1: low
    '#40c463', // 2: medium
    '#30a14e', // 3: high
    '#216e39'  // 4: very high
];

/**
 * Simple Linear Congruential Generator for reproducible randomness based on seed.
 * Useful for deterministic mode.
 */
function seededRandom(seed) {
    let x = 0;
    for (let i = 0; i < seed.length; i++) {
        x += seed.charCodeAt(i);
    }
    return function() {
        x = (x * 9301 + 49297) % 233280;
        return x / 233280;
    };
}
const randomFunc = CONFIG.seed ? seededRandom(CONFIG.seed) : Math.random;

/**
 * Determine daily activity with realistic weighted distribution.
 * 
 * Distribution mapping for active days:
 * 1 (low) -> 35% among active
 * 2 (medium) -> 30% among active
 * 3 (high) -> 20% among active
 * 4 (very high) -> 15% among active
 */
function getIntensity(isActive) {
    if (!isActive) return 0;
    const r = randomFunc();
    if (r < 0.35) return 1;
    if (r < 0.65) return 2;
    if (r < 0.85) return 3;
    return 4;
}

/**
 * Generate a set of targeted dates to be colored green based on the config date range and counts.
 */
function generateTargetDates() {
    let dates = [];
    let start = new Date(CONFIG.startDate);
    let end = new Date(CONFIG.endDate);

    // Collect all valid dates in range
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        // Format to YYYY-MM-DD
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
    }

    // Determine target count (e.g., between 8 and 10)
    const targetCount = Math.floor(randomFunc() * (CONFIG.targetBoxCountMax - CONFIG.targetBoxCountMin + 1)) + CONFIG.targetBoxCountMin;

    // Pick random valid dates without replacement
    let selectedDates = new Set();
    while (selectedDates.size < targetCount && dates.length > 0) {
        const randomIndex = Math.floor(randomFunc() * dates.length);
        const selectedDate = dates[randomIndex];
        selectedDates.add(selectedDate);
        dates.splice(randomIndex, 1);
    }
    
    // Assign random intensity map to those chosen dates
    const dateIntensityMap = {};
    selectedDates.forEach(date => {
        // give each active day a random intensity between 1 and 4
        dateIntensityMap[date] = getIntensity(true);
    });

    return dateIntensityMap;
}
