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
const HTML_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; frame-ancestors *";

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

      // OG title: just the event title (no countdown values, which change constantly)
      const ogTitle = title || 'Countdown';

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

    // Apple App Site Association for Universal Links
    if (url.pathname === '/.well-known/apple-app-site-association') {
      const aasa = {
        applinks: {
          apps: [],
          details: [
            {
              appID: 'TEAM_ID.live.count.app', // TODO: Replace TEAM_ID with Apple Team ID
              paths: ['/*'],
            },
          ],
        },
      };
      return new Response(JSON.stringify(aasa), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          ...SECURITY_HEADERS,
        },
      });
    }

    // Android App Links - Digital Asset Links
    if (url.pathname === '/.well-known/assetlinks.json') {
      const assetlinks = [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: 'live.count.app',
            sha256_cert_fingerprints: [
              // TODO: Replace with actual signing certificate fingerprint
              // Get with: keytool -list -v -keystore your-keystore.jks | grep SHA256
              'SHA256_FINGERPRINT_HERE',
            ],
          },
        },
      ];
      return new Response(JSON.stringify(assetlinks), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          ...SECURITY_HEADERS,
        },
      });
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

// Generate OG image as SVG with title/subtitle, target date, and branding
function generateOgImage(url) {
  const bgParam = url.searchParams.get('bg') || '';
  const fgParam = url.searchParams.get('fg') || '';
  const themeParam = url.searchParams.get('theme') || '';
  const title = url.searchParams.get('title') || 'Countdown';
  const subtitle = url.searchParams.get('subtitle') || '';
  const dateParam = url.searchParams.get('date') || '';
  const font = url.searchParams.get('font') || 'sans';

  // Theme presets (must match script.js)
  const themes = {
    dark: { bg: '1a1a2e', fg: 'ffffff' },
    light: { bg: 'f5f5f5', fg: '333333' },
    neon: { bg: '0a0a0a', fg: '00ff88' },
    pastel: { bg: 'ffeef8', fg: '8b6b8a' },
    ocean: { bg: '0c2d48', fg: '7ec8e3' },
    sunset: { bg: '2d1b4e', fg: 'ff6b6b' },
    forest: { bg: '1a3a1a', fg: '90ee90' },
  };
  const theme = themes[themeParam];

  // Resolve colors: explicit params > theme > defaults
  const bg = isValidHexColor(bgParam) ? bgParam : (theme ? theme.bg : '1a1a2e');
  const fg = isValidHexColor(fgParam) ? fgParam : (theme ? theme.fg : 'ffffff');

  // Font family mapping
  const fontFamilies = {
    sans: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "'SF Mono', 'Courier New', monospace",
    display: "'Impact', 'Arial Black', sans-serif"
  };
  const fontFamily = fontFamilies[font] || fontFamilies.sans;

  // Parse and format target date
  let dateDisplay = '';
  if (dateParam) {
    try {
      const d = new Date(dateParam.includes('Z') || dateParam.includes('+') ? dateParam : dateParam + 'Z');
      if (!isNaN(d.getTime())) {
        dateDisplay = d.toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit', timeZone: 'UTC'
        });
      }
    } catch (e) { /* ignore invalid dates */ }
  }

  const backgroundSvg = `<rect width="1200" height="630" fill="#${bg}"/>`;

  // Position text based on what content we have
  let titleY, subtitleY, dateY;
  if (subtitle && dateDisplay) {
    titleY = 240; subtitleY = 310; dateY = 400;
  } else if (subtitle) {
    titleY = 280; subtitleY = 360;
  } else if (dateDisplay) {
    titleY = 270; dateY = 370;
  } else {
    titleY = 315;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  ${backgroundSvg}
  <text x="600" y="${titleY}" text-anchor="middle" font-size="72" font-weight="bold" fill="#${fg}" font-family="${fontFamily}">${escapeHtml(title)}</text>
  ${subtitle ? `<text x="600" y="${subtitleY}" text-anchor="middle" font-size="32" fill="#${fg}" opacity="0.8" font-family="${fontFamily}">${escapeHtml(subtitle)}</text>` : ''}
  ${dateDisplay ? `<text x="600" y="${dateY}" text-anchor="middle" font-size="28" fill="#${fg}" opacity="0.5" font-family="${fontFamily}">${escapeHtml(dateDisplay)}</text>` : ''}
  <text x="1160" y="605" text-anchor="end" font-size="20" fill="#${fg}" opacity="0.3" font-family="${fontFamily}">count.live</text>
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
