const DEFAULTS = {
  fg: '#ffffff',
  bg: '#1a1a2e',
  units: ['days', 'hours', 'minutes', 'seconds'],
  end: 'Event Started!',
  mode: 'down',
  font: 'sans'
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

// QR Code - uses free external API service (goqr.me / api.qrserver.com)

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

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) : str;
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

function calculateTimeUnits(targetDate, units, mode = 'down') {
  const result = {};
  let current = new Date();
  const target = new Date(targetDate);

  // For count-up mode, swap current and target
  if (mode === 'up') {
    if (target > current) {
      // Count-up hasn't started yet
      return units.reduce((acc, u) => { acc[u] = 0; return acc; }, {});
    }
    // Swap for calculation
    const temp = current;
    current = new Date(target);
    target.setTime(temp.getTime());
  } else {
    // Count-down mode: if target is in the past, return zeros
    if (target <= current) {
      return units.reduce((acc, u) => { acc[u] = 0; return acc; }, {});
    }
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

  for (const { name, ms } of fixedUnits) {
    if (units.includes(name)) {
      result[name] = Math.floor(remainingMs / ms);
      remainingMs = remainingMs % ms;
    }
  }

  // Ceiling logic: if there's any remainder below smallest displayed unit,
  // increment that unit by 1 (so countdown shows 1 until fully complete)
  if (remainingMs > 0) {
    const allUnitsInOrder = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'];
    for (let i = allUnitsInOrder.length - 1; i >= 0; i--) {
      const unit = allUnitsInOrder[i];
      if (result[unit] !== undefined) {
        result[unit]++;
        break;
      }
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

function renderCountdown(values, units, isLarge) {
  const countdown = document.getElementById('countdown');
  countdown.innerHTML = '';
  countdown.className = 'countdown' + (isLarge ? ' large' : '') + (lastVerticalState ? ' vertical' : '');

  units.forEach((unit, index) => {
    const unitEl = document.createElement('div');
    unitEl.className = 'unit' + (unit === 'milliseconds' ? ' milliseconds' : '');

    const valueEl = document.createElement('span');
    valueEl.className = 'value';
    valueEl.textContent = padValue(values[unit], unit);

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = UNIT_CONFIG[unit].label;

    unitEl.appendChild(valueEl);
    unitEl.appendChild(labelEl);
    countdown.appendChild(unitEl);

    // Add colon separator only between time units (h:m:s)
    const timeUnits = ['hours', 'minutes', 'seconds'];
    const nextUnit = units[index + 1];
    if (nextUnit && timeUnits.includes(unit) && timeUnits.includes(nextUnit)) {
      const sep = document.createElement('span');
      sep.className = 'separator';
      sep.textContent = ':';
      countdown.appendChild(sep);
    }
  });

  // Check for overflow and switch to vertical if needed
  requestAnimationFrame(() => {
    const needsVertical = countdown.scrollWidth > countdown.clientWidth + 2;
    if (needsVertical !== lastVerticalState) {
      lastVerticalState = needsVertical;
      countdown.classList.toggle('vertical', needsVertical);
    }
  });
}

function renderEndMessage(message, isLarge) {
  const countdown = document.getElementById('countdown');
  countdown.innerHTML = '';
  countdown.className = 'countdown';

  const msgEl = document.createElement('div');
  msgEl.className = 'end-message' + (isLarge ? ' large' : '');
  msgEl.innerHTML = linkifyText(message);
  countdown.appendChild(msgEl);
}

let currentSession = 0;

function showCountdown() {
  document.getElementById('countdown-view').style.display = '';
  document.getElementById('builder-view').style.display = 'none';
  document.body.classList.remove('builder-mode');
}

function showBuilder() {
  document.getElementById('countdown-view').style.display = 'none';
  document.getElementById('builder-view').style.display = '';
  document.body.classList.add('builder-mode');

  // Apply saved builder theme preference
  const savedBuilderTheme = localStorage.getItem('builderTheme');
  if (savedBuilderTheme === 'light') {
    document.body.classList.add('builder-light');
  } else {
    document.body.classList.remove('builder-light');
  }

  document.body.style.color = DEFAULTS.fg;
  document.body.style.backgroundColor = DEFAULTS.bg;
  document.title = 'count.live - Free Online Countdown Timer | Create & Share';
  initBuilder();
}

function init() {
  currentSession++;
  const session = currentSession;
  const params = parseHash();

  // SEO: Only index the homepage, not individual countdown pages
  const robotsMeta = document.getElementById('robots-meta');
  if (params.date) {
    robotsMeta.content = 'noindex, nofollow';
  } else {
    robotsMeta.content = 'index, follow';
  }

  // Hide all views first
  document.getElementById('countdown-view').style.display = 'none';
  document.getElementById('builder-view').style.display = 'none';
  document.getElementById('calc-view').style.display = 'none';
  document.getElementById('multi-view').style.display = 'none';
  document.body.classList.remove('builder-mode', 'embed-mode', 'has-bg-image');

  // Calculator mode
  if (params.calc === '1') {
    showCalculator();
    return;
  }

  // Show builder if no date
  if (!params.date) {
    showBuilder();
    return;
  }

  // Check for multi-countdown mode
  if (params.multi === '1') {
    initMultiCountdown(params);
    return;
  }

  showCountdown();

  // Embed mode - minimal UI
  if (params.embed === '1') {
    document.body.classList.add('embed-mode');
  }

  // Parse mode (count up or down)
  const mode = params.mode === 'up' ? 'up' : 'down';

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

  // Apply font
  const font = params.font && FONT_STACKS[params.font] ? params.font : 'sans';
  document.body.style.fontFamily = FONT_STACKS[font];

  // Apply background image
  if (params.bgimg) {
    try {
      const bgUrl = decodeURIComponent(params.bgimg);
      if (bgUrl.match(/^https?:\/\//i)) {
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
  const endMessage = truncate(params.end, MAX_LENGTHS.end) || (mode === 'up' ? 'Started!' : DEFAULTS.end);
  const recur = params.recur;
  const sound = params.sound;
  const celebrate = params.celebrate;
  const notify = params.notify === '1';
  const showTz = params.showtz === '1';
  const showProgress = params.progress === '1';
  const showPercent = params.percent === '1';
  const startDate = params.start ? parseDate(params.start) : null;

  if (!targetDate) {
    renderEndMessage('Invalid or missing date', isLarge);
    return;
  }

  // Handle recurring countdown
  if (recur && mode === 'down') {
    targetDate = getNextOccurrence(targetDate, recur);
  }

  // Request notification permission if enabled
  if (notify) {
    requestNotificationPermission();
  }

  // Show timezone display
  const tzDisplay = document.getElementById('timezone-display');
  if (showTz) {
    tzDisplay.textContent = `Event: ${formatLocalTime(targetDate)} (your time)`;
    tzDisplay.style.display = 'block';
  } else {
    tzDisplay.style.display = 'none';
  }

  // Setup progress tracking
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  if ((showProgress || showPercent) && startDate && mode === 'down') {
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
    if ((showProgress || showPercent) && startDate && mode === 'down') {
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

    // Count-up mode runs indefinitely
    if (mode === 'up') {
      const values = calculateTimeUnits(targetDate, units, 'up');
      renderCountdown(values, units, isLarge);
      const countdownStr = formatTitleCountdown(values, units);
      document.title = title ? `${countdownStr} - ${title}` : countdownStr;
      const interval = units.includes('milliseconds') ? 16 : 100;
      requestAnimationFrame(() => setTimeout(update, interval));
      return;
    }

    // Count-down mode
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
        }
      }, 500);
      return;
    }

    if (showingZero) return;

    const values = calculateTimeUnits(targetDate, units, mode);
    renderCountdown(values, units, isLarge);

    const countdownStr = formatTitleCountdown(values, units);
    document.title = title ? `${countdownStr} - ${title}` : countdownStr;

    const interval = units.includes('milliseconds') ? 16 : 100;
    requestAnimationFrame(() => setTimeout(update, interval));
  }

  update();
}

// Calculator view
function showCalculator() {
  document.getElementById('countdown-view').style.display = 'none';
  document.getElementById('builder-view').style.display = 'none';
  document.getElementById('multi-view').style.display = 'none';
  document.getElementById('calc-view').style.display = '';
  document.body.classList.remove('builder-mode');
  document.body.style.color = DEFAULTS.fg;
  document.body.style.backgroundColor = DEFAULTS.bg;
  document.body.style.fontFamily = FONT_STACKS.sans;
  document.title = 'Date Calculator - count.live';
  initCalculator();
}

let calcInitialized = false;
function initCalculator() {
  if (calcInitialized) return;
  calcInitialized = true;

  const startInput = document.getElementById('calc-start');
  const endInput = document.getElementById('calc-end');

  // Set defaults
  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  startInput.value = today.toISOString().slice(0, 10);
  endInput.value = nextYear.toISOString().slice(0, 10);

  function updateCalcResults() {
    const start = new Date(startInput.value + 'T00:00:00');
    const end = new Date(endInput.value + 'T00:00:00');

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

    const diff = Math.abs(end - start);
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(diff / (30.44 * 24 * 60 * 60 * 1000));
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor(diff / (60 * 1000));

    const grid = document.getElementById('calc-result-grid');
    grid.innerHTML = `
      <div class="calc-result-item"><span class="calc-result-value">${years}</span><div class="calc-result-label">Years</div></div>
      <div class="calc-result-item"><span class="calc-result-value">${months}</span><div class="calc-result-label">Months</div></div>
      <div class="calc-result-item"><span class="calc-result-value">${weeks}</span><div class="calc-result-label">Weeks</div></div>
      <div class="calc-result-item"><span class="calc-result-value">${days.toLocaleString()}</span><div class="calc-result-label">Days</div></div>
      <div class="calc-result-item"><span class="calc-result-value">${hours.toLocaleString()}</span><div class="calc-result-label">Hours</div></div>
      <div class="calc-result-item"><span class="calc-result-value">${minutes.toLocaleString()}</span><div class="calc-result-label">Minutes</div></div>
    `;
  }

  startInput.addEventListener('change', updateCalcResults);
  endInput.addEventListener('change', updateCalcResults);
  updateCalcResults();

  document.getElementById('calc-create').addEventListener('click', () => {
    const end = new Date(endInput.value + 'T00:00:00');
    const url = window.location.origin + window.location.pathname + '#date=' + encodeURIComponent(end.toISOString().slice(0, 19));
    window.location.href = url;
  });

  document.getElementById('calc-back').addEventListener('click', () => {
    window.location.hash = '';
  });
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
    container.innerHTML = '<p style="opacity:0.5">No countdowns configured</p>';
    return;
  }

  const units = parseUnits(params.units);
  document.title = countdowns[0].title || 'Multiple Countdowns';

  countdowns.forEach((cd, index) => {
    const item = document.createElement('div');
    item.className = 'countdown-item';
    item.id = 'countdown-' + (index + 1);
    item.innerHTML = `
      <h1 class="title">${escapeHtml(cd.title)}</h1>
      <div class="countdown" id="countdown-inner-${index + 1}"></div>
    `;
    container.appendChild(item);

    if (!cd.date) return;

    let ended = false;
    function updateMulti() {
      if (ended) return;
      const countdownEl = document.getElementById('countdown-inner-' + (index + 1));
      if (!countdownEl) return;

      if (cd.date.getTime() <= Date.now()) {
        ended = true;
        countdownEl.innerHTML = `<div class="end-message">${linkifyText(cd.end)}</div>`;
        return;
      }

      const values = calculateTimeUnits(cd.date, units);
      countdownEl.innerHTML = '';
      units.forEach((unit, idx) => {
        const unitEl = document.createElement('div');
        unitEl.className = 'unit';
        unitEl.innerHTML = `<span class="value">${padValue(values[unit], unit)}</span><span class="label">${UNIT_CONFIG[unit].label}</span>`;
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

      setTimeout(updateMulti, 100);
    }
    updateMulti();
  });
}

// Builder functionality
let builderInitialized = false;
let previewSession = 0;
let previewEndMode = false;

// Common timezones with friendly names
const TIMEZONES = [
  { id: 'Pacific/Honolulu', name: 'Hawaii' },
  { id: 'America/Anchorage', name: 'Alaska' },
  { id: 'America/Los_Angeles', name: 'Pacific Time (US & Canada)' },
  { id: 'America/Denver', name: 'Mountain Time (US & Canada)' },
  { id: 'America/Chicago', name: 'Central Time (US & Canada)' },
  { id: 'America/New_York', name: 'Eastern Time (US & Canada)' },
  { id: 'America/Sao_Paulo', name: 'Sao Paulo' },
  { id: 'America/Argentina/Buenos_Aires', name: 'Buenos Aires' },
  { id: 'Atlantic/Cape_Verde', name: 'Cape Verde' },
  { id: 'UTC', name: 'UTC' },
  { id: 'Europe/London', name: 'London, Dublin, Lisbon' },
  { id: 'Europe/Paris', name: 'Paris, Berlin, Amsterdam' },
  { id: 'Europe/Helsinki', name: 'Helsinki, Kyiv, Riga' },
  { id: 'Europe/Moscow', name: 'Moscow, St. Petersburg' },
  { id: 'Asia/Dubai', name: 'Dubai, Abu Dhabi' },
  { id: 'Asia/Karachi', name: 'Karachi, Islamabad' },
  { id: 'Asia/Kolkata', name: 'Mumbai, New Delhi' },
  { id: 'Asia/Dhaka', name: 'Dhaka' },
  { id: 'Asia/Bangkok', name: 'Bangkok, Hanoi, Jakarta' },
  { id: 'Asia/Singapore', name: 'Singapore, Kuala Lumpur' },
  { id: 'Asia/Hong_Kong', name: 'Hong Kong' },
  { id: 'Asia/Shanghai', name: 'Beijing, Shanghai' },
  { id: 'Asia/Tokyo', name: 'Tokyo, Osaka' },
  { id: 'Asia/Seoul', name: 'Seoul' },
  { id: 'Australia/Sydney', name: 'Sydney, Melbourne' },
  { id: 'Pacific/Auckland', name: 'Auckland, Wellington' }
];

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

function initBuilder() {
  if (builderInitialized) {
    updatePreview();
    return;
  }
  builderInitialized = true;

  // Builder theme toggle (light/dark mode for the builder UI itself)
  const builderThemeToggle = document.getElementById('builder-theme-toggle');
  if (builderThemeToggle) {
    // Check for saved preference
    const savedBuilderTheme = localStorage.getItem('builderTheme');
    if (savedBuilderTheme === 'light') {
      document.body.classList.add('builder-light');
    }

    builderThemeToggle.addEventListener('click', () => {
      document.body.classList.toggle('builder-light');
      localStorage.setItem('builderTheme',
        document.body.classList.contains('builder-light') ? 'light' : 'dark'
      );
    });
  }

  // Populate theme presets
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

  // Populate timezone dropdown
  const tzSelect = document.getElementById('b-timezone');
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Check if user's timezone is in the list
  const userTzInList = TIMEZONES.find(tz => tz.id === userTz);

  // Build timezone list, adding user's timezone if not present
  let allTimezones = [...TIMEZONES];
  if (!userTzInList) {
    allTimezones.unshift({ id: userTz, name: userTz.replace(/_/g, ' ').split('/').pop() });
  }

  allTimezones.forEach(tz => {
    const option = document.createElement('option');
    option.value = tz.id;
    const offset = getTimezoneOffset(tz.id);
    option.textContent = `(${offset}) ${tz.name}`;
    if (tz.id === userTz) option.selected = true;
    tzSelect.appendChild(option);
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

  tzSelect.addEventListener('change', updatePreview);

  // Mode change handler
  document.getElementById('b-mode').addEventListener('change', function() {
    const recurRow = document.getElementById('recur-row');
    if (this.value === 'up') {
      recurRow.style.display = 'none';
    } else {
      recurRow.style.display = '';
    }
    updatePreview();
  });

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
    const url = document.getElementById('url-output').textContent;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('copy-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      setTimeout(() => btn.innerHTML = originalText, 1500);
    });
  };

  document.getElementById('url-output').addEventListener('click', copyUrl);
  document.getElementById('copy-btn').addEventListener('click', copyUrl);

  // Share functionality
  document.getElementById('share-btn').addEventListener('click', () => {
    const url = document.getElementById('url-output').textContent;
    const title = document.getElementById('b-title').value || 'Countdown Timer';

    if (navigator.share) {
      navigator.share({
        title: title,
        text: 'Check out this countdown!',
        url: url
      }).catch(() => {});
    } else {
      copyUrl();
    }
  });

  // Open in new tab
  document.getElementById('open-btn').addEventListener('click', () => {
    const url = document.getElementById('url-output').textContent;
    window.open(url, '_blank');
  });

  // Embed button
  document.getElementById('embed-btn').addEventListener('click', () => {
    const url = document.getElementById('url-output').textContent + '&embed=1';
    updateEmbedCode(url);
    document.getElementById('embed-modal').classList.add('open');
  });

  // Embed dimension inputs
  document.getElementById('embed-width').addEventListener('input', () => {
    const url = document.getElementById('url-output').textContent + '&embed=1';
    updateEmbedCode(url);
  });
  document.getElementById('embed-height').addEventListener('input', () => {
    const url = document.getElementById('url-output').textContent + '&embed=1';
    updateEmbedCode(url);
  });

  // QR button
  document.getElementById('qr-btn').addEventListener('click', () => {
    const url = document.getElementById('url-output').textContent;
    generateQRCode(url);
    document.getElementById('qr-modal').classList.add('open');
  });

  // Calendar button
  document.getElementById('calendar-btn').addEventListener('click', () => {
    document.getElementById('calendar-modal').classList.add('open');
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  });

  // Preview End button - toggle between countdown and end state
  document.getElementById('preview-end-btn').addEventListener('click', function() {
    previewEndMode = !previewEndMode;
    this.textContent = previewEndMode ? 'Preview Countdown' : 'Preview End';

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

  updatePreview();
}

// Modal helper functions
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

function updateEmbedCode(url) {
  const width = document.getElementById('embed-width').value || 400;
  const height = document.getElementById('embed-height').value || 200;
  const code = `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" style="border-radius:8px;"></iframe>`;
  document.getElementById('embed-code').value = code;
}

function copyEmbedCode() {
  const code = document.getElementById('embed-code').value;
  navigator.clipboard.writeText(code).then(() => {
    closeModal('embed-modal');
  });
}

function generateQRCode(url) {
  const canvas = document.getElementById('qr-canvas');
  const size = 200;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Show loading state
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#666666';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Loading...', size / 2, size / 2);

  // Use free QR code API service
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
  };
  img.onerror = function() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#cc0000';
    ctx.fillText('Failed to load QR', size / 2, size / 2);
  };
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

function downloadQR() {
  const canvas = document.getElementById('qr-canvas');
  const link = document.createElement('a');
  link.download = 'countdown-qr.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  closeModal('qr-modal');
}

function downloadICS() {
  const config = getBuilderConfig();
  const targetDate = parseDate(config.date);
  if (!targetDate) return;

  const url = document.getElementById('url-output').textContent;
  const icsContent = generateICS(config.title, targetDate, url);

  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const link = document.createElement('a');
  link.download = (config.title || 'countdown') + '.ics';
  link.href = URL.createObjectURL(blob);
  link.click();
  closeModal('calendar-modal');
}

function localToUTC(dateStr, timezone) {
  if (!dateStr) return '';
  try {
    // Parse the input datetime string (e.g., "2026-01-27T12:00")
    const [datePart, timePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    // Create a reference UTC date with these values
    const utcRef = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

    // Find what time it shows in the target timezone
    const tzParts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(utcRef);

    const tzValues = {};
    tzParts.forEach(p => tzValues[p.type] = parseInt(p.value) || 0);

    // Calculate offset: how much the timezone differs from UTC
    const tzTime = Date.UTC(tzValues.year, tzValues.month - 1, tzValues.day, tzValues.hour, tzValues.minute);
    const offset = tzTime - utcRef.getTime();

    // User's intended UTC time = their local time - offset
    const targetUTC = new Date(utcRef.getTime() - offset);
    return targetUTC.toISOString().slice(0, 19);
  } catch (e) {
    return dateStr;
  }
}

function getBuilderConfig() {
  const dateInput = document.getElementById('b-date').value;
  const timezone = document.getElementById('b-timezone').value;
  const dateUTC = localToUTC(dateInput, timezone);

  const startInput = document.getElementById('b-start').value;
  const startUTC = startInput ? localToUTC(startInput, timezone) : '';

  const units = [];
  document.querySelectorAll('.units-grid input:checked').forEach(cb => {
    units.push(cb.value);
  });

  return {
    date: dateUTC,
    title: document.getElementById('b-title').value,
    subtitle: document.getElementById('b-subtitle').value,
    bg: document.getElementById('b-bg').value,
    fg: document.getElementById('b-fg').value,
    units: units.join(','),
    end: document.getElementById('b-end').value,
    mode: document.getElementById('b-mode').value,
    recur: document.getElementById('b-recur').value,
    font: document.getElementById('b-font').value,
    bgimg: document.getElementById('b-bgimg').value,
    sound: document.getElementById('b-sound').value,
    celebrate: document.getElementById('b-celebrate').value,
    showtz: document.getElementById('b-showtz').checked,
    progress: document.getElementById('b-progress').checked,
    percent: document.getElementById('b-percent').checked,
    notify: document.getElementById('b-notify').checked,
    start: startUTC
  };
}

function buildUrl(config) {
  const base = window.location.origin + window.location.pathname;
  const parts = [];

  if (config.date) parts.push('date=' + encodeURIComponent(config.date));
  if (config.mode && config.mode !== 'down') parts.push('mode=' + config.mode);
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

  return base + '#' + parts.join('&');
}

function updatePreview() {
  previewSession++;
  const session = previewSession;
  const config = getBuilderConfig();

  // Update URL
  document.getElementById('url-output').textContent = buildUrl(config);

  // Update preview frame colors
  const frame = document.getElementById('preview-frame');
  const bg = '#' + (config.bg || '1a1a2e');
  const fg = '#' + (config.fg || 'ffffff');
  frame.style.backgroundColor = bg;
  frame.style.color = fg;

  // Update preview frame font
  const fontFamily = FONT_STACKS[config.font] || FONT_STACKS.sans;
  frame.style.fontFamily = fontFamily;

  // Background image preview
  if (config.bgimg && config.bgimg.match(/^https?:\/\//i)) {
    frame.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${config.bgimg}')`;
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
    previewTz.textContent = `Event: ${formatLocalTime(targetDateForTz)} (your time)`;
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
  const targetDate = parseDate(config.date);
  const units = parseUnits(config.units);

  if (!targetDate) {
    previewCountdown.innerHTML = '<div style="opacity:0.5">Set a date above</div>';
    return;
  }

  function updatePreviewCountdown() {
    if (session !== previewSession) return;

    // If in end preview mode, show end message
    if (previewEndMode) {
      previewCountdown.innerHTML = '<div class="end-message">' + linkifyText(config.end || DEFAULTS.end) + '</div>';
      previewCountdown.className = 'countdown';
      return;
    }

    if (targetDate.getTime() <= Date.now()) {
      previewCountdown.innerHTML = '<div class="end-message">' + linkifyText(config.end || DEFAULTS.end) + '</div>';
      return;
    }

    const values = calculateTimeUnits(targetDate, units);
    previewCountdown.innerHTML = '';
    previewCountdown.className = 'countdown';

    units.forEach((unit, index) => {
      const unitEl = document.createElement('div');
      unitEl.className = 'unit' + (unit === 'milliseconds' ? ' milliseconds' : '');

      const valueEl = document.createElement('span');
      valueEl.className = 'value';
      valueEl.textContent = padValue(values[unit], unit);

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

    const interval = units.includes('milliseconds') ? 50 : 250;
    setTimeout(updatePreviewCountdown, interval);
  }

  updatePreviewCountdown();
}

// Initialize on load and hash change
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('hashchange', init);

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

// Accordion functionality
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const item = header.parentElement;
    item.classList.toggle('open');
  });
});