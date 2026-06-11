export interface Character {
  id: string;
  name: string;
  emoji: string;
  from: string;
}

export const CHARACTERS: Character[] = [
  { id: "mario",     name: "Mario",      emoji: "🍄",  from: "Mario Bros"   },
  { id: "link",      name: "Link",        emoji: "🗡️",  from: "Zelda"        },
  { id: "pikachu",   name: "Pikachu",    emoji: "⚡",  from: "Pokémon"      },
  { id: "sonic",     name: "Sonic",      emoji: "💨",  from: "Sonic"        },
  { id: "kirby",     name: "Kirby",      emoji: "⭐",  from: "Kirby"        },
  { id: "goku",      name: "Goku",       emoji: "🐉",  from: "Dragon Ball"  },
  { id: "naruto",    name: "Naruto",     emoji: "🍥",  from: "Naruto"       },
  { id: "luffy",     name: "Luffy",      emoji: "☠️",  from: "One Piece"    },
  { id: "spiderman", name: "Spider-Man", emoji: "🕷️",  from: "Marvel"       },
  { id: "batman",    name: "Batman",     emoji: "🦇",  from: "DC"           },
  { id: "ironman",   name: "Iron Man",   emoji: "🤖",  from: "Marvel"       },
  { id: "groot",     name: "Groot",      emoji: "🌱",  from: "Marvel"       },
  { id: "elsa",      name: "Elsa",       emoji: "❄️",  from: "Frozen"       },
  { id: "yoda",      name: "Baby Yoda",  emoji: "🌌",  from: "Star Wars"    },
  { id: "vader",     name: "Darth Vader",emoji: "👾",  from: "Star Wars"    },
  { id: "hermione",  name: "Hermione",   emoji: "🪄",  from: "Harry Potter" },
];
