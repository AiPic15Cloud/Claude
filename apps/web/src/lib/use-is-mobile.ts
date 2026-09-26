import { useEffect, useState } from 'react';

// Mirrors Tailwind's `md` breakpoint (768px) — the same cutoff every `md:hidden`/
// `md:flex` class in the layout already uses, so this hook and the CSS never disagree
// about what counts as "mobile".
const MOBILE_QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
