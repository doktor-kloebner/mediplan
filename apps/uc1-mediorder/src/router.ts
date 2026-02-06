import { signal, computed } from '@preact/signals';

/** Current hash path, without the leading '#'. */
export const hash = signal(location.hash.slice(1) || '/');

window.addEventListener('hashchange', () => {
  hash.value = location.hash.slice(1) || '/';
});

export function navigate(path: string) {
  location.hash = path;
}

export interface RouteMatch {
  route: string;
  params: Record<string, string>;
}

/**
 * Match the current hash against a set of route patterns.
 * Patterns use `:param` syntax, e.g. "/plan/:id".
 */
export function matchRoute(patterns: string[]): RouteMatch | null {
  const path = hash.value;
  for (const pattern of patterns) {
    const params = matchPattern(pattern, path);
    if (params !== null) {
      return { route: pattern, params };
    }
  }
  return null;
}

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

/** Reactive route match for the app's routes. */
export const currentRoute = computed(() =>
  matchRoute(['/', '/plan/:id', '/order/:id', '/history', '/settings']),
);
