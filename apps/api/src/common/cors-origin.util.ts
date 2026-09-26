// Vercel gives every preview deployment its own https://<project>-git-<branch>-<team>.vercel.app
// origin — a single hyphen-joined DNS label ending in the (fixed) team slug, not a subdomain of
// it — so allow-listing each PR branch in API_CORS_ORIGIN one at a time would mean editing this
// service's Railway config on every new PR. An operator can instead write a wildcard entry (e.g.
// "https://*-atlas-8bf9.vercel.app") in API_CORS_ORIGIN — "*" matches within that one label,
// never spans across a dot, so it can't accidentally widen the match to an unrelated host.
function toRegex(pattern: string): RegExp {
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[a-z0-9-]*');
  return new RegExp(`^${escaped}$`);
}

export function buildCorsOriginMatcher(commaSeparatedPatterns: string): (origin: string) => boolean {
  const matchers = commaSeparatedPatterns
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((pattern) => (pattern.includes('*') ? toRegex(pattern) : pattern));

  return (origin: string) =>
    matchers.some((matcher) => (typeof matcher === 'string' ? matcher === origin : matcher.test(origin)));
}
