# 🔥 100-Hour Fasting Tracker

A real-time fasting timeline that tracks your metabolic state from glucose burning → fat adaptation → ketosis → autophagy → stem cell regeneration across a 100-hour fast.

![Fasting Tracker](https://img.shields.io/badge/fast-100%20hours-8B5CF6?style=for-the-badge)

## Features

- **📊 Metabolic Chart** — Live area chart showing glucose/fat/autophagy curves with your current position
- **📋 3-Hour Updates** — Detailed timeline with metabolic events every 3 hours
- **🔶 Hunger Tracking** — Log hunger waves with start/end times, see them as arrows on the chart
- **📝 Notes** — Add timestamped notes (mood, energy, symptoms, electrolytes)
- **⏱ Adjustable Start Time** — Set your fast start to any time in the past with quick presets
- **⏹ Stop / ▶ Resume / ↻ Reset** — Full control over your fast
- **📋 Export Log** — Copy a formatted report to clipboard with milestones, hunger analysis, notes, and metabolic snapshot
- **💾 Persistent Storage** — All data saved to localStorage, survives page refreshes and browser restarts

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/fasting-tracker.git
cd fasting-tracker

# Install dependencies
npm install

# Run locally
npm run dev
```

Open `http://localhost:5173/fasting-tracker/` in your browser.

## Deploy to GitHub Pages (Free Hosting)

### One-time setup:

1. Push this repo to GitHub
2. Update `vite.config.js` — change `base` to match your repo name:
   ```js
   base: '/your-repo-name/'
   ```
3. Deploy:
   ```bash
   npm run deploy
   ```
4. Go to your repo → **Settings** → **Pages** → set source to `gh-pages` branch
5. Your app is live at `https://YOUR_USERNAME.github.io/fasting-tracker/`

### Bookmark on mobile:

- **iOS**: Open the URL in Safari → Share → "Add to Home Screen"
- **Android**: Open in Chrome → Menu → "Add to Home Screen"

This gives you a full-screen app-like experience.

## Tech Stack

- React 18
- Recharts (charts)
- Vite (build tool)
- Vanilla CSS (no framework needed)

## Project Structure

```
fasting-tracker/
├── index.html          # Entry point with dark theme + PWA meta tags
├── package.json        # Dependencies and scripts
├── vite.config.js      # Build config with GitHub Pages base path
└── src/
    ├── main.jsx        # React mount point
    └── App.jsx         # Complete app (single component, ~600 lines)
```

## License

MIT — use it however you want.
