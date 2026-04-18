import type { Jam } from '../data/jams';

const LISTING_URL = 'https://itch.io/jams/hosted-by-scorespace';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const MAX_PAGES = 10;

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTrailingDecor(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\s]+$/gu, '').trim();
}

function parseInt10(s: string): number {
  return parseInt(s.replace(/[^\d]/g, ''), 10);
}

function parsePage(html: string): Omit<Jam, 'theme'>[] {
  const out: Omit<Jam, 'theme'>[] = [];
  const blocks = html.split('<div class="jam lazy_images">').slice(1);
  for (const block of blocks) {
    const link = block.match(/<h3[^>]*><a href="(\/jam\/[^"]+)"[^>]*>([^<]+)<\/a><\/h3>/);
    if (!link) continue;
    const date = block.match(/<span class="date_countdown"[^>]*>([^<]+)<\/span>/);
    const joined = block.match(/<div class="stat"><span class="number">([^<]+)<\/span>\s*joined<\/div>/);
    const subs = block.match(/<span class="number">([^<]+)<\/span>\s*submissions/);
    if (!date || !joined) continue;
    out.push({
      name: stripTrailingDecor(decodeHtml(link[2])),
      date: date[1].slice(0, 10),
      participants: parseInt10(joined[1]),
      submissions: subs ? parseInt10(subs[1]) : 0,
      url: `https://itch.io${link[1]}`,
    });
  }
  return out;
}

export async function fetchScoreSpaceJams(): Promise<Jam[]> {
  const all: Omit<Jam, 'theme'>[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${LISTING_URL}?page=${page}`, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
      });
      if (!res.ok) {
        if (page === 1) {
          console.warn(`[itch-jams] HTTP ${res.status} on page 1; returning []`);
          return [];
        }
        break;
      }
      const entries = parsePage(await res.text());
      if (entries.length === 0) break;
      all.push(...entries);
    }
  } catch (err) {
    console.warn(`[itch-jams] fetch error:`, err);
    return [];
  }
  all.sort((a, b) => b.date.localeCompare(a.date));
  return all;
}
