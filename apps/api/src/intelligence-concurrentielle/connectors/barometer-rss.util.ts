export interface FeedItem {
  title: string;
  link: string | null;
  pubDate: Date | null;
  guid: string | null;
}

/**
 * Parseur RSS/Atom générique — le format exact du flux
 * barometre-crowdfunding.com/feed.xml n'a jamais pu être observé depuis cet
 * environnement (accès direct bloqué, même contrainte que pour les autres
 * sources externes de cette session). Gère les deux formats de lien les
 * plus courants (RSS `<link>texte</link>` et Atom `<link href="..."/>`)
 * plutôt que de supposer l'un des deux.
 */
export function parseRssFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi);
  for (const block of blocks) {
    const body = block[2];
    const title = extractTagText(body, 'title') ?? '';
    const pubDateRaw = extractTagText(body, 'pubDate') ?? extractTagText(body, 'published') ?? extractTagText(body, 'updated');
    const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;
    items.push({
      title,
      link: extractLink(body),
      pubDate: pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate : null,
      guid: extractTagText(body, 'guid') ?? extractTagText(body, 'id'),
    });
  }
  return items;
}

function extractTagText(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return null;
  const raw = match[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return decodeXmlEntities((cdata ? cdata[1] : raw).trim()) || null;
}

function extractLink(xml: string): string | null {
  const rss = extractTagText(xml, 'link');
  if (rss) return rss;
  const atom = xml.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i);
  return atom ? decodeXmlEntities(atom[1]) : null;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
