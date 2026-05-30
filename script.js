const DEFAULTS = {
  fg: '#ffffff',
  bg: '#1a1a2e',
  units: ['days', 'hours', 'minutes', 'seconds'],
  end: 'Event Started!',
  font: 'sans'
};

// Centralized localStorage key names. Add new keys here so naming stays
// consistent and typos at call sites become impossible.
const STORAGE_KEYS = {
  builderVisits: 'cl_builder_visits',
  builderTheme:  'builderTheme',
  history:       'countdownHistory',
};

const MAX_LENGTHS = {
  title: 50,
  subtitle: 200,
  end: 100
};

// Theme presets
const THEME_PRESETS = {
  dark: { bg: '1a1a2e', fg: 'ffffff', name: 'Dark' },
  light: { bg: 'f5f5f5', fg: '333333', name: 'Light' },
  neon: { bg: '0a0a0a', fg: '00ff88', name: 'Neon' },
  pastel: { bg: 'ffeef8', fg: '8b6b8a', name: 'Pastel' },
  ocean: { bg: '0c2d48', fg: '7ec8e3', name: 'Ocean' },
  sunset: { bg: '2d1b4e', fg: 'ff6b6b', name: 'Sunset' },
  forest: { bg: '1a3a1a', fg: '90ee90', name: 'Forest' }
};

// Font stacks
const FONT_STACKS = {
  sans: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', 'Courier New', monospace",
  display: "'Impact', 'Arial Black', sans-serif"
};

// Update favicon to match countdown theme colors
function updateFavicon(fg, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${bg}"/><text x="3" y="24" font-family="'Courier New',monospace" font-weight="700" font-size="22" fill="${fg}">c<tspan fill="${fg}">.</tspan></text></svg>`;
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = bg;
}

// Show a brief toast notification
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Mailto fallback — also copy email to clipboard
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="mailto:"]');
  if (!link) return;
  const email = link.href.replace('mailto:', '').split('?')[0];
  navigator.clipboard.writeText(email).then(() => {
    showToast('Email copied');
  }).catch(() => {});
});

// Promo badge: click/Enter to toggle on touch + keyboard, plus outside-click
// and Escape to dismiss. Hover-only (the prior behaviour) was invisible to
// keyboard users and unusable on touch devices.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('promo-toggle');
  if (!toggle) return;
  const modal = document.getElementById('promo-modal');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('click', (e) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (!modal.contains(e.target) && e.target !== toggle) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
});

// Sound effects - generated at runtime for better quality
const SOUNDS = (function() {
  function createWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
      view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, samples[i] * 32767)), true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  function generateChime() {
    const sampleRate = 22050;
    const duration = 0.8;
    const samples = new Float32Array(Math.floor(sampleRate * duration));

    // Chime: bright harmonics with quick decay
    const freqs = [1047, 1319, 1568, 2093]; // C6, E6, G6, C7
    const amps = [0.4, 0.3, 0.2, 0.1];

    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5) * (1 - Math.exp(-t * 100));
      let sample = 0;
      for (let j = 0; j < freqs.length; j++) {
        sample += Math.sin(2 * Math.PI * freqs[j] * t) * amps[j];
      }
      samples[i] = sample * envelope * 0.6;
    }

    return createWav(samples, sampleRate);
  }

  function generateBell() {
    const sampleRate = 22050;
    const duration = 1.5;
    const samples = new Float32Array(Math.floor(sampleRate * duration));

    // Bell: fundamental with inharmonic partials
    const fundamental = 440;
    const partials = [
      { ratio: 1.0, amp: 0.5, decay: 2 },
      { ratio: 2.0, amp: 0.3, decay: 3 },
      { ratio: 2.4, amp: 0.2, decay: 4 },
      { ratio: 3.0, amp: 0.15, decay: 4 },
      { ratio: 4.5, amp: 0.1, decay: 5 },
      { ratio: 5.2, amp: 0.08, decay: 6 }
    ];

    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const attack = 1 - Math.exp(-t * 200);
      let sample = 0;
      for (const p of partials) {
        const envelope = Math.exp(-t * p.decay);
        sample += Math.sin(2 * Math.PI * fundamental * p.ratio * t) * p.amp * envelope;
      }
      samples[i] = sample * attack * 0.5;
    }

    return createWav(samples, sampleRate);
  }

  return {
    chime: generateChime(),
    bell: generateBell()
  };
})();

const UNIT_CONFIG = {
  years: { label: 'Years', divisor: 31536000000 }, // 365 days
  months: { label: 'Months', divisor: 2592000000, mod: 12 }, // 30 days
  weeks: { label: 'Weeks', divisor: 604800000, mod: 4 }, // 7 days
  days: { label: 'Days', divisor: 86400000, mod: 7 },
  hours: { label: 'Hours', divisor: 3600000, mod: 24 },
  minutes: { label: 'Minutes', divisor: 60000, mod: 60 },
  seconds: { label: 'Seconds', divisor: 1000, mod: 60 },
  milliseconds: { label: 'MS', divisor: 1, mod: 1000 }
};

// Abbreviation mappings
const UNIT_ALIASES = {
  y: 'years', yr: 'years', yrs: 'years', years: 'years',
  mo: 'months', mon: 'months', months: 'months',
  w: 'weeks', wk: 'weeks', wks: 'weeks', weeks: 'weeks',
  d: 'days', day: 'days', days: 'days',
  h: 'hours', hr: 'hours', hrs: 'hours', hours: 'hours',
  m: 'minutes', min: 'minutes', mins: 'minutes', minutes: 'minutes',
  s: 'seconds', sec: 'seconds', secs: 'seconds', seconds: 'seconds',
  ms: 'milliseconds', milliseconds: 'milliseconds'
};

function parseHash() {
  const hash = window.location.hash.slice(1);
  const params = {};

  hash.split('&').forEach(pair => {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    if (key && value !== undefined) {
      params[key] = value;
    }
  });

  return params;
}

function parseParams() {
  // Check query params first (for SEO/social sharing), fall back to hash
  const query = new URLSearchParams(window.location.search);
  if (query.has('date')) {
    return Object.fromEntries(query);
  }
  return parseHash();
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) : str;
}

