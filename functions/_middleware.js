// Cloudflare Pages Middleware for dynamic OG meta tags
// This intercepts requests and modifies the HTML to include proper social sharing metadata

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Only process HTML requests to the root path with query params
  if (url.pathname !== '/' || !url.searchParams.has('date')) {
    return next();
  }

  // Get the original response
  const response = await next();

  // Only transform HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Extract params for OG tags
  const title = url.searchParams.get('title') || 'Countdown Timer';
  const subtitle = url.searchParams.get('subtitle') || '';
  const date = url.searchParams.get('date') || '';

  // Format the date for display
  let dateDisplay = '';
  if (date) {
    try {
      const d = new Date(date + 'Z');
      if (!isNaN(d.getTime())) {
        dateDisplay = d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC'
        });
      }
    } catch (e) {}
  }

  // Build description
  let description = subtitle || `Counting down to ${dateDisplay || 'an event'}`;
  if (subtitle && dateDisplay) {
    description = `${subtitle} - ${dateDisplay}`;
  }

  // Build the full title
  const ogTitle = title === 'Countdown Timer' ? 'Countdown Timer' : `${title} - Countdown`;
  const fullUrl = url.toString();

  // Use HTMLRewriter to modify meta tags
  return new HTMLRewriter()
    .on('title', new TextRewriter(ogTitle))
    .on('meta[property="og:title"]', new AttributeRewriter('content', ogTitle))
    .on('meta[property="og:description"]', new AttributeRewriter('content', description))
    .on('meta[property="og:url"]', new AttributeRewriter('content', fullUrl))
    .on('meta[name="description"]', new AttributeRewriter('content', description))
    .on('link[rel="canonical"]', new AttributeRewriter('href', fullUrl))
    .transform(response);
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
