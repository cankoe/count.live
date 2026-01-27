# count.live

A minimal, privacy-focused countdown timer that runs entirely in your browser.

**Live site:** [count.live](https://count.live)

## Features

- **No sign-up required** - Just create a URL and share it
- **Fully customizable** - Date, title, colors, and time units all configured via URL
- **Privacy-first** - No cookies, no analytics, no server communication
- **Works offline** - Once loaded, works without internet
- **Mobile-friendly** - Responsive design that adapts to any screen
- **Precise calculations** - Accurate calendar math for years and months
- **Live browser tab** - Title updates with the countdown in real-time

## Usage

Configure everything via URL hash parameters:

```
https://count.live/#date=2025-12-31T23:59:59&title=New Year&units=d,h,m,s&end=Happy New Year!
```

### Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `date` | Target date/time (ISO 8601) | `2025-12-31T23:59:59` |
| `tz` | Timezone (IANA format, defaults to UTC) | `America/New_York` |
| `title` | Event title (max 50 chars) | `New Year` |
| `subtitle` | Subtitle text, supports multiple lines (max 200 chars) | `The countdown begins` |
| `bg` | Background color (hex without #) | `1a1a2e` |
| `fg` | Foreground color (hex without #) | `ffffff` |
| `units` | Comma-separated time units | `d,h,m,s` |
| `end` | Message when countdown ends | `Happy New Year!` |

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

### Date Formats

Dates are interpreted as UTC unless a `tz` parameter is specified:

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

- Single HTML file (~50KB)
- Pure HTML, CSS, and vanilla JavaScript
- No external dependencies or frameworks
- No build process required

## Self-Hosting

Just serve `index.html` from any static hosting:

```bash
# Local development
python3 -m http.server 8080

# Or use any static file server
npx serve .
```

## License

Open source and free to use.