// Validate and sanitize URL for safe use in CSS url()
// Returns null if URL is invalid or potentially dangerous
function sanitizeUrlForCss(urlStr) {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    // Only allow https URLs (block data:, javascript:, http:, etc.)
    if (parsed.protocol !== 'https:') return null;
    // Return the sanitized href (URL constructor normalizes the URL)
    // Escape characters that could break out of CSS url() context
    return parsed.href.replace(/['"()\\]/g, encodeURIComponent);
  } catch {
    return null;
  }
}

// Validate a redirect URL — https only.
// Returns the normalized href string, or null if invalid.
// http: is rejected so a count.live link can't be used to demote a user
// from a secure connection to an insecure one.
function validateRedirectUrl(urlStr) {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function linkifyText(str) {
  if (!str) return '';
  // First escape HTML to prevent XSS
  const escaped = escapeHtml(str);
  // Convert URLs to links
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  const withLinks = escaped.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  // Convert newlines to <br> for multiline support
  return withLinks.replace(/\n/g, '<br>');
}

function parseColor(color, type) {
  if (!color) return null;
  // Check if it's a theme name
  if (THEME_PRESETS[color]) {
    return '#' + THEME_PRESETS[color][type || 'bg'];
  }
  if (color.match(/^[0-9a-fA-F]{3,8}$/)) {
    return '#' + color;
  }
  return color;
}

function parseDate(dateStr) {
  if (!dateStr) return null;

  // Support formats:
  // 2025-12-31T23:59:59 (ISO without timezone, treated as UTC)
  // 2025-12-31T23:59 (without seconds)
  // 2025-12-31 (date only, midnight UTC)

  let normalized = dateStr.trim();

  // If no time component, add midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized += 'T00:00:00';
  }

  // If no seconds, add them
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    normalized += ':00';
  }

  // Ensure UTC interpretation by adding Z if no timezone
  if (!normalized.endsWith('Z') && !normalized.match(/[+-]\d{2}:\d{2}$/)) {
    normalized += 'Z';
  }

  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

function parseUnits(unitsStr) {
  if (!unitsStr) return DEFAULTS.units;

  const validUnits = Object.keys(UNIT_CONFIG);
  const requested = unitsStr.split(',').map(u => {
    const trimmed = u.trim().toLowerCase();
    return UNIT_ALIASES[trimmed] || trimmed;
  });
  const filtered = [...new Set(requested.filter(u => validUnits.includes(u)))];

  // Sort by granularity (largest to smallest)
  const order = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'];
  filtered.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return filtered.length > 0 ? filtered : DEFAULTS.units;
}

// Helper: add years to a date, handling leap year edge cases
function addYears(date, years) {
  const result = new Date(date);
  const originalMonth = result.getMonth();
  const originalDay = result.getDate();
  result.setFullYear(result.getFullYear() + years);
  // Handle Feb 29 -> Feb 28 when going from leap to non-leap year
  if (result.getMonth() !== originalMonth || result.getDate() !== originalDay) {
    result.setDate(0); // Last day of previous month
  }
  return result;
}

// Helper: add months to a date, handling variable month lengths
function addMonths(date, months) {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setMonth(result.getMonth() + months);
  // Handle day overflow (e.g., Jan 31 + 1 month -> Feb 28)
  if (result.getDate() !== originalDay) {
    result.setDate(0); // Last day of previous month
  }
  return result;
}

function calculateTimeUnits(targetDate, units) {
  const result = {};
  let current = new Date();
  const target = new Date(targetDate);

  // If target is in the past, return zeros
  if (target <= current) {
    return units.reduce((acc, u) => { acc[u] = 0; return acc; }, {});
  }

  // Handle calendar-based units precisely
  if (units.includes('years')) {
    let years = 0;
    let next = addYears(current, 1);
    while (next <= target) {
      years++;
      current = next;
      next = addYears(current, 1);
    }
    result.years = years;
  }

  if (units.includes('months')) {
    let months = 0;
    let next = addMonths(current, 1);
    while (next <= target) {
      months++;
      current = next;
      next = addMonths(current, 1);
    }
    result.months = months;
  }

  // Handle fixed-duration units using remaining milliseconds
  let remainingMs = target - current;

  const fixedUnits = [
    { name: 'weeks', ms: 7 * 24 * 60 * 60 * 1000 },
    { name: 'days', ms: 24 * 60 * 60 * 1000 },
    { name: 'hours', ms: 60 * 60 * 1000 },
    { name: 'minutes', ms: 60 * 1000 },
    { name: 'seconds', ms: 1000 },
    { name: 'milliseconds', ms: 1 }
  ];

  // Find the smallest selected fixed unit and round up remainingMs to that boundary
  // This ensures we show "1" until the moment truly arrives, without overflow bugs
  const selectedFixedUnits = fixedUnits.filter(u => units.includes(u.name));
  if (selectedFixedUnits.length > 0) {
    const smallestUnit = selectedFixedUnits[selectedFixedUnits.length - 1];
    remainingMs = Math.ceil(remainingMs / smallestUnit.ms) * smallestUnit.ms;
  }

  for (const { name, ms } of fixedUnits) {
    if (units.includes(name)) {
      result[name] = Math.floor(remainingMs / ms);
      remainingMs = remainingMs % ms;
    }
  }

  return result;
}

// Get next occurrence for recurring countdowns
function getNextOccurrence(baseDate, recur) {
  const now = new Date();
  let next = new Date(baseDate);

  while (next <= now) {
    if (recur === 'daily') next.setDate(next.getDate() + 1);
    else if (recur === 'weekly') next.setDate(next.getDate() + 7);
    else if (recur === 'monthly') next = addMonths(next, 1);
    else if (recur === 'yearly') next = addYears(next, 1);
    else break;
  }
  return next;
}

// Format date for timezone display
function formatLocalTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

// Format a date string for display following ISO 8601 display rules:
// - Has tz param: show in that timezone with timezone name (e.g., "January 1, 2027, 12:00 AM EST")
// - Has offset (±HH:MM): show time at that offset, no timezone name
// - Bare (no offset/Z): treat as UTC, show "UTC"
// - Has Z: treat as UTC, show "UTC"
function formatDateForDisplay(dateStr, tzParam) {
  if (!dateStr) return '';
  try {
    const d = parseDate(dateStr);
    if (!d) return dateStr;

    const hasOffset = /[+-]\d{2}:\d{2}$/.test(dateStr);
    const hasZ = dateStr.endsWith('Z');
    const opts = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' };

    if (tzParam) {
      // ISO + tz param: show in named timezone
      try {
        return d.toLocaleString('en-US', { ...opts, timeZone: tzParam, timeZoneName: 'short' });
      } catch {
        return d.toLocaleString('en-US', { ...opts, timeZone: 'UTC', timeZoneName: 'short' });
      }
    } else if (hasOffset) {
      // ISO with offset: show time at that offset, no timezone name
      // Extract the offset and compute a fixed-offset display
      const match = dateStr.match(/([+-])(\d{2}):(\d{2})$/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const offH = parseInt(match[2]);
        const offM = parseInt(match[3]);
        const offsetMs = sign * (offH * 3600000 + offM * 60000);
        // Display the time at the given offset
        const local = new Date(d.getTime() + offsetMs);
        return local.toLocaleString('en-US', { ...opts, timeZone: 'UTC' });
      }
    }

    // Bare or Z: show as UTC
    return d.toLocaleString('en-US', { ...opts, timeZone: 'UTC', timeZoneName: 'short' });
  } catch {
    return dateStr;
  }
}

// Calculate progress percentage
function calculateProgress(startDate, endDate) {
  const now = Date.now();
  const start = startDate.getTime();
  const end = endDate.getTime();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return ((now - start) / (end - start)) * 100;
}

// Play end sound
function playEndSound(soundName) {
  if (soundName && SOUNDS[soundName]) {
    try {
      new Audio(SOUNDS[soundName]).play();
    } catch (e) {
      // Audio may be blocked
    }
  }
}

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Show browser notification
function showNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title || 'Countdown Complete', {
      body: message || 'Your countdown has ended!',
      icon: 'logo.png'
    });
  }
}

