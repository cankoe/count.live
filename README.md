# count.live

A minimal, privacy-focused countdown timer that runs entirely in your browser.

**Live site:** [count.live](https://count.live)

## Features

- **No sign-up required** - Just create a URL and share it
- **Fully customizable** - Date, title, colors, fonts, and time units all configured via URL
- **Privacy-first** - No cookies, no analytics, no server communication
- **Works offline** - Once loaded, works without internet
- **Mobile-friendly** - Responsive design that adapts to any screen
- **Precise calculations** - Accurate calendar math for years and months
- **Live browser tab** - Title updates with the countdown in real-time

### New Features

- **Count-up mode** - Track time elapsed since a past date
- **Recurring countdowns** - Auto-reset for daily, weekly, monthly, or yearly events
- **Multiple countdowns** - Display up to 5 countdowns on one page
- **Theme presets** - Quick color schemes (dark, light, neon, pastel, ocean, sunset, forest)
- **Custom fonts** - Sans-serif, serif, monospace, or display fonts
- **Background images** - Add custom background images via URL
- **Progress tracking** - Visual progress bar and percentage complete
- **Celebrations** - Confetti or fireworks animation when countdown ends
- **Sound alerts** - Chime or bell sound on completion
- **Browser notifications** - Get notified when countdown ends
- **Timezone display** - Show event time in viewer's local timezone
- **Embed mode** - Minimal UI for embedding in websites
- **QR code generator** - Share countdowns via QR code
- **Calendar export** - Download .ics file to add to calendar
- **Date calculator** - Calculate the difference between two dates

## Usage

Configure everything via URL hash parameters:

```
https://count.live/#date=2025-12-31T23:59:59&title=New Year&units=d,h,m,s&end=Happy New Year!
```

Or use the visual builder at [count.live](https://count.live) to create your countdown.

## URL Parameters

### Basic Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `date` | Target date/time (ISO 8601) | `2025-12-31T23:59:59` |
| `mode` | Count direction: `down` (default) or `up` | `up` |
| `title` | Event title (max 50 chars) | `New Year` |
| `subtitle` | Subtitle text (max 200 chars) | `The countdown begins` |
| `units` | Comma-separated time units | `d,h,m,s` |
| `end` | Message when countdown ends | `Happy New Year!` |

### Styling Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `bg` | Background color (hex without #) | `1a1a2e` |
| `fg` | Foreground/text color (hex without #) | `ffffff` |
| `theme` | Color theme preset | `neon` |
| `font` | Font style: `sans`, `serif`, `mono`, `display` | `mono` |
| `bgimg` | Background image URL (URL encoded) | `https://...` |

### Advanced Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `recur` | Recurrence: `daily`, `weekly`, `monthly`, `yearly` | `weekly` |
| `sound` | End sound: `chime`, `bell` | `chime` |
| `celebrate` | End animation: `confetti`, `fireworks` | `confetti` |
| `notify` | Browser notification on end (`1` to enable) | `1` |
| `showtz` | Show timezone display (`1` to enable) | `1` |
| `progress` | Show progress bar (`1` to enable) | `1` |
| `percent` | Show percentage text (`1` to enable) | `1` |
| `start` | Start date for progress calculation (ISO 8601) | `2025-01-01T00:00:00` |
| `embed` | Embed mode - minimal UI (`1` to enable) | `1` |
| `multi` | Multiple countdowns mode (`1` to enable) | `1` |
| `calc` | Date calculator mode (`1` to enable) | `1` |

### Theme Presets

Available themes: `dark`, `light`, `neon`, `pastel`, `ocean`, `sunset`, `forest`

### Available Units

| Unit | Abbreviations |
|------|---------------|
| Years | `y`, `yr`, `yrs`, `years` |
| Months | `mo`, `mon`, `months` |
| Weeks | `w`, `wk`, `wks`, `weeks` |
| Days | `d`, `day`, `days` |
| Hours | `h`, `hr`, `hrs`, `hours` |
| Minutes | `m`, `min`, `mins`, `minutes` |
| Seconds | `s`, `sec`, `secs`, `seconds` |
| Milliseconds | `ms`, `milliseconds` |

## Feature Details

### Count-Up Mode

Use `mode=up` to count up from a past date instead of counting down. Perfect for tracking "Days since..." events like sobriety, quitting smoking, or project anniversaries.

```
https://count.live/#date=2024-01-01&mode=up&title=Days Sober
```

### Recurring Countdowns

Use `recur` to create auto-resetting countdowns. When the countdown reaches zero, it automatically calculates and starts counting to the next occurrence.

```
https://count.live/#date=2025-01-06T09:00:00&recur=weekly&title=Weekly Standup
```

### Multiple Countdowns

Use `multi=1` with numbered parameters to display multiple countdowns on one page:

```
https://count.live/#multi=1&date1=2025-12-25&title1=Christmas&date2=2025-12-31&title2=New Year
```

### Progress Tracking

Show visual progress with a progress bar and/or percentage:

```
https://count.live/#date=2025-12-31&start=2025-01-01&progress=1&percent=1&title=Year Progress
```

### Embedding

Get iframe code using the Embed button, or add `embed=1` to any countdown URL for minimal UI:

```html
<iframe src="https://count.live/#date=2025-12-31&embed=1" width="400" height="200" frameborder="0"></iframe>
```

### Date Calculator

Access the date calculator to find the difference between two dates:

```
https://count.live/#calc=1
```

## Date Formats

Dates are interpreted as UTC:

- `2025-12-31T23:59:59` - Full date and time
- `2025-12-31T23:59` - Without seconds
- `2025-12-31` - Date only (midnight)

## How Units Work

The largest selected unit shows the total value. Smaller units show the remainder.

**Example:** Selecting `weeks` and `minutes` for a 15-day countdown shows "2 Weeks 1440 Minutes" (the actual remaining minutes), not "2 Weeks 30 Minutes".

## Precise Time Calculations

Years and months use actual calendar math:

- **Years** account for leap years
- **Months** account for varying month lengths (28-31 days)
- From Jan 15 to Mar 15 = exactly 2 months, regardless of February's length

## Technical Details

- Three files: `index.html`, `styles.css`, `script.js`
- Pure HTML, CSS, and vanilla JavaScript
- No external dependencies or frameworks
- No build process required
- Total size: ~120KB

## File Structure

```
count.live/
├── index.html    # HTML structure
├── styles.css    # All CSS styles
├── script.js     # All JavaScript
├── logo.png      # Favicon and app icon
└── README.md     # This file
```

## Self-Hosting

Just serve the files from any static hosting:

```bash
# Local development
python3 -m http.server 8080

# Or use any static file server
npx serve .
```

## Browser Support

Works in all modern browsers:
- Chrome, Edge (Chromium-based)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome for Android)

## License

Open source and free to use.
