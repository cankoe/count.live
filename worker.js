// Cloudflare Worker for dynamic OG meta tags and image generation
// This intercepts requests and modifies the HTML to include proper social sharing metadata

import { ImageResponse } from 'workers-og';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle OG image generation
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
        .on('link[rel="canonical"]', new AttributeRewriter('href', fullUrl))
        .transform(response);
    }

    // For all other requests, serve static assets directly
    return env.ASSETS.fetch(request);
  }
};

// Generate OG image showing the countdown time with styling
async function generateOgImage(url) {
  const dateParam = url.searchParams.get('date') || '';
  const unitsParam = url.searchParams.get('units') || 'd,h,m,s';
  const bg = url.searchParams.get('bg') || '1a1a2e';
  const fg = url.searchParams.get('fg') || 'ffffff';
  const bgimg = url.searchParams.get('bgimg') || '';
  const title = url.searchParams.get('title') || '';

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

  // Build the countdown display - just the numbers and labels
  const countdownHtml = timeUnits.map(({ value, label }, index) => {
    // Add colon separator between time units (h:m:s)
    const timeUnitNames = ['hours', 'minutes', 'seconds'];
    const currentUnit = unitsParam.split(',')[index]?.trim().toLowerCase();
    const nextUnit = unitsParam.split(',')[index + 1]?.trim().toLowerCase();
    const showColon = timeUnitNames.includes(currentUnit) && timeUnitNames.includes(nextUnit);

    return `
      <div style="display: flex; align-items: center;">
        <div style="display: flex; flex-direction: column; align-items: center; margin: 0 20px;">
          <span style="font-size: 120px; font-weight: bold; line-height: 1;">${value}</span>
          <span style="font-size: 24px; opacity: 0.7; text-transform: uppercase; margin-top: 12px; letter-spacing: 2px;">${label}</span>
        </div>
        ${showColon ? '<span style="font-size: 100px; font-weight: bold; opacity: 0.5; margin: 0 -10px;">:</span>' : ''}
      </div>
    `;
  }).join('');

  // Background styles - support background image with overlay
  const bgStyle = bgimg
    ? `background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bgimg}); background-size: cover; background-position: center;`
    : `background-color: #${bg};`;

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;
                height: 100%; width: 100%; ${bgStyle} color: #${fg};
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;">
      ${title ? `<h1 style="font-size: 56px; font-weight: 600; margin: 0 0 30px 0; text-align: center; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">${escapeHtml(title)}</h1>` : ''}
      <div style="display: flex; align-items: flex-start; justify-content: center; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
        ${countdownHtml || '<span style="font-size: 80px; font-weight: bold;">Countdown</span>'}
      </div>
    </div>
  `;

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
  });
}

// Calculate time units for OG image display
function calculateTimeUnits(targetDate, unitsParam) {
  const now = new Date();
  let diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return [{ value: '0', label: 'seconds' }];

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
        label: unitLabels[unit] || unit
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
