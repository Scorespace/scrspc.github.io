export interface Game {
  name: string;
  description: string;
  url: string;
  playable: "browser" | "download" | "both";
  tags?: string[];
}

export const games: Game[] = [
  {
    name: "River Climbing",
    description: "Use a stick to propel yourself to the top of the river in this foddian style game.",
    url: "https://scorespace.itch.io/riverclimbing",
    playable: "browser",
    tags: ["foddian", "physics", "climbing"]
  }
];