// Confetti animation
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f8b500', '#ff8a5c', '#a8e6cf'];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    });
  }

  let frame = 0;
  function animate() {
    // When tab is hidden, freeze the animation instead of burning through
    // its frame budget — otherwise by the time the user returns the celebration
    // is already over (rAF is throttled but still ticks at ~1Hz).
    if (document.hidden) {
      requestAnimationFrame(animate);
      return;
    }
    if (frame++ > 180) {
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.rotation += p.rotationSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 180);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// Fireworks animation
function launchFireworks() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff8a5c', '#a8e6cf', '#dda0dd', '#87ceeb'];

  // Create burst points
  const bursts = [
    { x: canvas.width * 0.3, y: canvas.height * 0.3 },
    { x: canvas.width * 0.7, y: canvas.height * 0.4 },
    { x: canvas.width * 0.5, y: canvas.height * 0.25 }
  ];

  bursts.forEach((burst, idx) => {
    setTimeout(() => {
      for (let i = 0; i < 50; i++) {
        const angle = (Math.PI * 2 / 50) * i;
        const speed = Math.random() * 4 + 2;
        particles.push({
          x: burst.x,
          y: burst.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 3 + 2,
          life: 1,
          decay: Math.random() * 0.02 + 0.01
        });
      }
    }, idx * 300);
  });

  let frame = 0;
  function animate() {
    if (document.hidden) {
      requestAnimationFrame(animate);
      return;
    }
    if (frame++ > 200) {
      canvas.remove();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// Generate ICS calendar file content
function generateICS(title, date, url) {
  const formatICSDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const now = new Date();
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//count.live//Countdown Timer//EN
BEGIN:VEVENT
UID:${Date.now()}@count.live
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(date)}
SUMMARY:${(title || 'Countdown Event').replace(/[,;\\]/g, '\\$&')}
DESCRIPTION:Countdown from count.live
URL:${url || 'https://count.live'}
END:VEVENT
END:VCALENDAR`;
}

function padValue(value, unit) {
  if (unit === 'milliseconds') return String(value).padStart(3, '0');
  if (['years', 'months', 'weeks', 'days'].includes(unit)) return String(value);
  return String(value).padStart(2, '0');
}

const UNIT_SHORT = {
  years: 'y', months: 'mo', weeks: 'w', days: 'd',
  hours: 'h', minutes: 'm', seconds: 's', milliseconds: 'ms'
};

function formatTitleCountdown(values, units) {
  return units
    .filter(u => u !== 'milliseconds')
    .map(u => values[u] + UNIT_SHORT[u])
    .join(' ');
}

let lastVerticalState = false;

let countdownBuiltForUnits = null;

function renderCountdown(values, units, isLarge) {
  const countdown = document.getElementById('countdown');
  const unitsKey = units.join(',') + (isLarge ? ':L' : '');

  // Only rebuild DOM if units changed; otherwise just update values
  if (countdownBuiltForUnits !== unitsKey) {
    countdownBuiltForUnits = unitsKey;
    countdown.innerHTML = '';
    countdown.className = 'countdown' + (isLarge ? ' large' : '') + (lastVerticalState ? ' vertical' : '');

    units.forEach((unit, index) => {
      const unitEl = document.createElement('div');
      unitEl.className = 'unit' + (unit === 'milliseconds' ? ' milliseconds' : '');

      const valueEl = document.createElement('span');
      valueEl.className = 'value';
      valueEl.id = 'val-' + unit;
      valueEl.textContent = padValue(values[unit], unit);

      const labelEl = document.createElement('span');
      labelEl.className = 'label';
      labelEl.textContent = UNIT_CONFIG[unit].label;

      unitEl.appendChild(valueEl);
      unitEl.appendChild(labelEl);
      countdown.appendChild(unitEl);

      const timeUnits = ['hours', 'minutes', 'seconds'];
      const nextUnit = units[index + 1];
      if (nextUnit && timeUnits.includes(unit) && timeUnits.includes(nextUnit)) {
        const sep = document.createElement('span');
        sep.className = 'separator';
        sep.textContent = ':';
        countdown.appendChild(sep);
      }
    });

    // Check for overflow once after build
    requestAnimationFrame(() => {
      const needsVertical = countdown.scrollWidth > countdown.clientWidth + 2;
      if (needsVertical !== lastVerticalState) {
        lastVerticalState = needsVertical;
        countdown.classList.toggle('vertical', needsVertical);
      }
    });
  } else {
    // Fast path: just update the text content of existing value elements
    units.forEach((unit) => {
      const el = document.getElementById('val-' + unit);
      if (el) {
        const newVal = padValue(values[unit], unit);
        if (el.textContent !== newVal) el.textContent = newVal;
      }
    });
  }
}

function renderEndMessage(message, isLarge) {
  const countdown = document.getElementById('countdown');
  countdown.innerHTML = '';
  countdown.className = 'countdown';

  const msgEl = document.createElement('div');
  msgEl.className = 'end-message' + (isLarge ? ' large' : '');
  msgEl.innerHTML = linkifyText(message);
  countdown.appendChild(msgEl);

  // Announce end state to screen readers via the polite summary region.
  const summary = document.getElementById('countdown-summary');
  if (summary) summary.textContent = message;
}

// Render a redirect prompt that always reveals the destination host so a
// shared count.live link can't silently send a viewer to an arbitrary site.
// Behaviour:
//   • delaySeconds > 0 → auto-redirect after the delay; destination is visible
//     during the wait and a "Continue now" button is available.
//   • delaySeconds === 0 → no auto-redirect; user must click to continue.
function renderRedirectPrompt(redirectUrl, delaySeconds, session) {
  const countdown = document.getElementById('countdown');
  let hostname;
  try { hostname = new URL(redirectUrl).hostname; } catch { hostname = redirectUrl; }

  const prompt = document.createElement('div');
  prompt.className = 'redirect-prompt';
  const label = document.createElement('p');
  label.className = 'redirect-prompt-label';
  label.textContent = delaySeconds > 0 ? 'Redirecting to' : 'Continue to';
  const host = document.createElement('p');
  host.className = 'redirect-prompt-host';
  host.textContent = hostname;
  const btn = document.createElement('a');
  btn.className = 'redirect-prompt-btn';
  btn.href = redirectUrl;
  btn.rel = 'noopener noreferrer';
  btn.textContent = delaySeconds > 0 ? 'Continue now →' : 'Continue →';
  prompt.appendChild(label);
  prompt.appendChild(host);
  prompt.appendChild(btn);
  countdown.appendChild(prompt);

  if (delaySeconds > 0) {
    setTimeout(() => {
      if (session !== currentSession) return;
      window.location.href = redirectUrl;
    }, delaySeconds * 1000);
  }
}

let currentSession = 0;

function showCountdown() {
  document.getElementById('countdown-view').style.display = '';
  document.getElementById('builder-view').style.display = 'none';
  document.body.classList.remove('builder-mode');
}

function showAppUpsellModal() {
  const overlay = document.getElementById('app-upsell-modal');
  if (!overlay) return;
  const dialog = overlay.querySelector('.modal');
  const closeBtn = document.getElementById('app-upsell-close');
  const dismissBtn = document.getElementById('app-upsell-dismiss');
  const previouslyFocused = document.activeElement;

  // Focus-trap inside the dialog. Tab cycles through the close button, the
  // App Store CTA, and the "Maybe later" link.
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const focusables = dialog.querySelectorAll(
      'a[href], button, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onOverlayClick = (e) => { if (e.target === overlay) close(); };

  const close = () => {
    overlay.classList.remove('open');
    document.removeEventListener('keydown', onKeyDown);
    overlay.removeEventListener('click', onOverlayClick);
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
  };

  overlay.classList.add('open');
  closeBtn.onclick = close;
  dismissBtn.onclick = close;
  overlay.addEventListener('click', onOverlayClick);
  document.addEventListener('keydown', onKeyDown);
  // Defer focus until after the open transition so VoiceOver picks it up.
  requestAnimationFrame(() => dialog.focus());
}

function showBuilder(prefillParams = null) {
  document.getElementById('countdown-view').style.display = 'none';
  document.getElementById('builder-view').style.display = '';
  document.body.classList.add('builder-mode');

  // Show app upsell popup on the second builder visit (not the first).
  try {
    const visits = parseInt(localStorage.getItem(STORAGE_KEYS.builderVisits) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEYS.builderVisits, visits);
    if (visits === 2) setTimeout(showAppUpsellModal, 1200);
  } catch (_) {}

  // Apply saved builder theme preference
  const savedBuilderTheme = localStorage.getItem(STORAGE_KEYS.builderTheme);
  if (savedBuilderTheme === 'light') {
    document.body.classList.add('builder-light');
  } else {
    document.body.classList.remove('builder-light');
  }

  document.body.style.color = DEFAULTS.fg;
  document.body.style.backgroundColor = DEFAULTS.bg;
  requestAnimationFrame(() => document.body.classList.add('theme-ready'));
  document.title = 'count.live — Free shareable countdown timer for any date';
  window._builderPrefill = prefillParams;
  initBuilder();
}

function init() {
  currentSession++;
  const session = currentSession;
  const params = parseParams();

  // SEO: Only index the homepage, not individual countdown pages
  const robotsMeta = document.getElementById('robots-meta');
  if (params.date) {
    robotsMeta.content = 'noindex, nofollow';
  } else {
    robotsMeta.content = 'index, follow';
  }

  // Smart App Banner: pass the current URL so the app opens the same countdown.
  // Only set app-argument for countdown pages — on the homepage/builder we just
  // promote the app without a specific deep link.
  const smartBanner = document.getElementById('smart-app-banner-meta');
  if (smartBanner && params.date) {
    smartBanner.content = `app-id=6772674967, app-argument=${window.location.href}`;
  }

  // Hide all views first
  document.getElementById('countdown-view').style.display = 'none';
  document.getElementById('builder-view').style.display = 'none';
  document.getElementById('multi-view').style.display = 'none';
  document.body.classList.remove('builder-mode', 'embed-mode', 'has-bg-image', 'hide-attribution');

  // Reset render-state globals that the countdown renderer caches across ticks.
  // Without this, switching from a countdown to the builder (or to a different
  // countdown URL) can leave the next render with stale layout/unit decisions.
  lastVerticalState = false;
  countdownBuiltForUnits = null;

  // Show builder if no date or in edit mode
  if (!params.date || params.edit === '1') {
    showBuilder(params.edit === '1' ? params : null);
    return;
  }

  // Check for multi-countdown mode
  if (params.multi === '1') {
    initMultiCountdown(params);
    return;
  }

  showCountdown();

  // Save to history
  saveToHistory(params);

  // Embed mode - minimal UI
  if (params.embed === '1') {
    document.body.classList.add('embed-mode');
  }

  // Attribution link defaults visible; opt-out via attribution=0
  if (params.attribution === '0') {
    document.body.classList.add('hide-attribution');
  }

  // Apply theme if specified
  let fg, bg;
  if (params.theme && THEME_PRESETS[params.theme]) {
    fg = '#' + THEME_PRESETS[params.theme].fg;
    bg = '#' + THEME_PRESETS[params.theme].bg;
  } else {
    fg = parseColor(params.fg, 'fg') || DEFAULTS.fg;
    bg = parseColor(params.bg, 'bg') || DEFAULTS.bg;
  }
  document.body.style.color = fg;
  document.body.style.backgroundColor = bg;
  // Enable color transitions after first paint to avoid CLS on load.
  requestAnimationFrame(() => document.body.classList.add('theme-ready'));
  updateFavicon(fg, bg);

  // Apply font
  const font = params.font && FONT_STACKS[params.font] ? params.font : 'sans';
  document.body.style.fontFamily = FONT_STACKS[font];

  // Apply background image (validated and sanitized for CSS injection prevention)
  if (params.bgimg) {
    try {
      const bgUrl = sanitizeUrlForCss(decodeURIComponent(params.bgimg));
      if (bgUrl) {
        document.body.style.backgroundImage = `url('${bgUrl}')`;
        document.body.classList.add('has-bg-image');
      }
    } catch (e) {}
  }

  // Apply title and subtitle
  const title = truncate(params.title, MAX_LENGTHS.title);
  const subtitle = truncate(params.subtitle, MAX_LENGTHS.subtitle);
  const titleEl = document.getElementById('title');
  const subtitleEl = document.getElementById('subtitle');

  titleEl.innerHTML = linkifyText(title);
  subtitleEl.innerHTML = linkifyText(subtitle);
  titleEl.style.display = title ? 'block' : 'none';
  subtitleEl.style.display = subtitle ? 'block' : 'none';

  // Update page title
  document.title = title || 'Countdown';

  // Determine if countdown should be large (no title/subtitle)
  const isLarge = !title && !subtitle;

  // Parse configuration
  let targetDate = parseDate(params.date);
  const units = parseUnits(params.units);
  const endMessage = truncate(params.end, MAX_LENGTHS.end) || DEFAULTS.end;
  const recur = params.recur;
  const sound = params.sound;
  const celebrate = params.celebrate;
  const notify = params.notify === '1';
  const showTz = params.showtz === '1';
  const showProgress = params.progress === '1';
  const showPercent = params.percent === '1';
  const startDate = params.start ? parseDate(params.start) : null;
  const redirectUrl = validateRedirectUrl(params.redirect);
  const redirectDelay = Math.min(3600, Math.max(0, parseInt(params.redirectDelay, 10) || 0));
  const isEmbedded = window.self !== window.top;

  if (!targetDate) {
    renderEndMessage('This countdown link looks broken. Build your own at https://count.live', isLarge);
    return;
  }

  // Handle recurring countdown
  if (recur) {
    targetDate = getNextOccurrence(targetDate, recur);
  }

  // Past one-time countdown with redirect: show end message + visible prompt.
  if (redirectUrl && !isEmbedded && !recur && targetDate <= new Date()) {
    renderEndMessage(endMessage, isLarge);
    document.title = (title ? title + ' - ' : '') + endMessage;
    renderRedirectPrompt(redirectUrl, redirectDelay, session);
    return;
  }

  // Request notification permission if enabled
  if (notify) {
    requestNotificationPermission();
  }

  // Show timezone display
  const tzDisplay = document.getElementById('timezone-display');
  if (showTz) {
    tzDisplay.textContent = `${formatLocalTime(targetDate)} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
    tzDisplay.style.display = 'block';
  } else {
    tzDisplay.style.display = 'none';
  }

  // Set a one-shot summary for screen readers. The live countdown updates up
  // to 60×/sec which is unusable via assistive tech; this region announces
  // the target once on load and again from renderEndMessage when it completes.
  const summary = document.getElementById('countdown-summary');
  if (summary) {
    const subject = title || 'Countdown';
    summary.textContent = `${subject}. Counting down to ${formatLocalTime(targetDate)}.`;
  }

  // Setup progress tracking
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  if ((showProgress || showPercent) && startDate) {
    progressContainer.style.display = 'block';
  } else {
    progressContainer.style.display = 'none';
  }

  // Update function
  const unitDivisors = {
    years: 365 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    minutes: 60 * 1000,
    seconds: 1000,
    milliseconds: 1
  };
  const smallestUnit = units[units.length - 1];
  const smallestDivisor = unitDivisors[smallestUnit];
  const effectiveEndTime = Math.floor(targetDate.getTime() / smallestDivisor) * smallestDivisor;
  let showingZero = false;
  let celebrationTriggered = false;

  function update() {
    if (session !== currentSession) return;

    const now = Date.now();

    // Update progress bar if enabled
    if ((showProgress || showPercent) && startDate) {
      const progress = calculateProgress(startDate, targetDate);
      if (showProgress) {
        progressFill.style.width = progress.toFixed(1) + '%';
      }
      if (showPercent) {
        progressText.textContent = `${progress.toFixed(1)}% complete`;
      } else if (showProgress) {
        progressText.textContent = '';
      }
    }

    if (now >= effectiveEndTime && !showingZero) {
      showingZero = true;
      const zeroValues = {};
      units.forEach(u => zeroValues[u] = 0);
      renderCountdown(zeroValues, units, isLarge);
      document.title = title ? `0${UNIT_SHORT[smallestUnit]} - ${title}` : `0${UNIT_SHORT[smallestUnit]}`;

      // Trigger celebration, sound, notification
      if (!celebrationTriggered) {
        celebrationTriggered = true;
        playEndSound(sound);
        if (celebrate === 'confetti') launchConfetti();
        else if (celebrate === 'fireworks') launchFireworks();
        if (notify) showNotification(title, endMessage);
      }

      setTimeout(() => {
        if (session !== currentSession) return;

        // Handle recurring countdown
        if (recur) {
          // Redirect if configured, not embedded, and user watched it reach zero
          if (redirectUrl && !isEmbedded) {
            renderRedirectPrompt(redirectUrl, redirectDelay, session);
            return; // Stop the countdown — we're redirecting
          }

          const nextOccurrence = getNextOccurrence(targetDate, recur);
          const nextEl = document.getElementById('next-occurrence');
          nextEl.textContent = `Next: ${formatLocalTime(nextOccurrence)}`;
          nextEl.style.display = 'block';

          // Reset and continue counting
          showingZero = false;
          celebrationTriggered = false;
          targetDate = nextOccurrence;
          setTimeout(update, 1000);
        } else {
          renderEndMessage(endMessage, isLarge);
          document.title = (title ? title + ' - ' : '') + endMessage;
          // Show progress at 100% when complete
          if ((showProgress || showPercent) && startDate) {
            if (showProgress) {
              progressFill.style.width = '100%';
            }
            if (showPercent) {
              progressText.textContent = '100% complete';
            }
          }
          // Redirect if configured and not embedded
          if (redirectUrl && !isEmbedded) {
            renderRedirectPrompt(redirectUrl, redirectDelay, session);
          }
        }
      }, 500);
      return;
    }

    if (showingZero) return;

    const values = calculateTimeUnits(targetDate, units);
    renderCountdown(values, units, isLarge);

    const countdownStr = formatTitleCountdown(values, units);
    document.title = title ? `${countdownStr} - ${title}` : countdownStr;

    const hasLargerUnits = units.some(u => u !== 'milliseconds');
    if (units.includes('milliseconds') && hasLargerUnits) {
      // ms alongside other units: interpolate just the fractional ms at 60fps
      const msUpdate = () => {
        // Bail when the user has navigated away — otherwise this rAF loop keeps
        // running against stale closure state for the previous countdown.
        if (session !== currentSession || showingZero) return;
        const remaining = targetDate - new Date();
        if (remaining <= 0) { update(); return; }
        const msVal = remaining % 1000;
        const el = document.getElementById('val-milliseconds');
        if (el) el.textContent = padValue(Math.floor(msVal), 'milliseconds');
        requestAnimationFrame(msUpdate);
      };
      requestAnimationFrame(msUpdate);
      setTimeout(update, 1000);
    } else if (units.includes('milliseconds')) {
      // ms is the only/primary unit: full recalculate at 60fps
      requestAnimationFrame(() => setTimeout(update, 16));
    } else {
      if (document.hidden) {
        setTimeout(update, 1000);
      } else {
        requestAnimationFrame(() => setTimeout(update, 1000));
      }
    }
  }

  update();
}

// Multi-countdown view
function initMultiCountdown(params) {
  const container = document.getElementById('multi-view');
  container.style.display = '';
  container.innerHTML = '';
  document.body.classList.remove('builder-mode');

  // Apply colors
  const fg = parseColor(params.fg, 'fg') || DEFAULTS.fg;
  const bg = parseColor(params.bg, 'bg') || DEFAULTS.bg;
  document.body.style.color = fg;
  document.body.style.backgroundColor = bg;
  requestAnimationFrame(() => document.body.classList.add('theme-ready'));
  updateFavicon(fg, bg);
  document.body.style.fontFamily = FONT_STACKS[params.font] || FONT_STACKS.sans;

  // Parse multiple countdowns (max 5)
  const countdowns = [];
  for (let i = 1; i <= 5; i++) {
    if (params['date' + i]) {
      countdowns.push({
        date: parseDate(params['date' + i]),
        title: params['title' + i] || '',
        end: params['end' + i] || DEFAULTS.end
      });
    }
  }

  if (countdowns.length === 0) {
    container.innerHTML = '<p style="opacity:0.5">No countdowns yet — add one with the builder.</p>';
    return;
  }

  const units = parseUnits(params.units);
  document.title = countdowns[0].title || 'Multiple Countdowns';

  // Build each countdown's DOM once up front, then update textContent on each
  // tick. Replaces the prior pattern of N independent setTimeout loops each
  // doing a full innerHTML rebuild 10×/sec — wasteful for what's typically
  // a seconds-granularity display.
  const entries = countdowns.map((cd, index) => {
    const item = document.createElement('div');
    item.className = 'countdown-item';
    item.id = 'countdown-' + (index + 1);

    const titleEl = document.createElement('h1');
    titleEl.className = 'title';
    titleEl.textContent = cd.title;
    item.appendChild(titleEl);

    const countdownEl = document.createElement('div');
    countdownEl.className = 'countdown';
    countdownEl.id = 'countdown-inner-' + (index + 1);
    countdownEl.setAttribute('aria-live', 'off');
    countdownEl.setAttribute('aria-hidden', 'true');
    item.appendChild(countdownEl);
    container.appendChild(item);

    if (!cd.date) return null;

    const valueEls = {};
    units.forEach((unit, idx) => {
      const unitEl = document.createElement('div');
      unitEl.className = 'unit';
      const valueEl = document.createElement('span');
      valueEl.className = 'value';
      valueEls[unit] = valueEl;
      const labelEl = document.createElement('span');
      labelEl.className = 'label';
      labelEl.textContent = UNIT_CONFIG[unit].label;
      unitEl.appendChild(valueEl);
      unitEl.appendChild(labelEl);
      countdownEl.appendChild(unitEl);

      const timeUnits = ['hours', 'minutes', 'seconds'];
      const nextUnit = units[idx + 1];
      if (nextUnit && timeUnits.includes(unit) && timeUnits.includes(nextUnit)) {
        const sep = document.createElement('span');
        sep.className = 'separator';
        sep.textContent = ':';
        countdownEl.appendChild(sep);
      }
    });

    return { cd, countdownEl, valueEls, ended: false };
  }).filter(Boolean);

  // One shared 1Hz tick drives every countdown — multi view doesn't show ms.
  function tickAll() {
    let stillRunning = false;
    for (const entry of entries) {
      if (entry.ended) continue;
      if (entry.cd.date.getTime() <= Date.now()) {
        entry.ended = true;
        entry.countdownEl.innerHTML = `<div class="end-message">${linkifyText(entry.cd.end)}</div>`;
        continue;
      }
      stillRunning = true;
      const values = calculateTimeUnits(entry.cd.date, units);
      units.forEach((unit) => {
        const el = entry.valueEls[unit];
        if (!el) return;
        const newVal = padValue(values[unit], unit);
        if (el.textContent !== newVal) el.textContent = newVal;
      });
    }
    if (stillRunning) setTimeout(tickAll, 1000);
  }
  tickAll();
}

// Countdown history
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
  } catch { return []; }
}

