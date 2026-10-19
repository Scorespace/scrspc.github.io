// Copy and links for the minimal landing page variations (/a/, /b/, /c/).
// One source of truth, so the variation that wins can be promoted to the
// homepage without rewriting its words.

export const brand = {
  name: 'ScoreSpace',
  tagline: 'ScoreSpace is a game studio powered by game jams!',
  logo: 'logo.png',
  statement:
    'ScoreSpace sources early game concepts in volume through its game jam events and developer submissions.',
  // The statement split where the emphasis changes: what we do, then how.
  statementLead: 'ScoreSpace sources early game concepts in volume',
  statementTail: 'through its game jam events and developer submissions.',
  publishing: {
    line: 'We publish games across the web',
    stat: '8M',
    value: 8,
    suffix: 'M',
    long: '8,000,000',
    label: 'players across all platforms',
  },
  jams: {
    line: "We've been running game jams since 2019",
    since: 2019,
    stat: '4,000+',
    value: 4000,
    suffix: '+',
    label: 'games submitted all time',
  },
  belief: {
    lead: 'We believe that data should inform iteration, not ideation.',
    body: "As games become more homogenized as technology progresses, it's becoming increasingly apparent that creativity and genuine curiosity will outshine fast followers and copycats.",
  },
  events: {
    line: 'Find all of our upcoming events on Jamzo',
    short: 'Upcoming events on Jamzo',
    url: 'https://jamzo.com',
    host: 'jamzo.com',
  },
  social: [
    { label: 'Discord', url: 'https://discord.gg/kCM89sr' },
    { label: 'X', url: 'https://x.com/scrspc' },
    { label: 'Bluesky', url: 'https://bsky.app/profile/scorespace.net' },
  ],
  // Paths are relative to BASE_URL; trailingSlash is 'always'.
  legal: [
    { label: 'Support', path: 'support/' },
    { label: 'Privacy', path: 'privacy/' },
    { label: 'Terms', path: 'terms/' },
  ],
} as const;

// The numbered rows of the index variations (/b/ and its siblings). `num` is
// the figure in a row's last column, which the pages animate on its own.
export const indexRows = [
  { no: '01', key: 'Sourcing', val: 'Game jam events + unique developer submissions', num: '', aux: 'Early concepts, in volume' },
  { no: '02', key: 'Publishing', val: brand.publishing.line, num: brand.publishing.long, aux: brand.publishing.label },
  { no: '03', key: 'Jams', val: brand.jams.line, num: brand.jams.stat, aux: brand.jams.label },
];

// The three ideas the arcade story walks through, in order.
export const pillars = ['Creativity', 'Volume', 'Distribution'] as const;

export const title = 'ScoreSpace';
export const description = brand.statement;
// The /b1/arcade/ pages lead with the tagline; the statement follows it in search results.
export const studioDescription = `${brand.tagline}${/[.!?]$/.test(brand.tagline) ? '' : '.'} ${brand.statement}`;
