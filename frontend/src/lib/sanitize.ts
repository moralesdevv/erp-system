import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') return dirty; // SSR
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeText(value: string): string {
  if (typeof window === 'undefined') return value;
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeText(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      (sanitized as Record<string, unknown>)[key] = value;
    }
  }
  return sanitized;
}
