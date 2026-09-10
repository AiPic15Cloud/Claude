import { promises as dns } from 'dns';
import { isIPv4 } from 'net';

/**
 * Blocks server-side requests to internal/private/link-local network ranges
 * (including the cloud metadata endpoint 169.254.169.254) — required
 * whenever a URL supplied by a user is fetched by the server itself
 * (SSRF). Checks both the literal host and every IP it resolves to, so a
 * DNS record pointing at an internal address is caught too.
 */
export class SsrfBlockedUrlError extends Error {}

const BLOCKED_IPV4_RANGES: [base: string, prefix: number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return BLOCKED_IPV4_RANGES.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

function isBlockedIp(ip: string): boolean {
  return isIPv4(ip) ? isBlockedIpv4(ip) : isBlockedIpv6(ip);
}

/**
 * Throws SsrfBlockedUrlError if `rawUrl` is not a plain http(s) URL pointing
 * at a public host. Call this immediately before any server-side fetch of a
 * user-supplied URL.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedUrlError(`URL invalide : "${rawUrl}"`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfBlockedUrlError(`Schéma non autorisé : "${url.protocol}"`);
  }
  if (url.username || url.password) {
    throw new SsrfBlockedUrlError('Les identifiants dans l\'URL ne sont pas autorisés');
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new SsrfBlockedUrlError(`Hôte non autorisé : "${hostname}"`);
  }
  if (isIPv4(hostname) && isBlockedIpv4(hostname)) {
    throw new SsrfBlockedUrlError(`Adresse IP non autorisée : "${hostname}"`);
  }

  let addresses: string[];
  try {
    addresses = (await dns.lookup(hostname, { all: true })).map((a) => a.address);
  } catch {
    throw new SsrfBlockedUrlError(`Résolution DNS impossible pour "${hostname}"`);
  }
  if (addresses.length === 0 || addresses.some(isBlockedIp)) {
    throw new SsrfBlockedUrlError(`Hôte résolu vers une plage d'adresses non autorisée : "${hostname}"`);
  }

  return url;
}
