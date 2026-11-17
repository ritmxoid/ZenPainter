import { APP_VERSION } from '../version';

export const GTM_CONTAINER_ID = 'GTM-549WT23V';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type AnalyticsParamValue = string | number | boolean | null | undefined;
export type AnalyticsParams = Record<string, AnalyticsParamValue>;

function sanitizeParams(
  params?: AnalyticsParams
): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {
    app_version: APP_VERSION,
  };
  if (!params) return clean;
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      clean[key] = value;
    }
  }
  return clean;
}

export function ensureGtag(): ((...args: unknown[]) => void) | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
      };
    }
    return window.gtag;
  } catch {
    return null;
  }
}

export function trackWindowOpen(
  windowName: string,
  params?: AnalyticsParams
): void {
  const gtag = ensureGtag();
  if (!gtag) return;
  try {
    const clean = sanitizeParams(params);
    gtag('event', 'screen_view', {
      app_name: 'ZenPainter',
      screen_name: windowName,
      ...clean,
    });
  } catch {
    // Ignore analytics errors
  }
}

export function trackWindowClose(
  windowName: string,
  params?: AnalyticsParams
): void {
  const gtag = ensureGtag();
  if (!gtag) return;
  try {
    const clean = sanitizeParams(params);
    gtag('event', 'window_close', {
      event_category: 'window',
      window_name: windowName,
      ...clean,
    });
  } catch {
    // Ignore analytics errors
  }
}

export function trackFunction(
  functionName: string,
  category: string,
  params?: AnalyticsParams
): void {
  const gtag = ensureGtag();
  if (!gtag) return;
  try {
    const clean = sanitizeParams(params);
    gtag('event', functionName, {
      event_category: category,
      ...clean,
    });
  } catch {
    // Ignore analytics errors
  }
}
