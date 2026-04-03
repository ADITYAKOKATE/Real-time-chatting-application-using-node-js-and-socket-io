const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// Simple in-memory cache (replace with Redis in production)
const previewCache = new Map();

const extractLinkPreviews = async (text) => {
  const urlRegex = /https?:\/\/[^\s<>"]+/g;
  const urls = [...new Set(text.match(urlRegex) || [])].slice(0, 3); // max 3 previews
  if (urls.length === 0) return [];

  const previews = [];

  for (const url of urls) {
    try {
      // Check cache
      if (previewCache.has(url)) {
        previews.push(previewCache.get(url));
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SlackCloneBot/1.0)' },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) continue;

      const html = await res.text();
      const preview = parseOGTags(url, html);

      if (preview.title || preview.description) {
        previewCache.set(url, preview);
        if (previewCache.size > 500) {
          const firstKey = previewCache.keys().next().value;
          previewCache.delete(firstKey);
        }
        previews.push(preview);
      }
    } catch (e) {
      // Silently skip failed previews
    }
  }

  return previews;
};

const parseOGTags = (url, html) => {
  const getTag = (property) => {
    const match = html.match(
      new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i')
    );
    return match ? match[1].trim() : '';
  };

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const favicon = new URL(url).origin + '/favicon.ico';

  return {
    url,
    title: getTag('og:title') || getTag('twitter:title') || (titleMatch ? titleMatch[1].trim() : ''),
    description: getTag('og:description') || getTag('twitter:description') || getTag('description'),
    image: getTag('og:image') || getTag('twitter:image') || '',
    siteName: getTag('og:site_name') || new URL(url).hostname,
    favicon,
  };
};

module.exports = { extractLinkPreviews };
