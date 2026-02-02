// Cloudflare Worker for dynamic OG meta tags and image generation
// This intercepts requests and modifies the HTML to include proper social sharing metadata

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle OG image generation (SVG)
    if (url.pathname === '/og-image') {
      return generateOgImage(url);
    }

    // Only process root path with query params for OG tag injection
    if (url.pathname === '/' && url.searchParams.has('date')) {
      // Get the static asset
      const response = await env.ASSETS.fetch(request);

      // Only transform HTML responses
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return response;
      }

      // Extract params for OG tags
      const title = url.searchParams.get('title') || '';
      const subtitle = url.searchParams.get('subtitle') || '';
      const dateParam = url.searchParams.get('date') || '';
      const unitsParam = url.searchParams.get('units') || 'd,h,m,s';

      // Get timezone from Cloudflare request (based on IP geolocation)
      const timezone = request.cf?.timezone || 'UTC';

      // Parse the target date
      let targetDate = null;
      if (dateParam) {
        try {
          targetDate = new Date(dateParam.includes('Z') || dateParam.includes('+') ? dateParam : dateParam + 'Z');
          if (isNaN(targetDate.getTime())) targetDate = null;
        } catch (e) {
          targetDate = null;
        }
      }

      // Calculate remaining time
      const remainingStr = targetDate ? formatRemainingTime(targetDate, unitsParam) : '';

      // Format the date for display in the viewer's timezone
      let dateDisplay = '';
      if (targetDate) {
        try {
          dateDisplay = targetDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: timezone,
            timeZoneName: 'short'
          });
        } catch (e) {
          // Fallback to UTC if timezone is invalid
          dateDisplay = targetDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short'
          });
        }
      }

      // Build the page title: "5d 3h 20m - Event Name" or "5d 3h 20m" or "Event Name"
      let ogTitle = 'Countdown Timer';
      if (remainingStr && title) {
        ogTitle = `${remainingStr} - ${title}`;
      } else if (remainingStr) {
        ogTitle = remainingStr;
      } else if (title) {
        ogTitle = title;
      }

      // Build description: "Subtitle (January 15, 2026 at 3:00 PM PST)"
      let description = '';
      if (subtitle && dateDisplay) {
        description = `${subtitle} (${dateDisplay})`;
      } else if (subtitle) {
        description = subtitle;
      } else if (dateDisplay) {
        description = `Counting down to ${dateDisplay}`;
      } else {
        description = 'Countdown timer';
      }

      const fullUrl = url.toString();

      // Build the OG image URL with the same params
      const ogImageUrl = new URL('/og-image', url.origin);
      ogImageUrl.search = url.search;

      // Use HTMLRewriter to modify meta tags
      return new HTMLRewriter()
        .on('title', new TextRewriter(ogTitle))
        .on('meta[property="og:title"]', new AttributeRewriter('content', ogTitle))
        .on('meta[property="og:description"]', new AttributeRewriter('content', description))
        .on('meta[property="og:image"]', new AttributeRewriter('content', ogImageUrl.toString()))
        .on('meta[property="og:url"]', new AttributeRewriter('content', fullUrl))
        .on('meta[name="description"]', new AttributeRewriter('content', description))
        .on('meta[name="twitter:card"]', new AttributeRewriter('content', 'summary_large_image'))
        .on('meta[name="twitter:title"]', new AttributeRewriter('content', ogTitle))
        .on('meta[name="twitter:description"]', new AttributeRewriter('content', description))
        .on('meta[name="twitter:image"]', new AttributeRewriter('content', ogImageUrl.toString()))
        .on('link[rel="canonical"]', new AttributeRewriter('href', fullUrl))
        .transform(response);
    }

    // For all other requests, serve static assets directly
    return env.ASSETS.fetch(request);
  }
};

