// Configuration Object
const CONFIG = {
    activityProbability: 0.7, // 70% chance of overall activity
    maxIntensity: 4,          // scale range 0-4
    streakBias: 0.15,         // increases daily action likelihood after consecutive days
    debug: false,             // print console logs
    seed: "kanishk-demo"      // basic deterministic seed
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
 * Generate sequence of active days using Markov-like probability logic for streaks.
 */
function generateActivitySequence(daysCount) {
    const sequence = [];
    let previousActive = false;

    for (let i = 0; i < daysCount; i++) {
        let prob = CONFIG.activityProbability;
        
        // Add streak bias
        if (previousActive) {
            prob += CONFIG.streakBias;
        }

        const willBeActive = randomFunc() < prob;
        const intensity = getIntensity(willBeActive);
        
        sequence.push(intensity);
        previousActive = willBeActive;
    }
    
    return sequence;
}
