// The site's copy and links, in one place: the homepage and the other pages read their words from here.

export const brand = {
  name: 'ScoreSpace',
  tagline: 'ScoreSpace is a game studio powered by game jams',
  logo: 'logo.png',
  statement:
    'ScoreSpace sources early game concepts in volume through its game jam events and developer submissions.',
  publishing: {
    line: 'We publish games across the web',
    stat: '8M',
    value: 8,
    suffix: 'M',
    long: '8,000,000',
    label: 'players across all platforms',
    // The Distribution slide: how we publish.
    approach:
      'We take a platform agnostic approach to publishing while also tailoring each signed title for the target platform.',
  },
  jams: {
    line: "We've been running game jams since 2019",
    since: 2019,
    stat: '4,000+',
    value: 4000,
    suffix: '+',
    label: 'games submitted all time',
    // The Volume slide: what the number counts, then why volume works.
    detail: 'games submitted all time to our game jam events since 2019',
    filter:
      'Competition is the best filter for a high volume of games. The most talented developers rise to the top. This allows us to have a volume led approach while also being intentional about the quality bar for our signed titles.',
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

// The three ideas the arcade story walks through, in order.
export const pillars = ['Creativity', 'Volume', 'Distribution'] as const;

// The homepage's title, and so the headline of its link previews: just the name.
export const title = 'ScoreSpace';
// The homepage leads with the tagline; the statement follows it in search results.
export const studioDescription = `${brand.tagline}${/[.!?]$/.test(brand.tagline) ? '' : '.'} ${brand.statement}`;