let lastSavedUrl = '';
function saveToHistory(params) {
  if (!params.date) return;
  if (params.embed === '1') return;
  const url = window.location.origin + window.location.pathname + window.location.search;
  if (url === lastSavedUrl) return;
  lastSavedUrl = url;
  const entry = {
    url,
    title: params.title || '',
    subtitle: params.subtitle || '',
    date: params.date,
    tz: params.tz || '',
    bg: params.bg || (params.theme && THEME_PRESETS[params.theme] ? THEME_PRESETS[params.theme].bg : '1a1a2e'),
    fg: params.fg || (params.theme && THEME_PRESETS[params.theme] ? THEME_PRESETS[params.theme].fg : 'ffffff'),
    visitedAt: Date.now()
  };
  const history = getHistory().filter(h => h.url !== url);
  history.unshift(entry);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 10)));
}

function deleteFromHistory(url) {
  const history = getHistory().filter(h => h.url !== url);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEYS.history);
  renderHistory();
}

function normalizeHistoryHex(color, fallback) {
  const cleaned = String(color || '').replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(cleaned) ? cleaned.toLowerCase() : fallback;
}

function renderHistory() {
  const section = document.getElementById('history-section');
  const list = document.getElementById('history-list');
  if (!section || !list) return;

  const history = getHistory();
  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  list.innerHTML = '';

  history.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-card';
    const bg = normalizeHistoryHex(entry.bg, '1a1a2e');
    const fg = normalizeHistoryHex(entry.fg, 'ffffff');
    item.style.setProperty('--history-bg', '#' + bg);
    item.style.setProperty('--history-fg', '#' + fg);
    item.style.setProperty('--history-border', '#' + fg + '33');
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.history-delete')) {
        window.location.href = entry.url;
      }
    });

    const body = document.createElement('div');
    body.className = 'history-card-body';

    const title = document.createElement('p');
    title.className = 'history-card-title';
    title.textContent = entry.title || 'Untitled countdown';

    const date = document.createElement('p');
    date.className = 'history-card-date';
    date.textContent = formatDateForDisplay(entry.date, entry.tz) || entry.date || '';

    body.appendChild(title);
    body.appendChild(date);

    const del = document.createElement('button');
    del.className = 'history-delete';
    del.innerHTML = '&times;';
    del.title = 'Remove';
    del.setAttribute('aria-label', `Remove ${entry.title || 'countdown'}`);
    del.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteFromHistory(entry.url);
    });

    item.appendChild(body);
    item.appendChild(del);
    list.appendChild(item);
  });

  // Wire up clear button once
  const clearBtn = document.getElementById('history-clear');
  if (clearBtn && !clearBtn._wired) {
    clearBtn._wired = true;
    clearBtn.addEventListener('click', clearHistory);
  }
}

