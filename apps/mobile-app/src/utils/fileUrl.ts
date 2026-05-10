import { EXPO_PUBLIC_API_BASE_URL } from '../config/env';

const API_BASE_URL = EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export function resolveMobileFileUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      if (parsed.port === '8080' && (parsed.pathname.startsWith('/api/v1/files/content') || parsed.pathname.startsWith('/api/v1/files/local/'))) {
        return `${API_BASE_URL}${parsed.pathname}${parsed.search}`;
      }

      if (parsed.port === '9000') {
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        if (pathSegments.length >= 2) {
          const objectName = pathSegments.slice(1).join('/');
          return `${API_BASE_URL}/api/v1/files/content?objectName=${encodeURIComponent(objectName)}`;
        }
      }
    }

    if (url.includes('/api/v1/files/content') || url.includes('/api/v1/files/local/')) {
      return url;
    }

  } catch {
    return url;
  }

  return url;
}
