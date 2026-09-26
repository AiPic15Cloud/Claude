import { buildCorsOriginMatcher } from './cors-origin.util';

describe('buildCorsOriginMatcher', () => {
  it('matches an exact origin', () => {
    const matches = buildCorsOriginMatcher('http://localhost:5173');
    expect(matches('http://localhost:5173')).toBe(true);
    expect(matches('http://localhost:5174')).toBe(false);
  });

  it('matches any of several comma-separated exact origins', () => {
    const matches = buildCorsOriginMatcher('https://a.example.com,https://b.example.com');
    expect(matches('https://a.example.com')).toBe(true);
    expect(matches('https://b.example.com')).toBe(true);
    expect(matches('https://c.example.com')).toBe(false);
  });

  it('expands a wildcard entry into a single-label match', () => {
    const matches = buildCorsOriginMatcher('https://*-atlas-8bf9.vercel.app');
    expect(matches('https://claude-git-claude-serene-planck-1ugag9-atlas-8bf9.vercel.app')).toBe(true);
    expect(matches('https://claude-nine-rust-atlas-8bf9.vercel.app')).toBe(true);
  });

  it('never lets a wildcard span across a dot into an unrelated host', () => {
    const matches = buildCorsOriginMatcher('https://*-atlas-8bf9.vercel.app');
    expect(matches('https://evil.com/x-atlas-8bf9.vercel.app')).toBe(false);
    expect(matches('https://x-atlas-8bf9.vercel.app.evil.com')).toBe(false);
  });

  it('combines exact and wildcard entries', () => {
    const matches = buildCorsOriginMatcher('http://localhost:5173,https://*-atlas-8bf9.vercel.app');
    expect(matches('http://localhost:5173')).toBe(true);
    expect(matches('https://claude-nine-rust-atlas-8bf9.vercel.app')).toBe(true);
    expect(matches('https://other.app')).toBe(false);
  });
});