// Builder functionality
let builderInitialized = false;
let previewSession = 0;
let previewEndMode = false;

// Common timezones with friendly names
// Get all IANA timezones from the browser (400+)
const TIMEZONES = (typeof Intl !== 'undefined' && Intl.supportedValuesOf
  ? Intl.supportedValuesOf('timeZone')
  : ['UTC']
).map(id => ({
  id,
  name: id.replace(/_/g, ' ').split('/').pop()
}));

function getTimezoneOffset(tzId) {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tzId }));
    const offsetMinutes = (tzDate - utcDate) / 60000;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    return `GMT${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch (e) {
    return 'GMT+00:00';
  }
}

// Localize example card URLs to use the user's timezone.
// Memoized — the example URLs and the user's timezone don't change within a
// session, so re-running on every builder mount is wasted parse + URL work.
let examplesLocalized = false;
function localizeExamples() {
  if (examplesLocalized) return;
  examplesLocalized = true;
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cards = document.querySelectorAll('.example-card');

  cards.forEach(card => {
    const elements = [card, card.querySelector('iframe')].filter(Boolean);

    elements.forEach(el => {
      const attr = el.tagName === 'IFRAME' ? 'src' : 'href';
      const rawUrl = el.getAttribute(attr);
      if (!rawUrl) return;

      try {
        const url = new URL(rawUrl, window.location.origin);
        const isHash = rawUrl.includes('#') && !rawUrl.includes('?');
        const params = isHash
          ? new URLSearchParams(url.hash.slice(1))
          : url.searchParams;

        // Convert date to user's timezone (dates are stored as intended local times)
        const dateStr = params.get('date');
        if (dateStr) {
          const utcDate = localToUTC(dateStr, userTz);
          params.set('date', utcDate);
        }

        // Convert start date if present
        const startStr = params.get('start');
        if (startStr) {
          const utcStart = localToUTC(startStr, userTz);
          params.set('start', utcStart);
        }

        // Set user's timezone
        params.set('tz', userTz);

        if (isHash) {
          el.setAttribute(attr, url.pathname + '#' + params.toString());
        } else {
          el.setAttribute(attr, url.pathname + '?' + params.toString());
        }
      } catch (e) {
        // Skip if URL parsing fails
      }
    });
  });
}

function initBuilder() {
  if (builderInitialized) {
    updatePreview();
    return;
  }
  builderInitialized = true;

  // Localize example cards to user's timezone
  localizeExamples();

  // Builder theme toggle (light/dark mode for the builder UI itself)
  const builderThemeToggle = document.getElementById('builder-theme-toggle');
  if (builderThemeToggle) {
    // Check for saved preference (default to light)
    const savedBuilderTheme = localStorage.getItem(STORAGE_KEYS.builderTheme);
    if (savedBuilderTheme !== 'dark') {
      document.body.classList.add('builder-light');
    }

    builderThemeToggle.addEventListener('click', () => {
      document.body.classList.toggle('builder-light');
      localStorage.setItem(STORAGE_KEYS.builderTheme,
        document.body.classList.contains('builder-light') ? 'light' : 'dark'
      );
    });
  }

  // Populate color presets — clicking a swatch updates the bg/fg color fields
  const themeContainer = document.getElementById('theme-presets');
  Object.entries(THEME_PRESETS).forEach(([key, theme]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-btn';
    btn.title = theme.name;
    btn.style.background = `linear-gradient(135deg, #${theme.bg} 50%, #${theme.fg} 50%)`;
    btn.addEventListener('click', () => {
      document.getElementById('b-bg').value = theme.bg;
      document.getElementById('b-fg').value = theme.fg;
      document.getElementById('b-bg-picker').value = '#' + theme.bg;
      document.getElementById('b-fg-picker').value = '#' + theme.fg;
      updatePreview();
    });
    themeContainer.appendChild(btn);
  });

  // Populate searchable timezone combobox
  const tzHidden = document.getElementById('b-timezone');
  const tzInput = document.getElementById('b-timezone-input');
  const tzDropdown = document.getElementById('tz-dropdown');
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Build timezone data with display labels
  const tzData = TIMEZONES.map(tz => ({
    id: tz.id,
    label: `(${getTimezoneOffset(tz.id)}) ${tz.name}`,
    search: `${tz.id} ${tz.name} ${getTimezoneOffset(tz.id)}`.toLowerCase()
  }));

  function renderTzDropdown(filter) {
    const query = (filter || '').toLowerCase();
    tzDropdown.innerHTML = '';
    const matches = query ? tzData.filter(t => t.search.includes(query)) : tzData;
    matches.slice(0, 50).forEach(tz => {
      const div = document.createElement('div');
      div.className = 'tz-option';
      div.textContent = tz.label;
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectTimezone(tz);
      });
      tzDropdown.appendChild(div);
    });
  }

  function selectTimezone(tz) {
    tzHidden.value = tz.id;
    tzInput.value = tz.label;
    tzDropdown.classList.remove('open');
    updatePreview();
  }

  // Set default timezone
  const defaultTz = tzData.find(t => t.id === userTz) || tzData[0];
  selectTimezone(defaultTz);

  tzInput.addEventListener('focus', () => {
    tzInput.value = '';
    renderTzDropdown('');
    tzDropdown.classList.add('open');
  });

  tzInput.addEventListener('input', () => {
    renderTzDropdown(tzInput.value);
    tzDropdown.classList.add('open');
  });

  tzInput.addEventListener('blur', () => {
    tzDropdown.classList.remove('open');
    // Restore display label if input doesn't match
    const match = tzData.find(t => t.id === tzHidden.value);
    if (match) tzInput.value = match.label;
  });

  // Set default date to tomorrow noon in local time
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);
  // Format as local datetime string
  const localDateStr = tomorrow.getFullYear() + '-' +
    String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' +
    String(tomorrow.getDate()).padStart(2, '0') + 'T' +
    String(tomorrow.getHours()).padStart(2, '0') + ':' +
    String(tomorrow.getMinutes()).padStart(2, '0');
  document.getElementById('b-date').value = localDateStr;

  // Pre-fill from countdown params if editing
  const prefill = window._builderPrefill;
  if (prefill) {
    window._builderPrefill = null; // Clear after use

    // Timezone (set before date so conversion uses correct tz)
    if (prefill.tz) {
      const prefillTz = tzData.find(t => t.id === prefill.tz);
      if (prefillTz) selectTimezone(prefillTz);
      else {
        tzHidden.value = prefill.tz;
        tzInput.value = prefill.tz;
      }
    }

    // Date - convert UTC back to the selected timezone's local time
    if (prefill.date) {
      const tz = prefill.tz || 'UTC';
      document.getElementById('b-date').value = utcToLocal(prefill.date, tz);
    }

    // Text fields
    if (prefill.title) document.getElementById('b-title').value = decodeURIComponent(prefill.title);
    if (prefill.subtitle) document.getElementById('b-subtitle').value = decodeURIComponent(prefill.subtitle);
    if (prefill.end) document.getElementById('b-end').value = decodeURIComponent(prefill.end);

    // Colors
    if (prefill.bg) {
      document.getElementById('b-bg').value = prefill.bg;
      document.getElementById('b-bg-picker').value = '#' + prefill.bg;
    }
    if (prefill.fg) {
      document.getElementById('b-fg').value = prefill.fg;
      document.getElementById('b-fg-picker').value = '#' + prefill.fg;
    }

    // Font
    if (prefill.font) document.getElementById('b-font').value = prefill.font;

    // Units (uncheck all first, then check specified)
    ['y','mo','w','d','h','m','s','ms'].forEach(u => {
      document.getElementById('b-u-' + u).checked = false;
    });
    if (prefill.units) {
      parseUnits(prefill.units).forEach(u => {
        const shortUnit = { years: 'y', months: 'mo', weeks: 'w', days: 'd', hours: 'h', minutes: 'm', seconds: 's', milliseconds: 'ms' }[u];
        const checkbox = document.getElementById('b-u-' + shortUnit);
        if (checkbox) checkbox.checked = true;
      });
    }

    // Advanced options
    if (prefill.recur) document.getElementById('b-recur').value = prefill.recur;
    if (prefill.bgimg) document.getElementById('b-bgimg').value = decodeURIComponent(prefill.bgimg);
    if (prefill.sound) document.getElementById('b-sound').value = prefill.sound;
    if (prefill.celebrate) document.getElementById('b-celebrate').value = prefill.celebrate;
    document.getElementById('b-showtz').checked = prefill.showtz === '1';
    document.getElementById('b-progress').checked = prefill.progress === '1';
    document.getElementById('b-percent').checked = prefill.percent === '1';
    document.getElementById('b-notify').checked = prefill.notify === '1';
    document.getElementById('b-attribution').checked = prefill.attribution !== '0';

    if (prefill.start) {
      const tz = prefill.tz || 'UTC';
      document.getElementById('b-start').value = utcToLocal(prefill.start, tz);
    }

    if (prefill.redirect) {
      document.getElementById('b-redirect').value = decodeURIComponent(prefill.redirect);
      document.getElementById('redirect-delay-row').style.display = '';
    }
    if (prefill.redirectDelay) {
      document.getElementById('b-redirect-delay').value = prefill.redirectDelay;
    }

    // Show start date row if progress/percent is enabled
    if (prefill.progress === '1' || prefill.percent === '1') {
      document.getElementById('start-date-row').style.display = '';
    }

    // Don't clear URL - updatePreview will set it with current config + edit=1
  }

  // Recurrence change
  document.getElementById('b-recur').addEventListener('change', updatePreview);

  // Quick time buttons
  document.querySelectorAll('.quick-time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dateInput = document.getElementById('b-date');
      const currentVal = dateInput.value;
      if (currentVal) {
        const datePart = currentVal.split('T')[0];
        dateInput.value = datePart + 'T' + btn.dataset.time;
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const datePart = tomorrow.toISOString().slice(0, 10);
        dateInput.value = datePart + 'T' + btn.dataset.time;
      }
      updatePreview();
    });
  });

  // Sync color pickers with text inputs
  const bgPicker = document.getElementById('b-bg-picker');
  const bgText = document.getElementById('b-bg');
  const fgPicker = document.getElementById('b-fg-picker');
  const fgText = document.getElementById('b-fg');

  bgPicker.addEventListener('input', () => {
    bgText.value = bgPicker.value.slice(1);
    updatePreview();
  });
  bgText.addEventListener('input', () => {
    if (/^[0-9a-fA-F]{6}$/.test(bgText.value)) {
      bgPicker.value = '#' + bgText.value;
    }
    updatePreview();
  });
  fgPicker.addEventListener('input', () => {
    fgText.value = fgPicker.value.slice(1);
    updatePreview();
  });
  fgText.addEventListener('input', () => {
    if (/^[0-9a-fA-F]{6}$/.test(fgText.value)) {
      fgPicker.value = '#' + fgText.value;
    }
    updatePreview();
  });

  // Font selector
  document.getElementById('b-font').addEventListener('change', updatePreview);

  // Background image
  document.getElementById('b-bgimg').addEventListener('input', updatePreview);

  // Sound and celebration selectors
  document.getElementById('b-sound').addEventListener('change', updatePreview);
  document.getElementById('b-celebrate').addEventListener('change', updatePreview);

  // Progress tracking checkboxes
  const progressCheckbox = document.getElementById('b-progress');
  const percentCheckbox = document.getElementById('b-percent');
  const startDateRow = document.getElementById('start-date-row');

  function updateStartDateVisibility() {
    if (progressCheckbox.checked || percentCheckbox.checked) {
      startDateRow.style.display = '';
      // Set default start date to midnight today if not set
      const startInput = document.getElementById('b-start');
      if (!startInput.value) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const localDateStr = today.getFullYear() + '-' +
          String(today.getMonth() + 1).padStart(2, '0') + '-' +
          String(today.getDate()).padStart(2, '0') + 'T00:00';
        startInput.value = localDateStr;
      }
    } else {
      startDateRow.style.display = 'none';
    }
    updatePreview();
  }

  progressCheckbox.addEventListener('change', updateStartDateVisibility);
  percentCheckbox.addEventListener('change', updateStartDateVisibility);
  document.getElementById('b-showtz').addEventListener('change', updatePreview);
  document.getElementById('b-notify').addEventListener('change', updatePreview);
  document.getElementById('b-attribution').addEventListener('change', updatePreview);
  document.getElementById('b-start').addEventListener('input', updatePreview);

  // Add listeners to all text inputs
  const inputs = ['b-date', 'b-title', 'b-subtitle', 'b-end'];
  inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });

  // Unit checkboxes
  document.querySelectorAll('.units-grid input').forEach(cb => {
    cb.addEventListener('change', updatePreview);
  });

  // Copy functionality
  const copyUrl = () => {
    const url = getPublishUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('copy-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Link copied!';
      setTimeout(() => btn.innerHTML = originalText, 1500);
      showPublishCelebration();
    });
  };

  document.getElementById('url-output').addEventListener('click', copyUrl);
  document.getElementById('copy-btn').addEventListener('click', copyUrl);

  // Share functionality
  document.getElementById('share-btn').addEventListener('click', () => {
    const url = getPublishUrl();
    const userTitle = document.getElementById('b-title').value;
    if (!url) return;

    const shareTitle = userTitle || 'Countdown Timer';
    const shareText = userTitle ? `Counting down to ${userTitle}` : 'I made a countdown — here it is.';

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: url
      }).then(() => showPublishCelebration()).catch(() => {});
    } else {
      copyUrl();
    }
  });

  // Open in new tab
  document.getElementById('open-btn').addEventListener('click', () => {
    const url = getPublishUrl();
    if (!url) return;
    window.open(url, '_blank');
    showPublishCelebration();
  });

  // Embed button
  document.getElementById('embed-btn').addEventListener('click', (event) => {
    const publishUrl = getPublishUrl();
    if (!publishUrl) return;
    const url = publishUrl + '&embed=1';
    updateEmbedCode(url);
    openModal('embed-modal', event.currentTarget);
  });

  // Embed dimension inputs
  document.getElementById('embed-width').addEventListener('input', refreshEmbedModalCode);
  document.getElementById('embed-height').addEventListener('input', refreshEmbedModalCode);

  // Calendar button
  document.getElementById('calendar-btn').addEventListener('click', (event) => {
    openModal('calendar-modal', event.currentTarget);
  });

  // Modal action buttons
  document.getElementById('embed-copy-btn').addEventListener('click', copyEmbedCode);
  document.getElementById('calendar-download-btn').addEventListener('click', downloadICS);

  // Platform helpers (Canva / Notion)
  document.getElementById('canva-btn').addEventListener('click', (event) => {
    openModal('canva-modal', event.currentTarget);
  });
  document.getElementById('notion-btn').addEventListener('click', (event) => {
    openModal('notion-modal', event.currentTarget);
  });

  document.getElementById('canva-copy-btn').addEventListener('click', () => {
    copyPlatformUrl('canva-modal', 'Countdown link copied. Paste it into Canva Embed.');
  });
  document.getElementById('notion-copy-btn').addEventListener('click', () => {
    copyPlatformUrl('notion-modal', 'Countdown link copied. Paste it into Notion /embed.');
  });

  // Close modals on explicit close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      if (modalId) closeModal(modalId);
    });
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllOpenModals();
    });
  });

  // Preview End button - toggle between countdown and end state
  document.getElementById('preview-end-btn').addEventListener('click', function() {
    previewEndMode = !previewEndMode;
    this.textContent = previewEndMode ? 'Preview live countdown' : 'Preview finished state';

    if (previewEndMode) {
      // Show end state, play sound, and trigger celebration
      const sound = document.getElementById('b-sound').value;
      const celebrate = document.getElementById('b-celebrate').value;

      if (sound) {
        playEndSound(sound);
      }

      if (celebrate === 'confetti') {
        launchConfetti();
      } else if (celebrate === 'fireworks') {
        launchFireworks();
      }
    }

    updatePreview();
  });

  // Redirect URL validation and delay visibility
  const redirectInput = document.getElementById('b-redirect');
  const redirectError = document.getElementById('redirect-error');
  const redirectDelayRow = document.getElementById('redirect-delay-row');

  redirectInput.addEventListener('input', () => {
    const val = redirectInput.value.trim();
    if (val && !validateRedirectUrl(val)) {
      redirectError.style.display = '';
      redirectInput.setCustomValidity('URL must start with http:// or https://');
    } else {
      redirectError.style.display = 'none';
      redirectInput.setCustomValidity('');
    }
    redirectDelayRow.style.display = val ? '' : 'none';
    updatePreview();
  });

  document.getElementById('b-redirect-delay').addEventListener('input', updatePreview);

  updatePreview();
  renderHistory();
}

