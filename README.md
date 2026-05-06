# count.live

A minimal, privacy-focused countdown timer with browser-based countdowns, shareable URLs, and embeddable views.

**Live site:** [count.live](https://count.live)

## Usage

Create countdowns via query parameters or use the visual builder at [count.live](https://count.live). Hash-based URLs are also accepted as a fallback.

```
https://count.live/?date=2025-12-31T23:59:59&title=New%20Year&units=d,h,m,s
```

## Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `date` | Target date/time | `2025-12-31T23:59:59` |
| `tz` | IANA timezone for builder-generated dates | `America/Los_Angeles` |
| `title` | Event title | `New Year` |
| `subtitle` | Subtitle text | `The countdown begins` |
| `units` | Time units to display | `d,h,m,s` |
| `end` | Message when countdown ends | `Happy New Year!` |
| `bg` | Background color (hex without #) | `1a1a2e` |
| `fg` | Text color (hex without #) | `ffffff` |
| `theme` | Color preset: `dark`, `light`, `neon`, `pastel`, `ocean`, `sunset`, `forest` | `neon` |
| `font` | Font: `sans`, `serif`, `mono`, `display` | `mono` |
| `bgimg` | HTTPS background image URL | `https://...` |
| `recur` | Recurrence: `daily`, `weekly`, `monthly`, `yearly` | `weekly` |
| `sound` | End sound: `chime`, `bell` | `chime` |
| `celebrate` | End animation: `confetti`, `fireworks` | `confetti` |
| `notify` | Browser notification (`1` to enable) | `1` |
| `showtz` | Show timezone (`1` to enable) | `1` |
| `progress` | Show progress bar (`1` to enable, requires `start`) | `1` |
| `percent` | Show percentage (`1` to enable, requires `start`) | `1` |
| `start` | Start date for progress calculation | `2025-01-01` |
| `redirect` | Redirect URL after the countdown ends | `https://example.com/launch` |
| `redirectDelay` | Redirect delay in seconds (requires `redirect`) | `5` |
| `embed` | Minimal UI for embedding (`1` to enable) | `1` |
| `multi` | Multiple countdowns mode (`1` to enable) | `1` |

## Notes

- `count.live` prefers query params like `?date=...`; hash URLs still work as a fallback.
- Supported date formats include `YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, and `YYYY-MM-DDTHH:MM:SS`, with optional trailing `Z` or `±HH:MM`. Values without timezone info are interpreted as UTC.
- `multi=1` uses numbered params like `date1`, `title1`, `end1`, `date2`, `title2`, `end2`, plus shared `units`, `bg`, `fg`, and `font`.

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
https://count.live/?date=2025-01-06T09:00:00&recur=weekly&title=Weekly%20Standup
```

**Progress bar for the year:**
```
https://count.live/?date=2025-12-31&start=2025-01-01&progress=1&percent=1&title=Year%20Progress
```

**Embed in a website:**
```html
<iframe src="https://count.live/?date=2025-12-31&embed=1" width="400" height="200"></iframe>
```

## License

No license file is currently included in this repository.
