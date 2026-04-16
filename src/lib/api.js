const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

function defaultApiBaseUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  return window.location.origin;
}

export function getApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return trimTrailingSlash(fromEnv.trim());
  }
  return trimTrailingSlash(defaultApiBaseUrl());
}

export function getWsBaseUrl() {
  const apiBaseUrl = getApiBaseUrl();
  if (apiBaseUrl.startsWith('https://')) return `wss://${apiBaseUrl.slice(8)}`;
  if (apiBaseUrl.startsWith('http://')) return `ws://${apiBaseUrl.slice(7)}`;
  return apiBaseUrl;
}

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export function wsUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getWsBaseUrl()}${normalizedPath}`;
}