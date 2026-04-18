# Local Contribution Heatmap Visualizer for GeeksforGeeks

This Chrome Extension visually modifies the GeeksforGeeks profile contribution heatmap to display realistic daily activity (green boxes) locally on your machine. **No server-side data is altered.** It is purely a UI demonstration that runs client-side.

## Features

- **Realistic Distribution:** Generates natural-looking contribution patterns using weighted randomness.
- **Streak Simulation:** Includes logic to cluster active days together naturally.
- **Deterministic Seed:** By default, generates the same reproducible heatmap pattern for consistency.
- **Zero Network Impact:** Runs completely locally without sending any data.
- **Dynamic Adaptability:** Works via robust DOM detection algorithms compatible with both `div` and `svg`-based heatmap implementations.

## Installation Steps

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in your address bar.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the upper left.
5. Select the `gfg-heatmap-extension` directory containing this extension's files (`manifest.json`, `content.js`, etc.).
6. Visit your GeeksforGeeks profile (e.g., `https://auth.geeksforgeeks.org/user/yourusername/`).
7. Watch your heatmap realistically fill up with green squares!

## Configuration

You can easily adjust the algorithmic behavior of the simulator by editing the `CONFIG` object at the top of `utils.js`.

```javascript
const CONFIG = {
    activityProbability: 0.7, // Overall chance a day will be active
    maxIntensity: 4,          // Number of color levels (0-4)
    streakBias: 0.15,         // The boost in probability if the prior day was active
    debug: false,             // Enable for console logs
    seed: "kanishk-demo"      // Remove or change to randomize entirely instead of using a deterministic layout
};
```

## Performance & Safety

- **Execution Time:** < 200ms
- **Privacy:** 100% Client-side. No HTTP calls are made by this extension.
- **Scope:** Modifies only the visual styling of contribution grid cells. It does not alter your actual problem-solving count, badges, or username text.
