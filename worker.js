// Cloudflare Worker for dynamic OG meta tags and image generation
// This intercepts requests and modifies the HTML to include proper social sharing metadata

// Security headers to add to all responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// CSP for HTML pages (allows inline styles for dynamic theming, images from https)
const HTML_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'self'";

// Helper to add security headers to a response
function addSecurityHeaders(response, isHtml = false) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }
  if (isHtml) {
    newHeaders.set('Content-Security-Policy', HTML_CSP);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

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
      const transformedResponse = new HTMLRewriter()
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

      return addSecurityHeaders(transformedResponse, true);
    }

    // For all other requests, serve static assets with security headers
    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get('content-type') || '';
    return addSecurityHeaders(assetResponse, contentType.includes('text/html'));
  }
};

// Validate hex color (6 characters, 0-9 and a-f only)
function isValidHexColor(color) {
  return /^[0-9a-fA-F]{6}$/.test(color);
}

// Validate URL for background image (must be https, no data: or javascript:)
function isValidImageUrl(urlStr) {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    // Only allow https URLs, block data:, javascript:, etc.
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Generate OG image as SVG with title/subtitle and user styling
function generateOgImage(url) {
  const bgParam = url.searchParams.get('bg') || '';
  const fgParam = url.searchParams.get('fg') || '';
  const bgimgParam = url.searchParams.get('bgimg') || '';
  const title = url.searchParams.get('title') || 'Countdown';
  const subtitle = url.searchParams.get('subtitle') || '';
  const font = url.searchParams.get('font') || 'sans';

  // Validate and sanitize color inputs
  const bg = isValidHexColor(bgParam) ? bgParam : '1a1a2e';
  const fg = isValidHexColor(fgParam) ? fgParam : 'ffffff';

  // Validate background image URL (must be https, escape for SVG attribute)
  const bgimg = isValidImageUrl(bgimgParam) ? escapeHtml(bgimgParam) : '';

  // Font family mapping
  const fontFamilies = {
    sans: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "'SF Mono', 'Courier New', monospace",
    display: "'Impact', 'Arial Black', sans-serif"
  };
  const fontFamily = fontFamilies[font] || fontFamilies.sans;

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

  // Position text based on whether we have subtitle
  const titleY = subtitle ? 280 : 330;
  const subtitleY = 360;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${backgroundSvg}
  <text x="600" y="${titleY}" text-anchor="middle" font-size="72" font-weight="bold" fill="#${fg}" font-family="${fontFamily}">${escapeHtml(title)}</text>
  ${subtitle ? `<text x="600" y="${subtitleY}" text-anchor="middle" font-size="32" fill="#${fg}" opacity="0.8" font-family="${fontFamily}">${escapeHtml(subtitle)}</text>` : ''}
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
      ...SECURITY_HEADERS,
    },
  });
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