// Generate OG image as SVG showing the countdown time with styling
function generateOgImage(url) {
  const dateParam = url.searchParams.get('date') || '';
  const unitsParam = url.searchParams.get('units') || 'd,h,m,s';
  const bg = url.searchParams.get('bg') || '1a1a2e';
  const fg = url.searchParams.get('fg') || 'ffffff';
  const bgimg = url.searchParams.get('bgimg') || '';
  const title = url.searchParams.get('title') || '';
  const font = url.searchParams.get('font') || 'sans';

  // Font family mapping
  const fontFamilies = {
    sans: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "'SF Mono', 'Courier New', monospace",
    display: "'Impact', 'Arial Black', sans-serif"
  };
  const fontFamily = fontFamilies[font] || fontFamilies.sans;

  // Parse the target date
  let targetDate = null;
  if (dateParam) {
    try {
      targetDate = new Date(dateParam.includes('Z') || dateParam.includes('+') ? dateParam : dateParam + 'Z');
      if (isNaN(targetDate.getTime())) targetDate = null;
    } catch (e) {
      targetDate = null;
    }
  }

  // Calculate remaining time units for display
  const timeUnits = targetDate ? calculateTimeUnits(targetDate, unitsParam) : [];

  // Build SVG countdown units
  const unitWidth = 140;
  const colonWidth = 40;
  const timeUnitNames = ['hours', 'minutes', 'seconds'];

  let totalWidth = 0;
  const unitData = timeUnits.map(({ value, label, unitName }, index) => {
    const nextUnit = timeUnits[index + 1];
    const showColon = timeUnitNames.includes(unitName) && nextUnit && timeUnitNames.includes(nextUnit.unitName);
    const width = unitWidth + (showColon ? colonWidth : 0);
    const x = totalWidth;
    totalWidth += width;
    return { value, label, x, showColon };
  });

  // Center the countdown
  const startX = (1200 - totalWidth) / 2;
  const countdownY = title ? 380 : 315;

  // Build countdown SVG elements
  const countdownSvg = unitData.map(({ value, label, x, showColon }) => `
    <g transform="translate(${startX + x}, ${countdownY})">
      <text x="${unitWidth/2}" y="0" text-anchor="middle" font-size="100" font-weight="bold" fill="#${fg}" font-family="${fontFamily}">${value}</text>
      <text x="${unitWidth/2}" y="40" text-anchor="middle" font-size="20" fill="#${fg}" opacity="0.7" font-family="${fontFamily}" text-transform="uppercase" letter-spacing="2">${label}</text>
      ${showColon ? `<text x="${unitWidth + 20}" y="-10" text-anchor="middle" font-size="80" font-weight="bold" fill="#${fg}" opacity="0.5" font-family="${fontFamily}">:</text>` : ''}
    </g>
  `).join('');

  // Title SVG
  const titleSvg = title
    ? `<text x="600" y="180" text-anchor="middle" font-size="52" font-weight="600" fill="#${fg}" font-family="${fontFamily}">${escapeHtml(title)}</text>`
    : '';

  // Background - either solid color or image
  let backgroundSvg;
  if (bgimg) {
    backgroundSvg = `
      <image href="${bgimg}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
      <rect width="1200" height="630" fill="rgba(0,0,0,0.5)"/>
    `;
  } else {
    backgroundSvg = `<rect width="1200" height="630" fill="#${bg}"/>`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${backgroundSvg}
  ${titleSvg}
  ${countdownSvg}
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

// Calculate time units for OG image display
function calculateTimeUnits(targetDate, unitsParam) {
  const now = new Date();
  let diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return [{ value: '0', label: 'Seconds', unitName: 'seconds' }];

  const unitAliases = {
    y: 'years', yr: 'years', yrs: 'years', years: 'years',
    mo: 'months', mon: 'months', months: 'months',
    w: 'weeks', wk: 'weeks', wks: 'weeks', weeks: 'weeks',
    d: 'days', day: 'days', days: 'days',
    h: 'hours', hr: 'hours', hrs: 'hours', hours: 'hours',
    m: 'minutes', min: 'minutes', mins: 'minutes', minutes: 'minutes',
    s: 'seconds', sec: 'seconds', secs: 'seconds', seconds: 'seconds',
    ms: 'milliseconds', milliseconds: 'milliseconds'
  };

  const units = unitsParam.split(',').map(u => unitAliases[u.trim().toLowerCase()] || u.trim().toLowerCase());

  const unitValues = {
    years: 365 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    minutes: 60 * 1000,
    seconds: 1000,
    milliseconds: 1
  };

  const unitLabels = {
    years: 'Years', months: 'Months', weeks: 'Weeks', days: 'Days',
    hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds', milliseconds: 'MS'
  };

  const results = [];
  for (const unit of units) {
    if (unitValues[unit]) {
      const value = Math.floor(diff / unitValues[unit]);
      diff = diff % unitValues[unit];
      results.push({
        value: unit === 'milliseconds' ? String(value).padStart(3, '0') : String(value).padStart(2, '0'),
        label: unitLabels[unit] || unit,
        unitName: unit
      });
    }
  }

  return results;
}

// Escape HTML for safe rendering
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Calculate and format remaining time based on units
function formatRemainingTime(targetDate, unitsParam) {
  const now = new Date();
  let diff = targetDate.getTime() - now.getTime();

  // If countdown has ended, return empty
  if (diff <= 0) return '';

  // Parse units
  const unitAliases = {
    y: 'years', yr: 'years', yrs: 'years', years: 'years',
    mo: 'months', mon: 'months', months: 'months',
    w: 'weeks', wk: 'weeks', wks: 'weeks', weeks: 'weeks',
    d: 'days', day: 'days', days: 'days',
    h: 'hours', hr: 'hours', hrs: 'hours', hours: 'hours',
    m: 'minutes', min: 'minutes', mins: 'minutes', minutes: 'minutes',
    s: 'seconds', sec: 'seconds', secs: 'seconds', seconds: 'seconds',
    ms: 'milliseconds', milliseconds: 'milliseconds'
  };

  const units = unitsParam.split(',').map(u => unitAliases[u.trim().toLowerCase()] || u.trim().toLowerCase());

  const unitValues = {
    years: 365 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    minutes: 60 * 1000,
    seconds: 1000,
    milliseconds: 1
  };

  const unitShort = {
    years: 'y', months: 'mo', weeks: 'w', days: 'd',
    hours: 'h', minutes: 'm', seconds: 's', milliseconds: 'ms'
  };

  const parts = [];
  for (const unit of units) {
    if (unitValues[unit] && diff >= unitValues[unit]) {
      const value = Math.floor(diff / unitValues[unit]);
      diff = diff % unitValues[unit];
      parts.push(`${value}${unitShort[unit]}`);
    } else if (unitValues[unit] && parts.length > 0) {
      // Include zero values for intermediate units
      parts.push(`0${unitShort[unit]}`);
    }
  }

  // If we have remaining time but no parts (all zeros), show the smallest unit
  if (parts.length === 0 && units.length > 0) {
    const smallestUnit = units[units.length - 1];
    if (unitShort[smallestUnit]) {
      parts.push(`0${unitShort[smallestUnit]}`);
    }
  }

  return parts.join(' ');
}

// Helper class to rewrite text content
class TextRewriter {
  constructor(newText) {
    this.newText = newText;
  }

  text(text) {
    if (text.text) {
      text.replace(this.newText);
    }
  }
}

// Helper class to rewrite attributes
class AttributeRewriter {
  constructor(attribute, newValue) {
    this.attribute = attribute;
    this.newValue = newValue;
  }

  element(element) {
    element.setAttribute(this.attribute, this.newValue);
  }
}
