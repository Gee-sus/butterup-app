const fallbackOrigin = 'http://127.0.0.1:8000';
const envOrigin = import.meta.env?.VITE_API_ORIGIN?.trim();
const envApiBase = import.meta.env?.VITE_API_BASE?.trim();

const API_BASE = (
  (envOrigin && envOrigin.length)
    ? envOrigin
    : (envApiBase && envApiBase.length)
      ? envApiBase.replace(/\/api$/, '')
      : fallbackOrigin
).replace(/\/+$/, '');

const API_BASE_NO_TRAILING_SLASH = API_BASE.replace(/\/+$/, '');
const FALLBACK_PATTERNS = [
  /\/static\/brands\//i,
  /\/assets\/brands\//i,
  /\/placeholder/i,
  /\/media\/products\/placeholder/i,
];

const absolutize = (url) => {
  if (!url) return null;
  const str = String(url).trim();
  if (!str || str === '[object Object]') return null;
  if (/^(https?:)?\/\//i.test(str) || /^data:|^blob:/i.test(str)) return str;
  
  // Handle static assets from public folder (served by Vite)
  if (str.startsWith('/images/') || str.startsWith('/assets/') || str.startsWith('/static/')) {
    return str; // Let Vite serve these directly
  }
  
  return `${API_BASE_NO_TRAILING_SLASH}${str.startsWith('/') ? '' : '/'}${str}`;
};

const valueToString = (candidate) => {
  if (!candidate) return null;
  if (typeof candidate === 'string') return candidate;
  if (typeof candidate === 'object') {
    if (typeof candidate.file_url === 'string') return candidate.file_url;
    if (typeof candidate.url === 'string') return candidate.url;
    if (typeof candidate.file === 'string') return candidate.file;
    if (typeof candidate.path === 'string') return candidate.path;
    if (typeof candidate.src === 'string') return candidate.src;
    if (typeof candidate.href === 'string') return candidate.href;
    if (typeof candidate.toString === 'function') {
      const str = candidate.toString();
      if (str && str !== '[object Object]') return str;
    }
  }
  return null;
};

const enqueueNested = (queue, current) => {
  const nested = [
    current && typeof current === 'object' ? current.originalProduct : null,
    current && typeof current === 'object' ? current.raw : null,
    current && typeof current === 'object' ? current.primary_image : null,
  ];

  for (const candidate of nested) {
    if (candidate && typeof candidate === 'object') {
      queue.push(candidate);
    }
  }
};

const collectCandidateUrls = (product) => {
  const queue = [product];
  const seen = new Set();
  const urls = [];

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    const directCandidates = [
      current.image_url,
      current.imageUrl,
      current.image,
      current.photo_url,
      current.thumbnail_url,
      current.picture,
      current.photo,
      current.media_url,
      current.media?.url,
    ];

    for (const candidate of directCandidates) {
      const resolved = absolutize(valueToString(candidate));
      if (resolved) urls.push(resolved);
    }

    const arrayCandidates = [
      current.image_assets,
      current.images,
      current.media?.images,
    ];

    for (const arr of arrayCandidates) {
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        const resolved = absolutize(
          valueToString(
            (item && typeof item === 'object')
              ? item.file_url || item.url || item.file || item.path || (typeof item.toString === 'function' ? item.toString() : null)
              : item
          )
        );
        if (resolved) urls.push(resolved);
      }
    }

    enqueueNested(queue, current);
  }

  return urls;
};

export const isFallbackImageUrl = (url) => {
  if (!url) return true;
  const str = String(url);
  return FALLBACK_PATTERNS.some((regex) => regex.test(str));
};

export const collectImageUrls = (product) => {
  const urls = collectCandidateUrls(product);
  const seen = new Set();
  const ordered = [];
  for (const url of urls) {
    if (!seen.has(url)) {
      seen.add(url);
      ordered.push(url);
    }
  }
  return ordered;
};

export function hasProductImage(p) {
  return collectImageUrls(p).some((url) => !isFallbackImageUrl(url));
}

export function imageUrlFromProduct(p) {
  const urls = collectImageUrls(p);
  const primary = urls.find((url) => !isFallbackImageUrl(url));
  const fallback = urls.find(Boolean);
  let src = primary || fallback;

  if (!src) {
    src = `${API_BASE_NO_TRAILING_SLASH}/media/products/placeholder.png`;
  }

  const hasVersion = /[?&]v=/.test(src);
  if (src.includes('/media/products/') && !hasVersion && !/placeholder/i.test(src)) {
    const versionSeed = `${p?.id || 'x'}-${p?.updated_at || p?.raw?.updated_at || ''}`;
    const sep = src.includes('?') ? '&' : '?';
    src = `${src}${sep}v=${encodeURIComponent(versionSeed)}`;
  }

  return src;
}

export function pickRepresentativeProduct(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const withImage = candidates.find((candidate) => hasProductImage(candidate));
  return withImage || candidates[0];
}
