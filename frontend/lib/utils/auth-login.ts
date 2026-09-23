export function buildLoginUrl(next?: string): string {
  if (!next) return "/api/auth/login";
  return `/api/auth/login?next=${encodeURIComponent(next)}`;
}

export function navigateToLogin(next?: string): void {
  window.location.assign(buildLoginUrl(next));
}
