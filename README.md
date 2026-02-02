# count.live

A minimal, privacy-focused countdown timer that runs entirely in your browser.

**Live site:** [count.live](https://count.live)

## Usage

Create countdowns via URL parameters or use the visual builder at [count.live](https://count.live).

```
https://count.live/#date=2025-12-31T23:59:59&title=New Year&units=d,h,m,s
```

## Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `date` | Target date/time (ISO 8601) | `2025-12-31T23:59:59` |
| `title` | Event title | `New Year` |
| `subtitle` | Subtitle text | `The countdown begins` |
| `units` | Time units to display | `d,h,m,s` |
| `end` | Message when countdown ends | `Happy New Year!` |
| `bg` | Background color (hex without #) | `1a1a2e` |
| `fg` | Text color (hex without #) | `ffffff` |
| `theme` | Color preset: `dark`, `light`, `neon`, `pastel`, `ocean`, `sunset`, `forest` | `neon` |
| `font` | Font: `sans`, `serif`, `mono`, `display` | `mono` |
| `bgimg` | Background image URL | `https://...` |
| `recur` | Recurrence: `daily`, `weekly`, `monthly`, `yearly` | `weekly` |
| `sound` | End sound: `chime`, `bell` | `chime` |
| `celebrate` | End animation: `confetti`, `fireworks` | `confetti` |
| `notify` | Browser notification (`1` to enable) | `1` |
| `showtz` | Show timezone (`1` to enable) | `1` |
| `progress` | Show progress bar (`1` to enable) | `1` |
| `percent` | Show percentage (`1` to enable) | `1` |
| `start` | Start date for progress calculation | `2025-01-01` |
| `embed` | Minimal UI for embedding (`1` to enable) | `1` |

## Units

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

## Examples

**Recurring weekly meeting:**
```
https://count.live/#date=2025-01-06T09:00:00&recur=weekly&title=Weekly Standup
```

**Progress bar for the year:**
```
https://count.live/#date=2025-12-31&start=2025-01-01&progress=1&percent=1&title=Year Progress
```

**Embed in a website:**
```html
<iframe src="https://count.live/#date=2025-12-31&embed=1" width="400" height="200"></iframe>
```

## License

Open source and free to use.