// Modal helper functions
let lastModalTrigger = null;

function openModal(modalId, trigger) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  lastModalTrigger = trigger || document.activeElement;
  modal.classList.add('open');
  const modalPanel = modal.querySelector('.modal');
  if (modalPanel) {
    setTimeout(() => modalPanel.focus({ preventScroll: true }), 50);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal || !modal.classList.contains('open')) return;
  modal.classList.remove('open');
  if (lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
  }
  lastModalTrigger = null;
}

function closeAllOpenModals() {
  const openOverlays = document.querySelectorAll('.modal-overlay.open');
  if (!openOverlays.length) return;
  openOverlays.forEach(overlay => {
    overlay.classList.remove('open');
  });
  if (lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
    lastModalTrigger.focus();
  }
  lastModalTrigger = null;
}

function getPublishUrl() {
  const output = document.getElementById('url-output');
  return output?.dataset.fullUrl || '';
}

let celebrationTimer = null;
function showPublishCelebration() {
  const btn = document.getElementById('support-coffee-btn');
  if (!btn) return;
  // is-published persists for the rest of the session — keeps the expanded layout
  // and the message text visible. is-celebrating only adds the rainbow + animation,
  // and is removed after 5 seconds.
  btn.classList.add('is-published');
  btn.classList.remove('is-celebrating');
  // Force a reflow so the rainbow animation restarts on each publish action.
  void btn.offsetWidth;
  btn.classList.add('is-celebrating');
  clearTimeout(celebrationTimer);
  celebrationTimer = setTimeout(() => {
    btn.classList.remove('is-celebrating');
  }, 5000);
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeAllOpenModals();
});

