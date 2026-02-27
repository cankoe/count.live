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
const HTML_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; frame-ancestors *; worker-src 'self'";

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

      const tzParam = url.searchParams.get('tz') || '';
      const dateDisplay = workerFormatDate(dateParam, tzParam);

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

      const ogImageUrl = `${url.origin}/favicon-og.png`;

      // Use HTMLRewriter to modify meta tags
      const transformedResponse = new HTMLRewriter()
        .on('title', new TextRewriter(ogTitle))
        .on('meta[property="og:title"]', new AttributeRewriter('content', ogTitle))
        .on('meta[property="og:description"]', new AttributeRewriter('content', description))
        .on('meta[property="og:image"]', new AttributeRewriter('content', ogImageUrl))
        .on('meta[property="og:url"]', new AttributeRewriter('content', fullUrl))
        .on('meta[name="description"]', new AttributeRewriter('content', description))
        .on('meta[name="twitter:card"]', new AttributeRewriter('content', 'summary'))
        .on('meta[name="twitter:title"]', new AttributeRewriter('content', ogTitle))
        .on('meta[name="twitter:description"]', new AttributeRewriter('content', description))
        .on('meta[name="twitter:image"]', new AttributeRewriter('content', ogImageUrl))
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

// Format date following ISO 8601 display rules:
// - Has tz param: show in that timezone with name
// - Has offset (±HH:MM): show at that offset, no timezone name
// - Bare/Z: show as UTC
function workerFormatDate(dateStr, tzParam) {
  if (!dateStr) return '';
  try {
    const hasOffset = /[+-]\d{2}:\d{2}$/.test(dateStr);
    const d = new Date(dateStr.includes('Z') || dateStr.includes('+') || dateStr.includes('-') && dateStr.lastIndexOf('-') > 7 ? dateStr : dateStr + 'Z');
    if (isNaN(d.getTime())) return '';

    const opts = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' };

    if (tzParam) {
      try {
        return d.toLocaleString('en-US', { ...opts, timeZone: tzParam, timeZoneName: 'short' });
      } catch {
        return d.toLocaleString('en-US', { ...opts, timeZone: 'UTC', timeZoneName: 'short' });
      }
    } else if (hasOffset) {
      const match = dateStr.match(/([+-])(\d{2}):(\d{2})$/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const offH = parseInt(match[2]);
        const offM = parseInt(match[3]);
        const offsetMs = sign * (offH * 3600000 + offM * 60000);
        const local = new Date(d.getTime() + offsetMs);
        return local.toLocaleString('en-US', { ...opts, timeZone: 'UTC' });
      }
    }

    return d.toLocaleString('en-US', { ...opts, timeZone: 'UTC', timeZoneName: 'short' });
  } catch {
    return '';
  }
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
