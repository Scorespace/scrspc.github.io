export interface Game {
  name: string;
  description: string;
  url: string;
  playable: "browser" | "download" | "both";
  platform: "discord" | "itch" | "steam" | "web" | "reddit";
  tags?: string[];
  thumbnail?: string;
  /** Shown in the Games list on the arcade pages. */
  showcase?: boolean;
}

export const games: Game[] = [
  {
    name: "River Climbing",
    description: "Use a stick to propel yourself to the top of the river in this foddian style game.",
    url: "https://scorespace.itch.io/riverclimbing",
    playable: "browser",
    platform: "itch",
    tags: ["foddian", "physics", "climbing"],
    thumbnail: "/games/river-climbing.png"
  },
  {
    name: "Blackjack",
    description: "The first visual Blackjack game on Discord! Play with up to 8 people in your server.",
    url: "https://discord.com/discovery/applications/1300612940486934591",
    playable: "browser",
    platform: "discord",
    tags: ["cards", "multiplayer"],
    thumbnail: "/games/blackjack.png",
    showcase: true
  },
  {
    name: "Word Chain",
    description: "Play it right in the Reddit feed, in its community r/wordchain.",
    url: "https://www.reddit.com/r/wordchain/",
    playable: "browser",
    platform: "reddit",
    showcase: true
  },
  {
    name: "Go Far",
    description: "Play it right in the Reddit feed, in its community r/gofarGame.",
    url: "https://www.reddit.com/r/gofarGame/",
    playable: "browser",
    platform: "reddit",
    showcase: true
  }
];