function updateEmbedCode(url) {
  const width = document.getElementById('embed-width').value || 400;
  const height = document.getElementById('embed-height').value || 200;
  const code = `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" style="border-radius:8px;"></iframe>`;
  document.getElementById('embed-code').value = code;
}

function refreshEmbedModalCode() {
  const publishUrl = getPublishUrl();
  if (!publishUrl) return;
  updateEmbedCode(publishUrl + '&embed=1');
}

function copyEmbedCode() {
  const code = document.getElementById('embed-code').value;
  navigator.clipboard.writeText(code).then(() => {
    closeModal('embed-modal');
    showPublishCelebration();
  });
}

function copyPlatformUrl(modalId, successMessage) {
  const url = getPublishUrl();
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    showToast(successMessage);
    closeModal(modalId);
    showPublishCelebration();
  }).catch(() => {
    showToast("Couldn't copy automatically — tap the link above to copy it manually.");
  });
}

function downloadICS() {
  const config = getBuilderConfig();
  const targetDate = parseDate(config.date);
  if (!targetDate) return;

  const url = getPublishUrl();
  const icsContent = generateICS(config.title, targetDate, url);

  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const link = document.createElement('a');
  link.download = (config.title || 'countdown') + '.ics';
  link.href = URL.createObjectURL(blob);
  link.click();
  closeModal('calendar-modal');
  showPublishCelebration();
}

// Converts a date string to the local time in a given timezone.
// For dates with offsets (e.g., "2027-01-01T00:00:00-05:00"), extracts the local part directly.
// For bare UTC dates, converts using Intl.
function utcToLocal(dateStr, timezone) {
  if (!dateStr) return '';
  try {
    // If the date has an offset, the local time is already embedded in the string
    const offsetMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?([+-]\d{2}:\d{2})$/);
    if (offsetMatch) {
      return offsetMatch[1]; // Return just the date-time part without offset
    }

    const d = parseDate(dateStr);
    if (!d) return dateStr;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d);
    const vals = {};
    parts.forEach(p => vals[p.type] = p.value);
    // Intl with hour12:false can return hour=24 for midnight — normalize
    const hr = vals.hour === '24' ? '00' : vals.hour;
    return `${vals.year}-${vals.month}-${vals.day}T${hr}:${vals.minute}`;
  } catch {
    return dateStr;
  }
}

