// Curated candidate shortlists for the two subjective FIFA awards, which no
// API exposes. Edit these freely — add/remove names as squads firm up. The
// `country` is only used to show a flag and to disambiguate; matching when
// settling is done on the player name (case/accent-insensitive).
export interface AwardCandidate {
  name: string;
  country: string;
}

// Golden Ball — best overall player (outfield stars across the contenders).
export const GOLDEN_BALL_CANDIDATES: AwardCandidate[] = [
  { name: "Lionel Messi", country: "Argentina" },
  { name: "Julián Álvarez", country: "Argentina" },
  { name: "Lautaro Martínez", country: "Argentina" },
  { name: "Kylian Mbappé", country: "France" },
  { name: "Antoine Griezmann", country: "France" },
  { name: "Ousmane Dembélé", country: "France" },
  { name: "Vinícius Júnior", country: "Brazil" },
  { name: "Rodrygo", country: "Brazil" },
  { name: "Raphinha", country: "Brazil" },
  { name: "Jude Bellingham", country: "England" },
  { name: "Harry Kane", country: "England" },
  { name: "Bukayo Saka", country: "England" },
  { name: "Phil Foden", country: "England" },
  { name: "Lamine Yamal", country: "Spain" },
  { name: "Pedri", country: "Spain" },
  { name: "Rodri", country: "Spain" },
  { name: "Nico Williams", country: "Spain" },
  { name: "Cristiano Ronaldo", country: "Portugal" },
  { name: "Bruno Fernandes", country: "Portugal" },
  { name: "Rafael Leão", country: "Portugal" },
  { name: "Cody Gakpo", country: "Netherlands" },
  { name: "Frenkie de Jong", country: "Netherlands" },
  { name: "Jamal Musiala", country: "Germany" },
  { name: "Florian Wirtz", country: "Germany" },
  { name: "Kevin De Bruyne", country: "Belgium" },
  { name: "Luka Modrić", country: "Croatia" },
  { name: "Erling Haaland", country: "Norway" },
  { name: "Christian Pulisic", country: "United States" },
  { name: "Federico Valverde", country: "Uruguay" },
];

// Golden Glove — best overall goalkeeper.
export const GOLDEN_GLOVE_CANDIDATES: AwardCandidate[] = [
  { name: "Emiliano Martínez", country: "Argentina" },
  { name: "Alisson", country: "Brazil" },
  { name: "Mike Maignan", country: "France" },
  { name: "Unai Simón", country: "Spain" },
  { name: "Jordan Pickford", country: "England" },
  { name: "Diogo Costa", country: "Portugal" },
  { name: "Bart Verbruggen", country: "Netherlands" },
  { name: "Marc-André ter Stegen", country: "Germany" },
  { name: "Thibaut Courtois", country: "Belgium" },
  { name: "Dominik Livaković", country: "Croatia" },
  { name: "Yassine Bounou", country: "Morocco" },
  { name: "Matt Turner", country: "United States" },
  { name: "Guillermo Ochoa", country: "Mexico" },
  { name: "Kasper Schmeichel", country: "Denmark" },
  { name: "Édouard Mendy", country: "Senegal" },
  { name: "Wojciech Szczęsny", country: "Poland" },
];

export function isCandidate(
  list: AwardCandidate[],
  name: string
): boolean {
  return list.some((c) => c.name === name);
}