// Returns ISO 8601 with offset: "2027-01-01T00:00:00-05:00"
// The date stays as the user typed it, with the timezone's UTC offset appended.
function localToISO(dateStr, timezone) {
  if (!dateStr) return '';
  try {
    const [datePart, timePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '00:00').split(':').map(Number);

    // Calculate the UTC offset for this timezone at this specific date/time
    const utcRef = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const tzParts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(utcRef);

    const tzValues = {};
    tzParts.forEach(p => tzValues[p.type] = parseInt(p.value) || 0);
    // Intl with hour12:false can return hour=24 for midnight — normalize to 0
    if (tzValues.hour === 24) tzValues.hour = 0;
    const tzTime = Date.UTC(tzValues.year, tzValues.month - 1, tzValues.day, tzValues.hour, tzValues.minute);
    const offsetMs = tzTime - utcRef.getTime();

    // Format offset as ±HH:MM
    const absOffset = Math.abs(offsetMs);
    const offHours = Math.floor(absOffset / 3600000);
    const offMins = Math.floor((absOffset % 3600000) / 60000);
    const sign = offsetMs >= 0 ? '+' : '-';
    const offsetStr = `${sign}${String(offHours).padStart(2, '0')}:${String(offMins).padStart(2, '0')}`;

    // Return the local time as-is with the offset appended
    const pad = (n) => String(n).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${offsetStr}`;
  } catch (e) {
    return dateStr;
  }
}

// Legacy wrapper for backwards compatibility (used by localizeExamples)
function localToUTC(dateStr, timezone) {
  if (!dateStr) return '';
  try {
    const iso = localToISO(dateStr, timezone);
    // Convert the ISO with offset to bare UTC
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().slice(0, 19);
  } catch {
    return dateStr;
  }
}

function getBuilderConfig() {
  const dateInput = document.getElementById('b-date').value;
  const timezone = document.getElementById('b-timezone').value;
  const dateISO = localToISO(dateInput, timezone);

  const startInput = document.getElementById('b-start').value;
  const startISO = startInput ? localToISO(startInput, timezone) : '';

  const units = [];
  document.querySelectorAll('.units-grid input:checked').forEach(cb => {
    units.push(cb.value);
  });

  return {
    date: dateISO,
    title: document.getElementById('b-title').value,
    subtitle: document.getElementById('b-subtitle').value,
    bg: document.getElementById('b-bg').value,
    fg: document.getElementById('b-fg').value,
    units: units.join(','),
    end: document.getElementById('b-end').value,
    recur: document.getElementById('b-recur').value,
    font: document.getElementById('b-font').value,
    bgimg: document.getElementById('b-bgimg').value,
    sound: document.getElementById('b-sound').value,
    celebrate: document.getElementById('b-celebrate').value,
    showtz: document.getElementById('b-showtz').checked,
    progress: document.getElementById('b-progress').checked,
    percent: document.getElementById('b-percent').checked,
    notify: document.getElementById('b-notify').checked,
    attribution: document.getElementById('b-attribution').checked,
    start: startISO,
    tz: timezone,
    redirect: document.getElementById('b-redirect').value,
    redirectDelay: document.getElementById('b-redirect-delay').value,
  };
}

function buildUrl(config) {
  const base = window.location.origin + window.location.pathname;
  const parts = [];

  if (config.date) parts.push('date=' + encodeURIComponent(config.date));
  if (config.title) parts.push('title=' + encodeURIComponent(config.title));
  if (config.subtitle) parts.push('subtitle=' + encodeURIComponent(config.subtitle));
  if (config.bg && config.bg !== '1a1a2e') parts.push('bg=' + config.bg);
  if (config.fg && config.fg !== 'ffffff') parts.push('fg=' + config.fg);
  if (config.font && config.font !== 'sans') parts.push('font=' + config.font);
  if (config.bgimg) parts.push('bgimg=' + encodeURIComponent(config.bgimg));
  if (config.units && config.units !== 'd,h,m,s') parts.push('units=' + config.units);
  if (config.end) parts.push('end=' + encodeURIComponent(config.end));
  if (config.recur) parts.push('recur=' + config.recur);
  if (config.sound) parts.push('sound=' + config.sound);
  if (config.celebrate) parts.push('celebrate=' + config.celebrate);
  if (config.showtz) parts.push('showtz=1');
  if (config.progress) parts.push('progress=1');
  if (config.percent) parts.push('percent=1');
  if ((config.progress || config.percent) && config.start) {
    parts.push('start=' + encodeURIComponent(config.start));
  }
  if (config.notify) parts.push('notify=1');
  if (config.attribution === false) parts.push('attribution=0');
  if (config.tz) parts.push('tz=' + encodeURIComponent(config.tz));
  if (config.redirect) {
    parts.push('redirect=' + encodeURIComponent(config.redirect));
    if (config.redirectDelay && config.redirectDelay !== '0') {
      parts.push('redirectDelay=' + config.redirectDelay);
    }
  }

  // Use query params instead of hash for better SEO/social sharing
  return base + '?' + parts.join('&');
}

function formatShareUrl(url) {
  if (!url) return '';
  const compact = url.replace(/^https?:\/\//, '');
  return compact.length > 72 ? compact.slice(0, 69) + '...' : compact;
}

function updatePreview() {
  previewSession++;
  const session = previewSession;
  const config = getBuilderConfig();
  const isPublishReady = Boolean(parseDate(config.date));

  // Update URL display
  const generatedUrl = buildUrl(config);
  const publishPanel = document.getElementById('publish-panel');
  const urlOutput = document.getElementById('url-output');
  const urlValue = document.getElementById('url-output-value');
  const urlMeta = document.getElementById('url-output-meta');
  const publishMore = document.getElementById('publish-more');
  const publishButtons = [
    'copy-btn',
    'canva-btn',
    'embed-btn',
    'notion-btn',
    'share-btn',
    'open-btn',
    'calendar-btn'
  ].map((id) => document.getElementById(id));

  publishPanel.classList.toggle('publish-panel-pending', !isPublishReady);
  publishButtons.forEach((button) => {
    button.disabled = !isPublishReady;
  });
  publishMore.classList.toggle('is-disabled', !isPublishReady);
  if (!isPublishReady) {
    publishMore.open = false;
  }

  urlOutput.disabled = !isPublishReady;
  urlOutput.dataset.fullUrl = isPublishReady ? generatedUrl : '';
  urlOutput.title = isPublishReady ? generatedUrl : 'Set a date first';
  urlValue.textContent = isPublishReady
    ? formatShareUrl(generatedUrl)
    : 'Your link will appear here';
  urlMeta.textContent = isPublishReady
    ? 'Anyone with this link can view your countdown.'
    : 'Pick a date in step 1 to generate your shareable link.';
  document.getElementById('publish-status').textContent = isPublishReady
    ? 'Copy the link, drop it in Canva, or embed it anywhere.'
    : 'Pick a date in step 1 to generate your shareable link.';

  // Update browser URL in real-time (so refresh preserves work and stays in builder)
  // Only update if we have a date set to avoid cluttering URL with defaults
  if (config.date) {
    const urlObj = new URL(generatedUrl);
    // Add edit=1 so refreshing stays in builder mode
    urlObj.searchParams.set('edit', '1');
    history.replaceState(null, '', urlObj.pathname + urlObj.search);
  }

  // Update preview frame colors
  const frame = document.getElementById('preview-frame');
  const bg = '#' + (config.bg || '1a1a2e');
  const fg = '#' + (config.fg || 'ffffff');
  frame.style.backgroundColor = bg;
  frame.style.color = fg;
  updateFavicon(fg, bg);

  // Update preview frame font
  const fontFamily = FONT_STACKS[config.font] || FONT_STACKS.sans;
  frame.style.fontFamily = fontFamily;

  // Background image preview (validated and sanitized)
  const safeBgimg = config.bgimg ? sanitizeUrlForCss(config.bgimg) : null;
  if (safeBgimg) {
    frame.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${safeBgimg}')`;
    frame.style.backgroundSize = 'cover';
    frame.style.backgroundPosition = 'center';
  } else {
    frame.style.backgroundImage = '';
  }

  // Update preview title/subtitle
  const titleEl = document.getElementById('preview-title');
  const subtitleEl = document.getElementById('preview-subtitle');
  titleEl.innerHTML = linkifyText(config.title);
  subtitleEl.innerHTML = linkifyText(config.subtitle);
  titleEl.style.display = config.title ? 'block' : 'none';
  subtitleEl.style.display = config.subtitle ? 'block' : 'none';

  // Update preview timezone display
  const previewTz = document.getElementById('preview-tz');
  const targetDateForTz = parseDate(config.date);
  if (config.showtz && targetDateForTz) {
    previewTz.textContent = `${formatLocalTime(targetDateForTz)} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
    previewTz.style.display = 'block';
  } else {
    previewTz.style.display = 'none';
  }

  // Update preview progress bar
  const previewProgressContainer = document.getElementById('preview-progress-container');
  const previewProgressFill = document.getElementById('preview-progress-fill');
  const previewProgressText = document.getElementById('preview-progress-text');
  if ((config.progress || config.percent) && config.start) {
    previewProgressContainer.style.display = 'block';
    // Show 100% when in end preview mode, otherwise 35% demo
    const progressValue = previewEndMode ? 100 : 35;
    previewProgressFill.style.width = progressValue + '%';
    if (config.percent) {
      previewProgressText.textContent = progressValue.toFixed(1) + '% complete';
    } else {
      previewProgressText.textContent = '';
    }
  } else {
    previewProgressContainer.style.display = 'none';
  }

  // Update preview countdown
  const previewCountdown = document.getElementById('preview-countdown');
  let targetDate = parseDate(config.date);
  const units = parseUnits(config.units);

  // Advance to next occurrence for recurring countdowns
  if (targetDate && config.recur) {
    targetDate = getNextOccurrence(targetDate, config.recur);
  }

  if (!targetDate) {
    previewCountdown.innerHTML = '<div style="opacity:0.5">Set a date above</div>';
    return;
  }

  // Fast-path bookkeeping: only rebuild the DOM when units change.
  // Otherwise just update the textContent of the cached value spans.
  let previewBuiltForUnits = null;
  const previewValueEls = {};

  function buildPreviewDom() {
    previewCountdown.innerHTML = '';
    previewCountdown.className = 'countdown';
    for (const k of Object.keys(previewValueEls)) delete previewValueEls[k];

    units.forEach((unit, index) => {
      const unitEl = document.createElement('div');
      unitEl.className = 'unit' + (unit === 'milliseconds' ? ' milliseconds' : '');

      const valueEl = document.createElement('span');
      valueEl.className = 'value';
      previewValueEls[unit] = valueEl;

      const labelEl = document.createElement('span');
      labelEl.className = 'label';
      labelEl.textContent = UNIT_CONFIG[unit].label;

      unitEl.appendChild(valueEl);
      unitEl.appendChild(labelEl);
      previewCountdown.appendChild(unitEl);

      const timeUnits = ['hours', 'minutes', 'seconds'];
      const nextUnit = units[index + 1];
      if (nextUnit && timeUnits.includes(unit) && timeUnits.includes(nextUnit)) {
        const sep = document.createElement('span');
        sep.className = 'separator';
        sep.textContent = ':';
        previewCountdown.appendChild(sep);
      }
    });
    previewBuiltForUnits = units.join(',');
  }

  function updatePreviewCountdown() {
    if (session !== previewSession) return;

    // If in end preview mode, show end message
    if (previewEndMode) {
      previewCountdown.innerHTML = '<div class="end-message">' + linkifyText(config.end || DEFAULTS.end) + '</div>';
      previewCountdown.className = 'countdown';
      previewBuiltForUnits = null;
      return;
    }

    if (targetDate.getTime() <= Date.now()) {
      previewCountdown.innerHTML = '<div class="end-message">' + linkifyText(config.end || DEFAULTS.end) + '</div>';
      previewBuiltForUnits = null;
      return;
    }

    const values = calculateTimeUnits(targetDate, units);
    const unitsKey = units.join(',');
    if (previewBuiltForUnits !== unitsKey) {
      buildPreviewDom();
    }
    // Fast path: just update textContent of the cached value spans.
    units.forEach((unit) => {
      const el = previewValueEls[unit];
      if (!el) return;
      const newVal = padValue(values[unit], unit);
      if (el.textContent !== newVal) el.textContent = newVal;
    });

    const interval = units.includes('milliseconds') ? 50 : 250;
    setTimeout(updatePreviewCountdown, interval);
  }

  updatePreviewCountdown();
}

// Initialize on load and URL changes
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('hashchange', init); // For backwards compatibility with hash URLs
window.addEventListener('popstate', init); // For browser back/forward with query params

// Recheck layout on resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    lastVerticalState = false; // Reset to recheck
    const countdown = document.getElementById('countdown');
    if (countdown && countdown.children.length > 0) {
      countdown.classList.remove('vertical');
      requestAnimationFrame(() => {
        const needsVertical = countdown.scrollWidth > countdown.clientWidth + 2;
        lastVerticalState = needsVertical;
        countdown.classList.toggle('vertical', needsVertical);
      });
    }
  }, 100);
});

// Countdown page share button
document.getElementById('countdown-share').addEventListener('click', async () => {
  const url = window.location.href;
  const title = document.getElementById('title').textContent || 'Countdown';

  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch (e) {
      // User cancelled or error
    }
  } else {
    await navigator.clipboard.writeText(url);
    const btn = document.getElementById('countdown-share');
    btn.style.color = 'rgba(255,255,255,0.8)';
    setTimeout(() => btn.style.color = '', 1500);
  }
});

// Fullscreen toggle
document.getElementById('countdown-fullscreen').addEventListener('click', () => {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    // Enter fullscreen
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
});

// Edit button - navigate to builder with current params pre-filled
document.getElementById('countdown-edit').addEventListener('click', () => {
  // Navigate to builder with edit param
  const currentParams = new URLSearchParams(window.location.search);
  if (!currentParams.has('date')) {
    // Fall back to hash params if using old-style URL
    const hashParams = parseHash();
    Object.entries(hashParams).forEach(([k, v]) => currentParams.set(k, v));
  }
  currentParams.set('edit', '1');
  window.location.search = currentParams.toString();
});

// Accordion functionality
function syncAccordionHeight(item) {
  const content = item?.querySelector('.accordion-content');
  if (!content) return;
  content.style.maxHeight = item.classList.contains('open') ? content.scrollHeight + 'px' : '0px';
}

// Re-sync the accordion height when lazy-loaded media inside finishes loading,
// otherwise the panel clips below the late-arriving iframes/images.
const accordionMediaTracked = new WeakSet();
function trackAccordionMedia(item) {
  const content = item?.querySelector('.accordion-content');
  if (!content) return;
  content.querySelectorAll('iframe, img[loading="lazy"]').forEach(el => {
    if (accordionMediaTracked.has(el)) return;
    accordionMediaTracked.add(el);
    el.addEventListener('load', () => {
      if (item.classList.contains('open')) syncAccordionHeight(item);
    });
  });
}

document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const item = header.parentElement;
    item.classList.toggle('open');
    syncAccordionHeight(item);
    if (item.classList.contains('open')) trackAccordionMedia(item);
  });
});

document.querySelectorAll('.accordion-item').forEach(syncAccordionHeight);
window.addEventListener('resize', () => {
  document.querySelectorAll('.accordion-item.open').forEach(syncAccordionHeight);
});

// Hash-based deep linking into documentation sections (e.g. #how-to-embed)
function openAccordionForTarget(target) {
  const accordion = target.closest('.accordion-content');
  if (!accordion) return;
  const accordionItem = accordion.parentElement;
  accordionItem.classList.add('open');
  syncAccordionHeight(accordionItem);
}

function scrollToHashTarget() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const target = document.getElementById(hash);
  if (!target) return;
  // Open the accordion containing the target
  openAccordionForTarget(target);
  // Show the builder view if it's hidden (documentation lives in the builder)
  const builder = document.getElementById('builder-view');
  if (builder && builder.style.display === 'none') {
    builder.style.display = '';
    document.getElementById('countdown-view').style.display = 'none';
  }
  setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}
scrollToHashTarget();
window.addEventListener('hashchange', scrollToHashTarget);

// Ensure subtitle links open their docs accordion section even on repeat clicks
document.querySelectorAll('.builder-subtitle a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href || href.length < 2) return;
    const hash = href.startsWith('#') ? href : '#' + href;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    e.preventDefault();
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      openAccordionForTarget(target);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}